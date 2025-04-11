
import React, { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = ['staff', 'admin', 'super-admin']
}) => {
  const { isAuthenticated, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  
  console.log("ProtectedRoute check:", { 
    isAuthenticated, 
    profileRole: profile?.role, 
    allowedRoles, 
    isLoading 
  });

  useEffect(() => {
    // Debug navigation issues
    if (isAuthenticated && profile) {
      console.log("User authenticated with role:", profile.role);
      if (allowedRoles.includes(profile.role)) {
        console.log("User has authorized role for this route");
      } else {
        console.log("User does not have authorized role for this route");
      }
    }
  }, [isAuthenticated, profile, allowedRoles]);

  // If still loading, show a simple loading indicator
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log("Not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // If authenticated but not allowed for this route, redirect to dashboard
  if (profile && !allowedRoles.includes(profile.role)) {
    console.log("Not authorized for this route, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  // Otherwise render the protected content
  console.log("Rendering protected content");
  return <>{children || <Outlet />}</>;
};

export default ProtectedRoute;
