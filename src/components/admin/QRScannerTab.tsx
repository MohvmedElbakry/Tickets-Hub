import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, RefreshCw, CheckCircle2, X, Camera, Keyboard, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
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
  const [manualCode, setManualCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingScanRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Auto-select event if only one is available or set initial
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(String(events[0].id));
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopScannerInstance();
    };
  }, []);

  const playFeedbackAudio = (success: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (success) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // AudioContext may be blocked by autoplay policies
    }
  };

  const stopScannerInstance = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      } finally {
        scannerRef.current = null;
      }
    }
  };

  const startScanning = async () => {
    setCameraError(null);
    setScanResult(null);

    // Verify secure context (HTTPS or localhost)
    const isSecure = window.isSecureContext || 
      window.location.protocol === 'https:' || 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1';
    
    if (!isSecure) {
      setCameraError('Camera scanning requires a secure connection (HTTPS).');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported in this browser.');
      return;
    }

    try {
      // Pre-check camera permission and release tracks immediately so Html5Qrcode acquires the device cleanly
      const preflightStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      preflightStream.getTracks().forEach(track => track.stop());

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera preflight error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access denied. Please click the lock or camera icon in your browser address bar to allow camera access.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera is currently in use by another tab or app. Please close other camera apps and retry.');
      } else if (err.name === 'OverconstrainedError') {
        setCameraError('Camera constraint error. Retrying with default camera.');
        setIsScanning(true);
      } else if (err.name === 'SecurityError') {
        setCameraError('Camera access requires HTTPS or localhost.');
      } else {
        setCameraError(`Camera error: ${err.message || 'Unable to access camera.'}`);
      }
    }
  };

  useEffect(() => {
    let active = true;

    if (isScanning && selectedEventId) {
      // Delay slightly to ensure reader div is mounted in the DOM
      const timer = setTimeout(async () => {
        if (!active || !isMountedRef.current) return;

        const readerElem = document.getElementById('reader');
        if (!readerElem) return;

        try {
          await stopScannerInstance();
          const html5QrCode = new Html5Qrcode('reader');
          scannerRef.current = html5QrCode;

          const onScanSuccess = async (decodedText: string) => {
            if (processingScanRef.current) return;
            processingScanRef.current = true;

            try {
              if (html5QrCode.getState() === Html5QrcodeScannerState.SCANNING) {
                await html5QrCode.stop();
              }
              html5QrCode.clear();
            } catch (stopErr) {
              console.warn('Error pausing scanner:', stopErr);
            }

            if (isMountedRef.current) {
              setIsScanning(false);
              await handleScan(decodedText);
            }
            processingScanRef.current = false;
          };

          const onScanFailure = () => {
            // Frame-by-frame non-matches are expected; ignore.
          };

          // Try starting with rear camera (environment)
          try {
            await html5QrCode.start(
              { facingMode: 'environment' },
              {
                fps: 15,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
              },
              onScanSuccess,
              onScanFailure
            );
          } catch (envError) {
            // Fallback: enumerate available cameras and pick the first one
            console.warn('FacingMode environment failed, trying camera list fallback:', envError);
            const cameras = await Html5Qrcode.getCameras();
            if (cameras && cameras.length > 0) {
              await html5QrCode.start(
                cameras[0].id,
                {
                  fps: 15,
                  qrbox: { width: 250, height: 250 },
                  aspectRatio: 1.0
                },
                onScanSuccess,
                onScanFailure
              );
            } else {
              throw envError;
            }
          }
        } catch (initErr: any) {
          console.error('Failed to initialize Html5Qrcode:', initErr);
          if (isMountedRef.current) {
            setCameraError(`Failed to start camera scanner: ${initErr?.message || 'Device error'}`);
            setIsScanning(false);
          }
        }
      }, 100);

      return () => {
        active = false;
        clearTimeout(timer);
        stopScannerInstance();
      };
    }
  }, [isScanning, selectedEventId]);

  const handleScan = async (rawCode: string) => {
    if (!rawCode || !selectedEventId) return;
    setIsSubmitting(true);
    setScanResult(null);

    try {
      const data = await eventService.adminScanTicket({
        ticket_id: rawCode.trim(),
        event_id: selectedEventId
      });

      if (data) {
        playFeedbackAudio(true);
        setScanResult({
          success: true,
          message: data.message || 'Approved',
          ticket: data.ticket
        });
      }
    } catch (err: any) {
      playFeedbackAudio(false);
      const errorData = err.data || (typeof err.message === 'string' && err.message.startsWith('{') ? JSON.parse(err.message) : null);
      setScanResult({
        success: false,
        message: errorData?.error || err.message || 'Scan failed',
        scanned_count: errorData?.scanned_count
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScan(manualCode.trim());
    setManualCode('');
  };

  return (
    <div className="space-y-8">
      <div className="bg-bg-card p-6 sm:p-8 rounded-3xl border border-bg-border shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-h3 text-text-primary">Venue Entry Scanner</h3>
            <p className="text-body-sm text-text-muted">Scan QR codes or enter ticket IDs for attendee admission.</p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal/10 border border-teal/20 text-teal text-body-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            Gate Scanner Ready
          </div>
        </div>

        {/* Event Selection & Camera Trigger */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div>
            <label className="block text-body-sm font-medium text-text-muted mb-2">Select Event Gate</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setScanResult(null);
                setCameraError(null);
              }}
              className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary transition-colors"
            >
              <option value="">Select an event...</option>
              {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <Button 
              variant="accent" 
              className="w-full py-3 h-[48px] flex items-center justify-center gap-2" 
              disabled={!selectedEventId || isScanning || isSubmitting}
              onClick={startScanning}
            >
              <Camera size={18} />
              {isScanning ? 'Camera Active' : 'Start Camera Scanner'}
            </Button>
          </div>
        </div>

        {/* Camera Error Display */}
        {cameraError && (
          <div className="mb-8 p-6 bg-status-error/10 border border-status-error/20 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-3 text-status-error mb-3">
              <AlertCircle size={24} />
              <p className="text-body-base font-bold">{cameraError}</p>
            </div>
            <div className="text-body-xs text-text-muted mb-4 space-y-1">
              <p>To grant camera permissions:</p>
              <p className="font-medium text-text-primary">Click the lock icon in the address bar → allow camera → click Retry</p>
            </div>
            <Button variant="outline" size="sm" onClick={startScanning}>
              <RefreshCw size={16} className="mr-2" /> Retry Camera
            </Button>
          </div>
        )}

        {/* Live Camera Viewfinder */}
        {isScanning && (
          <div className="max-w-md mx-auto mb-8 bg-black rounded-3xl overflow-hidden border border-bg-border shadow-2xl relative">
            <div className="p-3 bg-bg-elevated border-b border-bg-border flex items-center justify-between text-body-xs text-text-muted">
              <span className="flex items-center gap-2 text-teal font-medium">
                <span className="w-2 h-2 rounded-full bg-teal animate-ping" />
                Live Camera Feed
              </span>
              <span>Point at ticket QR code</span>
            </div>
            
            <div className="relative min-h-[300px] flex items-center justify-center bg-black">
              <div id="reader" className="w-full" />
            </div>

            <Button 
              variant="outline" 
              className="w-full rounded-none border-t border-bg-border py-3 bg-bg-page hover:bg-bg-elevated"
              onClick={() => {
                stopScannerInstance();
                setIsScanning(false);
              }}
            >
              Cancel Scanning
            </Button>
          </div>
        )}

        {/* Scan Result Feedback Banner */}
        <AnimatePresence>
          {scanResult && (
            <motion.div 
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-6 sm:p-8 rounded-3xl border mb-8 transition-colors ${
                scanResult.success 
                  ? 'bg-status-success/10 border-status-success/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]' 
                  : 'bg-status-error/10 border-status-error/30 shadow-[0_0_30px_rgba(239,68,68,0.15)]'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${scanResult.success ? 'bg-status-success/20 text-status-success' : 'bg-status-error/20 text-status-error'}`}>
                  {scanResult.success ? (
                    <CheckCircle2 size={36} />
                  ) : (
                    <X size={36} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-h2 font-black tracking-tight ${scanResult.success ? 'text-status-success' : 'text-status-error'}`}>
                      {scanResult.success ? 'Access Granted' : 'Access Denied'}
                    </h4>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                      scanResult.success ? 'bg-status-success/20 text-status-success' : 'bg-status-error/20 text-status-error'
                    }`}>
                      {scanResult.success ? 'VALID' : 'REJECTED'}
                    </span>
                  </div>

                  <p className="text-body-base font-medium mt-1 text-text-primary">
                    {scanResult.message}
                  </p>

                  {scanResult.scanned_count !== undefined && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-status-error/20 border border-status-error/30 text-status-error text-body-sm font-bold">
                      <AlertCircle size={16} />
                      Duplicate Scans Detected: {scanResult.scanned_count} previous scan(s)
                    </div>
                  )}

                  {scanResult.ticket && (
                    <div className="mt-4 pt-4 border-t border-bg-border/60 grid grid-cols-2 sm:grid-cols-3 gap-4 text-body-xs">
                      <div>
                        <span className="text-text-muted block">Attendee</span>
                        <span className="font-semibold text-text-primary text-body-sm truncate block">
                          {scanResult.ticket.attendee_name || 'Guest'}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted block">Ticket Type</span>
                        <span className="font-semibold text-text-primary text-body-sm truncate block">
                          {scanResult.ticket.name}
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-text-muted block">Ticket Identifier</span>
                        <span className="font-mono font-bold text-teal text-body-sm truncate block">
                          {scanResult.ticket.public_id || `#${scanResult.ticket.id}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button 
                  variant="accent" 
                  size="sm" 
                  onClick={() => {
                    setScanResult(null);
                    startScanning();
                  }}
                  disabled={!selectedEventId}
                >
                  <Camera size={16} className="mr-2" /> Scan Next Ticket
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setScanResult(null)}
                >
                  Dismiss
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manual Code Entry & Scanner Gun Fallback */}
        <div className="pt-6 border-t border-bg-border">
          <div className="flex items-center gap-2 text-body-sm font-semibold text-text-primary mb-3">
            <Keyboard size={18} className="text-teal" />
            <span>Manual Check-In / USB Barcode Scanner</span>
          </div>
          <p className="text-body-xs text-text-muted mb-4">
            If an attendee's screen is damaged, unreadable, or you are using a handheld 2D scanner gun, enter the ticket code, QR string, or public ID here:
          </p>
          <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. TKT_8FA37B12, TicketsHub-Ticket-..., or numeric ID"
              className="flex-1 bg-bg-page border border-bg-border rounded-xl px-4 py-2.5 text-body-sm focus:border-teal outline-none text-text-primary font-mono placeholder:text-text-muted/60"
              disabled={isSubmitting}
            />
            <Button 
              type="submit" 
              variant="outline" 
              className="px-6 py-2.5 flex items-center justify-center gap-2 whitespace-nowrap"
              disabled={!manualCode.trim() || !selectedEventId || isSubmitting}
            >
              {isSubmitting ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <>
                  <span>Check In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
