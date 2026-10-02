/**
 * Canonical Design Tokens & Presentation Constants for TicketsHub Ticket System.
 * 
 * Shared between:
 * - Client Ticket Presentation (src/components/tickets/*)
 * - Serverless PDF Template (api/pdf/TicketTemplate.tsx)
 */

export const TICKET_THEME = {
  colors: {
    bgPage: '#0A0F0E',
    bgCard: '#0A0F0E',
    bgElevated: '#161F1D',
    bgFooter: '#101716',
    border: '#24302D',
    borderMuted: 'rgba(36, 48, 45, 0.4)',
    textPrimary: '#F3F7F6',
    textMuted: '#A7B5B2',
    accentTeal: '#00C9B1',
    accentWarning: '#F59E0B',
    accentDanger: '#EF4444',
    qrBackground: '#FFFFFF',
  },
  status: {
    confirmed: {
      bg: 'rgba(0, 201, 177, 0.1)',
      text: '#00C9B1',
      border: 'rgba(0, 201, 177, 0.3)',
      accent: '#00C9B1',
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.1)',
      text: '#F59E0B',
      border: 'rgba(245, 158, 11, 0.3)',
      accent: '#F59E0B',
    },
    danger: {
      bg: 'rgba(239, 68, 68, 0.1)',
      text: '#EF4444',
      border: 'rgba(239, 68, 68, 0.3)',
      accent: '#EF4444',
    },
  },
  dimensions: {
    cardWidthPdf: '520px',
    topAccentHeight: '6px',
    qrContainerSize: 160,
    qrCodeSize: 128,
    borderRadiusCard: '24px',
    borderRadiusQr: '16px',
    borderRadiusItem: '12px',
    borderRadiusBadge: '4px',
    borderRadiusIndex: '6px',
  },
  labels: {
    accessCredential: 'Access Credential',
    eventId: 'Event ID',
    orderReference: 'Order Reference',
    ticketId: 'Ticket ID',
    entryDetails: 'Entry Details',
    authSeal: 'Authentication Seal',
    authPrefix: 'SECURE-AUTH-',
    poweredBy: 'POWERED BY',
    brandName: 'TICKETS',
    brandAccent: 'HUB',
  }
} as const;

export interface TicketStatusTheme {
  bg: string;
  text: string;
  border: string;
  accent: string;
}

export function getTicketStatusTheme(status: string): TicketStatusTheme {
  const upper = (status || 'PENDING').toUpperCase();
  const isSuccess = ['CONFIRMED', 'PAID', 'VALID', 'ACTIVE', 'APPROVED', 'CHECKED_IN'].includes(upper);
  const isDanger = ['CANCELLED', 'REFUNDED', 'EXPIRED', 'DECLINED'].includes(upper);
  
  if (isSuccess) return TICKET_THEME.status.confirmed;
  if (isDanger) return TICKET_THEME.status.danger;
  return TICKET_THEME.status.warning;
}
