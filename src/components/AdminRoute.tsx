
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAuthReady, isLoading } = useAuth();

  if (isLoading || !isAuthReady) {
    return (
      <div className="min-h-screen bg-primary-bg flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-text-secondary">Verifying permissions...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    console.warn('⛔ Access Denied: Admin role required');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
