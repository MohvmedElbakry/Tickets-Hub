
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { Order } from '../types';
import { TicketCard } from '../components/tickets/TicketCard';

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
 * DETACHED REACT RENDER PIPELINE
 * 
 * Instead of cloning the live DOM, we render a fresh, isolated React subtree
 * specifically for export. This guarantees that html2canvas NEVER sees
 * Tailwind v4 color tokens (oklab/oklch) which cause parser crashes.
 */
export const handleDownloadPDF = async (order: Order, qrData?: string, qrVisible?: boolean, qrReason?: string) => {
  if (!order) return;

  // 1. Create a NEW detached export container
  const exportContainer = document.createElement('div');
  Object.assign(exportContainer.style, {
    position: 'fixed',
    top: '0',
    left: '-9999px', // Out of viewport
    width: '500px',
    height: 'auto',
    backgroundColor: '#0A0F0E',
    zIndex: '-1000'
  });
  
  document.body.appendChild(exportContainer);

  const root = createRoot(exportContainer);

  try {
    // 2. Render the isolated ticket subtree
    // We pass isPdf={true} to force the component into its self-contained rendering mode
    root.render(
      React.createElement(TicketCard, {
        order,
        qrData,
        qrVisible,
        qrReason,
        isPdf: true
      })
    );

    // 4. Wait for React to finish the render cycle and commit to the DOM
    await new Promise(resolve => setTimeout(resolve, 200));

    // 5. Select the rendered node
    const ticketNode = exportContainer.firstChild as HTMLElement;
    if (!ticketNode) throw new Error('Render failed to produce DOM node');

    // 6. Capture using html2canvas
    const canvas = await html2canvas(ticketNode, {
      scale: 3, 
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0A0F0E',
      logging: false,
      width: 500,
      height: ticketNode.offsetHeight
    });

    // 7. Generate PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'px',
      format: [canvas.width / 3, canvas.height / 3]
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 3, canvas.height / 3, undefined, 'FAST');
    pdf.save(`Ticket-${order.id}.pdf`);

  } catch (error) {
    console.error('Detached PDF Pipeline Failed:', error);
  } finally {
    // 8. CRITICAL CLEANUP
    root.unmount();
    if (exportContainer.parentNode) {
      document.body.removeChild(exportContainer);
    }
  }
};

