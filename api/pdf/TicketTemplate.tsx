import React from 'react';
import { TICKET_THEME, getTicketStatusTheme } from '../lib/ticket-theme.js';

// Optimized SSR-safe Ticket Template
// Zero dependencies on hooks or browser APIs

interface TicketTemplateProps {
  order?: any;
  ticket?: any;
  qrDataUrl?: string;
  isPaid: boolean;
  statusText: string;
}

export const TicketTemplate: React.FC<TicketTemplateProps> = ({ 
  order, 
  ticket,
  qrDataUrl, 
  isPaid, 
  statusText 
}) => {
  const event = ticket ? (ticket.order?.event || {}) : (order?.event || {});
  const items = order?.items || [];
  const statusTheme = getTicketStatusTheme(statusText);
  const accentColor = statusTheme.accent;
  const displayOrderId = ticket ? (ticket.order?.id || ticket.order_id) : (order?.id || '---');
  const qrCodeToken = ticket ? ticket.qr_token : (order?.qr_code_token || 'PENDING');

  return (
    <div style={{ 
      backgroundColor: TICKET_THEME.colors.bgPage, 
      color: TICKET_THEME.colors.textPrimary, 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px',
      display: 'inline-block'
    }}>
      <div id="print-content" style={{
        border: `1px solid ${TICKET_THEME.colors.border}`,
        borderRadius: TICKET_THEME.dimensions.borderRadiusCard,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: TICKET_THEME.colors.bgCard,
        width: TICKET_THEME.dimensions.cardWidthPdf,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        boxSizing: 'border-box'
      }}>
        {/* Cinematic Top Border */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: TICKET_THEME.dimensions.topAccentHeight,
          backgroundColor: accentColor
        }}></div>

        <div style={{ 
          position: 'relative', 
          display: 'flex', 
          padding: '36px 32px 28px', 
          gap: '32px' 
        }}>
          {/* Left Side: QR Code Area */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '12px',
            flexShrink: 0 
          }}>
             <div style={{ 
               width: `${TICKET_THEME.dimensions.qrContainerSize}px`, 
               height: `${TICKET_THEME.dimensions.qrContainerSize}px`, 
               padding: '16px', 
               backgroundColor: TICKET_THEME.colors.qrBackground, 
               borderRadius: TICKET_THEME.dimensions.borderRadiusQr,
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               boxSizing: 'border-box'
             }}>
               {qrDataUrl ? (
                 <img src={qrDataUrl} style={{ width: `${TICKET_THEME.dimensions.qrCodeSize}px`, height: `${TICKET_THEME.dimensions.qrCodeSize}px` }} alt="QR Code" />
               ) : (
                 <div style={{ color: TICKET_THEME.colors.accentTeal, opacity: 0.3, fontWeight: 'bold', fontSize: '11px' }}>LOCKED</div>
               )}
             </div>
             <div style={{ textAlign: 'center' }}>
               <p style={{ margin: 0, opacity: 0.6, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: TICKET_THEME.colors.textMuted }}>
                 {TICKET_THEME.labels.orderReference}
               </p>
               <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px', color: TICKET_THEME.colors.accentTeal, fontFamily: 'monospace' }}>#{displayOrderId}</p>
             </div>
             {ticket && ticket.public_id && (
               <div style={{ textAlign: 'center', marginTop: '4px', borderTop: `1px solid ${TICKET_THEME.colors.border}`, paddingTop: '6px', width: '100%' }}>
                 <p style={{ margin: 0, opacity: 0.6, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: TICKET_THEME.colors.textMuted }}>
                   {TICKET_THEME.labels.ticketId}
                 </p>
                 <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px', color: TICKET_THEME.colors.accentTeal, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{ticket.public_id}</p>
               </div>
             )}
          </div>

          {/* Vertical Divider */}
          <div style={{ width: '1px', backgroundColor: TICKET_THEME.colors.border }}></div>

          {/* Right Side: Event & Attendee Info */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '2px 8px', 
                  height: '20px', 
                  fontWeight: 900, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.15em', 
                  border: `1px solid ${statusTheme.border}`,
                  borderRadius: TICKET_THEME.dimensions.borderRadiusBadge, 
                  fontSize: '9px',
                  backgroundColor: statusTheme.bg,
                  color: statusTheme.text
                }}>
                  <span style={{ position: 'relative', top: '0.5px' }}>{statusText}</span>
                </div>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: TICKET_THEME.colors.textMuted }}>
                  {TICKET_THEME.labels.accessCredential}
                </p>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: TICKET_THEME.colors.textMuted }}>
                  {TICKET_THEME.labels.eventId}
                </p>
                <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', color: TICKET_THEME.colors.textPrimary }}>E-{event.id || '---'}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h2 style={{ margin: 0, lineHeight: 1.2, fontWeight: 900, letterSpacing: '-0.02em', fontSize: '22px', color: TICKET_THEME.colors.textPrimary }}>
                {event.title || 'Unknown Event'}
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '11px', color: TICKET_THEME.colors.textMuted }}>
                  <span style={{ color: TICKET_THEME.colors.accentTeal, display: 'inline-flex' }}>📅</span>
                  <span>{event.event_date || event.date || 'Date TBD'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '11px', color: TICKET_THEME.colors.textMuted }}>
                  <span style={{ color: TICKET_THEME.colors.accentTeal, display: 'inline-flex' }}>⏰</span>
                  <span>{event.event_time || event.time || 'Time TBD'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '11px', color: TICKET_THEME.colors.textMuted }}>
                  <span style={{ color: TICKET_THEME.colors.accentTeal, display: 'inline-flex' }}>📍</span>
                  <span>{event.location || event.venue || 'Location TBD'}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '20px', borderTop: `1px solid ${TICKET_THEME.colors.border}`, gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: TICKET_THEME.colors.textMuted }}>
                {TICKET_THEME.labels.entryDetails}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {ticket ? (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '10px 12px', 
                    border: `1px solid ${TICKET_THEME.colors.border}`, 
                    borderRadius: TICKET_THEME.dimensions.borderRadiusItem, 
                    backgroundColor: TICKET_THEME.colors.bgElevated 
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 900, 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: TICKET_THEME.dimensions.borderRadiusIndex, 
                      fontSize: '10px', 
                      backgroundColor: 'rgba(0, 201, 177, 0.1)', 
                      color: TICKET_THEME.colors.accentTeal 
                    }}>
                      1
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: TICKET_THEME.colors.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ticket.attendee_name || ticket.owner?.name || 'Attendee'}
                      </p>
                      <p style={{ margin: 0, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.02em', fontSize: '9px', color: TICKET_THEME.colors.textMuted }}>
                        {ticket.ticket_type?.name || 'Ticket Pass'}
                      </p>
                    </div>
                  </div>
                ) : (
                  items.slice(0, 3).map((item: any, idx: number) => (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: '10px 12px', 
                      border: `1px solid ${TICKET_THEME.colors.border}`, 
                      borderRadius: TICKET_THEME.dimensions.borderRadiusItem, 
                      backgroundColor: TICKET_THEME.colors.bgElevated 
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: 900, 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: TICKET_THEME.dimensions.borderRadiusIndex, 
                        fontSize: '10px', 
                        backgroundColor: 'rgba(0, 201, 177, 0.1)', 
                        color: TICKET_THEME.colors.accentTeal 
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: TICKET_THEME.colors.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.holder_name || 'Attendee'}
                        </p>
                        <p style={{ margin: 0, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.02em', fontSize: '9px', color: TICKET_THEME.colors.textMuted }}>
                          {item.ticket_type?.name || 'Ticket Pass'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ 
          padding: '16px 32px', 
          borderTop: `1px solid ${TICKET_THEME.colors.border}`, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          backgroundColor: TICKET_THEME.colors.bgFooter,
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: TICKET_THEME.colors.textMuted }}>
              {TICKET_THEME.labels.authSeal}
            </p>
            <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 'bold', fontSize: '10px', color: 'rgba(0, 201, 177, 0.5)' }}>
              {TICKET_THEME.labels.authPrefix}{qrCodeToken}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.7 }}>
             <span style={{ fontSize: '9px', fontWeight: 900, color: TICKET_THEME.colors.textMuted }}>{TICKET_THEME.labels.poweredBy}</span>
             <span style={{ fontWeight: 900, letterSpacing: '-0.02em', fontSize: '11px', color: TICKET_THEME.colors.textPrimary }}>
               {TICKET_THEME.labels.brandName}<span style={{ color: TICKET_THEME.colors.accentTeal }}>{TICKET_THEME.labels.brandAccent}</span>
             </span>
          </div>
        </div>
      </div>
    </div>
  );
};
