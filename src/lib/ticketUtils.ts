
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

  const orderIdentifier = order.public_id || (order as any).id?.toString();

  try {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/tickets/${orderIdentifier}/pdf`, {
      headers
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error || `Failed to generate PDF: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ticket-${orderIdentifier}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error: any) {
    console.error('PDF Export Failed:', error);
    alert(error.message || 'Failed to download PDF ticket. Please try again later.');
  }
};

