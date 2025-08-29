
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { POSUIProvider } from "./contexts/POSUIContext";
import { UserRole } from "./types/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Analytics from "./pages/Analytics";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { useEffect } from "react";
import QRScanner from "./pages/QRScanner";
import LiveAuctions from "./pages/LiveAuctions";
import BidderProfiles from "./pages/BidderProfiles";
import Profile from "./pages/Profile";
import MyBids from "./pages/MyBids";
import Inventory from "./pages/Inventory";

const queryClient = new QueryClient();

// Separated routes component to avoid nesting inside App
const AppRoutes = () => {
  const { isAuthenticated, isLoading, profile } = useAuth();
  
  useEffect(() => {
    console.log("AppRoutes rendering - Auth state:", { isAuthenticated, isLoading, currentPath: window.location.pathname });
  }, [isAuthenticated, isLoading]);
  
  // If auth is still loading, show a simple spinner
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to={profile?.role === 'bidder' ? '/auctions' : '/dashboard'} replace />} />
      
      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to={profile?.role === 'bidder' ? '/auctions' : '/dashboard'} replace />} />
        <Route path="/dashboard" element={
          <Layout>
            {profile?.role === 'bidder' ? <Navigate to="/auctions" replace /> : <Dashboard />}
          </Layout>
        } />
        <Route path="/pos" element={
          <ProtectedRoute allowedRoles={['staff', 'admin', 'super-admin', 'auction-manager'] as UserRole[]}>
            <Layout><POS /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/qr-scanner" element={<Layout><QRScanner /></Layout>} />
        <Route path="/auctions" element={<Layout><LiveAuctions /></Layout>} />
        <Route path="/bidders" element={<Layout><BidderProfiles /></Layout>} />
        <Route path="/my-bids" element={<Layout><MyBids /></Layout>} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        
        {/* Admin only routes */}
        <Route path="/analytics" element={
          <ProtectedRoute allowedRoles={['admin', 'super-admin'] as UserRole[]}>
            <Layout><Analytics /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['super-admin'] as UserRole[]}>
            <Layout><Users /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute allowedRoles={['admin', 'super-admin'] as UserRole[]}>
            <Layout><Settings /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/inventory" element={
          <ProtectedRoute allowedRoles={['staff', 'admin', 'super-admin'] as UserRole[]}>
            <Layout><Inventory /></Layout>
          </ProtectedRoute>
        } />
      </Route>
      
      {/* Not found route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <POSUIProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </POSUIProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
