import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Smartphone,
  CreditCard,
  Upload,
  Loader2,
  CheckCircle,
  QrCode,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentQRCode {
  id: string;
  payment_method: string;
  label: string | null;
  qr_image_url: string;
  is_active: boolean;
}

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auctionId: string;
  auctionTitle: string;
  entranceFee: number;
  onPaymentSubmitted: () => void;
}

const PAYMENT_METHODS = [
  { value: 'gcash', label: 'GCash', icon: Smartphone, color: 'text-blue-600' },
  { value: 'maya', label: 'Maya', icon: Smartphone, color: 'text-green-600' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: CreditCard, color: 'text-purple-600' },
  { value: 'other', label: 'Other', icon: CreditCard, color: 'text-gray-600' },
];

const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  onOpenChange,
  auctionId,
  auctionTitle,
  entranceFee,
  onPaymentSubmitted,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'method' | 'upload' | 'submitted'>('method');
  const [selectedMethod, setSelectedMethod] = useState<string>('gcash');
  const [qrCodes, setQrCodes] = useState<PaymentQRCode[]>([]);
  const [isLoadingQR, setIsLoadingQR] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingReceipt, setExistingReceipt] = useState<any>(null);

  useEffect(() => {
    if (open) {
      fetchQRCodes();
      checkExistingReceipt();
      setStep('method');
      setSelectedFile(null);
      setReceiptPreview(null);
      setReferenceNumber('');
    }
  }, [open]);

  const fetchQRCodes = async () => {
    setIsLoadingQR(true);
    try {
      const { data, error } = await supabase
        .from('payment_qr_codes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQrCodes(data || []);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
    } finally {
      setIsLoadingQR(false);
    }
  };

  const checkExistingReceipt = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('entrance_fee_receipts')
        .select('*')
        .eq('auction_id', auctionId)
        .eq('bidder_id', user.id)
        .maybeSingle();

      setExistingReceipt(data);
    } catch (error) {
      console.error('Error checking existing receipt:', error);
    }
  };

  const currentMethodQR = qrCodes.filter(qr => qr.payment_method === selectedMethod);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file (JPG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image under 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitReceipt = async () => {
    if (!selectedFile || !user) return;

    setIsSubmitting(true);
    try {
      // Upload receipt image to Supabase storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}-${auctionId}-${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get the URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(filePath);

      // Insert receipt into database — auto-approved
      const { error: insertError } = await supabase
        .from('entrance_fee_receipts')
        .upsert({
          auction_id: auctionId,
          bidder_id: user.id,
          payment_method: selectedMethod,
          receipt_image_url: urlData.publicUrl,
          amount: entranceFee,
          reference_number: referenceNumber.trim() || null,
          status: 'approved',
        }, {
          onConflict: 'bidder_id,auction_id',
        });

      if (insertError) throw insertError;

      // Auto-grant access: create/update entrance fee record as paid
      const { data: existingFee } = await supabase
        .from('auction_entrance_fees')
        .select('id')
        .eq('auction_id', auctionId)
        .eq('bidder_id', user.id)
        .maybeSingle();

      // Get auction end date
      const { data: auction } = await supabase
        .from('auction_events')
        .select('end_date')
        .eq('id', auctionId)
        .single();

      if (existingFee) {
        const { error: feeUpdateError } = await supabase
          .from('auction_entrance_fees')
          .update({
            payment_status: 'paid',
            paid_at: new Date().toISOString(),
            provider: selectedMethod,
          })
          .eq('id', existingFee.id);

        if (feeUpdateError) {
          console.warn('[Payment] Failed to update entrance fee record:', feeUpdateError);
        }
      } else {
        const { error: feeInsertError } = await supabase
          .from('auction_entrance_fees')
          .insert({
            auction_id: auctionId,
            bidder_id: user.id,
            fee_amount: entranceFee,
            payment_status: 'paid',
            paid_at: new Date().toISOString(),
            access_expires_at: auction?.end_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            provider: selectedMethod,
          });

        if (feeInsertError) {
          console.warn('[Payment] Failed to insert entrance fee record:', feeInsertError);
        }
      }

      setStep('submitted');
      toast({
        title: 'Payment Confirmed!',
        description: 'Your receipt has been submitted. You now have access to the auction!',
      });

      onPaymentSubmitted();
    } catch (error: any) {
      console.error('Error submitting receipt:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit receipt. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodInfo = (method: string) => {
    return PAYMENT_METHODS.find(m => m.value === method);
  };

  // When existing approved receipt is found, notify parent so access state updates
  useEffect(() => {
    if (existingReceipt && existingReceipt.status === 'approved') {
      onPaymentSubmitted();
    }
  }, [existingReceipt]);

  // Show existing receipt status — already paid
  if (existingReceipt) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Confirmed</DialogTitle>
            <DialogDescription>
              Your payment for "{auctionTitle}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-3" />
                <h3 className="text-lg font-semibold text-green-700">Payment Confirmed!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You have access to this auction and can participate in bidding.
                </p>
              </div>
            </div>

            {/* Receipt preview */}
            <div className="border rounded-lg overflow-hidden">
              <img
                src={existingReceipt.receipt_image_url}
                alt="Your receipt"
                className="w-full h-auto max-h-48 object-contain bg-muted"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Method:</span>{' '}
                <span className="font-medium">{getMethodInfo(existingReceipt.payment_method)?.label}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>{' '}
                <span className="font-medium">₱{existingReceipt.amount}</span>
              </div>
              {existingReceipt.reference_number && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Reference:</span>{' '}
                  <span className="font-medium">{existingReceipt.reference_number}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Go to Auction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pay Entrance Fee
          </DialogTitle>
          <DialogDescription>
            Pay ₱{entranceFee.toLocaleString()} to access "{auctionTitle}" and participate in bidding
          </DialogDescription>
        </DialogHeader>

        {step === 'method' && (
          <div className="space-y-5 py-2">
            {/* Amount */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Amount to Pay</p>
              <p className="text-3xl font-bold text-primary">₱{entranceFee.toLocaleString()}</p>
            </div>

            {/* Payment method selection */}
            <div>
              <Label className="text-base font-semibold">Choose Payment Method</Label>
              <RadioGroup
                value={selectedMethod}
                onValueChange={setSelectedMethod}
                className="mt-3 space-y-2"
              >
                {PAYMENT_METHODS.map((method) => {
                  const hasQR = qrCodes.some(qr => qr.payment_method === method.value);
                  return (
                    <label
                      key={method.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedMethod === method.value
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:bg-muted/50'
                      } ${!hasQR ? 'opacity-50' : ''}`}
                    >
                      <RadioGroupItem value={method.value} disabled={!hasQR} />
                      <method.icon className={`h-5 w-5 ${method.color}`} />
                      <div className="flex-1">
                        <span className="font-medium">{method.label}</span>
                        {!hasQR && (
                          <span className="text-xs text-muted-foreground ml-2">(Not available)</span>
                        )}
                      </div>
                      {hasQR && <Badge variant="outline" className="text-xs">Available</Badge>}
                    </label>
                  );
                })}
              </RadioGroup>
            </div>

            {/* QR Code Display */}
            {!isLoadingQR && currentMethodQR.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Scan QR to Pay
                </Label>
                {currentMethodQR.map((qr) => (
                  <div key={qr.id} className="border rounded-lg overflow-hidden bg-white p-4">
                    <img
                      src={qr.qr_image_url}
                      alt={`${getMethodInfo(qr.payment_method)?.label} QR Code`}
                      className="w-full max-w-64 mx-auto h-auto"
                    />
                    {qr.label && (
                      <p className="text-center text-sm text-muted-foreground mt-2">{qr.label}</p>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-center">
                  After paying, take a screenshot of your receipt and continue to upload it.
                </p>
              </div>
            )}

            {isLoadingQR && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep('upload')}
                disabled={!qrCodes.some(qr => qr.payment_method === selectedMethod)}
              >
                Continue to Upload Receipt
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-5 py-2">
            {/* Selected method */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              {(() => {
                const info = getMethodInfo(selectedMethod);
                if (!info) return null;
                return (
                  <>
                    <info.icon className={`h-5 w-5 ${info.color}`} />
                    <span className="font-medium">{info.label}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-semibold">₱{entranceFee.toLocaleString()}</span>
                  </>
                );
              })()}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs"
                onClick={() => setStep('method')}
              >
                Change
              </Button>
            </div>

            {/* Receipt upload */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Upload Payment Receipt</Label>
              <p className="text-sm text-muted-foreground">
                Upload a screenshot or photo of your payment receipt as proof of payment.
              </p>

              {receiptPreview ? (
                <div className="border rounded-lg overflow-hidden bg-white relative">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="w-full h-auto max-h-64 object-contain"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2 bg-white"
                    onClick={() => {
                      setSelectedFile(null);
                      setReceiptPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="font-medium text-sm">Click to upload receipt</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG up to 10MB</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Reference number */}
            <div>
              <Label>Reference Number (Optional)</Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g., GCash ref #1234567890"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('method')}>
                Back
              </Button>
              <Button
                onClick={handleSubmitReceipt}
                disabled={!selectedFile || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Receipt
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'submitted' && (
          <div className="space-y-5 py-4">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-green-700">Payment Confirmed!</h3>
              <p className="text-muted-foreground mt-2">
                Your receipt has been submitted and access has been granted.
              </p>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-800">Access Granted</p>
                  <p className="text-sm text-green-700">
                    You now have full access to the auction. You can start bidding right away!
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>
                Go to Auction
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
