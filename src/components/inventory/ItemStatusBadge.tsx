
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock, Gavel, ShoppingCart, Clock, Package } from 'lucide-react';

interface ItemStatusBadgeProps {
  status: 'pending_auction' | 'auctioned_sold' | 'auctioned_unsold' | 'walk_in_available' | 'locked';
}

export const ItemStatusBadge: React.FC<ItemStatusBadgeProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'locked':
        return {
          icon: <Lock className="w-3 h-3" />,
          label: 'Locked',
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
      case 'pending_auction':
        return {
          icon: <Gavel className="w-3 h-3" />,
          label: 'Auction',
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'auctioned_sold':
        return {
          icon: <Package className="w-3 h-3" />,
          label: 'Sold',
          variant: 'secondary' as const,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'auctioned_unsold':
        return {
          icon: <Clock className="w-3 h-3" />,
          label: 'Unsold',
          variant: 'secondary' as const,
          className: 'bg-orange-100 text-orange-800 border-orange-200'
        };
      case 'walk_in_available':
        return {
          icon: <ShoppingCart className="w-3 h-3" />,
          label: 'Walk-in',
          variant: 'secondary' as const,
          className: 'bg-purple-100 text-purple-800 border-purple-200'
        };
      default:
        return {
          icon: <Package className="w-3 h-3" />,
          label: status,
          variant: 'outline' as const,
          className: ''
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className}`}>
      {config.icon}
      <span className="text-xs">{config.label}</span>
    </Badge>
  );
};
