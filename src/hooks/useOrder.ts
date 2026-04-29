import { useState, useEffect, useRef } from 'react';
import { Order } from '../types';
import { getOrderCached } from '../lib/orderCache';

export const useOrder = (orderId: string | number | undefined) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    const fetchOrder = async () => {
      const id = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
      if (!id || isNaN(id)) {
        setOrder(null);
        return;
      }

      // Only show loading if we don't have the order data already
      if (!order || order.id !== id) {
        setLoading(true);
      }
      
      setError(null);
      try {
        const data = await getOrderCached(id);
        if (mountedRef.current) {
          setOrder(data);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to fetch order'));
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchOrder();

    return () => {
      mountedRef.current = false;
    };
  }, [orderId]);

  return { order, loading, error };
};
