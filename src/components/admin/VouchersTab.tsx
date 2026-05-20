
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Voucher } from '../../types';
import { formatDate } from '../../lib/dateFormat';

interface VouchersTabProps {
  allVouchers: Voucher[];
  loading: boolean;
  setIsVoucherModalOpen: (open: boolean) => void;
  fetchVouchers: () => Promise<void>;
}

export const VouchersTab: React.FC<VouchersTabProps> = ({
  allVouchers,
  loading,
  setIsVoucherModalOpen,
  fetchVouchers
}) => {
  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-h3">Voucher Management</h3>
        <button 
          type="button"
          onClick={fetchVouchers} 
          disabled={loading}
          className="p-3 bg-bg-card hover:bg-bg-elevated border border-bg-border rounded-xl text-text-muted hover:text-text-primary transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
          title="Refresh vouchers"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && allVouchers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-bg-card rounded-3xl border border-bg-border mb-8">
          <RefreshCw className="w-12 h-12 text-teal animate-spin mb-4" />
          <p className="text-text-muted font-medium text-body-base">Loading vouchers...</p>
        </div>
      )}

      <div className="bg-bg-card rounded-3xl border border-bg-border overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-bg-border">
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Code</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Discount</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Usage</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Created By</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Expiry</th>
            </tr>
          </thead>
          <tbody>
            {allVouchers.length > 0 ? allVouchers.map(v => (
              <tr key={v.id} className="border-b border-bg-border last:border-0 hover:bg-bg-elevated transition-colors">
                <td className="px-6 py-4 text-body-sm font-medium text-text-primary">{v.code}</td>
                <td className="px-6 py-4 text-body-sm text-text-primary">{v.discount_percent}%</td>
                <td className="px-6 py-4 text-body-xs text-text-muted">{v.current_uses} / {v.max_uses}</td>
                <td className="px-6 py-4 text-body-xs text-text-muted">{v.creatorName}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-label font-bold uppercase tracking-wider ${
                    v.status === 'active' ? 'bg-status-success/10 text-status-success' : 
                    v.status === 'expired' ? 'bg-status-error/10 text-status-error' : 
                    'bg-bg-elevated text-text-muted'
                  }`}>
                    {v.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-body-xs text-text-muted">{formatDate(v.expiration_date)}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-text-muted italic text-body-sm">No vouchers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
