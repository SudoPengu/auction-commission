import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Gavel, Clock, Users, AlertCircle, Mic, Video, Settings, Play, Pause, SkipForward } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuctionRealtime } from '@/hooks/useAuctionRealtime';
import { supabase } from '@/integrations/supabase/client';
import BidPanel from './BidPanel';
import { AuctionLot, BidResponse } from '@/types/auction';

interface LiveAuctionInterfaceProps {
  auctionId: string;
  auctionTitle: string;
}

const LiveAuctionInterface: React.FC<LiveAuctionInterfaceProps> = ({
  auctionId,
  auctionTitle
}) => {
  const { user, profile } = useAuth();
  const { lots, bids, isConnected } = useAuctionRealtime(auctionId);
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [currentLot, setCurrentLot] = useState<AuctionLot | null>(null);

  const isBidder = profile?.role === 'bidder';
  const isStaffOrAdmin = profile?.role && ['staff', 'admin', 'super-admin', 'auction-manager'].includes(profile.role);

  // Check access for bidders
  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !isBidder) {
        setHasAccess(true); // Staff/admin always have access
        setIsCheckingAccess(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('auction_entrance_fees')
          .select('payment_status, access_expires_at')
          .eq('auction_id', auctionId)
          .eq('bidder_id', user.id)
          .eq('payment_status', 'paid')
          .maybeSingle();

        if (error) {
          console.error('Error checking access:', error);
          setHasAccess(false);
        } else if (data) {
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
  }, [user, isBidder, auctionId]);

  // Set current lot (first OPEN lot, or first lot if none are open)
  useEffect(() => {
    const openLot = lots.find(lot => lot.status === 'OPEN');
    setCurrentLot(openLot || lots[0] || null);
  }, [lots]);

  const handleBidSuccess = (response: BidResponse) => {
    console.log('Bid placed successfully:', response);
    // The realtime subscription will handle updating the UI
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-green-500';
      case 'PENDING': return 'bg-yellow-500';
      case 'SOLD': return 'bg-blue-500';
      case 'SKIPPED': return 'bg-gray-500';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getCurrentBids = (lotId: string) => {
    return bids
      .filter(bid => bid.lot_id === lotId && bid.status === 'accepted')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  if (isCheckingAccess) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{auctionTitle}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <div className="flex items-center gap-1">
              <Gavel className="h-4 w-4" />
              {lots.length} lots
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Live auction
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Lot & Video */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Section */}
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video bg-black rounded-lg flex items-center justify-center text-white relative">
                {isBidder ? (
                  // Bidder View - Viewing Only
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm opacity-75">Live Stream</p>
                    <p className="text-xs opacity-50">Video feed for viewing only</p>
                  </div>
                ) : (
                  // Company Account View - Host/Auctioneer Controls
                  <>
                    <div className="text-center">
                      <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm opacity-75">Auctioneer View</p>
                      <p className="text-xs opacity-50">Host controls active</p>
                    </div>
                    
                    {/* Host Controls Overlay */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium">LIVE</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4" />
                            <span>24 viewers</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                          <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                          <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                            <SkipForward className="h-4 w-4 mr-1" />
                            Next Lot
                          </Button>
                          <div className="flex-1"></div>
                          <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                            <Mic className="h-4 w-4 mr-1" />
                            Audio
                          </Button>
                          <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Lot Details */}
          {currentLot && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Lot #{currentLot.lot_number}: {currentLot.title}
                    <Badge className={getStatusColor(currentLot.status)}>
                      {currentLot.status}
                    </Badge>
                  </CardTitle>
                  <div className="text-right">
                    <div className="text-2xl font-bold">₱{currentLot.current_price.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      Starting: ₱{currentLot.starting_price.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardHeader>
              {currentLot.description && (
                <CardContent>
                  <p className="text-muted-foreground">{currentLot.description}</p>
                </CardContent>
              )}
            </Card>
          )}

          {/* Recent Bids */}
          {currentLot && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Bids</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getCurrentBids(currentLot.id).map((bid, index) => (
                    <div
                      key={bid.id}
                      className={`flex items-center justify-between p-2 rounded ${
                        index === 0 ? 'bg-green-50 border border-green-200' : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {index === 0 && <Badge variant="default">Highest</Badge>}
                        <span className="text-sm">
                          Bidder #{bid.bidder_id.slice(-6)}
                        </span>
                      </div>
                      <span className="font-semibold">₱{bid.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {getCurrentBids(currentLot.id).length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No bids yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bidding Panel */}
        <div className="space-y-4">
          {isBidder && currentLot && (
            <BidPanel
              lotId={currentLot.id}
              currentPrice={currentLot.current_price}
              isOpen={currentLot.status === 'OPEN'}
              hasAccess={hasAccess}
              onBidSuccess={handleBidSuccess}
            />
          )}

          {/* Lot List */}
          <Card>
            <CardHeader>
              <CardTitle>All Lots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {lots.map((lot) => (
                  <div
                    key={lot.id}
                    className={`p-3 rounded border cursor-pointer hover:bg-muted/50 ${
                      currentLot?.id === lot.id ? 'bg-primary/5 border-primary' : ''
                    }`}
                    onClick={() => setCurrentLot(lot)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">#{lot.lot_number}</span>
                      <Badge className={getStatusColor(lot.status)} variant="secondary">
                        {lot.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">{lot.title}</div>
                    <div className="text-sm font-semibold">₱{lot.current_price.toLocaleString()}</div>
                  </div>
                ))}
                {lots.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No lots available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiveAuctionInterface;
