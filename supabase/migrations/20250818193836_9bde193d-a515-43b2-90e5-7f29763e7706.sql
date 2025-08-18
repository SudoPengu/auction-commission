-- Create a public view for auction events that only exposes safe fields
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

-- Update RLS policy on auction_events to restrict sensitive data access
DROP POLICY IF EXISTS "Everyone can view auction events" ON public.auction_events;

-- Create new restricted policy for auction_events base table
CREATE POLICY "Staff can view all auction event details"
  ON public.auction_events 
  FOR SELECT 
  USING (get_current_user_role() = ANY (ARRAY['staff'::user_role, 'admin'::user_role, 'super-admin'::user_role, 'auction-manager'::user_role]));

-- Allow public access to the safe view
ALTER VIEW public.auction_events_public SET (security_barrier = true);

-- Update log_activity function to be more secure
CREATE OR REPLACE FUNCTION public.log_activity(action text, resource text, details jsonb DEFAULT NULL::jsonb, ip_address text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (user_id, action, resource, details, ip_address)
    VALUES (auth.uid(), action, resource, details, ip_address)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$function$;

-- Update update_updated_at_column function for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;