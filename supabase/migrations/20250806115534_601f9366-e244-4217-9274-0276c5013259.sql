-- Create auction entrance fees table for third-party streaming access control
CREATE TABLE public.auction_entrance_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES public.auction_events(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.bidders(id) ON DELETE CASCADE,
  fee_amount DECIMAL(10,2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  access_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  access_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create auction streams table for third-party platform integration
CREATE TABLE public.auction_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES public.auction_events(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'obs', 'twitch', 'zoom', 'custom')),
  stream_url TEXT NOT NULL,
  embed_code TEXT,
  entrance_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT false,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user preferences table for profile customization
CREATE TABLE public.user_preferences (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  notifications JSONB NOT NULL DEFAULT '{"email": true, "push": true, "sms": false}',
  privacy_settings JSONB NOT NULL DEFAULT '{"show_activity": true, "show_bids": false, "show_profile": true}',
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add additional fields to auction_events for enhanced tracking
ALTER TABLE public.auction_events 
ADD COLUMN IF NOT EXISTS theme_title TEXT,
ADD COLUMN IF NOT EXISTS viewer_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_bids INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS entrance_fee DECIMAL(10,2) DEFAULT 0.00;

-- Enable Row Level Security
ALTER TABLE public.auction_entrance_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for auction_entrance_fees
CREATE POLICY "Users can view their own entrance fees"
ON public.auction_entrance_fees
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.bidders 
  WHERE bidders.id = auction_entrance_fees.bidder_id 
  AND bidders.id = auth.uid()
));

CREATE POLICY "Admin can manage all entrance fees"
ON public.auction_entrance_fees
FOR ALL
USING (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'super-admin'::user_role]));

-- Create policies for auction_streams
CREATE POLICY "Everyone can view active auction streams"
ON public.auction_streams
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admin and auction managers can manage streams"
ON public.auction_streams
FOR ALL
USING (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'super-admin'::user_role, 'auction-manager'::user_role]));

-- Create policies for user_preferences
CREATE POLICY "Users can manage their own preferences"
ON public.user_preferences
FOR ALL
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_auction_entrance_fees_updated_at
  BEFORE UPDATE ON public.auction_entrance_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_auction_streams_updated_at
  BEFORE UPDATE ON public.auction_streams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();