
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InventoryGrid } from '@/components/inventory/InventoryGrid';
import { InventoryFilters } from '@/components/inventory/InventoryFilters';
import { BulkLabelGenerator } from '@/components/inventory/BulkLabelGenerator';
import { QRScanner } from '@/components/inventory/QRScanner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, QrCode, Tags } from 'lucide-react';

const Inventory = () => {
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    condition: '',
    storageExpiry: ''
  });

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('name')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesStatus = !filters.status || item.status === filters.status;
      const matchesCondition = !filters.condition || item.condition === filters.condition;
      const matchesCategory = !filters.category || item.category_name === filters.category;
      
      let matchesStorageExpiry = true;
      if (filters.storageExpiry === 'expired') {
        matchesStorageExpiry = item.storage_expires_at && new Date(item.storage_expires_at) < new Date();
      } else if (filters.storageExpiry === 'expiring_soon') {
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        matchesStorageExpiry = item.storage_expires_at && 
          new Date(item.storage_expires_at) >= now && 
          new Date(item.storage_expires_at) <= threeDaysFromNow;
      }

      return matchesStatus && matchesCondition && matchesCategory && matchesStorageExpiry;
    });
  }, [items, filters]);

  const handleQRScan = (itemId: string) => {
    // Handle QR scan - for now just refetch the data
    refetch();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="scanner" className="flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            QR Scanner
          </TabsTrigger>
          <TabsTrigger value="labels" className="flex items-center gap-2">
            <Tags className="w-4 h-4" />
            Label Generator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          <InventoryFilters
            filters={filters}
            onFiltersChange={setFilters}
            categories={categories}
          />
          
          <InventoryGrid 
            items={filteredItems}
            isLoading={isLoading}
            onRefresh={refetch}
          />
        </TabsContent>

        <TabsContent value="scanner">
          <QRScanner onScan={handleQRScan} onClose={() => {}} />
        </TabsContent>

        <TabsContent value="labels">
          <BulkLabelGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Inventory;
