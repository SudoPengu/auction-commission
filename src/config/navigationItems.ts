
import { 
  Home, 
  Package2, 
  Users, 
  BarChart3, 
  User,
  ShoppingCart,
  UserCircle,
  Gavel,
  CreditCard
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
    name: 'Live Auctions',
    icon: Gavel,
    path: '/auctions',
    roles: ['staff', 'admin', 'super-admin', 'auction-manager', 'bidder']
  },
  {
    name: 'Inventory',
    icon: Package2,
    path: '/inventory',
    roles: ['staff', 'admin', 'super-admin']
  },
  {
    name: 'POS',
    icon: ShoppingCart,
    path: '/pos',
    roles: ['staff', 'admin', 'super-admin', 'auction-manager']
  },
  {
    name: 'Payments',
    icon: CreditCard,
    path: '/payments',
    roles: ['admin', 'super-admin']
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
    name: 'Profile',
    icon: User,
    path: '/profile',
    roles: ['admin', 'super-admin', 'staff', 'bidder']
  }
];
