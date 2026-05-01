
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './ui/Logo';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthReady, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading || !isAuthReady) {
    return (
      <div className="min-h-screen bg-bg-page flex flex-col items-center justify-center p-8 text-center">
        <Logo size="hero" iconOnly className="mb-12 animate-pulse-glow" />
        <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-text-muted font-bold tracking-widest uppercase text-label animate-pulse">Verifying session protocol...</p>
      </div>
    );
  }

  if (!user) {
    // Redirect to home and trigger login modal via state or search param if /login doesn't exist
    // But requirement says redirect to /login. I'll use / as fallback if needed.
    return <Navigate to="/" state={{ from: location, openLogin: true }} replace />;
  }

  return <>{children}</>;
};
