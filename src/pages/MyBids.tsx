import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Clock, DollarSign, Gavel, Search, Trophy, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface BidHistory {
  id: number;
  auctionTitle: string;
  itemName: string;
  bidAmount: number;
  maxBid: number;
  currentHighBid: number;
  status: 'winning' | 'outbid' | 'won' | 'lost';
  bidTime: string;
  auctionEndTime: string;
  itemImage?: string;
}

const MyBids: React.FC = () => {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const mockBids: BidHistory[] = [
    {
      id: 1,
      auctionTitle: 'Rare Vintage Guitars Auction',
      itemName: 'Gibson Les Paul Standard 1959',
      bidAmount: 15000,
      maxBid: 18000,
      currentHighBid: 16500,
      status: 'outbid',
      bidTime: '2 hours ago',
      auctionEndTime: 'Live - ends in 4h 23m',
      itemImage: '/placeholder.svg'
    },
    {
      id: 2,
      auctionTitle: 'Designer Handbags Bonanza',
      itemName: 'Hermès Birkin Bag 35cm',
      bidAmount: 8500,
      maxBid: 12000,
      currentHighBid: 8500,
      status: 'winning',
      bidTime: '45 minutes ago',
      auctionEndTime: 'Starts in 2h 15m',
      itemImage: '/placeholder.svg'
    },
    {
      id: 3,
      auctionTitle: 'Art & Collectibles Gala',
      itemName: 'Original Picasso Sketch',
      bidAmount: 25000,
      maxBid: 25000,
      currentHighBid: 25000,
      status: 'won',
      bidTime: 'Yesterday',
      auctionEndTime: 'Completed - Jun 14, 2025',
      itemImage: '/placeholder.svg'
    },
    {
      id: 4,
      auctionTitle: 'Electronics Clearance',
      itemName: 'MacBook Pro M3 Max',
      bidAmount: 2800,
      maxBid: 3200,
      currentHighBid: 3100,
      status: 'lost',
      bidTime: '3 days ago',
      auctionEndTime: 'Completed - Jun 13, 2025',
      itemImage: '/placeholder.svg'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'winning':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Winning</Badge>;
      case 'outbid':
        return <Badge variant="destructive">Outbid</Badge>;
      case 'won':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Won</Badge>;
      case 'lost':
        return <Badge variant="secondary">Lost</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'winning':
        return <Trophy className="h-4 w-4 text-green-600" />;
      case 'outbid':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'won':
        return <Trophy className="h-4 w-4 text-blue-600" />;
      case 'lost':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Gavel className="h-4 w-4" />;
    }
  };

  const filteredBids = mockBids.filter(bid =>
    bid.auctionTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bid.itemName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeBids = filteredBids.filter(bid => ['winning', 'outbid'].includes(bid.status));
  const completedBids = filteredBids.filter(bid => ['won', 'lost'].includes(bid.status));

  const stats = {
    totalBids: mockBids.length,
    activeBids: activeBids.length,
    wonAuctions: mockBids.filter(bid => bid.status === 'won').length,
    totalSpent: mockBids.filter(bid => bid.status === 'won').reduce((sum, bid) => sum + bid.bidAmount, 0)
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Bids</h1>
          <p className="text-muted-foreground">
            Track your bidding activity and auction history
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Welcome back, <span className="font-semibold">{profile?.full_name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBids}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bids</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBids}</div>
            <p className="text-xs text-muted-foreground">Currently bidding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won Auctions</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.wonAuctions}</div>
            <p className="text-xs text-muted-foreground">Successful wins</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{stats.totalSpent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Winning bids</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search auctions or items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Bids ({activeBids.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedBids.length})</TabsTrigger>
          <TabsTrigger value="all">All Bids ({filteredBids.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeBids.length > 0 ? (
            <div className="grid gap-4">
              {activeBids.map((bid) => (
                <Card key={bid.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(bid.status)}
                          <h3 className="font-semibold">{bid.itemName}</h3>
                          {getStatusBadge(bid.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{bid.auctionTitle}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span>Your Bid: <strong>₱{bid.bidAmount.toLocaleString()}</strong></span>
                          <span>Max Bid: <strong>₱{bid.maxBid.toLocaleString()}</strong></span>
                          <span>Current High: <strong>₱{bid.currentHighBid.toLocaleString()}</strong></span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Bid placed {bid.bidTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {bid.auctionEndTime}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          View Item
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Gavel className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Bids</h3>
                <p className="text-muted-foreground text-center">
                  You don't have any active bids at the moment. Start bidding on live auctions!
                </p>
                <Button className="mt-4">
                  Browse Live Auctions
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedBids.length > 0 ? (
            <div className="grid gap-4">
              {completedBids.map((bid) => (
                <Card key={bid.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(bid.status)}
                          <h3 className="font-semibold">{bid.itemName}</h3>
                          {getStatusBadge(bid.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{bid.auctionTitle}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span>Final Bid: <strong>₱{bid.bidAmount.toLocaleString()}</strong></span>
                          {bid.status === 'won' ? (
                            <span className="text-green-600">Winning Amount: <strong>₱{bid.currentHighBid.toLocaleString()}</strong></span>
                          ) : (
                            <span>Winning Bid: <strong>₱{bid.currentHighBid.toLocaleString()}</strong></span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {bid.auctionEndTime}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Completed Bids</h3>
                <p className="text-muted-foreground text-center">
                  Your completed auction history will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {filteredBids.length > 0 ? (
            <div className="grid gap-4">
              {filteredBids.map((bid) => (
                <Card key={bid.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(bid.status)}
                          <h3 className="font-semibold">{bid.itemName}</h3>
                          {getStatusBadge(bid.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{bid.auctionTitle}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span>Your Bid: <strong>₱{bid.bidAmount.toLocaleString()}</strong></span>
                          <span>Current/Final: <strong>₱{bid.currentHighBid.toLocaleString()}</strong></span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {bid.bidTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {bid.auctionEndTime}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
                <p className="text-muted-foreground text-center">
                  Try adjusting your search terms.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyBids;
