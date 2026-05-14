import React from 'react';
import { Calendar, MapPin, Ticket, Clock, User } from 'lucide-react';
import { Order } from '../../types';
import { formatEventTime } from '../../lib/utils';
import { TicketQRSection } from './TicketQRSection';
import { TicketStatusBadge } from './TicketStatusBadge';

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

  return (
    <div 
      id={`ticket-card-${order.id}`}
      className={`bg-bg-page border border-bg-border rounded-card-xl overflow-hidden relative ${isPdf ? 'w-[500px] border-[#1A2422] !bg-[#0A0F0E] text-[#E8F5F3]' : 'w-full shadow-ticket hover:shadow-card-glow transition-all duration-slow'}`}
    >
      {/* Cinematic Top Border */}
      <div className={`absolute top-0 left-0 w-full h-1.5 ${isPaid ? `bg-status-success ${isPdf ? '!bg-[#00C9B1]' : 'animate-pulse-glow shadow-status-success/30 shadow-xl'}` : 'bg-status-warning'}`}></div>
      
      {/* Glassy Background Effect */}
      {!isPdf && <div className="absolute inset-0 bg-gradient-to-br from-teal/5 via-transparent to-purple-500/5 pointer-events-none"></div>}

      <div className={`relative flex flex-col md:flex-row p-6 md:p-8 gap-8 items-start md:items-stretch ${isPdf ? 'flex-row !gap-8' : ''}`}>
        
        {/* Left Side: QR Code Area */}
        <div className={`flex flex-col items-center justify-center gap-4 ${isPdf ? 'w-40 shrink-0' : 'group/qr'}`}>
          <TicketQRSection 
            qrData={qrData}
            qrVisible={qrVisible}
            qrReason={qrReason}
            loadingQr={loadingQr}
            isPaid={isPaid}
            isPdf={isPdf}
          />
          <div className="text-center">
            <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 ${isPdf ? 'text-[#7AADA6]' : 'text-text-muted'}`}>Order Reference</p>
            <p className={`text-body-xs font-mono font-bold ${isPdf ? 'text-[#00C9B1]' : 'text-teal'}`}>#{order.id}</p>
          </div>
        </div>

        {/* Divider for PDF consistency */}
        <div className={`hidden md:block w-px bg-gradient-to-b from-transparent via-bg-border to-transparent ${isPdf ? 'block !bg-[#1A2422]' : ''}`}></div>
        <div className={`md:hidden w-full h-px bg-gradient-to-r from-transparent via-bg-border to-transparent ${isPdf ? 'hidden' : ''}`}></div>

        {/* Right Side: Event & Attendee Info */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Header Area */}
          <div className="flex justify-between items-start">
            <div className="content-stack gap-1">
              <TicketStatusBadge status={isPaid ? 'CONFIRMED' : orderStatus} isPdf={isPdf} />
              <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isPdf ? 'text-[#7AADA6]' : 'text-text-muted'}`}>Access Credential</p>
            </div>
            <div className="text-right content-stack gap-1">
               <p className={`text-[10px] font-black uppercase tracking-widest ${isPdf ? 'text-[#7AADA6]' : 'text-text-muted'}`}>Event ID</p>
               <p className={`text-body-xs font-mono font-bold ${isPdf ? 'text-[#E8F5F3]' : 'text-text-primary'}`}>E-{event?.id || '---'}</p>
            </div>
          </div>

          {/* Event Identity */}
          <div className="content-stack gap-1">
            <h2 className={`text-h3 leading-tight font-black tracking-tight line-clamp-2 ${isPdf ? 'text-[#E8F5F3]' : 'group-hover:text-teal transition-colors duration-base'}`}>
              {event?.title || 'Unknown Event'}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className={`flex items-center gap-1.5 text-body-xs font-bold ${isPdf ? 'text-[#7AADA6]' : 'text-text-muted'}`}>
                <Calendar size={12} className={isPdf ? 'text-[#00C9B1]' : 'text-teal'} />
                {event?.event_date || 'Date TBD'}
              </span>
              <span className={`flex items-center gap-1.5 text-body-xs font-bold ${isPdf ? 'text-[#7AADA6]' : 'text-text-muted'}`}>
                <Clock size={12} className={isPdf ? 'text-[#00C9B1]' : 'text-teal'} />
                {formatEventTime(event?.event_date || event?.date, event?.event_time || event?.time)}
              </span>
            </div>
            <span className={`flex items-center gap-1.5 text-body-xs font-bold mt-1 ${isPdf ? 'text-[#7AADA6]' : 'text-text-muted'}`}>
              <MapPin size={12} className={isPdf ? 'text-[#00C9B1]' : 'text-teal'} />
              {event?.location || 'Location TBD'}
            </span>
          </div>

          {/* Attendee / Tickets Section */}
          <div className={`content-stack gap-3 pt-4 border-t ${isPdf ? 'border-[#1A2422]/60' : 'border-bg-border/40'}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${isPdf ? 'text-[#7AADA6]' : 'text-text-muted'}`}>Entry Details</p>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2 custom-scrollbar ${isPdf ? 'grid-cols-1 overflow-visible pr-0' : 'max-h-32 overflow-y-auto'}`}>
              {(order.items || []).map((item: any, idx) => (
                <div key={item.id || idx} className={`flex items-center gap-3 p-2.5 rounded-card border ${isPdf ? 'bg-[#111918] border-[#1A2422]' : 'bg-bg-elevated/30 border-bg-border/20 group/holder hover:border-teal/30 transition-colors'}`}>
                  <div className={`w-8 h-8 rounded-card flex items-center justify-center text-[10px] font-black shrink-0 ${isPdf ? 'bg-[#00C9B1]/10 text-[#00C9B1]' : 'bg-teal/10 text-teal'}`}>
                    {idx + 1}
                  </div>
                  <div className="content-stack gap-0 overflow-hidden">
                    <p className={`text-[11px] font-bold line-clamp-1 ${isPdf ? 'text-[#E8F5F3]' : 'text-text-primary group-hover/holder:text-teal transition-colors'}`}>{item.name || 'Attendee'}</p>
                    <p className={`text-[9px] font-bold uppercase tracking-tighter line-clamp-1 ${isPdf ? 'text-[#7AADA6]' : 'text-text-muted'}`}>{item.ticket_type?.name || 'Ticket'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Authentication Security Seal */}
      <div className={`px-8 py-3 border-t flex justify-between items-center overflow-hidden ${isPdf ? 'bg-[#111918] border-[#1A2422]' : 'bg-bg-elevated/50 border-bg-border/60'}`}>
        <div className="content-stack gap-1">
          <p className={`text-[8px] font-black uppercase tracking-[0.2em] leading-none ${isPdf ? 'text-[#7AADA6]' : 'text-text-muted'}`}>Authentication Seal</p>
          <p className={`text-[10px] font-mono font-bold truncate ${isPdf ? 'max-w-none text-[#00C9B1]/60' : 'max-w-[200px] text-teal/40'}`}>
            SECURE-AUTH-{order.qr_code_token || 'PENDING'}
          </p>
        </div>
        <div className={`flex items-center gap-2 ${isPdf ? '' : 'grayscale hover:grayscale-0 transition-all opacity-40 hover:opacity-100'}`}>
           <span className={`text-[9px] font-black leading-none ${isPdf ? 'text-[#7AADA6]' : 'text-text-muted'}`}>POWERED BY</span>
           <span className={`text-[11px] font-black tracking-tighter ${isPdf ? 'text-[#E8F5F3]' : 'text-text-primary'}`}>TICKETS<span className={isPdf ? 'text-[#00C9B1]' : 'text-teal'}>HUB</span></span>
        </div>
      </div>
    </div>
  );
};
