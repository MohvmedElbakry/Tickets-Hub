
import { fetchWithAuth } from './client';
import { Event, PreRegistration } from '../../types';

export const getEvents = async (): Promise<Event[]> => {
  return await fetchWithAuth('/api/events');
};

export const getEvent = async (id: string | number): Promise<Event> => {
  return await fetchWithAuth(`/api/events/${id}`);
};

export const preRegister = async (eventId: string | number): Promise<any> => {
  return await fetchWithAuth(`/api/events/${eventId}/pre-register`, {
    method: 'POST'
  });
};

export const getPreRegistrations = async (): Promise<PreRegistration[]> => {
  return await fetchWithAuth('/api/pre-registrations');
};

export const getSettings = async (): Promise<any> => {
  return await fetchWithAuth('/api/settings');
};

export const adminCreateEvent = async (data: any): Promise<Event> => {
  return await fetchWithAuth('/api/events', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const adminUpdateEvent = async (id: string | number, data: any): Promise<Event> => {
  return await fetchWithAuth(`/api/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const adminDeleteEvent = async (id: string | number): Promise<any> => {
  return await fetchWithAuth(`/api/events/${id}`, {
    method: 'DELETE'
  });
};

export const adminUpdateSettings = async (data: any): Promise<any> => {
  return await fetchWithAuth('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const adminScanTicket = async (data: { ticket_id: string, event_id: string }): Promise<any> => {
  return await fetchWithAuth('/api/admin/scan', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};
