
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScanLine, Keyboard } from 'lucide-react';

interface QRScannerProps {
  onScan: (itemId: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [manualInput, setManualInput] = useState('');
  const [mode, setMode] = useState<'scan' | 'manual'>('manual');

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      setManualInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualSubmit();
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>QR Scanner</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={mode === 'scan' ? 'default' : 'outline'}
              onClick={() => setMode('scan')}
              className="flex-1"
            >
              <ScanLine className="w-4 h-4 mr-2" />
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

          {mode === 'scan' && (
            <div className="text-center py-8">
              <ScanLine className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Camera scanning is not yet implemented in this demo.
              </p>
              <p className="text-sm text-muted-foreground">
                Use "Manual Entry" to input item IDs directly.
              </p>
            </div>
          )}

          {mode === 'manual' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="itemId">Item ID</Label>
                <Input
                  id="itemId"
                  placeholder="BX-20250829-0001"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the full item ID (e.g. BX-20250829-0001)
                </p>
              </div>
              <Button onClick={handleManualSubmit} className="w-full">
                Find Item
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
