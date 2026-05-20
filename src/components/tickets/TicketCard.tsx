import React from 'react';
import { Calendar, MapPin, Ticket, Clock, User } from 'lucide-react';
import { Order } from '../../types';
import { formatEventTime } from '../../lib/utils';
import { TicketQRSection } from './TicketQRSection';
import { TicketStatusBadge } from './TicketStatusBadge';
import { formatDate } from '../../lib/dateFormat';

interface TicketCardProps {
  order: Order;
  qrData?: string;
  qrVisible?: boolean;
  qrReason?: string;
  loadingQr?: boolean;
  isPdf?: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  order,
  qrData,
  qrVisible,
  qrReason,
  loadingQr,
  isPdf = false
}) => {
  if (!order) return null;

  const isPaid = order.is_paid || order.order_status === 'paid';
  const event = order.event;
  const orderStatus = (order.order_status || 'pending').toUpperCase();

  // TODO: Refactor 'isPdf' to 'isPrint' to support server-side PDF layouts
  // The old inline style-based rasterization pipeline is deprecated.
  // For now, we render the standard UI.

  return (
    <div 
      id={`ticket-card-${order.id}`}
      className="border rounded-card-xl overflow-hidden relative bg-bg-page border-bg-border w-full shadow-ticket hover:shadow-card-glow transition-all duration-slow"
    >
      {/* Cinematic Top Border */}
      <div 
        className={`absolute top-0 left-0 w-full h-1.5 ${isPaid ? 'bg-status-success animate-pulse-glow shadow-status-success/30 shadow-xl' : 'bg-status-warning'}`}
      ></div>
      
      {/* Glassy Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal/5 via-transparent to-purple-500/5 pointer-events-none"></div>

      <div 
        className="relative flex flex-col md:flex-row p-6 md:p-8 gap-8 items-start md:items-stretch"
      >
        
        {/* Left Side: QR Code Area */}
        <div 
          className="flex flex-col items-center justify-center gap-4 group/qr"
        >
          <TicketQRSection 
            qrData={qrData}
            qrVisible={qrVisible}
            qrReason={qrReason}
            loadingQr={loadingQr}
            isPaid={isPaid}
            isPdf={isPdf}
          />
          <div className="text-center">
            <p className="opacity-60 text-[10px] font-black uppercase tracking-widest text-text-muted">Order Reference</p>
            <p className="font-mono font-bold text-body-xs text-teal">#{order.id}</p>
          </div>
        </div>

        {/* Divider */}
        <div 
          className="hidden md:block w-px bg-gradient-to-b from-transparent via-bg-border to-transparent" 
        ></div>

        {/* Right Side: Event & Attendee Info */}
        <div 
          className="flex-1 flex flex-col gap-6"
        >
          {/* Header Area */}
          <div 
            className="flex justify-between items-start"
          >
            <div 
              className="flex flex-col content-stack gap-1"
            >
              <TicketStatusBadge status={isPaid ? 'CONFIRMED' : orderStatus} isPdf={isPdf} />
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-text-muted">Access Credential</p>
            </div>
            <div 
              className="text-right flex flex-col content-stack gap-1"
            >
               <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Event ID</p>
               <p className="font-mono font-bold text-body-xs text-text-primary">E-{event?.id || '---'}</p>
            </div>
          </div>

          {/* Event Identity */}
          <div 
            className="flex flex-col content-stack gap-1"
          >
            <h2 
              className="leading-tight font-black tracking-tight line-clamp-2 text-h3 text-text-primary group-hover:text-teal transition-colors duration-base"
            >
              {event?.title || 'Unknown Event'}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <div 
                className="flex items-center gap-1.5 font-bold text-body-xs text-text-muted"
              >
                <Calendar size={12} className="text-teal shrink-0" />
                <span>{event?.event_date ? formatDate(event.event_date) : 'Date TBD'}</span>
              </div>
              <div 
                className="flex items-center gap-1.5 font-bold text-body-xs text-text-muted"
              >
                <Clock size={12} className="text-teal shrink-0" />
                <span>{formatEventTime(event?.event_date || event?.date, event?.event_time || event?.time)}</span>
              </div>
            </div>
            <div 
              className="flex items-center gap-1.5 font-bold mt-1 text-body-xs text-text-muted"
            >
              <MapPin size={12} className="text-teal shrink-0" />
              <span>{event?.location || 'Location TBD'}</span>
            </div>
          </div>

          {/* Attendee / Tickets Section */}
          <div 
            className="flex flex-col pt-4 border-t content-stack gap-3 border-bg-border/40" 
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Entry Details</p>
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2 custom-scrollbar max-h-32 overflow-y-auto"
            >
              {(order.items || []).map((item: any, idx) => (
                <div 
                  key={item.id || idx} 
                  className="flex items-center gap-3 p-2.5 border rounded-card bg-bg-elevated/30 border-bg-border/20 group/holder hover:border-teal/30 transition-colors"
                >
                  <div 
                    className="flex items-center justify-center font-black shrink-0 w-8 h-8 rounded-card text-[10px] bg-teal/10 text-teal"
                  >
                    {idx + 1}
                  </div>
                  <div 
                    className="flex flex-col gap-0 overflow-hidden content-stack"
                  >
                    <p 
                      className="text-[11px] font-bold line-clamp-1 text-text-primary group/holder:text-teal transition-colors"
                    >
                      {item.name || 'Attendee'}
                    </p>
                    <p className="font-bold uppercase tracking-tighter line-clamp-1 text-[9px] text-text-muted">{item.ticket_type?.name || 'Ticket'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Authentication Security Seal */}
      <div 
        className="px-8 py-3 border-t flex justify-between items-center overflow-hidden bg-bg-elevated/50 border-bg-border/60"
      >
        <div 
          className="flex flex-col content-stack gap-1"
        >
          <p className="text-[8px] font-black uppercase tracking-[0.2em] leading-none text-text-muted">Authentication Seal</p>
          <p 
            className="font-mono font-bold truncate text-[10px] text-teal/40 max-w-[200px]"
          >
            SECURE-AUTH-{order.qr_code_token || 'PENDING'}
          </p>
        </div>
        <div 
          className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-40 hover:opacity-100"
        >
           <span className="text-[9px] font-black leading-none text-text-muted">POWERED BY</span>
           <span className="font-black tracking-tighter text-[11px] text-text-primary">TICKETS<span className="text-teal">HUB</span></span>
        </div>
      </div>
    </div>
  );
};
