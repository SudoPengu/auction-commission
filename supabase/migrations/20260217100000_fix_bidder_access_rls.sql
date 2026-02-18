-- ============================================================================
-- Fix: Allow bidders to INSERT and UPDATE their own auction_entrance_fees
-- Without these policies, the payment flow silently fails when trying to
-- create the access record after receipt upload.
-- ============================================================================

-- Allow bidders to insert their own entrance fee records
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Bidders can create own entrance fees' AND tablename = 'auction_entrance_fees') THEN
    CREATE POLICY "Bidders can create own entrance fees"
      ON public.auction_entrance_fees FOR INSERT
      WITH CHECK (bidder_id = auth.uid());
  END IF;
END $$;

-- Allow bidders to update their own entrance fee records (for payment status changes)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Bidders can update own entrance fees' AND tablename = 'auction_entrance_fees') THEN
    CREATE POLICY "Bidders can update own entrance fees"
      ON public.auction_entrance_fees FOR UPDATE
      USING (bidder_id = auth.uid());
  END IF;
END $$;

-- Allow bidders to update their own receipts (needed for upsert on resubmission)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Bidders can update own receipts' AND tablename = 'entrance_fee_receipts') THEN
    CREATE POLICY "Bidders can update own receipts"
      ON public.entrance_fee_receipts FOR UPDATE
      USING (bidder_id = auth.uid());
  END IF;
END $$;
