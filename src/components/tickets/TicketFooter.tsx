import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { TICKET_THEME } from '../../lib/ticket-theme';

interface TicketFooterProps {
  token: string;
  isPdf?: boolean;
}

export const TicketFooter: React.FC<TicketFooterProps> = ({
  token,
  isPdf = false
}) => {
  const displayToken = token || 'PENDING';

  if (isPdf) {
    return (
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
            {TICKET_THEME.labels.authPrefix}{displayToken}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.7 }}>
          <span style={{ fontSize: '9px', fontWeight: 900, color: TICKET_THEME.colors.textMuted }}>{TICKET_THEME.labels.poweredBy}</span>
          <span style={{ fontWeight: 900, letterSpacing: '-0.02em', fontSize: '11px', color: TICKET_THEME.colors.textPrimary }}>
            {TICKET_THEME.labels.brandName}<span style={{ color: TICKET_THEME.colors.accentTeal }}>{TICKET_THEME.labels.brandAccent}</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 md:px-8 py-3.5 border-t flex justify-between items-center overflow-hidden bg-bg-elevated/50 border-bg-border/60 w-full">
      <div className="flex flex-col gap-0.5 max-w-[70%]">
        <div className="flex items-center gap-1">
          <ShieldCheck size={10} className="text-teal" />
          <p className="text-[8px] font-black uppercase tracking-[0.2em] leading-none text-text-muted">{TICKET_THEME.labels.authSeal}</p>
        </div>
        <p className="font-mono font-bold truncate text-[10px] text-teal/60">
          {TICKET_THEME.labels.authPrefix}{displayToken}
        </p>
      </div>
      <div className="flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
        <span className="text-[9px] font-black leading-none text-text-muted">{TICKET_THEME.labels.poweredBy}</span>
        <span className="font-black tracking-tighter text-[11px] text-text-primary">
          {TICKET_THEME.labels.brandName}<span className="text-teal">{TICKET_THEME.labels.brandAccent}</span>
        </span>
      </div>
    </div>
  );
};
