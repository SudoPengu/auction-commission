
import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePOSUI } from '@/contexts/POSUIContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

const POSHandle: React.FC = () => {
  const { isOpen, toggleOpen } = usePOSUI();
  const { profile } = useAuth();
  const location = useLocation();

  // All hooks are called first, then we do conditional rendering
  if (profile?.role === 'bidder' || isOpen || location.pathname === '/pos') {
    return null;
  }

  return (
    <Button
      onClick={toggleOpen}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-40 rounded-l-lg rounded-r-none h-16 w-12 bg-primary hover:bg-primary/90 shadow-lg border-l border-t border-b border-r-0"
      variant="default"
    >
      <ShoppingCart className="h-5 w-5" />
    </Button>
  );
};

export default POSHandle;
