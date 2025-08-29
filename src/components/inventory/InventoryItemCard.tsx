
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ItemStatusBadge } from './ItemStatusBadge';
import { ItemConditionBorder } from './ItemConditionBorder';
import { StorageCountdown } from './StorageCountdown';
import { ItemPhotoUpload } from './ItemPhotoUpload';
import { ItemDetailsEditor } from './ItemDetailsEditor';
import { QRCodeDisplay } from './QRCodeDisplay';
import { 
  Lock, 
  Unlock, 
  Edit, 
  Package, 
  Calendar,
  DollarSign
} from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string | null;
  category_name: string | null;
  condition: 'brand_new' | 'like_new' | 'used_good' | 'used_fair' | 'damaged';
  quantity: number;
  sold_quantity: number;
  starting_bid_price: number;
  expected_sale_price: number | null;
  final_sale_price: number | null;
  status: 'pending_auction' | 'auctioned_sold' | 'auctioned_unsold' | 'walk_in_available' | 'locked';
  photo_url: string | null;
  storage_expires_at: string | null;
  branch_tag: string;
  created_at: string;
  updated_at: string;
}

interface InventoryItemCardProps {
  item: InventoryItem;
  onUpdate: () => void;
}

export const InventoryItemCard: React.FC<InventoryItemCardProps> = ({ 
  item, 
  onUpdate 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      // First confirm QR (in real implementation, this would require actual QR scan)
      const { error: confirmError } = await supabase.rpc('inventory_confirm_qr', {
        p_item_id: item.id
      });

      if (confirmError) throw confirmError;

      // Then update status
      const { data, error } = await supabase.rpc('update_inventory_status', {
        p_item_id: item.id,
        p_new_status: newStatus
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Status Updated",
          description: `${item.id} moved to ${newStatus.replace('_', ' ')}`,
        });
        onUpdate();
      } else {
        throw new Error(data?.error || 'Failed to update status');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriceDisplay = () => {
    const startingBid = `₱${item.starting_bid_price.toLocaleString()}`;
    const expectedPrice = item.expected_sale_price 
      ? `₱${item.expected_sale_price.toLocaleString()}` 
      : 'TBD';
    const finalPrice = item.final_sale_price 
      ? `₱${item.final_sale_price.toLocaleString()}` 
      : null;

    return (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Starting:</span>
          <span className="font-medium text-blue-600">{startingBid}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Expected:</span>
          <span className="font-medium text-orange-600">{expectedPrice}</span>
        </div>
        {finalPrice && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Final:</span>
            <span className="font-bold text-green-600">{finalPrice}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="h-full">
      <ItemConditionBorder condition={item.condition}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <QRCodeDisplay itemId={item.id} size={40} />
              <h3 className="font-semibold text-sm mt-2">
                {item.name || 'Unnamed Item'}
              </h3>
              <p className="text-xs text-muted-foreground">{item.id}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <ItemStatusBadge status={item.status} />
            {item.category_name && (
              <Badge variant="outline" className="text-xs">
                {item.category_name}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Photo */}
          <ItemPhotoUpload 
            itemId={item.id}
            currentPhotoUrl={item.photo_url}
            onUpdate={onUpdate}
          />

          {/* Quantity */}
          <div className="flex items-center gap-2 mt-3 text-sm">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span>
              {item.quantity - item.sold_quantity} of {item.quantity} available
            </span>
          </div>

          {/* Pricing */}
          <div className="mt-3">
            {getPriceDisplay()}
          </div>

          {/* Storage Countdown */}
          {item.storage_expires_at && (
            <StorageCountdown 
              expiresAt={item.storage_expires_at}
              className="mt-3"
            />
          )}

          {/* Quick Actions */}
          <div className="mt-4 space-y-2">
            {item.status === 'locked' && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleStatusChange('walk_in_available')}
                disabled={isUpdating}
              >
                <Unlock className="w-4 h-4 mr-2" />
                Unlock for Walk-in
              </Button>
            )}
            
            {item.status === 'walk_in_available' && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleStatusChange('locked')}
                disabled={isUpdating}
              >
                <Lock className="w-4 h-4 mr-2" />
                Lock Item
              </Button>
            )}

            {item.status === 'auctioned_unsold' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleStatusChange('walk_in_available')}
                  disabled={isUpdating}
                >
                  Move to Walk-in
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleStatusChange('pending_auction')}
                  disabled={isUpdating}
                >
                  Re-auction
                </Button>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
            <div>Branch: {item.branch_tag}</div>
            <div>Added: {new Date(item.created_at).toLocaleDateString()}</div>
          </div>
        </CardContent>
      </ItemConditionBorder>

      {/* Edit Modal */}
      {isEditing && (
        <ItemDetailsEditor
          item={item}
          onSave={onUpdate}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </Card>
  );
};
