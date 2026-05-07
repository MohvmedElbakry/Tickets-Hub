
import * as eventsApi from '../lib/api/eventsApi';
import * as authApi from '../lib/api/authApi';
import { Event } from '../types';
import { normalizeEvent } from '../lib/utils';

export const eventService = {
  async getEvents(): Promise<Event[]> {
    const data = await eventsApi.getEvents();
    if (!data || !Array.isArray(data)) return [];
    
    return data.map((e: any) => normalizeEvent(e));
  },

  async getEvent(id: string | number): Promise<Event> {
    const data = await eventsApi.getEvent(id);
    if (!data) return data;
    return normalizeEvent(data);
  },

  async getSettings() {
    return await eventsApi.getSettings();
  },

  async preRegister(eventId: string | number) {
    return await eventsApi.preRegister(eventId);
  },

  async adminDeleteEvent(id: string | number) {
    return await eventsApi.adminDeleteEvent(id);
  },

  async adminCreateEvent(params: any) {
    return await eventsApi.adminCreateEvent(params);
  },

  async adminUpdateEvent(id: string | number, params: any) {
    return await eventsApi.adminUpdateEvent(id, params);
  },

  async adminUpdateSettings(params: any) {
    return await eventsApi.adminUpdateSettings(params);
  },

  async adminScanTicket(params: { ticket_id: string; event_id: string }) {
    return await eventsApi.adminScanTicket(params);
  }
};
