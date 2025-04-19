
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Search, QrCode } from 'lucide-react';
import { Input } from '@/components/ui/input';
import POSProductGrid from './POSProductGrid';
import POSCart from './POSCart';
import POSCategoryTabs from './POSCategoryTabs';

interface POSContentProps {
  onCollapse: () => void;
}

const POSContent: React.FC<POSContentProps> = ({ onCollapse }) => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-bold">Point of Sale</h2>
        <Button variant="ghost" size="icon" onClick={onCollapse} className="md:hidden">
          <ChevronRight />
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search for products..." className="pl-8" />
            </div>
            <Button variant="outline">
              <QrCode className="h-4 w-4 mr-2" />
              Scan
            </Button>
          </div>
          
          <POSCategoryTabs />
          <POSProductGrid />
        </div>
      </div>

      <POSCart />
    </div>
  );
};

export default POSContent;
