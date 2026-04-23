
import React from 'react';
import { RefreshCw, PlusCircle } from 'lucide-react';
import { Voucher } from '../../types';
import { Button } from '../ui/Button';

interface VouchersTabProps {
  allVouchers: Voucher[];
  loading: boolean;
  setIsVoucherModalOpen: (open: boolean) => void;
}

export const VouchersTab: React.FC<VouchersTabProps> = ({
  allVouchers,
  loading,
  setIsVoucherModalOpen
}) => {
  return (
    <section className="space-y-6">
      {loading && allVouchers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-secondary-bg rounded-3xl border border-white/5 mb-8">
          <RefreshCw className="w-12 h-12 text-accent animate-spin mb-4" />
          <p className="text-text-secondary font-medium">Loading vouchers...</p>
        </div>
      )}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Voucher Management</h3>
        <Button variant="primary" onClick={() => setIsVoucherModalOpen(true)}>
          <PlusCircle size={20} /> Create Voucher
        </Button>
      </div>
      <div className="bg-secondary-bg rounded-3xl border border-white/5 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Code</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Discount</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Usage</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Created By</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Status</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Expiry</th>
            </tr>
          </thead>
          <tbody>
            {allVouchers.length > 0 ? allVouchers.map(v => (
              <tr key={v.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium">{v.code}</td>
                <td className="px-6 py-4">{v.discount_percent}%</td>
                <td className="px-6 py-4 text-sm">{v.current_uses} / {v.max_uses}</td>
                <td className="px-6 py-4 text-sm">{v.creatorName}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    v.status === 'active' ? 'bg-green-400/10 text-green-400' : 
                    v.status === 'expired' ? 'bg-red-400/10 text-red-400' : 
                    'bg-gray-400/10 text-gray-400'
                  }`}>
                    {v.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{new Date(v.expiration_date).toLocaleDateString()}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-text-secondary italic">No vouchers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
