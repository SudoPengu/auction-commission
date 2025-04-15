
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package2, Users, BarChart3, Settings, Menu, X } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const { profile } = useAuth();
  
  // Define navigation items based on user role
  const navItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
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

  // Filter items based on user role
  const filteredNavItems = navItems.filter(item => 
    profile && item.roles.includes(profile.role)
  );

  // Helper function to check if a path is active (including partial matches)
  const isPathActive = (path: string) => {
    // Exact match
    if (location.pathname === path) return true;
    
    // Check if current path starts with the nav item path (for nested routes)
    // Only apply this logic for non-root paths to avoid matching everything
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    
    return false;
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-0
      `}>
        {/* Sidebar header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-sidebar-border">
          <Logo />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:hidden"
          >
            <X size={20} />
          </Button>
        </div>
        
        {/* Sidebar content */}
        <div className="py-4 px-3">
          <ul className="space-y-2">
            {filteredNavItems.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={`
                    flex items-center px-3 py-2 rounded-md transition-colors
                    ${isPathActive(item.path) 
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
