-- Phase 1: Fix infinite recursion in user_profiles RLS policies
-- This is the critical fix that will restore login functionality

-- 1. Create security definer function to break RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

-- 2. Drop existing problematic policies on user_profiles
DROP POLICY IF EXISTS "Admin can manage non-admin user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin can view all user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Super-admin can manage all user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;

-- 3. Create new non-recursive policies using the security definer function
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admin can view all user profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.get_current_user_role() IN ('admin', 'super-admin'));

CREATE POLICY "Super-admin can manage all user profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.get_current_user_role() = 'super-admin');

CREATE POLICY "Admin can manage non-admin user profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  public.get_current_user_role() = 'admin' 
  AND role NOT IN ('admin', 'super-admin')
);

-- 4. Remove auction-manager role from enum (update existing users first)
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE role = 'auction-manager';

-- Recreate the enum without auction-manager
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('super-admin', 'admin', 'staff');

-- Recreate the column with the new enum
ALTER TABLE public.user_profiles 
ALTER COLUMN role TYPE user_role 
USING role::text::user_role;

-- 5. Enable RLS on all missing tables to prevent data leaks
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bidders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tag_relations ENABLE ROW LEVEL SECURITY;

-- 6. Create basic RLS policies for these tables
-- Sales table policies
CREATE POLICY "Staff and admin can manage sales"
ON public.sales
FOR ALL
TO authenticated
USING (public.get_current_user_role() IN ('staff', 'admin', 'super-admin'));

-- Sale items policies
CREATE POLICY "Staff and admin can manage sale items"
ON public.sale_items
FOR ALL
TO authenticated
USING (public.get_current_user_role() IN ('staff', 'admin', 'super-admin'));

-- Payments policies
CREATE POLICY "Staff and admin can manage payments"
ON public.payments
FOR ALL
TO authenticated
USING (public.get_current_user_role() IN ('staff', 'admin', 'super-admin'));

-- Bidders policies
CREATE POLICY "Admin can manage bidders"
ON public.bidders
FOR ALL
TO authenticated
USING (public.get_current_user_role() IN ('admin', 'super-admin'));

CREATE POLICY "Bidders can view their own profile"
ON public.bidders
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Auction events policies
CREATE POLICY "Everyone can view auction events"
ON public.auction_events
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage auction events"
ON public.auction_events
FOR ALL
TO authenticated
USING (public.get_current_user_role() IN ('admin', 'super-admin'));

-- Product tags policies
CREATE POLICY "Everyone can view product tags"
ON public.product_tags
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin and staff can manage product tags"
ON public.product_tags
FOR ALL
TO authenticated
USING (public.get_current_user_role() IN ('staff', 'admin', 'super-admin'));

-- Product tag relations policies
CREATE POLICY "Everyone can view product tag relations"
ON public.product_tag_relations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin and staff can manage product tag relations"
ON public.product_tag_relations
FOR ALL
TO authenticated
USING (public.get_current_user_role() IN ('staff', 'admin', 'super-admin'));

-- 7. Fix existing database functions with proper security
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

CREATE OR REPLACE FUNCTION public.has_any_role(VARIADIC required_roles user_role[])
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