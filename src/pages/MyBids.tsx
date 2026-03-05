import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Clock, DollarSign, Gavel, Loader2, Search, ShoppingBag, Trophy, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getBidderMockSettlements } from '@/utils/mockAuctionSettlement';

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

interface WonLotCheckout {
  lotId: string;
  auctionId: string;
  auctionTitle: string;
  lotTitle: string;
  lotNumber: number;
  amount: number;
  paymentStatus: 'pending' | 'paid';
}

interface SoldLotRow {
  id: string;
  auction_id: string;
  lot_number: number;
  title: string;
  current_price: number;
  current_bidder_id: string | null;
  auction_events: { title: string; status: string; end_date: string } | { title: string; status: string; end_date: string }[] | null;
}

const MyBids: React.FC = () => {
  const { user, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [wonLotsCheckout, setWonLotsCheckout] = useState<WonLotCheckout[]>([]);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(true);

  // TODO: Replace with actual bid data from backend
  const mockBids: BidHistory[] = [];

  const loadWonLotsCheckout = useCallback(async () => {
    if (!user) {
      setWonLotsCheckout([]);
      setIsLoadingCheckout(false);
      return;
    }

    setIsLoadingCheckout(true);
    try {
      const { data, error } = await supabase
        .from('auction_lots')
        .select('id, auction_id, lot_number, title, current_price, current_bidder_id, auction_events!inner(title,status,end_date)')
        .eq('current_bidder_id', user.id)
        .in('status', ['SOLD', 'OPEN'])
        .eq('auction_events.status', 'completed');

      if (error) throw error;

      const soldLotRows = (data || []) as SoldLotRow[];
      const soldLots = soldLotRows.map((lot) => ({
        lotId: lot.id as string,
        auctionId: lot.auction_id as string,
        lotTitle: lot.title as string,
        lotNumber: lot.lot_number as number,
        amount: lot.current_price as number,
      }));

      const settlementRows = await getBidderMockSettlements(user.id);
      const settlementMap = settlementRows.reduce<Record<string, 'pending' | 'paid'>>((acc, row) => {
        acc[row.lotId] = row.status;
        return acc;
      }, {});

      const checkoutRows: WonLotCheckout[] = soldLots.map((lot) => {
        const source = soldLotRows.find((row) => row.id === lot.lotId);
        const auctionTitle = Array.isArray(source?.auction_events)
          ? source?.auction_events[0]?.title
          : source?.auction_events?.title;
        return {
          lotId: lot.lotId,
          auctionId: lot.auctionId,
          auctionTitle: auctionTitle || 'Auction',
          lotTitle: lot.lotTitle,
          lotNumber: lot.lotNumber,
          amount: lot.amount,
          paymentStatus: settlementMap[lot.lotId] || 'pending',
        };
      });

      const sortedRows = [...checkoutRows].sort((a, b) => {
        if (a.paymentStatus === b.paymentStatus) return b.amount - a.amount;
        return a.paymentStatus === 'pending' ? -1 : 1;
      });
      setWonLotsCheckout(sortedRows);
    } catch (error) {
      console.error('Error loading won-lot checkout:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your won lots.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingCheckout(false);
    }
  }, [user]);

  useEffect(() => {
    loadWonLotsCheckout();
  }, [loadWonLotsCheckout]);

  const checkoutTotals = useMemo(() => {
    const pendingItems = wonLotsCheckout.filter((item) => item.paymentStatus === 'pending');
    const paidItems = wonLotsCheckout.filter((item) => item.paymentStatus === 'paid');
    return {
      pendingCount: pendingItems.length,
      paidCount: paidItems.length,
      pendingAmount: pendingItems.reduce((sum, item) => sum + item.amount, 0),
      paidAmount: paidItems.reduce((sum, item) => sum + item.amount, 0),
      totalAmount: wonLotsCheckout.reduce((sum, item) => sum + item.amount, 0),
    };
  }, [wonLotsCheckout]);

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
    <div className="space-y-6 pb-6 overflow-x-hidden">
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

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Won Items Summary
          </CardTitle>
          <CardDescription>
            All items you won from completed live auctions, including pending and paid.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingCheckout ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : wonLotsCheckout.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No won lots from ended auctions yet.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-md bg-muted">
                  <p className="text-xs text-muted-foreground">Pending Lots</p>
                  <p className="text-xl font-semibold">{checkoutTotals.pendingCount}</p>
                </div>
                <div className="p-3 rounded-md bg-muted">
                  <p className="text-xs text-muted-foreground">Paid Lots</p>
                  <p className="text-xl font-semibold">{checkoutTotals.paidCount}</p>
                </div>
                <div className="p-3 rounded-md bg-muted">
                  <p className="text-xs text-muted-foreground">Pending Total</p>
                  <p className="text-xl font-semibold">₱{checkoutTotals.pendingAmount.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-md bg-muted">
                  <p className="text-xs text-muted-foreground">Paid Total</p>
                  <p className="text-xl font-semibold">₱{checkoutTotals.paidAmount.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-md bg-muted">
                  <p className="text-xs text-muted-foreground">Won Total</p>
                  <p className="text-xl font-semibold">₱{checkoutTotals.totalAmount.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                {wonLotsCheckout.map((lot) => (
                  <div key={lot.lotId} className="p-3 rounded-md border flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Lot #{lot.lotNumber} - {lot.lotTitle}</p>
                      <p className="text-xs text-muted-foreground">{lot.auctionTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₱{lot.amount.toLocaleString()}</p>
                      <div className="mt-1 flex items-center gap-2 justify-end">
                        <Badge variant={lot.paymentStatus === 'paid' ? 'default' : 'outline'}>
                          {lot.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
          <TabsTrigger value="active" className="px-2 py-2 text-xs sm:text-sm whitespace-normal">
            Active Bids ({activeBids.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="px-2 py-2 text-xs sm:text-sm whitespace-normal">
            Completed ({completedBids.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="px-2 py-2 text-xs sm:text-sm whitespace-normal">
            All Bids ({filteredBids.length})
          </TabsTrigger>
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
