import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, Instagram, Phone, Calendar, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { CountryCodeSelector } from '../ui/CountryCodeSelector';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { PasswordChecklist } from '../ui/PasswordChecklist';

export const SignupModal = () => {
  const { 
    isSignupModalOpen: isOpen, 
    setIsSignupModalOpen, 
    setIsLoginModalOpen,
    loginModalNotice,
    setLoginModalNotice
  } = useUI();
  
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    countryCode: '+20',
    birthdate: '',
    instagram: '',
    gender: '',
    role: 'user' as 'user' | 'organizer'
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const onClose = () => {
    setIsSignupModalOpen(false);
    setLoginModalNotice(null);
    setConfirmPassword('');
    setIsPasswordValid(false);
  };
  const onOpenLogin = () => setIsLoginModalOpen(true);
  
  const { login: onSignupSuccess } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleFormChange = (updates: Partial<typeof signupForm>) => {
    setSignupForm(prev => ({ ...prev, ...updates }));
    if (error) setError('');
  };

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
        setSignupSuccess(true);
      }
    } catch (err: any) {
      if (err.status === 409) {
        setError('An account with this email address already exists.');
      } else if (err.status === 429) {
        setError('Too many signup attempts. Please wait a moment and try again.');
      } else if (err.status === 500) {
        setError('Server error. Please try again later.');
      } else if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('TypeError'))) {
        setError('Network connection lost. Please verify your internet connection.');
      } else {
        try {
          const errorData = JSON.parse(err.message);
          setError(errorData.error || 'Signup failed');
        } catch {
          setError(err.message || 'Something went wrong. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setSignupSuccess(false);
    onClose();
  };

  if (signupSuccess) {
    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-page/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-bg-card w-full max-w-md rounded-card-2xl p-8 border border-bg-border shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-teal shadow-teal/20 shadow-lg"></div>
              
              <div className="flex flex-col items-center text-center py-6">
                <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mb-6 border border-teal/20">
                  <Mail className="w-8 h-8 text-teal" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">Check Your Inbox! 📬</h3>
                <p className="text-teal font-medium text-sm mb-4">Your account has been created successfully.</p>
                
                <p className="text-text-muted text-sm leading-relaxed mb-6">
                  We've sent a verification email to your inbox. Please verify your email before purchasing tickets.
                </p>
                
                <Button 
                  onClick={handleSuccessClose}
                  className="w-full bg-teal hover:bg-teal-hover text-black font-semibold py-3 flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal/10"
                >
                  <span>Continue to Dashboard</span>
                  <ArrowRight size={16} />
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-page/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-bg-card w-full max-w-md rounded-card-2xl p-8 border border-bg-border shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-teal shadow-teal/20 shadow-lg"></div>

            <div className="flex justify-between items-center mb-10">
              <div className="content-stack gap-1">
                <h2 className="text-h2">Create <span className="text-teal">Account</span></h2>
                <p className="text-label text-text-muted font-bold tracking-widest uppercase">Join the event revolution</p>
              </div>
              <button 
                onClick={onClose} 
                className="w-10 h-10 flex items-center justify-center bg-bg-elevated/50 hover:bg-bg-elevated rounded-card transition-all duration-base group"
              >
                <X size={20} className="text-text-muted group-hover:text-text-primary transition-colors" />
              </button>
            </div>

            {loginModalNotice && (
              <div id="signup-modal-notice" className="bg-teal/10 border border-teal/20 text-teal p-4 rounded-card mb-8 flex items-center gap-3 text-body-sm font-medium">
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

            <form onSubmit={handleSignup} className="content-stack gap-5">
              <div className="content-stack gap-2">
                <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-card flex items-center justify-center text-text-muted group-focus-within:text-teal group-focus-within:bg-teal/10 transition-all duration-base">
                    <User size={16} />
                  </div>
                  <input 
                    type="text" 
                    required
                    value={signupForm.name}
                    onChange={(e) => handleFormChange({ name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 pl-14 pr-5 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all placeholder:text-text-muted/40"
                  />
                </div>
              </div>

              <div className="content-stack gap-2">
                <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-card flex items-center justify-center text-text-muted group-focus-within:text-teal group-focus-within:bg-teal/10 transition-all duration-base">
                    <Mail size={16} />
                  </div>
                  <input 
                    type="email" 
                    required
                    value={signupForm.email}
                    onChange={(e) => handleFormChange({ email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 pl-14 pr-5 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all placeholder:text-text-muted/40"
                  />
                </div>
              </div>

              <div className="content-stack gap-2">
                <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Instagram Username</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-card flex items-center justify-center text-text-muted group-focus-within:text-teal group-focus-within:bg-teal/10 transition-all duration-base">
                    <Instagram size={16} />
                  </div>
                  <input 
                    type="text" 
                    required
                    value={signupForm.instagram}
                    onChange={(e) => handleFormChange({ instagram: e.target.value })}
                    placeholder="@username"
                    className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 pl-14 pr-5 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all placeholder:text-text-muted/40"
                  />
                </div>
              </div>

              <div className="content-stack gap-2">
                <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Phone Number</label>
                <div className="flex gap-2">
                  <CountryCodeSelector 
                    value={signupForm.countryCode}
                    onChange={(code) => handleFormChange({ countryCode: code })}
                  />
                  <div className="relative flex-1 group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-card flex items-center justify-center text-text-muted group-focus-within:text-teal group-focus-within:bg-teal/10 transition-all duration-base">
                      <Phone size={16} />
                    </div>
                    <input 
                      type="tel" 
                      required
                      value={signupForm.phone}
                      onChange={(e) => handleFormChange({ phone: e.target.value })}
                      placeholder="01xxxxxxxxx"
                      className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 pl-14 pr-5 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all placeholder:text-text-muted/40"
                    />
                  </div>
                </div>
              </div>

              <div className="content-stack gap-2">
                <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Birthdate</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-card flex items-center justify-center text-text-muted group-focus-within:text-teal group-focus-within:bg-teal/10 transition-all duration-base">
                    <Calendar size={16} />
                  </div>
                  <input 
                    type="date" 
                    required
                    value={signupForm.birthdate}
                    onChange={(e) => handleFormChange({ birthdate: e.target.value })}
                    className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 pl-14 pr-5 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="content-stack gap-2">
                <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Gender (Optional)</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-card flex items-center justify-center text-text-muted group-focus-within:text-teal group-focus-within:bg-teal/10 transition-all duration-base">
                    <User size={16} />
                  </div>
                  <select 
                    value={signupForm.gender || ''}
                    onChange={(e) => handleFormChange({ gender: e.target.value })}
                    className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 pl-14 pr-10 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all appearance-none"
                  >
                    <option value="" disabled className="bg-bg-card">Select Gender</option>
                    <option value="Male" className="bg-bg-card">Male</option>
                    <option value="Female" className="bg-bg-card">Female</option>
                    <option value="Prefer not to say" className="bg-bg-card">Prefer not to say</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-focus-within:text-teal transition-colors">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

               <div className="content-stack gap-2">
                <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-card flex items-center justify-center text-text-muted group-focus-within:text-teal group-focus-within:bg-teal/10 transition-all duration-base">
                    <Lock size={16} />
                  </div>
                  <input 
                    type="password" 
                    required
                    value={signupForm.password}
                    onChange={(e) => handleFormChange({ password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 pl-14 pr-5 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all placeholder:text-text-muted/40"
                  />
                </div>
              </div>

              <div className="content-stack gap-2">
                <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-card flex items-center justify-center text-text-muted group-focus-within:text-teal group-focus-within:bg-teal/10 transition-all duration-base">
                    <Lock size={16} />
                  </div>
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(''); }}
                    placeholder="••••••••"
                    className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 pl-14 pr-5 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all placeholder:text-text-muted/40"
                  />
                </div>
              </div>

              {/* Password complexity checklist */}
              <PasswordChecklist 
                password={signupForm.password} 
                confirmPassword={confirmPassword} 
                onValidationChange={setIsPasswordValid} 
              />

              <Button 
                type="submit" 
                variant="accent"
                className="w-full py-4 text-button font-black uppercase tracking-widest mt-6" 
                disabled={loading || !isPasswordValid}
              >
                {loading ? 'Creating Experience...' : 'Join TicketsHub'}
              </Button>
            </form>

            <div className="mt-10 pt-10 border-t border-bg-border text-center">
              <p className="text-body-sm text-text-muted">
                Already have an account? 
                <button 
                  onClick={() => { onClose(); onOpenLogin(); }}
                  className="text-teal font-black uppercase tracking-widest text-label ml-3 hover:text-teal-light transition-colors"
                >
                  Login Instead
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
