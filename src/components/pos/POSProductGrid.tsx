
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const POSProductGrid = () => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="cursor-pointer hover:border-primary transition-colors">
          <CardContent className="p-3 text-center">
            <div className="w-full aspect-square bg-muted rounded-md mb-2 flex items-center justify-center text-muted-foreground">
              Item {i + 1}
            </div>
            <p className="font-medium truncate">Product {i + 1}</p>
            <p className="text-sm text-muted-foreground">₱{((i + 1) * 100).toFixed(2)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default POSProductGrid;
