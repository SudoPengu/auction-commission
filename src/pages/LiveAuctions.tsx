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
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import BidderWelcomeBanner from '../components/bidder/BidderWelcomeBanner';
import { BidderFriendlyStats } from '../components/profile/BidderFriendlyStats';

// Placeholder auctions with UUID strings as fallback
const placeholderAuctions: AuctionEvent[] = [
  {
    id: 'c7a8f3d2-9e4b-4a6c-8d5e-1f2a3b4c5d6e',
    title: 'Premium Jewelry Collection',
    theme_title: 'Sparkles & Shine',
    date: 'December 28, 2024',
    time: '2:00 PM - 4:00 PM',
    status: 'LIVE',
    itemCount: 156,
    viewer_count: 1247,
    total_bids: 89,
    revenue: '125000',
    entrance_fee: 3000,
    platform: 'youtube',
    stream_url: 'https://youtube.com/live/abc123'
  },
  {
    id: 'e1b9c2d3-4f5a-6789-abc1-def234567890',
    title: 'Vintage Car Auction',
    theme_title: 'Classic Rides',
    date: 'December 29, 2024',
    time: '10:00 AM - 2:00 PM',
    status: 'STARTING_SOON',
    itemCount: 45,
    viewer_count: 892,
    total_bids: 12,
    revenue: '0',
    entrance_fee: 5000,
    platform: 'youtube'
  },
  {
    id: 'f2c3d4e5-6789-1abc-2def-345678901234',
    title: 'Art & Antiques Fair',
    theme_title: 'Timeless Treasures',
    date: 'January 2, 2025',
    time: '3:00 PM - 6:00 PM',
    status: 'UPCOMING',
    itemCount: 203,
    entrance_fee: 2500,
    platform: 'youtube'
  },
  {
    id: 'a3b4c5d6-7890-1234-5678-90abcdef1234',
    title: 'Designer Fashion Show',
    theme_title: 'Haute Couture',
    date: 'December 25, 2024',
    time: '7:00 PM - 9:00 PM',
    status: 'COMPLETED',
    itemCount: 89,
    viewer_count: 2156,
    total_bids: 234,
    revenue: '78500',
    entrance_fee: 4000,
    platform: 'youtube',
    duration: '2h 15m'
  }
];

const LiveAuctions: React.FC = () => {
  const { profile } = useAuth();
  const isStaffOrAdmin = profile?.role && ['staff', 'admin', 'super-admin', 'auction-manager'].includes(profile.role);
  const isBidder = profile?.role === 'bidder';
  
  const [auctionEvents, setAuctionEvents] = useState<AuctionEvent[]>(placeholderAuctions);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState<AuctionEvent | null>(null);

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
          itemCount: Math.floor(Math.random() * 200) + 50, // Mock data for now
          viewer_count: auction.viewer_count || 0,
          total_bids: auction.total_bids || 0,
          revenue: auction.revenue?.toString() || '0',
          entrance_fee: auction.entrance_fee ? Number(auction.entrance_fee) : 3000,
          platform: 'youtube', // Mock data
          duration: auction.status === 'completed' ? 
            `${Math.floor(Math.random() * 4) + 1}h ${Math.floor(Math.random() * 60)}m` : 
            undefined
        }));

        // Use real auctions if data exists, otherwise keep placeholders
        if (mappedAuctions.length > 0) {
          setAuctionEvents(mappedAuctions);
        } else {
          // Keep placeholder auctions if no real data
          console.log('No auctions found in database, using placeholders');
        }
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

  const handleStartAuction = (id: string) => {
    toast({
      title: "Auction Started",
      description: `Auction is now live!`,
    });
  };

  const handlePauseAuction = (id: string) => {
    toast({
      title: "Auction Paused",
      description: `Auction has been paused.`,
    });
  };

  const handleStopAuction = (id: string) => {
    toast({
      title: "Auction Stopped",
      description: `Auction has been stopped and completed.`,
      variant: "destructive"
    });
  };

  const handleJoinAuction = (id: string) => {
    const auction = auctionEvents.find(a => a.id === id);
    if (!auction) return;

    // For live auctions, open the live interface
    if (auction.status === 'LIVE') {
      setSelectedAuction(auction);
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
    setSelectedAuction(null);
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

  // Mock bidder stats for demonstration
  const mockBidderStats = {
    auctionWins: 12,
    participationRate: 85,
    favoriteItems: 8,
    memberSince: '2023-01-15',
    loyaltyPoints: 2450,
    winningStreak: 3,
    totalAuctions: 47,
    avgPosition: 2.3
  };

  // If an auction is selected for live viewing, show the interface
  if (selectedAuction) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={handleBackToList}
            className="flex items-center gap-2"
          >
            ← Back to Auctions
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Live Auction Interface</h1>
            <p className="text-muted-foreground">Real-time bidding for {selectedAuction.title}</p>
          </div>
        </div>
        
        <LiveAuctionInterface
          auctionId={selectedAuction.id}
          auctionTitle={selectedAuction.title}
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
              <Button className="flex items-center gap-2">
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
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveAuctions;
