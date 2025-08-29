
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface InventoryItem {
  id: string;
  name: string | null;
  category_name: string | null;
  condition: 'brand_new' | 'like_new' | 'used_good' | 'used_fair' | 'damaged';
  quantity: number;
  starting_bid_price: number;
  expected_sale_price: number | null;
  final_sale_price: number | null;
  status: string;
}

interface ItemDetailsEditorProps {
  item: InventoryItem;
  onSave: () => void;
  onCancel: () => void;
}

export const ItemDetailsEditor: React.FC<ItemDetailsEditorProps> = ({
  item,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: item.name || '',
    category_name: item.category_name || '',
    condition: item.condition,
    quantity: item.quantity,
    starting_bid_price: item.starting_bid_price,
    expected_sale_price: item.expected_sale_price || 0,
    final_sale_price: item.final_sale_price || 0
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Fetch categories for dropdown
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData: any = {
        name: formData.name || null,
        category_name: formData.category_name || null,
        condition: formData.condition,
        quantity: formData.quantity,
        starting_bid_price: formData.starting_bid_price,
        expected_sale_price: formData.expected_sale_price || null,
      };

      // Only update final_sale_price if item is sold
      if (item.status === 'auctioned_sold' && formData.final_sale_price > 0) {
        updateData.final_sale_price = formData.final_sale_price;
      }

      const { error } = await supabase
        .from('inventory_items')
        .update(updateData)
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Item Updated",
        description: `${item.id} has been updated successfully`,
      });

      onSave();
      onCancel();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-lg max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item Details - {item.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Item Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter item name"
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category_name} 
              onValueChange={(value) => setFormData({ ...formData, category_name: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.name} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="condition">Condition</Label>
            <Select 
              value={formData.condition} 
              onValueChange={(value) => setFormData({ ...formData, condition: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand_new">🟢 Brand New</SelectItem>
                <SelectItem value="like_new">🟡 Like New</SelectItem>
                <SelectItem value="used_good">🟠 Used - Good</SelectItem>
                <SelectItem value="used_fair">🔴 Used - Fair</SelectItem>
                <SelectItem value="damaged">⚫ Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="starting_bid">Starting Bid (₱)</Label>
              <Input
                id="starting_bid"
                type="number"
                min="0"
                step="0.01"
                value={formData.starting_bid_price}
                onChange={(e) => setFormData({ ...formData, starting_bid_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="expected_price">Expected Price (₱)</Label>
              <Input
                id="expected_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.expected_sale_price}
                onChange={(e) => setFormData({ ...formData, expected_sale_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {item.status === 'auctioned_sold' && (
            <div>
              <Label htmlFor="final_price">Final Sale Price (₱)</Label>
              <Input
                id="final_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.final_sale_price}
                onChange={(e) => setFormData({ ...formData, final_sale_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={onCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
