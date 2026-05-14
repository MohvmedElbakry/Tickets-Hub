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
      backgroundColor: '#111918',
      borderColor: '#1A2422'
    },
    qrBg: {
      backgroundColor: '#FFFFFF',
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
        className={`w-40 h-40 flex flex-col items-center justify-center text-center p-4 border ${isPdf ? '' : 'rounded-card bg-bg-card border-bg-border'}`}
        style={isPdf ? { ...styleProps?.container, borderRadius: '16px' } : undefined}
      >
        <Lock size={32} className={`mb-2 ${isPdf ? 'opacity-20' : 'text-text-muted opacity-20'}`} style={isPdf ? styleProps?.textMuted : undefined} />
        <p className={`text-[10px] font-black uppercase tracking-widest leading-tight ${isPdf ? '' : 'text-text-muted'}`} style={isPdf ? styleProps?.textMuted : undefined}>Payment<br />Required</p>
      </div>
    );
  }

  if (loadingQr) {
    return (
      <div 
        className={`w-40 h-40 flex items-center justify-center border ${isPdf ? '' : 'rounded-card bg-bg-card border-bg-border'}`}
        style={isPdf ? { ...styleProps?.container, borderRadius: '16px' } : undefined}
      >
        <RefreshCw className={`${isPdf ? 'opacity-50' : 'text-teal opacity-50 animate-spin'}`} size={32} style={isPdf ? styleProps?.teal : undefined} />
      </div>
    );
  }

  if (!qrVisible) {
    return (
      <div 
        className={`w-40 h-40 flex flex-col items-center justify-center text-center p-4 relative overflow-hidden group border ${isPdf ? '' : 'rounded-card bg-bg-card border-bg-border'}`}
        style={isPdf ? { ...styleProps?.container, borderRadius: '16px' } : undefined}
      >
        {!isPdf && <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-transparent"></div>}
        <Lock size={32} className={`mb-2 ${isPdf ? 'opacity-40' : 'text-teal opacity-40 group-hover:scale-110 transition-transform duration-slow'}`} style={isPdf ? styleProps?.teal : undefined} />
        <p className={`text-[10px] font-black uppercase tracking-widest leading-tight mb-1 ${isPdf ? '' : 'text-text-primary'}`} style={isPdf ? styleProps?.textPrimary : undefined}>Pass Locked</p>
        <p className={`text-[8px] font-bold leading-tight px-2 ${isPdf ? '' : 'text-text-muted'}`} style={isPdf ? styleProps?.textMuted : undefined}>
          {qrReason || 'Activated before entry window'}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${isPdf ? '' : 'group'}`}>
      {!isPdf && (
        <div className="absolute -inset-2 bg-gradient-to-br from-teal/20 to-purple-500/20 rounded-card-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-slow"></div>
      )}
      <div 
        className={`w-40 h-40 p-4 relative flex items-center justify-center ${isPdf ? 'border shadow-none' : 'rounded-card shadow-2xl transition-transform duration-slow transform hover:scale-[1.02]'}`}
        style={isPdf ? { ...styleProps?.qrBg, borderColor: '#1A2422', borderRadius: '16px' } : undefined}
      >
        {qrData ? (
          <QRCodeSVG 
            value={qrData} 
            size={qrSize}
            level="H"
            includeMargin={true}
          />
        ) : (
          <RefreshCw className={`${isPdf ? 'opacity-20' : 'opacity-20 animate-spin text-teal'}`} size={32} style={isPdf ? { color: '#0A0F0E' } : undefined} />
        )}
        
        {/* Security Corner Decor */}
        {!isPdf && (
           <div className="absolute top-1 right-1">
             <ShieldCheck size={10} className="text-teal/20" />
           </div>
        )}
      </div>
    </div>
  );
};
