
import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { usePOSCart } from '@/contexts/POSCartContext';

const POSCart = () => {
  const { items, updateQuantity, removeFromCart, clearCart, subtotal, tax, total, processPayment } = usePOSCart();

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No items in cart</p>
        <p className="text-sm">Add products to start a sale</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-h-[300px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-right">₱{item.price.toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-center space-x-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right">₱{(item.price * item.quantity).toFixed(2)}</TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₱{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax (12%)</span>
          <span>₱{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>₱{total.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="space-y-2 pt-2">
        <Button className="w-full" onClick={processPayment}>
          Process Payment
        </Button>
        <Button variant="outline" className="w-full" onClick={clearCart}>
          Clear Cart
        </Button>
      </div>
    </div>
  );
};

export default POSCart;
