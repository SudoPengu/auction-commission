
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InventoryGrid } from '@/components/inventory/InventoryGrid';
import { InventoryFilters } from '@/components/inventory/InventoryFilters';
import { GenerateLabelsModal } from '@/components/GenerateLabelsModal';
import { QRScannerModal } from '@/components/QRScannerModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, QrCode, Tags, Plus, ScanLine } from 'lucide-react';

const Inventory = () => {
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    condition: '',
    storageExpiry: ''
  });

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

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

  const handleLabelsGenerated = () => {
    refetch();
  };

  const handleItemScanned = () => {
    refetch();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with QR Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <div className="flex gap-3">
          <Button onClick={() => setShowGenerateModal(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Generate QR Labels
          </Button>
          <Button onClick={() => setShowScannerModal(true)} variant="outline" className="flex items-center gap-2">
            <ScanLine className="w-4 h-4" />
            Scan QR Code
          </Button>
        </div>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Inventory Items
          </TabsTrigger>
          <TabsTrigger value="labels" className="flex items-center gap-2">
            <Tags className="w-4 h-4" />
            QR Management
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

        <TabsContent value="labels">
          <div className="text-center py-8">
            <QrCode className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">QR Label Management</h3>
            <p className="text-muted-foreground mb-6">
              Generate QR labels for bulk unloading and track their usage status.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => setShowGenerateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Generate New Labels
              </Button>
              <Button variant="outline" onClick={() => setShowScannerModal(true)}>
                <ScanLine className="w-4 h-4 mr-2" />
                Scan & Create Item
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <GenerateLabelsModal
        open={showGenerateModal}
        onOpenChange={setShowGenerateModal}
        onComplete={handleLabelsGenerated}
      />

      <QRScannerModal
        open={showScannerModal}
        onOpenChange={setShowScannerModal}
        onScanComplete={handleItemScanned}
      />
    </div>
  );
};

export default Inventory;
