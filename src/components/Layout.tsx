
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { toast } from "@/components/ui/use-toast";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    console.log("Layout mounted, auth state:", { isAuthenticated, profileRole: profile?.role, currentPath: location.pathname });
    
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      console.log("Not authenticated in Layout, redirecting to login");
      navigate('/login');
      return;
    }
    
    // Show welcome toast when authenticated and not on login page
    if (isAuthenticated && location.pathname !== '/login') {
      toast({
        title: "Welcome back!",
        description: `Logged in as ${profile?.full_name || 'User'}`,
      });
    }
  }, [isAuthenticated, profile, navigate, location.pathname]);
  
  const toggleSidebar = () => {
    console.log("Toggling sidebar, current state:", sidebarOpen);
    setSidebarOpen(!sidebarOpen);
  };

  // If not authenticated, don't render anything (redirect will happen in useEffect)
  if (!isAuthenticated) {
    console.log("Not rendering Layout because user is not authenticated");
    return null;
  }

  console.log("Rendering Layout with sidebar and content, sidebar state:", sidebarOpen);
  
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
