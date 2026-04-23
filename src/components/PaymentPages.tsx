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
import { Order } from '../types';

export const CheckoutPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lastOrder, setLastOrder } = useUI();
  const [order, setOrder] = useState<Order | null>(lastOrder && lastOrder.id.toString() === id ? lastOrder : null);
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && (!order || order.id.toString() !== id)) {
      setLoading(true);
      orderService.getOrder(id).then(fetchedOrder => {
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
  }, [id, order, setLastOrder]);

  const handlePay = async () => {
    if (!order) return;
    try {
      // Clear any existing session locks before starting a new payment session
      sessionStorage.removeItem("payment_redirect_done");
      sessionStorage.removeItem("payment_navigation_lock");

      const data = await orderService.createPaymentSession(order.id);
      if (data?.checkoutUrl) {
        localStorage.setItem('last_payment_order_id', order.id.toString());
        localStorage.setItem('last_payment_time', Date.now().toString());
        window.location.href = data.checkoutUrl;
      } else {
        alert('Failed to create payment session. Please try again.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('Payment initialization failed.');
    }
  };

  if (loading || !order || order.id.toString() !== id) return (
    <div className="max-w-7xl mx-auto px-4 py-24 text-center">
      <RefreshCw className="animate-spin text-accent mx-auto mb-4" size={48} />
      <p className="text-text-secondary">Loading order details...</p>
    </div>
  );

  if (error || !order) return (
    <div className="max-w-7xl mx-auto px-4 py-24 text-center">
      <XCircle className="text-red-500 mx-auto mb-4" size={48} />
      <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
      <p className="text-text-secondary mb-8">{error || 'We couldn\'t find the order you\'re looking for.'}</p>
      <Button onClick={() => navigate('/')}>Back to Home</Button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-text-secondary hover:text-white mb-8 transition-colors">
        <ArrowLeft size={18} /> Cancel and Return
      </button>

      <div className="bg-secondary-bg rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 bg-white/5">
          <h1 className="text-3xl font-bold mb-2">Checkout</h1>
          <p className="text-text-secondary">Order #{order.id}</p>
        </div>

        <div className="p-8 space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Order Summary</h3>
            <div className="space-y-3">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-primary-bg rounded-2xl border border-white/5">
                  <div>
                    <p className="font-bold">{item.name}</p>
                    <p className="text-xs text-text-secondary">Quantity: {item.quantity}</p>
                  </div>
                  <p className="font-bold">{(item.price_each * item.quantity).toFixed(2)} EGP</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 space-y-3">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span>
              <span>{(order.total_price / 1.1).toFixed(2)} EGP</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Service Fee (10%)</span>
              <span>{(order.total_price - (order.total_price / 1.1)).toFixed(2)} EGP</span>
            </div>
            <div className="flex justify-between items-center pt-3">
              <span className="text-xl font-bold">Total Amount</span>
              <span className="text-3xl font-bold text-accent">{order.total_price.toFixed(2)} EGP</span>
            </div>
          </div>

          <div className="pt-8">
            <Button className="w-full py-5 text-lg gap-3" onClick={handlePay}>
              <CreditCard size={20} /> Pay with Kashier
            </Button>
            <p className="text-center text-xs text-text-secondary mt-6 flex items-center justify-center gap-2">
              <ShieldCheck size={14} className="text-green-500" /> 
              Your payment is secured and encrypted by Kashier
            </p>
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
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
    <motion.div 
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8"
    >
      <CheckCircle2 size={48} />
    </motion.div>
    <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
    <p className="text-text-secondary text-lg mb-12">
      Thank you for your purchase. Your order #{order?.id} has been confirmed and your tickets are now available in your dashboard.
    </p>
    <div className="flex justify-center gap-4">
      <Button variant="primary" onClick={() => navigate('/dashboard')}>Go to My Tickets</Button>
      <Button variant="outline" onClick={() => navigate('/')}>Back to Home</Button>
    </div>
  </div>
  );
};

export const PaymentFailurePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
    <div className="w-24 h-24 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
      <XCircle size={48} />
    </div>
    <h1 className="text-4xl font-bold mb-4">Payment Failed</h1>
    <p className="text-text-secondary text-lg mb-12">
      We couldn't process your payment for order #{id || '(Unknown)'}. Please try again or use a different payment method.
    </p>
    <div className="flex justify-center gap-4">
      {id ? (
        <Button variant="primary" onClick={() => navigate(`/checkout/${id}`)}>Retry Payment</Button>
      ) : (
        <Button variant="primary" onClick={() => navigate('/')}>Back to Home</Button>
      )}
      <Button variant="outline" onClick={() => navigate('/')}>Contact Support</Button>
    </div>
  </div>
  );
};

export const PaymentPendingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
    <div className="w-24 h-24 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-8">
      <Clock size={48} />
    </div>
    <h1 className="text-4xl font-bold mb-4">Payment Pending</h1>
    <p className="text-text-secondary text-lg mb-12">
      Your payment is currently being processed. We will notify you once it's confirmed.
    </p>
    <Button variant="outline" onClick={() => navigate('/')}>Back to Home</Button>
  </div>
  );
};
