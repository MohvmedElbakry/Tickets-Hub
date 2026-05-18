import { orderService } from '../services/orderService';
import { Order, OrderPublicId, OrderId } from '../types';

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
export const getOrderCached = async (orderId: OrderPublicId | OrderId, forceRefresh = false): Promise<Order> => {
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
      const order = await orderService.getOrder(orderId.toString());
      if (order) {
        updateOrderCache(order);
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
    const timestamp = Date.now();
    const entry = { data: order, timestamp };
    if (order.id) cache.set(order.id.toString(), entry);
    if (order.public_id) cache.set(order.public_id, entry);
  }
};

/**
 * Invalidate an order in the cache
 */
export const invalidateOrder = (identifier: OrderPublicId | OrderId) => {
  const key = identifier.toString();
  const cached = cache.get(key);
  
  if (cached?.data) {
    const order = cached.data;
    if (order.id) cache.delete(order.id.toString());
    if (order.public_id) cache.delete(order.public_id);
  } else {
    cache.delete(key);
  }
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

