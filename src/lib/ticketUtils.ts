
import { jsPDF } from 'jspdf';
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

/**
 * DETACHED EXPORT RENDER PIPELINE
 * 
 * This pipeline implements a completely detached render surface to isolate
 * html2canvas from the live application's Tailwind v4 stylesheets.
 */
export const handleDownloadPDF = async (order: Order) => {
  const elementId = `ticket-card-${order.id}`;
  const element = document.getElementById(elementId);
  
  if (!element) {
    console.error(`Export identity ${elementId} not found`);
    return;
  }

  // 1. Create a NEW detached export container
  const exportContainer = document.createElement('div');
  Object.assign(exportContainer.style, {
    position: 'fixed',
    top: '-9999px',
    left: '-9999px',
    width: '500px',
    height: 'auto',
    backgroundColor: '#0A0F0E',
    zIndex: '-1000'
  });
  
  document.body.appendChild(exportContainer);

  try {
    // 2. Clone the element
    const clone = element.cloneNode(true) as HTMLElement;
    
    // 3. Simple cleanup of any dynamic attributes that might interfere
    // We don't need aggressive sanitization anymore because the component
    // renders with explicit inline styles when isPdf is true
    exportContainer.appendChild(clone);

    // 4. Capture
    const canvas = await html2canvas(clone, {
      scale: 3, 
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0A0F0E',
      logging: false,
      width: 500,
      height: clone.offsetHeight
    });

    // 5. Generate PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'px',
      format: [canvas.width / 3, canvas.height / 3]
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 3, canvas.height / 3, undefined, 'FAST');
    pdf.save(`Ticket-${order.id}.pdf`);

  } catch (error) {
    console.error('PDF Export Pipeline Failed:', error);
  } finally {
    if (exportContainer.parentNode) {
      document.body.removeChild(exportContainer);
    }
  }
};

