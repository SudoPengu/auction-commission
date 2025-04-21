import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package2, 
  Users, 
  BarChart3, 
  Settings, 
  Menu, 
  X, 
  LogOut,
  ShoppingCart,
  QrCode,
  CalendarDays,
  UserCircle
} from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from "@/components/ui/use-toast";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  
  console.log("Sidebar rendering, current path:", location.pathname);
  console.log("Sidebar state:", { isOpen, profile });
  
  // Define navigation items based on user role
  const navItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      roles: ['staff', 'admin', 'super-admin', 'auction-manager']
    },
    {
      name: 'POS',
      icon: ShoppingCart,
      path: '/pos',
      roles: ['staff', 'admin', 'super-admin', 'auction-manager']
    },
    {
      name: 'QR Scanner',
      icon: QrCode,
      path: '/qr-scanner',
      roles: ['staff', 'admin', 'super-admin', 'auction-manager']
    },
    {
      name: 'Auction Events',
      icon: CalendarDays,
      path: '/auction-events',
      roles: ['staff', 'admin', 'super-admin', 'auction-manager']
    },
    {
      name: 'Bidder Profiles',
      icon: UserCircle,
      path: '/bidder-profiles',
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
      roles: ['admin', 'super-admin']
    },
    {
      name: 'Settings',
      icon: Settings,
      path: '/settings',
      roles: ['admin', 'super-admin']
    }
  ];

  // Filter items based on user role - only show items the user has access to
  const filteredNavItems = profile 
    ? navItems.filter(item => item.roles.includes(profile.role))
    : [];

  // Helper function to check if a path is active (including partial matches)
  const isPathActive = (path: string) => {
    // Exact match
    if (location.pathname === path) return true;
    
    // Check if current path starts with the nav item path (for nested routes)
    // Only apply this logic for non-root paths to avoid matching everything
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    
    return false;
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out. Please try again."
      });
    }
  };

  // Special handling for POS - to focus the floating POS panel when clicked
  const handleNavClick = (path: string) => {
    console.log(`Navigating to ${path}`);
    
    if (path === '/pos' && location.pathname === '/dashboard') {
      // Just toggle the POS focus state without navigating, since POS is already visible on dashboard
      // We'll implement the actual focus functionality next
      console.log("POS button clicked while on dashboard - focusing POS panel");
      const event = new CustomEvent('focus-pos-panel');
      window.dispatchEvent(event);
    } else {
      // Normal navigation for other routes
      navigate(path);
    }
    
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
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
        <div className="py-4 px-3 flex flex-col h-[calc(100%-4rem)]">
          <ul className="space-y-2 flex-1">
            {filteredNavItems.map((item) => (
              <li key={item.name}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.path);
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
            ))}
          </ul>
          
          {/* Logout button at the bottom */}
          <div className="mt-auto pt-4 border-t border-sidebar-border">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 rounded-md transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
