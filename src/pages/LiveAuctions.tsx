import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Eye, DollarSign, TrendingUp, Clock, Gavel, Trophy, Target, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LiveAuctionCard, AuctionEvent } from '@/components/auction/LiveAuctionCard';
import LiveAuctionHero from '@/components/auction/LiveAuctionHero';
import LiveAuctionInterface from '@/components/auction/LiveAuctionInterface';
import { AuctionCalendar } from '@/components/auction/AuctionCalendar';
import { NewAuctionModal } from '@/components/auction/NewAuctionModal';
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import BidderWelcomeBanner from '../components/bidder/BidderWelcomeBanner';
import { BidderFriendlyStats } from '../components/profile/BidderFriendlyStats';
import { useSearchParams } from 'react-router-dom';

// Placeholder auctions - cleared of sample data
const placeholderAuctions: AuctionEvent[] = [];

const LiveAuctions: React.FC = () => {
  const { profile } = useAuth();
  const isStaffOrAdmin = profile?.role && ['staff', 'admin', 'super-admin', 'auction-manager'].includes(profile.role);
  const isBidder = profile?.role === 'bidder';
  
  const [auctionEvents, setAuctionEvents] = useState<AuctionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(
    () => sessionStorage.getItem('activeAuctionId') || null
  );
  const [selectedAuctionTitle, setSelectedAuctionTitle] = useState<string>(
    () => sessionStorage.getItem('activeAuctionTitle') || 'Live Auction'
  );
  const [isNewAuctionModalOpen, setIsNewAuctionModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedAuction = selectedAuctionId
    ? auctionEvents.find((auction) => auction.id === selectedAuctionId) || null
    : null;

  useEffect(() => {
    const auctionIdFromQuery = searchParams.get('auction');
    if (auctionIdFromQuery && auctionIdFromQuery !== selectedAuctionId) {
      setSelectedAuctionId(auctionIdFromQuery);
      sessionStorage.setItem('activeAuctionId', auctionIdFromQuery);
    }
  }, [searchParams, selectedAuctionId]);

  useEffect(() => {
    if (selectedAuction?.title && selectedAuction.title !== selectedAuctionTitle) {
      setSelectedAuctionTitle(selectedAuction.title);
      sessionStorage.setItem('activeAuctionTitle', selectedAuction.title);
    }
  }, [selectedAuction?.title, selectedAuctionTitle]);

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const { data, error } = await supabase
          .from('auction_events')
          .select('*')
          .order('start_date', { ascending: true });

        if (error) {
          console.error('Error fetching auctions:', error);
          toast({
            title: "Error",
            description: "Failed to load auctions. Please try again.",
            variant: "destructive"
          });
          return;
        }

        // Map Supabase data to UI format
        const mappedAuctions: AuctionEvent[] = (data || []).map(auction => ({
          id: auction.id, // Keep as UUID string
          title: auction.title || 'Untitled Auction',
          theme_title: auction.theme_title || undefined,
          date: new Date(auction.start_date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          time: `${new Date(auction.start_date).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })} - ${new Date(auction.end_date).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })}`,
          status: auction.status === 'live' ? 'LIVE' : 
                 auction.status === 'upcoming' ? 'UPCOMING' : 'COMPLETED',
          itemCount: 0, // TODO: Get actual item count from backend
          viewer_count: auction.viewer_count || 0,
          total_bids: auction.total_bids || 0,
          revenue: auction.revenue?.toString() || '0',
          entrance_fee: auction.entrance_fee ? Number(auction.entrance_fee) : 0,
          platform: 'youtube', // TODO: Get actual platform from backend
          duration: undefined // TODO: Calculate actual duration
        }));

        // Use real auctions data
        setAuctionEvents(mappedAuctions);
      } catch (error) {
        console.error('Error fetching auctions:', error);
        // Keep placeholders on error
        toast({
          title: "Error",
          description: "Failed to load auctions. Using sample data.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuctions();
  }, []);

  const liveAuctions = auctionEvents.filter(a => a.status === 'LIVE');
  const startingSoonAuctions = auctionEvents.filter(a => a.status === 'STARTING_SOON');
  const upcomingAuctions = auctionEvents.filter(a => a.status === 'UPCOMING');
  const recentlyEndedAuctions = auctionEvents.filter(a => a.status === 'COMPLETED').slice(0, 3);

  const handleStartAuction = async (id: string) => {
    try {
      // Update auction status to live
      const { error: auctionError } = await supabase
        .from('auction_events')
        .update({ status: 'live' })
        .eq('id', id);

      if (auctionError) throw auctionError;

      // Activate the stream
      const { error: streamError } = await supabase
        .from('auction_streams')
        .update({ is_active: true })
        .eq('auction_id', id);

      if (streamError) {
        console.warn('Stream activation error:', streamError);
        // Continue even if stream activation fails
      }

      // Find the auction and redirect to live interface
      const auction = auctionEvents.find(a => a.id === id);
      if (auction) {
        setSelectedAuctionId(id);
        setSelectedAuctionTitle(auction.title);
        sessionStorage.setItem('activeAuctionId', id);
        sessionStorage.setItem('activeAuctionTitle', auction.title);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('auction', id);
          return next;
        }, { replace: true });
        toast({
          title: "Auction Started",
          description: `Auction is now live! You can start streaming.`,
        });
      }
    } catch (error: any) {
      console.error('Error starting auction:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start auction. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePauseAuction = (id: string) => {
    toast({
      title: "Auction Paused",
      description: `Auction has been paused.`,
    });
  };

  const handleStopAuction = async (id: string) => {
    try {
      const nowIso = new Date().toISOString();

      // Finalize remaining lots so won items appear in bidder settlements.
      const { data: lotsToFinalize, error: lotsFetchError } = await supabase
        .from('auction_lots')
        .select('id, current_bidder_id')
        .eq('auction_id', id)
        .in('status', ['OPEN', 'PENDING']);

      if (lotsFetchError) {
        console.warn('Failed to fetch lots for finalization:', lotsFetchError);
      } else if (lotsToFinalize && lotsToFinalize.length > 0) {
        const soldLotIds = lotsToFinalize.filter((lot) => !!lot.current_bidder_id).map((lot) => lot.id);
        const skippedLotIds = lotsToFinalize.filter((lot) => !lot.current_bidder_id).map((lot) => lot.id);

        if (soldLotIds.length > 0) {
          const { error: soldUpdateError } = await supabase
            .from('auction_lots')
            .update({ status: 'SOLD', updated_at: nowIso })
            .in('id', soldLotIds);

          if (soldUpdateError) {
            console.warn('Failed to mark sold lots:', soldUpdateError);
          }
        }

        if (skippedLotIds.length > 0) {
          const { error: skippedUpdateError } = await supabase
            .from('auction_lots')
            .update({ status: 'SKIPPED', updated_at: nowIso })
            .in('id', skippedLotIds);

          if (skippedUpdateError) {
            console.warn('Failed to mark skipped lots:', skippedUpdateError);
          }
        }
      }

      // Update auction status to completed
      const { error: auctionError } = await supabase
        .from('auction_events')
        .update({ 
          status: 'completed',
          updated_at: nowIso
        })
        .eq('id', id);

      if (auctionError) throw auctionError;

      // Update stream status
      const { error: streamError } = await supabase
        .from('auction_streams')
        .update({ 
          is_active: false,
          updated_at: nowIso
        })
        .eq('auction_id', id);

      if (streamError) {
        console.warn('Stream update error:', streamError);
      }

      // Refresh auctions list
      const fetchAuctions = async () => {
        try {
          const { data, error } = await supabase
            .from('auction_events')
            .select('*')
            .order('start_date', { ascending: true });

          if (error) {
            console.error('Error fetching auctions:', error);
            return;
          }

          const mappedAuctions: AuctionEvent[] = (data || []).map(auction => ({
            id: auction.id,
            title: auction.title || 'Untitled Auction',
            theme_title: auction.theme_title || undefined,
            date: new Date(auction.start_date).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            time: `${new Date(auction.start_date).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })} - ${new Date(auction.end_date).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })}`,
            status: auction.status === 'live' ? 'LIVE' : 
                   auction.status === 'upcoming' ? 'UPCOMING' : 'COMPLETED',
            itemCount: 0,
            viewer_count: auction.viewer_count || 0,
            total_bids: auction.total_bids || 0,
            revenue: auction.revenue?.toString() || '0',
            entrance_fee: auction.entrance_fee ? Number(auction.entrance_fee) : 0,
            platform: 'youtube',
            duration: undefined
          }));

          setAuctionEvents(mappedAuctions);
        } catch (error) {
          console.error('Error fetching auctions:', error);
        }
      };
      fetchAuctions();

      toast({
        title: "Auction Stopped",
        description: `Auction has been stopped and completed.`,
      });
    } catch (error: any) {
      console.error('Error stopping auction:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to stop auction. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAuction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this auction? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete associated stream first
      const { error: streamError } = await supabase
        .from('auction_streams')
        .delete()
        .eq('auction_id', id);

      if (streamError) {
        console.warn('Stream deletion error:', streamError);
        // Continue with auction deletion even if stream deletion fails
      }

      // Delete auction lots
      const { error: lotsError } = await supabase
        .from('auction_lots')
        .delete()
        .eq('auction_id', id);

      if (lotsError) {
        console.warn('Lots deletion error:', lotsError);
      }

      // Delete auction event
      const { error: auctionError } = await supabase
        .from('auction_events')
        .delete()
        .eq('id', id);

      if (auctionError) throw auctionError;

      // Refresh auctions list
      const fetchAuctions = async () => {
        try {
          const { data, error } = await supabase
            .from('auction_events')
            .select('*')
            .order('start_date', { ascending: true });

          if (error) {
            console.error('Error fetching auctions:', error);
            return;
          }

          const mappedAuctions: AuctionEvent[] = (data || []).map(auction => ({
            id: auction.id,
            title: auction.title || 'Untitled Auction',
            theme_title: auction.theme_title || undefined,
            date: new Date(auction.start_date).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            time: `${new Date(auction.start_date).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })} - ${new Date(auction.end_date).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })}`,
            status: auction.status === 'live' ? 'LIVE' : 
                   auction.status === 'upcoming' ? 'UPCOMING' : 'COMPLETED',
            itemCount: 0,
            viewer_count: auction.viewer_count || 0,
            total_bids: auction.total_bids || 0,
            revenue: auction.revenue?.toString() || '0',
            entrance_fee: auction.entrance_fee ? Number(auction.entrance_fee) : 0,
            platform: 'youtube',
            duration: undefined
          }));

          setAuctionEvents(mappedAuctions);
        } catch (error) {
          console.error('Error fetching auctions:', error);
        }
      };
      fetchAuctions();

      toast({
        title: "Auction Deleted",
        description: "The auction and its associated data have been deleted.",
      });
    } catch (error: any) {
      console.error('Error deleting auction:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete auction. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleJoinAuction = (id: string) => {
    const auction = auctionEvents.find(a => a.id === id);
    if (!auction) return;

    // For live auctions, open the live interface
    if (auction.status === 'LIVE') {
      setSelectedAuctionId(id);
      setSelectedAuctionTitle(auction.title);
      sessionStorage.setItem('activeAuctionId', id);
      sessionStorage.setItem('activeAuctionTitle', auction.title);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('auction', id);
        return next;
      }, { replace: true });
      return;
    }

    // For non-live auctions, show appropriate message
    if (profile?.role === 'bidder') {
      toast({
        title: "Auction Not Live",
        description: "This auction has not started yet.",
      });
    } else {
      toast({
        title: "Auction Preview",
        description: "You can manage this auction when it goes live.",
      });
    }
  };

  const handleBackToList = () => {
    setSelectedAuctionId(null);
    setSelectedAuctionTitle('Live Auction');
    sessionStorage.removeItem('activeAuctionId');
    sessionStorage.removeItem('activeAuctionTitle');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('auction');
      return next;
    }, { replace: true });
  };

  const getTotalStats = () => {
    const totalViewers = auctionEvents
      .filter(a => a.status === 'LIVE')
      .reduce((sum, a) => sum + (a.viewer_count || 0), 0);
    
    const totalRevenue = auctionEvents
      .filter(a => a.status === 'COMPLETED')
      .reduce((sum, a) => {
        const revenue = a.revenue?.replace(/[$,]/g, '') || '0';
        return sum + parseFloat(revenue);
      }, 0);

    const totalActiveBids = auctionEvents
      .filter(a => a.status === 'LIVE')
      .reduce((sum, a) => sum + (a.total_bids || 0), 0);

    return { totalViewers, totalRevenue, totalActiveBids };
  };

  const stats = getTotalStats();

  // Bidder stats - ready for backend data
  const mockBidderStats = {
    auctionWins: 0,
    participationRate: 0,
    favoriteItems: 0,
    memberSince: '',
    loyaltyPoints: 0,
    winningStreak: 0,
    totalAuctions: 0,
    avgPosition: 0
  };

  // If an auction is selected for live viewing, show the interface
  if (selectedAuctionId) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleBackToList}
            className="flex items-center gap-1 w-fit text-xs sm:text-sm"
          >
            ← Back
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Live Auction Interface</h1>
            <p className="text-sm text-muted-foreground">Real-time bidding for {selectedAuction?.title || selectedAuctionTitle}</p>
          </div>
        </div>
        
        <LiveAuctionInterface
          auctionId={selectedAuctionId}
          auctionTitle={selectedAuction?.title || selectedAuctionTitle}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading auctions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Conditional header based on user role */}
      {isBidder ? (
        <BidderWelcomeBanner />
      ) : (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Live Auctions</h1>
            <p className="text-muted-foreground">
              Real-time auction management and participation
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Logged in as: <span className="font-semibold">{profile?.full_name} ({profile?.role})</span>
            </p>
            {isStaffOrAdmin && (
              <Button 
                className="flex items-center gap-2"
                onClick={() => setIsNewAuctionModalOpen(true)}
              >
                <Plus size={16} />
                New Auction
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Stats Dashboard - Different for bidders */}
      {isBidder ? (
        <div className="mb-8">
          <BidderFriendlyStats stats={mockBidderStats} />
        </div>
      ) : (
        /* Live Statistics Dashboard for staff/admin */
        (liveAuctions.length > 0 || isStaffOrAdmin) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Live Viewers</CardTitle>
                <Eye size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalViewers}</div>
                <p className="text-xs text-muted-foreground">
                  Across {liveAuctions.length} live auction{liveAuctions.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Bids</CardTitle>
                <Gavel size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalActiveBids}</div>
                <p className="text-xs text-muted-foreground">
                  Real-time bidding activity
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                <TrendingUp size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₱{stats.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  From completed auctions
                </p>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {/* Live Now Section - Hero Style */}
      {liveAuctions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
            <h2 className="text-3xl font-bold text-destructive">🔴 LIVE NOW</h2>
            <Badge variant="destructive" className="animate-pulse">{liveAuctions.length}</Badge>
          </div>
          
          {/* First live auction gets hero treatment */}
          <LiveAuctionHero
            auction={liveAuctions[0]}
            onJoin={handleJoinAuction}
          />
          
          {/* Additional live auctions in grid if more than one */}
          {liveAuctions.length > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveAuctions.slice(1).map((auction) => (
                <LiveAuctionCard
                  key={auction.id}
                  auction={auction}
                  onStart={handleStartAuction}
                  onPause={handlePauseAuction}
                  onStop={handleStopAuction}
                  onJoin={handleJoinAuction}
                  onDelete={handleDeleteAuction}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Starting Soon Section */}
      {startingSoonAuctions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full" />
            <h2 className="text-xl font-semibold text-orange-600">Starting Soon</h2>
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
              {startingSoonAuctions.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {startingSoonAuctions.map((auction) => (
              <LiveAuctionCard
                key={auction.id}
                auction={auction}
                onStart={handleStartAuction}
                onJoin={handleJoinAuction}
                onDelete={handleDeleteAuction}
              />
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout for Calendar and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1">
          <AuctionCalendar 
            auctions={auctionEvents}
            onDateSelect={(date) => {
              toast({
                title: "Date Selected",
                description: `Viewing auctions for ${date.toLocaleDateString()}`,
              });
            }}
          />
        </div>

        {/* Upcoming and Recent Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Auctions */}
          {upcomingAuctions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full" />
                <h2 className="text-xl font-semibold">Upcoming Auctions</h2>
                <Badge variant="outline">{upcomingAuctions.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingAuctions.map((auction) => (
                  <LiveAuctionCard
                    key={auction.id}
                    auction={auction}
                    onStart={handleStartAuction}
                    onDelete={handleDeleteAuction}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recently Ended */}
          {recentlyEndedAuctions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-muted-foreground rounded-full" />
                <h2 className="text-xl font-semibold">Recently Ended</h2>
                <Badge variant="secondary">{recentlyEndedAuctions.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentlyEndedAuctions.map((auction) => (
                  <LiveAuctionCard
                    key={auction.id}
                    auction={auction}
                    onDelete={handleDeleteAuction}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Auction Modal */}
      <NewAuctionModal
        open={isNewAuctionModalOpen}
        onOpenChange={setIsNewAuctionModalOpen}
        onSuccess={() => {
          // Refresh auctions list
          const fetchAuctions = async () => {
            try {
              const { data, error } = await supabase
                .from('auction_events')
                .select('*')
                .order('start_date', { ascending: true });

              if (error) {
                console.error('Error fetching auctions:', error);
                return;
              }

              const mappedAuctions: AuctionEvent[] = (data || []).map(auction => ({
                id: auction.id,
                title: auction.title || 'Untitled Auction',
                theme_title: auction.theme_title || undefined,
                date: new Date(auction.start_date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }),
                time: `${new Date(auction.start_date).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })} - ${new Date(auction.end_date).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}`,
                status: auction.status === 'live' ? 'LIVE' : 
                       auction.status === 'upcoming' ? 'UPCOMING' : 'COMPLETED',
                itemCount: 0,
                viewer_count: auction.viewer_count || 0,
                total_bids: auction.total_bids || 0,
                revenue: auction.revenue?.toString() || '0',
                entrance_fee: auction.entrance_fee ? Number(auction.entrance_fee) : 0,
                platform: 'youtube',
                duration: undefined
              }));

              setAuctionEvents(mappedAuctions);
            } catch (error) {
              console.error('Error fetching auctions:', error);
            }
          };
          fetchAuctions();
        }}
      />
    </div>
  );
};

export default LiveAuctions;
