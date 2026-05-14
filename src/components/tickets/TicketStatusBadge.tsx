import React from 'react';

interface TicketStatusBadgeProps {
  status: string;
  isPdf?: boolean;
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ status = 'PENDING', isPdf = false }) => {
  const upperStatus = (status || 'PENDING').toUpperCase();
  const isPaid = upperStatus === 'CONFIRMED' || upperStatus === 'PAID' || upperStatus === 'APPROVED';
  
  return (
    <span className={`px-2.5 py-0.5 rounded-tag text-[9px] font-black uppercase tracking-[0.15em] border whitespace-nowrap ${
      isPaid 
        ? 'bg-status-success/10 text-status-success border-status-success/30 shadow-status-success/5' 
        : 'bg-status-warning/10 text-status-warning border-status-warning/30'
    }`}>
      {upperStatus}
    </span>
  );
};
