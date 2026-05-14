import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Lock, ShieldCheck } from 'lucide-react';

interface TicketQRSectionProps {
  qrData?: string;
  qrVisible?: boolean;
  qrReason?: string;
  loadingQr?: boolean;
  isPaid?: boolean;
  isPdf?: boolean;
}

export const TicketQRSection: React.FC<TicketQRSectionProps> = ({
  qrData,
  qrVisible,
  qrReason,
  loadingQr,
  isPaid,
  isPdf
}) => {
  const containerSize = 160;
  const qrSize = containerSize - 32;

  const styleProps = isPdf ? {
    container: {
      background: 'linear-gradient(135deg, #111918 0%, #1A2422 100%)',
      borderColor: 'rgba(0, 201, 177, 0.2)',
      boxShadow: 'inset 0 0 20px rgba(0, 201, 177, 0.05)'
    },
    qrBg: {
      backgroundColor: '#FFFFFF',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    },
    textMuted: {
      color: '#7AADA6'
    },
    textPrimary: {
      color: '#E8F5F3'
    },
    teal: {
      color: '#00C9B1'
    }
  } : null;

  if (!isPaid) {
    return (
      <div 
        className={isPdf ? '' : 'w-40 h-40 flex flex-col items-center justify-center text-center p-4 border rounded-card bg-bg-card border-bg-border'}
        style={isPdf ? { 
          ...styleProps?.container, 
          borderRadius: '16px',
          width: '160px',
          height: '160px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '16px',
          border: '1px solid #1A2422'
        } : undefined}
      >
        <Lock size={32} className={isPdf ? '' : 'mb-2 text-text-muted opacity-20'} style={isPdf ? { ...styleProps?.textMuted, opacity: 0.2, marginBottom: '8px' } : undefined} />
        <p className={isPdf ? '' : 'text-[10px] font-black uppercase tracking-widest leading-tight text-text-muted'} style={isPdf ? { ...styleProps?.textMuted, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.25 } : undefined}>Payment<br />Required</p>
      </div>
    );
  }

  if (loadingQr) {
    return (
      <div 
        className={isPdf ? '' : 'w-40 h-40 flex items-center justify-center border rounded-card bg-bg-card border-bg-border'}
        style={isPdf ? { 
          ...styleProps?.container, 
          borderRadius: '16px',
          width: '160px',
          height: '160px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #1A2422'
        } : undefined}
      >
        <RefreshCw className={isPdf ? '' : 'text-teal opacity-50 animate-spin'} size={32} style={isPdf ? { ...styleProps?.teal, opacity: 0.5 } : undefined} />
      </div>
    );
  }

  if (!qrVisible) {
    return (
      <div 
        className={isPdf ? '' : 'w-40 h-40 flex flex-col items-center justify-center text-center p-4 relative overflow-hidden group border rounded-card bg-bg-card border-bg-border'}
        style={isPdf ? { 
          ...styleProps?.container, 
          borderRadius: '16px',
          width: '160px',
          height: '160px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '16px',
          border: '1px solid #1A2422',
          position: 'relative'
        } : undefined}
      >
        {!isPdf && <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-transparent"></div>}
        <Lock size={32} className={isPdf ? '' : 'mb-2 text-teal opacity-40 group-hover:scale-110 transition-transform duration-slow'} style={isPdf ? { ...styleProps?.teal, opacity: 0.4, marginBottom: '8px' } : undefined} />
        <p className={isPdf ? '' : 'text-[10px] font-black uppercase tracking-widest leading-tight mb-1 text-text-primary'} style={isPdf ? { ...styleProps?.textPrimary, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.25, marginBottom: '4px' } : undefined}>Pass Locked</p>
        <p className={isPdf ? '' : 'text-[8px] font-bold leading-tight px-2 text-text-muted'} style={isPdf ? { ...styleProps?.textMuted, fontSize: '8px', fontWeight: 700, lineHeight: 1.25, paddingLeft: '8px', paddingRight: '8px' } : undefined}>
          {qrReason || 'Activated before entry window'}
        </p>
      </div>
    );
  }

  return (
    <div className={isPdf ? '' : 'relative group'} style={isPdf ? { position: 'relative' } : undefined}>
      {!isPdf && (
        <div className="absolute -inset-2 bg-gradient-to-br from-teal/20 to-purple-500/20 rounded-card-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-slow"></div>
      )}
      <div 
        className={isPdf ? '' : 'w-40 h-40 p-4 relative flex items-center justify-center rounded-card shadow-2xl transition-transform duration-slow transform hover:scale-[1.02]'}
        style={isPdf ? { 
          ...styleProps?.qrBg, 
          borderColor: '#1A2422', 
          borderRadius: '16px',
          width: '160px',
          height: '160px',
          padding: '16px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #1A2422'
        } : undefined}
      >
        {qrData ? (
          <QRCodeSVG 
            value={qrData} 
            size={qrSize}
            level="H"
            includeMargin={true}
          />
        ) : (
          <RefreshCw className={isPdf ? '' : 'opacity-20 animate-spin text-teal'} size={32} style={isPdf ? { color: '#0A0F0E', opacity: 0.2 } : undefined} />
        )}
      </div>
    </div>
  );
};
