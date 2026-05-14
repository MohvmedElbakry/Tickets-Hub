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
      className={isPdf ? '' : 'border rounded-card-xl overflow-hidden relative bg-bg-page border-bg-border w-full shadow-ticket hover:shadow-card-glow transition-all duration-slow'}
      style={isPdf ? { 
        ...styles?.card,
        width: '500px',
        display: 'block',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid #1A2422'
      } : styles?.card}
    >
      {/* Cinematic Top Border */}
      <div 
        className={isPdf ? '' : `absolute top-0 left-0 w-full h-1.5 ${isPaid ? 'bg-status-success animate-pulse-glow shadow-status-success/30 shadow-xl' : 'bg-status-warning'}`}
        style={isPdf ? {
          ...styles?.topBorder,
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '6px'
        } : styles?.topBorder}
      ></div>
      
      {/* Glassy Background Effect */}
      {!isPdf && <div className="absolute inset-0 bg-gradient-to-br from-teal/5 via-transparent to-purple-500/5 pointer-events-none"></div>}

      <div 
        className={isPdf ? '' : 'relative flex flex-col md:flex-row p-6 md:p-8 gap-8 items-start md:items-stretch'}
        style={isPdf ? {
          position: 'relative',
          display: 'flex',
          flexDirection: 'row',
          padding: '32px',
          gap: '32px',
          alignItems: 'stretch'
        } : undefined}
      >
        
        {/* Left Side: QR Code Area */}
        <div 
          className={isPdf ? '' : 'flex flex-col items-center justify-center gap-4 group/qr'}
          style={isPdf ? {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            width: '160px',
            flexShrink: 0
          } : undefined}
        >
          <TicketQRSection 
            qrData={qrData}
            qrVisible={qrVisible}
            qrReason={qrReason}
            loadingQr={loadingQr}
            isPaid={isPaid}
            isPdf={isPdf}
          />
          <div className={isPdf ? '' : 'text-center'} style={isPdf ? { textAlign: 'center' } : undefined}>
            <p className={isPdf ? '' : 'opacity-60 text-[10px] font-black uppercase tracking-widest text-text-muted'} style={styles?.textLabel}>Order Reference</p>
            <p className={isPdf ? '' : 'font-mono font-bold text-body-xs text-teal'} style={isPdf ? { ...styles?.teal, fontWeight: 700, marginTop: '4px' } : styles?.teal}>#{order.id}</p>
          </div>
        </div>

        {/* Divider for PDF consistency */}
        <div 
          className={isPdf ? '' : 'hidden md:block w-px bg-gradient-to-b from-transparent via-bg-border to-transparent'} 
          style={isPdf ? { 
            display: 'block',
            width: '1px',
            backgroundColor: '#1A2422'
          } : undefined}
        ></div>

        {/* Right Side: Event & Attendee Info */}
        <div 
          className={isPdf ? '' : 'flex-1 flex flex-col gap-6'}
          style={isPdf ? {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            minWidth: 0 // Prevent overflow
          } : undefined}
        >
          {/* Header Area */}
          <div 
            className={isPdf ? '' : 'flex justify-between items-start'}
            style={isPdf ? {
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            } : undefined}
          >
            <div 
              className={isPdf ? '' : 'flex flex-col content-stack gap-1'}
              style={isPdf ? {
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              } : undefined}
            >
              <TicketStatusBadge status={isPaid ? 'CONFIRMED' : orderStatus} isPdf={isPdf} />
              <p className={isPdf ? '' : 'mt-1 text-[10px] font-black uppercase tracking-widest text-text-muted'} style={isPdf ? { ...styles?.textLabel, marginTop: '4px' } : styles?.textLabel}>Access Credential</p>
            </div>
            <div 
              className={isPdf ? '' : 'text-right flex flex-col content-stack gap-1'}
              style={isPdf ? {
                textAlign: 'right',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                alignItems: 'flex-end'
              } : undefined}
            >
               <p className={isPdf ? '' : 'text-[10px] font-black uppercase tracking-widest text-text-muted'} style={styles?.textLabel}>Event ID</p>
               <p className={isPdf ? '' : 'font-mono font-bold text-body-xs text-text-primary'} style={isPdf ? { ...styles?.textPrimary, fontWeight: 700 } : styles?.textPrimary}>E-{event?.id || '---'}</p>
            </div>
          </div>

          {/* Event Identity */}
          <div 
            className={isPdf ? '' : 'flex flex-col content-stack gap-1'}
            style={isPdf ? {
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            } : undefined}
          >
            <h2 
              className={isPdf ? '' : 'leading-tight font-black tracking-tight line-clamp-2 text-h3 text-text-primary group-hover:text-teal transition-colors duration-base'}
              style={styles?.textHeading}
            >
              {event?.title || 'Unknown Event'}
            </h2>
            <div className={isPdf ? '' : 'flex flex-wrap gap-x-4 gap-y-1'} style={isPdf ? { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', columnGap: '16px', rowGap: '4px' } : undefined}>
              <div 
                className={isPdf ? '' : 'flex items-center gap-1.5 font-bold text-body-xs text-text-muted'}
                style={isPdf ? {
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '6px',
                  ...styles?.textMuted,
                  fontWeight: 700,
                  fontSize: '12px'
                } : styles?.textMuted}
              >
                <Calendar size={12} className={isPdf ? '' : 'text-teal'} style={isPdf ? styles?.teal : undefined} />
                <span>{event?.event_date || 'Date TBD'}</span>
              </div>
              <div 
                className={isPdf ? '' : 'flex items-center gap-1.5 font-bold text-body-xs text-text-muted'}
                style={isPdf ? {
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '6px',
                  ...styles?.textMuted,
                  fontWeight: 700,
                  fontSize: '12px'
                } : styles?.textMuted}
              >
                <Clock size={12} className={isPdf ? '' : 'text-teal'} style={isPdf ? styles?.teal : undefined} />
                <span>{formatEventTime(event?.event_date || event?.date, event?.event_time || event?.time)}</span>
              </div>
            </div>
            <div 
              className={isPdf ? '' : 'flex items-center gap-1.5 font-bold mt-1 text-body-xs text-text-muted'}
              style={isPdf ? {
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px',
                ...styles?.textMuted,
                fontWeight: 700,
                fontSize: '12px'
              } : styles?.textMuted}
            >
              <MapPin size={12} className={isPdf ? '' : 'text-teal'} style={isPdf ? styles?.teal : undefined} />
              <span>{event?.location || 'Location TBD'}</span>
            </div>
          </div>

          {/* Attendee / Tickets Section */}
          <div 
            className={isPdf ? '' : 'flex flex-col pt-4 border-t content-stack gap-3 border-bg-border/40'} 
            style={isPdf ? { 
              borderTop: '1px solid rgba(26, 36, 34, 0.6)', 
              paddingTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px' 
            } : undefined}
          >
            <p className={isPdf ? '' : 'text-[10px] font-black uppercase tracking-widest text-text-muted'} style={styles?.textLabel}>Entry Details</p>
            <div 
              className={isPdf ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2 custom-scrollbar max-h-32 overflow-y-auto'}
              style={isPdf ? {
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: '12px'
              } : undefined}
            >
              {(order.items || []).map((item: any, idx) => (
                <div 
                  key={item.id || idx} 
                  className={isPdf ? '' : 'flex items-center gap-3 p-2.5 border rounded-card bg-bg-elevated/30 border-bg-border/20 group/holder hover:border-teal/30 transition-colors'}
                  style={isPdf ? {
                    ...styles?.itemContainer,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px',
                    border: '1px solid rgba(26, 36, 34, 0.2)',
                    width: 'calc(50% - 6px)'
                  } : styles?.itemContainer}
                >
                  <div 
                    className={isPdf ? '' : 'flex items-center justify-center font-black shrink-0 w-8 h-8 rounded-card text-[10px] bg-teal/10 text-teal'}
                    style={isPdf ? {
                      ...styles?.itemIcon,
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 900,
                      flexShrink: 0
                    } : styles?.itemIcon}
                  >
                    {idx + 1}
                  </div>
                  <div 
                    className={isPdf ? '' : 'flex flex-col gap-0 overflow-hidden content-stack'}
                    style={isPdf ? {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0,
                      overflow: 'hidden'
                    } : undefined}
                  >
                    <p 
                      className={isPdf ? '' : 'text-[11px] font-bold line-clamp-1 text-text-primary group-hover/holder:text-teal transition-colors'}
                      style={isPdf ? { ...styles?.textPrimary, fontSize: '11px', fontWeight: 700 } : styles?.textPrimary}
                    >
                      {item.name || 'Attendee'}
                    </p>
                    <p className={isPdf ? '' : 'font-bold uppercase tracking-tighter line-clamp-1 text-[9px] text-text-muted'} style={isPdf ? { ...styles?.textMuted, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' } : styles?.textMuted}>{item.ticket_type?.name || 'Ticket'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Authentication Security Seal */}
      <div 
        className={isPdf ? '' : 'px-8 py-3 border-t flex justify-between items-center overflow-hidden bg-bg-elevated/50 border-bg-border/60'}
        style={isPdf ? {
          ...styles?.footer,
          padding: '12px 32px',
          borderTop: '1px solid rgba(26, 36, 34, 0.6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          overflow: 'hidden'
        } : styles?.footer}
      >
        <div 
          className={isPdf ? '' : 'flex flex-col content-stack gap-1'}
          style={isPdf ? {
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          } : undefined}
        >
          <p className={isPdf ? '' : 'text-[8px] font-black uppercase tracking-[0.2em] leading-none text-text-muted'} style={styles?.textLabel}>Authentication Seal</p>
          <p 
            className={isPdf ? '' : 'font-mono font-bold truncate text-[10px] text-teal/40 max-w-[200px]'}
            style={isPdf ? { ...styles?.authSeal, fontSize: '10px', fontWeight: 700 } : styles?.authSeal}
          >
            SECURE-AUTH-{order.qr_code_token || 'PENDING'}
          </p>
        </div>
        <div 
          className={isPdf ? '' : 'flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-40 hover:opacity-100'}
          style={isPdf ? {
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          } : undefined}
        >
           <span className={isPdf ? '' : 'text-[9px] font-black leading-none text-text-muted'} style={isPdf ? { ...styles?.textLabel, fontSize: '9px' } : styles?.textLabel}>POWERED BY</span>
           <span className={isPdf ? '' : 'font-black tracking-tighter text-[11px] text-text-primary'} style={isPdf ? { ...styles?.textPrimary, fontWeight: 900, fontSize: '11px' } : styles?.textPrimary}>TICKETS<span className={isPdf ? '' : 'text-teal'} style={isPdf ? styles?.teal : undefined}>HUB</span></span>
        </div>
      </div>
    </div>
  );
};
