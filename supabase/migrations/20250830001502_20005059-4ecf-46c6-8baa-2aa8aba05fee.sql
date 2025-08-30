
-- 0) Early dependency checks: helper functions must exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    RAISE EXCEPTION 'Missing function: update_updated_at_column';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_any_role') THEN
    RAISE EXCEPTION 'Missing function: has_any_role';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_activity') THEN
    RAISE EXCEPTION 'Missing function: log_activity';
  END IF;
END $$;

-- 1) Early dependency checks: required tables/columns
DO $$
BEGIN
  -- auction_entrance_fees table + columns for entrance fee enforcement
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='auction_entrance_fees'
  ) THEN
    RAISE EXCEPTION 'Missing table: public.auction_entrance_fees';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='auction_entrance_fees' AND column_name='payment_status'
  ) THEN
    RAISE EXCEPTION 'Missing column: auction_entrance_fees.payment_status';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='auction_entrance_fees' AND column_name='access_expires_at'
  ) THEN
    RAISE EXCEPTION 'Missing column: auction_entrance_fees.access_expires_at';
  END IF;

  -- auction_events table + total_bids column (consistency check)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='auction_events'
  ) THEN
    RAISE EXCEPTION 'Missing table: public.auction_events';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='auction_events' AND column_name='total_bids'
  ) THEN
    RAISE EXCEPTION 'Missing column: auction_events.total_bids';
  END IF;
END $$;

-- 2) Core schema: auction_lots
CREATE TABLE IF NOT EXISTS public.auction_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auction_events(id) ON DELETE CASCADE,
  lot_number integer NOT NULL,
  title text NOT NULL,
  description text,
  starting_price numeric(12,2) NOT NULL DEFAULT 0,
  reserve_price numeric(12,2),
  current_price numeric(12,2) NOT NULL DEFAULT 0,
  current_bidder_id uuid,
  status text NOT NULL DEFAULT 'PENDING', -- PENDING | OPEN | SOLD | SKIPPED | CANCELLED
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auction_id, lot_number)
);

-- 3) Core schema: auction_bids
CREATE TABLE IF NOT EXISTS public.auction_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auction_events(id) ON DELETE CASCADE,
  lot_id uuid NOT NULL REFERENCES public.auction_lots(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'accepted', -- accepted | rejected | cancelled
  is_highest boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'user', -- user | system | staff
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_auction_lots_auction_id ON public.auction_lots(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_lots_status ON public.auction_lots(status);
CREATE INDEX IF NOT EXISTS idx_auction_bids_lot_id_created_at ON public.auction_bids(lot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_bids_amount_desc ON public.auction_bids(lot_id, amount DESC);
CREATE INDEX IF NOT EXISTS idx_auction_bids_bidder_id ON public.auction_bids(bidder_id);

-- 5) updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'auction_lots_set_updated_at'
  ) THEN
    CREATE TRIGGER auction_lots_set_updated_at
    BEFORE UPDATE ON public.auction_lots
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'auction_bids_set_updated_at'
  ) THEN
    CREATE TRIGGER auction_bids_set_updated_at
    BEFORE UPDATE ON public.auction_bids
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 6) RLS
ALTER TABLE public.auction_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

-- 6.a) auction_lots policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='auction_lots' AND policyname='Staff/Admin manage auction lots'
  ) THEN
    CREATE POLICY "Staff/Admin manage auction lots"
    ON public.auction_lots
    FOR ALL
    USING (public.has_any_role(ARRAY['staff'::user_role, 'admin'::user_role, 'super-admin'::user_role, 'auction-manager'::user_role]))
    WITH CHECK (public.has_any_role(ARRAY['staff'::user_role, 'admin'::user_role, 'super-admin'::user_role, 'auction-manager'::user_role]));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='auction_lots' AND policyname='Authenticated can view lots'
  ) THEN
    CREATE POLICY "Authenticated can view lots"
    ON public.auction_lots
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- 6.b) auction_bids policies (block writes; allow reads)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='auction_bids' AND policyname='Authenticated can view bids'
  ) THEN
    CREATE POLICY "Authenticated can view bids"
    ON public.auction_bids
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- 7) Realtime setup
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
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_lots';
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
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_bids';
  END IF;
END $$;

-- 8) Hardened bid placement RPC with entrance fee enforcement
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

-- 9) Permissions for the RPC
REVOKE ALL ON FUNCTION public.place_bid(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid, numeric) TO authenticated;

-- 10) Best-effort: set function owner to postgres (may be ignored if not permitted)
DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.place_bid(uuid, numeric) OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN
  -- ignore if current role lacks permission; GRANT EXECUTE above suffices
  NULL;
END $$;
