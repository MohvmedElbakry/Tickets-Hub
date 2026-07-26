/**
 * Shared Authoritative Event Timing Helper for TicketsHub
 * Parses event date and time strings accurately regardless of format (YYYY-MM-DD, DD/MM/YYYY, ISO)
 * and calculates precise start and end times to determine if an event has started or ended.
 */
export function getEventTiming(event: any): {
  eventStart: Date;
  eventEnd: Date;
  eventStarted: boolean;
  eventEnded: boolean;
} {
  const now = new Date();
  if (!event) {
    return { eventStart: now, eventEnd: now, eventStarted: false, eventEnded: false };
  }

  let eventStart: Date | null = null;

  // 1. Try parsing event.event_date (String) first as it is the user-facing date (e.g. YYYY-MM-DD or DD/MM/YYYY)
  if (event.event_date) {
    let rawDateStr = String(event.event_date).trim().split('T')[0];
    let dateStr = rawDateStr;

    if (rawDateStr.includes('/')) {
      const parts = rawDateStr.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY/MM/DD
          dateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
          // DD/MM/YYYY
          dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    } else if (rawDateStr.includes('-')) {
      const parts = rawDateStr.split('-');
      if (parts.length === 3 && parts[0].length !== 4 && parts[2].length === 4) {
        // DD-MM-YYYY
        dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    if (event.event_time) {
      let timeStr = String(event.event_time).trim();
      const pm = timeStr.toLowerCase().includes('pm');
      const am = timeStr.toLowerCase().includes('am');
      timeStr = timeStr.replace(/(am|pm)/i, '').trim();
      const parts = timeStr.split(':');
      let hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      if (pm && hours < 12) hours += 12;
      if (am && hours === 12) hours = 0;

      const pad = (n: number) => n.toString().padStart(2, '0');
      const parsedCombined = new Date(`${dateStr}T${pad(hours)}:${pad(minutes)}:00`);
      if (!isNaN(parsedCombined.getTime())) {
        eventStart = parsedCombined;
      }
    }

    if (!eventStart) {
      const parsedDate = new Date(`${dateStr}T00:00:00`);
      if (!isNaN(parsedDate.getTime())) {
        eventStart = parsedDate;
      }
    }
  }

  // 2. Fallback to event.date (DateTime) if event_date was not present or failed to parse
  if (!eventStart && event.date) {
    const parsed = new Date(event.date);
    if (!isNaN(parsed.getTime())) {
      eventStart = parsed;
    }
  }

  // 3. Fallback to now if completely missing or unparseable
  if (!eventStart) {
    eventStart = now;
  }

  // Compute event end datetime:
  // If event_time was explicitly provided, assume standard 6 hours duration.
  // If no event_time was provided (start of day midnight), assume end of event day (24 hours).
  const durationMs = event.event_time ? 6 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const eventEnd = new Date(eventStart.getTime() + durationMs);

  const eventStarted = now >= eventStart;
  const eventEnded = now > eventEnd;

  return { eventStart, eventEnd, eventStarted, eventEnded };
}
