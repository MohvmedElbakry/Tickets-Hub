
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { ResellRequest } from '../../types';
import { orderService } from '../../services/orderService';

interface ResaleTabProps {
  allResellRequests: ResellRequest[];
  loading: boolean;
  fetchResellRequests: () => Promise<void>;
}

export const ResaleTab: React.FC<ResaleTabProps> = ({
  allResellRequests,
  loading,
  fetchResellRequests
}) => {
  return (
    <section className="space-y-6">
      {loading && allResellRequests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-secondary-bg rounded-3xl border border-white/5 mb-8">
          <RefreshCw className="w-12 h-12 text-accent animate-spin mb-4" />
          <p className="text-text-secondary font-medium">Loading resale requests...</p>
        </div>
      )}
      <h3 className="text-xl font-bold">Resale Management</h3>
      <div className="bg-secondary-bg rounded-3xl border border-white/5 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">User</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Payout Method</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Address</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Amount</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Status</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Action</th>
            </tr>
          </thead>
          <tbody>
            {allResellRequests.length > 0 ? allResellRequests.map(r => (
              <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium">{r.userName}</td>
                <td className="px-6 py-4 text-sm uppercase">{r.payout_method}</td>
                <td className="px-6 py-4 text-sm">{r.payout_address}</td>
                <td className="px-6 py-4 font-bold text-accent">{r.amount} EGP</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    r.status === 'paid' ? 'bg-green-400/10 text-green-400' : 
                    r.status === 'resold' ? 'bg-blue-400/10 text-blue-400' : 
                    'bg-yellow-400/10 text-yellow-400'
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {r.status === 'resold' && (
                    <button 
                      onClick={async () => {
                        if (confirm('Confirm payout completed?')) {
                          try {
                            const data = await orderService.adminMarkResalePaid(r.id);
                            if (data) fetchResellRequests();
                          } catch (err) {
                            console.error('Failed to mark resale paid', err);
                          }
                        }
                      }}
                      className="text-accent hover:underline text-sm font-bold"
                    >
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-text-secondary italic">No resale requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
