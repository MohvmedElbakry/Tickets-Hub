import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  CheckCircle2, 
  RefreshCw, 
  Clock, 
  Lock, 
  Calendar, 
  MapPin, 
  Ticket, 
  Download 
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/Button';
import { Order } from '../types';
import { orderService } from '../services/orderService';
import { useUI } from '../context/UIContext';
import { handleDownloadPDF } from '../lib/ticketUtils';
import { useQRStatus } from '../hooks/useQRStatus';
import { useOrder } from '../hooks/useOrder';
import { updateOrderCache, getOrderCached } from '../lib/orderCache';
import { formatEventTime } from '../lib/utils';

export const ConfirmationPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { lastOrder, setLastOrder } = useUI();
  
  // 🔥 SINGLE SOURCE OF TRUTH PRIORITY: 
  // 1. location.state.order, 2. lastOrder (context), 3. null
  const initialOrder = (location.state as any)?.order || 
    (lastOrder && id && lastOrder.id.toString() === id ? lastOrder : null);

  // Pre-fill cache if we already have valid data to avoid unnecessary network calls
  useEffect(() => {
    if (initialOrder && id && initialOrder.id.toString() === id) {
      const hasValidEventData = initialOrder.event && 
        (initialOrder.event.event_date || initialOrder.event.date) && 
        (initialOrder.event.event_time || initialOrder.event.time);
      
      if (hasValidEventData) {
        updateOrderCache(initialOrder);
      }
    }
  }, [initialOrder, id]);

  const { order: hookOrder, loading: hookLoading } = useOrder(id);
  
  // Prefer hookOrder (cached or fetched), fallback to initialOrder for immediate UI
  const order = hookOrder || initialOrder;
  const isPaid = order?.is_paid === true || order?.order_status === 'paid';
  
  const { qrStatus, loading: loadingQr } = useQRStatus(id, isPaid);
  const loadingOrder = hookLoading && !initialOrder;
  
  // Sync state between hook and context
  useEffect(() => {
    if (hookOrder) {
      setLastOrder(hookOrder);
    }
  }, [hookOrder, setLastOrder]);

  const isQRVisible = qrStatus?.visible;

  const confirmationMessage = isQRVisible
    ? "Your booking is confirmed. Your QR code is ready for entry."
    : "Your booking is confirmed. Your ticket will be sent to you as soon as we get close to the event.";

  // FIX 2 & 3: Success condition must run BEFORE any loading logic
  if (order?.is_paid || order?.order_status === 'paid') {
    // Show success UI (continues to main return)
  } else if (loadingOrder || !order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <RefreshCw className="animate-spin text-teal mb-4" size={48} />
        <p className="text-text-muted font-black tracking-widest uppercase text-label">Updating Order Integrity...</p>
      </div>
    );
  }

  const isProcessing = !isPaid;
  
  const refreshOrderStatus = async () => {
    if (!id) return;
    try {
      // Use getOrderCached with forceRefresh: true to ensure we hit the network
      const resp = await getOrderCached(Number(id), true);
      if (resp) {
        setLastOrder(resp);
      }
    } catch (err) {
      console.error('Failed to refresh order status', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center layout-stack gap-12">
      <div>
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`w-24 h-24 ${isPaid ? 'bg-status-success/20 text-status-success' : 'bg-status-warning/20 text-status-warning'} rounded-full flex items-center justify-center mx-auto mb-8`}
        >
          {isPaid ? <CheckCircle2 size={48} /> : <RefreshCw className="animate-spin" size={48} />}
        </motion.div>
        
        <h1 className="text-h1 mb-4">
          {isPaid ? 'Booking Confirmed!' : 'Processing Payment...'}
        </h1>
        
        <div className="text-text-muted text-body-lg mb-8 max-w-lg mx-auto leading-relaxed">
          {isPaid ? (
            <>
              {confirmationMessage} Order for <span className="text-text-primary font-black uppercase tracking-tight">{order.event?.title}</span>.
            </>
          ) : (
            <div className="content-stack gap-4">
              <p>We are waiting for HUB-PAY to confirm your payment for <span className="text-text-primary font-black">{order.event?.title}</span>.</p>
              {order.order_status === 'pending' && (
                <div className="text-label text-status-warning bg-status-warning/5 py-3 px-5 rounded-card border border-status-warning/10 inline-flex items-center gap-2 mx-auto font-black tracking-widest">
                  <Clock size={14} /> EXPIRES IN 60 MINUTES
                </div>
              )}
            </div>
          )}
          <div className="mt-4 text-label font-bold tracking-widest text-text-muted/60">
            ORDER ID: <span className="text-teal">#{order.id}</span>
          </div>
        </div>

        {isProcessing && (
          <div className="mb-8">
            <Button variant="outline" onClick={refreshOrderStatus} className="gap-2 text-button font-black uppercase tracking-widest">
              <RefreshCw size={16} /> Refresh Status
            </Button>
          </div>
        )}
      </div>

      <div id={`ticket-card-${order.id}`} className="bg-bg-card p-8 rounded-card-2xl border border-bg-border mb-4 relative overflow-hidden shadow-ticket transition-all duration-slow hover:shadow-card-glow group">
        <div className={`absolute top-0 left-0 w-full h-1.5 ${isPaid ? 'bg-status-success shadow-status-success/20 shadow-lg' : 'bg-status-warning animate-pulse'}`}></div>
        
        <div className="flex flex-col md:flex-row gap-8 items-center text-left">
          <div className="w-48 h-48 bg-white p-4 rounded-card relative flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-slow">
            {loadingQr ? (
              <RefreshCw className="animate-spin text-bg-page" size={32} />
            ) : qrStatus?.visible ? (
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrStatus.qr_data}`} alt="QR Code" className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-bg-page text-center p-2">
                <Lock size={32} className="mb-2 opacity-60" />
                <p className="text-[10px] font-black uppercase tracking-widest leading-tight">QR Code Locked</p>
                <p className="text-[8px] font-bold mt-1 max-w-[120px]">{qrStatus?.reason || 'Waiting for entry window'}</p>
              </div>
            )}
          </div>

          <div className="flex-1 content-stack gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <span className={`px-2.5 py-1 rounded-tag text-[10px] font-black uppercase tracking-wider ${isPaid ? 'bg-status-success/10 text-status-success border border-status-success/20' : 'bg-status-warning/10 text-status-warning border border-status-warning/20'}`}>
                  {isPaid ? 'CONFIRMED' : 'PENDING'}
                </span>
                {isPaid && <p className="text-label text-text-muted font-bold">DIGITAL PASS</p>}
              </div>
              <h3 className="text-h3 leading-tight">{order.event?.title}</h3>
            </div>

            <div className="content-stack gap-2 text-text-muted text-body-sm font-medium">
              <p className="flex items-center gap-2">
                <Calendar size={16} className="text-teal" /> 
                {order.event?.event_date || (order.event?.date ? new Date(order.event.date).toLocaleDateString() : 'Date TBD')} at {formatEventTime(order.event?.event_date || order.event?.date, order.event?.event_time || order.event?.time)}
              </p>
              <p className="flex items-center gap-2"><MapPin size={16} className="text-teal" /> {order.event?.location || 'Location TBD'}</p>
              
              <div className="mt-4 pt-4 border-t border-bg-border flex flex-col gap-2">
                {order.items?.map((item: any, index: number) => (
                  <p key={item.id || index} className="flex items-center gap-2 text-body-xs font-black uppercase tracking-widest text-text-primary">
                    <Ticket size={14} className="text-teal" /> {item.quantity}x {item.name || (item.ticket_type ? item.ticket_type.name : 'Ticket')}
                  </p>
                ))}
              </div>
            </div>

            {isPaid && (
              <div className="mt-4 flex flex-wrap gap-3">
                <Button 
                  variant="accent" 
                  className="px-5 py-2 text-label font-black uppercase tracking-widest flex items-center gap-2"
                  onClick={() => handleDownloadPDF(order)}
                >
                  <Download size={14} /> Download PDF
                </Button>
                <div className="relative group/tooltip">
                  <Button variant="outline" className="px-5 py-2 text-label font-black uppercase tracking-widest opacity-50 cursor-not-allowed">Add to Wallet</Button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-bg-elevated text-text-primary text-[10px] rounded-tag opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-bg-border z-10 font-bold tracking-widest">
                    COMING SOON
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 border-t border-bg-border pt-12">
        <Button variant="outline" className="px-8 py-3 text-button font-black uppercase tracking-widest" onClick={() => navigate('/')}>Return to Hub</Button>
        <Button variant="ghost" className="px-8 py-3 text-button font-black uppercase tracking-widest text-teal hover:text-teal-light" onClick={() => navigate('/dashboard')}>My Tickets Dashboard</Button>
      </div>
    </div>
  );
};
