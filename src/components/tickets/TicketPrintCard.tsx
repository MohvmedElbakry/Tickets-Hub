import React from 'react';
import { Order } from '../../types';
import { TicketCard } from './TicketCard';

interface TicketPrintCardProps {
  order: Order;
  qrData?: string;
  qrVisible?: boolean;
  qrReason?: string;
}

export const TicketPrintCard: React.FC<TicketPrintCardProps> = ({
  order,
  qrData,
  qrVisible,
  qrReason,
}) => {
  if (!order) return null;

  return (
    <TicketCard 
      order={order}
      qrData={qrData}
      qrVisible={qrVisible}
      qrReason={qrReason}
      isPdf={true}
    />
  );
};
