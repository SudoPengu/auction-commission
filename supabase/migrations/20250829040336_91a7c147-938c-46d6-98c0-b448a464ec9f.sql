
-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_condition') THEN
    CREATE TYPE public.item_condition AS ENUM ('brand_new', 'like_new', 'used_good', 'used_fair', 'damaged');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_status') THEN
    CREATE TYPE public.item_status AS ENUM ('pending_auction', 'auctioned_sold', 'auctioned_unsold', 'walk_in_available', 'locked');
  END IF;
END
$$;

-- 2) ID counter table (per-day counter for BX-YYYYMMDD-####)
CREATE TABLE IF NOT EXISTS public.inventory_id_counters (
  for_date date PRIMARY KEY,
  last_counter integer NOT NULL DEFAULT 0
);

-- 3) Categories (allow staff to add custom)
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  name text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES public.user_profiles(id)
);

ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

-- RLS: company view
CREATE POLICY IF NOT EXISTS "Company can view categories"
  ON public.inventory_categories
  FOR SELECT
  USING (public.get_current_user_role() = ANY (ARRAY['staff'::user_role,'admin'::user_role,'super-admin'::user_role]));

-- RLS: staff can insert (custom categories)
CREATE POLICY IF NOT EXISTS "Staff can create categories"
  ON public.inventory_categories
  FOR INSERT
  WITH CHECK (public.get_current_user_role() = ANY (ARRAY['staff'::user_role,'admin'::user_role,'super-admin'::user_role]));

-- RLS: admin/super-admin can update/delete
CREATE POLICY IF NOT EXISTS "Admin can update categories"
  ON public.inventory_categories
  FOR UPDATE
  USING (public.get_current_user_role() = ANY (ARRAY['admin'::user_role,'super-admin'::user_role]))
  WITH CHECK (public.get_current_user_role() = ANY (ARRAY['admin'::user_role,'super-admin'::user_role]));

CREATE POLICY IF NOT EXISTS "Admin can delete categories"
  ON public.inventory_categories
  FOR DELETE
  USING (public.get_current_user_role() = ANY (ARRAY['admin'::user_role,'super-admin'::user_role]));

-- Seed default categories (idempotent)
INSERT INTO public.inventory_categories (name)
VALUES
  ('Furniture'), ('Electronics'), ('Kitchenware'), ('Fashion'),
  ('Appliances'), ('Tools'), ('Toys'), ('Automotive'),
  ('Garden'), ('Office'), ('Sports'), ('Miscellaneous')
ON CONFLICT (name) DO NOTHING;

-- 4) Items
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id text PRIMARY KEY,
  name text,
  category_name text NULL REFERENCES public.inventory_categories(name) ON UPDATE CASCADE ON DELETE SET NULL,
  condition public.item_condition NOT NULL DEFAULT 'used_good',
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  sold_quantity integer NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0 AND sold_quantity <= quantity),
  starting_bid_price numeric(12,2) NOT NULL DEFAULT 0,
  expected_sale_price numeric(12,2),
  final_sale_price numeric(12,2),
  status public.item_status NOT NULL DEFAULT 'pending_auction',
  photo_url text,
  auction_id uuid NULL REFERENCES public.auction_events(id),
  storage_expires_at timestamptz,
  last_status_qr_confirmed_at timestamptz,
  last_status_qr_confirmed_by uuid,
  branch_tag text NOT NULL DEFAULT 'Main Branch',
  created_by uuid NULL REFERENCES public.user_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_items_id_format_chk CHECK (id ~ '^BX-[0-9]{8}-[0-9]{4}$')
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- RLS: company read
CREATE POLICY IF NOT EXISTS "Company can view inventory"
  ON public.inventory_items
  FOR SELECT
  USING (public.get_current_user_role() = ANY (ARRAY['staff'::user_role,'admin'::user_role,'super-admin'::user_role]));

-- RLS: company insert
CREATE POLICY IF NOT EXISTS "Company can insert inventory"
  ON public.inventory_items
  FOR INSERT
  WITH CHECK (public.get_current_user_role() = ANY (ARRAY['staff'::user_role,'admin'::user_role,'super-admin'::user_role]));

-- RLS: company update
CREATE POLICY IF NOT EXISTS "Company can update inventory"
  ON public.inventory_items
  FOR UPDATE
  USING (public.get_current_user_role() = ANY (ARRAY['staff'::user_role,'admin'::user_role,'super-admin'::user_role]))
  WITH CHECK (public.get_current_user_role() = ANY (ARRAY['staff'::user_role,'admin'::user_role,'super-admin'::user_role]));

-- RLS: only admins can delete
CREATE POLICY IF NOT EXISTS "Admins can delete inventory"
  ON public.inventory_items
  FOR DELETE
  USING (public.get_current_user_role() = ANY (ARRAY['admin'::user_role,'super-admin'::user_role]));

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS inventory_items_set_updated_at ON public.inventory_items;
CREATE TRIGGER inventory_items_set_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5) QR confirmation and status-change enforcement trigger
CREATE OR REPLACE FUNCTION public.inventory_items_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Enforce QR-confirmed status changes
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.last_status_qr_confirmed_at IS NULL
       OR NEW.last_status_qr_confirmed_by IS DISTINCT FROM auth.uid()
       OR NEW.last_status_qr_confirmed_at < (now() - interval '5 minutes') THEN
      RAISE EXCEPTION 'QR scan required: status changes must be confirmed within the last 5 minutes';
    END IF;

    -- Storage countdown logic for sold items
    IF NEW.status = 'auctioned_sold'::public.item_status THEN
      NEW.storage_expires_at := now() + interval '72 hours';
    ELSE
      NEW.storage_expires_at := NULL;
    END IF;

    -- Log activity
    PERFORM public.log_activity(
      'status_change',
      'inventory_items',
      jsonb_build_object(
        'item_id', NEW.id,
        'from', OLD.status,
        'to', NEW.status
      )
    );

    -- Invalidate QR confirmation
    NEW.last_status_qr_confirmed_at := NULL;
    NEW.last_status_qr_confirmed_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_items_before_update ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_before_update
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.inventory_items_before_update();

-- 6) Reserve labels (bulk placeholder creation)
CREATE OR REPLACE FUNCTION public.reserve_inventory_labels(p_count int, p_branch_tag text DEFAULT 'Main Branch')
RETURNS TABLE(id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_current int;
  v_next int;
  v_i int;
  v_id text;
BEGIN
  IF p_count IS NULL OR p_count <= 0 THEN
    RAISE EXCEPTION 'p_count must be > 0';
  END IF;

  INSERT INTO public.inventory_id_counters(for_date, last_counter)
  VALUES (v_today, 0)
  ON CONFLICT (for_date) DO NOTHING;

  SELECT last_counter INTO v_current
  FROM public.inventory_id_counters
  WHERE for_date = v_today
  FOR UPDATE;

  v_next := v_current;

  FOR v_i IN 1..p_count LOOP
    v_next := v_next + 1;
    v_id := 'BX-' || to_char(v_today, 'YYYYMMDD') || '-' || lpad(v_next::text, 4, '0');

    INSERT INTO public.inventory_items(id, status, branch_tag, created_by)
    VALUES (v_id, 'pending_auction', COALESCE(p_branch_tag, 'Main Branch'), auth.uid());

    id := v_id;
    RETURN NEXT;
  END LOOP;

  UPDATE public.inventory_id_counters
  SET last_counter = v_next
  WHERE for_date = v_today;

  RETURN;
END;
$$;

-- 7) Confirm QR and update status RPCs
CREATE OR REPLACE FUNCTION public.inventory_confirm_qr(p_item_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count int;
BEGIN
  UPDATE public.inventory_items
  SET 
    last_status_qr_confirmed_at = now(),
    last_status_qr_confirmed_by = auth.uid()
  WHERE id = p_item_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_inventory_status(p_item_id text, p_new_status public.item_status)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ok boolean;
BEGIN
  _ok := public.inventory_confirm_qr(p_item_id);
  IF NOT _ok THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  UPDATE public.inventory_items
  SET status = p_new_status
  WHERE id = p_item_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8) Helpful indexes for filtering/search
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON public.inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category_name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_condition ON public.inventory_items(condition);
CREATE INDEX IF NOT EXISTS idx_inventory_items_storage_exp ON public.inventory_items(storage_expires_at);
CREATE INDEX IF NOT EXISTS idx_inventory_items_branch_tag ON public.inventory_items(branch_tag);

-- 9) Storage: public bucket for thumbnails, restricted write
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-photos', 'inventory-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read of inventory images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read inventory photos'
  ) THEN
    CREATE POLICY "Public read inventory photos"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'inventory-photos');
  END IF;
END
$$;

-- Company write policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Company insert inventory photos'
  ) THEN
    CREATE POLICY "Company insert inventory photos"
      ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'inventory-photos'
        AND public.get_current_user_role() = ANY (ARRAY['staff'::user_role,'admin'::user_role,'super-admin'::user_role])
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Company update inventory photos'
  ) THEN
    CREATE POLICY "Company update inventory photos"
      ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'inventory-photos'
        AND public.get_current_user_role() = ANY (ARRAY['staff'::user_role,'admin'::user_role,'super-admin'::user_role])
      )
      WITH CHECK (
        bucket_id = 'inventory-photos'
        AND public.get_current_user_role() = ANY (ARRAY['staff'::user_role,'admin'::user_role,'super-admin'::user_role])
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Company delete inventory photos'
  ) THEN
    CREATE POLICY "Company delete inventory photos"
      ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'inventory-photos'
        AND public.get_current_user_role() = ANY (ARRAY['staff'::user_role,'admin'::user_role,'super-admin'::user_role])
      );
  END IF;
END
$$;
