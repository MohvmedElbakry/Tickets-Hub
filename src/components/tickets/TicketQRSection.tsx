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
        className="w-40 h-40 rounded-card flex flex-col items-center justify-center text-center p-4 border"
        style={isPdf ? styleProps?.container : undefined}
      >
        <Lock size={32} className="opacity-20 mb-2" style={isPdf ? styleProps?.textMuted : undefined} />
        <p className="text-[10px] font-black uppercase tracking-widest leading-tight" style={isPdf ? styleProps?.textMuted : undefined}>Payment<br />Required</p>
      </div>
    );
  }

  if (loadingQr) {
    return (
      <div 
        className="w-40 h-40 rounded-card flex items-center justify-center border"
        style={isPdf ? styleProps?.container : undefined}
      >
        <RefreshCw className={`opacity-50 ${isPdf ? '' : 'animate-spin'}`} size={32} style={isPdf ? styleProps?.teal : undefined} />
      </div>
    );
  }

  if (!qrVisible) {
    return (
      <div 
        className="w-40 h-40 rounded-card flex flex-col items-center justify-center text-center p-4 relative overflow-hidden group border"
        style={isPdf ? styleProps?.container : undefined}
      >
        {!isPdf && <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-transparent"></div>}
        <Lock size={32} className={`opacity-40 mb-2 ${isPdf ? '' : 'group-hover:scale-110 transition-transform duration-slow'}`} style={isPdf ? styleProps?.teal : undefined} />
        <p className="text-[10px] font-black uppercase tracking-widest leading-tight mb-1" style={isPdf ? styleProps?.textPrimary : undefined}>Pass Locked</p>
        <p className="text-[8px] font-bold leading-tight px-2" style={isPdf ? styleProps?.textMuted : undefined}>
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
        className={`w-40 h-40 p-4 rounded-card relative flex items-center justify-center ${isPdf ? 'shadow-none' : 'shadow-2xl transition-transform duration-slow transform hover:scale-[1.02]'}`}
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
          <RefreshCw className={`opacity-20 ${isPdf ? '' : 'animate-spin'}`} size={32} style={isPdf ? { color: '#0A0F0E' } : undefined} />
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
