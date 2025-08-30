
export interface AuctionLot {
  id: string;
  auction_id: string;
  lot_number: number;
  title: string;
  description?: string;
  starting_price: number;
  reserve_price?: number;
  current_price: number;
  current_bidder_id?: string;
  status: 'PENDING' | 'OPEN' | 'SOLD' | 'SKIPPED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface AuctionBid {
  id: string;
  auction_id: string;
  lot_id: string;
  bidder_id: string;
  amount: number;
  status: 'accepted' | 'rejected' | 'cancelled';
  is_highest: boolean;
  source: 'user' | 'system' | 'staff';
  created_at: string;
}

export interface BidResponse {
  success: boolean;
  error?: string;
  action?: string;
  required_minimum?: number;
  bid_id?: string;
  lot?: AuctionLot;
  top_bids?: Array<{
    bid_id: string;
    bidder_id: string;
    amount: number;
    created_at: string;
  }>;
}
