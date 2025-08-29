
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLabelGenerator } from '@/hooks/useLabelGenerator';
import { Download, Package, RefreshCw, AlertTriangle } from 'lucide-react';

interface GenerateLabelsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export const GenerateLabelsModal: React.FC<GenerateLabelsModalProps> = ({
  open,
  onOpenChange,
  onComplete
}) => {
  const [count, setCount] = useState(10);
  const [branch, setBranch] = useState('Main Branch');
  const {
    isGenerating,
    progress,
    generatedCodes,
    reserveLabelsAndUploadQRs,
    retryFailedCodes,
    reset
  } = useLabelGenerator();

  const handleGenerate = async () => {
    if (count < 1 || count > 500) return;
    
    try {
      await reserveLabelsAndUploadQRs(count, branch);
      onComplete();
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  const handleRetry = async () => {
    if (progress?.failed) {
      await retryFailedCodes(progress.failed);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      reset();
      onOpenChange(false);
    }
  };

  const downloadQRsAsHTML = () => {
    if (generatedCodes.length === 0) return;

    const qrCodes = generatedCodes.map(code => {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}`;
      return `
        <div style="
          display: inline-block; 
          margin: 10px; 
          padding: 15px; 
          border: 2px solid #333; 
          text-align: center;
          page-break-inside: avoid;
          width: 250px;
        ">
          <img src="${qrUrl}" alt="${code}" style="display: block; margin: 0 auto;" />
          <div style="font-family: 'Courier New', monospace; font-weight: bold; margin-top: 10px; font-size: 14px;">${code}</div>
          <div style="font-size: 12px; color: #666; margin-top: 5px;">BlueSky Auction House</div>
        </div>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>BlueSky QR Labels - ${branch}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .container { display: flex; flex-wrap: wrap; justify-content: center; }
            @media print {
              body { margin: 0; }
              .container { display: block; }
            }
          </style>
        </head>
        <body>
          <h1>BlueSky QR Labels - ${branch}</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p>Total Labels: ${generatedCodes.length}</p>
          <div class="container">
            ${qrCodes}
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bluesky-qr-labels-${branch.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Generate QR Labels
          </DialogTitle>
          <DialogDescription>
            Generate QR codes for inventory items. Labels should be printed and attached during unloading.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!isGenerating && !progress && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="count">Number of Labels</Label>
                <Input
                  id="count"
                  type="number"
                  min="1"
                  max="500"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum 500 labels per batch
                </p>
              </div>
              <div>
                <Label htmlFor="branch">Branch Tag</Label>
                <Input
                  id="branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used to organize inventory by location
                </p>
              </div>
            </div>
          )}

          {/* Generation Progress */}
          {(isGenerating || progress) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isGenerating ? 'Generating QR Labels...' : 'Generation Complete'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {progress && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{progress.completed} / {progress.total}</span>
                      </div>
                      <Progress value={(progress.completed / progress.total) * 100} />
                      {progress.currentCode && (
                        <p className="text-xs text-muted-foreground">
                          Currently processing: {progress.currentCode}
                        </p>
                      )}
                    </div>

                    {progress.failed.length > 0 && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-2">
                          <AlertTriangle className="w-4 h-4" />
                          {progress.failed.length} Failed
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Failed codes: {progress.failed.join(', ')}
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleRetry}
                          disabled={isGenerating}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Retry Failed
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Success Results */}
          {generatedCodes.length > 0 && !isGenerating && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generated Labels ({generatedCodes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                    {generatedCodes.slice(0, 20).map(code => (
                      <div 
                        key={code} 
                        className="text-sm font-mono bg-muted p-2 rounded text-center"
                      >
                        {code}
                      </div>
                    ))}
                    {generatedCodes.length > 20 && (
                      <div className="text-sm text-muted-foreground p-2 text-center col-span-full">
                        ... and {generatedCodes.length - 20} more
                      </div>
                    )}
                  </div>
                  <Button onClick={downloadQRsAsHTML} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download Printable Labels
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    💡 Print these labels before shipment arrives, then attach during unloading. 
                    Complete item details (photo, name, category) later when scanning.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
              {generatedCodes.length > 0 ? 'Close' : 'Cancel'}
            </Button>
            {!progress && (
              <Button onClick={handleGenerate} disabled={isGenerating || count < 1 || count > 500}>
                Generate {count} Labels
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
