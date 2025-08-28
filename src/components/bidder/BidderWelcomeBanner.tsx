import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Crown, Trophy, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const BidderWelcomeBanner: React.FC = () => {
  const { profile } = useAuth();

  return (
    <div className="relative overflow-hidden">
      <Card className="border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Welcome back, {profile?.full_name}!
                  </h1>
                  <p className="text-muted-foreground">Ready to win some amazing items?</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  <Star className="h-3 w-3 mr-1" />
                  VIP Bidder
                </Badge>
                <Badge variant="outline" className="border-accent/30">
                  <Trophy className="h-3 w-3 mr-1" />
                  Active Member
                </Badge>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-2">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm font-medium">Quick Bid</p>
                <p className="text-xs text-muted-foreground">One-click bidding</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-accent/20 rounded-full mb-2">
                  <Crown className="h-8 w-8 text-accent-foreground" />
                </div>
                <p className="text-sm font-medium">Priority Access</p>
                <p className="text-xs text-muted-foreground">VIP events</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-card rounded-lg border">
            <p className="text-sm text-muted-foreground mb-2">💡 <strong>Pro Tip:</strong></p>
            <p className="text-sm">Join live auctions early to secure the best bidding positions and get exclusive preview access!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BidderWelcomeBanner;