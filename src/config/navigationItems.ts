
import { 
  LayoutDashboard, 
  Package2, 
  Users, 
  BarChart3, 
  Settings,
  ShoppingCart,
  CalendarDays,
  UserCircle
} from 'lucide-react';
import { NavItem } from '@/types/navigation';

export const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
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
    name: 'Live Auctions',
    icon: CalendarDays,
    path: '/auctions',
    roles: ['staff', 'admin', 'super-admin', 'auction-manager', 'bidder']
  },
  {
    name: 'My Bids',
    icon: BarChart3,
    path: '/my-bids',
    roles: ['bidder']
  },
  {
    name: 'Profile',
    icon: UserCircle,
    path: '/profile',
    roles: ['staff', 'admin', 'super-admin', 'auction-manager', 'bidder']
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
