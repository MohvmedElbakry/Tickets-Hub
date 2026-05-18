
import { Order } from '../types';

export const isQRCodeVisible = (eventDate: string, eventTime: string, qrEnabledManual?: boolean) => {
  if (qrEnabledManual) return true;
  
  try {
    const eventDateTime = new Date(`${eventDate}T${eventTime}`);
    const now = new Date();
    const diffInMs = eventDateTime.getTime() - now.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    // Show QR code 1 hour before event and up to 24 hours after it starts
    return diffInHours <= 1 && diffInHours >= -24;
  } catch (e) {
    return false;
  }
};

/**
 * PDF EXPORT PIPELINE (PUPPETEER POWERED)
 * 
 * We use a server-side high-fidelity export architecture:
 * 1. Client triggers a fetch to binary PDF endpoint
 * 2. Server launches headless Puppeteer
 * 3. Server renders the /ticket/print/:id route
 * 4. PDF is captured and returned as a stream
 */
export const handleDownloadPDF = async (order: Order) => {
  if (!order) return;

  try {
    const response = await fetch(`/api/tickets/${order.id}/pdf`);
    
    if (!response.ok) {
      throw new Error(`Failed to generate PDF: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ticket-${order.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('PDF Export Failed:', error);
    alert('Failed to download PDF ticket. Please try again later.');
  }
};

