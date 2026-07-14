import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { AlertCircle, Mail, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const EmailVerificationBanner = () => {
  const { user } = useAuth();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Hide banner if user is not logged in, or is already verified, or is an admin
  if (!user || user.emailVerified || user.role === 'admin') {
    return null;
  }

  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    setResending(true);
    setMessage('');
    setError('');

    try {
      const res = await authService.resendVerification();
      setMessage(res?.message || 'Verification email resent successfully! Please check your inbox.');
      setCooldown(60); // 60 seconds UI cooldown
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div id="email-verification-banner" className="bg-amber-500/10 border-b border-amber-500/20 text-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
          <span className="font-medium text-left">
            Please verify your email address (<strong className="text-white">{user.email}</strong>) to unlock ticket purchases and other sensitive actions.
          </span>
        </div>
        
        <div className="flex items-center gap-4 shrink-0 sm:self-center self-start">
          <button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="flex items-center gap-1.5 font-semibold text-teal hover:text-teal-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-teal/10 hover:bg-teal/20 px-3 py-1.5 rounded-md border border-teal/20"
            id="banner-resend-button"
          >
            {resending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Resending...</span>
              </>
            ) : cooldown > 0 ? (
              <span>Resend in {cooldown}s</span>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" />
                <span>Resend Link</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {(message || error) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="max-w-7xl mx-auto px-4 pb-3 sm:px-6 lg:px-8 text-center text-xs"
          >
            {message && (
              <p className="text-teal font-medium flex items-center justify-center gap-1.5 bg-teal/15 py-1.5 px-3 rounded-md border border-teal/20 mb-2">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{message}</span>
              </p>
            )}
            {error && (
              <p className="text-red-400 font-medium flex items-center justify-center gap-1.5 bg-red-500/15 py-1.5 px-3 rounded-md border border-red-500/20 mb-2">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
