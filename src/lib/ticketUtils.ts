
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

  const style = document.createElement('style');
  style.innerHTML = `
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
  `;
  
  try {
    document.head.appendChild(style);

    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#0f0f13',
      logging: false,
      allowTaint: true,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc) => {
        // Force PDF rendering mode properties on the cloned element
        const clonedElement = clonedDoc.getElementById(`ticket-card-${order.id}`);
        if (clonedElement) {
          clonedElement.style.width = '500px';
          clonedElement.style.transform = 'none';
          clonedElement.style.transition = 'none';
          clonedElement.style.animation = 'none';
          clonedElement.style.boxShadow = 'none';
          
          // Inject a style to handle nested elements in the clone
          const cloneStyle = clonedDoc.createElement('style');
          cloneStyle.innerHTML = `
            #ticket-card-${order.id} *, 
            #ticket-card-${order.id} {
              transition: none !important;
              animation: none !important;
              transform: none !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }
            .custom-scrollbar {
              overflow: visible !important;
              max-height: none !important;
            }
          `;
          clonedDoc.head.appendChild(cloneStyle);
        }
      }
    });

    const imgWidth = canvas.width / 3;
    const imgHeight = canvas.height / 3;
    
    const pdf = new jsPDF({
      orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [imgWidth, imgHeight]
    });

    pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
    pdf.save(`TicketsHub-Ticket-${order.id}.pdf`);
  } catch (error) {
    console.error('PDF generation failed', error);
    alert('Failed to generate PDF. Please try again.');
  } finally {
    if (document.head.contains(style)) {
      document.head.removeChild(style);
    }
  }
};
