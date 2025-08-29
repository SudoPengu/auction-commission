
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
      
      {/* Hero Section */}
      <Card className="relative overflow-hidden border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-cyan-950/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-xl">
              <Zap className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-100">QR Operations Center</h2>
              <p className="text-indigo-700 dark:text-indigo-300">Streamline your inventory workflow</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
            <Clock className="h-4 w-4" />
            <span>Average scan time: 2.3 seconds</span>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Camera className="h-5 w-5" />
                QR Code Scanning
              </CardTitle>
              <Badge variant="outline" className="text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800">
                Camera
              </Badge>
            </div>
            <CardDescription>
              Scan QR codes to create and manage inventory items instantly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center space-y-4 h-40">
              <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-2xl animate-fade-in">
                <QrCode className="h-16 w-16 text-blue-600 dark:text-blue-300" />
              </div>
              <Button onClick={() => setShowScanner(true)} size="lg" className="hover-scale">
                <ScanLine className="w-5 h-5 mr-2 animate-pulse" />
                Start Scanning
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <FileText className="h-5 w-5" />
                QR Label Generation
              </CardTitle>
              <Badge variant="outline" className="text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800">
                Bulk
              </Badge>
            </div>
            <CardDescription>
              Generate QR labels for bulk inventory processing and organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center space-y-4 h-40">
              <div className="p-4 bg-amber-100 dark:bg-amber-900 rounded-2xl animate-fade-in">
                <QrCode className="h-16 w-16 text-amber-600 dark:text-amber-300" />
              </div>
              <Button onClick={() => setShowGenerator(true)} variant="outline" size="lg" className="hover-scale border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950">
                Generate Labels
              </Button>
            </div>
          </CardContent>
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
