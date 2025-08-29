
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQRScanner } from '@/hooks/useQRScanner';
import { ItemEditModal } from './ItemEditModal';
import { QrCode, Keyboard, Camera, AlertTriangle } from 'lucide-react';

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanComplete: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  open,
  onOpenChange,
  onScanComplete
}) => {
  const [mode, setMode] = useState<'camera' | 'manual'>('manual');
  const [manualInput, setManualInput] = useState('');
  const [showItemEdit, setShowItemEdit] = useState(false);
  const [validQRCode, setValidQRCode] = useState<string | null>(null);
  
  const {
    isScanning,
    scannedResult,
    error,
    startScanning,
    stopScanning,
    validateQRCode,
    reset
  } = useQRScanner();

  const elementId = 'qr-scanner-container';

  useEffect(() => {
    if (mode === 'camera' && open && !isScanning) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        startScanning(elementId);
      }, 100);
    } else if (mode === 'manual' || !open) {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [mode, open]);

  useEffect(() => {
    if (scannedResult?.validation.exists && !scannedResult.validation.is_used) {
      setValidQRCode(scannedResult.code);
      setShowItemEdit(true);
    }
  }, [scannedResult]);

  const handleManualSubmit = async () => {
    if (!manualInput.trim()) return;
    
    try {
      const validation = await validateQRCode(manualInput.trim());
      
      if (!validation.exists) {
        // Show error - QR not found
        return;
      }
      
      if (validation.is_used) {
        // Show error - QR already used
        return;
      }
      
      // QR is valid and unused
      setValidQRCode(manualInput.trim());
      setShowItemEdit(true);
    } catch (error) {
      console.error('Manual validation failed:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualSubmit();
    }
  };

  const handleItemSaved = () => {
    setShowItemEdit(false);
    setValidQRCode(null);
    setManualInput('');
    reset();
    onScanComplete();
  };

  const handleClose = () => {
    stopScanning();
    reset();
    setManualInput('');
    setValidQRCode(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Scanner
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode Selection */}
            <div className="flex gap-2">
              <Button
                variant={mode === 'camera' ? 'default' : 'outline'}
                onClick={() => setMode('camera')}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                Camera Scan
              </Button>
              <Button
                variant={mode === 'manual' ? 'default' : 'outline'}
                onClick={() => setMode('manual')}
                className="flex-1"
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Manual Entry
              </Button>
            </div>

            {/* Camera Mode */}
            {mode === 'camera' && (
              <div>
                <div id={elementId} className="w-full"></div>
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded p-3 mt-3">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      {error}
                    </div>
                  </div>
                )}
                {isScanning && (
                  <p className="text-center text-sm text-muted-foreground mt-3">
                    Point your camera at a QR code to scan
                  </p>
                )}
              </div>
            )}

            {/* Manual Mode */}
            {mode === 'manual' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="qrCode">QR Code / Item ID</Label>
                  <Input
                    id="qrCode"
                    placeholder="BX-20250829-0001"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter or paste the QR code value
                  </p>
                </div>
                <Button onClick={handleManualSubmit} className="w-full">
                  Validate QR Code
                </Button>
              </div>
            )}

            {/* Scan Results */}
            {scannedResult && (
              <div className="bg-muted p-4 rounded">
                <h4 className="font-medium mb-2">Scan Result</h4>
                <p className="font-mono text-sm mb-2">{scannedResult.code}</p>
                <div className="text-sm">
                  {scannedResult.validation.exists ? (
                    scannedResult.validation.is_used ? (
                      <div className="text-destructive flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        QR code already used
                      </div>
                    ) : (
                      <div className="text-green-600">
                        ✓ Valid QR code - ready to create item
                      </div>
                    )
                  ) : (
                    <div className="text-destructive flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      QR code not found in system
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Edit Modal */}
      <ItemEditModal
        open={showItemEdit}
        onOpenChange={setShowItemEdit}
        qrCode={validQRCode || ''}
        onSave={handleItemSaved}
      />
    </>
  );
};
