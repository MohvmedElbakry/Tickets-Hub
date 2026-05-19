import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface TicketPdfTemplateProps {
  order: any;
  qrData?: string;
  qrVisible?: boolean;
  qrReason?: string;
}

export const TicketPdfTemplate: React.FC<TicketPdfTemplateProps> = ({
  order,
  qrData,
  qrVisible,
  qrReason,
}) => {
  if (!order) return null;

  const isPaid = order.is_paid || order.order_status === 'paid';
  const event = order.event || {};
  const orderStatus = (order.order_status || 'pending').toUpperCase();
  const status = isPaid ? 'CONFIRMED' : orderStatus;

  // Optimized for Server-Side Rendering
  // No external icons used here to avoid dependency issues during SSR
  return (
    <div 
      className="border rounded-[24px] overflow-hidden relative bg-[#0A0F0E] border-[#24302D] w-[500px] shadow-2xl"
      style={{ minHeight: '400px', fontFamily: 'sans-serif' }}
    >
      <div 
        className={`absolute top-0 left-0 w-full h-2 ${isPaid ? 'bg-[#00C9B1]' : 'bg-[#F59E0B]'}`}
      ></div>
      
      <div className="absolute inset-0 bg-gradient-to-br from-[#00C9B1]/5 via-transparent to-[#8B5CF6]/5 pointer-events-none"></div>

      <div className="relative flex p-10 gap-10 items-stretch">
        
        {/* Left Side: QR Code Area */}
        <div className="flex flex-col items-center justify-center gap-4 shrink-0">
          <div className="w-40 h-40 flex flex-col items-center justify-center text-center p-4 border rounded-[16px] bg-[#111918] border-[#24302D]">
            {!qrVisible ? (
              <>
                <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.4 }}>🔒</div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#F3F7F6] mb-1">Pass Locked</p>
                <p className="text-[9px] font-bold text-[#A7B5B2] leading-tight px-2">{qrReason || 'Activated before window'}</p>
              </>
            ) : (
                <div className="w-40 h-40 p-4 relative flex items-center justify-center rounded-[16px] bg-white border border-white">
                  {qrData ? (
                    <QRCodeSVG 
                      value={qrData} 
                      size={128}
                      level="H"
                      includeMargin={true}
                    />
                  ) : (
                    <div className="opacity-20 text-[10px] uppercase font-bold text-black">NO DATA</div>
                  )}
                </div>
            )}
          </div>
          <div className="text-center">
            <p className="opacity-60 text-[10px] font-black uppercase tracking-widest text-[#A7B5B2]">Order Reference</p>
            <p className="font-mono font-bold text-[12px] text-[#00C9B1]">#{order.id}</p>
          </div>
        </div>

        <div className="w-px bg-[#24302D]"></div>

        {/* Right Side: Info */}
        <div className="flex-1 flex flex-col gap-6 min-w-0 text-[#F3F7F6]">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <span className={`inline-flex items-center justify-center px-2.5 h-[18px] font-black uppercase tracking-[0.15em] border whitespace-nowrap rounded-[4px] text-[9px] leading-none ${
                isPaid ? 'bg-[#00C9B1]/10 text-[#00C9B1] border-[#00C9B1]/30' : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
              }`}>
                {status}
              </span>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#A7B5B2]">Access Credential</p>
            </div>
            <div className="text-right flex flex-col gap-1">
               <p className="text-[10px] font-black uppercase tracking-widest text-[#A7B5B2]">Event ID</p>
               <p className="font-mono font-bold text-[12px]">E-{event.id || '---'}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="leading-tight font-black tracking-tight text-[24px]">
              {event.title || 'Untitled Event'}
            </h2>
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#A7B5B2]">
                <span className="text-[#00C9B1]">📅</span>
                <span>{event.event_date || 'Date TBD'}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#A7B5B2]">
                <span className="text-[#00C9B1]">📍</span>
                <span>{event.location || 'Location TBD'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col pt-6 border-t gap-3 border-[#24302D]">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#A7B5B2]">Entry Details</p>
            <div className="flex flex-col gap-3">
              {(order.items || []).slice(0, 3).map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 border rounded-[12px] bg-[#161F1D] border-[#24302D]">
                  <div className="flex items-center justify-center font-black shrink-0 w-6 h-6 rounded-[8px] text-[10px] bg-[#00C9B1]/10 text-[#00C9B1]">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-[12px] font-bold truncate">{item.holder_name || 'Attendee'}</p>
                    <p className="text-[9px] text-[#A7B5B2] uppercase">{item.ticket_type?.name || 'Ticket'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
