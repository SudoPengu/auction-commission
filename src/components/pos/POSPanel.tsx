
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import POSContent from './POSContent';

const POSPanel = () => {
  const { profile } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isFloating, setIsFloating] = useState(true); // New state for floating mode
  const isMobile = useIsMobile();

  // CRITICAL: Never show POS for bidders
  if (profile?.role === 'bidder') {
    return null;
  }

  useEffect(() => {
    const handleFocusEvent = () => {
      console.log("POS focus event received");
      setIsCollapsed(false);
      setIsFocused(true);
      setTimeout(() => setIsFocused(false), 800);
    };

    window.addEventListener('focus-pos-panel', handleFocusEvent);
    return () => {
      window.removeEventListener('focus-pos-panel', handleFocusEvent);
    };
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div 
      className={`fixed transition-all duration-300 ease-in-out bg-background border-l border-border shadow-lg
        ${isCollapsed ? 'w-12' : (isMobile ? 'w-full sm:w-[350px]' : 'w-[450px]')}
        ${isFocused ? 'ring-2 ring-primary ring-opacity-70' : ''}
        ${isFloating ? 'top-16 right-0 bottom-0 z-30' : 'relative w-full h-full'}`}
    >
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute -left-10 top-1/2 transform -translate-y-1/2 bg-background border border-border shadow-md hidden md:flex"
        onClick={toggleCollapse}
      >
        {isCollapsed ? <ChevronLeft /> : <ChevronRight />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-4 md:hidden"
        onClick={() => setIsCollapsed(true)}
      >
        <ChevronRight />
      </Button>

      {isCollapsed ? (
        <div 
          className="h-full flex flex-col items-center pt-4 cursor-pointer"
          onClick={toggleCollapse}
        >
          <div className="rotate-0 mb-4 w-full text-center">
            <span className="font-bold text-xs writing-mode-vertical">POS</span>
          </div>
        </div>
      ) : (
        <POSContent onCollapse={toggleCollapse} />
      )}
    </div>
  );
};

export default POSPanel;
