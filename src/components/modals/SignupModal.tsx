import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, Instagram, Phone, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { CountryCodeSelector } from '../ui/CountryCodeSelector';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';

export const SignupModal = () => {
  const { 
    isSignupModalOpen: isOpen, 
    setIsSignupModalOpen, 
    setIsLoginModalOpen
  } = useUI();
  
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    countryCode: '+20',
    birthdate: '',
    instagram: '',
    role: 'user' as 'user' | 'organizer'
  });

  const onClose = () => setIsSignupModalOpen(false);
  const onOpenLogin = () => setIsLoginModalOpen(true);
  
  const { login: onSignupSuccess } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authService.signup(signupForm);
      if (data) {
        onSignupSuccess({ 
          user: data.user, 
          accessToken: data.accessToken, 
          refreshToken: data.refreshToken 
        });
        onClose();
      }
    } catch (err: any) {
      try {
        const errorData = JSON.parse(err.message);
        setError(errorData.error || 'Signup failed');
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
            className="bg-secondary-bg w-full max-w-md rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-accent"></div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Create <span className="text-accent">Account</span></h2>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl mb-6 flex items-center gap-3 text-sm">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                  <input 
                    type="text" 
                    required
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full bg-primary-bg border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                  <input 
                    type="email" 
                    required
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full bg-primary-bg border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary ml-1">Instagram Username</label>
                <div className="relative">
                  <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                  <input 
                    type="text" 
                    required
                    value={signupForm.instagram}
                    onChange={(e) => setSignupForm({ ...signupForm, instagram: e.target.value })}
                    placeholder="@username"
                    className="w-full bg-primary-bg border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary ml-1">Phone Number</label>
                <div className="flex gap-2">
                  <CountryCodeSelector 
                    value={signupForm.countryCode}
                    onChange={(code) => setSignupForm({ ...signupForm, countryCode: code })}
                  />
                  <div className="relative flex-1">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                    <input 
                      type="tel" 
                      required
                      value={signupForm.phone}
                      onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                      placeholder="01xxxxxxxxx"
                      className="w-full bg-primary-bg border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary ml-1">Birthdate</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                  <input 
                    type="date" 
                    required
                    value={signupForm.birthdate}
                    onChange={(e) => setSignupForm({ ...signupForm, birthdate: e.target.value })}
                    className="w-full bg-primary-bg border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                  <input 
                    type="password" 
                    required
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-primary-bg border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full py-4 text-lg mt-4" disabled={loading}>
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-white/5 text-center">
              <p className="text-text-secondary">
                Already have an account? 
                <button 
                  onClick={() => { onClose(); onOpenLogin(); }}
                  className="text-accent font-bold ml-2 hover:underline"
                >
                  Login
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
