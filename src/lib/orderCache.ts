import { orderService } from '../services/orderService';
import { Order } from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<Order>>();
const inFlight = new Map<string, Promise<Order>>();
const ORDER_TTL_MS = 30000; // 30 seconds

/**
 * Deduplicated order fetcher with TTL and background revalidation.
 */
export const getOrderCached = async (orderId: number | string, forceRefresh = false): Promise<Order> => {
  const cacheKey = orderId.toString();
  const cached = cache.get(cacheKey);
  const now = Date.now();

  // 1. If we have fresh cache and no force refresh, return immediately
  if (!forceRefresh && cached && (now - cached.timestamp < ORDER_TTL_MS)) {
    return cached.data;
  }

  // 2. If there's an in-flight request, return its promise
  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey)!;
  }

  // Define the refresh function
  const refresh = async (): Promise<Order> => {
    try {
      const order = await orderService.getOrder(orderId);
      if (order) {
        // Cache by both internal ID and public_id if available to maximize hit rate
        const entriesToUpdate = [order.id.toString()];
        if (order.public_id) entriesToUpdate.push(order.public_id);

        for (const key of entriesToUpdate) {
          const currentCached = cache.get(key);
          if (!currentCached || JSON.stringify(currentCached.data) !== JSON.stringify(order)) {
            cache.set(key, { data: order, timestamp: Date.now() });
          } else {
            currentCached.timestamp = Date.now();
          }
        }
      }
      return order;
    } catch (error) {
      console.error(`Failed to fetch order ${orderId}:`, error);
      throw error;
    } finally {
      inFlight.delete(cacheKey);
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
  inFlight.set(cacheKey, requestPromise);
  return requestPromise;
};

/**
 * Update the cache manually (e.g. after a payment update)
 */
export const updateOrderCache = (order: Order) => {
  if (order) {
    if (order.id) cache.set(order.id.toString(), { data: order, timestamp: Date.now() });
    if (order.public_id) cache.set(order.public_id, { data: order, timestamp: Date.now() });
  }
};

/**
 * Invalidate an order in the cache
 */
export const invalidateOrder = (orderId: number | string) => {
  cache.delete(orderId.toString());
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

