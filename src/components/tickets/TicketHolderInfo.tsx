import React from 'react';
import { TICKET_THEME } from '../../lib/ticket-theme';

interface AttendeeItem {
  id?: number | string;
  name?: string;
  holder_name?: string;
  ticket_type?: {
    name?: string;
  };
  type?: string;
}

interface TicketHolderInfoProps {
  ticket?: any;
  items?: AttendeeItem[];
  isPdf?: boolean;
}

export const TicketHolderInfo: React.FC<TicketHolderInfoProps> = ({
  ticket,
  items = [],
  isPdf = false
}) => {
  if (isPdf) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '20px', borderTop: `1px solid ${TICKET_THEME.colors.border}`, gap: '10px', width: '100%' }}>
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
            items.slice(0, 3).map((item, idx) => (
              <div key={item.id || idx} style={{
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
                    {item.holder_name || item.name || 'Attendee'}
                  </p>
                  <p style={{ margin: 0, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.02em', fontSize: '9px', color: TICKET_THEME.colors.textMuted }}>
                    {item.ticket_type?.name || item.type || 'Ticket Pass'}
                  </p>
                </div>
              </div>
            ))
          )}
          {!ticket && items.length > 3 && (
            <p style={{ margin: 0, fontSize: '9px', color: TICKET_THEME.colors.textMuted, fontStyle: 'italic' }}>
              + {items.length - 3} more attendee pass(es) in this order
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-4 border-t gap-3 border-bg-border/40 w-full">
      <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">{TICKET_THEME.labels.entryDetails}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-1 max-h-36 overflow-y-auto custom-scrollbar">
        {ticket ? (
          <div className="flex items-center gap-3 p-2.5 border rounded-card bg-bg-elevated/30 border-bg-border/20 group/holder hover:border-teal/30 transition-colors">
            <div className="flex items-center justify-center font-black shrink-0 w-7 h-7 rounded-card text-[10px] bg-teal/10 text-teal">
              1
            </div>
            <div className="flex flex-col gap-0 overflow-hidden">
              <p className="text-[11px] font-bold line-clamp-1 text-text-primary group/holder:text-teal transition-colors">
                {ticket.attendee_name || ticket.owner?.name || 'Attendee'}
              </p>
              <p className="font-bold uppercase tracking-tighter line-clamp-1 text-[9px] text-text-muted">
                {ticket.ticket_type?.name || 'Ticket Pass'}
              </p>
            </div>
          </div>
        ) : (
          (items || []).map((item, idx) => (
            <div 
              key={item.id || idx}
              className="flex items-center gap-3 p-2.5 border rounded-card bg-bg-elevated/30 border-bg-border/20 group/holder hover:border-teal/30 transition-colors"
            >
              <div className="flex items-center justify-center font-black shrink-0 w-7 h-7 rounded-card text-[10px] bg-teal/10 text-teal">
                {idx + 1}
              </div>
              <div className="flex flex-col gap-0 overflow-hidden">
                <p className="text-[11px] font-bold line-clamp-1 text-text-primary group/holder:text-teal transition-colors">
                  {item.holder_name || item.name || 'Attendee'}
                </p>
                <p className="font-bold uppercase tracking-tighter line-clamp-1 text-[9px] text-text-muted">
                  {item.ticket_type?.name || item.type || 'Ticket Pass'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
