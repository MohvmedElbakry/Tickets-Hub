import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/Button';
import { authService } from '../services/authService';
import { useUI } from '../context/UIContext';
import { PasswordChecklist } from './ui/PasswordChecklist';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { setIsLoginModalOpen } = useUI();

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [tokenStatus, setTokenStatus] = useState<'valid' | 'invalid' | 'expired'>('valid');
  const [tokenUser, setTokenUser] = useState<{ email: string; name: string } | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [isPasswordValid, setIsPasswordValid] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid');
      setVerifying(false);
      setLoading(false);
      return;
    }

    const checkToken = async () => {
      try {
        const result = await authService.verifyResetPassword(token);
        if (result && result.valid) {
          setTokenStatus('valid');
          setTokenUser({ email: result.email, name: result.name });
        } else {
          setTokenStatus('invalid');
        }
      } catch (err: any) {
        if (err.status === 410) {
          setTokenStatus('expired');
        } else {
          setTokenStatus('invalid');
        }
      } finally {
        setVerifying(false);
        setLoading(false);
      }
    };

    checkToken();
  }, [token]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!isPasswordValid) {
      setError('Password does not satisfy all security requirements.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await authService.resetPassword({
        token,
        password,
        confirmPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessLogin = () => {
    setIsLoginModalOpen(true);
    navigate('/', { replace: true });
  };

  if (loading || verifying) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-text-muted text-body-base">Verifying your password reset session...</p>
      </div>
    );
  }

  if (tokenStatus === 'invalid') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-bg-card w-full max-w-md rounded-card-2xl p-8 border border-bg-border shadow-2xl text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-status-error"></div>
          <div className="w-16 h-16 rounded-full bg-status-error/10 border border-status-error/20 flex items-center justify-center mx-auto text-status-error mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-h2 mb-2">Invalid <span className="text-status-error">Reset Link</span></h2>
          <p className="text-body-sm text-text-muted mb-8 leading-relaxed">
            The link you followed is invalid or has already been used. Please request a new password reset link.
          </p>
          <Button 
            onClick={() => {
              navigate('/');
              setIsLoginModalOpen(true);
            }}
            variant="outline"
            className="w-full py-4 text-button font-black uppercase tracking-widest"
          >
            Go to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  if (tokenStatus === 'expired') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-bg-card w-full max-w-md rounded-card-2xl p-8 border border-bg-border shadow-2xl text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-status-error"></div>
          <div className="w-16 h-16 rounded-full bg-status-error/10 border border-status-error/20 flex items-center justify-center mx-auto text-status-error mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-h2 mb-2">Link <span className="text-status-error">Expired</span></h2>
          <p className="text-body-sm text-text-muted mb-8 leading-relaxed">
            For security, password reset links expire after 15 minutes. This link has expired. Please request a new one.
          </p>
          <Button 
            onClick={() => {
              navigate('/');
              setIsLoginModalOpen(true);
            }}
            variant="outline"
            className="w-full py-4 text-button font-black uppercase tracking-widest"
          >
            Go to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-bg-card w-full max-w-md rounded-card-2xl p-8 border border-bg-border shadow-2xl text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-teal"></div>
          <div className="w-16 h-16 rounded-full bg-teal/10 border border-teal/20 flex items-center justify-center mx-auto text-teal mb-6">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-h2 mb-2">Password <span className="text-teal">Updated</span></h2>
          <p className="text-body-sm text-text-muted mb-8 leading-relaxed">
            Your password has been changed successfully. You can now use your new password to sign in.
          </p>
          <Button 
            onClick={handleSuccessLogin}
            variant="accent"
            className="w-full py-4 text-button font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <span>Proceed to Login</span>
            <ArrowRight size={16} />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-bg-card w-full max-w-lg rounded-card-2xl p-8 border border-bg-border shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-teal"></div>

        <div className="content-stack gap-1 mb-8">
          <h2 className="text-h2">Create New <span className="text-teal">Password</span></h2>
          <p className="text-body-sm text-text-muted">
            Hi <span className="text-text-primary font-semibold">{tokenUser?.name || 'there'}</span>, enter your new credentials below to secure your account.
          </p>
        </div>

        {error && (
          <div className="bg-status-error/10 border border-status-error/20 text-status-error p-4 rounded-card mb-6 flex items-center gap-3 text-body-sm font-medium">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="content-stack gap-6">
          <div className="content-stack gap-2">
            <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">New Password</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-card flex items-center justify-center text-text-muted group-focus-within:text-teal group-focus-within:bg-teal/10 transition-all duration-base">
                <Lock size={16} />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 pl-14 pr-12 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all placeholder:text-text-muted/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="content-stack gap-2">
            <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Confirm New Password</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-card flex items-center justify-center text-text-muted group-focus-within:text-teal group-focus-within:bg-teal/10 transition-all duration-base">
                <Lock size={16} />
              </div>
              <input 
                type={showConfirmPassword ? 'text' : 'password'} 
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 pl-14 pr-12 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all placeholder:text-text-muted/40"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Password complexity checklist */}
          <PasswordChecklist 
            password={password} 
            confirmPassword={confirmPassword} 
            onValidationChange={setIsPasswordValid} 
          />

          <Button 
            type="submit" 
            variant="accent"
            className="w-full py-4 text-button font-black uppercase tracking-widest mt-2" 
            disabled={submitting || !isPasswordValid}
          >
            {submitting ? 'Updating Password...' : 'Reset My Password'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};
