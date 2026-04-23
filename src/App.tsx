/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

import { useAuth } from './context/AuthContext';
import { useEvents } from './context/EventsContext';

// Import refactored components
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { EventsListingPage } from './components/EventsListingPage';
import { EventDetailsPage } from './components/EventDetailsPage';
import { ConfirmationPage } from './components/ConfirmationPage';
import { UserDashboard } from './components/UserDashboard';
import { LoginModal } from './components/modals/LoginModal';
import { SignupModal } from './components/modals/SignupModal';
import { AdminEventModal } from './components/admin/AdminEventModal';
import { BookingModal } from './components/modals/BookingModal';
import { 
  CheckoutPage, 
  PaymentSuccessPage, 
  PaymentFailurePage, 
  PaymentPendingPage 
} from './components/PaymentPages';
import { PaymentReturnPage } from './components/PaymentReturnPage';
import { useKashierReturn } from './hooks/useKashierReturn';
import { isPaymentFlow } from './lib/paymentFlow';

export default function App() {
  const { accessToken, isLoading } = useAuth();
  const { refreshEvents } = useEvents();
  const location = useLocation();
  const initializedRef = useRef(false);
  
  // Initialize global payment return handler
  const { isHandlingPayment: isPaymentRecoveryActive } = useKashierReturn();

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    console.log("🚀 APP START");
    console.log("📍 FULL URL:", window.location.href);
    console.log("🔍 QUERY PARAMS:", window.location.search);
    console.log("🧭 PATHNAME:", window.location.pathname);
  }, []);
  
  useEffect(() => {
    console.log("💳 POSSIBLE PAYMENT RETURN:", {
      url: window.location.href,
      params: Object.fromEntries(new URLSearchParams(window.location.search))
    });

    // 🚫 [PHASE 3] Supressing non-essential background activity during payment flow
    if (isPaymentFlow()) {
      console.log("💳 [App] Payment Mode Active: Suppressing background event refresh");
      return;
    }

    if (!accessToken) return;

    refreshEvents();
  }, [accessToken, location.pathname]); // Added location.pathname to re-evaluate when route changes

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (isPaymentRecoveryActive) {
    return (
      <div className="min-h-screen bg-primary-bg flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-text-secondary">Processing payment...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary-bg flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-text-secondary">Initializing secure session...</p>
      </div>
    );
  }

  // --- Page Components ---









    // AdminDashboard is now imported from ./components/admin/AdminDashboard

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <LoginModal />
      <SignupModal />
      <AdminEventModal />
      <BookingModal />
      
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/events" element={<EventsListingPage />} />
              <Route path="/events/:id" element={<EventDetailsPage />} />
              <Route path="/checkout/:id" element={<CheckoutPage />} />
              <Route path="/confirmation/:id" element={<ConfirmationPage />} />
              <Route path="/payment-failure/:id" element={<PaymentFailurePage />} />
              <Route path="/payment-failure" element={<PaymentFailurePage />} />
              <Route path="/payment-return" element={<PaymentReturnPage />} />
              <Route path="/payment/pending" element={<PaymentPendingPage />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

// --- Sub-components moved outside to prevent remount loops ---

