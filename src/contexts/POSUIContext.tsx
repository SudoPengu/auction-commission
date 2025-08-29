import React, { createContext, useContext, useState, ReactNode } from 'react';

interface POSUIContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
}

const POSUIContext = createContext<POSUIContextType | undefined>(undefined);

export const usePOSUI = () => {
  const context = useContext(POSUIContext);
  if (!context) {
    throw new Error('usePOSUI must be used within a POSUIProvider');
  }
  return context;
};

interface POSUIProviderProps {
  children: ReactNode;
}

export const POSUIProvider: React.FC<POSUIProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <POSUIContext.Provider value={{ isOpen, setIsOpen, toggleOpen }}>
      {children}
    </POSUIContext.Provider>
  );
};