
import React from 'react';
import { NavItem as NavItemType } from '@/types/navigation';
import { useNavigation } from '@/hooks/useNavigation';

interface NavItemProps {
  item: NavItemType;
  onNavigate?: () => void;
}

const NavItem = ({ item, onNavigate }: NavItemProps) => {
  const { isPathActive, handleNavClick } = useNavigation();
  
  return (
    <li key={item.name}>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          if (handleNavClick(item.path)) {
            onNavigate?.();
          }
        }}
        className={`
          flex items-center px-3 py-2 rounded-md transition-colors cursor-pointer
          ${isPathActive(item.path) 
            ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          }
        `}
      >
        <item.icon className="w-5 h-5 mr-3" />
        <span>{item.name}</span>
      </a>
    </li>
  );
};

export default NavItem;
