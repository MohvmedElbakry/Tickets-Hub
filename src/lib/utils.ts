import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatTime } from './dateFormat';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=2000';

export const normalizeEvent = (e: any): any => {
  if (!e) return null;
  
  // Normalize strings: empty strings -> null where appropriate, or fallback for critical fields
  const cleanStr = (val: any) => (typeof val === 'string' && val.trim() !== '') ? val.trim() : null;

  const rawImage = e.image_url || e.image;
  const imageUrl = cleanStr(rawImage) || FALLBACK_IMAGE;

  const event = {
    ...e,
    id: e.id || `gen-${Math.random().toString(36).substr(2, 9)}`,
    title: cleanStr(e.title) || cleanStr(e.name) || 'Untitled Event',
    description: cleanStr(e.description) || 'No description available',
    image_url: imageUrl,
    image: imageUrl, // Compatibility
    event_date: cleanStr(e.event_date) || cleanStr(e.date) || new Date().toISOString(),
    event_time: cleanStr(e.event_time) || cleanStr(e.time) || 'TBA',
    location: cleanStr(e.location) || cleanStr(e.venue) || 'TBA',
    venue: cleanStr(e.venue) || cleanStr(e.location) || 'TBA',
    status: cleanStr(e.status) || 'draft',
    category: cleanStr(e.category) || 'EVENT',
    company_name: cleanStr(e.company_name) || null,
    rules: cleanStr(e.rules) || null,
    google_maps_url: cleanStr(e.google_maps_url) || null,
    ticket_types: Array.isArray(e.ticket_types) ? e.ticket_types : [],
  };

  // Enforce ticket_types correctness
  event.ticket_types = event.ticket_types.map((tt: any) => ({
    ...tt,
    id: tt.id || `tt-${Math.random().toString(36).substr(2, 5)}`,
    name: cleanStr(tt.name) || 'Standard Entry',
    price: Number(tt.price) || 0,
    quantity_total: Number(tt.quantity_total) || 0,
    quantity_sold: Number(tt.quantity_sold) || 0,
    sale_start: cleanStr(tt.sale_start) || event.event_date,
    sale_end: cleanStr(tt.sale_end) || event.event_date
  }));

  // Calculate min price
  event.price = event.ticket_types.length > 0
    ? Math.min(...event.ticket_types.map((tt: any) => tt.price))
    : 0;

  return event;
};

export const calculateAge = (birthdate?: string) => {
  if (!birthdate) return 'N/A';
  const today = new Date();
  const birthDate = new Date(birthdate);
  if (isNaN(birthDate.getTime())) return 'N/A';
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const formatEventTime = (eventDate?: string, eventTime?: string) => {
  if (!eventTime) return 'Time TBD';
  
  try {
    // If eventTime is already a full ISO string or similar
    if (eventTime.includes('T') || eventTime.length > 10) {
      const dateObj = new Date(eventTime);
      if (!isNaN(dateObj.getTime())) {
        return formatTime(dateObj);
      }
    }

    // Try combining date and time
    const datePart = eventDate ? eventDate.split('T')[0] : new Date().toISOString().split('T')[0];
    const timePart = eventTime.includes(':') ? eventTime : null;
    
    if (!timePart) return 'Time TBD';

    // Handle "HH:MM" by adding ":00"
    const normalizedTime = timePart.split(':').length === 2 ? `${timePart}:00` : timePart;
    const dateTimeStr = `${datePart}T${normalizedTime}`;
    const dateObj = new Date(dateTimeStr);
    
    if (isNaN(dateObj.getTime())) return 'Time TBD';

    return formatTime(dateObj);
  } catch (err) {
    return 'Time TBD';
  }
};
