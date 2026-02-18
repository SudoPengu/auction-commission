import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  QrCode,
  Upload,
  Trash2,
  CheckCircle,
  Clock,
  Eye,
  Smartphone,
  CreditCard,
  Loader2,
  Image as ImageIcon,
  Receipt,
  Filter,
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
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

interface EntranceFeeReceipt {
  id: string;
  auction_id: string;
  bidder_id: string;
  payment_method: string;
  receipt_image_url: string;
  amount: number;
  reference_number: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  bidder_name?: string;
  bidder_email?: string;
  auction_title?: string;
}

const PAYMENT_METHODS = [
  { value: 'gcash', label: 'GCash', icon: Smartphone },
  { value: 'maya', label: 'Maya', icon: Smartphone },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: CreditCard },
  { value: 'other', label: 'Other', icon: CreditCard },
];

const Payments: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // QR Codes state
  const [qrCodes, setQrCodes] = useState<PaymentQRCode[]>([]);
  const [isLoadingQR, setIsLoadingQR] = useState(true);
  const [isUploadingQR, setIsUploadingQR] = useState(false);
  const [newQRMethod, setNewQRMethod] = useState('gcash');
  const [newQRLabel, setNewQRLabel] = useState('');
  const [selectedQRFile, setSelectedQRFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  // Receipts state
  const [receipts, setReceipts] = useState<EntranceFeeReceipt[]>([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(true);
  const [receiptFilter, setReceiptFilter] = useState<string>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<EntranceFeeReceipt | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // Fetch QR codes
  useEffect(() => {
    fetchQRCodes();
    fetchReceipts();
  }, []);

  const fetchQRCodes = async () => {
    setIsLoadingQR(true);
    try {
      const { data, error } = await supabase
        .from('payment_qr_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQrCodes(data || []);
    } catch (error: any) {
      console.error('Error fetching QR codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment QR codes.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingQR(false);
    }
  };

  const fetchReceipts = async () => {
    setIsLoadingReceipts(true);
    try {
      const { data, error } = await supabase
        .from('entrance_fee_receipts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch bidder and auction info
      const enrichedReceipts: EntranceFeeReceipt[] = [];
      for (const receipt of data || []) {
        let bidder_name = 'Unknown';
        let bidder_email = '';
        let auction_title = 'Unknown Auction';

        // Get bidder info
        const { data: bidder } = await supabase
          .from('bidders')
          .select('full_name, email')
          .eq('id', receipt.bidder_id)
          .single();
        
        if (bidder) {
          bidder_name = bidder.full_name;
          bidder_email = bidder.email || '';
        }

        // Get auction info
        const { data: auction } = await supabase
          .from('auction_events')
          .select('title')
          .eq('id', receipt.auction_id)
          .single();
        
        if (auction) {
          auction_title = auction.title;
        }

        enrichedReceipts.push({
          ...receipt,
          bidder_name,
          bidder_email,
          auction_title,
        });
      }

      setReceipts(enrichedReceipts);
    } catch (error: any) {
      console.error('Error fetching receipts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment receipts.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingReceipts(false);
    }
  };

  const handleQRFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image under 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedQRFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setQrPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadQR = async () => {
    if (!selectedQRFile || !user) return;

    setIsUploadingQR(true);
    try {
      // Upload image to Supabase storage
      const fileExt = selectedQRFile.name.split('.').pop();
      const fileName = `${newQRMethod}-${Date.now()}.${fileExt}`;
      const filePath = `qr-codes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-qr-codes')
        .upload(filePath, selectedQRFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('payment-qr-codes')
        .getPublicUrl(filePath);

      // Insert into database
      const { error: insertError } = await supabase
        .from('payment_qr_codes')
        .insert({
          payment_method: newQRMethod,
          label: newQRLabel.trim() || null,
          qr_image_url: urlData.publicUrl,
          uploaded_by: user.id,
          is_active: true,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Success',
        description: 'Payment QR code uploaded successfully.',
      });

      // Reset form
      setSelectedQRFile(null);
      setQrPreview(null);
      setNewQRLabel('');
      setNewQRMethod('gcash');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      fetchQRCodes();
    } catch (error: any) {
      console.error('Error uploading QR code:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload QR code.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingQR(false);
    }
  };

  const handleToggleQR = async (qrCode: PaymentQRCode) => {
    try {
      const { error } = await supabase
        .from('payment_qr_codes')
        .update({ is_active: !qrCode.is_active })
        .eq('id', qrCode.id);

      if (error) throw error;

      toast({
        title: 'Updated',
        description: `QR code ${qrCode.is_active ? 'deactivated' : 'activated'}.`,
      });

      fetchQRCodes();
    } catch (error: any) {
      console.error('Error toggling QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to update QR code status.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteQR = async (qrCode: PaymentQRCode) => {
    if (!confirm('Are you sure you want to delete this QR code?')) return;

    try {
      // Delete from storage
      const urlParts = qrCode.qr_image_url.split('/payment-qr-codes/');
      if (urlParts.length > 1) {
        await supabase.storage
          .from('payment-qr-codes')
          .remove([urlParts[1]]);
      }

      // Delete from database
      const { error } = await supabase
        .from('payment_qr_codes')
        .delete()
        .eq('id', qrCode.id);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'QR code has been removed.',
      });

      fetchQRCodes();
    } catch (error: any) {
      console.error('Error deleting QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete QR code.',
        variant: 'destructive',
      });
    }
  };

  const handleReviewReceipt = (receipt: EntranceFeeReceipt) => {
    setSelectedReceipt(receipt);
    setIsReviewDialogOpen(true);
  };

  const getMethodLabel = (method: string) => {
    return PAYMENT_METHODS.find(m => m.value === method)?.label || method;
  };

  const getMethodIcon = (method: string) => {
    const Icon = PAYMENT_METHODS.find(m => m.value === method)?.icon || CreditCard;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredReceipts = receiptFilter === 'all'
    ? receipts
    : receipts.filter(r => r.status === receiptFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">
          Manage payment QR codes and view bidder payment receipts
        </p>
      </div>

      <Tabs defaultValue="receipts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="receipts" className="relative">
            <Receipt className="h-4 w-4 mr-2" />
            Payment Receipts
          </TabsTrigger>
          <TabsTrigger value="qr-codes">
            <QrCode className="h-4 w-4 mr-2" />
            QR Code Setup
          </TabsTrigger>
        </TabsList>

        {/* ====== RECEIPTS TAB ====== */}
        <TabsContent value="receipts" className="space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={receiptFilter} onValueChange={setReceiptFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Receipts ({receipts.length})</SelectItem>
                <SelectItem value="pending">Pending ({receipts.filter(r => r.status === 'pending').length})</SelectItem>
                <SelectItem value="approved">Approved ({receipts.filter(r => r.status === 'approved').length})</SelectItem>
                <SelectItem value="rejected">Rejected ({receipts.filter(r => r.status === 'rejected').length})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoadingReceipts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReceipts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No payment receipts found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredReceipts.map((receipt) => (
                <Card key={receipt.id} className={`transition-colors ${receipt.status === 'pending' ? 'border-yellow-200 bg-yellow-50/30' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Receipt thumbnail */}
                      <div 
                        className="w-20 h-20 rounded-lg border overflow-hidden flex-shrink-0 bg-muted cursor-pointer hover:opacity-80"
                        onClick={() => handleReviewReceipt(receipt)}
                      >
                        <img
                          src={receipt.receipt_image_url}
                          alt="Receipt"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>

                      {/* Receipt details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{receipt.bidder_name}</h3>
                          {getStatusBadge(receipt.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{receipt.bidder_email}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            {getMethodIcon(receipt.payment_method)}
                            {getMethodLabel(receipt.payment_method)}
                          </span>
                          <span className="font-semibold">₱{receipt.amount.toLocaleString()}</span>
                          {receipt.reference_number && (
                            <span className="text-muted-foreground">Ref: {receipt.reference_number}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Auction: {receipt.auction_title} &bull; Submitted: {new Date(receipt.created_at).toLocaleString()}
                        </p>
                        {receipt.admin_notes && (
                          <p className="text-xs mt-1 italic text-muted-foreground">
                            Admin note: {receipt.admin_notes}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReviewReceipt(receipt)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ====== QR CODES TAB ====== */}
        <TabsContent value="qr-codes" className="space-y-6">
          {/* Upload new QR code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Payment QR Code
              </CardTitle>
              <CardDescription>
                Upload QR code images so bidders can scan and pay. These will be shown when bidders pay the entrance fee.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Form */}
                <div className="space-y-4">
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={newQRMethod} onValueChange={setNewQRMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            <span className="flex items-center gap-2">
                              <method.icon className="h-4 w-4" />
                              {method.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Label (Optional)</Label>
                    <Input
                      value={newQRLabel}
                      onChange={(e) => setNewQRLabel(e.target.value)}
                      placeholder="e.g., BlueSky GCash Account"
                    />
                  </div>

                  <div>
                    <Label>QR Code Image</Label>
                    <div className="mt-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleQRFileSelect}
                        className="block w-full text-sm text-muted-foreground
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-semibold
                          file:bg-primary file:text-primary-foreground
                          hover:file:bg-primary/90
                          cursor-pointer"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleUploadQR}
                    disabled={!selectedQRFile || isUploadingQR}
                    className="w-full"
                  >
                    {isUploadingQR ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload QR Code
                      </>
                    )}
                  </Button>
                </div>

                {/* Right: Preview */}
                <div className="flex items-center justify-center">
                  {qrPreview ? (
                    <div className="border rounded-lg overflow-hidden bg-white p-4 max-w-64">
                      <img src={qrPreview} alt="QR Preview" className="w-full h-auto" />
                      <p className="text-center text-sm text-muted-foreground mt-2">Preview</p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mb-2" />
                      <p className="text-sm">Select an image to preview</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Existing QR codes */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Active Payment QR Codes</h3>
            {isLoadingQR ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : qrCodes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No QR codes uploaded yet.</p>
                  <p className="text-sm text-muted-foreground">Upload a QR code above to get started.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {qrCodes.map((qr) => (
                  <Card key={qr.id} className={!qr.is_active ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getMethodIcon(qr.payment_method)}
                          <span className="font-semibold">{getMethodLabel(qr.payment_method)}</span>
                        </div>
                        <Badge variant={qr.is_active ? 'default' : 'secondary'}>
                          {qr.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="border rounded-lg overflow-hidden bg-white p-2 mb-3">
                        <img
                          src={qr.qr_image_url}
                          alt={`${getMethodLabel(qr.payment_method)} QR`}
                          className="w-full h-auto"
                        />
                      </div>

                      {qr.label && (
                        <p className="text-sm text-muted-foreground mb-3">{qr.label}</p>
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleQR(qr)}
                          className="flex-1"
                        >
                          {qr.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteQR(qr)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ====== RECEIPT VIEW DIALOG ====== */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
            <DialogDescription>
              View the payment receipt details. Payments are auto-approved upon submission.
            </DialogDescription>
          </DialogHeader>

          {selectedReceipt && (
            <div className="space-y-4">
              {/* Bidder Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Bidder</p>
                  <p className="font-semibold">{selectedReceipt.bidder_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedReceipt.bidder_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Auction</p>
                  <p className="font-semibold">{selectedReceipt.auction_title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-semibold flex items-center gap-1">
                    {getMethodIcon(selectedReceipt.payment_method)}
                    {getMethodLabel(selectedReceipt.payment_method)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold text-lg">₱{selectedReceipt.amount.toLocaleString()}</p>
                </div>
                {selectedReceipt.reference_number && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Reference Number</p>
                    <p className="font-semibold">{selectedReceipt.reference_number}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedReceipt.status)}
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-semibold">{new Date(selectedReceipt.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Receipt Image */}
              <div>
                <Label>Receipt Image</Label>
                <div className="border rounded-lg overflow-hidden bg-white mt-1">
                  <img
                    src={selectedReceipt.receipt_image_url}
                    alt="Payment Receipt"
                    className="w-full h-auto max-h-96 object-contain"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReviewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
