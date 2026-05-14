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

  const styles = isPdf ? {
    card: {
      backgroundColor: '#0A0F0E',
      borderColor: '#1A2422',
      color: '#E8F5F3',
    },
    topBorder: {
      backgroundColor: isPaid ? '#00C9B1' : '#E8A020',
    },
    textPrimary: { color: '#E8F5F3' },
    textMuted: { color: '#7AADA6' },
    teal: { color: '#00C9B1' },
    tealLight: { color: '#4DDECF' },
    bgElevated: { backgroundColor: '#111918' },
    bgBorder: { backgroundColor: '#1A2422' },
    divider: {
      backgroundImage: 'linear-gradient(to bottom, transparent, #1A2422, transparent)',
    },
    itemContainer: {
      backgroundColor: 'rgba(30, 45, 43, 0.3)',
      borderColor: 'rgba(26, 36, 34, 0.2)'
    },
    itemIcon: {
      backgroundColor: 'rgba(0, 201, 177, 0.1)',
      color: '#00C9B1'
    },
    footer: {
       backgroundColor: 'rgba(30, 45, 43, 0.5)',
       borderColor: 'rgba(26, 36, 34, 0.6)'
    },
    authSeal: {
      color: 'rgba(0, 201, 177, 0.4)'
    }
  } : null;

  return (
    <div 
      id={`ticket-card-${order.id}`}
      className={`border rounded-card-xl overflow-hidden relative ${isPdf ? 'w-[500px]' : 'bg-bg-page border-bg-border w-full shadow-ticket hover:shadow-card-glow transition-all duration-slow'}`}
      style={styles?.card}
    >
      {/* Cinematic Top Border */}
      <div 
        className={`absolute top-0 left-0 w-full h-1.5 ${isPdf ? '' : (isPaid ? 'bg-status-success animate-pulse-glow shadow-status-success/30 shadow-xl' : 'bg-status-warning')}`}
        style={styles?.topBorder}
      ></div>
      
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
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 text-text-muted" style={styles?.textMuted}>Order Reference</p>
            <p className="text-body-xs font-mono font-bold text-teal" style={styles?.teal}>#{order.id}</p>
          </div>
        </div>

        {/* Divider for PDF consistency */}
        <div className={`hidden md:block w-px ${isPdf ? 'block' : 'bg-gradient-to-b from-transparent via-bg-border to-transparent'}`} style={isPdf ? { backgroundColor: '#1A2422' } : undefined}></div>
        <div className={`md:hidden w-full h-px bg-gradient-to-r from-transparent via-bg-border to-transparent ${isPdf ? 'hidden' : ''}`}></div>

        {/* Right Side: Event & Attendee Info */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Header Area */}
          <div className="flex justify-between items-start">
            <div className="content-stack gap-1">
              <TicketStatusBadge status={isPaid ? 'CONFIRMED' : orderStatus} isPdf={isPdf} />
              <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-text-muted" style={styles?.textMuted}>Access Credential</p>
            </div>
            <div className="text-right content-stack gap-1">
               <p className="text-[10px] font-black uppercase tracking-widest text-text-muted" style={styles?.textMuted}>Event ID</p>
               <p className="text-body-xs font-mono font-bold text-text-primary" style={styles?.textPrimary}>E-{event?.id || '---'}</p>
            </div>
          </div>

          {/* Event Identity */}
          <div className="content-stack gap-1">
            <h2 
              className={`text-h3 leading-tight font-black tracking-tight line-clamp-2 text-text-primary ${isPdf ? '' : 'group-hover:text-teal transition-colors duration-base'}`}
              style={styles?.textPrimary}
            >
              {event?.title || 'Unknown Event'}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5 text-body-xs font-bold text-text-muted" style={styles?.textMuted}>
                <Calendar size={12} className="text-teal" style={styles?.teal} />
                {event?.event_date || 'Date TBD'}
              </span>
              <span className="flex items-center gap-1.5 text-body-xs font-bold text-text-muted" style={styles?.textMuted}>
                <Clock size={12} className="text-teal" style={styles?.teal} />
                {formatEventTime(event?.event_date || event?.date, event?.event_time || event?.time)}
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-body-xs font-bold mt-1 text-text-muted" style={styles?.textMuted}>
              <MapPin size={12} className="text-teal" style={styles?.teal} />
              {event?.location || 'Location TBD'}
            </span>
          </div>

          {/* Attendee / Tickets Section */}
          <div className={`content-stack gap-3 pt-4 border-t ${isPdf ? '' : 'border-bg-border/40'}`} style={isPdf ? { borderColor: 'rgba(26, 36, 34, 0.6)' } : undefined}>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted" style={styles?.textMuted}>Entry Details</p>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2 custom-scrollbar ${isPdf ? 'grid-cols-1 overflow-visible pr-0' : 'max-h-32 overflow-y-auto'}`}>
              {(order.items || []).map((item: any, idx) => (
                <div 
                  key={item.id || idx} 
                  className={`flex items-center gap-3 p-2.5 rounded-card border ${isPdf ? '' : 'bg-bg-elevated/30 border-bg-border/20 group/holder hover:border-teal/30 transition-colors'}`}
                  style={styles?.itemContainer}
                >
                  <div 
                    className="w-8 h-8 rounded-card flex items-center justify-center text-[10px] font-black shrink-0"
                    style={styles?.itemIcon}
                  >
                    {idx + 1}
                  </div>
                  <div className="content-stack gap-0 overflow-hidden">
                    <p 
                      className={`text-[11px] font-bold line-clamp-1 text-text-primary ${isPdf ? '' : 'group-hover/holder:text-teal transition-colors'}`}
                      style={styles?.textPrimary}
                    >
                      {item.name || 'Attendee'}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-tighter line-clamp-1 text-text-muted" style={styles?.textMuted}>{item.ticket_type?.name || 'Ticket'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Authentication Security Seal */}
      <div 
        className={`px-8 py-3 border-t flex justify-between items-center overflow-hidden ${isPdf ? '' : 'bg-bg-elevated/50 border-bg-border/60'}`}
        style={styles?.footer}
      >
        <div className="content-stack gap-1">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] leading-none text-text-muted" style={styles?.textMuted}>Authentication Seal</p>
          <p 
            className={`text-[10px] font-mono font-bold truncate ${isPdf ? 'max-w-none' : 'text-teal/40 max-w-[200px]'}`}
            style={styles?.authSeal}
          >
            SECURE-AUTH-{order.qr_code_token || 'PENDING'}
          </p>
        </div>
        <div className={`flex items-center gap-2 ${isPdf ? '' : 'grayscale hover:grayscale-0 transition-all opacity-40 hover:opacity-100'}`}>
           <span className="text-[9px] font-black leading-none text-text-muted" style={styles?.textMuted}>POWERED BY</span>
           <span className="text-[11px] font-black tracking-tighter text-text-primary" style={styles?.textPrimary}>TICKETS<span className="text-teal" style={styles?.teal}>HUB</span></span>
        </div>
      </div>
    </div>
  );
};
