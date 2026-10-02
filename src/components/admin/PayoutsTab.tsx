import React, { useState, useEffect } from 'react';
import { DollarSign, RefreshCw, CheckCircle, XCircle, Clock, CreditCard, Building2, Smartphone, ShieldCheck, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatMoneyWithCurrency } from '../../lib/utils';
import { formatDateTime } from '../../lib/dateFormat';

export interface AdminPayoutRequest {
  id: number;
  public_id: string;
  user_id: number;
  destination_id: number;
  amount: number | string;
  currency: string;
  status: 'REQUESTED' | 'PENDING_REVIEW' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
  failure_reason?: string;
  provider_ref?: string;
  approved_by_admin_id?: number;
  requested_at: string;
  approved_at?: string;
  processed_at?: string;
  paid_at?: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  destination?: {
    id: number;
    type: 'bank_account' | 'instapay' | 'vodafone_cash';
    account_name: string;
    masked_details: string;
  };
}

export const PayoutsTab: React.FC = () => {
  const { accessToken } = useAuth();
  const [payouts, setPayouts] = useState<AdminPayoutRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Review modal state
  const [selectedPayout, setSelectedPayout] = useState<AdminPayoutRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | 'MARK_PAID' | null>(null);
  const [transferRef, setTransferRef] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchPayouts = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = statusFilter !== 'ALL' ? `/api/admin/payouts?status=${statusFilter}` : '/api/admin/payouts';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to load payout requests');
      const data = await res.json();
      setPayouts(data.payouts || []);
    } catch (err: any) {
      console.error('[AdminPayoutsTab] error:', err);
      setError(err.message || 'Error fetching payout requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [statusFilter]);

  const handleReviewSubmit = async () => {
    if (!selectedPayout || !reviewAction) return;

    if (reviewAction === 'MARK_PAID' && !transferRef.trim()) {
      setModalError('Transfer reference (InstaPay/Bank Ref) is required when marking paid.');
      return;
    }

    if (reviewAction === 'REJECT' && !rejectionReason.trim()) {
      setModalError('Rejection reason is required.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await fetch(`/api/admin/payouts/${selectedPayout.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          action: reviewAction,
          reason: rejectionReason.trim() || undefined,
          transferReference: transferRef.trim() || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to review payout request');
      }

      // Refresh list and close modal
      await fetchPayouts();
      closeModal();
    } catch (err: any) {
      console.error('[AdminPayoutsTab] Review error:', err);
      setModalError(err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setSelectedPayout(null);
    setReviewAction(null);
    setTransferRef('');
    setRejectionReason('');
    setModalError(null);
  };

  const getDestinationIcon = (type?: string) => {
    switch (type) {
      case 'bank_account': return <Building2 size={16} className="text-teal" />;
      case 'instapay': return <CreditCard size={16} className="text-status-info" />;
      case 'vodafone_cash': return <Smartphone size={16} className="text-status-warning" />;
      default: return <DollarSign size={16} className="text-text-muted" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-status-success/10 text-status-success text-label font-bold uppercase tracking-wider"><CheckCircle size={12} /> Paid</span>;
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-status-info/10 text-status-info text-label font-bold uppercase tracking-wider"><ShieldCheck size={12} /> Approved</span>;
      case 'REQUESTED':
      case 'PENDING_REVIEW':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-status-warning/10 text-status-warning text-label font-bold uppercase tracking-wider"><Clock size={12} /> Pending Review</span>;
      case 'FAILED':
      case 'CANCELLED':
      case 'REJECTED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-status-error/10 text-status-error text-label font-bold uppercase tracking-wider"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-bg-elevated text-text-muted text-label font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <section className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4 border-b border-bg-border/60">
        <div>
          <h3 className="text-h3 font-black uppercase tracking-wider text-text-primary">Seller Payout Operations</h3>
          <p className="text-body-xs text-text-muted mt-1">Review, authorize, and track manual transfers for marketplace seller withdrawals.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-bg-card border border-bg-border rounded-xl text-body-xs font-bold text-text-primary focus:border-teal outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="REQUESTED">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid Out</option>
            <option value="FAILED">Rejected / Failed</option>
          </select>

          <button
            onClick={fetchPayouts}
            disabled={loading}
            className="p-3 bg-bg-card hover:bg-bg-elevated border border-bg-border rounded-xl text-text-muted hover:text-text-primary transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh payouts"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error text-body-xs font-bold rounded-card flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-bg-card rounded-3xl border border-bg-border">
          <RefreshCw className="w-12 h-12 text-teal animate-spin mb-4" />
          <p className="text-text-muted font-bold tracking-widest uppercase text-label">Loading payout requests...</p>
        </div>
      ) : (
        <div className="bg-bg-card rounded-3xl border border-bg-border overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-bg-border bg-bg-elevated/30">
                  <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest">Payout Ref</th>
                  <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest">Seller</th>
                  <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest">Destination Account</th>
                  <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.length > 0 ? payouts.map(payout => (
                  <tr key={payout.id} className="border-b border-bg-border/40 hover:bg-bg-elevated/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-body-xs font-bold text-teal">
                      #{payout.public_id ? payout.public_id.slice(0, 8) : payout.id}
                      <p className="font-sans text-[10px] text-text-muted font-normal">{formatDateTime(payout.requested_at)}</p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-bold text-body-xs text-text-primary">{payout.user?.name || 'Unknown User'}</p>
                      <p className="text-[11px] text-text-muted">{payout.user?.email || `ID: ${payout.user_id}`}</p>
                    </td>

                    <td className="px-6 py-4">
                      {payout.destination ? (
                        <div className="flex items-center gap-2">
                          {getDestinationIcon(payout.destination.type)}
                          <div>
                            <p className="font-bold text-body-xs text-text-primary">{payout.destination.account_name}</p>
                            <p className="font-mono text-[10px] text-text-muted">{payout.destination.masked_details}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-muted text-body-xs">No destination data</span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-bold text-body-base text-text-primary">
                      {formatMoneyWithCurrency(payout.amount, payout.currency || 'EGP')}
                    </td>

                    <td className="px-6 py-4">
                      {getStatusBadge(payout.status)}
                      {payout.provider_ref && (
                        <p className="font-mono text-[10px] text-teal mt-1">Ref: {payout.provider_ref}</p>
                      )}
                      {payout.failure_reason && (
                        <p className="text-[10px] text-status-error mt-1">{payout.failure_reason}</p>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(payout.status === 'REQUESTED' || payout.status === 'PENDING_REVIEW') && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedPayout(payout);
                                setReviewAction('APPROVE');
                              }}
                              className="px-3 py-1.5 bg-status-info/10 text-status-info hover:bg-status-info/20 border border-status-info/20 rounded-lg text-label font-bold uppercase transition-all cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPayout(payout);
                                setReviewAction('REJECT');
                              }}
                              className="px-3 py-1.5 bg-status-error/10 text-status-error hover:bg-status-error/20 border border-status-error/20 rounded-lg text-label font-bold uppercase transition-all cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {(payout.status === 'APPROVED' || payout.status === 'REQUESTED' || payout.status === 'PENDING_REVIEW') && (
                          <button
                            onClick={() => {
                              setSelectedPayout(payout);
                              setReviewAction('MARK_PAID');
                            }}
                            className="px-3 py-1.5 bg-teal text-onteal hover:bg-teal-hover rounded-lg text-label font-bold uppercase transition-all shadow-sm cursor-pointer"
                          >
                            Mark Paid
                          </button>
                        )}

                        {payout.status === 'PAID' && (
                          <button
                            onClick={() => {
                              setSelectedPayout(payout);
                              setReviewAction(null); // Inspect mode
                            }}
                            className="px-3 py-1.5 bg-bg-elevated text-text-muted hover:text-text-primary border border-bg-border rounded-lg text-label font-bold uppercase transition-all cursor-pointer"
                          >
                            Inspect
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-text-muted">
                      <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30 text-teal" />
                      <p className="font-bold text-body-base">No payout requests found</p>
                      <p className="text-body-xs text-text-muted mt-1">
                        {statusFilter !== 'ALL' ? `No payouts matching status "${statusFilter}"` : 'Marketplace seller withdrawal requests will appear here.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ACTION & INSPECTOR MODAL */}
      {selectedPayout && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-bg-page/80 backdrop-blur-md">
          <div className="bg-bg-card w-full max-w-lg rounded-3xl p-6 border border-bg-border shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-bg-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal/10 text-teal rounded-xl">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h4 className="text-h4 font-bold text-text-primary">
                    {reviewAction === 'APPROVE' && 'Approve Payout Request'}
                    {reviewAction === 'REJECT' && 'Reject Payout Request'}
                    {reviewAction === 'MARK_PAID' && 'Mark Payout as Paid (Transfer Completed)'}
                    {!reviewAction && 'Payout Request Details'}
                  </h4>
                  <p className="text-body-xs text-text-muted">Ref: #{selectedPayout.public_id}</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-text-muted hover:text-text-primary p-2">✕</button>
            </div>

            {/* Payout Information Overview */}
            <div className="bg-bg-elevated/40 rounded-2xl p-4 border border-bg-border space-y-3">
              <div className="flex justify-between text-body-xs">
                <span className="text-text-muted">Seller Name:</span>
                <span className="font-bold text-text-primary">{selectedPayout.user?.name}</span>
              </div>
              <div className="flex justify-between text-body-xs">
                <span className="text-text-muted">Seller Email:</span>
                <span className="font-mono text-text-primary">{selectedPayout.user?.email}</span>
              </div>
              <div className="flex justify-between text-body-xs">
                <span className="text-text-muted">Requested Amount:</span>
                <span className="font-bold text-teal text-body-sm">{formatMoneyWithCurrency(selectedPayout.amount, selectedPayout.currency || 'EGP')}</span>
              </div>
              <div className="flex justify-between text-body-xs">
                <span className="text-text-muted">Destination Type:</span>
                <span className="font-bold text-text-primary uppercase">{selectedPayout.destination?.type.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-body-xs">
                <span className="text-text-muted">Account Holder:</span>
                <span className="font-bold text-text-primary">{selectedPayout.destination?.account_name}</span>
              </div>
              <div className="flex justify-between text-body-xs">
                <span className="text-text-muted">Masked Account:</span>
                <span className="font-mono text-text-primary">{selectedPayout.destination?.masked_details}</span>
              </div>
            </div>

            {modalError && (
              <div className="p-3 bg-status-error/10 border border-status-error/20 text-status-error text-body-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle size={16} /> {modalError}
              </div>
            )}

            {/* Action Form Inputs */}
            {reviewAction === 'MARK_PAID' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-label text-text-muted mb-1.5 uppercase font-bold tracking-wider">
                    External Transfer Reference / Transaction ID *
                  </label>
                  <input
                    type="text"
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    placeholder="e.g. INSTAPAY-984210 / VODAFONE-772911 / BANK-TRF-001"
                    className="w-full px-4 py-3 bg-bg-page border border-bg-border rounded-xl text-body-xs font-mono text-text-primary focus:border-teal outline-none"
                  />
                  <p className="text-[11px] text-text-muted mt-1">
                    Enter the reference code generated by InstaPay, Vodafone Cash, or your bank portal for audit logging.
                  </p>
                </div>
              </div>
            )}

            {reviewAction === 'REJECT' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-label text-text-muted mb-1.5 uppercase font-bold tracking-wider">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Account name mismatch / Invalid account details / Re-submit request"
                    rows={3}
                    className="w-full px-4 py-3 bg-bg-page border border-bg-border rounded-xl text-body-xs text-text-primary focus:border-teal outline-none"
                  />
                  <p className="text-[11px] text-text-muted mt-1">
                    This reason will be logged in the financial audit trail and communicated to the seller.
                  </p>
                </div>
              </div>
            )}

            {reviewAction === 'APPROVE' && (
              <div className="p-4 bg-status-info/10 border border-status-info/20 rounded-2xl text-body-xs text-status-info">
                Approving this payout request confirms that destination details have been verified and marks the payout as ready for external manual transfer.
              </div>
            )}

            {/* Receipt Attachment Placeholder Architecture */}
            <div className="p-3 bg-bg-elevated/30 border border-bg-border/60 rounded-2xl flex items-center gap-3">
              <FileText size={18} className="text-teal" />
              <div>
                <p className="text-body-xs font-bold text-text-primary">Receipt Attachment Architecture</p>
                <p className="text-[10px] text-text-muted">Cloud storage attachment placeholder ready for future file uploads.</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-bg-elevated text-text-muted hover:text-text-primary rounded-xl font-bold text-body-xs transition-all cursor-pointer"
              >
                Cancel
              </button>

              {reviewAction && (
                <button
                  type="button"
                  onClick={handleReviewSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-teal text-onteal hover:bg-teal-hover rounded-xl font-bold text-body-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                  Confirm {reviewAction.replace('_', ' ')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
