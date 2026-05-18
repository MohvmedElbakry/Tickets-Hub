
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Event } from '../types';
import { eventService } from '../services/eventService';
import { orderService } from '../services/orderService';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';

interface EventsContextType {
  events: Event[];
  loading: boolean;
  refreshEvents: () => Promise<void>;
  settings: { 
    service_fee_percent: number;
    processing_fee_percent: number;
    fixed_fee_egp: number;
  };
  setSettings: React.Dispatch<React.SetStateAction<{ 
    service_fee_percent: number;
    processing_fee_percent: number;
    fixed_fee_egp: number;
  }>>;
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  handlePreRegister: (eventId: string | number) => Promise<void>;
  handlePurchase: (eventId: string | number, tickets: any[], additionalInfo?: any) => Promise<void>;
  purchaseLoading: boolean;
  purchaseError: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedLocation: string;
  setSelectedLocation: (l: string) => void;
  maxPrice: number;
  setMaxPrice: (p: number) => void;
  filteredEvents: Event[];
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export const EventsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const eventsTimestampRef = useRef<number>(0);
  const EVENTS_TTL_MS = 60000; // 60 seconds
  const eventsInFlightRef = useRef<Promise<void> | null>(null);

  const [settings, setSettings] = useState({ 
    service_fee_percent: 10,
    processing_fee_percent: 2.75,
    fixed_fee_egp: 3
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [maxPrice, setMaxPrice] = useState<number>(50000);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const { accessToken } = useAuth();
  const { setIsLoginModalOpen, setBookingData, setIsBookingModalOpen, paymentFlowActive, setPaymentFlowActive } = useUI();
  const navigate = useNavigate();
  const location = useLocation();

  const isPaymentFlowRoute =
    location.pathname.startsWith('/payment-return') ||
    (location.pathname.startsWith('/confirmation') && paymentFlowActive);

  const hasFetchedSettingsRef = useRef(false);

  const refreshEvents = useCallback(async (force = false) => {
    if (isPaymentFlowRoute || paymentFlowActive) {
      console.log("🚫 [EventsContext] Blocked refreshEvents during payment flow");
      return;
    }

    const now = Date.now();
    if (!force && eventsTimestampRef.current && (now - eventsTimestampRef.current < EVENTS_TTL_MS)) {
      return;
    }

    if (eventsInFlightRef.current) {
      return eventsInFlightRef.current;
    }

    const fetchTask = (async () => {
      // Only show loading if we don't have events yet
      if (events.length === 0) setLoading(true);
      
      try {
        const data = await eventService.getEvents();
        if (data && Array.isArray(data)) {
          setEvents(data);
          eventsTimestampRef.current = Date.now();
        }
      } catch (err) {
        console.error('Failed to fetch events in EventsContext', err);
      } finally {
        setLoading(false);
        eventsInFlightRef.current = null;
      }
    })();

    eventsInFlightRef.current = fetchTask;
    return fetchTask;
  }, [events.length, isPaymentFlowRoute, paymentFlowActive]);

  const fetchSettings = useCallback(async () => {
    if (isPaymentFlowRoute || paymentFlowActive) return;
    if (hasFetchedSettingsRef.current) return;
    hasFetchedSettingsRef.current = true;
    try {
      const data = await eventService.getSettings();
      if (data) setSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings in EventsContext', err);
      hasFetchedSettingsRef.current = false;
    }
  }, [isPaymentFlowRoute, paymentFlowActive]);

  const handlePreRegister = useCallback(async (eventId: string | number) => {
    try {
      const data = await eventService.preRegister(eventId);
      if (data) {
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, pre_registrations_count: (e.pre_registrations_count || 0) + 1 } : e));
      }
    } catch (err: any) {
      try {
        const errorData = err.data || JSON.parse(err.message);
        alert(errorData.error || 'Failed to pre-register');
      } catch {
        alert(err.message || 'An error occurred');
      }
    }
  }, []);

  const handlePurchase = useCallback(async (eventId: string | number, tickets: any[], additionalInfo?: any) => {
    if (purchaseLoading) {
      console.warn('[EventsContext] handlePurchase already in progress, ignoring duplicate call');
      return;
    }

    if (!accessToken) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!additionalInfo) {
      setBookingData({ eventId, tickets });
      setIsBookingModalOpen(true);
      return;
    }

    console.log(`[EventsContext] handlePurchase triggered for event #${eventId}`);
    setPurchaseLoading(true);
    setPurchaseError(null);
    try {
      const order = await orderService.createOrder({
        event_id: eventId,
        tickets,
        ...additionalInfo
      });

      if (order) {
        const orderId = order.public_id || order.id;
        if (order.order_status === 'pending_approval') {
          navigate(`/confirmation/${orderId}`);
          setIsBookingModalOpen(false);
        } else {
          navigate(`/checkout/${orderId}`);
          setIsBookingModalOpen(false);
        }
      }
    } catch (err: any) {
      let errorMsg = 'Failed to process purchase';
      try {
        const errorData = JSON.parse(err.message);
        errorMsg = errorData.error || errorMsg;
      } catch {
        errorMsg = err.message || errorMsg;
      }
      setPurchaseError(errorMsg);
    } finally {
      setPurchaseLoading(false);
    }
  }, [accessToken, navigate, setIsLoginModalOpen, setBookingData, setIsBookingModalOpen, setPaymentFlowActive]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = selectedLocation === 'All' || event.location === selectedLocation;
      // We check for ticket_types to be existing and filter properly
      const matchesPrice = event.ticket_types && event.ticket_types.length > 0
                           ? event.ticket_types.some(tt => tt.price <= maxPrice)
                           : true; // Or handle as you wish for events with no explicit price in filter
      return matchesSearch && matchesLocation && matchesPrice && event.status !== 'draft';
    });
  }, [events, searchQuery, selectedLocation, maxPrice]);

  useEffect(() => {
    // Only fetch on specific routes or when cache is empty
    const shouldFetch = location.pathname === '/' || location.pathname === '/events' || events.length === 0;
    
    if (shouldFetch && !isPaymentFlowRoute && !paymentFlowActive) {
      const now = Date.now();
      const isStale = eventsTimestampRef.current && (now - eventsTimestampRef.current >= EVENTS_TTL_MS);
      
      if (!eventsTimestampRef.current || isStale) {
        refreshEvents();
      }
    }
    fetchSettings();
  }, [location.pathname, isPaymentFlowRoute, paymentFlowActive, refreshEvents, events.length, fetchSettings]);

  return (
    <EventsContext.Provider value={{ 
      events, 
      loading, 
      refreshEvents, 
      settings, 
      setSettings, 
      setEvents,
      handlePreRegister,
      handlePurchase,
      purchaseLoading,
      purchaseError,
      searchQuery,
      setSearchQuery,
      selectedLocation,
      setSelectedLocation,
      maxPrice,
      setMaxPrice,
      filteredEvents
    }}>
      {children}
    </EventsContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
};

export const useSettings = () => {
  const { settings, loading } = useEvents();
  
  // Safe fallback pattern
  const safeSettings = useMemo(() => ({
    service_fee_percent: settings?.service_fee_percent ?? 10,
    processing_fee_percent: settings?.processing_fee_percent ?? 2.75,
    fixed_fee_egp: settings?.fixed_fee_egp ?? 3
  }), [settings]);

  return { settings: safeSettings, loading };
};
