
-- 1) Storage bucket for QR PNGs (idempotent)
insert into storage.buckets (id, name, public)
values ('qr-codes', 'qr-codes', true)
on conflict (id) do nothing;

-- Policies for storage.objects (public read; staff/admin write)
do $$
begin
  -- Public read
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read qr-codes'
  ) then
    create policy "Public read qr-codes"
      on storage.objects
      for select
      using (bucket_id = 'qr-codes');
  end if;

  -- Staff/Admin insert
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Staff/Admin can upload to qr-codes'
  ) then
    create policy "Staff/Admin can upload to qr-codes"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'qr-codes'
        and public.get_current_user_role() = any (array['staff'::public.user_role, 'admin'::public.user_role, 'super-admin'::public.user_role])
      );
  end if;

  -- Staff/Admin update/delete
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Staff/Admin can modify qr-codes'
  ) then
    create policy "Staff/Admin can modify qr-codes"
      on storage.objects
      for all
      to authenticated
      using (
        bucket_id = 'qr-codes'
        and public.get_current_user_role() = any (array['staff'::public.user_role, 'admin'::public.user_role, 'super-admin'::public.user_role])
      )
      with check (
        bucket_id = 'qr-codes'
        and public.get_current_user_role() = any (array['staff'::public.user_role, 'admin'::public.user_role, 'super-admin'::public.user_role])
      );
  end if;
end $$;

-- 2) QR staging table
create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,          -- actual QR value (e.g., BX-YYYYMMDD-#### or UUID)
  branch_tag text not null default 'Main Branch',
  printed boolean not null default false,
  is_used boolean not null default false,
  qr_path text,                       -- e.g., qr-codes/<code>.png
  qr_code_url text,                   -- public URL (optional convenience)
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by uuid
);

-- Enable RLS and add policies
alter table public.qr_codes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='qr_codes' and policyname='Staff/Admin manage qr codes'
  ) then
    create policy "Staff/Admin manage qr codes"
      on public.qr_codes
      for all
      using (public.get_current_user_role() = any (array['staff'::public.user_role,'admin'::public.user_role,'super-admin'::public.user_role]))
      with check (public.get_current_user_role() = any (array['staff'::public.user_role,'admin'::public.user_role,'super-admin'::public.user_role]));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='qr_codes' and policyname='Staff/Admin can view qr codes'
  ) then
    create policy "Staff/Admin can view qr codes"
      on public.qr_codes
      for select
      using (public.get_current_user_role() = any (array['staff'::public.user_role,'admin'::public.user_role,'super-admin'::public.user_role]));
  end if;
end $$;

-- 3) Inventory linkage fields (idempotent)
alter table public.inventory_items
  add column if not exists qr_id uuid unique references public.qr_codes(id);

alter table public.inventory_items
  add column if not exists qr_path text;

alter table public.inventory_items
  add column if not exists qr_code_url text;

alter table public.inventory_items
  add column if not exists qr_generated boolean not null default false;

-- 4) RPC to reserve QR codes (bulk generate without creating inventory items)
create or replace function public.reserve_qr_codes(p_count integer, p_branch text default 'Main Branch')
returns text[]
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_codes text[] := array[]::text[];
  v_code  text;
  v_count int := greatest(least(coalesce(p_count,0), 500), 0); -- cap at 500
begin
  if v_count = 0 then
    return v_codes;
  end if;

  while array_length(v_codes,1) is null or array_length(v_codes,1) < v_count loop
    -- Reuse existing generator for nice human-friendly codes
    v_code := public.generate_inventory_id();

    begin
      insert into public.qr_codes (code, branch_tag)
      values (v_code, coalesce(p_branch, 'Main Branch'));
      v_codes := v_codes || v_code;
    exception when unique_violation then
      -- retry with next id
      null;
    end;
  end loop;

  -- Audit
  perform public.log_activity(
    'reserve_qr_codes',
    'qr_codes',
    jsonb_build_object('count', v_count, 'branch', p_branch, 'codes', v_codes),
    null
  );

  return v_codes;
end;
$function$;

-- 5) RPC to validate a scanned QR (exists/usage + optional path/url metadata)
create or replace function public.qr_validate(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_qr record;
begin
  select id, is_used, qr_path, qr_code_url, branch_tag
    into v_qr
  from public.qr_codes
  where code = p_code;

  if not found then
    return jsonb_build_object('exists', false);
  end if;

  return jsonb_build_object(
    'exists', true,
    'is_used', v_qr.is_used,
    'qr_id', v_qr.id,
    'qr_path', v_qr.qr_path,
    'qr_code_url', v_qr.qr_code_url,
    'branch_tag', v_qr.branch_tag
  );
end;
$function$;

-- 6) RPC to atomically claim a QR and create the inventory item using that QR code as the item id
-- p_item: { name, category_id?, category_name?, condition?, quantity?, starting_bid_price?, expected_sale_price?, photo_url?, branch_tag? }
create or replace function public.qr_claim_and_create_inventory(p_code text, p_item jsonb)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_qr public.qr_codes%rowtype;
  v_item_id text := p_code; -- use the QR code as the inventory id (aligns with printed label)
begin
  select * into v_qr
  from public.qr_codes
  where code = p_code
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'QR not found');
  end if;

  if v_qr.is_used then
    return jsonb_build_object('success', false, 'error', 'QR already used');
  end if;

  insert into public.inventory_items (
    id, name, category_id, category_name, condition, quantity,
    starting_bid_price, expected_sale_price, photo_url, branch_tag, status,
    qr_id, qr_path, qr_code_url, qr_generated
  ) values (
    v_item_id,
    nullif(p_item->>'name', ''),
    nullif((p_item->>'category_id')::bigint, null),
    nullif(p_item->>'category_name', ''),
    coalesce((p_item->>'condition')::public.inventory_condition, 'used_good'::public.inventory_condition),
    coalesce((p_item->>'quantity')::int, 1),
    coalesce((p_item->>'starting_bid_price')::numeric, 0),
    nullif((p_item->>'expected_sale_price')::numeric, null),
    nullif(p_item->>'photo_url', ''),
    coalesce(nullif(p_item->>'branch_tag', ''), v_qr.branch_tag),
    'pending_auction'::public.inventory_status,
    v_qr.id,
    v_qr.qr_path,
    v_qr.qr_code_url,
    case when v_qr.qr_path is not null or v_qr.qr_code_url is not null then true else false end
  );

  update public.qr_codes
  set is_used = true,
      used_at = now(),
      used_by = auth.uid()
  where id = v_qr.id;

  perform public.log_activity(
    'qr_claimed_create_inventory',
    'inventory_items',
    jsonb_build_object('code', p_code, 'item_id', v_item_id),
    null
  );

  return jsonb_build_object('success', true, 'item_id', v_item_id, 'qr_id', v_qr.id);
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'Inventory ID already exists or QR already linked');
end;
$function$;
