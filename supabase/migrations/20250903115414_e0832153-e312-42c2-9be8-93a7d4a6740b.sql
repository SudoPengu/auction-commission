
-- 1) Ensure role column exists and defaults to 'bidder'
ALTER TABLE public.bidders
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'bidder';

-- 2) Normalize any existing rows to be 'bidder' before adding constraint
UPDATE public.bidders
SET role = 'bidder'
WHERE role IS DISTINCT FROM 'bidder';

-- 3) Add CHECK constraint to force role to always be 'bidder'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bidders_role_is_bidder'
      AND conrelid = 'public.bidders'::regclass
  ) THEN
    ALTER TABLE public.bidders
      ADD CONSTRAINT bidders_role_is_bidder CHECK (role = 'bidder');
  END IF;
END $$;

-- 4) Add unique, case-insensitive index for email (ignore NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS bidders_email_lower_unique
  ON public.bidders (lower(email))
  WHERE email IS NOT NULL;

-- Note:
-- - Existing RLS policies on public.bidders remain unchanged:
--   * Admin can manage bidders (ALL)
--   * Bidders can view their own profile (SELECT)
-- - This prevents direct client INSERT/UPDATE by normal users.
