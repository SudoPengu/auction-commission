
-- 0) Ensure the updated_at trigger function exists (idempotent)
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) Enums for inventory
do $$
begin
  if not exists (select 1 from pg_type where typname = 'inventory_condition') then
    create type public.inventory_condition as enum ('brand_new','like_new','used_good','used_fair','damaged');
  end if;

  if not exists (select 1 from pg_type where typname = 'inventory_status') then
    create type public.inventory_status as enum ('pending_auction','auctioned_sold','auctioned_unsold','walk_in_available','locked');
  end if;
end
$$;

-- 2) Daily counter for ID generation (concurrency-safe)
create table if not exists public.inventory_id_counters (
  day date primary key,
  last_number integer not null
);

-- 3) Concurrency-safe ID generator: BX-YYYYMMDD-####
create or replace function public.generate_inventory_id(prefix text default 'BX')
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_day date := current_date;
  v_seq integer;
  v_code text;
begin
  loop
    insert into public.inventory_id_counters (day, last_number)
    values (v_day, 1)
    on conflict (day)
    do update set last_number = public.inventory_id_counters.last_number + 1
    returning last_number into v_seq;

    v_code := prefix || '-' || to_char(v_day, 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');

    return v_code; -- we rely on insert-time unique constraints to guard collisions
  end loop;
end;
$$;

-- 4) Categories (staff-addable)
create table if not exists public.inventory_categories (
  id bigserial primary key,
  name text not null unique,
  created_by uuid null,
  created_at timestamptz not null default now()
);

-- 5) Items (aligns with current frontend expectations)
create table if not exists public.inventory_items (
  id text primary key default public.generate_inventory_id(),
  name text,
  category_id bigint references public.inventory_categories(id) on delete set null,
  category_name text,
  condition public.inventory_condition not null default 'used_good',
  quantity integer not null default 1 check (quantity >= 0),
  sold_quantity integer not null default 0 check (sold_quantity >= 0),
  starting_bid_price numeric(10,2) not null default 0,
  expected_sale_price numeric(10,2),
  final_sale_price numeric(10,2),
  status public.inventory_status not null default 'pending_auction',
  photo_url text,
  storage_expires_at timestamptz,
  branch_tag text not null default 'Main Branch',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sold_quantity <= quantity)
);

-- 6) Updated_at trigger
drop trigger if exists set_timestamp_inventory_items on public.inventory_items;
create trigger set_timestamp_inventory_items
before update on public.inventory_items
for each row execute function public.update_updated_at_column();

-- 7) Helpful indexes
create index if not exists idx_inventory_items_status on public.inventory_items(status);
create index if not exists idx_inventory_items_condition on public.inventory_items(condition);
create index if not exists idx_inventory_items_branch on public.inventory_items(branch_tag);
create index if not exists idx_inventory_items_created_at on public.inventory_items(created_at);

-- 8) RLS
alter table public.inventory_items enable row level security;
alter table public.inventory_categories enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'inventory_items'
      and policyname = 'Staff and admins can manage inventory items'
  ) then
    create policy "Staff and admins can manage inventory items"
      on public.inventory_items
      for all
      using (public.get_current_user_role() = any (array['staff'::user_role,'admin'::user_role,'super-admin'::user_role]))
      with check (public.get_current_user_role() = any (array['staff'::user_role,'admin'::user_role,'super-admin'::user_role]));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'inventory_categories'
      and policyname = 'Staff and admins can manage inventory categories'
  ) then
    create policy "Staff and admins can manage inventory categories"
      on public.inventory_categories
      for all
      using (public.get_current_user_role() = any (array['staff'::user_role,'admin'::user_role,'super-admin'::user_role]))
      with check (public.get_current_user_role() = any (array['staff'::user_role,'admin'::user_role,'super-admin'::user_role]));
  end if;
end$$;

-- 9) RPC: reserve_inventory_labels (returns text[])
create or replace function public.reserve_inventory_labels(p_count int, p_branch text default 'Main Branch')
returns text[]
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ids text[] := array[]::text[];
  v_id text;
begin
  if p_count is null or p_count <= 0 then
    return v_ids;
  end if;
  if p_count > 100 then
    p_count := 100;
  end if;

  while array_length(v_ids, 1) is null or array_length(v_ids, 1) < p_count loop
    v_id := public.generate_inventory_id();
    begin
      insert into public.inventory_items (id, status, branch_tag)
      values (v_id, 'pending_auction', coalesce(p_branch, 'Main Branch'));
      v_ids := v_ids || v_id;
    exception
      when unique_violation then
        -- retry with next id
        null;
    end;
  end loop;

  return v_ids;
end;
$$;

-- 10) RPC: inventory_confirm_qr (simple verification with audit log)
create or replace function public.inventory_confirm_qr(scanned_code text, expected_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_exists boolean;
  v_success boolean := false;
  v_error text := null;
begin
  select exists (select 1 from public.inventory_items where id = expected_id) into v_exists;

  if not v_exists then
    v_error := 'Item not found';
  elsif scanned_code is null or scanned_code <> expected_id then
    v_error := 'QR mismatch';
  else
    v_success := true;
  end if;

  -- Audit (best-effort)
  perform public.log_activity(
    'inventory_qr_confirm',
    'inventory_items',
    jsonb_build_object('expected_id', expected_id, 'scanned_code', scanned_code, 'success', v_success),
    null
  );

  return jsonb_build_object('success', v_success, 'error', v_error);
end;
$$;

-- 11) RPC: update_inventory_status (enforces transitions, updates sold qty, storage expiry, logs)
create or replace function public.update_inventory_status(
  p_item_id text,
  p_new_status public.inventory_status,
  p_sold_delta int default 0,
  p_final_price numeric(10,2) default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_item record;
  v_error text := null;
begin
  select * into v_item from public.inventory_items where id = p_item_id for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Item not found');
  end if;

  -- Basic transition guardrails (admin can override via same RPC if needed later)
  if v_item.status = 'locked' and p_new_status = 'walk_in_available' then
    v_error := 'Locked items cannot be walk-in available until unlocked';
    return jsonb_build_object('success', false, 'error', v_error);
  end if;

  -- Sold quantity adjustments
  if p_sold_delta is not null and p_sold_delta <> 0 then
    if p_sold_delta < 0 then
      if v_item.sold_quantity + p_sold_delta < 0 then
        return jsonb_build_object('success', false, 'error', 'Sold quantity cannot be negative');
      end if;
    else
      if v_item.sold_quantity + p_sold_delta > v_item.quantity then
        return jsonb_build_object('success', false, 'error', 'Sold exceeds total quantity');
      end if;
    end if;
  end if;

  -- Apply updates
  update public.inventory_items
  set
    status = p_new_status,
    sold_quantity = case when p_sold_delta is null then sold_quantity else sold_quantity + p_sold_delta end,
    final_sale_price = coalesce(p_final_price, final_sale_price),
    storage_expires_at = case
      when p_new_status = 'auctioned_sold' then now() + interval '72 hours'
      else storage_expires_at
    end
  where id = p_item_id;

  -- Audit
  perform public.log_activity(
    'inventory_status_change',
    'inventory_items',
    jsonb_build_object(
      'item_id', p_item_id,
      'old_status', v_item.status,
      'new_status', p_new_status,
      'sold_delta', p_sold_delta,
      'final_sale_price', p_final_price
    ),
    null
  );

  return jsonb_build_object('success', true);
end;
$$;

-- 12) Seed default categories (idempotent)
insert into public.inventory_categories (name)
values
  ('Furniture'),
  ('Electronics'),
  ('Kitchenware'),
  ('Fashion'),
  ('Tools'),
  ('Toys'),
  ('Sporting Goods')
on conflict (name) do nothing;

-- 13) Storage: inventory-photos bucket and policies
-- Create bucket
insert into storage.buckets (id, name, public)
values ('inventory-photos', 'inventory-photos', true)
on conflict (id) do nothing;

-- Policies on storage.objects for the bucket
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Inventory photos - read'
  ) then
    create policy "Inventory photos - read"
      on storage.objects
      for select
      to public
      using (bucket_id = 'inventory-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Inventory photos - upload'
  ) then
    create policy "Inventory photos - upload"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'inventory-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Inventory photos - update'
  ) then
    create policy "Inventory photos - update"
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'inventory-photos')
      with check (bucket_id = 'inventory-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Inventory photos - delete'
  ) then
    create policy "Inventory photos - delete"
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'inventory-photos');
  end if;
end$$;
