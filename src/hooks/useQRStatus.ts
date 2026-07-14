import { useState, useEffect, useCallback, useRef } from 'react';
import { getQRStatus, getTicketQRStatus, QRStatus } from '../lib/qrStatusCache';

export const useQRStatus = (orderId: string | undefined, isPaid: boolean) => {
  const [qrStatus, setQrStatus] = useState<QRStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchStatus = useCallback(async (forceRefresh = false) => {
    if (!orderId || !isPaid) return;

    // Only show loading if we don't have status already
    if (!qrStatus || forceRefresh) {
      setLoading(true);
    }
    
    setError(null);
    try {
      const status = await getQRStatus(orderId, forceRefresh);
      if (mountedRef.current) {
        setQrStatus(status);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [orderId, isPaid, qrStatus]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (orderId && isPaid) {
      fetchStatus();
    } else {
      setQrStatus(null);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [orderId, isPaid, fetchStatus]);

  return { 
    qrStatus, 
    loading, 
    error,
    refresh: () => fetchStatus(true) 
  };
};

export const useTicketQRStatus = (ticketPublicId: string | undefined, isValid: boolean) => {
  const [qrStatus, setQrStatus] = useState<QRStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchStatus = useCallback(async (forceRefresh = false) => {
    if (!ticketPublicId || !isValid) return;

    if (!qrStatus || forceRefresh) {
      setLoading(true);
    }
    
    setError(null);
    try {
      const status = await getTicketQRStatus(ticketPublicId, forceRefresh);
      if (mountedRef.current) {
        setQrStatus(status);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [ticketPublicId, isValid, qrStatus]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (ticketPublicId && isValid) {
      fetchStatus();
    } else {
      setQrStatus(null);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [ticketPublicId, isValid, fetchStatus]);

  return { 
    qrStatus, 
    loading, 
    error,
    refresh: () => fetchStatus(true) 
  };
};
