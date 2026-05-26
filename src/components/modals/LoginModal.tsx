import React, { useState } from 'react';
import { X, Mail, Lock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';

export const LoginModal = () => {
  const { isLoginModalOpen: isOpen, setIsLoginModalOpen, setIsSignupModalOpen, loginModalNotice, setLoginModalNotice } = useUI();
  const onClose = () => {
    setIsLoginModalOpen(false);
    setLoginModalNotice(null);
  };
  const onOpenSignup = () => setIsSignupModalOpen(true);
  
  const { login: onLoginSuccess } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authService.login({ email, password });
      if (data) {
        onLoginSuccess({ 
          user: data.user, 
          accessToken: data.accessToken, 
          refreshToken: data.refreshToken 
        });
        onClose();
      }
    } catch (err: any) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      
      if (err.status === 401) {
        setError('Incorrect email or password.');
      } else if (err.status === 429) {
        setError('Too many login attempts. Please wait a moment and try again.');
      } else if (err.status === 500) {
        setError('Server error. Please try again later.');
      } else if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('TypeError'))) {
        setError('Network connection lost. Please verify your internet connection.');
      } else {
        try {
          const errorData = JSON.parse(err.message);
          setError(errorData.error || 'Login failed');
        } catch {
          setError(err.message || 'Something went wrong. Please try again.');
        }
      }
      passwordRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-page/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={shake ? { x: [0, -10, 10, -10, 10, -5, 5, 0], scale: 1, y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            transition={shake ? { duration: 0.4 } : { duration: 0.3 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-bg-card w-full max-w-md rounded-card-2xl p-8 border border-bg-border shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-teal shadow-teal/20 shadow-lg"></div>
            
            <div className="flex justify-between items-center mb-10">
              <div className="content-stack gap-1">
                <h2 className="text-h2">Welcome <span className="text-teal">Back</span></h2>
                <p className="text-label text-text-muted font-bold tracking-widest uppercase">The HUB awaits you</p>
              </div>
              <button 
                onClick={onClose} 
                className="w-10 h-10 flex items-center justify-center bg-bg-elevated/50 hover:bg-bg-elevated rounded-card transition-all duration-base group"
              >
                <X size={20} className="text-text-muted group-hover:text-text-primary transition-colors" />
              </button>
            </div>

            {loginModalNotice && (
              <div id="login-modal-notice" className="bg-teal/10 border border-teal/20 text-teal p-4 rounded-card mb-8 flex items-center gap-3 text-body-sm font-medium">
                <div className="w-6 h-6 rounded-full bg-teal/20 flex items-center justify-center shrink-0">
                  <AlertCircle size={14} className="text-teal" />
                </div>
                <span>{loginModalNotice}</span>
              </div>
            )}

            {error && (
              <div className="bg-status-error/10 border border-status-error/20 text-status-error p-4 rounded-card mb-8 flex items-center gap-3 text-body-sm font-medium">
                <div className="w-6 h-6 rounded-full bg-status-error/20 flex items-center justify-center shrink-0">
                  <AlertCircle size={14} />
                </div>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="content-stack gap-6">
              <div className="content-stack gap-2">
                <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-card flex items-center justify-center text-text-muted group-focus-within:text-teal group-focus-within:bg-teal/10 transition-all duration-base">
                    <Mail size={16} />
                  </div>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="name@example.com"
                    className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 pl-14 pr-5 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all placeholder:text-text-muted/40"
                  />
                </div>
              </div>

              <div className="content-stack gap-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-label text-text-muted font-black uppercase tracking-widest">Password</label>
                  <button type="button" className="text-label text-teal font-black uppercase tracking-widest hover:text-teal-light transition-colors">Forgot Password?</button>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-card flex items-center justify-center text-text-muted group-focus-within:text-teal group-focus-within:bg-teal/10 transition-all duration-base">
                    <Lock size={16} />
                  </div>
                  <input 
                    type="password" 
                    required
                    ref={passwordRef}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="••••••••"
                    className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 pl-14 pr-5 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all placeholder:text-text-muted/40"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                variant="accent"
                className="w-full py-4 text-button font-black uppercase tracking-widest mt-4" 
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Login to Account'}
              </Button>
            </form>

            <div className="mt-10 pt-10 border-t border-bg-border text-center">
              <p className="text-body-sm text-text-muted">
                Don't have an account? 
                <button 
                  onClick={() => { onClose(); onOpenSignup(); }}
                  className="text-teal font-black uppercase tracking-widest text-label ml-3 hover:text-teal-light transition-colors"
                >
                  Create Account
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
