
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { usePOSCart } from '@/contexts/POSCartContext';

const POSProductGrid = () => {
  const { addToCart } = usePOSCart();

  const mockProducts = Array.from({ length: 20 }, (_, i) => ({
    id: `product-${i + 1}`,
    name: `Product ${i + 1}`,
    price: (i + 1) * 100,
    category: ['clothing', 'electronics', 'home'][i % 3]
  }));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {mockProducts.map((product) => (
        <Card 
          key={product.id} 
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => addToCart(product)}
        >
          <CardContent className="p-3 text-center">
            <div className="w-full aspect-square bg-muted rounded-md mb-2 flex items-center justify-center text-muted-foreground text-xs">
              {product.name}
            </div>
            <p className="font-medium truncate text-sm">{product.name}</p>
            <p className="text-sm text-muted-foreground">₱{product.price.toFixed(2)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default POSProductGrid;
