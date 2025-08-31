
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PhilippinePeso, CreditCard, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface EntrancePaymentProps {
  auctionId: string; // Changed to string UUID
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'verifying' | 'success' | 'failed'>('idle');

  const handlePayment = async () => {
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

    setIsProcessing(true);
    setPaymentStatus('pending');

    try {
      const payload = { auction_id: auctionId };
      console.log('Sending payment request with payload:', payload);
      
      // Create payment intent
      const { data: paymentData, error } = await supabase.functions.invoke('create-entrance-payment', {
        body: payload
      });

      if (error) {
        throw new Error(error.message || 'Failed to create payment');
      }

      if (paymentData.error) {
        if (paymentData.has_access) {
          setPaymentStatus('success');
          onPaymentSuccess();
        } else {
          throw new Error(paymentData.error);
        }
        return;
      }

      // Redirect to PayMongo checkout
      const checkoutUrl = paymentData.checkout_url;
      if (checkoutUrl) {
        // Open PayMongo checkout in new window
        const paymentWindow = window.open(checkoutUrl, 'paymongo-checkout', 'width=600,height=800');
        
        // Poll for payment completion
        let pollAttempts = 0;
        const maxPolls = 60; // 5 minutes with 5-second intervals
        
        const pollPayment = async () => {
          pollAttempts++;
          
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-payment', {
              body: { payment_intent_id: paymentData.payment_intent_id }
            });

            if (verifyError) {
              console.error('Verification error:', verifyError);
              return;
            }

            if (verifyData.has_access) {
              setPaymentStatus('success');
              paymentWindow?.close();
              toast({
                title: "Payment Successful!",
                description: "You now have access to this auction.",
              });
              onPaymentSuccess();
              return;
            }

            if (verifyData.payment_status === 'failed') {
              setPaymentStatus('failed');
              paymentWindow?.close();
              toast({
                title: "Payment Failed",
                description: "Your payment was not successful. Please try again.",
                variant: "destructive"
              });
              return;
            }

            // Continue polling if still processing
            if (pollAttempts < maxPolls && !paymentWindow?.closed) {
              setTimeout(pollPayment, 5000);
            } else {
              setPaymentStatus('failed');
              toast({
                title: "Payment Timeout",
                description: "Payment verification timed out. Please check your account or try again.",
                variant: "destructive"
              });
            }
          } catch (pollError) {
            console.error('Poll error:', pollError);
            if (pollAttempts < maxPolls && !paymentWindow?.closed) {
              setTimeout(pollPayment, 5000);
            }
          }
        };

        // Start polling after a short delay
        setTimeout(pollPayment, 3000);
        setPaymentStatus('verifying');
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      toast({
        title: "Payment Error",
        description: error.message || "Failed to process payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
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
              Cards
            </div>
          </div>
        </div>

        {paymentStatus === 'failed' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-700">Payment failed. Please try again.</p>
          </div>
        )}

        <Button 
          onClick={handlePayment}
          disabled={isProcessing || paymentStatus === 'verifying'}
          className="w-full"
          size="lg"
        >
          {paymentStatus === 'verifying' 
            ? 'Verifying Payment...' 
            : isProcessing 
              ? 'Processing...' 
              : `Pay ₱${entranceFee || 0} & Get Access`
          }
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
  );
};

export default EntrancePayment;
