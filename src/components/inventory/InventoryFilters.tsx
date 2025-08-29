
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Filter } from 'lucide-react';

interface InventoryFiltersProps {
  filters: {
    status: string;
    category: string;
    condition: string;
    storageExpiry: string;
  };
  onFiltersChange: (filters: any) => void;
  categories: Array<{ name: string }>;
}

export const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  filters,
  onFiltersChange,
  categories
}) => {
  const updateFilter = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilter = (key: string) => {
    onFiltersChange({ ...filters, [key]: '' });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      status: '',
      category: '',
      condition: '',
      storageExpiry: ''
    });
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending_auction">Pending Auction</SelectItem>
            <SelectItem value="auctioned_sold">Auctioned - Sold</SelectItem>
            <SelectItem value="auctioned_unsold">Auctioned - Unsold</SelectItem>
            <SelectItem value="walk_in_available">Walk-in Available</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.name} value={cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.condition} onValueChange={(value) => updateFilter('condition', value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="brand_new">🟢 Brand New</SelectItem>
            <SelectItem value="like_new">🟡 Like New</SelectItem>
            <SelectItem value="used_good">🟠 Used - Good</SelectItem>
            <SelectItem value="used_fair">🔴 Used - Fair</SelectItem>
            <SelectItem value="damaged">⚫ Damaged</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.storageExpiry} onValueChange={(value) => updateFilter('storageExpiry', value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Storage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
          </SelectContent>
        </Select>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="w-4 h-4 mr-1" />
            Clear ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.status && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {filters.status.replace('_', ' ')}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => clearFilter('status')}
              />
            </Badge>
          )}
          {filters.category && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Category: {filters.category}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => clearFilter('category')}
              />
            </Badge>
          )}
          {filters.condition && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Condition: {filters.condition.replace('_', ' ')}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => clearFilter('condition')}
              />
            </Badge>
          )}
          {filters.storageExpiry && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Storage: {filters.storageExpiry.replace('_', ' ')}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => clearFilter('storageExpiry')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
