import React, { useState } from 'react';
import { X, Mail, Lock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';

export const LoginModal = () => {
  const { isLoginModalOpen: isOpen, setIsLoginModalOpen, setIsSignupModalOpen } = useUI();
  const onClose = () => setIsLoginModalOpen(false);
  const onOpenSignup = () => setIsSignupModalOpen(true);
  
  const { login: onLoginSuccess } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      try {
        const errorData = JSON.parse(err.message);
        setError(errorData.error || 'Login failed');
      } catch {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-bg/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-secondary-bg w-full max-w-md rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-accent"></div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Welcome <span className="text-accent">Back</span></h2>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl mb-6 flex items-center gap-3 text-sm">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-primary-bg border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-medium text-text-secondary">Password</label>
                  <button type="button" className="text-xs text-accent hover:underline">Forgot Password?</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-primary-bg border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full py-4 text-lg" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-white/5 text-center">
              <p className="text-text-secondary">
                Don't have an account? 
                <button 
                  onClick={() => { onClose(); onOpenSignup(); }}
                  className="text-accent font-bold ml-2 hover:underline"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
