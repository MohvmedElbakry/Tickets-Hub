import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ShieldCheck, 
  RefreshCw, 
  AlertTriangle, 
  Download, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Search, 
  FileText, 
  TrendingUp, 
  PieChart, 
  Users, 
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatMoneyWithCurrency } from '../../lib/utils';
import { formatDateTime } from '../../lib/dateFormat';

export interface DashboardMetrics {
  overview: {
    totalGrossRevenue: number;
    grossPrimaryVolume: number;
    grossResaleVolume: number;
    totalPlatformFees: number;
    primaryFeesTotal: number;
    marketplaceFeesTotal: number;
    netPlatformRevenue: number;
    organizerLiability: number;
    marketplaceSellerLiability: number;
    pendingSettlement: number;
    availableSellerBalances: number;
    heldPayoutBalances: number;
    totalPaidOut: number;
    totalWithdrawn: number;
    outstandingPayoutRequests: number;
    outstandingPayoutRequestsCount: number;
    totalRefunds: number;
    completedRefundsCount: number;
    pendingRefundsAmount: number;
    pendingRefundsCount: number;
    successfulPaymentsCount: number;
    successfulPaymentsAmount: number;
    failedPaymentsCount: number;
    pendingPaymentsCount: number;
    primaryOrdersCount: number;
    resaleSalesCount: number;
  };
  topEvents: Array<{
    eventId: number | null;
    title: string;
    organizerName: string;
    ordersCount: number;
    totalRevenue: number;
  }>;
  topSellers: Array<{
    sellerId: number;
    sellerName: string;
    sellerEmail: string;
    salesCount: number;
    totalVolume: number;
    totalEarned: number;
  }>;
  topRefundReasons: Array<{
    reason: string;
    count: number;
    totalAmount: number;
  }>;
  trends: Array<{
    date: string;
    primaryVolume: number;
    resaleVolume: number;
    platformFees: number;
  }>;
  generatedAt: string;
}

export interface ReconciliationReport {
  isSystemReconciled: boolean;
  globalLedgerBalanced: boolean;
  totalLedgerEntriesCount: number;
  grandTotalDebit: number;
  grandTotalCredit: number;
  unbalancedTransactionsCount: number;
  unbalancedTransactions: Array<{
    transactionRef: string;
    debit: number;
    credit: number;
    difference: number;
  }>;
  sellerBalanceDriftCount: number;
  sellerBalanceDrift: Array<{
    userId: number;
    userName: string;
    userEmail: string;
    modelPending: number;
    modelAvailable: number;
    modelHeld: number;
    modelWithdrawn: number;
    ledgerPendingNet: number;
    ledgerAvailableNet: number;
    hasDrift: boolean;
  }>;
  unledgeredTransactionsCount: number;
  unledgeredTransactions: Array<{
    paymentTransactionId: number;
    merchantOrderId: string;
    amount: number;
    createdAt: string;
  }>;
  reconciledAt: string;
}

export interface LedgerEntryItem {
  id: number;
  public_id: string;
  transaction_ref: string;
  account_type: string;
  entry_type: 'DEBIT' | 'CREDIT';
  amount: number | string;
  currency: string;
  description?: string;
  created_at: string;
  user?: { id: number; name: string; email: string };
  order?: { id: number; public_id: string; total_price: number };
  resale_listing?: { id: number; price: number };
  order_id?: number;
  resale_listing_id?: number;
  payment_transaction?: { id: number; provider_transaction_id: string };
}

export const FinanceTab: React.FC = () => {
  const { accessToken } = useAuth();

  // Metrics State
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingReconciliation, setLoadingReconciliation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date Range Filter State
  const [dateRangePreset, setDateRangePreset] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Ledger Table State
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntryItem[]>([]);
  const [ledgerPage, setLedgerPage] = useState<number>(1);
  const [ledgerTotalPages, setLedgerTotalPages] = useState<number>(1);
  const [ledgerTotalCount, setLedgerTotalCount] = useState<number>(0);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Ledger Filter State
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('ALL');
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Inspector Modal State
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntryItem | null>(null);

  // Fetch Accounting Dashboard Metrics
  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    setError(null);
    try {
      let queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const res = await fetch(`/api/admin/financial/dashboard?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to load accounting metrics');
      const data = await res.json();
      setMetrics(data);
    } catch (err: any) {
      console.error('[FinanceTab] Metrics error:', err);
      setError(err.message || 'Error fetching accounting metrics');
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Run Automated Reconciliation Engine
  const fetchReconciliation = async () => {
    setLoadingReconciliation(true);
    try {
      const res = await fetch('/api/admin/financial/reconciliation', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to run reconciliation check');
      const data = await res.json();
      setReconciliation(data);
    } catch (err: any) {
      console.error('[FinanceTab] Reconciliation error:', err);
    } finally {
      setLoadingReconciliation(false);
    }
  };

  // Fetch Paginated Ledger Entries
  const fetchLedger = async () => {
    setLoadingLedger(true);
    try {
      let queryParams = new URLSearchParams({
        page: ledgerPage.toString(),
        limit: '15'
      });
      if (accountTypeFilter !== 'ALL') queryParams.append('accountType', accountTypeFilter);
      if (entryTypeFilter !== 'ALL') queryParams.append('entryType', entryTypeFilter);
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const res = await fetch(`/api/admin/financial/ledger?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to load ledger entries');
      const data = await res.json();
      setLedgerEntries(data.entries || []);
      setLedgerTotalPages(data.pagination?.totalPages || 1);
      setLedgerTotalCount(data.pagination?.totalCount || 0);
    } catch (err: any) {
      console.error('[FinanceTab] Ledger fetch error:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchReconciliation();
  }, [startDate, endDate]);

  useEffect(() => {
    fetchLedger();
  }, [ledgerPage, accountTypeFilter, entryTypeFilter, startDate, endDate]);

  const handlePresetChange = (preset: string) => {
    setDateRangePreset(preset);
    const now = new Date();

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      setStartDate(start.toISOString());
      setEndDate(now.toISOString());
    } else if (preset === 'LAST_7_DAYS') {
      const start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      setStartDate(start.toISOString());
      setEndDate(now.toISOString());
    } else if (preset === 'LAST_30_DAYS') {
      const start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      setStartDate(start.toISOString());
      setEndDate(now.toISOString());
    } else if (preset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(start.toISOString());
      setEndDate(now.toISOString());
    }
  };

  const handleExportCsv = () => {
    let url = `/api/admin/financial/export?`;
    let queryParams = new URLSearchParams();
    if (accountTypeFilter !== 'ALL') queryParams.append('accountType', accountTypeFilter);
    if (entryTypeFilter !== 'ALL') queryParams.append('entryType', entryTypeFilter);
    if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    window.open(`${url}${queryParams.toString()}`, '_blank');
  };

  const getAccountBadge = (type: string) => {
    switch (type) {
      case 'CASH_CLEARING':
        return <span className="px-2.5 py-0.5 rounded-full bg-teal/10 text-teal font-mono text-[11px] font-bold">CASH_CLEARING</span>;
      case 'PLATFORM_REVENUE':
        return <span className="px-2.5 py-0.5 rounded-full bg-status-success/10 text-status-success font-mono text-[11px] font-bold">PLATFORM_REVENUE</span>;
      case 'SELLER_PENDING':
        return <span className="px-2.5 py-0.5 rounded-full bg-status-warning/10 text-status-warning font-mono text-[11px] font-bold">SELLER_PENDING</span>;
      case 'SELLER_AVAILABLE':
        return <span className="px-2.5 py-0.5 rounded-full bg-status-info/10 text-status-info font-mono text-[11px] font-bold">SELLER_AVAILABLE</span>;
      case 'PAYOUT_CLEARING':
        return <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-mono text-[11px] font-bold">PAYOUT_CLEARING</span>;
      case 'REFUND_CLEARING':
        return <span className="px-2.5 py-0.5 rounded-full bg-status-error/10 text-status-error font-mono text-[11px] font-bold">REFUND_CLEARING</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-bg-elevated text-text-muted font-mono text-[11px] font-bold">{type}</span>;
    }
  };

  const ov = metrics?.overview;

  return (
    <section className="space-y-8">
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-bg-border/60">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal/10 text-teal rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-h3 font-black uppercase tracking-wider text-text-primary">
                Platform Financial Reconciliation & Accounting
              </h3>
              <p className="text-body-xs text-text-muted mt-0.5">
                Authoritative double-entry ledger verification, liability auditing, and revenue reconciliation.
              </p>
            </div>
          </div>
        </div>

        {/* Date Range & Export Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={dateRangePreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="px-4 py-2.5 bg-bg-card border border-bg-border rounded-xl text-body-xs font-bold text-text-primary focus:border-teal outline-none"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
            <option value="THIS_MONTH">This Month</option>
          </select>

          <button
            onClick={() => { fetchMetrics(); fetchReconciliation(); fetchLedger(); }}
            disabled={loadingMetrics || loadingReconciliation}
            className="p-2.5 bg-bg-card hover:bg-bg-elevated border border-bg-border rounded-xl text-text-muted hover:text-text-primary transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh All Financials"
          >
            <RefreshCw size={16} className={(loadingMetrics || loadingReconciliation) ? "animate-spin" : ""} />
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal text-onteal hover:bg-teal-hover rounded-xl text-body-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Download size={15} /> Export Ledger CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error text-body-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* RECONCILIATION ENGINE STATUS BANNER */}
      {reconciliation && (
        <div className={`p-6 rounded-3xl border shadow-lg transition-all ${
          reconciliation.isSystemReconciled 
            ? 'bg-status-success/5 border-status-success/20' 
            : 'bg-status-warning/10 border-status-warning/30'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              {reconciliation.isSystemReconciled ? (
                <div className="p-2 bg-status-success/20 text-status-success rounded-full mt-0.5">
                  <CheckCircle2 size={22} />
                </div>
              ) : (
                <div className="p-2 bg-status-warning/20 text-status-warning rounded-full mt-0.5">
                  <AlertTriangle size={22} />
                </div>
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="text-h4 font-black uppercase tracking-wider text-text-primary">
                    {reconciliation.isSystemReconciled 
                      ? 'Ledger Engine: 100% Reconciled & Balanced' 
                      : 'Reconciliation Alert: Discrepancies Detected'}
                  </h4>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    reconciliation.isSystemReconciled ? 'bg-status-success/15 text-status-success' : 'bg-status-warning/20 text-status-warning'
                  }`}>
                    {reconciliation.totalLedgerEntriesCount} Ledger Entries
                  </span>
                </div>

                <p className="text-body-xs text-text-muted mt-1">
                  Grand Debit: <strong className="text-text-primary font-mono">{formatMoneyWithCurrency(reconciliation.grandTotalDebit)}</strong> | 
                  Grand Credit: <strong className="text-text-primary font-mono">{formatMoneyWithCurrency(reconciliation.grandTotalCredit)}</strong> | 
                  Ref Groups: <strong className="text-text-primary">{reconciliation.unbalancedTransactionsCount === 0 ? 'All 100% Balanced' : `${reconciliation.unbalancedTransactionsCount} Unbalanced`}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={fetchReconciliation}
              disabled={loadingReconciliation}
              className="px-4 py-2 bg-bg-card hover:bg-bg-elevated border border-bg-border rounded-xl text-body-xs font-bold text-text-primary flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} className={loadingReconciliation ? "animate-spin" : ""} />
              Re-run Integrity Audit
            </button>
          </div>

          {/* Detailed Discrepancy Cards if any */}
          {!reconciliation.isSystemReconciled && (
            <div className="mt-4 pt-4 border-t border-status-warning/20 space-y-3">
              {reconciliation.unbalancedTransactionsCount > 0 && (
                <div className="p-3 bg-bg-card rounded-xl border border-status-error/30 text-body-xs space-y-1">
                  <p className="font-bold text-status-error flex items-center gap-1.5">
                    <XCircle size={14} /> Unbalanced Transaction References ({reconciliation.unbalancedTransactionsCount}):
                  </p>
                  {reconciliation.unbalancedTransactions.map((u, i) => (
                    <p key={i} className="font-mono text-[11px] text-text-muted">
                      Ref: {u.transactionRef} — Debit: {u.debit} | Credit: {u.credit} | Diff: {u.difference} EGP
                    </p>
                  ))}
                </div>
              )}

              {reconciliation.sellerBalanceDriftCount > 0 && (
                <div className="p-3 bg-bg-card rounded-xl border border-status-warning/30 text-body-xs space-y-1">
                  <p className="font-bold text-status-warning flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Seller Balance Model Drift ({reconciliation.sellerBalanceDriftCount}):
                  </p>
                  {reconciliation.sellerBalanceDrift.map((d, i) => (
                    <p key={i} className="font-mono text-[11px] text-text-muted">
                      User: {d.userName} ({d.userEmail}) — Model Pending: {d.modelPending} EGP vs Ledger Pending: {d.ledgerPendingNet} EGP
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PRIMARY ACCOUNTING METRICS GRID */}
      {loadingMetrics ? (
        <div className="flex flex-col items-center justify-center py-20 bg-bg-card rounded-3xl border border-bg-border">
          <RefreshCw className="w-10 h-10 text-teal animate-spin mb-3" />
          <p className="text-text-muted font-bold tracking-widest uppercase text-label">Calculating financial accounting metrics...</p>
        </div>
      ) : ov ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Total Gross Volume */}
          <div className="p-5 bg-bg-card rounded-3xl border border-bg-border shadow-sm hover:border-teal/40 transition-all space-y-3">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-label font-black uppercase tracking-wider">Total Gross Volume</span>
              <DollarSign className="w-5 h-5 text-teal" />
            </div>
            <div>
              <h4 className="text-h3 font-black text-text-primary tracking-tight">
                {formatMoneyWithCurrency(ov.totalGrossRevenue)}
              </h4>
              <p className="text-body-xs text-text-muted mt-1">
                Primary: <span className="font-bold text-text-primary">{formatMoneyWithCurrency(ov.grossPrimaryVolume)}</span> ({ov.primaryOrdersCount} orders)
              </p>
              <p className="text-body-xs text-text-muted">
                Marketplace: <span className="font-bold text-text-primary">{formatMoneyWithCurrency(ov.grossResaleVolume)}</span> ({ov.resaleSalesCount} resales)
              </p>
            </div>
          </div>

          {/* 2. Net Platform Revenue */}
          <div className="p-5 bg-bg-card rounded-3xl border border-bg-border shadow-sm hover:border-teal/40 transition-all space-y-3">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-label font-black uppercase tracking-wider text-status-success">Net Platform Revenue</span>
              <TrendingUp className="w-5 h-5 text-status-success" />
            </div>
            <div>
              <h4 className="text-h3 font-black text-status-success tracking-tight">
                {formatMoneyWithCurrency(ov.netPlatformRevenue)}
              </h4>
              <p className="text-body-xs text-text-muted mt-1">
                Gross Fees: <span className="font-bold text-text-primary">{formatMoneyWithCurrency(ov.totalPlatformFees)}</span>
              </p>
              <p className="text-body-xs text-text-muted">
                Refunds Deducted: <span className="font-bold text-status-error">-{formatMoneyWithCurrency(ov.totalRefunds)}</span>
              </p>
            </div>
          </div>

          {/* 3. Platform Fee Breakdown */}
          <div className="p-5 bg-bg-card rounded-3xl border border-bg-border shadow-sm hover:border-teal/40 transition-all space-y-3">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-label font-black uppercase tracking-wider">Fees Collected</span>
              <PieChart className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h4 className="text-h3 font-black text-text-primary tracking-tight">
                {formatMoneyWithCurrency(ov.totalPlatformFees)}
              </h4>
              <p className="text-body-xs text-text-muted mt-1">
                Primary Fees: <span className="font-bold text-text-primary">{formatMoneyWithCurrency(ov.primaryFeesTotal)}</span>
              </p>
              <p className="text-body-xs text-text-muted">
                Resale 10% Fees: <span className="font-bold text-teal">{formatMoneyWithCurrency(ov.marketplaceFeesTotal)}</span>
              </p>
            </div>
          </div>

          {/* 4. Seller Liabilities & Balances */}
          <div className="p-5 bg-bg-card rounded-3xl border border-bg-border shadow-sm hover:border-teal/40 transition-all space-y-3">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-label font-black uppercase tracking-wider text-status-warning">Seller Liabilities</span>
              <Users className="w-5 h-5 text-status-warning" />
            </div>
            <div>
              <h4 className="text-h3 font-black text-status-warning tracking-tight">
                {formatMoneyWithCurrency(ov.marketplaceSellerLiability)}
              </h4>
              <p className="text-body-xs text-text-muted mt-1">
                Pending Settlement: <span className="font-bold text-text-primary">{formatMoneyWithCurrency(ov.pendingSettlement)}</span>
              </p>
              <p className="text-body-xs text-text-muted">
                Available Wallet: <span className="font-bold text-status-success">{formatMoneyWithCurrency(ov.availableSellerBalances)}</span>
              </p>
            </div>
          </div>

          {/* 5. Payout Dispatches */}
          <div className="p-5 bg-bg-card rounded-3xl border border-bg-border shadow-sm hover:border-teal/40 transition-all space-y-3">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-label font-black uppercase tracking-wider">Payout Dispatches</span>
              <ArrowUpRight className="w-5 h-5 text-teal" />
            </div>
            <div>
              <h4 className="text-h3 font-black text-text-primary tracking-tight">
                {formatMoneyWithCurrency(ov.totalPaidOut)}
              </h4>
              <p className="text-body-xs text-text-muted mt-1">
                Outstanding Requests: <span className="font-bold text-status-warning">{formatMoneyWithCurrency(ov.outstandingPayoutRequests)}</span> ({ov.outstandingPayoutRequestsCount})
              </p>
            </div>
          </div>

          {/* 6. Refunds Summary */}
          <div className="p-5 bg-bg-card rounded-3xl border border-bg-border shadow-sm hover:border-teal/40 transition-all space-y-3">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-label font-black uppercase tracking-wider text-status-error">Refunds Issued</span>
              <ArrowDownRight className="w-5 h-5 text-status-error" />
            </div>
            <div>
              <h4 className="text-h3 font-black text-status-error tracking-tight">
                {formatMoneyWithCurrency(ov.totalRefunds)}
              </h4>
              <p className="text-body-xs text-text-muted mt-1">
                Completed: <span className="font-bold text-text-primary">{ov.completedRefundsCount}</span>
              </p>
            </div>
          </div>

          {/* 7. Organizer Liabilities */}
          <div className="p-5 bg-bg-card rounded-3xl border border-bg-border shadow-sm hover:border-teal/40 transition-all space-y-3">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-label font-black uppercase tracking-wider">Organizer Liability</span>
              <Layers className="w-5 h-5 text-teal" />
            </div>
            <div>
              <h4 className="text-h3 font-black text-text-primary tracking-tight">
                {formatMoneyWithCurrency(ov.organizerLiability)}
              </h4>
              <p className="text-body-xs text-text-muted mt-1">
                Reserved for Event Settling
              </p>
            </div>
          </div>

          {/* 8. Payment Transaction Quality */}
          <div className="p-5 bg-bg-card rounded-3xl border border-bg-border shadow-sm hover:border-teal/40 transition-all space-y-3">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-label font-black uppercase tracking-wider">Gateway Transactions</span>
              <CheckCircle2 className="w-5 h-5 text-status-success" />
            </div>
            <div>
              <h4 className="text-h3 font-black text-text-primary tracking-tight">
                {ov.successfulPaymentsCount} Captured
              </h4>
              <p className="text-body-xs text-text-muted mt-1">
                Failed: <span className="font-bold text-status-error">{ov.failedPaymentsCount}</span> | Pending: <span className="font-bold text-status-warning">{ov.pendingPaymentsCount}</span>
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* TOP PERFORMERS & REPORT BREAKDOWNS */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Events */}
          <div className="bg-bg-card rounded-3xl p-6 border border-bg-border space-y-4">
            <h4 className="text-h4 font-bold text-text-primary flex items-center gap-2">
              <TrendingUp size={18} className="text-teal" /> Top Events by Gross Revenue
            </h4>

            <div className="space-y-3">
              {metrics.topEvents.length > 0 ? metrics.topEvents.map((e, idx) => (
                <div key={idx} className="p-3.5 bg-bg-elevated/30 rounded-2xl border border-bg-border/60 flex items-center justify-between text-body-xs">
                  <div>
                    <p className="font-bold text-text-primary">{e.title}</p>
                    <p className="text-[11px] text-text-muted">{e.organizerName} • {e.ordersCount} orders</p>
                  </div>
                  <span className="font-bold text-teal font-mono">{formatMoneyWithCurrency(e.totalRevenue)}</span>
                </div>
              )) : (
                <p className="text-body-xs text-text-muted italic">No primary event sales logged yet.</p>
              )}
            </div>
          </div>

          {/* Top Marketplace Sellers */}
          <div className="bg-bg-card rounded-3xl p-6 border border-bg-border space-y-4">
            <h4 className="text-h4 font-bold text-text-primary flex items-center gap-2">
              <Users size={18} className="text-status-warning" /> Top Marketplace Sellers
            </h4>

            <div className="space-y-3">
              {metrics.topSellers.length > 0 ? metrics.topSellers.map((s, idx) => (
                <div key={idx} className="p-3.5 bg-bg-elevated/30 rounded-2xl border border-bg-border/60 flex items-center justify-between text-body-xs">
                  <div>
                    <p className="font-bold text-text-primary">{s.sellerName}</p>
                    <p className="text-[11px] text-text-muted">{s.salesCount} sold listings</p>
                  </div>
                  <div className="text-right font-mono">
                    <p className="font-bold text-text-primary">{formatMoneyWithCurrency(s.totalVolume)}</p>
                    <p className="text-[10px] text-teal">Earned: {formatMoneyWithCurrency(s.totalEarned)}</p>
                  </div>
                </div>
              )) : (
                <p className="text-body-xs text-text-muted italic">No marketplace sales recorded yet.</p>
              )}
            </div>
          </div>

          {/* Refund Reasons Breakdown */}
          <div className="bg-bg-card rounded-3xl p-6 border border-bg-border space-y-4">
            <h4 className="text-h4 font-bold text-text-primary flex items-center gap-2">
              <ArrowDownRight size={18} className="text-status-error" /> Refund Reasons
            </h4>

            <div className="space-y-3">
              {metrics.topRefundReasons.length > 0 ? metrics.topRefundReasons.map((r, idx) => (
                <div key={idx} className="p-3.5 bg-bg-elevated/30 rounded-2xl border border-bg-border/60 flex items-center justify-between text-body-xs">
                  <div>
                    <p className="font-bold text-text-primary">{r.reason}</p>
                    <p className="text-[11px] text-text-muted">{r.count} refund requests</p>
                  </div>
                  <span className="font-bold text-status-error font-mono">{formatMoneyWithCurrency(r.totalAmount)}</span>
                </div>
              )) : (
                <p className="text-body-xs text-text-muted italic">No refunds issued.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOUBLE ENTRY LEDGER TABLE & AUDIT TRAIL */}
      <div className="bg-bg-card rounded-3xl border border-bg-border overflow-hidden shadow-xl space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-bg-border">
          <div>
            <h4 className="text-h4 font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
              <FileText size={18} className="text-teal" /> Double-Entry General Ledger
            </h4>
            <p className="text-body-xs text-text-muted mt-1">
              Immutable journal entries enforcing strict Debit == Credit balance equations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search tx ref, description, party..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLedger()}
                className="pl-9 pr-4 py-2 bg-bg-page border border-bg-border rounded-xl text-body-xs text-text-primary focus:border-teal outline-none w-64"
              />
            </div>

            {/* Account Type Filter */}
            <select
              value={accountTypeFilter}
              onChange={(e) => { setAccountTypeFilter(e.target.value); setLedgerPage(1); }}
              className="px-3 py-2 bg-bg-page border border-bg-border rounded-xl text-body-xs font-bold text-text-primary focus:border-teal outline-none"
            >
              <option value="ALL">All Accounts</option>
              <option value="CASH_CLEARING">Cash Clearing</option>
              <option value="PLATFORM_REVENUE">Platform Revenue</option>
              <option value="SELLER_PENDING">Seller Pending</option>
              <option value="SELLER_AVAILABLE">Seller Available</option>
              <option value="PAYOUT_CLEARING">Payout Clearing</option>
              <option value="REFUND_CLEARING">Refund Clearing</option>
            </select>

            {/* Entry Type Filter */}
            <select
              value={entryTypeFilter}
              onChange={(e) => { setEntryTypeFilter(e.target.value); setLedgerPage(1); }}
              className="px-3 py-2 bg-bg-page border border-bg-border rounded-xl text-body-xs font-bold text-text-primary focus:border-teal outline-none"
            >
              <option value="ALL">All Entry Types</option>
              <option value="DEBIT">DEBIT Only</option>
              <option value="CREDIT">CREDIT Only</option>
            </select>
          </div>
        </div>

        {loadingLedger ? (
          <div className="py-16 text-center text-text-muted">
            <RefreshCw className="w-8 h-8 text-teal animate-spin mx-auto mb-2" />
            <p className="text-body-xs font-bold uppercase tracking-wider">Loading general ledger entries...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-bg-border bg-bg-elevated/30">
                  <th className="px-5 py-3.5 text-label font-black text-text-muted uppercase tracking-widest">Entry Date</th>
                  <th className="px-5 py-3.5 text-label font-black text-text-muted uppercase tracking-widest">Transaction Ref</th>
                  <th className="px-5 py-3.5 text-label font-black text-text-muted uppercase tracking-widest">Account Type</th>
                  <th className="px-5 py-3.5 text-label font-black text-text-muted uppercase tracking-widest">Entry Type</th>
                  <th className="px-5 py-3.5 text-label font-black text-text-muted uppercase tracking-widest">Amount</th>
                  <th className="px-5 py-3.5 text-label font-black text-text-muted uppercase tracking-widest">Party / User</th>
                  <th className="px-5 py-3.5 text-label font-black text-text-muted uppercase tracking-widest text-right">Inspect</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.length > 0 ? ledgerEntries.map(entry => (
                  <tr key={entry.id} className="border-b border-bg-border/40 hover:bg-bg-elevated/20 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-[11px] text-text-muted">
                      {formatDateTime(entry.created_at)}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-body-xs font-bold text-teal">
                      {entry.transaction_ref}
                      {entry.description && (
                        <p className="font-sans text-[10px] text-text-muted font-normal truncate max-w-xs">{entry.description}</p>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {getAccountBadge(entry.account_type)}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className={`font-mono text-[11px] font-black uppercase ${
                        entry.entry_type === 'DEBIT' ? 'text-status-info' : 'text-status-success'
                      }`}>
                        {entry.entry_type}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-mono font-bold text-body-xs text-text-primary">
                      {formatMoneyWithCurrency(entry.amount, entry.currency || 'EGP')}
                    </td>

                    <td className="px-5 py-3.5 text-body-xs text-text-primary">
                      {entry.user ? entry.user.name || entry.user.email : 'System / Platform'}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedEntry(entry)}
                        className="px-2.5 py-1 bg-bg-elevated text-text-muted hover:text-text-primary border border-bg-border rounded-lg text-label font-bold uppercase transition-all cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-text-muted">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-30 text-teal" />
                      <p className="font-bold text-body-base">No ledger entries match current filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        <div className="flex items-center justify-between pt-4 border-t border-bg-border text-body-xs text-text-muted">
          <span>Showing page {ledgerPage} of {ledgerTotalPages} ({ledgerTotalCount} total ledger entries)</span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLedgerPage(p => Math.max(1, p - 1))}
              disabled={ledgerPage <= 1}
              className="p-2 bg-bg-elevated rounded-lg disabled:opacity-40 hover:text-text-primary cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold font-mono text-text-primary">{ledgerPage}</span>
            <button
              onClick={() => setLedgerPage(p => Math.min(ledgerTotalPages, p + 1))}
              disabled={ledgerPage >= ledgerTotalPages}
              className="p-2 bg-bg-elevated rounded-lg disabled:opacity-40 hover:text-text-primary cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* INSPECTOR MODAL */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-bg-page/80 backdrop-blur-md">
          <div className="bg-bg-card w-full max-w-lg rounded-3xl p-6 border border-bg-border shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-bg-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal/10 text-teal rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="text-h4 font-bold text-text-primary">Ledger Entry Audit Record</h4>
                  <p className="font-mono text-body-xs text-text-muted">Ref: {selectedEntry.transaction_ref}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="text-text-muted hover:text-text-primary p-2">✕</button>
            </div>

            <div className="bg-bg-elevated/40 rounded-2xl p-4 border border-bg-border space-y-3 font-mono text-body-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Entry ID / Public:</span>
                <span className="text-text-primary">#{selectedEntry.id} ({selectedEntry.public_id})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Date & Time:</span>
                <span className="text-text-primary">{formatDateTime(selectedEntry.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Account Type:</span>
                <span>{getAccountBadge(selectedEntry.account_type)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Entry Type:</span>
                <span className={`font-bold ${selectedEntry.entry_type === 'DEBIT' ? 'text-status-info' : 'text-status-success'}`}>{selectedEntry.entry_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Amount:</span>
                <span className="font-bold text-teal text-body-sm">{formatMoneyWithCurrency(selectedEntry.amount, selectedEntry.currency || 'EGP')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">User Party:</span>
                <span className="text-text-primary">{selectedEntry.user ? `${selectedEntry.user.name} (${selectedEntry.user.email})` : 'System / Platform'}</span>
              </div>
              {selectedEntry.order_id && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Linked Order ID:</span>
                  <span className="text-text-primary">#{selectedEntry.order_id}</span>
                </div>
              )}
              {selectedEntry.resale_listing_id && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Linked Resale ID:</span>
                  <span className="text-text-primary">#{selectedEntry.resale_listing_id}</span>
                </div>
              )}
              {selectedEntry.description && (
                <div className="pt-2 border-t border-bg-border">
                  <span className="text-text-muted font-sans text-[11px] block mb-1">Description:</span>
                  <p className="font-sans text-text-primary text-body-xs">{selectedEntry.description}</p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedEntry(null)}
                className="w-full py-3 bg-bg-elevated text-text-muted hover:text-text-primary rounded-xl font-bold text-body-xs transition-all cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
