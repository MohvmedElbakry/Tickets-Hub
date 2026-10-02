import React from 'react';
import { Order } from '../../types';
import { TicketQRSection } from './TicketQRSection';
import { TicketHeader } from './TicketHeader';
import { TicketEventMeta } from './TicketEventMeta';
import { TicketHolderInfo } from './TicketHolderInfo';
import { TicketFooter } from './TicketFooter';
import { TICKET_THEME, getTicketStatusTheme } from '../../lib/ticket-theme';

export interface TicketCardProps {
  order?: Order | null;
  ticket?: any;
  qrData?: string;
  qrVisible?: boolean;
  qrReason?: string;
  loadingQr?: boolean;
  isPdf?: boolean;
  className?: string;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  order,
  ticket,
  qrData,
  qrVisible,
  qrReason,
  loadingQr,
  isPdf = false,
  className = ''
}) => {
  if (!order && !ticket) return null;

  const activeOrder = ticket ? ticket.order : order;
  if (!activeOrder) return null;

  const isPaid = activeOrder.is_paid || activeOrder.order_status === 'paid';
  const event = activeOrder.event || {};
  const orderStatus = (activeOrder.order_status || 'pending').toUpperCase();
  const ticketStatus = ticket ? (ticket.status === 'VALID' ? 'CONFIRMED' : ticket.status) : (isPaid ? 'CONFIRMED' : orderStatus);
  const orderId = activeOrder.id;
  const ticketPublicId = ticket?.public_id;
  const authSealToken = ticket?.qr_token || activeOrder.qr_code_token || 'PENDING';
  const statusTheme = getTicketStatusTheme(ticketStatus);

  if (isPdf) {
    const accentColor = statusTheme.accent;
    return (
      <div 
        id={`ticket-card-pdf-${ticket ? ticket.id : activeOrder.id}`}
        style={{
          border: `1px solid ${TICKET_THEME.colors.border}`,
          borderRadius: TICKET_THEME.dimensions.borderRadiusCard,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: TICKET_THEME.colors.bgCard,
          width: TICKET_THEME.dimensions.cardWidthPdf,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          boxSizing: 'border-box',
          color: TICKET_THEME.colors.textPrimary,
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        {/* Cinematic Accent Top Border */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: TICKET_THEME.dimensions.topAccentHeight,
          backgroundColor: accentColor
        }}></div>

        <div style={{
          display: 'flex',
          padding: '36px 32px 28px',
          gap: '32px',
          alignItems: 'stretch'
        }}>
          {/* Left Column: QR Code */}
          <TicketQRSection 
            qrData={qrData}
            qrVisible={qrVisible}
            qrReason={qrReason}
            loadingQr={loadingQr}
            isPaid={isPaid}
            isPdf={true}
            orderId={orderId}
            ticketPublicId={ticketPublicId}
          />

          {/* Divider */}
          <div style={{ width: '1px', backgroundColor: TICKET_THEME.colors.border }}></div>

          {/* Right Column: Details */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
            <TicketHeader 
              status={ticketStatus}
              eventId={event.id}
              isPdf={true}
            />
            <TicketEventMeta 
              title={event.title}
              date={event.date}
              eventDate={event.event_date}
              time={event.time}
              eventTime={event.event_time}
              location={event.location}
              venue={event.venue}
              isPdf={true}
            />
            <TicketHolderInfo 
              ticket={ticket}
              items={activeOrder.items}
              isPdf={true}
            />
          </div>
        </div>

        {/* Footer */}
        <TicketFooter token={authSealToken} isPdf={true} />
      </div>
    );
  }

  return (
    <div 
      id={`ticket-card-${ticket ? ticket.id : activeOrder.id}`}
      className={`border rounded-card-xl overflow-hidden relative bg-bg-page border-bg-border w-full shadow-ticket hover:shadow-card-glow transition-all duration-slow ${className}`}
    >
      {/* Cinematic Top Border */}
      <div 
        className={`absolute top-0 left-0 w-full h-1.5 ${isPaid ? 'bg-status-success animate-pulse-glow shadow-status-success/30 shadow-xl' : 'bg-status-warning'}`}
      ></div>
      
      {/* Glassy Subtle Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal/5 via-transparent to-purple-500/5 pointer-events-none"></div>

      <div className="relative flex flex-col md:flex-row p-6 md:p-8 gap-6 md:gap-8 items-center md:items-stretch">
        
        {/* Left Side: QR Code Area */}
        <div className="flex flex-col items-center justify-center shrink-0 w-full sm:w-auto">
          <TicketQRSection 
            qrData={qrData}
            qrVisible={qrVisible}
            qrReason={qrReason}
            loadingQr={loadingQr}
            isPaid={isPaid}
            isPdf={false}
            orderId={orderId}
            ticketPublicId={ticketPublicId}
          />
        </div>

        {/* Vertical Divider */}
        <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-bg-border to-transparent"></div>

        {/* Right Side: Event & Attendee Info */}
        <div className="flex-1 flex flex-col gap-5 w-full min-w-0">
          <TicketHeader 
            status={ticketStatus}
            eventId={event.id}
            isPdf={false}
          />

          <TicketEventMeta 
            title={event.title}
            date={event.date}
            eventDate={event.event_date}
            time={event.time}
            eventTime={event.event_time}
            location={event.location}
            venue={event.venue}
            isPdf={false}
          />

          <TicketHolderInfo 
            ticket={ticket}
            items={activeOrder.items}
            isPdf={false}
          />
        </div>
      </div>

      {/* Footer / Authentication Security Seal */}
      <TicketFooter token={authSealToken} isPdf={false} />
    </div>
  );
};
