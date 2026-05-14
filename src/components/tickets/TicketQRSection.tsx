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

  if (!isPaid) {
    return (
      <div className="w-40 h-40 bg-bg-card border border-bg-border rounded-card flex flex-col items-center justify-center text-center p-4">
        <Lock size={32} className="text-text-muted opacity-20 mb-2" />
        <p className="text-[10px] font-black uppercase text-text-muted tracking-widest leading-tight">Payment<br />Required</p>
      </div>
    );
  }

  if (loadingQr) {
    return (
      <div className="w-40 h-40 bg-bg-card border border-bg-border rounded-card flex items-center justify-center">
        <RefreshCw className={`text-teal opacity-50 ${isPdf ? '' : 'animate-spin'}`} size={32} />
      </div>
    );
  }

  if (!qrVisible) {
    return (
      <div className="w-40 h-40 bg-bg-card border border-bg-border rounded-card flex flex-col items-center justify-center text-center p-4 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-transparent"></div>
        <Lock size={32} className={`text-teal opacity-40 mb-2 ${isPdf ? '' : 'group-hover:scale-110 transition-transform duration-slow'}`} />
        <p className="text-[10px] font-black uppercase text-text-primary tracking-widest leading-tight mb-1">Pass Locked</p>
        <p className="text-[8px] font-bold text-text-muted leading-tight px-2">
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
      <div className={`w-40 h-40 bg-white p-4 rounded-card relative flex items-center justify-center shadow-2xl ${isPdf ? '' : 'transition-transform duration-slow transform hover:scale-[1.02]'}`}>
        {qrData ? (
          <QRCodeSVG 
            value={qrData} 
            size={qrSize}
            level="H"
            includeMargin={true}
          />
        ) : (
          <RefreshCw className={`text-bg-page opacity-20 ${isPdf ? '' : 'animate-spin'}`} size={32} />
        )}
        
        {/* Security Corner Decor */}
        <div className="absolute top-1 right-1">
          <ShieldCheck size={10} className="text-teal/20" />
        </div>
      </div>
    </div>
  );
};
