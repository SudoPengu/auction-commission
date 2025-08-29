
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, ScanLine, TestTube } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { QRScannerModal } from '@/components/QRScannerModal';
import { GenerateLabelsModal } from '@/components/GenerateLabelsModal';
import { QRWorkflowTest } from '@/components/QRWorkflowTest';
import POS from './POS';

const QRScanner: React.FC = () => {
  const { profile } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  
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
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>QR Code Scanning</CardTitle>
            <CardDescription>
              Scan QR codes to create and manage inventory items
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center space-y-4 h-40">
              <QrCode className="h-16 w-16 text-primary" />
              <Button onClick={() => setShowScanner(true)} size="lg">
                <ScanLine className="w-5 h-5 mr-2" />
                Start Scanning
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>QR Label Generation</CardTitle>
            <CardDescription>
              Generate QR labels for bulk inventory processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center space-y-4 h-40">
              <QrCode className="h-16 w-16 text-secondary" />
              <Button onClick={() => setShowGenerator(true)} variant="outline" size="lg">
                Generate Labels
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Smoke Test Component */}
      <div className="mt-8">
        <QRWorkflowTest />
      </div>
      
      {/* Modals */}
      <QRScannerModal
        open={showScanner}
        onOpenChange={setShowScanner}
        onScanComplete={() => {
          // Could refresh some data here
        }}
      />
      
      <GenerateLabelsModal
        open={showGenerator}
        onOpenChange={setShowGenerator}
        onComplete={() => {
          // Could refresh some data here
        }}
      />
    </div>
  );
};

export default QRScanner;
