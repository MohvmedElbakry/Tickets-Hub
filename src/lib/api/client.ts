import { refreshTokens } from './authApi';

const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : window.location.origin;

export interface ApiError extends Error {
  status?: number;
  data?: any;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('accessToken');
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  console.log("🌍 API Request:", url, "Token:", token);

  if (!token && 
      !url.includes('/api/auth/login') && 
      !url.includes('/api/auth/signup') && 
      !url.includes('/api/events') && 
      !url.includes('/api/payments/verify') &&
      !url.includes('/api/orders') &&
      !url.includes('/api/qr-status') &&
      !url.includes('/api/settings')) {
     console.warn("🚫 Skipping API call: No token", url);
     // Following user request: DO NOT send request if token is null
     // But we allow /api/events to be public
     const error: ApiError = new Error("Auth token missing");
     error.status = 401;
     throw error;
  }

  const requestHeaders = new Headers(options.headers || {});
  if (!requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers: requestHeaders
    });

    console.log("🌐 RESPONSE STATUS:", res.status, url);

    if (res.status === 401 && !url.includes('/api/auth/refresh')) {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            console.log('[API Client] Token expired, attempting refresh...');
            const newTokens = await refreshTokens(refreshToken);
            localStorage.setItem('accessToken', newTokens.accessToken);
            localStorage.setItem('refreshToken', newTokens.refreshToken);
            isRefreshing = false;
            onTokenRefreshed(newTokens.accessToken);
          } catch (refreshErr) {
            isRefreshing = false;
            console.error('[API Client] Refresh failed, logging out...');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.dispatchEvent(new CustomEvent('api-unauthorized'));
            throw refreshErr;
          }
        }

        // Wait for refresh to complete then retry once
        const newToken: string = await new Promise(resolve => subscribeTokenRefresh(resolve));
        requestHeaders.set('Authorization', `Bearer ${newToken}`);
        const retryRes = await fetch(url, { ...options, headers: requestHeaders });
        
        if (!retryRes.ok) {
          const errorData = await retryRes.json().catch(() => ({ error: retryRes.statusText }));
          const error: ApiError = new Error(JSON.stringify(errorData));
          error.status = retryRes.status;
          error.data = errorData;
          throw error;
        }
        
        return await (retryRes.headers.get('content-type')?.includes('application/json') ? retryRes.json() : retryRes.text());
      } else {
        // No refresh token available
        if (url.includes('/api/auth/me')) {
          window.dispatchEvent(new CustomEvent('api-unauthorized'));
        }
      }
    }

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch (e) {
        errorData = { error: res.statusText || `Request failed with status ${res.status}` };
      }
      
      const errorMessage = errorData.error || errorData.message || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
      const error: ApiError = new Error(errorMessage);
      error.status = res.status;
      error.data = errorData;
      throw error;
    }

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    return await res.text();
  } catch (err: any) {
    throw err;
  }
};
