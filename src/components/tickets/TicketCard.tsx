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
      borderRadius: '20px',
    },
    topBorder: {
      backgroundColor: isPaid ? '#00C9B1' : '#E8A020',
    },
    textPrimary: { 
      color: '#E8F5F3',
      fontFamily: '"DM Sans", sans-serif'
    },
    textHeading: {
      color: '#E8F5F3',
      fontFamily: '"Playfair Display", serif',
      fontSize: '2rem',
      fontWeight: '700',
      letterSpacing: '-0.01em',
      lineHeight: '1.3'
    },
    textMuted: { 
      color: '#7AADA6',
      fontFamily: '"DM Sans", sans-serif'
    },
    textLabel: {
      color: '#7AADA6',
      fontFamily: '"DM Mono", monospace',
      fontSize: '10px',
      fontWeight: '900',
      letterSpacing: '0.1em',
      textTransform: 'uppercase' as const
    },
    teal: { color: '#00C9B1' },
    tealLight: { color: '#4DDECF' },
    bgElevated: { backgroundColor: '#111918' },
    bgBorder: { backgroundColor: '#1A2422' },
    itemContainer: {
      backgroundColor: 'rgba(30, 45, 43, 0.3)',
      borderColor: 'rgba(26, 36, 34, 0.2)',
      borderRadius: '16px'
    },
    itemIcon: {
      backgroundColor: 'rgba(0, 201, 177, 0.1)',
      color: '#00C9B1',
      borderRadius: '16px'
    },
    footerSize: {
       fontSize: '9px',
       fontWeight: '900'
    },
    footer: {
       backgroundColor: 'rgba(30, 45, 43, 0.5)',
       borderColor: 'rgba(26, 36, 34, 0.6)'
    },
    authSeal: {
      color: 'rgba(0, 201, 177, 0.4)',
      fontFamily: '"DM Mono", monospace'
    }
  } : null;

  return (
    <div 
      id={`ticket-card-${order.id}`}
      className={`border overflow-hidden relative ${isPdf ? 'w-[500px]' : 'rounded-card-xl bg-bg-page border-bg-border w-full shadow-ticket hover:shadow-card-glow transition-all duration-slow'}`}
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
            <p className={`opacity-60 ${isPdf ? '' : 'text-[10px] font-black uppercase tracking-widest text-text-muted'}`} style={styles?.textLabel}>Order Reference</p>
            <p className={`font-mono font-bold ${isPdf ? '' : 'text-body-xs text-teal'}`} style={styles?.teal}>#{order.id}</p>
          </div>
        </div>

        {/* Divider for PDF consistency */}
        <div className={`hidden md:block w-px ${isPdf ? 'block' : 'bg-gradient-to-b from-transparent via-bg-border to-transparent'}`} style={isPdf ? { backgroundColor: '#1A2422' } : undefined}></div>
        <div className={`md:hidden w-full h-px ${isPdf ? 'hidden' : 'bg-gradient-to-r from-transparent via-bg-border to-transparent'}`}></div>

        {/* Right Side: Event & Attendee Info */}
        <div className={`flex-1 flex flex-col ${isPdf ? 'gap-6' : 'gap-6'}`}>
          {/* Header Area */}
          <div className="flex justify-between items-start">
            <div className={`flex flex-col ${isPdf ? 'gap-1' : 'content-stack gap-1'}`}>
              <TicketStatusBadge status={isPaid ? 'CONFIRMED' : orderStatus} isPdf={isPdf} />
              <p className={`mt-1 ${isPdf ? '' : 'text-[10px] font-black uppercase tracking-widest text-text-muted'}`} style={styles?.textLabel}>Access Credential</p>
            </div>
            <div className={`text-right flex flex-col ${isPdf ? 'gap-1' : 'content-stack gap-1'}`}>
               <p className={`${isPdf ? '' : 'text-[10px] font-black uppercase tracking-widest text-text-muted'}`} style={styles?.textLabel}>Event ID</p>
               <p className={`font-mono font-bold ${isPdf ? '' : 'text-body-xs text-text-primary'}`} style={styles?.textPrimary}>E-{event?.id || '---'}</p>
            </div>
          </div>

          {/* Event Identity */}
          <div className={`flex flex-col ${isPdf ? 'gap-1' : 'content-stack gap-1'}`}>
            <h2 
              className={`leading-tight font-black tracking-tight line-clamp-2 ${isPdf ? '' : 'text-h3 text-text-primary group-hover:text-teal transition-colors duration-base'}`}
              style={styles?.textHeading}
            >
              {event?.title || 'Unknown Event'}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className={`flex items-center gap-1.5 font-bold ${isPdf ? '' : 'text-body-xs text-text-muted'}`} style={styles?.textMuted}>
                <Calendar size={12} className={`${isPdf ? '' : 'text-teal'}`} style={styles?.teal} />
                {event?.event_date || 'Date TBD'}
              </span>
              <span className={`flex items-center gap-1.5 font-bold ${isPdf ? '' : 'text-body-xs text-text-muted'}`} style={styles?.textMuted}>
                <Clock size={12} className={`${isPdf ? '' : 'text-teal'}`} style={styles?.teal} />
                {formatEventTime(event?.event_date || event?.date, event?.event_time || event?.time)}
              </span>
            </div>
            <span className={`flex items-center gap-1.5 font-bold mt-1 ${isPdf ? '' : 'text-body-xs text-text-muted'}`} style={styles?.textMuted}>
              <MapPin size={12} className={`${isPdf ? '' : 'text-teal'}`} style={styles?.teal} />
              {event?.location || 'Location TBD'}
            </span>
          </div>

          {/* Attendee / Tickets Section */}
          <div className={`flex flex-col pt-4 border-t ${isPdf ? '' : 'content-stack gap-3 border-bg-border/40'}`} style={isPdf ? { borderColor: 'rgba(26, 36, 34, 0.6)', gap: '12px' } : undefined}>
            <p className={`${isPdf ? '' : 'text-[10px] font-black uppercase tracking-widest text-text-muted'}`} style={styles?.textLabel}>Entry Details</p>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2 custom-scrollbar ${isPdf ? 'grid-cols-1 overflow-visible pr-0' : 'max-h-32 overflow-y-auto'}`}>
              {(order.items || []).map((item: any, idx) => (
                <div 
                  key={item.id || idx} 
                  className={`flex items-center gap-3 p-2.5 border ${isPdf ? '' : 'rounded-card bg-bg-elevated/30 border-bg-border/20 group/holder hover:border-teal/30 transition-colors'}`}
                  style={styles?.itemContainer}
                >
                  <div 
                    className={`flex items-center justify-center font-black shrink-0 ${isPdf ? '' : 'w-8 h-8 rounded-card text-[10px] bg-teal/10 text-teal'}`}
                    style={styles?.itemIcon}
                  >
                    {idx + 1}
                  </div>
                  <div className={`flex flex-col gap-0 overflow-hidden ${isPdf ? '' : 'content-stack'}`}>
                    <p 
                      className={`text-[11px] font-bold line-clamp-1 ${isPdf ? '' : 'text-text-primary group-hover/holder:text-teal transition-colors'}`}
                      style={styles?.textPrimary}
                    >
                      {item.name || 'Attendee'}
                    </p>
                    <p className={`font-bold uppercase tracking-tighter line-clamp-1 ${isPdf ? '' : 'text-[9px] text-text-muted'}`} style={styles?.textMuted}>{item.ticket_type?.name || 'Ticket'}</p>
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
        <div className={`flex flex-col ${isPdf ? 'gap-1' : 'content-stack gap-1'}`}>
          <p className={`${isPdf ? '' : 'text-[8px] font-black uppercase tracking-[0.2em] leading-none text-text-muted'}`} style={styles?.textLabel}>Authentication Seal</p>
          <p 
            className={`font-mono font-bold truncate ${isPdf ? 'max-w-none' : 'text-[10px] text-teal/40 max-w-[200px]'}`}
            style={styles?.authSeal}
          >
            SECURE-AUTH-{order.qr_code_token || 'PENDING'}
          </p>
        </div>
        <div className={`flex items-center gap-2 ${isPdf ? '' : 'grayscale hover:grayscale-0 transition-all opacity-40 hover:opacity-100'}`}>
           <span className={`${isPdf ? '' : 'text-[9px] font-black leading-none text-text-muted'}`} style={styles?.textLabel}>POWERED BY</span>
           <span className={`font-black tracking-tighter ${isPdf ? '' : 'text-[11px] text-text-primary'}`} style={styles?.textPrimary}>TICKETS<span className={`${isPdf ? '' : 'text-teal'}`} style={styles?.teal}>HUB</span></span>
        </div>
      </div>
    </div>
  );
};
