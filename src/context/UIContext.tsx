
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Event, Order } from '../types';
import { orderService } from '../services/orderService';

interface UIContextType {
  selectedEvent: Event | null;
  setSelectedEvent: (event: Event | null) => void;
  lastOrder: Order | null;
  setLastOrder: (order: Order | null) => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  isSignupModalOpen: boolean;
  setIsSignupModalOpen: (open: boolean) => void;
  isEventModalOpen: boolean;
  setIsEventModalOpen: (open: boolean) => void;
  isBookingModalOpen: boolean;
  setIsBookingModalOpen: (open: boolean) => void;
  bookingData: { eventId: string | number, tickets: any[] } | null;
  setBookingData: (data: { eventId: string | number, tickets: any[] } | null) => void;
  editingEvent: Event | null;
  setEditingEvent: (event: Event | null) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  isHandlingPayment: boolean;
  setIsHandlingPayment: (loading: boolean) => void;
  paymentFlowActive: boolean;
  setPaymentFlowActive: (active: boolean) => void;
  verificationStarted: boolean;
  setVerificationStarted: (started: boolean) => void;
  handleEventClick: (event: Event) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingData, setBookingData] = useState<{ eventId: string | number, tickets: any[] } | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHandlingPayment, setIsHandlingPayment] = useState(false);
  const [paymentFlowActive, setPaymentFlowActive] = useState(false);
  const [verificationStarted, setVerificationStarted] = useState(false);

  // Handle unauthorized API calls and global logout
  useEffect(() => {
    const handleOpenLogin = () => {
      setIsLoginModalOpen(true);
    };
    
    const handleLogoutReset = () => {
      setSelectedEvent(null);
      setLastOrder(null);
      setIsLoginModalOpen(false);
      setIsSignupModalOpen(false);
      setIsEventModalOpen(false);
      setIsBookingModalOpen(false);
      setBookingData(null);
      setEditingEvent(null);
      setIsNotificationsOpen(false);
      setIsHandlingPayment(false);
      setPaymentFlowActive(false);
      setVerificationStarted(false);
    };

    window.addEventListener('open-login-modal', handleOpenLogin);
    window.addEventListener('app-logout', handleLogoutReset);
    
    return () => {
      window.removeEventListener('open-login-modal', handleOpenLogin);
      window.removeEventListener('app-logout', handleLogoutReset);
    };
  }, []);

  return (
    <UIContext.Provider value={{
      selectedEvent, setSelectedEvent,
      lastOrder, setLastOrder,
      isLoginModalOpen, setIsLoginModalOpen,
      isSignupModalOpen, setIsSignupModalOpen,
      isEventModalOpen, setIsEventModalOpen,
      isBookingModalOpen, setIsBookingModalOpen,
      bookingData, setBookingData,
      editingEvent, setEditingEvent,
      isNotificationsOpen, setIsNotificationsOpen,
      isHandlingPayment, setIsHandlingPayment,
      paymentFlowActive, setPaymentFlowActive,
      verificationStarted, setVerificationStarted,
      handleEventClick: (event: Event) => {
        setSelectedEvent(event);
        navigate(`/events/${event.id}`);
      }
    }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
