
import { LucideIcon } from 'lucide-react';
import { UserRole } from './auth';

export interface NavItem {
  name: string;
  icon: LucideIcon;
  path: string;
  roles: UserRole[];
}

export interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}
