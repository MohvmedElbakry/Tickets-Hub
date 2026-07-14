import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, ArrowRight, Mail, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/Button';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { login: updateAuthSession, user } = useAuth();
  const { setIsLoginModalOpen } = useUI();

  const [verifying, setVerifying] = useState(true);
  const [status, setStatus] = useState<'success' | 'invalid' | 'expired' | 'error'>('success');
  const [errorMessage, setErrorMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setVerifying(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await authService.verifyEmail(token);
        setStatus('success');
        
        // If the backend returns new tokens, update the logged-in session instantly!
        if (response.accessToken && response.refreshToken && response.user) {
          updateAuthSession({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            user: response.user
          });
        }
      } catch (err: any) {
        console.error('Email verification failed:', err);
        if (err.status === 400 || (err.message && err.message.includes('expired'))) {
          setStatus('expired');
        } else if (err.status === 404 || (err.message && err.message.includes('invalid'))) {
          setStatus('invalid');
        } else {
          setStatus('error');
          setErrorMessage(err.message || 'An unexpected error occurred during email verification.');
        }
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, updateAuthSession]);

  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    setResending(true);
    setResendMessage('');
    setResendError('');

    try {
      const res = await authService.resendVerification();
      setResendMessage(res?.message || 'A new verification link has been sent to your email.');
      setCooldown(60); // 60 seconds UI cooldown
    } catch (err: any) {
      setResendError(err.message || 'Failed to resend verification email. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  const handleOpenLogin = () => {
    setIsLoginModalOpen(true);
    navigate('/', { replace: true });
  };

  // Render verifying / loading state
  if (verifying) {
    return (
      <div id="verify-loading-container" className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-xl backdrop-blur-sm">
          <Loader2 className="w-12 h-12 text-teal animate-spin mx-auto mb-6" id="loading-spinner-icon" />
          <h2 className="text-2xl font-semibold text-white mb-2">Verifying Your Email</h2>
          <p className="text-text-muted text-sm leading-relaxed">
            Please hold on while we verify your email address. This will only take a moment.
          </p>
        </div>
      </div>
    );
  }

  // Render Success state
  if (status === 'success') {
    return (
      <div id="verify-success-container" className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-xl backdrop-blur-sm"
        >
          <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-teal/20">
            <CheckCircle className="w-8 h-8 text-teal" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Email Verified!</h2>
          <p className="text-text-muted text-sm leading-relaxed mb-8">
            Thank you! Your email address has been successfully verified. You now have full access to purchase tickets and register for live events.
          </p>
          
          <button 
            onClick={handleGoHome}
            className="w-full bg-teal hover:bg-teal-hover text-black font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
            id="go-home-button"
          >
            <span>Go to Events Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  // Render Expired state
  if (status === 'expired') {
    return (
      <div id="verify-expired-container" className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-xl backdrop-blur-sm"
        >
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Verification Link Expired</h2>
          <p className="text-text-muted text-sm leading-relaxed mb-6">
            For your security, email verification links are only valid for 24 hours. The link you clicked has expired.
          </p>

          {user ? (
            <div className="space-y-4">
              <button 
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="w-full bg-teal hover:bg-teal-hover text-black font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                id="resend-email-button"
              >
                {resending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resending...</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>Resend Code ({cooldown}s)</span>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Resend Verification Email</span>
                  </>
                )}
              </button>
              {resendMessage && (
                <p className="text-teal text-xs mt-2 font-medium bg-teal/10 p-3 rounded border border-teal/20">{resendMessage}</p>
              )}
              {resendError && (
                <p className="text-red-400 text-xs mt-2 font-medium bg-red-500/10 p-3 rounded border border-red-500/20">{resendError}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-text-muted text-xs mb-4">
                Please sign in to request a new verification email directly from your dashboard.
              </p>
              <button 
                onClick={handleOpenLogin}
                className="w-full bg-teal hover:bg-teal-hover text-black font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                id="sign-in-button"
              >
                <span>Sign In to Your Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // Render Invalid state (or general Error)
  return (
    <div id="verify-invalid-container" className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-xl backdrop-blur-sm"
      >
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Invalid Link</h2>
        <p className="text-text-muted text-sm leading-relaxed mb-8">
          {errorMessage || 'The verification link is invalid or has already been used. Please verify that you copied the complete URL or request a new link.'}
        </p>

        <button 
          onClick={handleGoHome}
          className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-3 rounded-lg transition-all"
          id="back-home-button"
        >
          Back to Events Dashboard
        </button>
      </motion.div>
    </div>
  );
};
