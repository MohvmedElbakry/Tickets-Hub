
import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { invalidateOrder } from '../lib/orderCache';
import { clearQRStatusCache } from '../lib/qrStatusCache';

/**
 * useKashierReturn - Refactored to prioritize backend as the Source of Truth.
 */
export const useKashierReturn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthReady } = useAuth();
  
  // Helpers for session-based idempotency
  const isOrderProcessed = (id: string) => sessionStorage.getItem(`processed_${id}`) === "1";
  const markOrderProcessed = (id: string) => sessionStorage.setItem(`processed_${id}`, "1");

  const { 
    setLastOrder, 
    setSelectedEvent, 
    setIsHandlingPayment: setIsHandlingPaymentGlobal,
    setPaymentFlowActive,
    setVerificationStarted,
    isHandlingPayment: isVerifyingGlobal
  } = useUI();

  // 1. PERSIST ORDER ID & DETAILS
  const [paymentDetails] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      orderId: params.get("order_id") || params.get('merchantOrderId'),
      transactionId: params.get("transactionId") || params.get('transaction_id'),
      status: params.get("paymentStatus") || params.get('status')
    };
  });

  const { orderId, transactionId, status: paymentStatus } = paymentDetails;

  const [isRecovering, setIsRecovering] = useState(false);
  const isPaidRef = useRef(false);
  const isConfirmingRef = useRef(false);
  const attemptRef = useRef(0);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 0. ROUTE GUARD
    const isOnPaymentReturnPage = location.pathname.startsWith("/payment-return");
    if (!isOnPaymentReturnPage) return;
    if (!orderId) return;
    if (!isAuthReady) return;

    // 0. STRICT EXECUTION LOCK (Prevents duplicate execution across remounts)
    if (isOrderProcessed(orderId) || isConfirmingRef.current) return;
    isConfirmingRef.current = true;
    markOrderProcessed(orderId);

    const startVerification = async () => {
      setVerificationStarted(true);
      setIsHandlingPaymentGlobal(true);

      console.log(`🚀 [PaymentReturn] Starting deterministic verification for order #${orderId}`);

      // FIX 3: Immediate Sync Fallback
      if (paymentStatus === 'SUCCESS' && transactionId) {
        console.log("⚡ [PaymentReturn] SUCCESS detected in URL. Sending immediate confirmation...");
        try {
          const confirmRes = await orderService.confirmPaymentFromReturn({
            orderId: orderId,
            transactionId: transactionId,
            status: paymentStatus
          });
          
          // FIX 3: STOP POLLING AFTER SUCCESS (MANDATORY)
          if (confirmRes?.success && confirmRes?.is_paid) {
             console.log("✅ [PaymentReturn] Confirmation succeeded. Skipping polling.");
             isPaidRef.current = true;
             
             // Invalidate caches
             invalidateOrder(Number(orderId));
             clearQRStatusCache(orderId);
             
             // IMMEDIATELY set state before navigation
             setLastOrder({ 
               id: Number(orderId), 
               is_paid: true, 
               order_status: 'paid'
             } as any);
             
             if (confirmRes.order?.event) setSelectedEvent(confirmRes.order.event);
             
             // Reset global handler BEFORE navigation to prevent blocking
             setIsHandlingPaymentGlobal(false);
             setPaymentFlowActive(false);
             setVerificationStarted(false);
             
             navigate(`/confirmation/${orderId}`, { 
               replace: true,
               state: {
                 order: {
                   id: Number(orderId),
                   is_paid: true,
                   order_status: 'paid'
                 }
               }
             });
             return; // STOP immediately
          }
        } catch (confirmErr) {
          console.warn("⚠️ [PaymentReturn] Immediate confirmation failed, relying on polling:", confirmErr);
        }
      }

      const verify = async () => {
        // FIX 3: Defensive check - if already paid via confirmation, stop polling loop
        if (isPaidRef.current) return;

        attemptRef.current++;
        console.log(`📡 [PaymentReturn] Polling backend for #${orderId} (Attempt ${attemptRef.current})...`);

        try {
          const res = await orderService.verifyPayment({ orderId });
          
          if (res?.is_paid === true || res?.success === true) {
            console.log("✅ [PaymentReturn] SUCCESS detected via is_paid flag.");
            isPaidRef.current = true; // STOP LOOP
            
            // Invalidate caches
            invalidateOrder(Number(orderId));
            clearQRStatusCache(orderId);
            
            // IMMEDIATELY set state before navigation
            setLastOrder({ 
              id: Number(orderId), 
              is_paid: true, 
              order_status: 'paid'
            } as any);
            
            if (res.order?.event) setSelectedEvent(res.order.event);

            // Reset global handler BEFORE navigation to prevent blocking
            setIsHandlingPaymentGlobal(false);
            setPaymentFlowActive(false);
            setVerificationStarted(false);

            navigate(`/confirmation/${orderId}`, { 
              replace: true,
              state: {
                order: {
                  id: Number(orderId), 
                  is_paid: true, 
                  order_status: 'paid'
                }
              }
            });
            return; // STOP
          }

          if (res?.status === "failed" || res?.order_status === "cancelled") {
            console.log("❌ [PaymentReturn] FAILURE detected.");
            setIsHandlingPaymentGlobal(false);
            setPaymentFlowActive(false);
            setVerificationStarted(false);
            navigate(`/payment-failure/${orderId}`, { replace: true });
            return; // STOP
          }

          if (attemptRef.current < 15) {
             let nextDelay = 2000;
             if (attemptRef.current > 2) nextDelay = 5000;
             if (attemptRef.current > 4) nextDelay = 10000;
             
             // Double check is_paid again before scheduling to be safe
             if (!isPaidRef.current) {
               pollTimerRef.current = setTimeout(verify, nextDelay);
             }
          } else {
             setIsHandlingPaymentGlobal(false);
             setPaymentFlowActive(false);
             setVerificationStarted(false);
             navigate(`/dashboard`, { replace: true });
          }
        } catch (err) {
          console.error("❌ [PaymentReturn] Network Error during poll:", err);
          if (!isPaidRef.current) {
            pollTimerRef.current = setTimeout(verify, 5000);
          }
        }
      };

      verify();
    };

    startVerification();

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [orderId, transactionId, paymentStatus, isAuthReady, location.pathname]);

  // Handle Recovery Case (if user closes tab before redirect)
  useEffect(() => {
    const isOnEntryRoute = location.pathname === "/" || location.pathname.startsWith("/events");
    if (!isOnEntryRoute) return;

    const pendingOrderId = localStorage.getItem("last_payment_order_id");
    if (!pendingOrderId) return;
    if (sessionStorage.getItem("payment_redirect_done") === "1") return;
    if (!isAuthReady) return;

    console.log("🚑 [PaymentRecovery] Manual return detected. Using last_payment_order_id.");
    
    setIsRecovering(true);
    sessionStorage.setItem("payment_redirect_done", "1");
    localStorage.removeItem('last_payment_order_id');
    localStorage.removeItem('last_payment_time');

    navigate(`/confirmation/${pendingOrderId}`, { 
      replace: true,
      state: {
        order: {
          id: Number(pendingOrderId),
          is_paid: true,
          order_status: 'paid'
        }
      }
    });
  }, [location.pathname, isAuthReady]);

  return { isHandlingPayment: isRecovering || isVerifyingGlobal };
};
