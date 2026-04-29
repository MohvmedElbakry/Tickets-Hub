
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, Notification as AppNotification, PreRegistration } from '../types';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { eventService } from '../services/eventService';

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (data: { user: UserProfile; accessToken: string; refreshToken: string }) => void;
  logout: () => void;
  isLoading: boolean;
  isAuthReady: boolean;
  notifications: AppNotification[];
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: number) => Promise<void>;
  preRegistrations: PreRegistration[];
  refreshPreRegistrations: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('user');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem('accessToken'));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem('refreshToken'));
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [preRegistrations, setPreRegistrations] = useState<PreRegistration[]>([]);
  const hasInitializedRef = useRef(false);
  const hasFetchedInitialDataRef = useRef(false);

  console.log('[AuthContext] Initial state:', { 
    accessToken: !!accessToken,
    user: !!user
  });

  const login = useCallback((data: { user: UserProfile; accessToken: string; refreshToken: string }) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
    // Dispatch global event for login
    window.dispatchEvent(new CustomEvent('app-login'));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setNotifications([]);
    setPreRegistrations([]);
    hasFetchedInitialDataRef.current = false;
    // Dispatch global event for full app reset
    window.dispatchEvent(new CustomEvent('app-logout'));
  }, []);

  useEffect(() => {
    const handleLogoutSync = () => {
      // If logout event came from elsewhere, ensure state is reset
      // but avoid infinite loop if possible (though dispatching same event is usually fine in most listeners)
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      setNotifications([]);
      setPreRegistrations([]);
      hasFetchedInitialDataRef.current = false;
    };
    window.addEventListener('app-logout', handleLogoutSync);
    return () => window.removeEventListener('app-logout', handleLogoutSync);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      if (hasInitializedRef.current) return;
      hasInitializedRef.current = true;
      
      const token = localStorage.getItem('accessToken');
      const refresh = localStorage.getItem('refreshToken');
      const savedUser = localStorage.getItem('user');

      console.log('[AuthContext] initializeAuth running. Token:', !!token);

      if (token) {
        setAccessToken(token);
        if (refresh) setRefreshToken(refresh);
        if (savedUser) {
          try { setUser(JSON.parse(savedUser)); } catch {}
        }
      }

      setIsAuthReady(true);
      setIsLoading(false);

      if (token) {
        try {
          console.log('[AuthContext] Validating session in background...');
          const userData = await authService.getCurrentUser();
          if (userData && userData.id) {
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            console.log('[AuthContext] Session validated for user:', userData.id);
          }
        } catch (err: any) {
          console.warn('[AuthContext] Background session validation failed:', err);
          if (err.status === 401) {
            console.log('[AuthContext] 401 detected during validation, triggering logout');
            logout();
          }
        }
      }
    };

    initializeAuth();
  }, [logout]);

  const refreshNotifications = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await notificationService.getNotifications();
      if (data && Array.isArray(data)) setNotifications(data);
    } catch (err: any) {
      if (err.status !== 401) {
        console.error('Failed to fetch notifications in AuthContext', err);
      }
    }
  }, [accessToken]);

  const refreshPreRegistrations = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await eventService.getPreRegistrations();
      if (data && Array.isArray(data)) setPreRegistrations(data);
    } catch (err: any) {
      if (err.status !== 401) {
        console.error('Failed to fetch pre-registrations in AuthContext', err);
      }
    }
  }, [accessToken]);

  const markNotificationRead = useCallback(async (id: number) => {
    try {
      const res = await notificationService.markAsRead(id);
      if (res) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error('Failed to mark notification as read in AuthContext', err);
    }
  }, []);

  useEffect(() => {
    if (!accessToken || hasFetchedInitialDataRef.current) return;
    
    // 🚫 [PHASE 3.2] HARD BLOCK global activity during ANY payment/confirmation flow
    const isPaymentFlowMode = 
      window.location.pathname.startsWith('/payment-return') || 
      window.location.pathname.startsWith('/confirmation');

    if (isPaymentFlowMode) return;

    hasFetchedInitialDataRef.current = true;

    refreshNotifications();
    refreshPreRegistrations();
    const interval = setInterval(refreshNotifications, 30000);
    return () => clearInterval(interval);
  }, [accessToken, refreshNotifications, refreshPreRegistrations]);

  // Handle unauthorized API calls globally
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      window.dispatchEvent(new CustomEvent('open-login-modal'));
    };
    window.addEventListener('api-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('api-unauthorized', handleUnauthorized);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      accessToken, 
      refreshToken,
      login, 
      logout, 
      isLoading, 
      isAuthReady,
      notifications, 
      refreshNotifications, 
      markNotificationRead,
      preRegistrations,
      refreshPreRegistrations
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
