
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { QrCode, ScanLine, Camera, FileText, Activity, Info, Zap, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { QRScannerModal } from '@/components/QRScannerModal';
import { GenerateLabelsModal } from '@/components/GenerateLabelsModal';

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
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card 
          className="relative overflow-hidden cursor-pointer group border-0 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
          onClick={() => setShowScanner(true)}
        >
          <div className="absolute inset-0 brand-blue-gradient opacity-80"></div>
          <div className="relative bg-background/95 backdrop-blur-sm m-1 rounded-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Camera className="h-5 w-5" />
                  QR Code Scanning
                </CardTitle>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  Camera
                </Badge>
              </div>
              <CardDescription>
                Scan QR codes to create and manage inventory items instantly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center space-y-4 h-40">
                <div className="p-4 bg-primary/10 rounded-2xl animate-fade-in group-hover:scale-110 transition-transform duration-300">
                  <QrCode className="h-16 w-16 text-primary" />
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <ScanLine className="w-5 h-5 animate-pulse" />
                    Start Scanning
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Click anywhere to begin</p>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
        
        <Card 
          className="relative overflow-hidden cursor-pointer group border-0 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
          onClick={() => setShowGenerator(true)}
        >
          <div className="absolute inset-0 sky-dawn-gradient opacity-80"></div>
          <div className="relative bg-background/95 backdrop-blur-sm m-1 rounded-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <FileText className="h-5 w-5" />
                  QR Label Generation
                </CardTitle>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  Bulk
                </Badge>
              </div>
              <CardDescription>
                Generate QR labels for bulk inventory processing and organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center space-y-4 h-40">
                <div className="p-4 bg-primary/10 rounded-2xl animate-fade-in group-hover:scale-110 transition-transform duration-300">
                  <QrCode className="h-16 w-16 text-primary" />
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <FileText className="w-5 h-5" />
                    Generate Labels
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Click anywhere to begin</p>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>

      {/* Info Callout */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Pro Tip</p>
              <p className="text-sm text-muted-foreground">
                Use camera scanning for individual items and label generation for bulk processing. Both methods integrate seamlessly with your inventory system.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Color Legend */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Function Colors</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-500 rounded"></div>
              <span className="text-muted-foreground">QR Operations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-muted-foreground">Camera Scanning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded"></div>
              <span className="text-muted-foreground">Label Generation</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
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
