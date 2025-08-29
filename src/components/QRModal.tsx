
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QRCodeDisplay } from './inventory/QRCodeDisplay';
import { Download, ExternalLink } from 'lucide-react';

interface QRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  qrCodeUrl?: string | null;
}

export const QRModal: React.FC<QRModalProps> = ({
  open,
  onOpenChange,
  itemId,
  qrCodeUrl
}) => {
  const downloadQR = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `${itemId}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Fallback: generate QR using API
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(itemId)}`;
      const link = document.createElement('a');
      link.href = qrUrl;
      link.download = `${itemId}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openInNewTab = () => {
    if (qrCodeUrl) {
      window.open(qrCodeUrl, '_blank');
    } else {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(itemId)}`;
      window.open(qrUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code - {itemId}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-lg border">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt={`QR Code for ${itemId}`}
                  className="w-64 h-64 object-contain"
                />
              ) : (
                <QRCodeDisplay itemId={itemId} size={256} />
              )}
            </div>
          </div>

          <div className="text-center">
            <p className="font-mono text-lg font-bold">{itemId}</p>
            <p className="text-sm text-muted-foreground">
              BlueSky Auction House
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={openInNewTab} className="flex-1">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Full Size
            </Button>
            <Button onClick={downloadQR} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
