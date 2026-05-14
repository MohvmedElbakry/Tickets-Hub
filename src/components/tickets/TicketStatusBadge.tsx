import React from 'react';

interface TicketStatusBadgeProps {
  status: string;
  isPdf?: boolean;
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ status = 'PENDING', isPdf = false }) => {
  const upperStatus = (status || 'PENDING').toUpperCase();
  const isPaid = upperStatus === 'CONFIRMED' || upperStatus === 'PAID' || upperStatus === 'APPROVED';
  
  const style = isPdf ? (isPaid 
    ? { backgroundColor: 'rgba(0, 201, 177, 0.1)', color: '#00C9B1', borderColor: 'rgba(0, 201, 177, 0.3)' }
    : { backgroundColor: 'rgba(232, 160, 32, 0.1)', color: '#E8A020', borderColor: 'rgba(232, 160, 32, 0.3)' })
    : undefined;

  return (
    <span 
      className={`px-2.5 py-0.5 font-black uppercase tracking-[0.15em] border whitespace-nowrap ${
        isPdf ? '' : 'rounded-tag text-[9px] ' + (isPaid 
          ? 'bg-status-success/10 text-status-success border-status-success/30 shadow-status-success/5' 
          : 'bg-status-warning/10 text-status-warning border-status-warning/30')
      }`}
      style={isPdf ? { ...style, borderRadius: '6px', fontSize: '9px' } : style}
    >
      {upperStatus}
    </span>
  );
};
