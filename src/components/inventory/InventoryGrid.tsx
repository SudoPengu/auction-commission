
import React from 'react';
import { InventoryItemCard } from './InventoryItemCard';
import { Skeleton } from '@/components/ui/skeleton';

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

interface InventoryGridProps {
  items: InventoryItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const InventoryGrid: React.FC<InventoryGridProps> = ({ 
  items, 
  isLoading, 
  onRefresh 
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <Skeleton className="h-48 w-full mb-4" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-lg font-semibold mb-2">No items found</h3>
        <p className="text-muted-foreground mb-4">
          Try adjusting your search or filters, or generate some labels to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <InventoryItemCard 
          key={item.id} 
          item={item} 
          onUpdate={onRefresh}
        />
      ))}
    </div>
  );
};
