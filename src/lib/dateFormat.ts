/**
 * Global date and time formatting utility for professional visual consistency.
 * Standard format chosen: "DD MMM YYYY at hh:mm AM/PM" or just "DD MMM YYYY" or "hh:mm AM/PM"
 * Example: "20 May 2026 at 04:20 PM"
 */

export const parseDate = (dateInput: Date | string | null | undefined): Date | null => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Formats a Date into standard human-readable format, e.g., "20 May 2026 at 04:20 PM"
 */
export const formatDateTime = (dateInput: Date | string | null | undefined): string => {
  const d = parseDate(dateInput);
  if (!d) return '--';
  
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const hoursStr = hours.toString().padStart(2, '0');
  
  return `${day} ${month} ${year} at ${hoursStr}:${minutes} ${ampm}`;
};

/**
 * Formats a Date into a date-only format, e.g., "20 May 2026"
 */
export const formatDate = (dateInput: Date | string | null | undefined): string => {
  const d = parseDate(dateInput);
  if (!d) return '--';
  
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day} ${month} ${year}`;
};

/**
 * Formats a Date into a time-only format, e.g., "04:20 PM"
 */
export const formatTime = (dateInput: Date | string | null | undefined): string => {
  const d = parseDate(dateInput);
  if (!d) return '--';
  
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = hours.toString().padStart(2, '0');
  
  return `${hoursStr}:${minutes} ${ampm}`;
};
