
-- 1) Extend auction_entrance_fees for PH wallets + lifecycle control

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'auction_entrance_fees' AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.auction_entrance_fees
      ADD COLUMN currency text NOT NULL DEFAULT 'PHP';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'auction_entrance_fees' AND column_name = 'provider'
  ) THEN
    ALTER TABLE public.auction_entrance_fees
      ADD COLUMN provider text; -- e.g., 'gcash', 'maya', 'xendit', 'paymongo'
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'auction_entrance_fees' AND column_name = 'provider_session_id'
  ) THEN
    ALTER TABLE public.auction_entrance_fees
      ADD COLUMN provider_session_id text; -- checkout session / invoice / link id
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'auction_entrance_fees' AND column_name = 'provider_payment_id'
  ) THEN
    ALTER TABLE public.auction_entrance_fees
      ADD COLUMN provider_payment_id text; -- charge / payment id
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'auction_entrance_fees' AND column_name = 'checkout_url'
  ) THEN
    ALTER TABLE public.auction_entrance_fees
      ADD COLUMN checkout_url text; -- hosted checkout url for redirect
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'auction_entrance_fees' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE public.auction_entrance_fees
      ADD COLUMN paid_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'auction_entrance_fees' AND column_name = 'redeemed_at'
  ) THEN
    ALTER TABLE public.auction_entrance_fees
      ADD COLUMN redeemed_at timestamptz; -- set when user "enters" first time if desired
  END IF;
END $$;

-- 2) Ensure one entrance per user per auction (prevents double charging)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uniq_entrance_bidder_auction'
  ) THEN
    CREATE UNIQUE INDEX uniq_entrance_bidder_auction
      ON public.auction_entrance_fees (bidder_id, auction_id);
  END IF;
END $$;

-- 3) Trigger to set expiry and timestamps, and keep updated_at fresh
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

DROP TRIGGER IF EXISTS trg_auction_entrance_fees_set_defaults ON public.auction_entrance_fees;

CREATE TRIGGER trg_auction_entrance_fees_set_defaults
BEFORE INSERT OR UPDATE ON public.auction_entrance_fees
FOR EACH ROW
EXECUTE PROCEDURE public.auction_entrance_fees_set_defaults();

-- 4) Helpful index for queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_entrance_auction_status'
  ) THEN
    CREATE INDEX idx_entrance_auction_status
      ON public.auction_entrance_fees (auction_id, payment_status);
  END IF;
END $$;
