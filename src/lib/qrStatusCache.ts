import { orderService } from '../services/orderService';

export interface QRStatus {
  visible: boolean;
  qr_data?: string;
  reason?: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<QRStatus>>();
const inFlight = new Map<string, Promise<QRStatus>>();
const QR_TTL_MS = 15000; // 15 seconds

/**
 * Deduplicated QR status fetcher with TTL and background revalidation.
 */
export const getQRStatus = async (orderId: string, forceRefresh = false): Promise<QRStatus> => {
  const cached = cache.get(orderId);
  const now = Date.now();

  // 1. Fresh cache
  if (!forceRefresh && cached && (now - cached.timestamp < QR_TTL_MS)) {
    return cached.data;
  }

  // 2. In-flight
  if (inFlight.has(orderId)) {
    return inFlight.get(orderId)!;
  }

  const refresh = async (): Promise<QRStatus> => {
    try {
      const status = await orderService.getOrderQRStatus(orderId);
      if (status) {
        const currentCached = cache.get(orderId);
        if (!currentCached || JSON.stringify(currentCached.data) !== JSON.stringify(status)) {
          cache.set(orderId, { data: status, timestamp: Date.now() });
        } else {
          currentCached.timestamp = Date.now();
        }
      }
      return status;
    } catch (error) {
      console.error(`Failed to fetch QR status for order ${orderId}:`, error);
      throw error;
    } finally {
      inFlight.delete(orderId);
    }
  };

  // 3. Stale-while-revalidate
  if (!forceRefresh && cached) {
    refresh().catch(() => {});
    return cached.data;
  }

  // 4. No cache or force refresh
  const requestPromise = refresh();
  inFlight.set(orderId, requestPromise);
  return requestPromise;
};

const ticketCache = new Map<string, CacheEntry<QRStatus>>();
const ticketInFlight = new Map<string, Promise<QRStatus>>();

/**
 * Deduplicated QR status fetcher for individual ticket instances.
 */
export const getTicketQRStatus = async (publicId: string, forceRefresh = false): Promise<QRStatus> => {
  const cached = ticketCache.get(publicId);
  const now = Date.now();

  if (!forceRefresh && cached && (now - cached.timestamp < QR_TTL_MS)) {
    return cached.data;
  }

  if (ticketInFlight.has(publicId)) {
    return ticketInFlight.get(publicId)!;
  }

  const refresh = async (): Promise<QRStatus> => {
    try {
      const status = await orderService.getTicketQRStatus(publicId);
      if (status) {
        const currentCached = ticketCache.get(publicId);
        if (!currentCached || JSON.stringify(currentCached.data) !== JSON.stringify(status)) {
          ticketCache.set(publicId, { data: status, timestamp: Date.now() });
        } else {
          currentCached.timestamp = Date.now();
        }
      }
      return status;
    } catch (error) {
      console.error(`Failed to fetch QR status for ticket ${publicId}:`, error);
      throw error;
    } finally {
      ticketInFlight.delete(publicId);
    }
  };

  if (!forceRefresh && cached) {
    refresh().catch(() => {});
    return cached.data;
  }

  const requestPromise = refresh();
  ticketInFlight.set(publicId, requestPromise);
  return requestPromise;
};

/**
 * Clears the QR status cache for all or a specific order
 */
export const clearQRStatusCache = (orderId?: string) => {
  if (orderId) {
    cache.delete(orderId);
    ticketCache.delete(orderId);
  } else {
    cache.clear();
    ticketCache.clear();
    inFlight.clear();
    ticketInFlight.clear();
  }
};

// Listen for global auth events
if (typeof window !== 'undefined') {
  window.addEventListener('app-logout', () => clearQRStatusCache());
  window.addEventListener('app-login', () => clearQRStatusCache());
}
