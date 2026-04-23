
import { fetchWithAuth } from './client';
import { Notification } from '../../types';

export const getNotifications = async (): Promise<Notification[]> => {
  return await fetchWithAuth('/api/notifications');
};

export const markNotificationRead = async (id: number): Promise<any> => {
  return await fetchWithAuth(`/api/notifications/${id}/read`, {
    method: 'PUT'
  });
};
