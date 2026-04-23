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

export const ConfirmationPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { lastOrder, setLastOrder } = useUI();
  
  // 🔥 SINGLE SOURCE OF TRUTH PRIORITY: 
  // 1. location.state.order, 2. lastOrder (context), 3. null
  const initialOrder = (location.state as any)?.order || 
    (lastOrder && id && lastOrder.id.toString() === id ? lastOrder : null);

  const [order, setOrder] = useState<Order | null>(initialOrder);
  
  const [qrStatus, setQrStatus] = useState<{ visible: boolean, qr_data?: string, reason?: string } | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(() => !order);
  
  // STEP 1: Initial fetch ONLY if absolutely necessary
  useEffect(() => {
    if (!id) return;

    // 1. Priority check for UIContext data
    if (
      lastOrder && 
      lastOrder.id.toString() === id && 
      (lastOrder.is_paid || lastOrder.order_status === 'paid')
    ) {
      if (order !== lastOrder) setOrder(lastOrder);
      setLoadingOrder(false);
      return;
    }

    // 2. Strict guard: only fetch if missing or mismatched
    if (order && order.id.toString() === id) {
      setLoadingOrder(false);
      return;
    }

    let cancelled = false;

    const fetchOrder = async () => {
      setLoadingOrder(true);
      try {
        const fetched = await orderService.getOrder(id);
        if (!cancelled && fetched) {
          setOrder(fetched);
          setLastOrder(fetched);
        }
      } finally {
        if (!cancelled) setLoadingOrder(false);
      }
    };

    fetchOrder();

    return () => {
      cancelled = true;
    };
  }, [id, order, lastOrder, setLastOrder]);

  const isPaid = order?.is_paid === true || order?.order_status === 'paid';

  useEffect(() => {
    if (!id || !isPaid) return;

    setLoadingQr(true);
    orderService.getOrderQRStatus(id)
      .then(setQrStatus)
      .finally(() => setLoadingQr(false));
  }, [id, isPaid]);

  // FIX 2 & 3: Success condition must run BEFORE any loading logic
  if (order?.is_paid || order?.order_status === 'paid') {
    // Show success UI (continues to main return)
  } else if (loadingOrder || !order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <RefreshCw className="animate-spin text-accent mb-4" size={48} />
        <p className="text-text-secondary">Loading payment details...</p>
      </div>
    );
  }

  const isProcessing = !isPaid;
  
  const refreshOrderStatus = async () => {
    try {
      const resp = await orderService.getOrder(order.id);
      if (resp) {
        setOrder(resp);
        setLastOrder(resp);
      }
    } catch (err) {
      console.error('Failed to refresh order status', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <motion.div 
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`w-24 h-24 ${isPaid ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'} rounded-full flex items-center justify-center mx-auto mb-8`}
      >
        {isPaid ? <CheckCircle2 size={48} /> : <RefreshCw className="animate-spin" size={48} />}
      </motion.div>
      
      <h1 className="text-4xl font-bold mb-4">
        {isPaid ? 'Booking Confirmed!' : 'Processing Payment...'}
      </h1>
      
      <p className="text-text-secondary text-lg mb-12">
        {isPaid ? (
          <>Your booking for <span className="text-white font-bold">{order.event?.title}</span> is confirmed. Your tickets are ready below.</>
        ) : (
          <>We are waiting for Kashier to confirm your payment for <span className="text-white font-bold">{order.event?.title}</span>. This usually takes a few seconds.</>
        )}
        <br />
        Order ID: #{order.id}
      </p>

      {isProcessing && (
        <div className="mb-8">
          <Button variant="outline" onClick={refreshOrderStatus} className="gap-2">
            <RefreshCw size={16} /> Refresh Status
          </Button>
        </div>
      )}

      <div id={`ticket-card-${order.id}`} className="bg-secondary-bg p-8 rounded-[2.5rem] border border-white/5 mb-12 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-2 ${isPaid ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="w-48 h-48 bg-white p-4 rounded-2xl relative flex items-center justify-center">
            {loadingQr ? (
              <RefreshCw className="animate-spin text-primary-bg" size={32} />
            ) : qrStatus?.visible ? (
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrStatus.qr_data}`} alt="QR Code" className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-primary-bg text-center p-2">
                <Lock size={32} className="mb-2" />
                <p className="text-[10px] font-bold uppercase">QR Code Locked</p>
                <p className="text-[8px]">{qrStatus?.reason || 'Waiting for payment confirmation'}</p>
              </div>
            )}
          </div>
          <div className="text-left flex-1">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-2xl font-bold">{order.event?.title}</h3>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isPaid ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {isPaid ? 'Paid' : 'Payment Processing'}
              </span>
            </div>
            <div className="space-y-2 text-text-secondary">
              <p className="flex items-center gap-2">
                <Calendar size={16} /> 
                {order.event?.event_date || (order.event?.date ? new Date(order.event.date).toLocaleDateString() : 'Date TBD')} at {order.event?.event_time || order.event?.time || 'Time TBD'}
              </p>
              <p className="flex items-center gap-2"><MapPin size={16} /> {order.event?.location || 'Location TBD'}</p>
              <div className="mt-4 pt-4 border-t border-white/5">
                {order.items?.map((item: any, index: number) => (
                  <p key={item.id || index} className="flex items-center gap-2 text-sm">
                    <Ticket size={14} /> {item.quantity}x {item.name || (item.ticket_type ? item.ticket_type.name : 'Ticket')}
                  </p>
                ))}
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              {isPaid && (
                <Button 
                  variant="primary" 
                  className="px-4 py-2 text-sm"
                  onClick={() => handleDownloadPDF(order)}
                >
                  <Download size={16} /> Download PDF
                </Button>
              )}
              <div className="relative group">
                <Button variant="secondary" className="px-4 py-2 text-sm opacity-50 cursor-not-allowed">Add to Wallet</Button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Coming Soon
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={() => navigate('/')}>Back to Home</Button>
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>View My Tickets</Button>
      </div>
    </div>
  );
};
