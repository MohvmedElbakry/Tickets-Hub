import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Smartphone, 
  CreditCard, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  Info, 
  HelpCircle,
  X,
  TrendingUp,
  Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { SellerBalance, PayoutDestination, PayoutRequest } from '../../types';
import { 
  getSellerPayouts, 
  getSellerBalance, 
  getPayoutDestinations, 
  addPayoutDestination, 
  deletePayoutDestination, 
  requestPayout 
} from '../../lib/api/walletApi';
import { formatMoney, formatMoneyWithCurrency, toSafeNumber } from '../../lib/utils';
import { formatDateTime } from '../../lib/dateFormat';

const MINIMUM_PAYOUT_AMOUNT = 50; // 50 EGP minimum payout

export const SellerWallet: React.FC = () => {
  const [balance, setBalance] = useState<SellerBalance | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [destinations, setDestinations] = useState<PayoutDestination[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState<boolean>(false);
  const [isAddDestModalOpen, setIsAddDestModalOpen] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<number | null>(null);

  // Add destination form states
  const [destType, setDestType] = useState<'BANK_ACCOUNT' | 'INSTAPAY' | 'VODAFONE_CASH'>('INSTAPAY');
  const [accountName, setAccountName] = useState<string>('');
  const [accountDetails, setAccountDetails] = useState<string>('');
  const [addDestLoading, setAddDestLoading] = useState<boolean>(false);
  const [addDestError, setAddDestError] = useState<string | null>(null);

  // Withdraw form states
  const [selectedDestId, setSelectedDestId] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawLoading, setWithdrawLoading] = useState<boolean>(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const fetchWalletData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [payoutsRes, destsRes] = await Promise.all([
        getSellerPayouts(),
        getPayoutDestinations()
      ]);

      setBalance(payoutsRes.balance || null);
      setPayouts(payoutsRes.payouts || []);
      setDestinations(destsRes || []);

      // Auto-select first active destination if available
      if (destsRes && destsRes.length > 0) {
        setSelectedDestId(String(destsRes[0].id));
      }
    } catch (err: any) {
      console.error('[SellerWallet] Fetch error:', err);
      setError(err.message || 'Failed to load wallet information. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const handleRefresh = () => {
    fetchWalletData(true);
  };

  const handleAddDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddDestError(null);

    if (!accountName.trim()) {
      setAddDestError('Account holder name is required.');
      return;
    }

    if (!accountDetails.trim()) {
      setAddDestError('Account number or payment address is required.');
      return;
    }

    setAddDestLoading(true);

    try {
      const res = await addPayoutDestination(destType, accountName.trim(), accountDetails.trim());
      setSuccessMsg(res.message || 'Payout destination added successfully.');
      setIsAddDestModalOpen(false);
      setAccountName('');
      setAccountDetails('');
      
      // Refresh list
      const updatedDests = await getPayoutDestinations();
      setDestinations(updatedDests || []);
      if (updatedDests && updatedDests.length > 0 && !selectedDestId) {
        setSelectedDestId(String(updatedDests[0].id));
      }
    } catch (err: any) {
      console.error('[SellerWallet] Add destination error:', err);
      setAddDestError(err.message || 'Failed to add payout destination.');
    } finally {
      setAddDestLoading(false);
    }
  };

  const handleDeleteDestination = async (id: number) => {
    try {
      await deletePayoutDestination(id);
      setSuccessMsg('Payout destination removed successfully.');
      setIsDeleteConfirmOpen(null);
      
      const updatedDests = await getPayoutDestinations();
      setDestinations(updatedDests || []);
      if (selectedDestId === String(id)) {
        setSelectedDestId(updatedDests && updatedDests.length > 0 ? String(updatedDests[0].id) : '');
      }
    } catch (err: any) {
      console.error('[SellerWallet] Delete destination error:', err);
      setError(err.message || 'Failed to remove payout destination.');
      setIsDeleteConfirmOpen(null);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);

    const destIdNum = parseInt(selectedDestId, 10);
    if (isNaN(destIdNum)) {
      setWithdrawError('Please select a valid payout destination.');
      return;
    }

    const numAmount = parseFloat(withdrawAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setWithdrawError('Please enter a valid withdrawal amount.');
      return;
    }

    if (numAmount < MINIMUM_PAYOUT_AMOUNT) {
      setWithdrawError(`Minimum withdrawal amount is ${MINIMUM_PAYOUT_AMOUNT} EGP.`);
      return;
    }

    const availableNum = toSafeNumber(balance?.available_amount);
    if (numAmount > availableNum) {
      setWithdrawError(`Withdrawal amount cannot exceed your available balance (${formatMoneyWithCurrency(availableNum)}).`);
      return;
    }

    setWithdrawLoading(true);

    try {
      const res = await requestPayout(destIdNum, numAmount);
      setSuccessMsg(res.message || 'Payout request submitted successfully and is pending review.');
      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
      
      // Refresh wallet state
      fetchWalletData(true);
    } catch (err: any) {
      console.error('[SellerWallet] Request payout error:', err);
      setWithdrawError(err.message || 'Failed to process payout request.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Helper calculations for presentation
  const availableAmount = toSafeNumber(balance?.available_amount);
  const pendingAmount = toSafeNumber(balance?.pending_amount);
  const heldAmount = toSafeNumber(balance?.held_amount);
  const withdrawnAmount = toSafeNumber(balance?.withdrawn_amount);
  const currency = balance?.currency || 'EGP';
  const totalLifetimeEarnings = availableAmount + pendingAmount + heldAmount + withdrawnAmount;

  const getStatusBadge = (status: PayoutRequest['status']) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-tag text-[10px] font-black uppercase tracking-wider bg-status-success/10 text-status-success border border-status-success/20">
            <CheckCircle2 size={12} /> Paid
          </span>
        );
      case 'APPROVED':
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-tag text-[10px] font-black uppercase tracking-wider bg-teal/10 text-teal border border-teal/20">
            <Clock size={12} /> Processing
          </span>
        );
      case 'REQUESTED':
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-tag text-[10px] font-black uppercase tracking-wider bg-status-warning/10 text-status-warning border border-status-warning/20">
            <Clock size={12} /> Pending Review
          </span>
        );
      case 'FAILED':
      case 'REJECTED':
      case 'CANCELLED':
      case 'REVERSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-tag text-[10px] font-black uppercase tracking-wider bg-status-error/10 text-status-error border border-status-error/20">
            <Ban size={12} /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-tag text-[10px] font-black uppercase tracking-wider bg-text-muted/10 text-text-muted border border-text-muted/20">
            {status}
          </span>
        );
    }
  };

  const getDestinationIcon = (type: string) => {
    switch (type) {
      case 'BANK_ACCOUNT':
        return <Building2 size={18} className="text-teal" />;
      case 'INSTAPAY':
        return <Smartphone size={18} className="text-status-info" />;
      case 'VODAFONE_CASH':
        return <CreditCard size={18} className="text-status-warning" />;
      default:
        return <Wallet size={18} className="text-text-muted" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-bg-card rounded-card-xl border border-bg-border p-12 text-center animate-pulse layout-stack gap-4">
        <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <h3 className="text-h3 text-text-primary">Loading Seller Wallet...</h3>
        <p className="text-body-sm text-text-muted">Fetching your account balances and payout history securely</p>
      </div>
    );
  }

  return (
    <div className="layout-stack gap-8">
      {/* HEADER BAR */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card border border-bg-border rounded-card-xl p-6 shadow-card">
        <div className="content-stack gap-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal/10 text-teal rounded-card border border-teal/20">
              <Wallet size={24} />
            </div>
            <div>
              <h1 className="text-h2">Seller Wallet & Payouts</h1>
              <p className="text-body-xs text-text-muted">Manage your earnings, payout destinations, and withdrawal requests</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin text-teal' : ''} />
            <span>Refresh</span>
          </Button>
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => setIsWithdrawModalOpen(true)}
            disabled={availableAmount < MINIMUM_PAYOUT_AMOUNT || destinations.length === 0}
            className="gap-2"
          >
            <ArrowUpRight size={16} />
            <span>Request Withdrawal</span>
          </Button>
        </div>
      </header>

      {/* SUCCESS & ERROR NOTIFICATIONS */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-4 bg-status-success/10 border border-status-success/30 rounded-card text-status-success text-body-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="hover:opacity-80">
              <X size={16} />
            </button>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-4 bg-status-error/10 border border-status-error/30 rounded-card text-status-error text-body-sm"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="hover:opacity-80">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BALANCE CARDS GRID (PHASE 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Available Balance */}
        <div className="bg-bg-card border border-teal/30 rounded-card-xl p-6 shadow-card hover:border-teal/60 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-label font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
              Available <span title="Funds ready for immediate withdrawal"><HelpCircle size={12} className="text-text-muted hover:text-teal cursor-help" /></span>
            </span>
            <div className="p-2 bg-teal/10 text-teal rounded-card">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <p className="text-h2 text-teal drop-shadow-teal mb-1">
            {formatMoney(availableAmount)} <span className="text-body-xs font-normal text-text-muted">{currency}</span>
          </p>
          <p className="text-[11px] text-text-muted font-medium">Ready for payout withdrawal</p>
        </div>

        {/* Pending Balance */}
        <div className="bg-bg-card border border-bg-border rounded-card-xl p-6 shadow-card hover:border-text-muted/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-label font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
              Pending <span title="Earnings held pending event completion & 24-48h hold"><HelpCircle size={12} className="text-text-muted hover:text-status-warning cursor-help" /></span>
            </span>
            <div className="p-2 bg-status-warning/10 text-status-warning rounded-card">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-h2 text-text-primary mb-1">
            {formatMoney(pendingAmount)} <span className="text-body-xs font-normal text-text-muted">{currency}</span>
          </p>
          <p className="text-[11px] text-text-muted font-medium">Held during event settlement window</p>
        </div>

        {/* Held Balance */}
        <div className="bg-bg-card border border-bg-border rounded-card-xl p-6 shadow-card hover:border-text-muted/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-label font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
              Processing <span title="Withdrawals requested and currently awaiting admin review or payout"><HelpCircle size={12} className="text-text-muted hover:text-status-info cursor-help" /></span>
            </span>
            <div className="p-2 bg-status-info/10 text-status-info rounded-card">
              <ShieldCheck size={18} />
            </div>
          </div>
          <p className="text-h2 text-text-primary mb-1">
            {formatMoney(heldAmount)} <span className="text-body-xs font-normal text-text-muted">{currency}</span>
          </p>
          <p className="text-[11px] text-text-muted font-medium">Awaiting payout processing</p>
        </div>

        {/* Withdrawn Balance */}
        <div className="bg-bg-card border border-bg-border rounded-card-xl p-6 shadow-card hover:border-text-muted/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-label font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
              Total Paid Out <span title="Total completed withdrawals to date"><HelpCircle size={12} className="text-text-muted hover:text-status-success cursor-help" /></span>
            </span>
            <div className="p-2 bg-status-success/10 text-status-success rounded-card">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-h2 text-status-success mb-1">
            {formatMoney(withdrawnAmount)} <span className="text-body-xs font-normal text-text-muted">{currency}</span>
          </p>
          <p className="text-[11px] text-text-muted font-medium">Lifetime completed withdrawals</p>
        </div>
      </div>

      {/* EARNINGS SUMMARY BANNER (PHASE 3) */}
      <div className="bg-bg-elevated/40 border border-bg-border/60 rounded-card-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-teal/10 text-teal rounded-card border border-teal/20 hidden sm:block">
            <TrendingUp size={24} />
          </div>
          <div className="content-stack gap-1">
            <span className="text-label font-black text-text-muted uppercase tracking-wider">Total Sales Lifetime Revenue</span>
            <p className="text-h3 text-text-primary">
              {formatMoneyWithCurrency(totalLifetimeEarnings, currency)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {availableAmount < MINIMUM_PAYOUT_AMOUNT && (
            <div className="text-body-xs text-text-muted flex items-center gap-1.5 bg-bg-card px-3 py-2 rounded-card border border-bg-border">
              <Info size={14} className="text-status-info shrink-0" />
              <span>Minimum withdrawal is {MINIMUM_PAYOUT_AMOUNT} EGP</span>
            </div>
          )}
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => setIsWithdrawModalOpen(true)}
            disabled={availableAmount < MINIMUM_PAYOUT_AMOUNT || destinations.length === 0}
            className="w-full sm:w-auto whitespace-nowrap"
          >
            Withdraw Funds
          </Button>
        </div>
      </div>

      {/* TWO COLUMN SECTION: PAYOUT DESTINATIONS & SETTLEMENT INFO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PAYOUT DESTINATIONS (PHASE 4) - 2 COLUMNS */}
        <div className="lg:col-span-2 layout-stack gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-h3 text-text-primary">Payout Destinations</h3>
              <p className="text-body-xs text-text-muted">Manage your saved bank accounts and mobile wallet details</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsAddDestModalOpen(true)}
              className="gap-2"
            >
              <Plus size={16} />
              <span>Add Destination</span>
            </Button>
          </div>

          {destinations.length === 0 ? (
            /* EMPTY STATE FOR DESTINATIONS */
            <div className="bg-bg-card border border-dashed border-bg-border rounded-card-xl p-8 text-center layout-stack items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted">
                <CreditCard size={24} />
              </div>
              <h4 className="text-h4 text-text-primary">No payout destinations saved</h4>
              <p className="text-body-sm text-text-muted max-w-md">
                Add an InstaPay address, Vodafone Cash number, or Bank Account to request withdrawals when sales clear.
              </p>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => setIsAddDestModalOpen(true)}
                className="mt-2 gap-2"
              >
                <Plus size={16} />
                <span>Add Payout Method</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {destinations.map((dest) => (
                <div 
                  key={dest.id} 
                  className="bg-bg-card border border-bg-border rounded-card-lg p-5 flex flex-col justify-between gap-4 hover:border-teal/30 transition-all shadow-card group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-bg-elevated rounded-card">
                        {getDestinationIcon(dest.type)}
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-teal">
                          {dest.type.replace('_', ' ')}
                        </span>
                        <h4 className="text-body-sm font-bold text-text-primary">{dest.account_name}</h4>
                      </div>
                    </div>

                    <button 
                      onClick={() => setIsDeleteConfirmOpen(dest.id)}
                      className="text-text-muted hover:text-status-error p-1 transition-colors"
                      title="Remove payout destination"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="pt-3 border-t border-bg-border/40 flex items-center justify-between text-body-xs font-mono text-text-muted">
                    <span>{dest.masked_details}</span>
                    <span className="text-[10px] font-bold text-status-success uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={10} /> Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SETTLEMENT VISIBILITY & GUIDANCE (PHASE 7) - 1 COLUMN */}
        <div className="bg-bg-card border border-bg-border rounded-card-xl p-6 layout-stack gap-4 shadow-card h-fit">
          <div className="flex items-center gap-2 text-teal">
            <Info size={20} />
            <h3 className="text-h4 font-bold text-text-primary">Settlement & Payout Policy</h3>
          </div>

          <div className="space-y-3 text-body-xs text-text-muted leading-relaxed">
            <p>
              <strong className="text-text-primary font-bold">1. Event Settlement Hold:</strong> Ticket revenues from primary or resale sales remain in <span className="text-status-warning font-bold">Pending Balance</span> until 24 hours after the event completes.
            </p>
            <p>
              <strong className="text-text-primary font-bold">2. Available Release:</strong> Once cleared, funds move to your <span className="text-teal font-bold">Available Balance</span>.
            </p>
            <p>
              <strong className="text-text-primary font-bold">3. Processing Times:</strong>
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>InstaPay: Usually within 2-6 hours</li>
              <li>Vodafone Cash: Same-day transfer</li>
              <li>Bank Account: 1-2 business days</li>
            </ul>
            <p className="pt-2 border-t border-bg-border/40 font-medium">
              Minimum payout threshold is <strong>{MINIMUM_PAYOUT_AMOUNT} EGP</strong> per transaction.
            </p>
          </div>
        </div>
      </div>

      {/* PAYOUT REQUEST HISTORY TABLE (PHASE 6) */}
      <div className="bg-bg-card border border-bg-border rounded-card-xl p-6 layout-stack gap-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-h3 text-text-primary">Payout Request History</h3>
            <p className="text-body-xs text-text-muted">All past and active withdrawal requests</p>
          </div>
        </div>

        {payouts.length === 0 ? (
          /* EMPTY STATE FOR PAYOUT HISTORY */
          <div className="text-center py-12 border border-dashed border-bg-border rounded-card layout-stack items-center justify-center gap-2">
            <Clock size={32} className="text-text-muted opacity-40 mb-1" />
            <h4 className="text-body-base font-bold text-text-primary">No payout requests yet</h4>
            <p className="text-body-xs text-text-muted max-w-sm">
              When you submit a withdrawal request, its processing progress and review status will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-bg-border text-label text-text-muted uppercase tracking-wider">
                  <th className="pb-3 px-4">Request Ref</th>
                  <th className="pb-3 px-4">Requested At</th>
                  <th className="pb-3 px-4">Destination</th>
                  <th className="pb-3 px-4">Amount</th>
                  <th className="pb-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border/40 text-body-sm">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-bg-elevated/40 transition-colors">
                    <td className="py-4 px-4 font-mono text-body-xs text-text-muted">
                      #{payout.public_id ? payout.public_id.slice(0, 8) : payout.id}
                    </td>
                    <td className="py-4 px-4 text-body-xs text-text-primary">
                      {formatDateTime(payout.requested_at)}
                    </td>
                    <td className="py-4 px-4">
                      {payout.destination ? (
                        <div className="flex items-center gap-2">
                          {getDestinationIcon(payout.destination.type)}
                          <div>
                            <p className="font-bold text-text-primary text-body-xs">{payout.destination.account_name}</p>
                            <p className="font-mono text-[10px] text-text-muted">{payout.destination.masked_details}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-muted text-body-xs">Saved Destination</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-bold text-teal font-mono">
                      {formatMoneyWithCurrency(payout.amount, payout.currency || 'EGP')}
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(payout.status)}
                      {payout.failure_reason && (
                        <p className="text-[10px] text-status-error mt-1">{payout.failure_reason}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD PAYOUT DESTINATION */}
      <AnimatePresence>
        {isAddDestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card border border-bg-border rounded-card-xl max-w-md w-full p-6 layout-stack gap-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setIsAddDestModalOpen(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
              >
                <X size={20} />
              </button>

              <div>
                <h3 className="text-h3 text-text-primary">Add Payout Destination</h3>
                <p className="text-body-xs text-text-muted">Save your account details for receiving withdrawals</p>
              </div>

              {addDestError && (
                <div className="p-3 bg-status-error/10 border border-status-error/30 rounded-card text-status-error text-body-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{addDestError}</span>
                </div>
              )}

              <form onSubmit={handleAddDestination} className="layout-stack gap-4">
                <div>
                  <label className="block text-label text-text-muted mb-2 uppercase font-bold tracking-wider">Method Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDestType('INSTAPAY')}
                      className={`p-3 rounded-card border text-body-xs font-bold flex flex-col items-center gap-1 transition-all ${destType === 'INSTAPAY' ? 'border-teal bg-teal/10 text-teal' : 'border-bg-border text-text-muted hover:border-text-muted'}`}
                    >
                      <Smartphone size={18} />
                      <span>InstaPay</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDestType('VODAFONE_CASH')}
                      className={`p-3 rounded-card border text-body-xs font-bold flex flex-col items-center gap-1 transition-all ${destType === 'VODAFONE_CASH' ? 'border-teal bg-teal/10 text-teal' : 'border-bg-border text-text-muted hover:border-text-muted'}`}
                    >
                      <CreditCard size={18} />
                      <span>Vodafone</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDestType('BANK_ACCOUNT')}
                      className={`p-3 rounded-card border text-body-xs font-bold flex flex-col items-center gap-1 transition-all ${destType === 'BANK_ACCOUNT' ? 'border-teal bg-teal/10 text-teal' : 'border-bg-border text-text-muted hover:border-text-muted'}`}
                    >
                      <Building2 size={18} />
                      <span>Bank</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-label text-text-muted mb-1 uppercase font-bold tracking-wider">Account Holder Name</label>
                  <input 
                    type="text" 
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. Mohamed Elbakry"
                    className="w-full bg-bg-elevated border border-bg-border rounded-card px-4 py-2.5 text-body-sm text-text-primary focus:outline-none focus:border-teal"
                    required
                  />
                </div>

                <div>
                  <label className="block text-label text-text-muted mb-1 uppercase font-bold tracking-wider">
                    {destType === 'INSTAPAY' ? 'InstaPay Address (IPA) or Phone' : destType === 'VODAFONE_CASH' ? 'Vodafone Cash Mobile Number' : 'Bank IBAN / Account Number'}
                  </label>
                  <input 
                    type="text" 
                    value={accountDetails}
                    onChange={(e) => setAccountDetails(e.target.value)}
                    placeholder={destType === 'INSTAPAY' ? 'name@instapay' : destType === 'VODAFONE_CASH' ? '010xxxxxxx' : 'EG1234567890...'}
                    className="w-full bg-bg-elevated border border-bg-border rounded-card px-4 py-2.5 text-body-sm text-text-primary focus:outline-none focus:border-teal font-mono"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-bg-border">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddDestModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={addDestLoading}
                  >
                    {addDestLoading ? 'Saving...' : 'Save Destination'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: WITHDRAW FUNDS */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card border border-bg-border rounded-card-xl max-w-md w-full p-6 layout-stack gap-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setIsWithdrawModalOpen(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
              >
                <X size={20} />
              </button>

              <div>
                <h3 className="text-h3 text-text-primary">Request Withdrawal</h3>
                <p className="text-body-xs text-text-muted">Transfer cleared balance to your preferred destination</p>
              </div>

              {withdrawError && (
                <div className="p-3 bg-status-error/10 border border-status-error/30 rounded-card text-status-error text-body-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{withdrawError}</span>
                </div>
              )}

              <form onSubmit={handleWithdrawSubmit} className="layout-stack gap-4">
                <div className="bg-bg-elevated p-4 rounded-card border border-bg-border flex justify-between items-center">
                  <span className="text-label text-text-muted font-bold">Available to Withdraw</span>
                  <span className="text-h4 text-teal font-mono">{formatMoneyWithCurrency(availableAmount, currency)}</span>
                </div>

                <div>
                  <label className="block text-label text-text-muted mb-1 uppercase font-bold tracking-wider">Payout Destination</label>
                  <select
                    value={selectedDestId}
                    onChange={(e) => setSelectedDestId(e.target.value)}
                    className="w-full bg-bg-elevated border border-bg-border rounded-card px-4 py-2.5 text-body-sm text-text-primary focus:outline-none focus:border-teal"
                    required
                  >
                    {destinations.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.type.replace('_', ' ')} — {d.account_name} ({d.masked_details})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-label text-text-muted mb-1 uppercase font-bold tracking-wider">
                    Amount ({currency})
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01"
                      min={MINIMUM_PAYOUT_AMOUNT}
                      max={availableAmount}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder={`Min ${MINIMUM_PAYOUT_AMOUNT}`}
                      className="w-full bg-bg-elevated border border-bg-border rounded-card px-4 py-2.5 pr-16 text-body-sm text-text-primary focus:outline-none focus:border-teal font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(String(availableAmount))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-teal bg-teal/10 hover:bg-teal/20 px-2 py-1 rounded transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Remaining calculation display */}
                {withdrawAmount && !isNaN(parseFloat(withdrawAmount)) && (
                  <div className="text-body-xs text-text-muted flex justify-between px-1">
                    <span>Remaining Balance:</span>
                    <span className="font-mono text-text-primary">
                      {formatMoneyWithCurrency(Math.max(0, availableAmount - parseFloat(withdrawAmount)), currency)}
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-bg-border">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsWithdrawModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={withdrawLoading}
                  >
                    {withdrawLoading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION MODAL: DELETE DESTINATION */}
      <AnimatePresence>
        {isDeleteConfirmOpen !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card border border-bg-border rounded-card-xl max-w-sm w-full p-6 layout-stack gap-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 bg-status-error/10 text-status-error rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <h3 className="text-h4 text-text-primary">Remove Destination?</h3>
              <p className="text-body-xs text-text-muted">
                Are you sure you want to remove this payout method? You can re-add it at any time.
              </p>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDeleteConfirmOpen(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => isDeleteConfirmOpen !== null && handleDeleteDestination(isDeleteConfirmOpen)}
                  className="flex-1 text-status-error border-status-error/40 hover:bg-status-error/10"
                >
                  Remove
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
