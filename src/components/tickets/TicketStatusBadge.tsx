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
        ? `${isPdf ? 'bg-[#00C9B1]/10 text-[#00C9B1] border-[#00C9B1]/30' : 'bg-status-success/10 text-status-success border-status-success/30 shadow-status-success/5'}` 
        : `${isPdf ? 'bg-[#E8A020]/10 text-[#E8A020] border-[#E8A020]/30' : 'bg-status-warning/10 text-status-warning border-status-warning/30'}`
    }`}>
      {upperStatus}
    </span>
  );
};
