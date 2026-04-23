
import { fetchWithAuth } from './client';
import { UserProfile } from '../../types';

export const getCurrentUser = async (): Promise<UserProfile> => {
  return await fetchWithAuth('/api/auth/me');
};

export const login = async (credentials: any): Promise<{ user: UserProfile, accessToken: string, refreshToken: string }> => {
  return await fetchWithAuth('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
};

export const signup = async (data: any): Promise<{ user: UserProfile, accessToken: string, refreshToken: string }> => {
  return await fetchWithAuth('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const refreshTokens = async (refreshToken: string): Promise<{ accessToken: string, refreshToken: string, user: UserProfile }> => {
  // Use fetch directly for refresh to avoid interceptor loops
  const API_BASE_URL = window.location.hostname === "localhost" ? "http://localhost:3000" : window.location.origin;
  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  if (!res.ok) throw new Error('Refresh failed');
  return res.json();
};

export const getUserPreRegistrations = async (): Promise<any[]> => {
  return await fetchWithAuth('/api/pre-registrations');
};

export const getUserPoints = async (): Promise<any> => {
  return await fetchWithAuth('/api/user/points');
};

export const adminGetUsers = async (): Promise<UserProfile[]> => {
  return await fetchWithAuth('/api/admin/users');
};

export const adminUpdateUserRole = async (id: number, role: string): Promise<any> => {
  return await fetchWithAuth(`/api/admin/users/${id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role })
  });
};

export const adminGetVouchers = async (): Promise<any[]> => {
  return await fetchWithAuth('/api/admin/vouchers');
};

export const adminCreateVoucher = async (data: any): Promise<any> => {
  return await fetchWithAuth('/api/admin/vouchers', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const adminDeleteVoucher = async (id: number): Promise<any> => {
  return await fetchWithAuth(`/api/admin/vouchers/${id}`, {
    method: 'DELETE'
  });
};

export const redeemPoints = async (points: number): Promise<any> => {
  return await fetchWithAuth('/api/user/points/redeem', {
    method: 'POST',
    body: JSON.stringify({ points })
  });
};
