
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

export const handleDownloadPDF = async (order: Order) => {
  const element = document.getElementById(`ticket-card-${order.id}`);
  if (!element) return;
  
  // 1. Create a safe stylesheet for the capture process
  const style = document.createElement('style');
  style.id = 'ticket-export-isolated-styles';
  style.innerHTML = `
    .pdf-export-container {
      position: fixed;
      left: -9999px;
      top: -9999px;
      z-index: -100;
      background: #0A0F0E;
      padding: 40px;
    }
    
    /* Global type resets for the isolated capture */
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace !important; }
    .font-black { font-weight: 900 !important; }
    .font-bold { font-weight: 700 !important; }
    .uppercase { text-transform: uppercase !important; }
    .tracking-widest { letter-spacing: 0.1em !important; }
    .leading-tight { line-height: 1.25 !important; }
    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
  `;
  
  try {
    document.head.appendChild(style);

    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0A0F0E',
      logging: false,
      windowWidth: 500,
      onclone: (clonedDoc) => {
        // 2. ISOLATION: Remove ALL global stylesheets that might contain oklab/oklch
        // This prevents the html2canvas parser crash which happens when scanning stylesheets
        const stylesheets = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
        stylesheets.forEach(sheet => {
          if (sheet.id !== 'ticket-export-isolated-styles') {
            sheet.remove();
          }
        });

        const clonedElement = clonedDoc.getElementById(`ticket-card-${order.id}`);
        if (clonedElement) {
          // Force layout for capture
          clonedElement.style.width = '500px';
          clonedElement.style.display = 'block';
          clonedElement.style.margin = '0';
          clonedElement.style.position = 'static';
          
          // Double-check sanitization for inline styles if any slipped through
          const allElements = clonedElement.querySelectorAll('*');
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            // Clean up any remaining dynamic effects that html2canvas struggles with
            htmlEl.style.transition = 'none';
            htmlEl.style.animation = 'none';
            htmlEl.style.transform = 'none';
            htmlEl.style.boxShadow = 'none';
            htmlEl.style.filter = 'none';
            htmlEl.style.backdropFilter = 'none';
          });
        }
      }
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [140, 200]
    });

    pdf.addImage(imgData, 'PNG', 10, 10, 120, 180);
    pdf.save(`Ticket-${order.id}.pdf`);
  } catch (error) {
    console.error('PDF generation failed', error);
    alert('Failed to generate PDF. Please try again.');
  } finally {
    if (document.head.contains(style)) {
      document.head.removeChild(style);
    }
  }
};
