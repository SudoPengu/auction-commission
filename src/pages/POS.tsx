
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Minus, Trash2, QrCode, Search, ChevronRight, ChevronLeft } from 'lucide-react';

const POS: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`fixed top-16 right-0 bottom-0 z-30 transition-all duration-300 ease-in-out bg-background border-l border-border shadow-lg ${isCollapsed ? 'w-12' : 'w-[450px]'}`}>
      {/* Collapse toggle button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute -left-10 top-1/2 transform -translate-y-1/2 bg-background border border-border shadow-md"
        onClick={toggleCollapse}
      >
        {isCollapsed ? <ChevronLeft /> : <ChevronRight />}
      </Button>

      {isCollapsed ? (
        // Collapsed View
        <div className="h-full flex flex-col items-center pt-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleCollapse}
            className="rotate-90 mb-4"
          >
            <span className="font-bold">POS</span>
          </Button>
        </div>
      ) : (
        // Expanded View
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-lg font-bold">Point of Sale</h2>
            <Button variant="ghost" size="icon" onClick={toggleCollapse}>
              <ChevronRight />
            </Button>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              {/* Search */}
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
              
              {/* Product Categories */}
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="clothing">Clothing</TabsTrigger>
                  <TabsTrigger value="electronics">Electronics</TabsTrigger>
                  <TabsTrigger value="home">Home</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-4">
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
                </TabsContent>
                <TabsContent value="clothing" className="mt-4">
                  <div className="text-center p-4 text-muted-foreground">
                    Clothing items would appear here
                  </div>
                </TabsContent>
                <TabsContent value="electronics" className="mt-4">
                  <div className="text-center p-4 text-muted-foreground">
                    Electronics items would appear here
                  </div>
                </TabsContent>
                <TabsContent value="home" className="mt-4">
                  <div className="text-center p-4 text-muted-foreground">
                    Home items would appear here
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Cart */}
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
        </div>
      )}
    </div>
  );
};

export default POS;
