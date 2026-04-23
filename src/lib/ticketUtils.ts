
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

  try {
    // Create a style element to override modern color functions that html2canvas doesn't support
    const style = document.createElement('style');
    style.innerHTML = `
      * {
        color-interpolation-filters: auto !important;
        color-rendering: auto !important;
      }
    `;
    document.head.appendChild(style);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0f0f13',
      onclone: (clonedDoc) => {
        // Aggressively strip modern color functions from the cloned document's stylesheets
        const styleSheets = Array.from(clonedDoc.styleSheets);
        styleSheets.forEach((sheet) => {
          try {
            const rules = Array.from(sheet.cssRules);
            for (let i = rules.length - 1; i >= 0; i--) {
              const rule = rules[i];
              if (rule.cssText.includes('oklch') || rule.cssText.includes('oklab')) {
                sheet.deleteRule(i);
              }
            }
          } catch (e) {
            console.warn('Could not access stylesheet for stripping modern colors', e);
          }
        });

        // Also check inline styles
        const allElements = clonedDoc.getElementsByTagName('*');
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i] as HTMLElement;
          if (el.style) {
            const styleText = el.getAttribute('style') || '';
            if (styleText.includes('oklch') || styleText.includes('oklab')) {
              el.setAttribute('style', styleText.replace(/oklch\([^)]+\)/g, 'rgb(0,0,0)').replace(/oklab\([^)]+\)/g, 'rgb(0,0,0)'));
            }
          }
        }
      }
    });
    
    document.head.removeChild(style);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`TicketsHub-Ticket-${order.id}.pdf`);
  } catch (error) {
    console.error('PDF generation failed', error);
    alert('Failed to generate PDF. Please try again.');
  }
};
