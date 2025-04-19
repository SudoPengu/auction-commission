
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Minus, Trash2 } from 'lucide-react';

const POSCart = () => {
  return (
    <div className="border-t p-4">
      <Card className="shadow-none border-none">
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-base">Current Sale</CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          <div className="max-h-[200px] overflow-auto">
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
                <TableRow>
                  <TableCell>Product 1</TableCell>
                  <TableCell className="text-right">₱100.00</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center space-x-1">
                      <Button variant="outline" size="icon" className="h-6 w-6">
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span>1</span>
                      <Button variant="outline" size="icon" className="h-6 w-6">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">₱100.00</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Product 2</TableCell>
                  <TableCell className="text-right">₱200.00</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center space-x-1">
                      <Button variant="outline" size="icon" className="h-6 w-6">
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span>2</span>
                      <Button variant="outline" size="icon" className="h-6 w-6">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">₱400.00</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₱500.00</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (12%)</span>
              <span>₱60.00</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>₱560.00</span>
            </div>
          </div>
          
          <div className="space-y-2 pt-2">
            <Button className="w-full">Process Payment</Button>
            <Button variant="outline" className="w-full">Cancel Sale</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default POSCart;
