import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TicketPrintCard } from '../components/tickets/TicketPrintCard';
import { Order } from '../types';
import { useOrder } from '../hooks/useOrder';
import { useQRStatus } from '../hooks/useQRStatus';

const TicketPrintPage: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const { order, loading: loadingOrder, error } = useOrder(publicId);
  const isPaid = order?.is_paid || order?.order_status === 'paid';
  
  const { 
    qrStatus, 
    loading: loadingQr 
  } = useQRStatus(
    order?.public_id || order?.id?.toString(), 
    isPaid
  );

  if (loadingOrder) {
    return (
      <div className="min-h-screen bg-[#0A0F0E] flex items-center justify-center text-[#A7B5B2] font-mono">
        LOADING ORDER DATA...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0A0F0E] flex items-center justify-center text-status-error font-mono">
        ERROR: ORDER NOT FOUND
      </div>
    );
  }

  return (
    <div className="bg-[#0A0F0E] inline-block">
      <div id="print-content" className="relative">
        <TicketPrintCard 
          order={order}
          qrData={qrStatus?.qr_data}
          qrVisible={qrStatus?.visible}
          qrReason={qrStatus?.reason}
        />
      </div>
    </div>
  );
};

export default TicketPrintPage;
