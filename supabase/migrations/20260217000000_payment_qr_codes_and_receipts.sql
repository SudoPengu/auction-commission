-- ============================================================================
-- Migration: Add payment QR codes and entrance fee receipts tables
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

-- Create storage buckets for payment images (both public for URL access)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('payment-qr-codes', 'payment-qr-codes', true),
  ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- RLS policies for payment_qr_codes
ALTER TABLE public.payment_qr_codes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view active payment QR codes' AND tablename = 'payment_qr_codes') THEN
    CREATE POLICY "Anyone can view active payment QR codes"
      ON public.payment_qr_codes FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage payment QR codes' AND tablename = 'payment_qr_codes') THEN
    CREATE POLICY "Admins can manage payment QR codes"
      ON public.payment_qr_codes FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
        )
      );
  END IF;
END $$;

-- RLS policies for entrance_fee_receipts
ALTER TABLE public.entrance_fee_receipts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Bidders can view own receipts' AND tablename = 'entrance_fee_receipts') THEN
    CREATE POLICY "Bidders can view own receipts"
      ON public.entrance_fee_receipts FOR SELECT
      USING (bidder_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Bidders can submit receipts' AND tablename = 'entrance_fee_receipts') THEN
    CREATE POLICY "Bidders can submit receipts"
      ON public.entrance_fee_receipts FOR INSERT
      WITH CHECK (bidder_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all receipts' AND tablename = 'entrance_fee_receipts') THEN
    CREATE POLICY "Admins can view all receipts"
      ON public.entrance_fee_receipts FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super-admin', 'staff')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update receipts' AND tablename = 'entrance_fee_receipts') THEN
    CREATE POLICY "Admins can update receipts"
      ON public.entrance_fee_receipts FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
        )
      );
  END IF;
END $$;

-- Storage policies (idempotent with IF NOT EXISTS)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view payment QR codes' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Anyone can view payment QR codes"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'payment-qr-codes');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can upload payment QR codes' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Admins can upload payment QR codes"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'payment-qr-codes' AND
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete payment QR codes' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Admins can delete payment QR codes"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'payment-qr-codes' AND
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload own payment receipts' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Users can upload own payment receipts"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'payment-receipts' AND
        auth.uid() IS NOT NULL
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own payment receipts' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Users can view own payment receipts"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'payment-receipts' AND
        auth.uid() IS NOT NULL
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all payment receipts' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Admins can view all payment receipts"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'payment-receipts' AND
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super-admin', 'staff')
        )
      );
  END IF;
END $$;

-- Triggers for updated_at (DROP first to be idempotent)
DROP TRIGGER IF EXISTS update_payment_qr_codes_updated_at ON public.payment_qr_codes;
CREATE TRIGGER update_payment_qr_codes_updated_at
  BEFORE UPDATE ON public.payment_qr_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_entrance_fee_receipts_updated_at ON public.entrance_fee_receipts;
CREATE TRIGGER update_entrance_fee_receipts_updated_at
  BEFORE UPDATE ON public.entrance_fee_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
