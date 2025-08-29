import React, { createContext, useContext, useState, ReactNode } from 'react';
import { toast } from 'sonner';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

interface POSCartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  subtotal: number;
  tax: number;
  total: number;
  processPayment: () => void;
}

const POSCartContext = createContext<POSCartContextType | undefined>(undefined);

export const usePOSCart = () => {
  const context = useContext(POSCartContext);
  if (!context) {
    throw new Error('usePOSCart must be used within a POSCartProvider');
  }
  return context;
};

interface POSCartProviderProps {
  children: ReactNode;
}

export const POSCartProvider: React.FC<POSCartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => 
          i.id === item.id 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} added to cart`);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setItems(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, quantity }
          : item
      )
    );
  };

  const removeFromCart = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    toast.success('Item removed from cart');
  };

  const clearCart = () => {
    setItems([]);
    toast.success('Cart cleared');
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.12; // 12% tax
  const total = subtotal + tax;

  const processPayment = () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    toast.success(`Payment processed: ₱${total.toFixed(2)}`);
    clearCart();
  };

  return (
    <POSCartContext.Provider value={{
      items,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      subtotal,
      tax,
      total,
      processPayment
    }}>
      {children}
    </POSCartContext.Provider>
  );
};