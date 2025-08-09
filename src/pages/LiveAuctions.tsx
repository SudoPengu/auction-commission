import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Eye, DollarSign, TrendingUp, Clock, Gavel } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LiveAuctionCard, AuctionEvent } from '@/components/auction/LiveAuctionCard';
import LiveAuctionHero from '@/components/auction/LiveAuctionHero';
import { AuctionCalendar } from '@/components/auction/AuctionCalendar';
import { toast } from "@/hooks/use-toast";
import POS from './POS';

const LiveAuctions: React.FC = () => {
  const { profile } = useAuth();
  const isStaffOrAdmin = profile?.role && ['staff', 'admin', 'super-admin', 'auction-manager'].includes(profile.role);
  
  // Enhanced mock auction events with the new features
  const [auctionEvents] = useState<AuctionEvent[]>([
    {
      id: 1,
      title: 'Rare Vintage Guitars Auction',
      theme_title: 'Musical Treasures Collection',
      date: 'June 15, 2025',
      time: '3:00 PM - 6:00 PM',
      location: 'Main Gallery',
      status: 'LIVE',
      itemCount: 47,
      viewer_count: 234,
      total_bids: 128,
      entrance_fee: 3000,
      platform: 'youtube',
      stream_url: 'https://youtube.com/watch?v=example'
    },
    {
      id: 2,
      title: 'Designer Handbags Bonanza',
      theme_title: 'Luxury Fashion Week',
      date: 'June 15, 2025',
      time: '7:00 PM - 9:00 PM',
      location: 'East Wing',
      status: 'STARTING_SOON',
      itemCount: 89,
      viewer_count: 67,
      entrance_fee: 3000,
      platform: 'obs'
    },
    {
      id: 3,
      title: 'Antique Furniture Showcase',
      theme_title: 'Heritage Collection',
      date: 'June 16, 2025',
      time: '2:00 PM - 5:00 PM',
      location: 'West Hall',
      status: 'UPCOMING',
      itemCount: 156,
      entrance_fee: 3000
    },
    {
      id: 4,
      title: 'Art & Collectibles Gala',
      theme_title: 'Masterpieces Unveiled',
      date: 'June 14, 2025',
      time: '1:00 PM - 4:00 PM',
      location: 'Grand Hall',
      status: 'COMPLETED',
      itemCount: 203,
      viewer_count: 567,
      total_bids: 892,
      revenue: '127450',
      duration: '3h 15m'
    },
    {
      id: 5,
      title: 'Electronics Clearance',
      theme_title: 'Tech Refresh Sale',
      date: 'June 13, 2025',
      time: '10:00 AM - 2:00 PM',
      location: 'Tech Center',
      status: 'COMPLETED',
      itemCount: 324,
      viewer_count: 189,
      total_bids: 456,
      revenue: '89230',
      duration: '4h 0m'
    }
  ]);

  const liveAuctions = auctionEvents.filter(a => a.status === 'LIVE');
  const startingSoonAuctions = auctionEvents.filter(a => a.status === 'STARTING_SOON');
  const upcomingAuctions = auctionEvents.filter(a => a.status === 'UPCOMING');
  const recentlyEndedAuctions = auctionEvents.filter(a => a.status === 'COMPLETED').slice(0, 3);

  const handleStartAuction = (id: number) => {
    toast({
      title: "Auction Started",
      description: `Auction ${id} is now live!`,
    });
  };

  const handlePauseAuction = (id: number) => {
    toast({
      title: "Auction Paused",
      description: `Auction ${id} has been paused.`,
    });
  };

  const handleStopAuction = (id: number) => {
    toast({
      title: "Auction Stopped",
      description: `Auction ${id} has been stopped and completed.`,
      variant: "destructive"
    });
  };

  const handleJoinAuction = (id: number) => {
    const auction = auctionEvents.find(a => a.id === id);
    if (profile?.role === 'bidder') {
      toast({
        title: "Payment Required",
        description: "Please pay ₱3,000 entrance fee to join this auction.",
      });
    } else {
      toast({
        title: "Joining Auction",
        description: "Welcome to the auction!",
      });
    }
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

  return (
    <div className="space-y-6 pb-6">
      {/* Header Section */}
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

      {/* POS Floating Panel - Only for staff/admin */}
      {profile?.role !== 'bidder' && <POS />}

      {/* Live Statistics Dashboard */}
      {(liveAuctions.length > 0 || isStaffOrAdmin) && (
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