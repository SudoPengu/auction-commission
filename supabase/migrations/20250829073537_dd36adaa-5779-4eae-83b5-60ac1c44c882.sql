-- BlueSky Inventory: enums, tables, functions, RLS, and storage policies
-- 1) Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_condition') THEN
    CREATE TYPE public.item_condition AS ENUM (
      'brand_new', 'like_new', 'used_good', 'used_fair', 'damaged'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_status') THEN
    CREATE TYPE public.inventory_status AS ENUM (
      'pending_auction', 'auctioned_sold', 'auctioned_unsold', 'walk_in_available', 'locked'
    );
  END IF;
END $$;

-- 2) Tables
-- Categories (using name as PK to match frontend join)
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  name text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Items (short text id like BX-YYYYMMDD-####)
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id text PRIMARY KEY,
  name text,
  category_name text REFERENCES public.inventory_categories(name) ON DELETE SET NULL,
  condition public.item_condition NOT NULL DEFAULT 'used_good',
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  sold_quantity integer NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0 AND sold_quantity <= quantity),
  starting_bid_price numeric NOT NULL DEFAULT 0,
  expected_sale_price numeric,
  final_sale_price numeric,
  status public.inventory_status NOT NULL DEFAULT 'pending_auction',
  photo_url text,
  storage_expires_at timestamptz,
  branch_tag text NOT NULL DEFAULT 'Main Branch',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category_name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON public.inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_condition ON public.inventory_items(condition);

-- Triggers to auto-update updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_inventory_categories_updated_at'
  ) THEN
    CREATE TRIGGER trg_inventory_categories_updated_at
    BEFORE UPDATE ON public.inventory_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_inventory_items_updated_at'
  ) THEN
    CREATE TRIGGER trg_inventory_items_updated_at
    BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 3) RLS
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Company roles can fully manage categories
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Company roles can manage categories'
  ) THEN
    CREATE POLICY "Company roles can manage categories"
    ON public.inventory_categories
    FOR ALL
    USING (public.has_any_role('staff','admin','super-admin'))
    WITH CHECK (public.has_any_role('staff','admin','super-admin'));
  END IF;
END $$;

-- Company roles can fully manage items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Company roles can manage items'
  ) THEN
    CREATE POLICY "Company roles can manage items"
    ON public.inventory_items
    FOR ALL
    USING (public.has_any_role('staff','admin','super-admin'))
    WITH CHECK (public.has_any_role('staff','admin','super-admin'));
  END IF;
END $$;

-- 4) ID generator helper
CREATE OR REPLACE FUNCTION public.generate_inventory_id(p_date date DEFAULT now()::date)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prefix text;
  seq int;
  candidate text;
BEGIN
  prefix := 'BX-' || to_char(p_date, 'YYYYMMDD') || '-';
  LOOP
    SELECT COALESCE(MAX((regexp_replace(id, '.*-', '')::int)), 0) + 1
      INTO seq
    FROM public.inventory_items
    WHERE id LIKE prefix || '%';

    candidate := prefix || lpad(seq::text, 4, '0');

    -- ensure uniqueness in case of race
    IF NOT EXISTS (SELECT 1 FROM public.inventory_items WHERE id = candidate) THEN
      RETURN candidate;
    END IF;
  END LOOP;
END;
$$;

-- 5) Reserve labels in bulk (create placeholder items)
CREATE OR REPLACE FUNCTION public.reserve_inventory_labels(p_count integer, p_branch_tag text)
RETURNS TABLE(id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  i int;
  new_id text;
BEGIN
  IF p_count IS NULL OR p_count < 1 OR p_count > 100 THEN
    RAISE EXCEPTION 'p_count must be between 1 and 100';
  END IF;

  FOR i IN 1..p_count LOOP
    new_id := public.generate_inventory_id(now()::date);
    INSERT INTO public.inventory_items (
      id, name, category_name, condition, quantity, sold_quantity,
      starting_bid_price, expected_sale_price, final_sale_price,
      status, photo_url, storage_expires_at, branch_tag
    ) VALUES (
      new_id, NULL, NULL, 'used_good', 1, 0,
      0, NULL, NULL,
      'pending_auction', NULL, NULL, COALESCE(p_branch_tag, 'Main Branch')
    );
    RETURN NEXT new_id;
  END LOOP;
END;
$$;

-- 6) Confirm QR scan (simple audit log)
CREATE OR REPLACE FUNCTION public.inventory_confirm_qr(p_item_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  exists_item boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.inventory_items WHERE id = p_item_id) INTO exists_item;
  IF NOT exists_item THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  PERFORM public.log_activity(
    'inventory_qr_confirmed',
    'inventory_items',
    jsonb_build_object('item_id', p_item_id)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7) Update inventory status enforcing workflow basics
CREATE OR REPLACE FUNCTION public.update_inventory_status(p_item_id text, p_new_status public.inventory_status)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  old_status public.inventory_status;
BEGIN
  SELECT status INTO old_status FROM public.inventory_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  -- basic allowed transitions (can be extended)
  IF p_new_status = 'walk_in_available' AND old_status NOT IN ('auctioned_unsold','locked','pending_auction') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transition to walk_in_available');
  END IF;

  IF p_new_status = 'auctioned_sold' THEN
    UPDATE public.inventory_items
      SET status = p_new_status,
          storage_expires_at = now() + interval '72 hours'
      WHERE id = p_item_id;
  ELSE
    UPDATE public.inventory_items
      SET status = p_new_status
      WHERE id = p_item_id;
  END IF;

  PERFORM public.log_activity(
    'inventory_status_update',
    'inventory_items',
    jsonb_build_object('item_id', p_item_id, 'from', old_status, 'to', p_new_status)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8) Seed some default categories (idempotent)
INSERT INTO public.inventory_categories(name)
VALUES
  ('Furniture'), ('Electronics'), ('Kitchenware'), ('Fashion'), ('Tools'), ('Appliances')
ON CONFLICT DO NOTHING;

-- 9) Storage bucket and policies for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-photos', 'inventory-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access to inventory photos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Public read inventory photos'
  ) THEN
    CREATE POLICY "Public read inventory photos"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'inventory-photos');
  END IF;
END $$;

-- Company roles can manage inventory photos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Company manage inventory photos insert'
  ) THEN
    CREATE POLICY "Company manage inventory photos insert"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'inventory-photos' AND public.has_any_role('staff','admin','super-admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Company manage inventory photos update'
  ) THEN
    CREATE POLICY "Company manage inventory photos update"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'inventory-photos' AND public.has_any_role('staff','admin','super-admin'))
    WITH CHECK (bucket_id = 'inventory-photos' AND public.has_any_role('staff','admin','super-admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Company manage inventory photos delete'
  ) THEN
    CREATE POLICY "Company manage inventory photos delete"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'inventory-photos' AND public.has_any_role('staff','admin','super-admin'));
  END IF;
END $$;
