import React from 'react';

interface TicketStatusBadgeProps {
  status: string;
  isPdf?: boolean;
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ status = 'PENDING', isPdf = false }) => {
  const upperStatus = (status || 'PENDING').toUpperCase();
  const isPaid = upperStatus === 'CONFIRMED' || upperStatus === 'PAID' || upperStatus === 'APPROVED';
  
  // TODO: Refactor 'isPdf' to 'isPrint' to support server-side PDF layouts
  // The legacy inline styling pipeline was removed.

  return (
    <span 
      className={`px-2.5 py-0.5 font-black uppercase tracking-[0.15em] border whitespace-nowrap rounded-[4px] text-[9px] ${
        isPdf
          ? (isPaid ? 'bg-[#00C9B1]/10 text-[#00C9B1] border-[#00C9B1]/30' : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30')
          : (isPaid 
              ? 'bg-status-success/10 text-status-success border-status-success/30 shadow-status-success/5' 
              : 'bg-status-warning/10 text-status-warning border-status-warning/30')
      }`}
    >
      {upperStatus}
    </span>
  );
};
