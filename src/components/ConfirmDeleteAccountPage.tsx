import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { Trash2, AlertCircle, CheckCircle, Home } from 'lucide-react';

export const ConfirmDeleteAccountPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!token) {
      setError('Invalid or missing deletion token.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.confirmAccountDeletion(token);
      setSuccess(true);
      // Trigger global logout to clear cookies, local storage, and reset AuthState
      logout();
    } catch (err: any) {
      setError(err.message || 'Failed to complete account deletion.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="bg-bg-card w-full max-w-md rounded-card-2xl p-10 border border-bg-border shadow-2xl text-center content-stack gap-6">
          <div className="w-16 h-16 bg-status-error/10 text-status-error rounded-pill flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <div className="content-stack gap-2">
            <h2 className="text-h2 text-text-primary">Invalid Link</h2>
            <p className="text-body-sm text-text-muted">
              The deletion link is invalid or missing a secure authorization token. Please initiate a new request from your dashboard.
            </p>
          </div>
          <Button className="w-full mt-4" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="bg-bg-card w-full max-w-lg rounded-card-2xl p-10 border border-bg-border shadow-2xl content-stack gap-8">
        
        {success ? (
          <div className="content-stack gap-8 text-center py-4">
            <div className="w-20 h-20 bg-status-success/10 text-status-success rounded-pill flex items-center justify-center mx-auto animate-pulse">
              <CheckCircle size={40} />
            </div>
            <div className="content-stack gap-3">
              <h2 className="text-h2 text-status-success">Account Deleted Successfully</h2>
              <p className="text-body-base text-text-primary font-bold">Your TicketsHub account has been deactivated.</p>
              <p className="text-body-sm text-text-muted max-w-sm mx-auto">
                We're sorry to see you go! All your active sessions have been signed out. Your profile and records have been securely archived in compliance with platform policies.
              </p>
            </div>
            <div className="pt-4 border-t border-bg-border w-full">
              <Button className="w-full py-5 rounded-card text-label font-black uppercase tracking-widest flex items-center justify-center gap-2" onClick={() => navigate('/')}>
                <Home size={16} /> Return to Home
              </Button>
            </div>
          </div>
        ) : (
          <div className="content-stack gap-8">
            <div className="flex items-center gap-4 text-status-error border-b border-bg-border pb-6">
              <div className="p-3 bg-status-error/10 rounded-card-lg">
                <Trash2 size={32} />
              </div>
              <div>
                <h2 className="text-h2">Confirm Account Deletion</h2>
                <p className="text-body-xs text-text-muted uppercase tracking-wider font-bold">Final Confirmation Step</p>
              </div>
            </div>

            <div className="content-stack gap-5">
              <div className="bg-status-error/5 border border-status-error/10 p-6 rounded-card content-stack gap-3">
                <h4 className="text-body-sm font-bold text-text-primary uppercase tracking-wide">⚠️ This action is permanent</h4>
                <p className="text-body-xs text-text-muted leading-relaxed">
                  Clicking the delete button below will immediately de-authorize your TicketsHub account. You will be logged out of all devices, and you will never be able to access this profile, your purchase ledger, or your reward balance again.
                </p>
              </div>

              {error && (
                <div className="bg-status-error/10 border border-status-error/20 text-status-error p-4 rounded-card flex items-start gap-3 text-body-xs font-medium leading-normal">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <p className="text-body-sm text-text-muted">
                Are you absolutely sure you want to proceed with permanently deleting your account?
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-bg-border">
              <Button 
                onClick={handleDeleteConfirm}
                variant="accent"
                className="w-full py-5 bg-status-error hover:bg-status-error/90 text-white font-black uppercase tracking-widest text-button shadow-none border-none"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Yes, Delete Permanently'}
              </Button>
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="w-full py-5 rounded-card font-black uppercase tracking-widest text-button border-bg-border text-text-primary"
                disabled={loading}
              >
                No, Keep Account
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
