
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log("Layout mounted, auth state:", { isAuthenticated, profileRole: profile?.role });
    
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      console.log("Not authenticated in Layout, redirecting to login");
      navigate('/login');
    }
  }, [isAuthenticated, profile, navigate]);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // If not authenticated, don't render anything (redirect will happen in useEffect)
  if (!isAuthenticated) {
    return null;
  }

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
