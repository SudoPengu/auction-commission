
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { InventoryGrid } from '@/components/inventory/InventoryGrid';
import { InventoryFilters } from '@/components/inventory/InventoryFilters';
import { BulkLabelGenerator } from '@/components/inventory/BulkLabelGenerator';
import { QRScanner } from '@/components/inventory/QRScanner';
import { Plus, Search, ScanLine, Package, Filter } from 'lucide-react';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    condition: '',
    storageExpiry: ''
  });
  const [showScanner, setShowScanner] = useState(false);
  const { toast } = useToast();

  // Fetch inventory items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory-items', searchTerm, filters],
    queryFn: async () => {
      let query = supabase
        .from('inventory_items')
        .select(`
          *,
          category_name,
          inventory_categories!inventory_items_category_name_fkey(name)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.category) {
        query = query.eq('category_name', filters.category);
      }
      if (filters.condition) {
        query = query.eq('condition', filters.condition);
      }
      if (filters.storageExpiry === 'expired') {
        query = query.lt('storage_expires_at', new Date().toISOString());
      } else if (filters.storageExpiry === 'expiring_soon') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        query = query.lte('storage_expires_at', tomorrow.toISOString());
      }

      // Apply search
      if (searchTerm) {
        query = query.or(`id.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Fetch categories for filters
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

  const handleQRScan = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      toast({
        title: "Item Found",
        description: `${item.name || item.id} - ${item.status.replace('_', ' ')}`,
      });
      // Focus on the item in the grid (you can implement scrolling to item)
    } else {
      toast({
        title: "Item Not Found",
        description: `No item found with ID: ${itemId}`,
        variant: "destructive"
      });
    }
    setShowScanner(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">BlueSky Inventory</h1>
          <p className="text-muted-foreground">
            Japan-surplus auction inventory management
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowScanner(true)}
          >
            <ScanLine className="w-4 h-4 mr-2" />
            QR Scan
          </Button>
        </div>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList>
          <TabsTrigger value="inventory">
            <Package className="w-4 h-4 mr-2" />
            Inventory ({items.length})
          </TabsTrigger>
          <TabsTrigger value="labels">
            <Plus className="w-4 h-4 mr-2" />
            Generate Labels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by Item ID or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <InventoryFilters
              filters={filters}
              onFiltersChange={setFilters}
              categories={categories}
            />
          </div>

          {/* Inventory Grid */}
          <InventoryGrid 
            items={items} 
            isLoading={isLoading}
            onRefresh={() => window.location.reload()}
          />
        </TabsContent>

        <TabsContent value="labels">
          <BulkLabelGenerator />
        </TabsContent>
      </Tabs>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
