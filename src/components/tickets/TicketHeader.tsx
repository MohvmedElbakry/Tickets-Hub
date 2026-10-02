import React from 'react';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TICKET_THEME } from '../../lib/ticket-theme';

interface TicketHeaderProps {
  status: string;
  eventId?: number | string;
  isPdf?: boolean;
}

export const TicketHeader: React.FC<TicketHeaderProps> = ({
  status,
  eventId,
  isPdf = false,
}) => {
  if (isPdf) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <TicketStatusBadge status={status} isPdf={true} />
          <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: TICKET_THEME.colors.textMuted }}>
            {TICKET_THEME.labels.accessCredential}
          </p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: TICKET_THEME.colors.textMuted }}>
            {TICKET_THEME.labels.eventId}
          </p>
          <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', color: TICKET_THEME.colors.textPrimary }}>
            E-{eventId || '---'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-start w-full">
      <div className="flex flex-col gap-1">
        <TicketStatusBadge status={status} isPdf={false} />
        <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-text-muted">{TICKET_THEME.labels.accessCredential}</p>
      </div>
      <div className="text-right flex flex-col gap-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">{TICKET_THEME.labels.eventId}</p>
        <p className="font-mono font-bold text-body-xs text-text-primary">E-{eventId || '---'}</p>
      </div>
    </div>
  );
};
