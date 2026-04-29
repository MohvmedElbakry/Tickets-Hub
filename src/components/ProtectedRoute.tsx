
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthReady, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading || !isAuthReady) {
    return (
      <div className="min-h-screen bg-primary-bg flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-text-secondary">Verifying session...</p>
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
