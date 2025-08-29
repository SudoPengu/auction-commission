
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { inventoryService, ItemCreateData } from '@/services/inventoryService';
import { Package, Save, Loader2 } from 'lucide-react';

interface ItemEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCode: string;
  onSave: () => void;
}

export const ItemEditModal: React.FC<ItemEditModalProps> = ({
  open,
  onOpenChange,
  qrCode,
  onSave
}) => {
  const [formData, setFormData] = useState<ItemCreateData>({
    name: '',
    category_name: '',
    condition: 'used_good',
    quantity: 1,
    starting_bid_price: 0,
    expected_sale_price: 0,
    branch_tag: 'Main Branch'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: keyof ItemCreateData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Item name is required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await inventoryService.claimQRAndCreateItem(qrCode, formData);
      
      if (result.success) {
        toast({
          title: "Item Created",
          description: `${formData.name} has been added to inventory`,
        });
        onSave();
        onOpenChange(false);
        // Reset form
        setFormData({
          name: '',
          category_name: '',
          condition: 'used_good',
          quantity: 1,
          starting_bid_price: 0,
          expected_sale_price: 0,
          branch_tag: 'Main Branch'
        });
      } else {
        toast({
          title: "Save Failed",
          description: result.error || "Failed to create item",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Save failed:', error);
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const conditions = [
    { value: 'brand_new', label: 'Brand New' },
    { value: 'like_new', label: 'Like New' },
    { value: 'used_good', label: 'Used - Good' },
    { value: 'used_fair', label: 'Used - Fair' },
    { value: 'damaged', label: 'Damaged' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Create Inventory Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-3 rounded">
            <p className="text-sm font-medium">QR Code: <span className="font-mono">{qrCode}</span></p>
            <p className="text-xs text-muted-foreground">This will be the item ID</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter item name"
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category_name}
                onChange={(e) => handleInputChange('category_name', e.target.value)}
                placeholder="e.g., Electronics, Furniture, Books"
              />
            </div>

            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select 
                value={formData.condition} 
                onValueChange={(value) => handleInputChange('condition', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map((condition) => (
                    <SelectItem key={condition.value} value={condition.value}>
                      {condition.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  value={formData.branch_tag}
                  onChange={(e) => handleInputChange('branch_tag', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startingBid">Starting Bid (₱)</Label>
                <Input
                  id="startingBid"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.starting_bid_price}
                  onChange={(e) => handleInputChange('starting_bid_price', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="expectedPrice">Expected Price (₱)</Label>
                <Input
                  id="expectedPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.expected_sale_price}
                  onChange={(e) => handleInputChange('expected_sale_price', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Item
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
