
import React from 'react';

interface QRCodeDisplayProps {
  itemId: string;
  size?: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ 
  itemId, 
  size = 80 
}) => {
  // Using QR Server API for generating QR codes
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(itemId)}`;

  return (
    <div className="flex items-center gap-3">
      <img
        src={qrUrl}
        alt={`QR Code for ${itemId}`}
        className="border rounded"
        style={{ width: size, height: size }}
      />
      <div>
        <div className="font-mono text-sm font-bold">{itemId}</div>
        <div className="text-xs text-muted-foreground">Scan to verify</div>
      </div>
    </div>
  );
};
