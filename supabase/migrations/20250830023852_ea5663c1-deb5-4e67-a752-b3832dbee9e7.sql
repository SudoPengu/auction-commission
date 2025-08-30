-- Create auction_lots table
CREATE TABLE public.auction_lots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES public.auction_events(id) ON DELETE CASCADE,
  lot_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  starting_price NUMERIC NOT NULL DEFAULT 0,
  reserve_price NUMERIC,
  current_price NUMERIC NOT NULL DEFAULT 0,
  current_bidder_id UUID REFERENCES public.bidders(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'OPEN', 'SOLD', 'SKIPPED', 'CANCELLED')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create auction_bids table
CREATE TABLE public.auction_bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES public.auction_events(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES public.auction_lots(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.bidders(id),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'rejected', 'cancelled')),
  is_highest BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'system', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.auction_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

-- RLS policies for auction_lots
CREATE POLICY "Everyone can view auction lots" 
ON public.auction_lots 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage auction lots" 
ON public.auction_lots 
FOR ALL 
USING (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'super-admin'::user_role, 'auction-manager'::user_role]));

-- RLS policies for auction_bids
CREATE POLICY "Everyone can view auction bids" 
ON public.auction_bids 
FOR SELECT 
USING (true);

CREATE POLICY "Bidders can create their own bids" 
ON public.auction_bids 
FOR INSERT 
WITH CHECK (auth.uid() = bidder_id);

CREATE POLICY "Admin can manage all bids" 
ON public.auction_bids 
FOR ALL 
USING (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'super-admin'::user_role, 'auction-manager'::user_role]));

-- Create indexes for better performance
CREATE INDEX idx_auction_lots_auction_id ON public.auction_lots(auction_id);
CREATE INDEX idx_auction_lots_status ON public.auction_lots(status);
CREATE INDEX idx_auction_bids_auction_id ON public.auction_bids(auction_id);
CREATE INDEX idx_auction_bids_lot_id ON public.auction_bids(lot_id);
CREATE INDEX idx_auction_bids_bidder_id ON public.auction_bids(bidder_id);
CREATE INDEX idx_auction_bids_is_highest ON public.auction_bids(is_highest);

-- Create place_bid function
CREATE OR REPLACE FUNCTION public.place_bid(
  p_lot_id UUID,
  p_bidder_id UUID,
  p_amount NUMERIC
) RETURNS JSON AS $$
DECLARE
  v_lot RECORD;
  v_auction RECORD;
  v_current_price NUMERIC;
  v_min_increment NUMERIC;
  v_required_minimum NUMERIC;
  v_bid_id UUID;
  v_result JSON;
BEGIN
  -- Get lot information
  SELECT * INTO v_lot FROM public.auction_lots WHERE id = p_lot_id;
  
  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'Lot not found'
    );
  END IF;
  
  -- Check if lot is open for bidding
  IF v_lot.status != 'OPEN' THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'This lot is not open for bidding'
    );
  END IF;
  
  -- Get auction information
  SELECT * INTO v_auction FROM public.auction_events WHERE id = v_lot.auction_id;
  
  IF v_auction.status != 'live' THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'Auction is not currently live'
    );
  END IF;
  
  -- Calculate minimum bid requirement
  v_current_price := COALESCE(v_lot.current_price, v_lot.starting_price, 0);
  v_min_increment := GREATEST(CEIL(v_current_price * 0.05), 20);
  v_required_minimum := v_current_price + v_min_increment;
  
  -- Validate bid amount
  IF p_amount < v_required_minimum THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'Bid amount is too low',
      'required_minimum', v_required_minimum
    );
  END IF;
  
  -- Mark previous highest bids as not highest
  UPDATE public.auction_bids 
  SET is_highest = false 
  WHERE lot_id = p_lot_id AND is_highest = true;
  
  -- Insert new bid
  INSERT INTO public.auction_bids (
    auction_id, lot_id, bidder_id, amount, is_highest, status, source
  ) VALUES (
    v_lot.auction_id, p_lot_id, p_bidder_id, p_amount, true, 'accepted', 'user'
  ) RETURNING id INTO v_bid_id;
  
  -- Update lot with new highest bid
  UPDATE public.auction_lots 
  SET 
    current_price = p_amount,
    current_bidder_id = p_bidder_id,
    updated_at = now()
  WHERE id = p_lot_id;
  
  -- Get updated lot info
  SELECT * INTO v_lot FROM public.auction_lots WHERE id = p_lot_id;
  
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'bid_id', v_bid_id,
    'lot', ROW_TO_JSON(v_lot),
    'action', 'bid_placed'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'An error occurred while placing the bid: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updating auction_lots updated_at
CREATE OR REPLACE FUNCTION public.update_auction_lots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_auction_lots_updated_at
  BEFORE UPDATE ON public.auction_lots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_auction_lots_updated_at();

-- Enable realtime for the new tables
ALTER TABLE public.auction_lots REPLICA IDENTITY FULL;
ALTER TABLE public.auction_bids REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_lots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_bids;