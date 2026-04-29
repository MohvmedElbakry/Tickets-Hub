/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

import { useAuth } from './context/AuthContext';
import { useEvents } from './context/EventsContext';
import { useUI } from './context/UIContext';

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
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';

export default function App() {
  const [appKey, setAppKey] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = () => {
      console.log('🔄 [App] Global logout detected, forcing app remount');
      setAppKey(prev => prev + 1);
      navigate('/');
    };
    window.addEventListener("app-logout", handleLogout);
    return () => window.removeEventListener("app-logout", handleLogout);
  }, [navigate]);

  return <AppContent key={appKey} location={location} />;
}

function AppContent({ location }: { location: any; key?: React.Key }) {
  const { accessToken, isLoading } = useAuth();
  const { refreshEvents } = useEvents();
  const { setPaymentFlowActive, setIsLoginModalOpen } = useUI();
  const initializedRef = useRef(false);
  
  // Handle auto-login trigger from ProtectedRoute
  useEffect(() => {
    if (location.state?.openLogin) {
      setIsLoginModalOpen(true);
      // Clear state so it doesn't keep popping up
      window.history.replaceState({}, document.title);
    }
  }, [location, setIsLoginModalOpen]);

  // PHASE 3.2.5: CLEAR payment flow flag definitively when landing on confirmation page
  useEffect(() => {
    if (location.pathname.startsWith('/confirmation')) {
      console.log("✅ [AppContent] Navigation to confirmation detected. Clearing payment flow flag.");
      setPaymentFlowActive(false);
    }
  }, [location.pathname, setPaymentFlowActive]);

  // Initialize global payment return handler
  const { isHandlingPayment: isPaymentRecoveryActive } = useKashierReturn();

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    console.log("🚀 APP CONTENT START");
  }, []);
  
  useEffect(() => {
    console.log("💳 POSSIBLE PAYMENT RETURN:", {
      url: window.location.href,
      params: Object.fromEntries(new URLSearchParams(window.location.search))
    });

    // 🚫 [PHASE 3.2] HARD BLOCK global activity during ANY payment/confirmation flow
    const isPaymentFlowMode = 
      location.pathname.startsWith('/payment-return') || 
      location.pathname.startsWith('/confirmation');

    if (isPaymentFlowMode) return;

    if (!accessToken) return;

    refreshEvents();
  }, [accessToken, location.pathname, refreshEvents]); // Added refreshEvents

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
              <Route path="/checkout/:id" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
              <Route path="/confirmation/:id" element={<ProtectedRoute><ConfirmationPage /></ProtectedRoute>} />
              <Route path="/payment-failure/:id" element={<ProtectedRoute><PaymentFailurePage /></ProtectedRoute>} />
              <Route path="/payment-failure" element={<ProtectedRoute><PaymentFailurePage /></ProtectedRoute>} />
              <Route path="/payment-return" element={<ProtectedRoute><PaymentReturnPage /></ProtectedRoute>} />
              <Route path="/payment/pending" element={<ProtectedRoute><PaymentPendingPage /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

// --- Sub-components moved outside to prevent remount loops ---

