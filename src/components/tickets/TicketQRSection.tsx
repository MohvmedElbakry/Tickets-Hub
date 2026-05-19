import React from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Lock } from 'lucide-react';

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

  const printStyles = isPdf ? {
    container: "w-40 h-40 flex flex-col items-center justify-center text-center p-4 border rounded-[16px] bg-[#111918] border-[#24302D]",
    errorText: "text-[10px] font-black uppercase tracking-widest text-[#A7B5B2] leading-tight",
    primaryText: "text-[10px] font-black uppercase tracking-widest text-[#F3F7F6] mb-1",
    mutedText: "text-[9px] font-bold text-[#A7B5B2] leading-tight px-2",
    qrBg: "w-40 h-40 p-4 relative flex items-center justify-center rounded-[16px] bg-white border border-white"
  } : null;

  if (!isPaid) {
    return (
      <div 
        className={printStyles ? printStyles.container : "w-40 h-40 flex flex-col items-center justify-center text-center p-4 border rounded-card bg-bg-card border-bg-border"}
      >
        <Lock size={32} className={`${printStyles ? 'text-[#A7B5B2]' : 'text-text-muted'} opacity-20 mb-2`} />
        <p className={printStyles ? printStyles.errorText : "text-[10px] sm:text-label font-black uppercase tracking-widest text-text-muted leading-tight"}>Payment<br />Required</p>
      </div>
    );
  }

  if (loadingQr) {
    return (
      <div 
        className={printStyles ? printStyles.container : "w-40 h-40 flex items-center justify-center border rounded-card bg-bg-card border-bg-border"}
      >
        <RefreshCw size={32} className={`${printStyles ? 'text-[#00C9B1]' : 'text-teal animate-spin'} opacity-50`} />
      </div>
    );
  }

  if (!qrVisible) {
    return (
      <div 
        className={printStyles ? printStyles.container : "w-40 h-40 flex flex-col items-center justify-center text-center p-4 relative overflow-hidden group border rounded-card bg-bg-card border-bg-border"}
      >
        {!printStyles && <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-transparent"></div>}
        <Lock size={32} className={`${printStyles ? 'text-[#00C9B1]' : 'text-teal'} opacity-40 mb-2`} />
        <p className={printStyles ? printStyles.primaryText : "text-[10px] sm:text-label font-black uppercase tracking-widest text-text-primary mb-1"}>Pass Locked</p>
        <p className={printStyles ? printStyles.mutedText : "text-[9px] font-bold text-text-muted leading-tight px-2"}>
          {qrReason || 'Activated before entry window'}
        </p>
      </div>
    );
  }

  const QRComponent = isPdf ? QRCodeSVG : QRCodeCanvas;

  return (
    <div className="relative">
      {!printStyles && <div className="absolute -inset-2 bg-gradient-to-br from-teal/20 to-purple-500/20 rounded-card-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-slow"></div>}
      <div 
        className={printStyles ? printStyles.qrBg : "w-40 h-40 p-4 relative flex items-center justify-center rounded-card shadow-2xl transition-transform duration-slow transform hover:scale-[1.02] bg-white border border-white"}
      >
        {qrData ? (
          <QRComponent 
            value={qrData} 
            size={qrSize}
            level="H"
            includeMargin={true}
          />
        ) : (
          <RefreshCw size={32} className={`${printStyles ? 'text-[#00C9B1]' : 'text-teal animate-spin'} opacity-20`} />
        )}
      </div>
    </div>
  );
};
