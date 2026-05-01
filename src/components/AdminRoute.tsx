
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './ui/Logo';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAuthReady, isLoading } = useAuth();

  if (isLoading || !isAuthReady) {
    return (
      <div className="min-h-screen bg-bg-page flex flex-col items-center justify-center p-8 text-center">
        <Logo size="hero" iconOnly className="mb-12 animate-pulse-glow" />
        <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-text-muted font-bold tracking-widest uppercase text-label animate-pulse">Authenticating Admin Access...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    console.warn('⛔ Access Denied: Admin role required');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
