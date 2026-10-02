import React from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { formatDate } from '../../lib/dateFormat';
import { formatEventTime } from '../../lib/utils';

interface TicketEventMetaProps {
  title?: string;
  date?: string | Date;
  eventDate?: string | Date;
  time?: string;
  eventTime?: string;
  location?: string;
  venue?: string;
  isPdf?: boolean;
}

export const TicketEventMeta: React.FC<TicketEventMetaProps> = ({
  title = 'Unknown Event',
  date,
  eventDate,
  time,
  eventTime,
  location,
  venue,
  isPdf = false
}) => {
  const resolvedDate = eventDate || date;
  const resolvedTime = eventTime || time;
  const formattedDate = resolvedDate ? formatDate(resolvedDate) : 'Date TBD';
  const dateStr = resolvedDate ? (resolvedDate instanceof Date ? resolvedDate.toISOString() : String(resolvedDate)) : undefined;
  const formattedTime = formatEventTime(dateStr, resolvedTime);
  const locationText = location || venue || 'Location TBD';

  if (isPdf) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
        <h2 style={{ margin: 0, lineHeight: 1.2, fontWeight: 900, letterSpacing: '-0.02em', fontSize: '22px', color: '#F3F7F6' }}>
          {title}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '11px', color: '#A7B5B2' }}>
            <span style={{ color: '#00C9B1', display: 'inline-flex' }}>📅</span>
            <span>{formattedDate}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '11px', color: '#A7B5B2' }}>
            <span style={{ color: '#00C9B1', display: 'inline-flex' }}>⏰</span>
            <span>{formattedTime}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '11px', color: '#A7B5B2' }}>
            <span style={{ color: '#00C9B1', display: 'inline-flex' }}>📍</span>
            <span>{locationText}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <h2 className="leading-tight font-black tracking-tight line-clamp-2 text-h3 text-text-primary group-hover:text-teal transition-colors duration-base">
        {title}
      </h2>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <div className="flex items-center gap-1.5 font-bold text-body-xs text-text-muted">
          <Calendar size={13} className="text-teal shrink-0" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-1.5 font-bold text-body-xs text-text-muted">
          <Clock size={13} className="text-teal shrink-0" />
          <span>{formattedTime}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 font-bold text-body-xs text-text-muted">
        <MapPin size={13} className="text-teal shrink-0" />
        <span className="line-clamp-1">{locationText}</span>
      </div>
    </div>
  );
};
