import React, { useState, useEffect } from 'react';
import { Bell, Mail, Shield, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface Preferences {
  email_notifications: boolean;
  db_notifications: boolean;
  marketplace_alerts: boolean;
  wallet_alerts: boolean;
  payout_alerts: boolean;
  event_reminders: boolean;
  marketing: boolean;
  admin_announcements: boolean;
}

export const NotificationPreferences: React.FC = () => {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/notifications/preferences', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPrefs(data);
      }
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const handleToggle = (key: keyof Preferences) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: !prefs[key] });
  };

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(prefs)
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Notification preferences saved successfully!' });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to update preferences.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
        Loading notification settings...
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            Notification & Email Preferences
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Control which transactional updates, marketplace notifications, and alert channels you receive.
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {prefs && (
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Channels</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-white block">Email Notifications</span>
                <span className="text-xs text-slate-400 block">Receive ticket PDFs, receipts, and order updates in your inbox.</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.email_notifications}
                onChange={() => handleToggle('email_notifications')}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-white block">In-App Alerts</span>
                <span className="text-xs text-slate-400 block">Show notification popups and badges inside your dashboard.</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.db_notifications}
                onChange={() => handleToggle('db_notifications')}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </label>
          </div>

          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2">Alert Categories</div>
          <div className="space-y-3">
            <label className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-white block">Resale Marketplace Alerts</span>
                <span className="text-xs text-slate-400 block">Get notified instantly when your listed ticket is purchased or approved.</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.marketplace_alerts}
                onChange={() => handleToggle('marketplace_alerts')}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-white block">Wallet & Financial Credit Alerts</span>
                <span className="text-xs text-slate-400 block">Receive instant notifications when funds are credited to your Seller Wallet.</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.wallet_alerts}
                onChange={() => handleToggle('wallet_alerts')}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-white block">Payout Status Updates</span>
                <span className="text-xs text-slate-400 block">Updates regarding your submitted payout requests (Approved, Paid, or Rejected).</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.payout_alerts}
                onChange={() => handleToggle('payout_alerts')}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-white block">Event Reminders & Updates</span>
                <span className="text-xs text-slate-400 block">Gate opening reminders, schedule changes, and venue instructions.</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.event_reminders}
                onChange={() => handleToggle('event_reminders')}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-500/10 flex items-center gap-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
