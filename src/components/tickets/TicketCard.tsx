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
      background: '#0A0F0E',
      backgroundImage: 'linear-gradient(165deg, #0A0F0E 0%, #161F1D 100%)',
      borderColor: '#24302D',
      color: '#F3F7F6',
      borderRadius: '24px',
      boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
      width: '500px',
      overflow: 'hidden',
      position: 'relative' as const,
      border: '1px solid #24302D',
      display: 'block'
    },
    topBorder: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '8px',
      background: isPaid 
        ? 'linear-gradient(90deg, #00C9B1 0%, #00F2D8 50%, #00C9B1 100%)' 
        : 'linear-gradient(90deg, #F59E0B 0%, #FFB83D 50%, #F59E0B 100%)',
    },
    mainContent: {
      position: 'relative' as const,
      display: 'flex',
      flexDirection: 'row' as const,
      padding: '40px',
      gap: '40px',
      alignItems: 'stretch' as const
    },
    leftColumn: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      width: '160px',
      flexShrink: 0
    },
    divider: {
      width: '1px',
      backgroundColor: '#24302D',
      display: 'block'
    },
    rightColumn: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '28px',
      minWidth: 0
    },
    headerArea: {
      display: 'flex',
      flexDirection: 'row' as const,
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    },
    eventIdentity: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px'
    },
    textPrimary: { 
      color: '#F3F7F6',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    textHeading: {
      color: '#F3F7F6',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '28px',
      fontWeight: '900',
      letterSpacing: '-0.02em',
      lineHeight: '1.2',
      margin: '0 0 4px 0'
    },
    textMuted: { 
      color: '#A7B5B2',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    textLabel: {
      color: 'rgba(167, 181, 178, 0.5)',
      fontFamily: 'ui-monospace, monospace',
      fontSize: '8px',
      fontWeight: '900',
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      margin: '0 0 4px 0',
      lineHeight: '1'
    },
    teal: { color: '#00C9B1' },
    metaItem: {
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      gap: '6px',
      fontSize: '10px',
      fontWeight: '700',
      color: '#A7B5B2',
      lineHeight: '1'
    },
    metaGrid: {
      display: 'flex',
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      columnGap: '20px',
      rowGap: '8px'
    },
    attendeeSection: {
      borderTop: '1px solid rgba(36, 48, 45, 0.8)', 
      paddingTop: '20px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px' 
    },
    attendeeGrid: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'stretch' as const,
      gap: '10px'
    },
    itemContainer: {
      backgroundColor: 'rgba(22, 31, 29, 0.4)',
      border: '1px solid #24302D',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      gap: '12px',
      padding: '10px 12px',
      width: '100%',
      minHeight: '52px'
    },
    itemIcon: {
      backgroundColor: 'rgba(0, 201, 177, 0.12)',
      color: '#00C9B1',
      borderRadius: '10px',
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      fontWeight: '900',
      flexShrink: 0,
      lineHeight: '1'
    },
    footer: {
      padding: '16px 40px',
      background: 'rgba(16, 23, 22, 0.5)',
      borderTop: '1px solid #24302D',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      overflow: 'hidden'
    },
    authSeal: {
      color: 'rgba(0, 201, 177, 0.25)',
      fontFamily: 'ui-monospace, monospace',
      fontSize: '10px',
      fontWeight: '700',
      letterSpacing: '0.05em'
    },
    poweredBy: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      opacity: 0.6
    }
  } : null;

  return (
    <div 
      id={isPdf ? undefined : `ticket-card-${order.id}`}
      className={isPdf ? '' : 'border rounded-card-xl overflow-hidden relative bg-bg-page border-bg-border w-full shadow-ticket hover:shadow-card-glow transition-all duration-slow'}
      style={isPdf ? styles?.card : undefined}
    >
      {/* Cinematic Top Border */}
      <div 
        className={isPdf ? '' : `absolute top-0 left-0 w-full h-1.5 ${isPaid ? 'bg-status-success animate-pulse-glow shadow-status-success/30 shadow-xl' : 'bg-status-warning'}`}
        style={isPdf ? styles?.topBorder : undefined}
      ></div>
      
      {/* Glassy Background Effect */}
      {!isPdf && <div className="absolute inset-0 bg-gradient-to-br from-teal/5 via-transparent to-purple-500/5 pointer-events-none"></div>}

      <div 
        className={isPdf ? '' : 'relative flex flex-col md:flex-row p-6 md:p-8 gap-8 items-start md:items-stretch'}
        style={isPdf ? styles?.mainContent : undefined}
      >
        
        {/* Left Side: QR Code Area */}
        <div 
          className={isPdf ? '' : 'flex flex-col items-center justify-center gap-4 group/qr'}
          style={isPdf ? styles?.leftColumn : undefined}
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
            <p className={isPdf ? '' : 'opacity-60 text-[10px] font-black uppercase tracking-widest text-text-muted'} style={isPdf ? styles?.textLabel : undefined}>Order Reference</p>
            <p className={isPdf ? '' : 'font-mono font-bold text-body-xs text-teal'} style={isPdf ? { ...styles?.teal, fontWeight: '700', margin: '4px 0 0 0' } : undefined}>#{order.id}</p>
          </div>
        </div>

        {/* Divider for PDF consistency */}
        <div 
          className={isPdf ? '' : 'hidden md:block w-px bg-gradient-to-b from-transparent via-bg-border to-transparent'} 
          style={isPdf ? styles?.divider : undefined}
        ></div>

        {/* Right Side: Event & Attendee Info */}
        <div 
          className={isPdf ? '' : 'flex-1 flex flex-col gap-6'}
          style={isPdf ? styles?.rightColumn : undefined}
        >
          {/* Header Area */}
          <div 
            className={isPdf ? '' : 'flex justify-between items-start'}
            style={isPdf ? styles?.headerArea : undefined}
          >
            <div 
              className={isPdf ? '' : 'flex flex-col content-stack gap-1'}
              style={isPdf ? { display: 'flex', flexDirection: 'column', gap: '4px' } : undefined}
            >
              <TicketStatusBadge status={isPaid ? 'CONFIRMED' : orderStatus} isPdf={isPdf} />
              <p className={isPdf ? '' : 'mt-1 text-[10px] font-black uppercase tracking-widest text-text-muted'} style={isPdf ? styles?.textLabel : undefined}>Access Credential</p>
            </div>
            <div 
              className={isPdf ? '' : 'text-right flex flex-col content-stack gap-1'}
              style={isPdf ? { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' } : undefined}
            >
               <p className={isPdf ? '' : 'text-[10px] font-black uppercase tracking-widest text-text-muted'} style={isPdf ? styles?.textLabel : undefined}>Event ID</p>
               <p className={isPdf ? '' : 'font-mono font-bold text-body-xs text-text-primary'} style={isPdf ? { ...styles?.textPrimary, fontWeight: '700' } : undefined}>E-{event?.id || '---'}</p>
            </div>
          </div>

          {/* Event Identity */}
          <div 
            className={isPdf ? '' : 'flex flex-col content-stack gap-1'}
            style={isPdf ? styles?.eventIdentity : undefined}
          >
            <h2 
              className={isPdf ? '' : 'leading-tight font-black tracking-tight line-clamp-2 text-h3 text-text-primary group-hover:text-teal transition-colors duration-base'}
              style={isPdf ? styles?.textHeading : undefined}
            >
              {event?.title || 'Unknown Event'}
            </h2>
            <div className={isPdf ? '' : 'flex flex-wrap gap-x-4 gap-y-1'} style={isPdf ? styles?.metaGrid : undefined}>
              <div 
                className={isPdf ? '' : 'flex items-center gap-1.5 font-bold text-body-xs text-text-muted'}
                style={isPdf ? styles?.metaItem : undefined}
              >
                <Calendar size={12} style={isPdf ? styles?.teal : undefined} />
                <span style={isPdf ? styles?.textMuted : undefined}>{event?.event_date || 'Date TBD'}</span>
              </div>
              <div 
                className={isPdf ? '' : 'flex items-center gap-1.5 font-bold text-body-xs text-text-muted'}
                style={isPdf ? styles?.metaItem : undefined}
              >
                <Clock size={12} style={isPdf ? styles?.teal : undefined} />
                <span style={isPdf ? styles?.textMuted : undefined}>{formatEventTime(event?.event_date || event?.date, event?.event_time || event?.time)}</span>
              </div>
            </div>
            <div 
              className={isPdf ? '' : 'flex items-center gap-1.5 font-bold mt-1 text-body-xs text-text-muted'}
              style={isPdf ? { ...styles?.metaItem, marginTop: '4px' } : undefined}
            >
              <MapPin size={12} style={isPdf ? styles?.teal : undefined} />
              <span style={isPdf ? styles?.textMuted : undefined}>{event?.location || 'Location TBD'}</span>
            </div>
          </div>

          {/* Attendee / Tickets Section */}
          <div 
            className={isPdf ? '' : 'flex flex-col pt-4 border-t content-stack gap-3 border-bg-border/40'} 
            style={isPdf ? styles?.attendeeSection : undefined}
          >
            <p className={isPdf ? '' : 'text-[10px] font-black uppercase tracking-widest text-text-muted'} style={isPdf ? styles?.textLabel : undefined}>Entry Details</p>
            <div 
              className={isPdf ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2 custom-scrollbar max-h-32 overflow-y-auto'}
              style={isPdf ? styles?.attendeeGrid : undefined}
            >
              {(order.items || []).map((item: any, idx) => (
                <div 
                  key={item.id || idx} 
                  className={isPdf ? '' : 'flex items-center gap-3 p-2.5 border rounded-card bg-bg-elevated/30 border-bg-border/20 group/holder hover:border-teal/30 transition-colors'}
                  style={isPdf ? styles?.itemContainer : undefined}
                >
                  <div 
                    className={isPdf ? '' : 'flex items-center justify-center font-black shrink-0 w-8 h-8 rounded-card text-[10px] bg-teal/10 text-teal'}
                    style={isPdf ? styles?.itemIcon : undefined}
                  >
                    {idx + 1}
                  </div>
                  <div 
                    className={isPdf ? '' : 'flex flex-col gap-0 overflow-hidden content-stack'}
                    style={isPdf ? { display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' } : undefined}
                  >
                    <p 
                      className={isPdf ? '' : 'text-[11px] font-bold line-clamp-1 text-text-primary group-hover/holder:text-teal transition-colors'}
                      style={isPdf ? { ...styles?.textPrimary, fontSize: '11px', fontWeight: '700' } : undefined}
                    >
                      {item.name || 'Attendee'}
                    </p>
                    <p className={isPdf ? '' : 'font-bold uppercase tracking-tighter line-clamp-1 text-[9px] text-text-muted'} style={isPdf ? { ...styles?.textMuted, fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' } : undefined}>{item.ticket_type?.name || 'Ticket'}</p>
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
        style={isPdf ? styles?.footer : undefined}
      >
        <div 
          className={isPdf ? '' : 'flex flex-col content-stack gap-1'}
          style={isPdf ? { display: 'flex', flexDirection: 'column', gap: '4px' } : undefined}
        >
          <p className={isPdf ? '' : 'text-[8px] font-black uppercase tracking-[0.2em] leading-none text-text-muted'} style={isPdf ? styles?.textLabel : undefined}>Authentication Seal</p>
          <p 
            className={isPdf ? '' : 'font-mono font-bold truncate text-[10px] text-teal/40 max-w-[200px]'}
            style={isPdf ? styles?.authSeal : undefined}
          >
            SECURE-AUTH-{order.qr_code_token || 'PENDING'}
          </p>
        </div>
        <div 
          className={isPdf ? '' : 'flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-40 hover:opacity-100'}
          style={isPdf ? styles?.poweredBy : undefined}
        >
           <span className={isPdf ? '' : 'text-[9px] font-black leading-none text-text-muted'} style={isPdf ? { ...styles?.textLabel, fontSize: '9px', margin: 0 } : undefined}>POWERED BY</span>
           <span className={isPdf ? '' : 'font-black tracking-tighter text-[11px] text-text-primary'} style={isPdf ? { ...styles?.textPrimary, fontWeight: '900', fontSize: '11px' } : undefined}>TICKETS<span className={isPdf ? '' : 'text-teal'} style={isPdf ? styles?.teal : undefined}>HUB</span></span>
        </div>
      </div>
    </div>
  );
};
