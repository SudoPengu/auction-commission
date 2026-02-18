
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PhilippinePeso, CreditCard, Smartphone, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import PaymentModal from './PaymentModal';

interface EntrancePaymentProps {
  auctionId: string;
  auctionTitle: string;
  onPaymentSuccess: () => void;
  hasAccess?: boolean;
  entranceFee?: number;
}

const EntrancePayment: React.FC<EntrancePaymentProps> = ({
  auctionId,
  auctionTitle,
  onPaymentSuccess,
  hasAccess = false,
  entranceFee = 0
}) => {
  const { user } = useAuth();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleOpenPaymentModal = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase entrance access.",
        variant: "destructive"
      });
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(auctionId)) {
      toast({
        title: "Invalid auction_id",
        description: "Please contact support if this problem persists.",
        variant: "destructive"
      });
      return;
    }

    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmitted = () => {
    // Payment is auto-approved — grant access immediately
    onPaymentSuccess();
  };

  if (hasAccess) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-800">Access Granted</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-green-700 text-sm">
            You have paid access to this auction and can participate in bidding.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <PhilippinePeso className="h-5 w-5" />
            Entrance Fee Required
          </CardTitle>
          <CardDescription className="text-orange-700">
            Pay entrance fee to access "{auctionTitle}" and participate in bidding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              <PhilippinePeso className="h-5 w-5 text-gray-600" />
              <div>
                <p className="font-semibold">Entrance Fee</p>
                <p className="text-sm text-gray-600">Non-refundable, single auction access</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg font-bold">₱{entranceFee || 0}</Badge>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Accepted Payment Methods:</p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                GCash
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Maya
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Bank Transfer
              </div>
            </div>
          </div>

          <Button 
            onClick={handleOpenPaymentModal}
            className="w-full"
            size="lg"
          >
            {`Pay ₱${entranceFee || 0} & Get Access`}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Access expires when the auction ends. Credits cannot be transferred between auctions.
          </p>
          
          {/* Debug info - remove in production */}
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
            <p><strong>Auction ID:</strong> {auctionId}</p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <PaymentModal
        open={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        auctionId={auctionId}
        auctionTitle={auctionTitle}
        entranceFee={entranceFee || 0}
        onPaymentSubmitted={handlePaymentSubmitted}
      />
    </>
  );
};

export default EntrancePayment;
