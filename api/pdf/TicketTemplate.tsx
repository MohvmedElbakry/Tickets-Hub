import React from 'react';

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
  const accentColor = isPaid ? '#00C9B1' : '#F59E0B';
  const displayOrderId = ticket ? (ticket.order?.id || ticket.order_id) : (order?.id || '---');
  const qrCodeToken = ticket ? ticket.qr_token : (order?.qr_code_token || 'PENDING');

  return (
    <div style={{ 
      backgroundColor: '#0A0F0E', 
      color: '#F3F7F6', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px',
      display: 'inline-block'
    }}>
      <div id="print-content" style={{
        border: '1px solid #24302D',
        borderRadius: '24px',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#0A0F0E',
        width: '500px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Cinematic Top Border */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '8px',
          backgroundColor: accentColor
        }}></div>

        <div style={{ 
          position: 'relative', 
          display: 'flex', 
          padding: '40px', 
          gap: '40px' 
        }}>
          {/* Left Side: QR Code Area */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '16px',
            flexShrink: 0 
          }}>
             <div style={{ 
               width: '160px', 
               height: '160px', 
               padding: '16px', 
               backgroundColor: '#FFFFFF', 
               borderRadius: '16px',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center'
             }}>
               {qrDataUrl ? (
                 <img src={qrDataUrl} style={{ width: '128px', height: '128px' }} />
               ) : (
                 <div style={{ color: '#00C9B1', opacity: 0.2, fontWeight: 'bold' }}>NO QR</div>
               )}
             </div>
             <div style={{ textAlign: 'center' }}>
               <p style={{ margin: 0, opacity: 0.6, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#A7B5B2' }}>Order Reference</p>
               <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px', color: '#00C9B1', fontFamily: 'monospace' }}>#{displayOrderId}</p>
             </div>
          </div>

          {/* Vertical Divider */}
          <div style={{ width: '1px', backgroundColor: '#24302D' }}></div>

          {/* Right Side: Event & Attendee Info */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '0 10px', 
                  height: '18px', 
                  fontWeight: 900, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.15em', 
                  border: `1px solid ${isPaid ? 'rgba(0, 201, 177, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  borderRadius: '4px', 
                  fontSize: '9px',
                  backgroundColor: `${isPaid ? 'rgba(0, 201, 177, 0.1)' : 'rgba(245, 158, 11, 0.1)'}`,
                  color: accentColor
                }}>
                  <span style={{ position: 'relative', top: '0.5px' }}>{statusText}</span>
                </div>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#A7B5B2' }}>Access Credential</p>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#A7B5B2' }}>Event ID</p>
                <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', color: '#F3F7F6' }}>E-{event.id || '---'}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h2 style={{ margin: 0, lineHeight: 1.2, fontWeight: 900, letterSpacing: '-0.02em', fontSize: '24px', color: '#F3F7F6' }}>
                {event.title || 'Unknown Event'}
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 'bold', fontSize: '11px', color: '#A7B5B2' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00C9B1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  <span>{event.event_date || 'Date TBD'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 'bold', fontSize: '11px', color: '#A7B5B2' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00C9B1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <span>{event.event_time || 'Time TBD'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 'bold', fontSize: '11px', color: '#A7B5B2' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00C9B1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  <span>{event.location || 'Location TBD'}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '24px', borderTop: '1px solid #24302D', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#A7B5B2' }}>Entry Details</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {ticket ? (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '12px', 
                    border: '1px solid #24302D', 
                    borderRadius: '12px', 
                    backgroundColor: '#161F1D' 
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 900, 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px', 
                      fontSize: '10px', 
                      backgroundColor: 'rgba(0, 201, 177, 0.1)', 
                      color: '#00C9B1' 
                    }}>
                      1
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#F3F7F6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ticket.attendee_name || ticket.owner?.name || 'Attendee'}
                      </p>
                      <p style={{ margin: 0, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.02em', fontSize: '9px', color: '#A7B5B2' }}>
                        {ticket.ticket_type?.name || 'Ticket'}
                      </p>
                    </div>
                  </div>
                ) : (
                  items.slice(0, 3).map((item: any, idx: number) => (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: '12px', 
                      border: '1px solid #24302D', 
                      borderRadius: '12px', 
                      backgroundColor: '#161F1D' 
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: 900, 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '8px', 
                        fontSize: '10px', 
                        backgroundColor: 'rgba(0, 201, 177, 0.1)', 
                        color: '#00C9B1' 
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#F3F7F6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.holder_name || 'Attendee'}
                        </p>
                        <p style={{ margin: 0, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.02em', fontSize: '9px', color: '#A7B5B2' }}>
                          {item.ticket_type?.name || 'Ticket'}
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
          padding: '20px 40px', 
          borderTop: '1px solid #24302D', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          backgroundColor: '#101716' 
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#A7B5B2' }}>Authentication Seal</p>
            <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 'bold', fontSize: '10px', color: 'rgba(0, 201, 177, 0.4)' }}>
              SECURE-AUTH-{qrCodeToken}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}>
             <span style={{ fontSize: '9px', fontWeight: 900, color: '#A7B5B2' }}>POWERED BY</span>
             <span style={{ fontWeight: 900, letterSpacing: '-0.02em', fontSize: '11px', color: '#F3F7F6' }}>TICKETS<span style={{ color: '#00C9B1' }}>HUB</span></span>
          </div>
        </div>
      </div>
    </div>
  );
};
