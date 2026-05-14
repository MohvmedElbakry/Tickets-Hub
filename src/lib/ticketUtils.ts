
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

  // 1. Create a professional export-safe theme override style
  // This forces all modern color functions to stable HEX/RGB fallbacks
  // specifically during the export process to prevent html2canvas crashes.
  const style = document.createElement('style');
  style.id = 'ticket-export-overrides';
  style.innerHTML = `
    .export-pdf-mode {
      --teal: #00C9B1 !important;
      --teal-light: #4DDECF !important;
      --teal-dark: #00A896 !important;
      --teal-deep: #007A6E !important;
      --bg-page: #0A0F0E !important;
      --bg-card: #111918 !important;
      --bg-border: #1A2422 !important;
      --bg-elevated: #1E2D2B !important;
      --text-primary: #E8F5F3 !important;
      --text-muted: #7AADA6 !important;
      --status-success: #00C9B1 !important;
      --status-error: #E84040 !important;
      --status-warning: #E8A020 !important;
      
      /* Reset modern color features that conflict with html2canvas */
      color-interpolation-filters: sRGB !important;
      color-rendering: optimizeQuality !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Disable all animations and expensive effects during capture */
    .export-pdf-mode *, 
    .export-pdf-mode {
      transition: none !important;
      animation: none !important;
      transform: none !important;
      box-shadow: none !important;
      text-shadow: none !important;
      backdrop-filter: none !important;
      filter: none !important;
    }

    /* Ensure scroll containers are fully expanded */
    .export-pdf-mode .custom-scrollbar {
      overflow: visible !important;
      max-height: none !important;
      display: block !important;
    }
  `;
  
  try {
    document.head.appendChild(style);
    
    // 2. Apply the export mode class to the target element
    element.classList.add('export-pdf-mode');

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
        // Double-check the cloned element dimensions
        const clonedElement = clonedDoc.getElementById(`ticket-card-${order.id}`);
        if (clonedElement) {
          clonedElement.style.width = '500px';
          clonedElement.style.display = 'block';

          // 3. Computed Style Sanitization
          // html2canvas crashes when it encounters oklab/oklch in computed styles.
          // We traverse the cloned tree and override problematic properties with safe fallbacks.
          const allElements = clonedElement.querySelectorAll('*');
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const style = window.getComputedStyle(htmlEl);
            
            // List of properties prone to having modern color functions
            const colorProps = [
              'color', 'background-color', 'border-color', 
              'border-top-color', 'border-right-color', 
              'border-bottom-color', 'border-left-color',
              'outline-color', 'fill', 'stroke'
            ];

            colorProps.forEach(prop => {
              const value = style.getPropertyValue(prop);
              if (value.includes('oklch') || value.includes('oklab')) {
                // Apply a deterministic fallback based on the property type
                // This ensures html2canvas doesn't crash while maintaining cinematic contrast
                if (prop === 'color' || prop === 'fill' || prop === 'stroke') {
                  // Fallback for primary text
                  htmlEl.style.setProperty(prop, '#E8F5F3', 'important');
                } else {
                  // Fallback for backgrounds/borders
                  htmlEl.style.setProperty(prop, '#1A2422', 'important');
                }
              }
            });

            // Sanitize complex properties like gradients and shadows
            const background = style.getPropertyValue('background');
            const backgroundImage = style.getPropertyValue('background-image');
            if (background.includes('oklch') || background.includes('oklab')) {
              htmlEl.style.setProperty('background', '#111918', 'important');
            }
            if (backgroundImage.includes('oklch') || backgroundImage.includes('oklab')) {
              // Gradients using oklch/oklab are particularly unstable in html2canvas
              htmlEl.style.setProperty('background-image', 'none', 'important');
            }

            const boxShadow = style.getPropertyValue('box-shadow');
            if (boxShadow.includes('oklch') || boxShadow.includes('oklab')) {
              htmlEl.style.setProperty('box-shadow', 'none', 'important');
            }
            
            const textShadow = style.getPropertyValue('text-shadow');
            if (textShadow.includes('oklch') || textShadow.includes('oklab')) {
              htmlEl.style.setProperty('text-shadow', 'none', 'important');
            }
          });
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
    // 3. Guaranteed Cleanup
    element.classList.remove('export-pdf-mode');
    if (document.head.contains(style)) {
      document.head.removeChild(style);
    }
  }
};
