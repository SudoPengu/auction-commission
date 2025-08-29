
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

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

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;
      const matchesCategory = categoryFilter === 'all' || item.category_name === categoryFilter;

      return matchesSearch && matchesStatus && matchesCondition && matchesCategory;
    });
  }, [items, searchTerm, statusFilter, conditionFilter, categoryFilter]);

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status as 'pending_auction' | 'auctioned_sold' | 'auctioned_unsold' | 'walk_in_available' | 'locked' | 'all');
  };

  const handleConditionFilter = (condition: string) => {
    setConditionFilter(condition as 'brand_new' | 'like_new' | 'used_good' | 'used_fair' | 'damaged' | 'all');
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
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusChange={handleStatusFilter}
            conditionFilter={conditionFilter}
            onConditionChange={handleConditionFilter}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            totalItems={items.length}
            filteredItems={filteredItems.length}
          />
          
          <InventoryGrid 
            items={filteredItems}
            isLoading={isLoading}
            onRefresh={refetch}
          />
        </TabsContent>

        <TabsContent value="scanner">
          <QRScanner onScan={refetch} />
        </TabsContent>

        <TabsContent value="labels">
          <BulkLabelGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Inventory;
