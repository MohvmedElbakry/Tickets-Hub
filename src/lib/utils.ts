
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
        return dateObj.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
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

    return dateObj.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (err) {
    return 'Time TBD';
  }
};
