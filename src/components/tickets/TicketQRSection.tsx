import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { RefreshCw, Lock } from 'lucide-react';
import { TICKET_THEME } from '../../lib/ticket-theme';

interface TicketQRSectionProps {
  qrData?: string;
  qrVisible?: boolean;
  qrReason?: string;
  loadingQr?: boolean;
  isPaid?: boolean;
  isPdf?: boolean;
  orderId?: number | string;
  ticketPublicId?: string;
}

export const TicketQRSection: React.FC<TicketQRSectionProps> = ({
  qrData,
  qrVisible,
  qrReason,
  loadingQr,
  isPaid,
  isPdf = false,
  orderId,
  ticketPublicId
}) => {
  const containerSize = TICKET_THEME.dimensions.qrContainerSize;
  const qrSize = TICKET_THEME.dimensions.qrCodeSize;

  if (isPdf) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        flexShrink: 0
      }}>
        <div style={{
          width: `${containerSize}px`,
          height: `${containerSize}px`,
          padding: '16px',
          backgroundColor: TICKET_THEME.colors.qrBackground,
          borderRadius: TICKET_THEME.dimensions.borderRadiusQr,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box'
        }}>
          {!isPaid ? (
            <div style={{ textAlign: 'center', color: TICKET_THEME.colors.textMuted, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>
              🔒 PAYMENT REQUIRED
            </div>
          ) : !qrVisible ? (
            <div style={{ textAlign: 'center', color: TICKET_THEME.colors.bgPage, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>
              🔒 PASS LOCKED<br /><span style={{ fontSize: '8px', color: '#6B7280' }}>Entry window only</span>
            </div>
          ) : qrData ? (
            <QRCodeCanvas 
              value={qrData} 
              size={qrSize}
              level="H"
              includeMargin={false}
            />
          ) : (
            <div style={{ color: TICKET_THEME.colors.accentTeal, fontSize: '11px', fontWeight: 'bold' }}>NO QR DATA</div>
          )}
        </div>
        {orderId && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, opacity: 0.6, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: TICKET_THEME.colors.textMuted }}>
              {TICKET_THEME.labels.orderReference}
            </p>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px', color: TICKET_THEME.colors.accentTeal, fontFamily: 'monospace' }}>
              #{orderId}
            </p>
          </div>
        )}
        {ticketPublicId && (
          <div style={{ textAlign: 'center', marginTop: '4px', borderTop: `1px solid ${TICKET_THEME.colors.border}`, paddingTop: '6px', width: '100%' }}>
            <p style={{ margin: 0, opacity: 0.6, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: TICKET_THEME.colors.textMuted }}>
              {TICKET_THEME.labels.ticketId}
            </p>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px', color: TICKET_THEME.colors.accentTeal, fontFamily: 'monospace' }}>
              {ticketPublicId}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 w-full sm:w-auto">
      {!isPaid ? (
        <div className="w-40 h-40 flex flex-col items-center justify-center text-center p-4 border rounded-card bg-bg-card border-bg-border shadow-inner">
          <Lock size={28} className="text-text-muted opacity-30 mb-2" />
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted leading-tight">Payment<br />Required</p>
        </div>
      ) : loadingQr ? (
        <div className="w-40 h-40 flex flex-col items-center justify-center border rounded-card bg-bg-card border-bg-border">
          <RefreshCw size={28} className="text-teal animate-spin opacity-60 mb-2" />
          <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Loading QR...</p>
        </div>
      ) : !qrVisible ? (
        <div className="w-40 h-40 flex flex-col items-center justify-center text-center p-4 relative overflow-hidden group border rounded-card bg-bg-card border-bg-border shadow-inner">
          <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-transparent pointer-events-none"></div>
          <Lock size={28} className="text-teal opacity-60 mb-2" />
          <p className="text-[10px] font-black uppercase tracking-widest text-text-primary mb-1">Pass Locked</p>
          <p className="text-[9px] font-bold text-text-muted leading-tight px-1">
            {qrReason || 'Activated before entry window'}
          </p>
        </div>
      ) : (
        <div className="relative group/qr">
          <div className="absolute -inset-1.5 bg-gradient-to-br from-teal/20 to-purple-500/20 rounded-card-xl blur opacity-0 group-hover/qr:opacity-100 transition-opacity duration-slow pointer-events-none"></div>
          <div className="w-40 h-40 p-4 relative flex items-center justify-center rounded-card shadow-xl transition-transform duration-slow transform hover:scale-[1.02] bg-white border border-white">
            {qrData ? (
              <QRCodeCanvas 
                value={qrData} 
                size={qrSize}
                level="H"
                includeMargin={false}
              />
            ) : (
              <RefreshCw size={28} className="text-teal animate-spin opacity-30" />
            )}
          </div>
        </div>
      )}

      {orderId && (
        <div className="text-center">
          <p className="opacity-60 text-[10px] font-black uppercase tracking-widest text-text-muted">{TICKET_THEME.labels.orderReference}</p>
          <p className="font-mono font-bold text-body-xs text-teal">#{orderId}</p>
        </div>
      )}

      {ticketPublicId && (
        <div className="text-center pt-1.5 border-t border-bg-border/30 w-full">
          <p className="opacity-60 text-[10px] font-black uppercase tracking-widest text-text-muted">{TICKET_THEME.labels.ticketId}</p>
          <p className="font-mono font-bold text-[11px] text-teal truncate max-w-[150px] mx-auto">{ticketPublicId}</p>
        </div>
      )}
    </div>
  );
};
