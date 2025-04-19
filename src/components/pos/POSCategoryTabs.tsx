
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const POSCategoryTabs = () => {
  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="grid grid-cols-4">
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="clothing">Clothing</TabsTrigger>
        <TabsTrigger value="electronics">Electronics</TabsTrigger>
        <TabsTrigger value="home">Home</TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="mt-4">
        {/* Product grid is rendered separately */}
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
  );
};

export default POSCategoryTabs;
