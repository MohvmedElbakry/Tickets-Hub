
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
  exportContainer.id = 'pdf-detached-export-pipeline';
  
  // Style the container for absolute isolation
  Object.assign(exportContainer.style, {
    position: 'fixed',
    top: '-9999px',
    left: '-9999px',
    width: '500px',
    height: 'auto',
    backgroundColor: '#0A0F0E',
    zIndex: '-1000',
    overflow: 'hidden'
  });
  
  document.body.appendChild(exportContainer);

  const originalStylesheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
  const disabledNodes: (HTMLStyleElement | HTMLLinkElement)[] = [];

  try {
    // 2. Create a CLEAN EXPORT CLONE
    const clone = element.cloneNode(true) as HTMLElement;
    
    // 3. RECURSIVE SANITIZATION: Remove ALL class names and theme references
    const sanitizeRecursive = (el: HTMLElement) => {
      // Complete removal of class-based styling dependency
      el.removeAttribute('class');
      
      // Remove any data-attributes or other tailwind-specific markers
      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        if (attr.name.startsWith('data-') || attr.name === 'class') {
          el.removeAttribute(attr.name);
        }
      }

      // Force reset any inherited style properties that confuse the canvas parser
      el.style.transition = 'none';
      el.style.animation = 'none';
      el.style.transform = 'none';
      el.style.filter = 'none';
      el.style.backdropFilter = 'none';
      el.style.boxShadow = 'none';

      // Recurse
      for (let i = 0; i < el.children.length; i++) {
        sanitizeRecursive(el.children[i] as HTMLElement);
      }
    };

    sanitizeRecursive(clone);

    // Apply deterministic container styles to the root clone
    Object.assign(clone.style, {
      display: 'block',
      width: '500px',
      margin: '0',
      padding: '0',
      visibility: 'visible',
      backgroundColor: '#0A0F0E',
      color: '#E8F5F3',
      fontFamily: '"DM Sans", sans-serif'
    });

    exportContainer.appendChild(clone);

    // 4. TEMPORARY STYLESHEET SUSPENSION
    // html2canvas reads all document.styleSheets immediately.
    // We disable them during the capture to prevent the crash on oklab/oklch.
    originalStylesheets.forEach(node => {
      const el = node as any;
      if (el.id !== 'ticket-export-isolated-styles') {
        el.disabled = true;
        disabledNodes.push(el);
      }
    });

    // 5. Execute html2canvas on the CLEAN DETACHED NODE
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0A0F0E',
      logging: false,
      width: 500,
      height: clone.offsetHeight
    });

    // 6. Generate PDF
    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'px',
      format: [canvas.width / 2, canvas.height / 2]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`Ticket-${order.id}.pdf`);

  } catch (error) {
    console.error('Detached Export Pipeline Failed:', error);
  } finally {
    // 7. CLEANUP GUARANTEES
    disabledNodes.forEach(node => {
       (node as any).disabled = false;
    });
    
    if (exportContainer.parentNode) {
      document.body.removeChild(exportContainer);
    }
  }
};

