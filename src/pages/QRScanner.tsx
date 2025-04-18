
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Upload, ScanLine } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import POS from './POS';

const QRScanner: React.FC = () => {
  const { profile } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  
  const startScanning = () => {
    setIsScanning(true);
    // This would be replaced with actual QR scanning implementation
    setTimeout(() => {
      setIsScanning(false);
    }, 3000);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">QR Scanner</h1>
        <div>
          <p className="text-sm text-muted-foreground">
            Logged in as: <span className="font-semibold">{profile?.full_name} ({profile?.role})</span>
          </p>
        </div>
      </div>
      
      {/* POS Floating Panel */}
      <POS />
      
      <Card>
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>
            Scan item QR codes or upload QR images to retrieve information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center space-y-4 h-60">
                  {isScanning ? (
                    <div className="flex flex-col items-center justify-center animate-pulse">
                      <ScanLine className="h-16 w-16 text-primary mb-4" />
                      <p>Scanning...</p>
                    </div>
                  ) : (
                    <>
                      <QrCode className="h-16 w-16 text-muted-foreground" />
                      <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">Use camera to scan QR code</p>
                        <Button onClick={startScanning}>Start Camera</Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center space-y-4 h-60">
                  <Upload className="h-16 w-16 text-muted-foreground" />
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Or upload a QR code image</p>
                    <Button variant="outline">Upload Image</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scan History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Recent scan history will appear here
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScanner;
