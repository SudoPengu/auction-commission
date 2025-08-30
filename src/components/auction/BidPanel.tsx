import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, Minus } from 'lucide-react';
import { validateBid } from '@/utils/bidValidation';
import { supabase } from '@/integrations/supabase/client';
import { BidResponse } from '@/types/auction';
import { toast } from '@/hooks/use-toast';

const PRESET_BIDS = [20, 50, 100, 200, 500, 1000];

interface BidPanelProps {
  lotId: string;
  currentPrice: number;
  isOpen: boolean;
  hasAccess: boolean;
  onBidSuccess?: (response: BidResponse) => void;
}

const BidPanel: React.FC<BidPanelProps> = ({
  lotId,
  currentPrice,
  isOpen,
  hasAccess,
  onBidSuccess
}) => {
  const [bidAmount, setBidAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validation = validateBid(currentPrice, bidAmount);

  const addBid = (amount: number) => {
    setBidAmount(prev => Math.max(0, prev + amount));
  };

  const resetBid = () => {
    setBidAmount(validation.requiredMinimum);
  };

  const submitBid = async () => {
    if (!validation.isValid) {
      toast({
        title: "Invalid Bid",
        description: `Minimum bid is ₱${validation.requiredMinimum.toLocaleString()}`,
        variant: "destructive"
      });
      return;
    }

    if (!window.confirm(`Confirm bid of ₱${bidAmount.toLocaleString()}?`)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('place_bid', {
        p_lot_id: lotId,
        p_amount: bidAmount
      });

      if (error) {
        console.error('Bid placement error:', error);
        toast({
          title: "Bid Failed",
          description: error.message || "Failed to place bid",
          variant: "destructive"
        });
        return;
      }

      // Type assertion for the response
      const response = data as unknown as BidResponse;

      if (!response.success) {
        if (response.action === 'pay_entry_fee') {
          toast({
            title: "Entrance Fee Required",
            description: response.error || "Please pay entrance fee to continue bidding",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Bid Rejected",
            description: response.error || "Your bid was not accepted",
            variant: "destructive"
          });
        }
        return;
      }

      // Success!
      toast({
        title: "Bid Placed Successfully",
        description: `Your bid of ₱${bidAmount.toLocaleString()} has been placed!`,
      });

      setBidAmount(0);
      onBidSuccess?.(response);

    } catch (error) {
      console.error('Error placing bid:', error);
      toast({
        title: "Network Error",
        description: "Failed to place bid. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasAccess) {
    return (
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Access Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Please pay the entrance fee to participate in bidding
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isOpen) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-muted-foreground">Bidding Closed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This lot is not currently accepting bids
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Place Your Bid</CardTitle>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Current Price: ₱{currentPrice.toLocaleString()}
          </span>
          <Badge variant={validation.isValid ? "default" : "destructive"}>
            Min: ₱{validation.requiredMinimum.toLocaleString()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bid Amount Display */}
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Your Bid</div>
          <div className="text-2xl font-bold">₱{bidAmount.toLocaleString()}</div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => addBid(-bidAmount)}
            disabled={bidAmount === 0}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetBid}
          >
            Min Bid
          </Button>
        </div>

        {/* Preset Bid Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {PRESET_BIDS.map((amount) => (
            <Button
              key={amount}
              variant="outline"
              size="sm"
              onClick={() => addBid(amount)}
              className="flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              ₱{amount}
            </Button>
          ))}
        </div>

        {/* Submit Button */}
        <Button
          onClick={submitBid}
          disabled={!validation.isValid || isSubmitting || bidAmount === 0}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? 'Placing Bid...' : `Place Bid of ₱${bidAmount.toLocaleString()}`}
        </Button>

        {/* Validation Message */}
        {bidAmount > 0 && !validation.isValid && (
          <p className="text-sm text-destructive text-center">
            Bid must be at least ₱{validation.requiredMinimum.toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default BidPanel;
