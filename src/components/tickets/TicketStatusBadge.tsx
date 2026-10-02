import React from 'react';
import { TICKET_THEME, getTicketStatusTheme } from '../../lib/ticket-theme';

interface TicketStatusBadgeProps {
  status: string;
  isPdf?: boolean;
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ 
  status = 'PENDING', 
  isPdf = false 
}) => {
  const upperStatus = (status || 'PENDING').toUpperCase();
  const theme = getTicketStatusTheme(upperStatus);
  
  // Status categorization for CSS Tailwind classes
  const isSuccess = ['CONFIRMED', 'PAID', 'VALID', 'ACTIVE', 'APPROVED', 'CHECKED_IN'].includes(upperStatus);
  const isDanger = ['CANCELLED', 'REFUNDED', 'EXPIRED', 'DECLINED'].includes(upperStatus);

  if (isPdf) {
    return (
      <span 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2px 8px',
          height: '20px',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          border: `1px solid ${theme.border}`,
          borderRadius: TICKET_THEME.dimensions.borderRadiusBadge,
          fontSize: '9px',
          backgroundColor: theme.bg,
          color: theme.text,
          whiteSpace: 'nowrap'
        }}
      >
        <span>{upperStatus}</span>
      </span>
    );
  }

  let colorClasses = 'bg-status-warning/10 text-status-warning border-status-warning/30';
  if (isSuccess) {
    colorClasses = 'bg-status-success/10 text-status-success border-status-success/30 shadow-status-success/5';
  } else if (isDanger) {
    colorClasses = 'bg-status-error/10 text-status-error border-status-error/30';
  }

  return (
    <span 
      className={`inline-flex items-center justify-center px-2.5 h-[20px] font-black uppercase tracking-[0.15em] border whitespace-nowrap rounded-[4px] text-[9px] leading-none ${colorClasses}`}
    >
      <span className="relative top-[0.5px]">{upperStatus}</span>
    </span>
  );
};
