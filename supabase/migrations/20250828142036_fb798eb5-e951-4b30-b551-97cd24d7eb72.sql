-- Add display name and cooldown tracking to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN display_name TEXT,
ADD COLUMN display_name_changed_at TIMESTAMP WITH TIME ZONE;

-- Create function to check if user can change display name (7-day cooldown)
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

-- Create function to update display name with cooldown validation
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