
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NavItem } from '@/types/navigation';

export const useNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const isPathActive = (path: string) => {
    if (location.pathname === path) return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleNavClick = (path: string) => {
    console.log(`Navigating to ${path}`);
    
    if (path === '/pos' && location.pathname === '/dashboard') {
      console.log("POS button clicked while on dashboard - focusing POS panel");
      const event = new CustomEvent('focus-pos-panel');
      window.dispatchEvent(event);
    } else {
      navigate(path);
    }
    
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      return true; // Signal to close sidebar
    }
    return false;
  };

  return {
    isPathActive,
    handleNavClick,
    profile
  };
};
