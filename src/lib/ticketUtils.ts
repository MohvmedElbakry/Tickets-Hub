
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
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
 * DETACHED REACT RENDER PIPELINE - PRODUCTION GRADE
 * 
 * Instead of cloning the live DOM, we render a fresh, isolated React subtree
 * specifically for export. This guarantees that html2canvas NEVER sees
 * Tailwind v4 color tokens (oklab/oklch) which cause parser crashes.
 * 
 * We use flushSync to force an immediate commit to the DOM.
 */
export const handleDownloadPDF = async (order: Order, qrData?: string, qrVisible?: boolean, qrReason?: string) => {
  if (!order) return;

  // 1. Create a NEW detached export container
  // We place it in the viewport but invisible to ensure the browser paints it correctly.
  const exportContainer = document.createElement('div');
  exportContainer.id = 'pdf-export-anchor';
  Object.assign(exportContainer.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '500px',
    height: 'auto',
    backgroundColor: '#0A0F0E',
    zIndex: '-9999',
    opacity: '0',
    pointerEvents: 'none',
    visibility: 'visible',
    overflow: 'visible'
  });
  
  document.body.appendChild(exportContainer);

  const root = createRoot(exportContainer);

  try {
    // 2. Force a synchronous React render to the DOM
    // This ensures that ticketNode is available and fully populated immediately.
    flushSync(() => {
      root.render(
        React.createElement(TicketCard, {
          order,
          qrData,
          qrVisible,
          qrReason,
          isPdf: true
        })
      );
    });

    // 3. Brief layout stabilization delay
    // flushSync commits to DOM, but the browser may need an extra tick for layout calculations.
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 50)));

    // 4. Select the rendered node
    const ticketNode = exportContainer.firstChild as HTMLElement;
    if (!ticketNode) throw new Error('Render failed to produce DOM node');

    // 5. Capture using html2canvas
    // WE REMOVED foreignObjectRendering as it is the primary source of blank PDF failures.
    // 6. Capture using html2canvas
    const canvas = await html2canvas(ticketNode, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0A0F0E',
      logging: true,

      // IMPORTANT:
      foreignObjectRendering: false,

      width: ticketNode.offsetWidth,
      height: ticketNode.offsetHeight,
    });

    // ================================
    // DEBUG SECTION
    // ================================

    console.log('CANVAS DEBUG', {
      width: canvas.width,
      height: canvas.height,
    });

    // VISUALLY APPEND CANVAS TO PAGE
    canvas.style.position = 'fixed';
    canvas.style.top = '20px';
    canvas.style.right = '20px';
    canvas.style.zIndex = '999999';
    canvas.style.border = '4px solid red';
    canvas.style.maxWidth = '300px';
    canvas.style.maxHeight = '500px';

    document.body.appendChild(canvas);

    // EXPORT RAW PNG
    const pngLink = document.createElement('a');
    pngLink.href = canvas.toDataURL('image/png');
    pngLink.download = `debug-ticket-${order.id}.png`;
    pngLink.click();

    console.log('PNG EXPORTED');

    // 6. Generate PDF using PNG for lossless text edges
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [canvas.width, canvas.height]
  });

  pdf.addImage(
    imgData,
    'PNG',
    0,
    0,
    canvas.width,
    canvas.height
  );

  pdf.save(`Ticket-${order.id}.pdf`);

  } catch (error) {
    console.error('Production PDF Pipeline Failed:', error);
  } finally {
    // 7. CRITICAL CLEANUP
    root.unmount();
    if (exportContainer.parentNode) {
      document.body.removeChild(exportContainer);
    }
  }
};

