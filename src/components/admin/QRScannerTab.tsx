
import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../ui/Button';
import { eventService } from '../../services/eventService';
import { useEvents } from '../../context/EventsContext';

interface QRScannerTabProps {}

export const QRScannerTab: React.FC<QRScannerTabProps> = () => {
  const { events } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startScanning = async () => {
    setCameraError(null);
    setScanResult(null);
    
    // Check for secure connection
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) {
      setCameraError("Camera requires secure connection (HTTPS)");
      return;
    }

    try {
      // Request camera access properly
      await navigator.mediaDevices.getUserMedia({ video: true });
      setIsScanning(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError("Camera access denied. Please allow camera permission and try again.");
      } else {
        setCameraError(`Camera error: ${err.message || 'Something went wrong'}`);
      }
    }
  };

  useEffect(() => {
    let scanner: any = null;
    if (isScanning && selectedEventId) {
      import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
        scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
        scanner.render((decodedText: string) => {
          // Expected format: TicketsHub-Order-123 or TicketsHub-Ticket-456
          const match = decodedText.match(/TicketsHub-(Order|Ticket)-(\d+)/);
          if (match) {
            const ticketId = match[2];
            handleScan(ticketId);
            scanner.clear();
            setIsScanning(false);
          }
        }, (error: any) => {
          // console.warn(error);
        });
      }).catch(err => {
        setCameraError("Failed to load scanner library.");
        setIsScanning(false);
      });
    }
    return () => {
      if (scanner) {
        scanner.clear().catch((err: any) => console.error("Failed to clear scanner", err));
      }
    };
  }, [isScanning, selectedEventId]);

  const handleScan = async (ticketId: string) => {
    try {
      const data = await eventService.adminScanTicket({ ticket_id: ticketId, event_id: selectedEventId });
      if (data) {
        setScanResult({ success: true, message: data.message, ticket: data.ticket });
      }
    } catch (err: any) {
      try {
        const errorData = JSON.parse(err.message);
        setScanResult({ 
          success: false, 
          message: errorData.error || 'Scan failed', 
          scanned_count: errorData.scanned_count 
        });
      } catch {
        setScanResult({ success: false, message: err.message || 'Failed to connect to server.' });
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-secondary-bg p-8 rounded-3xl border border-white/5">
        <h3 className="text-xl font-bold mb-6">Event Entry Scanner</h3>
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Select Event</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
            >
              <option value="">Select an event...</option>
              {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <Button 
              variant="primary" 
              className="w-full py-3" 
              disabled={!selectedEventId || isScanning}
              onClick={startScanning}
            >
              {isScanning ? 'Scanner Active' : 'Start Scanning'}
            </Button>
          </div>
        </div>

        {cameraError && (
          <div className="mt-6 p-6 bg-red-400/10 border border-red-400/20 rounded-3xl text-center">
            <div className="flex items-center justify-center gap-3 text-red-400 mb-4">
              <AlertCircle size={24} />
              <p className="font-bold">{cameraError}</p>
            </div>
            <div className="text-sm text-text-secondary mb-6 space-y-2">
              <p>To fix this:</p>
              <p className="font-medium text-white">Click the lock icon in the browser → allow camera → refresh page</p>
            </div>
            <Button variant="outline" onClick={startScanning}>
              <RefreshCw size={18} className="mr-2" /> Retry
            </Button>
          </div>
        )}

        {isScanning && (
          <div className="max-w-md mx-auto bg-black rounded-2xl overflow-hidden border border-white/10">
            <div id="reader"></div>
            <Button variant="outline" className="w-full rounded-none border-0" onClick={() => setIsScanning(false)}>Cancel</Button>
          </div>
        )}

        {scanResult && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-8 p-8 rounded-3xl border ${scanResult.success ? 'bg-green-400/10 border-green-400/20' : 'bg-red-400/10 border-red-400/20'}`}
          >
            <div className="flex items-center gap-4 mb-4">
              {scanResult.success ? (
                <CheckCircle2 className="text-green-400" size={32} />
              ) : (
                <X className="text-red-400" size={32} />
              )}
              <h4 className={`text-2xl font-bold ${scanResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {scanResult.success ? 'Access Granted' : 'Access Denied'}
              </h4>
            </div>
            <p className="text-lg mb-4">{scanResult.message}</p>
            {scanResult.scanned_count !== undefined && (
              <p className="font-bold text-red-400">Previous scans: {scanResult.scanned_count}</p>
            )}
            {scanResult.ticket && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                <p className="text-sm text-text-secondary">Ticket ID: <span className="text-white font-mono">#{scanResult.ticket.id}</span></p>
                <p className="text-sm text-text-secondary">Type: <span className="text-white">{scanResult.ticket.name}</span></p>
              </div>
            )}
            <Button variant="outline" className="mt-6" onClick={() => setScanResult(null)}>Clear Result</Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};
