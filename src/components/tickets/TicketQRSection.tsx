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
      background: '#111918',
      backgroundImage: 'linear-gradient(135deg, #111918 0%, #1A2422 100%)',
      borderColor: 'rgba(0, 201, 177, 0.2)',
      borderRadius: '16px',
      width: '160px',
      height: '160px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center' as const,
      padding: '16px',
      border: '1px solid #24302D',
      boxShadow: 'inset 0 0 20px rgba(0, 201, 177, 0.05)',
      position: 'relative' as const
    },
    qrBg: {
      backgroundColor: '#FFFFFF',
      boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
      borderRadius: '16px',
      width: '160px',
      height: '160px',
      padding: '16px',
      position: 'relative' as const,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #FFFFFF'
    },
    textMuted: {
      color: '#A7B5B2',
      fontFamily: 'system-ui, sans-serif'
    },
    textPrimary: {
      color: '#F3F7F6',
      fontFamily: 'system-ui, sans-serif'
    },
    teal: {
      color: '#00C9B1'
    }
  } : null;

  if (!isPaid) {
    return (
      <div 
        className={isPdf ? '' : 'w-40 h-40 flex flex-col items-center justify-center text-center p-4 border rounded-card bg-bg-card border-bg-border'}
        style={isPdf ? styleProps?.container : undefined}
      >
        <Lock size={32} style={isPdf ? { color: '#A7B5B2', opacity: 0.2, marginBottom: '8px' } : undefined} />
        <p style={isPdf ? { ...styleProps?.textMuted, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.25 } : undefined}>Payment<br />Required</p>
      </div>
    );
  }

  if (loadingQr) {
    return (
      <div 
        className={isPdf ? '' : 'w-40 h-40 flex items-center justify-center border rounded-card bg-bg-card border-bg-border'}
        style={isPdf ? styleProps?.container : undefined}
      >
        <RefreshCw size={32} style={isPdf ? { color: '#00C9B1', opacity: 0.5 } : undefined} />
      </div>
    );
  }

  if (!qrVisible) {
    return (
      <div 
        className={isPdf ? '' : 'w-40 h-40 flex flex-col items-center justify-center text-center p-4 relative overflow-hidden group border rounded-card bg-bg-card border-bg-border'}
        style={isPdf ? styleProps?.container : undefined}
      >
        {!isPdf && <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-transparent"></div>}
        <Lock size={32} style={isPdf ? { color: '#00C9B1', opacity: 0.4, marginBottom: '8px' } : undefined} />
        <p style={isPdf ? { ...styleProps?.textPrimary, fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', lineHeight: '1.1', marginBottom: '3px' } : undefined}>Pass Locked</p>
        <p style={isPdf ? { ...styleProps?.textMuted, fontSize: '7.5px', fontWeight: 700, lineHeight: '1.2', padding: '0 8px' } : undefined}>
          {qrReason || 'Activated before entry window'}
        </p>
      </div>
    );
  }

  return (
    <div style={isPdf ? { position: 'relative' } : undefined}>
      {!isPdf && (
        <div className="absolute -inset-2 bg-gradient-to-br from-teal/20 to-purple-500/20 rounded-card-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-slow"></div>
      )}
      <div 
        className={isPdf ? '' : 'w-40 h-40 p-4 relative flex items-center justify-center rounded-card shadow-2xl transition-transform duration-slow transform hover:scale-[1.02]'}
        style={isPdf ? styleProps?.qrBg : undefined}
      >
        {qrData ? (
          <QRCodeSVG 
            value={qrData} 
            size={qrSize}
            level="H"
            includeMargin={true}
          />
        ) : (
          <RefreshCw size={32} style={isPdf ? { color: '#00C9B1', opacity: 0.2 } : undefined} />
        )}
      </div>
    </div>
  );
};
