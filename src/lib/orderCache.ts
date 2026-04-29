import { orderService } from '../services/orderService';
import { Order } from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<number, CacheEntry<Order>>();
const inFlight = new Map<number, Promise<Order>>();
const ORDER_TTL_MS = 30000; // 30 seconds

/**
 * Deduplicated order fetcher with TTL and background revalidation.
 */
export const getOrderCached = async (orderId: number, forceRefresh = false): Promise<Order> => {
  const cached = cache.get(orderId);
  const now = Date.now();

  // 1. If we have fresh cache and no force refresh, return immediately
  if (!forceRefresh && cached && (now - cached.timestamp < ORDER_TTL_MS)) {
    return cached.data;
  }

  // 2. If there's an in-flight request, return its promise
  if (inFlight.has(orderId)) {
    return inFlight.get(orderId)!;
  }

  // Define the refresh function
  const refresh = async (): Promise<Order> => {
    try {
      const order = await orderService.getOrder(orderId);
      if (order) {
        const currentCached = cache.get(orderId);
        // Only update if data actually changed to avoid unnecessary re-renders in hooks
        if (!currentCached || JSON.stringify(currentCached.data) !== JSON.stringify(order)) {
          cache.set(orderId, { data: order, timestamp: Date.now() });
        } else {
          // Just update timestamp to extend TTL
          currentCached.timestamp = Date.now();
        }
      }
      return order;
    } catch (error) {
      console.error(`Failed to fetch order ${orderId}:`, error);
      throw error;
    } finally {
      inFlight.delete(orderId);
    }
  };

  // 3. Stale-while-revalidate: if we have stale cache, return it but refresh in background
  if (!forceRefresh && cached) {
    // Fire and forget revalidation
    refresh().catch(() => {}); 
    return cached.data;
  }

  // 4. No cache or force refresh: perform fetch
  const requestPromise = refresh();
  inFlight.set(orderId, requestPromise);
  return requestPromise;
};

/**
 * Update the cache manually (e.g. after a payment update)
 */
export const updateOrderCache = (order: Order) => {
  if (order && order.id) {
    cache.set(order.id, { data: order, timestamp: Date.now() });
  }
};

/**
 * Invalidate an order in the cache
 */
export const invalidateOrder = (orderId: number) => {
  cache.delete(orderId);
};

/**
 * Invalidate all orders in the cache
 */
export const clearOrderCache = () => {
  cache.clear();
  inFlight.clear();
};

// Listen for global auth events
if (typeof window !== 'undefined') {
  window.addEventListener('app-logout', clearOrderCache);
  window.addEventListener('app-login', clearOrderCache);
}

