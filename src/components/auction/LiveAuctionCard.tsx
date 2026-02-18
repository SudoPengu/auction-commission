import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Users, Eye, DollarSign, Clock, Play, Pause, Square, AlertTriangle, ArrowRight, Trash2, Video } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStopAuctionTimer } from '@/hooks/useStopAuctionTimer';

export interface AuctionEvent {
  id: string; // Changed to string UUID
  title: string;
  theme_title?: string;
  date: string;
  time: string;
  location?: string;
  status: 'LIVE' | 'STARTING_SOON' | 'UPCOMING' | 'COMPLETED';
  itemCount: number;
  viewer_count?: number;
  total_bids?: number;
  revenue?: string;
  entrance_fee?: number;
  duration?: string;
  stream_url?: string;
  platform?: string;
}

interface LiveAuctionCardProps {
  auction: AuctionEvent;
  onStart?: (id: string) => void;
  onPause?: (id: string) => void;
  onStop?: (id: string) => void;
  onJoin?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const LiveAuctionCard: React.FC<LiveAuctionCardProps> = ({
  auction,
  onStart,
  onPause,
  onStop,
  onJoin,
  onDelete
}) => {
  const { profile } = useAuth();
  const isStaffOrAdmin = profile?.role && ['staff', 'admin', 'super-admin', 'auction-manager'].includes(profile.role);

  const handleStopConfirm = () => {
    if (onStop) {
      onStop(auction.id);
    }
  };

  const stopTimer = useStopAuctionTimer(handleStopConfirm);

  const getStatusBadge = () => {
    switch (auction.status) {
      case 'LIVE':
        return (
          <Badge variant="destructive" className="animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full mr-1 animate-ping" />
            LIVE NOW
          </Badge>
        );
      case 'STARTING_SOON':
        return <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">Starting Soon</Badge>;
      case 'UPCOMING':
        return <Badge variant="outline">Upcoming</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary" className="bg-muted">Completed</Badge>;
      default:
        return null;
    }
  };

  const getActionButtons = () => {
    if (!isStaffOrAdmin) {
      if (auction.status === 'LIVE') {
        return (
          <Button 
            onClick={() => onJoin?.(auction.id)}
            className="w-full"
          >
            <ArrowRight size={16} className="mr-2" />
            Join Live Auction
          </Button>
        );
      }
      if (auction.status === 'STARTING_SOON') {
        return (
          <Button 
            onClick={() => onJoin?.(auction.id)}
            className="w-full"
            variant="outline"
          >
            View Auction Details
          </Button>
        );
      }
      return null;
    }

    // Admin/Staff controls
    switch (auction.status) {
      case 'UPCOMING':
      case 'STARTING_SOON':
        return (
          <Button onClick={() => onStart?.(auction.id)} className="w-full">
            <Play size={16} className="mr-2" />
            Start Auction
          </Button>
        );
      case 'LIVE':
        return (
          <div className="space-y-2">
            <Button 
              onClick={() => onJoin?.(auction.id)} 
              className="w-full"
            >
              <Video size={16} className="mr-2" />
              Go to Stream
            </Button>
            <div className="flex gap-2">
              <Button onClick={() => onPause?.(auction.id)} variant="outline" size="sm">
                <Pause size={16} />
              </Button>
              <Button 
                onClick={stopTimer.startTimer}
                disabled={stopTimer.isTimerActive}
                variant="destructive" 
                className="flex-1"
              >
                {stopTimer.isTimerActive ? (
                  <>
                    <AlertTriangle size={16} className="mr-2" />
                    Confirm Stop ({stopTimer.countdown}s)
                  </>
                ) : (
                  <>
                    <Square size={16} className="mr-2" />
                    Stop Auction
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const cardClassName = `${
    auction.status === 'LIVE' 
      ? 'ring-2 ring-destructive ring-opacity-50 shadow-lg' 
      : auction.status === 'COMPLETED' 
        ? 'bg-muted/20' 
        : ''
  } transition-all duration-200 hover:shadow-md`;

  return (
    <Card className={cardClassName}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{auction.title}</CardTitle>
            {auction.theme_title && (
              <p className="text-sm text-primary font-medium">{auction.theme_title}</p>
            )}
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription className="flex items-center gap-1">
          <CalendarDays size={14} />
          {auction.date} • {auction.time}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-muted-foreground" />
            <span>{auction.itemCount} Items</span>
          </div>
          
          {auction.viewer_count !== undefined && (
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-muted-foreground" />
              <span>{auction.viewer_count || 0} Viewers</span>
            </div>
          )}
          
          {auction.total_bids !== undefined && (
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-muted-foreground" />
              <span>{auction.total_bids || 0} Bids</span>
            </div>
          )}
          
          {/* Hide revenue for bidders */}
          {auction.revenue && auction.status === 'COMPLETED' && !profile?.role?.includes('bidder') && (
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-muted-foreground" />
              <span>₱{auction.revenue || 0} Revenue</span>
            </div>
          )}
          
          {auction.duration && auction.status === 'COMPLETED' && (
            <div className="flex items-center gap-2 col-span-2">
              <Clock size={16} className="text-muted-foreground" />
              <span>Duration: {auction.duration}</span>
            </div>
          )}
        </div>

        {auction.platform && auction.status === 'LIVE' && (
          <div className="mt-3 p-2 bg-primary/5 rounded-md">
            <p className="text-xs text-muted-foreground">
              Streaming on: <span className="font-medium text-foreground">{auction.platform.toUpperCase()}</span>
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex flex-col gap-2">
        {getActionButtons()}
        {isStaffOrAdmin && onDelete && (
          <Button 
            onClick={() => onDelete(auction.id)}
            variant="outline"
            size="sm"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 size={16} className="mr-2" />
            Delete Auction
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
