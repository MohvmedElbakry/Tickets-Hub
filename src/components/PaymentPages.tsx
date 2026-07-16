import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowLeft 
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/Button';
import { orderService } from '../services/orderService';
import { useUI } from '../context/UIContext';
import { useEvents, useSettings } from '../context/EventsContext';
import { Order } from '../types';

export const CheckoutPage = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const { lastOrder, setLastOrder } = useUI();
  const { settings } = useSettings();
  const [order, setOrder] = useState<Order | null>(lastOrder && (lastOrder.public_id === publicId || lastOrder.id.toString() === publicId) ? lastOrder : null);
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (publicId && (!order || order.public_id !== publicId)) {
      setLoading(true);
      orderService.getOrder(publicId).then(fetchedOrder => {
        if (fetchedOrder) {
          setOrder(fetchedOrder);
          setLastOrder(fetchedOrder);
        } else {
          setError('Order not found');
        }
        setLoading(false);
      }).catch(err => {
        console.error('Failed to fetch order', err);
        setError('Failed to load order details');
        setLoading(false);
      });
    }
  }, [publicId, order, setLastOrder]);

  const handlePay = async () => {
    if (!order || paymentLoading) return;
    
    console.log(`[CheckoutPage] handlePay triggered for order #${order.public_id}`);
    
    // REUSE existing session URL if available from the order object
    if (order.kashier_url) {
      console.log(`[CheckoutPage] REUSING existing kashier_url found in order object: ${order.kashier_url}`);
      localStorage.setItem('last_payment_order_id', order.public_id);
      localStorage.setItem('last_payment_time', Date.now().toString());
      window.location.href = order.kashier_url;
      return;
    }

    setPaymentLoading(true);
    try {
      console.log(`[CheckoutPage] Initiating createPaymentSession for order identifier: ${order.public_id}`);
      // Clear any existing session locks before starting a new payment session
      sessionStorage.removeItem("payment_redirect_done");
      sessionStorage.removeItem("payment_navigation_lock");

      const data = await orderService.createPaymentSession(order.public_id);
      
      if (data?.reused) {
        console.log(`[CheckoutPage] Backend reported session REUSE for order identifier: ${order.public_id}`);
      } else {
        console.log(`[CheckoutPage] New session created for order identifier: ${order.public_id}`);
      }

      const checkoutUrl = data?.checkoutUrl || data?.payment_url;
      
      if (checkoutUrl) {
        console.log(`[CheckoutPage] Redirecting to: ${checkoutUrl}`);
        localStorage.setItem('last_payment_order_id', order.public_id);
        localStorage.setItem('last_payment_time', Date.now().toString());
        window.location.href = checkoutUrl;
      } else {
        console.error('[CheckoutPage] No checkout URL returned from backend', data);
        setError('Failed to create payment session. Please try again.');
        setPaymentLoading(false);
      }
    } catch (err) {
      console.error('[CheckoutPage] Payment initialization error:', err);
      setError('Payment initialization failed. Please contact support.');
      setPaymentLoading(false);
    }
  };

  if (loading || !order || order.public_id !== publicId) return (
    <div className="max-w-7xl mx-auto px-4 py-24 text-center">
      <RefreshCw className="animate-spin text-teal mx-auto mb-4" size={48} />
      <p className="text-text-muted font-bold tracking-widest uppercase text-label">Verifying Order Details...</p>
    </div>
  );

  if (error || !order) return (
    <div className="max-w-7xl mx-auto px-4 py-32 text-center layout-stack items-center">
      <div className="w-20 h-20 bg-status-error/10 text-status-error rounded-card flex items-center justify-center">
        <XCircle size={40} />
      </div>
      <div className="content-stack gap-2">
        <h2 className="text-h2">Order Not Found</h2>
        <p className="text-text-muted max-w-sm mx-auto">{error || 'We couldn\'t find the order you\'re looking for.'}</p>
      </div>
      <Button variant="outline" className="px-10" onClick={() => navigate('/')}>Return to Hub</Button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-text-muted hover:text-text-primary mb-10 transition-colors group">
        <div className="w-8 h-8 rounded-card border border-bg-border flex items-center justify-center group-hover:bg-bg-elevated transition-colors">
          <ArrowLeft size={16} />
        </div>
        <span className="text-label font-black tracking-widest uppercase">Cancel and Return</span>
      </button>

      <div className="bg-bg-card rounded-card-2xl border border-bg-border overflow-hidden shadow-2xl">
        <div className="p-10 border-b border-bg-border bg-bg-elevated/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="content-stack gap-1">
            <h1 className="text-h2">Checkout</h1>
            <p className="text-label text-text-muted font-bold tracking-widest">ORDER TRANSACTION <span className="text-teal">#{order.public_id?.split('-')[0]}</span></p>
          </div>
          <div className="hidden md:block">
            <span className="px-4 py-1.5 bg-status-warning/10 text-status-warning border border-status-warning/20 rounded-tag text-[10px] font-black uppercase tracking-widest">Awaiting Payment</span>
          </div>
        </div>

        <div className="p-10 layout-stack gap-10">
          <div className="content-stack gap-6">
            <h3 className="text-h4">Order Details</h3>
            <div className="layout-stack gap-4">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-5 bg-bg-elevated rounded-card border border-bg-border/50 group hover:border-teal/30 transition-colors">
                  <div className="content-stack gap-1">
                    <p className="text-body-base font-black text-text-primary uppercase tracking-tight">{item.ticket_type?.name || item.name}</p>
                    <p className="text-label text-text-muted font-bold tracking-widest">{item.quantity}× {item.ticket_type?.name || item.name || 'UNIT PASS'}</p>
                  </div>
                  <p className="text-h4 text-text-primary">{(item.price_each * item.quantity).toFixed(2)} <span className="text-body-xs font-normal opacity-40">EGP</span></p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-10 border-t border-bg-border layout-stack gap-4">
            <div className="flex justify-between items-center text-text-muted">
              <span className="text-label font-bold tracking-widest">SUBTOTAL</span>
              <span className="text-body-base font-mono">{order.total_price.toFixed(2)} EGP</span>
            </div>
            <div className="flex justify-between items-center text-text-muted">
              <span className="text-label font-bold tracking-widest">Platform Service Fee ({settings.service_fee_percent}%)</span>
              <span className="text-body-base font-mono">{(order.total_price * (settings.service_fee_percent / 100)).toFixed(2)} EGP</span>
            </div>
            <div className="flex justify-between items-center text-text-muted">
              <span className="text-label font-bold tracking-widest">Processing Fee ({settings.processing_fee_percent}% + {settings.fixed_fee_egp} EGP)</span>
              <span className="text-body-base font-mono">{(order.total_price * (settings.processing_fee_percent / 100) + settings.fixed_fee_egp).toFixed(2)} EGP</span>
            </div>
            <div className="flex justify-between items-center pt-6 mt-4 border-t border-bg-border/30">
              <span className="text-h3">Total Price</span>
              <span className="text-h2 text-teal shadow-teal/5">{(order.total_price + (order.total_price * (settings.service_fee_percent / 100)) + (order.total_price * (settings.processing_fee_percent / 100) + settings.fixed_fee_egp)).toFixed(2)} <span className="text-body-sm font-normal text-text-muted">EGP</span></span>
            </div>
          </div>

          <div className="pt-10">
            <Button 
              variant="accent" 
              className="w-full py-6 text-button font-black uppercase tracking-widest gap-3 shadow-card-glow" 
              onClick={handlePay}
              disabled={paymentLoading}
            >
              <CreditCard size={22} className="opacity-80" /> {paymentLoading ? 'Loading...' : 'Pay Now'}
            </Button>
            <div className="flex flex-col items-center gap-6 mt-10">
              <div className="flex items-center gap-8 filter grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-medium">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="MasterCard" className="h-8" />
                <p className="text-label font-black opacity-60">FAWRY</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const { lastOrder: order } = useUI();
  return (
    <div className="max-w-2xl mx-auto px-4 py-32 text-center layout-stack gap-12">
      <div className="content-stack items-center">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="w-24 h-24 bg-status-success/20 text-status-success rounded-full flex items-center justify-center mx-auto mb-10 shadow-status-success/10 shadow-2xl"
        >
          <CheckCircle2 size={48} />
        </motion.div>
        
        <div className="content-stack gap-4">
          <h1 className="text-h1">Payment Successful!</h1>
          <p className="text-body-lg text-text-muted max-w-lg mx-auto">
            Thank you for your purchase. Your order <span className="text-text-primary font-black">#{order?.public_id?.split('-')[0]}</span> has been confirmed and your tickets are now activated in your dashboard.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8 border-t border-bg-border">
        <Button variant="accent" className="px-10 py-4 text-button font-black uppercase tracking-widest" onClick={() => navigate('/dashboard')}>Access My Tickets</Button>
        <Button variant="outline" className="px-10 py-4 text-button font-black uppercase tracking-widest font-sans" onClick={() => navigate('/')}>Return to Hub</Button>
      </div>
    </div>
  );
};

export const PaymentFailurePage = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto px-4 py-32 text-center layout-stack gap-12">
      <div className="content-stack items-center">
        <div className="w-24 h-24 bg-status-error/20 text-status-error rounded-full flex items-center justify-center mx-auto mb-10 shadow-status-error/10 shadow-2xl">
          <XCircle size={48} />
        </div>
        
        <div className="content-stack gap-4">
          <h1 className="text-h1">Payment Failed</h1>
          <p className="text-body-lg text-text-muted max-w-lg mx-auto">
            We couldn't process your payment for order <span className="text-text-primary font-black">#{publicId?.split('-')[0] || '(Unknown)'}</span>. Please verify your details or try a different payment method.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8 border-t border-bg-border">
        {publicId ? (
          <Button variant="accent" className="px-10 py-4 text-button font-black uppercase tracking-widest" onClick={() => navigate(`/checkout/${publicId}`)}>Retry Payment</Button>
        ) : (
          <Button variant="accent" className="px-10 py-4 text-button font-black uppercase tracking-widest" onClick={() => navigate('/')}>Back to Home</Button>
        )}
        <Button variant="outline" className="px-10 py-4 text-button font-black uppercase tracking-widest" onClick={() => navigate('/')}>Contact Support</Button>
      </div>
    </div>
  );
};

export const PaymentPendingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto px-4 py-32 text-center layout-stack gap-12">
      <div className="content-stack items-center">
        <div className="w-24 h-24 bg-status-warning/20 text-status-warning rounded-full flex items-center justify-center mx-auto mb-10 animate-pulse shadow-status-warning/10 shadow-2xl">
          <Clock size={48} />
        </div>
        
        <div className="content-stack gap-4">
          <h1 className="text-h1">Payment Pending</h1>
          <p className="text-body-lg text-text-muted max-w-lg mx-auto">
            Your payment is currently being processed by <span className="text-text-primary font-black tracking-widest">HUB-PAY</span>. We will notify you once it's confirmed.
          </p>
        </div>
      </div>

      <div className="pt-8 border-t border-bg-border">
        <Button variant="outline" className="px-12 py-4 text-button font-black uppercase tracking-widest" onClick={() => navigate('/')}>Return to Hub</Button>
      </div>
    </div>
  );
};
