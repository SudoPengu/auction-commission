import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Users, Timer, PhilippinePeso } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import EntrancePayment from './EntrancePayment';

interface AuctionEvent {
  id: string; // Changed to string UUID
  title: string;
  theme_title?: string;
  date: string;
  time: string;
  status: 'LIVE' | 'STARTING_SOON' | 'UPCOMING' | 'COMPLETED';
  itemCount: number;
  viewer_count?: number;
  total_bids?: number;
  revenue?: string;
  duration?: string;
}

interface LiveAuctionHeroProps {
  auction: AuctionEvent;
  onJoin: (auctionId: string) => void;
}

const LiveAuctionHero: React.FC<LiveAuctionHeroProps> = ({ auction, onJoin }) => {
  const { profile, user } = useAuth();
  const isBidder = profile?.role === 'bidder';
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !isBidder) {
        setIsCheckingAccess(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('auction_entrance_fees')
          .select('payment_status, access_expires_at')
          .eq('auction_id', auction.id)
          .eq('bidder_id', user.id)
          .eq('payment_status', 'paid')
          .maybeSingle();

        if (error) {
          console.error('Error checking access:', error);
          setHasAccess(false);
        } else if (data) {
          // Check if access hasn't expired
          const now = new Date();
          const expiresAt = new Date(data.access_expires_at);
          setHasAccess(now < expiresAt);
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [user, isBidder, auction.id]);

  const handlePaymentSuccess = () => {
    setHasAccess(true);
  };

  const handleJoinAuction = () => {
    if (hasAccess || !isBidder) {
      onJoin(auction.id);
    }
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[300px]">
          {/* Video/Image Thumbnail */}
          <div className="relative bg-black/90 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent"></div>
            <div className="relative text-center text-white p-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Eye className="h-10 w-10" />
              </div>
              <p className="text-sm opacity-80">Live Stream</p>
              <p className="text-lg font-medium">Broadcasting Now</p>
            </div>
            
            {/* Live Badge */}
            <div className="absolute top-4 left-4">
              <Badge className="bg-red-600 text-white border-0 px-3 py-1 text-sm font-semibold animate-pulse">
                ● LIVE
              </Badge>
            </div>
            
            {/* Viewer Count */}
            <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                {auction.viewer_count?.toLocaleString() || 0}
              </div>
            </div>
          </div>

          {/* Auction Details */}
          <div className="p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="text-3xl font-bold mb-2">{auction.title}</h2>
                {auction.theme_title && (
                  <p className="text-lg text-muted-foreground">{auction.theme_title}</p>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Timer className="h-4 w-4" />
                  {auction.date} • {auction.time}
                </div>
                <div>{auction.itemCount} items</div>
              </div>

              {/* Show different stats based on user role */}
              {isBidder ? (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Bids</p>
                    <p className="text-2xl font-bold">{auction.total_bids?.toLocaleString() || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Active Bidders</p>
                    <p className="text-2xl font-bold">{Math.floor((auction.viewer_count || 0) * 0.3)}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Bids</p>
                    <p className="text-2xl font-bold">{auction.total_bids?.toLocaleString() || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Current Revenue</p>
                    <p className="text-2xl font-bold">₱{auction.revenue ? parseFloat(auction.revenue.replace(/[^0-9.-]/g, '')).toLocaleString() : 0}</p>
                  </div>
                </div>
              )}

              {/* Payment Section for Bidders */}
              {isBidder && !isCheckingAccess && (
                <EntrancePayment
                  auctionId={auction.id}
                  auctionTitle={auction.title}
                  onPaymentSuccess={handlePaymentSuccess}
                  hasAccess={hasAccess}
                />
              )}
            </div>

            <div className="mt-6">
              {isBidder ? (
                <Button 
                  size="lg" 
                  className="w-full text-lg py-6"
                  onClick={handleJoinAuction}
                  disabled={!hasAccess || isCheckingAccess}
                >
                  {isCheckingAccess 
                    ? 'Checking Access...' 
                    : hasAccess 
                      ? 'Start Auction' 
                      : 'Pay Entrance Fee First'
                  }
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  className="w-full text-lg py-6"
                  onClick={handleJoinAuction}
                >
                  Start Auction
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveAuctionHero;
