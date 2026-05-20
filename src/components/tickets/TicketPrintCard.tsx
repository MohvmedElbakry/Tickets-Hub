import React from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { Order } from '../../types';
import { formatEventTime } from '../../lib/utils';
import { TicketQRSection } from './TicketQRSection';
import { TicketStatusBadge } from './TicketStatusBadge';
import { formatDate } from '../../lib/dateFormat';

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

  const isPaid = order.is_paid || order.order_status === 'paid';
  const event = order.event;
  const orderStatus = (order.order_status || 'pending').toUpperCase();

  return (
    <div 
      className="border rounded-[24px] overflow-hidden relative bg-[#0A0F0E] border-[#24302D] w-[500px] shadow-2xl"
      style={{ minHeight: '400px' }}
    >
      {/* Cinematic Top Border */}
      <div 
        className={`absolute top-0 left-0 w-full h-2 ${isPaid ? 'bg-[#00C9B1]' : 'bg-[#F59E0B]'}`}
      ></div>
      
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#00C9B1]/5 via-transparent to-[#8B5CF6]/5 pointer-events-none"></div>

      <div className="relative flex p-10 gap-10 items-stretch">
        
        {/* Left Side: QR Code Area */}
        <div className="flex flex-col items-center justify-center gap-4 shrink-0">
          <TicketQRSection 
            qrData={qrData}
            qrVisible={qrVisible}
            qrReason={qrReason}
            isPaid={isPaid}
            isPdf={true}
          />
          <div className="text-center">
            <p className="opacity-60 text-[10px] font-black uppercase tracking-widest text-[#A7B5B2]">Order Reference</p>
            <p className="font-mono font-bold text-[12px] text-[#00C9B1]">#{order.id}</p>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="w-px bg-[#24302D]"></div>

        {/* Right Side: Event & Attendee Info */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Header Area */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <TicketStatusBadge status={isPaid ? 'CONFIRMED' : orderStatus} isPdf={true} />
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#A7B5B2]">Access Credential</p>
            </div>
            <div className="text-right flex flex-col gap-1">
               <p className="text-[10px] font-black uppercase tracking-widest text-[#A7B5B2]">Event ID</p>
               <p className="font-mono font-bold text-[12px] text-[#F3F7F6]">E-{event?.id || '---'}</p>
            </div>
          </div>

          {/* Event Identity */}
          <div className="flex flex-col gap-2">
            <h2 className="leading-tight font-black tracking-tight text-[24px] text-[#F3F7F6]">
              {event?.title || 'Unknown Event'}
            </h2>
            
            {/* Meta Items - ENFORCED SEPARATE ROWS */}
            <div className="flex flex-col gap-3 mt-1">
              <div className="flex items-center gap-3 font-bold text-[11px] text-[#A7B5B2]">
                <Calendar size={14} className="text-[#00C9B1] shrink-0" />
                <span>{event?.event_date ? formatDate(event.event_date) : 'Date TBD'}</span>
              </div>
              <div className="flex items-center gap-3 font-bold text-[11px] text-[#A7B5B2]">
                <Clock size={14} className="text-[#00C9B1] shrink-0" />
                <span>{formatEventTime(event?.event_date || event?.date, event?.event_time || event?.time)}</span>
              </div>
              <div className="flex items-center gap-3 font-bold text-[11px] text-[#A7B5B2]">
                <MapPin size={14} className="text-[#00C9B1] shrink-0" />
                <span>{event?.location || 'Location TBD'}</span>
              </div>
            </div>
          </div>

          {/* Attendee / Tickets Section */}
          <div className="flex flex-col pt-6 border-t gap-3 border-[#24302D]">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#A7B5B2]">Entry Details</p>
            <div className="flex flex-col gap-3">
              {(order.items || []).slice(0, 3).map((item: any, idx) => (
                <div 
                  key={item.id || idx} 
                  className="flex items-center gap-3 p-3 border rounded-[12px] bg-[#161F1D] border-[#24302D]"
                >
                  <div className="flex items-center justify-center font-black shrink-0 w-8 h-8 rounded-[8px] text-[10px] bg-[#00C9B1]/10 text-[#00C9B1]">
                    {idx + 1}
                  </div>
                  <div className="flex flex-col gap-0 overflow-hidden">
                    <p className="text-[12px] font-bold truncate text-[#F3F7F6]">
                      {item.holder_name || item.name || 'Attendee'}
                    </p>
                    <p className="font-bold uppercase tracking-tighter truncate text-[9px] text-[#A7B5B2]">
                      {item.ticket_type?.name || 'Ticket'}
                    </p>
                  </div>
                </div>
              ))}
              {order.items && order.items.length > 3 && (
                <p className="text-[9px] text-[#A7B5B2] italic">
                  + {order.items.length - 3} more attendees included
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-10 py-5 border-t flex justify-between items-center bg-[#101716] border-[#24302D]">
        <div className="flex flex-col gap-1">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] leading-none text-[#A7B5B2]">Authentication Seal</p>
          <p className="font-mono font-bold truncate text-[10px] text-[#00C9B1]/40 max-w-[200px]">
            SECURE-AUTH-{order.qr_code_token || 'PENDING'}
          </p>
        </div>
        <div className="flex items-center gap-2 opacity-60">
           <span className="text-[9px] font-black leading-none text-[#A7B5B2]">POWERED BY</span>
           <span className="font-black tracking-tighter text-[11px] text-[#F3F7F6]">TICKETS<span className="text-[#00C9B1]">HUB</span></span>
        </div>
      </div>
    </div>
  );
};
