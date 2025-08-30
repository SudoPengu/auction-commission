
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuctionLot, AuctionBid } from '@/types/auction';

export const useAuctionRealtime = (auctionId?: string) => {
  const [lots, setLots] = useState<AuctionLot[]>([]);
  const [bids, setBids] = useState<AuctionBid[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!auctionId) return;

    console.log('Setting up realtime subscription for auction:', auctionId);
    setIsConnected(true);

    // Subscribe to lot changes
    const lotsChannel = supabase
      .channel('auction-lots-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auction_lots',
          filter: `auction_id=eq.${auctionId}`
        },
        (payload) => {
          console.log('Lot change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            setLots(prev => [...prev, payload.new as AuctionLot]);
          } else if (payload.eventType === 'UPDATE') {
            setLots(prev => prev.map(lot => 
              lot.id === payload.new.id ? payload.new as AuctionLot : lot
            ));
          } else if (payload.eventType === 'DELETE') {
            setLots(prev => prev.filter(lot => lot.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to bid changes
    const bidsChannel = supabase
      .channel('auction-bids-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auction_bids',
          filter: `auction_id=eq.${auctionId}`
        },
        (payload) => {
          console.log('Bid change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            setBids(prev => [...prev, payload.new as AuctionBid]);
          } else if (payload.eventType === 'UPDATE') {
            setBids(prev => prev.map(bid => 
              bid.id === payload.new.id ? payload.new as AuctionBid : bid
            ));
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscriptions');
      supabase.removeChannel(lotsChannel);
      supabase.removeChannel(bidsChannel);
      setIsConnected(false);
    };
  }, [auctionId]);

  // Fetch initial data
  useEffect(() => {
    if (!auctionId) return;

    const fetchInitialData = async () => {
      try {
        const [lotsResponse, bidsResponse] = await Promise.all([
          supabase
            .from('auction_lots')
            .select('*')
            .eq('auction_id', auctionId)
            .order('lot_number'),
          supabase
            .from('auction_bids')
            .select('*')
            .eq('auction_id', auctionId)
            .order('created_at', { ascending: false })
        ]);

        if (lotsResponse.data) {
          setLots(lotsResponse.data as AuctionLot[]);
        }
        if (bidsResponse.data) {
          setBids(bidsResponse.data as AuctionBid[]);
        }
      } catch (error) {
        console.error('Error fetching initial auction data:', error);
      }
    };

    fetchInitialData();
  }, [auctionId]);

  return { lots, bids, isConnected };
};

