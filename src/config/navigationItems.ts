
import { 
  Home, 
  Package2, 
  Users, 
  BarChart3, 
  Settings,
  ShoppingCart,
  UserCircle
} from 'lucide-react';
import { NavItem } from '@/types/navigation';

export const navigationItems: NavItem[] = [
  {
    name: 'Home',
    icon: Home,
    path: '/dashboard',
    roles: ['staff', 'admin', 'super-admin', 'auction-manager', 'bidder']
  },
  {
    name: 'POS',
    icon: ShoppingCart,
    path: '/pos',
    roles: ['staff', 'admin', 'super-admin', 'auction-manager']
  },
  {
    name: 'My Bids',
    icon: BarChart3,
    path: '/my-bids',
    roles: ['bidder']
  },
  {
    name: 'Bidder Profiles',
    icon: UserCircle,
    path: '/bidders',
    roles: ['staff', 'admin', 'super-admin', 'auction-manager']
  },
  {
    name: 'Inventory',
    icon: Package2,
    path: '/inventory',
    roles: ['admin', 'super-admin']
  },
  {
    name: 'Analytics',
    icon: BarChart3,
    path: '/analytics',
    roles: ['admin', 'super-admin']
  },
  {
    name: 'Users',
    icon: Users,
    path: '/users',
    roles: ['super-admin']
  },
  {
    name: 'Settings',
    icon: Settings,
    path: '/settings',
    roles: ['admin', 'super-admin']
  }
];
