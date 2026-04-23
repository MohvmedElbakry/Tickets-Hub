
import * as eventsApi from '../lib/api/eventsApi';
import * as authApi from '../lib/api/authApi';
import { Event } from '../types';

export const eventService = {
  async getEvents(): Promise<Event[]> {
    const data = await eventsApi.getEvents();
    if (!data || !Array.isArray(data)) return [];
    
    return data.map((e: any) => ({
      ...e,
      date: e.event_date,
      price: e.ticket_types && e.ticket_types.length > 0 
        ? Math.min(...e.ticket_types.map((t: any) => t.price)) 
        : 0
    }));
  },

  async getEvent(id: string | number): Promise<Event> {
    const data = await eventsApi.getEvent(id);
    console.log("FETCH EVENT ID:", id);
    if (!data) return data;
    return {
      ...data,
      date: data.event_date,
      price: data.ticket_types && data.ticket_types.length > 0 
        ? Math.min(...data.ticket_types.map((t: any) => t.price)) 
        : 0
    };
  },

  async getSettings() {
    return await eventsApi.getSettings();
  },

  async getPreRegistrations() {
    return await eventsApi.getPreRegistrations();
  },

  async preRegister(eventId: string | number) {
    return await eventsApi.preRegister(eventId);
  },

  async getPreRegistrationsForUser() {
    return await authApi.getUserPreRegistrations();
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
