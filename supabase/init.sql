-- ============================================================================
-- BlueSky Auction Nexus - Complete Database Initialization Script
-- ============================================================================
-- This script sets up the entire database schema in one go.
-- Run this in Supabase SQL Editor to initialize a fresh database.
-- 
-- IMPORTANT: Default Test Users Setup
-- ============================================================================
-- After running this script, create these users in Supabase Dashboard:
-- 
-- 1. Go to: Authentication → Users → Add user → Create new user
-- 
--    Bidder User:
--    - Email: bidder-account@blueskyauction.com
--    - Password: bidder-password
--    - Auto Confirm User: ON
-- 
--    Admin User:
--    - Email: admin-account@blueskyauction.com
--    - Password: admin-password
--    - Auto Confirm User: ON
-- 
-- 2. After creating users, run this to setup their profiles:
--    SELECT public.setup_default_users();
-- 
-- 3. Login credentials:
--    - Bidder: username "bidder-account" or email / password "bidder-password"
--    - Admin: username "admin-account" or email / password "admin-password"
-- 
-- Note: The trigger will automatically create profiles for NEW users who sign up.
-- For existing users, use the setup_default_users() function.
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- User roles enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('super-admin', 'admin', 'staff', 'bidder');
  END IF;
END $$;

-- Inventory condition enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_condition') THEN
    CREATE TYPE public.item_condition AS ENUM ('brand_new', 'like_new', 'used_good', 'used_fair', 'damaged');
  END IF;
END $$;

-- Inventory status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_status') THEN
    CREATE TYPE public.inventory_status AS ENUM ('pending_auction', 'auctioned_sold', 'auctioned_unsold', 'walk_in_available', 'locked');
  END IF;
END $$;

-- ============================================================================
-- 2. BASIC TRIGGER FUNCTION (no table dependencies)
-- ============================================================================

-- Update updated_at column trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. BASE TABLES
-- ============================================================================

-- User profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role user_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auction events table
CREATE TABLE IF NOT EXISTS public.auction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  theme_title text,
  viewer_count integer DEFAULT 0,
  total_bids integer DEFAULT 0,
  revenue numeric(10,2) DEFAULT 0.00,
  entrance_fee numeric(10,2) DEFAULT 0.00,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bidders table
CREATE TABLE IF NOT EXISTS public.bidders (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone_number text,
  loyalty_points integer NOT NULL DEFAULT 0,
  role text NOT NULL DEFAULT 'bidder' CHECK (role = 'bidder'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sales table
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date timestamptz NOT NULL DEFAULT now(),
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sale items table
CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  payment_method text NOT NULL,
  reference_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource text,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Product tags table
CREATE TABLE IF NOT EXISTS public.product_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

-- Product tag relations table
CREATE TABLE IF NOT EXISTS public.product_tag_relations (
  product_id text NOT NULL,
  tag_id uuid NOT NULL REFERENCES public.product_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

-- Products table (referenced by product_tag_relations)
CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. AUCTION-RELATED TABLES
-- ============================================================================

-- Auction entrance fees table
CREATE TABLE IF NOT EXISTS public.auction_entrance_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auction_events(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL REFERENCES public.bidders(id) ON DELETE CASCADE,
  fee_amount numeric(10,2) NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  access_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  access_expires_at timestamptz NOT NULL,
  currency text NOT NULL DEFAULT 'PHP',
  provider text,
  provider_session_id text,
  provider_payment_id text,
  checkout_url text,
  paid_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bidder_id, auction_id)
);

-- Auction streams table
CREATE TABLE IF NOT EXISTS public.auction_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auction_events(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('youtube', 'obs', 'twitch', 'zoom', 'custom')),
  stream_url text NOT NULL,
  embed_code text,
  entrance_fee numeric(10,2) NOT NULL DEFAULT 0.00,
  is_active boolean NOT NULL DEFAULT false,
  viewer_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auction lots table
CREATE TABLE IF NOT EXISTS public.auction_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auction_events(id) ON DELETE CASCADE,
  lot_number integer NOT NULL,
  title text NOT NULL,
  description text,
  starting_price numeric(12,2) NOT NULL DEFAULT 0,
  reserve_price numeric(12,2),
  current_price numeric(12,2) NOT NULL DEFAULT 0,
  current_bidder_id uuid REFERENCES public.bidders(id),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'OPEN', 'SOLD', 'SKIPPED', 'CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auction_id, lot_number)
);

-- Auction bids table
CREATE TABLE IF NOT EXISTS public.auction_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auction_events(id) ON DELETE CASCADE,
  lot_id uuid NOT NULL REFERENCES public.auction_lots(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL REFERENCES public.bidders(id),
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'rejected', 'cancelled')),
  is_highest boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'system', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4b. PAYMENT QR CODES & ENTRANCE FEE RECEIPTS
-- ============================================================================

-- Payment QR codes table - Admin uploads QR images per payment method
CREATE TABLE IF NOT EXISTS public.payment_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method text NOT NULL CHECK (payment_method IN ('gcash', 'maya', 'bank_transfer', 'other')),
  label text,
  qr_image_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Entrance fee receipts table - Users upload payment receipts
CREATE TABLE IF NOT EXISTS public.entrance_fee_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auction_events(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL REFERENCES public.bidders(id) ON DELETE CASCADE,
  payment_method text NOT NULL CHECK (payment_method IN ('gcash', 'maya', 'bank_transfer', 'other')),
  receipt_image_url text NOT NULL,
  amount numeric(10,2) NOT NULL,
  reference_number text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bidder_id, auction_id)
);

-- ============================================================================
-- 5. USER PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  notifications jsonb NOT NULL DEFAULT '{"email": true, "push": true, "sms": false}',
  privacy_settings jsonb NOT NULL DEFAULT '{"show_activity": true, "show_bids": false, "show_profile": true}',
  avatar_url text,
  bio text,
  display_name text,
  display_name_changed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. INVENTORY TABLES
-- ============================================================================

-- Inventory ID counters table
CREATE TABLE IF NOT EXISTS public.inventory_id_counters (
  day date PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);

-- Inventory categories table
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_by uuid REFERENCES public.user_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Inventory items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id text PRIMARY KEY,
  name text,
  category_id bigint REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  category_name text,
  condition public.item_condition NOT NULL DEFAULT 'used_good',
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  sold_quantity integer NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0 AND sold_quantity <= quantity),
  starting_bid_price numeric(12,2) NOT NULL DEFAULT 0,
  expected_sale_price numeric(12,2),
  final_sale_price numeric(12,2),
  status public.inventory_status NOT NULL DEFAULT 'pending_auction',
  photo_url text,
  storage_expires_at timestamptz,
  branch_tag text NOT NULL DEFAULT 'Main Branch',
  qr_id uuid,
  qr_path text,
  qr_code_url text,
  qr_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sold_quantity <= quantity)
);

-- QR codes table
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  branch_tag text NOT NULL DEFAULT 'Main Branch',
  printed boolean NOT NULL DEFAULT false,
  is_used boolean NOT NULL DEFAULT false,
  qr_path text,
  qr_code_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  used_by uuid
);

-- Add foreign key for qr_id in inventory_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_items_qr_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_items
    ADD CONSTRAINT inventory_items_qr_id_fkey
    FOREIGN KEY (qr_id) REFERENCES public.qr_codes(id);
  END IF;
END $$;

-- ============================================================================
-- 7. CORE HELPER FUNCTIONS (created after tables exist)
-- ============================================================================

-- Get current user role (security definer to break RLS recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

-- Check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = required_role
    );
END;
$$;

-- Check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(required_roles user_role[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = ANY(required_roles)
    );
END;
$$;

-- Log activity function
CREATE OR REPLACE FUNCTION public.log_activity(action text, resource text, details jsonb DEFAULT NULL::jsonb, ip_address text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (user_id, action, resource, details, ip_address)
    VALUES (auth.uid(), action, resource, details, ip_address)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- ============================================================================
-- 8. INDEXES
-- ============================================================================

-- Auction lots indexes
CREATE INDEX IF NOT EXISTS idx_auction_lots_auction_id ON public.auction_lots(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_lots_status ON public.auction_lots(status);

-- Auction bids indexes
CREATE INDEX IF NOT EXISTS idx_auction_bids_lot_id_created_at ON public.auction_bids(lot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_bids_amount_desc ON public.auction_bids(lot_id, amount DESC);
CREATE INDEX IF NOT EXISTS idx_auction_bids_bidder_id ON public.auction_bids(bidder_id);

-- Entrance fees indexes
CREATE INDEX IF NOT EXISTS idx_entrance_auction_status ON public.auction_entrance_fees(auction_id, payment_status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_entrance_bidder_auction ON public.auction_entrance_fees(bidder_id, auction_id);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON public.inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_condition ON public.inventory_items(condition);
CREATE INDEX IF NOT EXISTS idx_inventory_items_branch ON public.inventory_items(branch_tag);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_at ON public.inventory_items(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category_name);

-- Bidders indexes
CREATE UNIQUE INDEX IF NOT EXISTS bidders_email_lower_unique ON public.bidders(lower(email)) WHERE email IS NOT NULL;

-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_auction_events_updated_at ON public.auction_events;
CREATE TRIGGER update_auction_events_updated_at
  BEFORE UPDATE ON public.auction_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bidders_updated_at ON public.bidders;
CREATE TRIGGER update_bidders_updated_at
  BEFORE UPDATE ON public.bidders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_auction_entrance_fees_updated_at ON public.auction_entrance_fees;
CREATE TRIGGER update_auction_entrance_fees_updated_at
  BEFORE UPDATE ON public.auction_entrance_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_auction_streams_updated_at ON public.auction_streams;
CREATE TRIGGER update_auction_streams_updated_at
  BEFORE UPDATE ON public.auction_streams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_auction_lots_updated_at ON public.auction_lots;
CREATE TRIGGER update_auction_lots_updated_at
  BEFORE UPDATE ON public.auction_lots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_inventory_items ON public.inventory_items;
CREATE TRIGGER set_timestamp_inventory_items
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_inventory_categories_updated_at ON public.inventory_categories;
CREATE TRIGGER trg_inventory_categories_updated_at
  BEFORE UPDATE ON public.inventory_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 10. ENTRANCE FEES TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auction_entrance_fees_set_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end timestamptz;
BEGIN
  -- Always keep updated_at fresh
  NEW.updated_at := now();

  -- On INSERT, prefill access_expires_at with the auction's end_date if not provided
  IF TG_OP = 'INSERT' THEN
    IF NEW.access_expires_at IS NULL THEN
      SELECT end_date INTO v_end FROM public.auction_events WHERE id = NEW.auction_id;
      IF v_end IS NULL THEN
        -- Fallback to 24h if auction not found (shouldn't happen)
        v_end := now() + interval '24 hours';
      END IF;
      NEW.access_expires_at := v_end;
    END IF;
  END IF;

  -- On UPDATE, if transitioning to 'paid', set paid_at and ensure expiry is aligned to auction end
  IF TG_OP = 'UPDATE' THEN
    IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
      IF NEW.paid_at IS NULL THEN
        NEW.paid_at := now();
      END IF;

      SELECT end_date INTO v_end FROM public.auction_events WHERE id = NEW.auction_id;
      IF v_end IS NOT NULL THEN
        NEW.access_expires_at := v_end;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Entrance fees trigger for defaults (after function is created)
DROP TRIGGER IF EXISTS trg_auction_entrance_fees_set_defaults ON public.auction_entrance_fees;
CREATE TRIGGER trg_auction_entrance_fees_set_defaults
BEFORE INSERT OR UPDATE ON public.auction_entrance_fees
FOR EACH ROW
EXECUTE FUNCTION public.auction_entrance_fees_set_defaults();

-- ============================================================================
-- 11. INVENTORY FUNCTIONS
-- ============================================================================

-- Generate inventory ID
CREATE OR REPLACE FUNCTION public.generate_inventory_id(prefix text DEFAULT 'BX')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_day date := CURRENT_DATE;
  v_seq integer;
  v_code text;
BEGIN
  LOOP
    INSERT INTO public.inventory_id_counters (day, last_number)
    VALUES (v_day, 1)
    ON CONFLICT (day)
    DO UPDATE SET last_number = public.inventory_id_counters.last_number + 1
    RETURNING last_number INTO v_seq;

    v_code := prefix || '-' || to_char(v_day, 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');

    RETURN v_code; -- we rely on insert-time unique constraints to guard collisions
  END LOOP;
END;
$$;

-- Reserve inventory labels
CREATE OR REPLACE FUNCTION public.reserve_inventory_labels(p_count int, p_branch text DEFAULT 'Main Branch')
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ids text[] := array[]::text[];
  v_id text;
BEGIN
  IF p_count IS NULL OR p_count <= 0 THEN
    RETURN v_ids;
  END IF;
  IF p_count > 100 THEN
    p_count := 100;
  END IF;

  WHILE array_length(v_ids, 1) IS NULL OR array_length(v_ids, 1) < p_count LOOP
    v_id := public.generate_inventory_id();
    BEGIN
      INSERT INTO public.inventory_items (id, status, branch_tag)
      VALUES (v_id, 'pending_auction', COALESCE(p_branch, 'Main Branch'));
      v_ids := v_ids || v_id;
    EXCEPTION
      WHEN unique_violation THEN
        -- retry with next id
        NULL;
    END;
  END LOOP;

  RETURN v_ids;
END;
$$;

-- Confirm QR scan
CREATE OR REPLACE FUNCTION public.inventory_confirm_qr(scanned_code text, expected_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_exists boolean;
  v_success boolean := false;
  v_error text := null;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.inventory_items WHERE id = expected_id) INTO v_exists;

  IF NOT v_exists THEN
    v_error := 'Item not found';
  ELSIF scanned_code IS NULL OR scanned_code <> expected_id THEN
    v_error := 'QR mismatch';
  ELSE
    v_success := true;
  END IF;

  -- Audit (best-effort)
  PERFORM public.log_activity(
    'inventory_qr_confirm',
    'inventory_items',
    jsonb_build_object('expected_id', expected_id, 'scanned_code', scanned_code, 'success', v_success),
    null
  );

  RETURN jsonb_build_object('success', v_success, 'error', v_error);
END;
$$;

-- Update inventory status
CREATE OR REPLACE FUNCTION public.update_inventory_status(
  p_item_id text,
  p_new_status public.inventory_status,
  p_sold_delta int DEFAULT 0,
  p_final_price numeric(10,2) DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item record;
  v_error text := null;
BEGIN
  SELECT * INTO v_item FROM public.inventory_items WHERE id = p_item_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  -- Basic transition guardrails
  IF v_item.status = 'locked' AND p_new_status = 'walk_in_available' THEN
    v_error := 'Locked items cannot be walk-in available until unlocked';
    RETURN jsonb_build_object('success', false, 'error', v_error);
  END IF;

  -- Sold quantity adjustments
  IF p_sold_delta IS NOT NULL AND p_sold_delta <> 0 THEN
    IF p_sold_delta < 0 THEN
      IF v_item.sold_quantity + p_sold_delta < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sold quantity cannot be negative');
      END IF;
    ELSE
      IF v_item.sold_quantity + p_sold_delta > v_item.quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sold exceeds total quantity');
      END IF;
    END IF;
  END IF;

  -- Apply updates
  UPDATE public.inventory_items
  SET
    status = p_new_status,
    sold_quantity = CASE WHEN p_sold_delta IS NULL THEN sold_quantity ELSE sold_quantity + p_sold_delta END,
    final_sale_price = COALESCE(p_final_price, final_sale_price),
    storage_expires_at = CASE
      WHEN p_new_status = 'auctioned_sold' THEN now() + interval '72 hours'
      ELSE storage_expires_at
    END
  WHERE id = p_item_id;

  -- Audit
  PERFORM public.log_activity(
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

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- 12. QR CODE FUNCTIONS
-- ============================================================================

-- Reserve QR codes
CREATE OR REPLACE FUNCTION public.reserve_qr_codes(p_count integer, p_branch text DEFAULT 'Main Branch')
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_codes text[] := array[]::text[];
  v_code  text;
  v_count int := greatest(least(coalesce(p_count,0), 500), 0); -- cap at 500
BEGIN
  IF v_count = 0 THEN
    RETURN v_codes;
  END IF;

  WHILE array_length(v_codes,1) IS NULL OR array_length(v_codes,1) < v_count LOOP
    -- Reuse existing generator for nice human-friendly codes
    v_code := public.generate_inventory_id();

    BEGIN
      INSERT INTO public.qr_codes (code, branch_tag)
      VALUES (v_code, coalesce(p_branch, 'Main Branch'));
      v_codes := v_codes || v_code;
    EXCEPTION WHEN unique_violation THEN
      -- retry with next id
      NULL;
    END;
  END LOOP;

  -- Audit
  PERFORM public.log_activity(
    'reserve_qr_codes',
    'qr_codes',
    jsonb_build_object('count', v_count, 'branch', p_branch, 'codes', v_codes),
    null
  );

  RETURN v_codes;
END;
$$;

-- Validate QR code
CREATE OR REPLACE FUNCTION public.qr_validate(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_qr record;
BEGIN
  SELECT id, is_used, qr_path, qr_code_url, branch_tag
    INTO v_qr
  FROM public.qr_codes
  WHERE code = p_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exists', false);
  END IF;

  RETURN jsonb_build_object(
    'exists', true,
    'is_used', v_qr.is_used,
    'qr_id', v_qr.id,
    'qr_path', v_qr.qr_path,
    'qr_code_url', v_qr.qr_code_url,
    'branch_tag', v_qr.branch_tag
  );
END;
$$;

-- Claim QR and create inventory
CREATE OR REPLACE FUNCTION public.qr_claim_and_create_inventory(p_code text, p_item jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_qr public.qr_codes%rowtype;
  v_item_id text := p_code; -- use the QR code as the inventory id (aligns with printed label)
BEGIN
  SELECT * INTO v_qr
  FROM public.qr_codes
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'QR not found');
  END IF;

  IF v_qr.is_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'QR already used');
  END IF;

  INSERT INTO public.inventory_items (
    id, name, category_id, category_name, condition, quantity,
    starting_bid_price, expected_sale_price, photo_url, branch_tag, status,
    qr_id, qr_path, qr_code_url, qr_generated
  ) VALUES (
    v_item_id,
    nullif(p_item->>'name', ''),
    nullif((p_item->>'category_id')::bigint, null),
    nullif(p_item->>'category_name', ''),
    coalesce((p_item->>'condition')::public.item_condition, 'used_good'::public.item_condition),
    coalesce((p_item->>'quantity')::int, 1),
    coalesce((p_item->>'starting_bid_price')::numeric, 0),
    nullif((p_item->>'expected_sale_price')::numeric, null),
    nullif(p_item->>'photo_url', ''),
    coalesce(nullif(p_item->>'branch_tag', ''), v_qr.branch_tag),
    'pending_auction'::public.inventory_status,
    v_qr.id,
    v_qr.qr_path,
    v_qr.qr_code_url,
    CASE WHEN v_qr.qr_path IS NOT NULL OR v_qr.qr_code_url IS NOT NULL THEN true ELSE false END
  );

  UPDATE public.qr_codes
  SET is_used = true,
      used_at = now(),
      used_by = auth.uid()
  WHERE id = v_qr.id;

  PERFORM public.log_activity(
    'qr_claimed_create_inventory',
    'inventory_items',
    jsonb_build_object('code', p_code, 'item_id', v_item_id),
    null
  );

  RETURN jsonb_build_object('success', true, 'item_id', v_item_id, 'qr_id', v_qr.id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Inventory ID already exists or QR already linked');
END;
$$;

-- ============================================================================
-- 13. BIDDING FUNCTIONS
-- ============================================================================

-- Place bid function
CREATE OR REPLACE FUNCTION public.place_bid(p_lot_id uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lot               public.auction_lots%rowtype;
  v_bidder            uuid := auth.uid();
  v_current           numeric(12,2);
  v_min_increment     numeric(12,2);
  v_required_min      numeric(12,2);
  v_auction_id        uuid;
  v_bid_id            uuid;
  v_top_bids          jsonb;
  v_lot_row           jsonb;
BEGIN
  -- 1) Auth required
  IF v_bidder IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 2) Lock the lot row to prevent race conditions
  SELECT *
  INTO v_lot
  FROM public.auction_lots
  WHERE id = p_lot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lot not found');
  END IF;

  IF v_lot.status <> 'OPEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bidding is not open for this lot');
  END IF;

  v_auction_id := v_lot.auction_id;

  -- 3) Entrance fee enforcement (must be paid and not expired)
  IF NOT EXISTS (
    SELECT 1
    FROM public.auction_entrance_fees aef
    WHERE aef.auction_id = v_auction_id
      AND aef.bidder_id = v_bidder
      AND aef.payment_status = 'paid'
      AND now() < aef.access_expires_at
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entrance fee unpaid or expired', 'action', 'pay_entry_fee');
  END IF;

  -- 4) Determine current price baseline
  v_current := greatest(coalesce(v_lot.current_price, 0), coalesce(v_lot.starting_price, 0));

  -- 5) Min increment rule: >= 5% or >= 20 PHP
  v_min_increment := greatest(ceil((v_current * 0.05)::numeric), 20);
  v_required_min := v_current + v_min_increment;

  IF p_amount < v_required_min THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bid too low',
      'required_minimum', v_required_min
    );
  END IF;

  -- 6) Insert the bid as highest
  INSERT INTO public.auction_bids (auction_id, lot_id, bidder_id, amount, status, is_highest, source)
  VALUES (v_auction_id, p_lot_id, v_bidder, p_amount, 'accepted', true, 'user')
  RETURNING id INTO v_bid_id;

  -- 7) Clear previous highest flags
  UPDATE public.auction_bids
  SET is_highest = false
  WHERE lot_id = p_lot_id
    AND id <> v_bid_id
    AND is_highest = true;

  -- 8) Update lot leader and price
  UPDATE public.auction_lots
  SET current_price = p_amount,
      current_bidder_id = v_bidder,
      updated_at = now()
  WHERE id = p_lot_id;

  -- 9) Audit log
  PERFORM public.log_activity(
    'bid_placed',
    'auction_bids',
    jsonb_build_object('lot_id', p_lot_id, 'bid_id', v_bid_id, 'amount', p_amount, 'bidder_id', v_bidder),
    NULL
  );

  -- 10) Build response payload
  SELECT row_to_json(l) INTO v_lot_row
  FROM (
    SELECT id, auction_id, lot_number, title, description, starting_price, reserve_price, current_price, current_bidder_id, status, created_at, updated_at
    FROM public.auction_lots
    WHERE id = p_lot_id
  ) l;

  SELECT jsonb_agg(x) INTO v_top_bids
  FROM (
    SELECT jsonb_build_object(
      'bid_id', id,
      'bidder_id', bidder_id,
      'amount', amount,
      'created_at', created_at
    )
    FROM public.auction_bids
    WHERE lot_id = p_lot_id
    ORDER BY amount DESC, created_at ASC
    LIMIT 5
  ) x;

  RETURN jsonb_build_object(
    'success', true,
    'bid_id', v_bid_id,
    'lot', v_lot_row,
    'top_bids', coalesce(v_top_bids, '[]'::jsonb)
  );
END;
$$;

-- ============================================================================
-- 14. USER PREFERENCES FUNCTIONS
-- ============================================================================

-- Check if user can change display name (7-day cooldown)
CREATE OR REPLACE FUNCTION public.can_change_display_name(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE 
    WHEN display_name_changed_at IS NULL THEN TRUE
    WHEN display_name_changed_at < NOW() - INTERVAL '7 days' THEN TRUE
    ELSE FALSE
  END
  FROM public.user_preferences 
  WHERE user_preferences.user_id = can_change_display_name.user_id;
$$;

-- Update display name with cooldown validation
CREATE OR REPLACE FUNCTION public.update_display_name(new_display_name TEXT)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  can_change BOOLEAN;
  result JSONB;
BEGIN
  -- Check if user can change display name
  SELECT public.can_change_display_name(auth.uid()) INTO can_change;
  
  IF NOT can_change THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Display name can only be changed once every 7 days'
    );
  END IF;
  
  -- Update display name and timestamp
  UPDATE public.user_preferences 
  SET 
    display_name = new_display_name,
    display_name_changed_at = NOW(),
    updated_at = NOW()
  WHERE user_id = auth.uid();
  
  -- If no row was updated, insert a new preferences row
  IF NOT FOUND THEN
    INSERT INTO public.user_preferences (user_id, display_name, display_name_changed_at)
    VALUES (auth.uid(), new_display_name, NOW());
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- 15. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bidders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_entrance_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- User profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin can view all user profiles" ON public.user_profiles;
CREATE POLICY "Admin can view all user profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.get_current_user_role() IN ('admin', 'super-admin'));

DROP POLICY IF EXISTS "Super-admin can manage all user profiles" ON public.user_profiles;
CREATE POLICY "Super-admin can manage all user profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.get_current_user_role() = 'super-admin');

DROP POLICY IF EXISTS "Admin can manage non-admin user profiles" ON public.user_profiles;
CREATE POLICY "Admin can manage non-admin user profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  public.get_current_user_role() = 'admin' 
  AND role NOT IN ('admin', 'super-admin')
);

-- Auction events policies
DROP POLICY IF EXISTS "Everyone can view auction events" ON public.auction_events;
CREATE POLICY "Everyone can view auction events"
ON public.auction_events
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin can manage auction events" ON public.auction_events;
CREATE POLICY "Admin can manage auction events"
ON public.auction_events
FOR ALL
TO authenticated
USING (public.get_current_user_role() IN ('admin', 'super-admin'));

-- Bidders policies
DROP POLICY IF EXISTS "Admin can manage bidders" ON public.bidders;
CREATE POLICY "Admin can manage bidders"
ON public.bidders
FOR ALL
TO authenticated
USING (public.get_current_user_role() IN ('admin', 'super-admin'));

DROP POLICY IF EXISTS "Bidders can view their own profile" ON public.bidders;
CREATE POLICY "Bidders can view their own profile"
ON public.bidders
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Sales policies
DROP POLICY IF EXISTS "Staff and admin can manage sales" ON public.sales;
CREATE POLICY "Staff and admin can manage sales"
ON public.sales
FOR ALL
TO authenticated
USING (public.get_current_user_role() IN ('staff', 'admin', 'super-admin'));

-- Sale items policies
DROP POLICY IF EXISTS "Staff and admin can manage sale items" ON public.sale_items;
CREATE POLICY "Staff and admin can manage sale items"
ON public.sale_items
FOR ALL
TO authenticated
USING (public.get_current_user_role() IN ('staff', 'admin', 'super-admin'));

-- Payments policies
DROP POLICY IF EXISTS "Staff and admin can manage payments" ON public.payments;
CREATE POLICY "Staff and admin can manage payments"
ON public.payments
FOR ALL
TO authenticated
USING (public.get_current_user_role() IN ('staff', 'admin', 'super-admin'));

-- Product tags policies
DROP POLICY IF EXISTS "Everyone can view product tags" ON public.product_tags;
CREATE POLICY "Everyone can view product tags"
ON public.product_tags
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin and staff can manage product tags" ON public.product_tags;
CREATE POLICY "Admin and staff can manage product tags"
ON public.product_tags
FOR ALL
TO authenticated
USING (public.get_current_user_role() IN ('staff', 'admin', 'super-admin'));

-- Product tag relations policies
DROP POLICY IF EXISTS "Everyone can view product tag relations" ON public.product_tag_relations;
CREATE POLICY "Everyone can view product tag relations"
ON public.product_tag_relations
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin and staff can manage product tag relations" ON public.product_tag_relations;
CREATE POLICY "Admin and staff can manage product tag relations"
ON public.product_tag_relations
FOR ALL
TO authenticated
USING (public.get_current_user_role() IN ('staff', 'admin', 'super-admin'));

-- Auction entrance fees policies
DROP POLICY IF EXISTS "Users can view their own entrance fees" ON public.auction_entrance_fees;
CREATE POLICY "Users can view their own entrance fees"
ON public.auction_entrance_fees
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.bidders 
  WHERE bidders.id = auction_entrance_fees.bidder_id 
  AND bidders.id = auth.uid()
));

DROP POLICY IF EXISTS "Admin can manage all entrance fees" ON public.auction_entrance_fees;
CREATE POLICY "Admin can manage all entrance fees"
ON public.auction_entrance_fees
FOR ALL
USING (public.get_current_user_role() = ANY (ARRAY['admin'::user_role, 'super-admin'::user_role]));

-- Auction streams policies
DROP POLICY IF EXISTS "Everyone can view active auction streams" ON public.auction_streams;
CREATE POLICY "Everyone can view active auction streams"
ON public.auction_streams
FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Admin and auction managers can manage streams" ON public.auction_streams;
CREATE POLICY "Admin and auction managers can manage streams"
ON public.auction_streams
FOR ALL
USING (public.get_current_user_role() = ANY (ARRAY['admin'::user_role, 'super-admin'::user_role]));

-- Auction lots policies
DROP POLICY IF EXISTS "Staff/Admin manage auction lots" ON public.auction_lots;
CREATE POLICY "Staff/Admin manage auction lots"
ON public.auction_lots
FOR ALL
USING (public.has_any_role(ARRAY['staff'::user_role, 'admin'::user_role, 'super-admin'::user_role]))
WITH CHECK (public.has_any_role(ARRAY['staff'::user_role, 'admin'::user_role, 'super-admin'::user_role]));

DROP POLICY IF EXISTS "Authenticated can view lots" ON public.auction_lots;
CREATE POLICY "Authenticated can view lots"
ON public.auction_lots
FOR SELECT
USING (true);

-- Auction bids policies
DROP POLICY IF EXISTS "Authenticated can view bids" ON public.auction_bids;
CREATE POLICY "Authenticated can view bids"
ON public.auction_bids
FOR SELECT
USING (true);

-- User preferences policies
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage their own preferences"
ON public.user_preferences
FOR ALL
USING (auth.uid() = user_id);

-- Inventory categories policies
DROP POLICY IF EXISTS "Staff and admins can manage inventory categories" ON public.inventory_categories;
CREATE POLICY "Staff and admins can manage inventory categories"
ON public.inventory_categories
FOR ALL
USING (public.get_current_user_role() = ANY (ARRAY['staff'::user_role,'admin'::user_role,'super-admin'::user_role]))
WITH CHECK (public.get_current_user_role() = ANY (ARRAY['staff'::user_role,'admin'::user_role,'super-admin'::user_role]));

-- Inventory items policies
DROP POLICY IF EXISTS "Staff and admins can manage inventory items" ON public.inventory_items;
CREATE POLICY "Staff and admins can manage inventory items"
ON public.inventory_items
FOR ALL
USING (public.get_current_user_role() = ANY (ARRAY['staff'::user_role,'admin'::user_role,'super-admin'::user_role]))
WITH CHECK (public.get_current_user_role() = ANY (ARRAY['staff'::user_role,'admin'::user_role,'super-admin'::user_role]));

-- QR codes policies
DROP POLICY IF EXISTS "Staff/Admin manage qr codes" ON public.qr_codes;
CREATE POLICY "Staff/Admin manage qr codes"
ON public.qr_codes
FOR ALL
USING (public.get_current_user_role() = ANY (ARRAY['staff'::public.user_role,'admin'::public.user_role,'super-admin'::public.user_role]))
WITH CHECK (public.get_current_user_role() = ANY (ARRAY['staff'::public.user_role,'admin'::public.user_role,'super-admin'::public.user_role]));

-- ============================================================================
-- 16. VIEWS
-- ============================================================================

-- Public auction events view
DROP VIEW IF EXISTS public.auction_events_public;
CREATE VIEW public.auction_events_public AS
SELECT 
  id,
  title,
  description,
  status,
  start_date,
  end_date,
  theme_title,
  created_at
FROM public.auction_events;

ALTER VIEW public.auction_events_public SET (security_barrier = true);

-- ============================================================================
-- 17. REALTIME SETUP
-- ============================================================================

ALTER TABLE public.auction_lots REPLICA IDENTITY FULL;
ALTER TABLE public.auction_bids REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'auction_lots'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_lots;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'auction_bids'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_bids;
  END IF;
END $$;

-- ============================================================================
-- 18. STORAGE BUCKETS AND POLICIES
-- ============================================================================

-- Inventory photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-photos', 'inventory-photos', true)
ON CONFLICT (id) DO NOTHING;

-- QR codes bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-codes', 'qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- Inventory photos policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Inventory photos - read'
  ) THEN
    CREATE POLICY "Inventory photos - read"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'inventory-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Inventory photos - upload'
  ) THEN
    CREATE POLICY "Inventory photos - upload"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'inventory-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Inventory photos - update'
  ) THEN
    CREATE POLICY "Inventory photos - update"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'inventory-photos')
      WITH CHECK (bucket_id = 'inventory-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Inventory photos - delete'
  ) THEN
    CREATE POLICY "Inventory photos - delete"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'inventory-photos');
  END IF;
END $$;

-- QR codes storage policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read qr-codes'
  ) THEN
    CREATE POLICY "Public read qr-codes"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'qr-codes');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff/Admin can upload to qr-codes'
  ) THEN
    CREATE POLICY "Staff/Admin can upload to qr-codes"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'qr-codes'
        AND public.get_current_user_role() = ANY (ARRAY['staff'::public.user_role, 'admin'::public.user_role, 'super-admin'::public.user_role])
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff/Admin can modify qr-codes'
  ) THEN
    CREATE POLICY "Staff/Admin can modify qr-codes"
      ON storage.objects
      FOR ALL
      TO authenticated
      USING (
        bucket_id = 'qr-codes'
        AND public.get_current_user_role() = ANY (ARRAY['staff'::public.user_role, 'admin'::public.user_role, 'super-admin'::public.user_role])
      )
      WITH CHECK (
        bucket_id = 'qr-codes'
        AND public.get_current_user_role() = ANY (ARRAY['staff'::public.user_role, 'admin'::public.user_role, 'super-admin'::public.user_role])
      );
  END IF;
END $$;

-- ============================================================================
-- 19. SEED DATA
-- ============================================================================

-- Seed default inventory categories
INSERT INTO public.inventory_categories (name)
VALUES
  ('Furniture'),
  ('Electronics'),
  ('Kitchenware'),
  ('Fashion'),
  ('Tools'),
  ('Toys'),
  ('Sporting Goods'),
  ('Appliances'),
  ('Automotive'),
  ('Garden'),
  ('Office'),
  ('Miscellaneous')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 20. FUNCTION PERMISSIONS
-- ============================================================================

REVOKE ALL ON FUNCTION public.place_bid(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid, numeric) TO authenticated;

-- ============================================================================
-- 21. AUTO-CREATE PROFILES TRIGGER
-- ============================================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_phone_number text;
BEGIN
  -- Get user metadata if available
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  v_phone_number := NEW.raw_user_meta_data->>'phone_number';

  -- Create user profile with default 'bidder' role
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    'bidder'::user_role
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create bidder entry
  INSERT INTO public.bidders (id, full_name, email, phone_number, loyalty_points, role)
  VALUES (
    NEW.id,
    v_full_name,
    NEW.email,
    v_phone_number,
    0,
    'bidder'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 22. SETUP DEFAULT TEST USERS (if they exist)
-- ============================================================================
-- This will automatically create profiles for default test users if they exist
-- Note: Users must be created in Supabase Dashboard → Authentication → Users first
-- ============================================================================

-- Function to setup default user profiles
CREATE OR REPLACE FUNCTION public.setup_default_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bidder_id uuid;
  v_admin_id uuid;
  v_result jsonb := '{"bidder": false, "admin": false}'::jsonb;
BEGIN
  -- Setup Bidder User
  SELECT id INTO v_bidder_id
  FROM auth.users
  WHERE email = 'bidder-account@blueskyauction.com'
  LIMIT 1;

  IF v_bidder_id IS NOT NULL THEN
    -- Create user profile
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (v_bidder_id, 'bidder-account@blueskyauction.com', 'Bidder Account', 'bidder'::user_role)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = 'bidder'::user_role;
    
    -- Create bidder entry
    INSERT INTO public.bidders (id, full_name, email, loyalty_points, role)
    VALUES (v_bidder_id, 'Bidder Account', 'bidder-account@blueskyauction.com', 0, 'bidder')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      role = 'bidder';
    
    v_result := jsonb_set(v_result, '{bidder}', 'true'::jsonb);
  END IF;

  -- Setup Super-Admin User
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE email = 'admin-account@blueskyauction.com'
  LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    -- Create user profile
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (v_admin_id, 'admin-account@blueskyauction.com', 'Admin Account', 'super-admin'::user_role)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = 'super-admin'::user_role;
    
    v_result := jsonb_set(v_result, '{admin}', 'true'::jsonb);
  END IF;

  RETURN v_result;
END;
$$;

-- Automatically setup default users if they exist
SELECT public.setup_default_users();

-- ============================================================================
-- 23. VERIFICATION REPORT
-- ============================================================================

-- Show status of default test users
SELECT 
  CASE 
    WHEN u.id IS NULL THEN '❌ USER NOT FOUND'
    WHEN up.id IS NULL THEN '⚠️ PROFILE MISSING'
    ELSE '✅ READY'
  END as status,
  COALESCE(u.email, expected.email) as "Login Email",
  COALESCE(up.full_name, 'Not set') as "Name",
  COALESCE(up.role::text, 'Not set') as "Role",
  CASE WHEN b.id IS NOT NULL THEN 'Yes' ELSE 'No' END as "Is Bidder",
  CASE 
    WHEN u.id IS NULL THEN 'Create in Dashboard: Authentication → Users'
    WHEN up.id IS NULL THEN 'Profile will be created automatically on next user action'
    ELSE 'Login with: ' || 
         CASE 
           WHEN expected.email = 'bidder-account@blueskyauction.com' THEN 'bidder-account'
           WHEN expected.email = 'admin-account@blueskyauction.com' THEN 'admin-account'
           ELSE expected.email
         END || ' / password'
  END as "Instructions"
FROM (VALUES 
  ('bidder-account@blueskyauction.com'),
  ('admin-account@blueskyauction.com')
) AS expected(email)
LEFT JOIN auth.users u ON u.email = expected.email
LEFT JOIN public.user_profiles up ON u.id = up.id
LEFT JOIN public.bidders b ON u.id = b.id
ORDER BY expected.email;

-- ============================================================================
-- INITIALIZATION COMPLETE
-- ============================================================================
-- 
-- NEXT STEPS:
-- 1. Create users in Supabase Dashboard → Authentication → Users:
--    - bidder-account@blueskyauction.com / bidder-password
--    - admin-account@blueskyauction.com / admin-password
-- 2. After creating users, run this query to setup their profiles:
--    SELECT public.setup_default_users();
-- 3. Or profiles will be created automatically via the trigger when users sign up
-- 
-- LOGIN CREDENTIALS (after users are created):
-- - Bidder: username "bidder-account" or email "bidder-account@blueskyauction.com" / password "bidder-password"
-- - Admin: username "admin-account" or email "admin-account@blueskyauction.com" / password "admin-password"
-- ============================================================================
