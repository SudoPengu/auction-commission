
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from "@/components/ui/use-toast";
import { SidebarProps } from '@/types/navigation';
import { navigationItems } from '@/config/navigationItems';
import NavItem from './navigation/NavItem';

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  
  console.log("Sidebar state:", { isOpen, profile });
  
  // Filter items based on user role
  const filteredNavItems = profile 
    ? navigationItems.filter(item => item.roles.includes(profile.role))
    : navigationItems.filter(item => item.roles.includes('super-admin'));

  const handleLogout = async () => {
    try {
      await logout();
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
              <NavItem 
                key={item.name} 
                item={item} 
                onNavigate={toggleSidebar}
              />
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
