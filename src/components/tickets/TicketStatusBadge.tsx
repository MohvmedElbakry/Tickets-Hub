import React from 'react';

interface TicketStatusBadgeProps {
  status: string;
  isPdf?: boolean;
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ status = 'PENDING', isPdf = false }) => {
  const upperStatus = (status || 'PENDING').toUpperCase();
  const isPaid = upperStatus === 'CONFIRMED' || upperStatus === 'PAID' || upperStatus === 'APPROVED';
  
  const style = isPdf ? (isPaid 
    ? { backgroundColor: 'rgba(0, 201, 177, 0.08)', color: '#00C9B1', border: '1px solid rgba(0, 201, 177, 0.4)' }
    : { backgroundColor: 'rgba(245, 158, 11, 0.08)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.4)' })
    : undefined;

  return (
    <span 
      className={isPdf ? '' : `px-2.5 py-0.5 font-black uppercase tracking-[0.15em] border whitespace-nowrap rounded-tag text-[9px] ${
        isPaid 
          ? 'bg-status-success/10 text-status-success border-status-success/30 shadow-status-success/5' 
          : 'bg-status-warning/10 text-status-warning border-status-warning/30'
      }`}
      style={isPdf ? { 
        ...style, 
        borderRadius: '6px', 
        fontSize: '9px',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        padding: '4px 10px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        fontFamily: 'system-ui, sans-serif'
      } : style}
    >
      {upperStatus}
    </span>
  );
};
