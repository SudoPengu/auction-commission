import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { usePOSUI } from '@/contexts/POSUIContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import POSContent from './POSContent';

const POSFlyout: React.FC = () => {
  const { isOpen, setIsOpen } = usePOSUI();
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [panelSize, setPanelSize] = useState(35);

  // Don't show for bidders
  if (profile?.role === 'bidder') {
    return null;
  }

  // Don't show on POS page itself
  if (location.pathname === '/pos') {
    return null;
  }

  // Auto-navigate to full page if panel is resized to near full width
  useEffect(() => {
    if (panelSize > 70 && isOpen) {
      setIsOpen(false);
      navigate('/pos');
    }
  }, [panelSize, isOpen, setIsOpen, navigate]);

  const handleClose = () => {
    setIsOpen(false);
  };

  // Mobile version using Drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>POS</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">
            <POSContent onCollapse={handleClose} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop version using ResizablePanel
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-30 pointer-events-none">
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={handleClose} />
      <div className="absolute inset-0 pointer-events-auto">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel
            defaultSize={100 - panelSize}
            minSize={15}
            maxSize={75}
            className="pointer-events-none"
          />
          <ResizableHandle withHandle className="w-2 bg-border hover:bg-primary/20 transition-colors" />
          <ResizablePanel
            defaultSize={panelSize}
            minSize={25}
            maxSize={85}
            onResize={setPanelSize}
            className="bg-background border-l shadow-2xl"
          >
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-lg font-bold">POS</h2>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <POSContent onCollapse={handleClose} />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default POSFlyout;