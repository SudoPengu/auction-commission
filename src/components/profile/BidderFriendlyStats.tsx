import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Heart, Calendar, Star, Gift, TrendingUp } from 'lucide-react';

interface BidderStats {
  auctionWins: number;
  participationRate: number;
  favoriteItems: number;
  memberSince: string;
  loyaltyPoints: number;
  winningStreak: number;
  totalAuctions: number;
  avgPosition: number;
}

interface BidderFriendlyStatsProps {
  stats: BidderStats;
  className?: string;
}

export const BidderFriendlyStats: React.FC<BidderFriendlyStatsProps> = ({ stats, className }) => {
  const getWinRate = () => {
    if (stats.totalAuctions === 0) return 0;
    return Math.round((stats.auctionWins / stats.totalAuctions) * 100);
  };

  const getPerformanceBadge = () => {
    const winRate = getWinRate();
    if (winRate >= 30) return { label: 'Champion Bidder', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    if (winRate >= 20) return { label: 'Expert Bidder', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    if (winRate >= 10) return { label: 'Skilled Bidder', color: 'bg-green-100 text-green-800 border-green-200' };
    return { label: 'Rising Star', color: 'bg-purple-100 text-purple-800 border-purple-200' };
  };

  const performanceBadge = getPerformanceBadge();

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {/* Auction Wins */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Auction Wins</CardTitle>
          <Trophy size={16} className="text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.auctionWins}</div>
          <p className="text-xs text-muted-foreground">
            {getWinRate()}% win rate • {stats.totalAuctions} auctions joined
          </p>
          <Badge variant="outline" className={`mt-2 ${performanceBadge.color}`}>
            {performanceBadge.label}
          </Badge>
        </CardContent>
      </Card>

      {/* Favorite Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Items I Love</CardTitle>
          <Heart size={16} className="text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">{stats.favoriteItems}</div>
          <p className="text-xs text-muted-foreground">
            Watched and favorited items
          </p>
        </CardContent>
      </Card>

      {/* Member Since */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Member Since</CardTitle>
          <Calendar size={16} className="text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold text-blue-600">{stats.memberSince}</div>
          <p className="text-xs text-muted-foreground">
            Part of our auction community
          </p>
        </CardContent>
      </Card>

      {/* Loyalty Points */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
          <Gift size={16} className="text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{stats.loyaltyPoints}</div>
          <p className="text-xs text-muted-foreground">
            Redeem for special perks
          </p>
        </CardContent>
      </Card>

      {/* Winning Streak */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          <TrendingUp size={16} className="text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.winningStreak}</div>
          <p className="text-xs text-muted-foreground">
            {stats.winningStreak > 0 ? 'Consecutive wins' : 'Ready for your next win!'}
          </p>
        </CardContent>
      </Card>

      {/* Average Position */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bidding Success</CardTitle>
          <Star size={16} className="text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">#{stats.avgPosition}</div>
          <p className="text-xs text-muted-foreground">
            Average finishing position
          </p>
        </CardContent>
      </Card>
    </div>
  );
};