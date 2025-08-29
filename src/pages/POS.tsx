
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, QrCode } from 'lucide-react';
import POSProductGrid from '@/components/pos/POSProductGrid';
import POSCart from '@/components/pos/POSCart';
import POSCategoryTabs from '@/components/pos/POSCategoryTabs';
import { QRScannerModal } from '@/components/QRScannerModal';
import { POSCartProvider } from '@/contexts/POSCartContext';

const POS: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <POSCartProvider>
      <div className="h-full flex flex-col lg:flex-row gap-6 p-6">
        {/* Left Side - Products */}
        <div className="flex-1 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Point of Sale</h1>
          </div>
          
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search for products..." className="pl-8" />
            </div>
            <Button variant="outline" onClick={() => setShowScanner(true)}>
              <QrCode className="h-4 w-4 mr-2" />
              Scan
            </Button>
          </div>
          
          <POSCategoryTabs />
          <POSProductGrid />
        </div>

        {/* Right Side - Cart */}
        <div className="w-full lg:w-96">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Current Sale</CardTitle>
            </CardHeader>
            <CardContent>
              <POSCart />
            </CardContent>
          </Card>
        </div>

        {/* QR Scanner Modal */}
        <QRScannerModal
          open={showScanner}
          onOpenChange={setShowScanner}
          onScanComplete={() => {
            // Could add scanned item to cart here
          }}
        />
      </div>
    </POSCartProvider>
  );
};

export default POS;
