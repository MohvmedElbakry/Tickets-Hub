
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
        <div className="flex flex-col items-center justify-center py-20 bg-bg-card rounded-3xl border border-bg-border mb-8">
          <RefreshCw className="w-12 h-12 text-teal animate-spin mb-4" />
          <p className="text-text-muted font-medium text-body-base">Loading resale requests...</p>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-h3">Resale Management</h3>
        <button 
          type="button"
          onClick={fetchResellRequests} 
          disabled={loading}
          className="p-3 bg-bg-card hover:bg-bg-elevated border border-bg-border rounded-xl text-text-muted hover:text-text-primary transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
          title="Refresh resale requests"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="bg-bg-card rounded-3xl border border-bg-border overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-bg-border">
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">User</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Payout Method</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Address</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Amount</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody>
            {allResellRequests.length > 0 ? allResellRequests.map(r => (
              <tr key={r.id} className="border-b border-bg-border last:border-0 hover:bg-bg-elevated transition-colors">
                <td className="px-6 py-4 text-body-sm font-medium text-text-primary">{r.userName}</td>
                <td className="px-6 py-4 text-body-xs uppercase text-text-muted">{r.payout_method}</td>
                <td className="px-6 py-4 text-body-xs text-text-muted">{r.payout_address}</td>
                <td className="px-6 py-4 text-body-sm font-bold text-teal">{r.amount} EGP</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-label font-bold uppercase tracking-wider ${
                    r.status === 'paid' ? 'bg-status-success/10 text-status-success' : 
                    r.status === 'resold' ? 'bg-status-info/10 text-status-info' : 
                    'bg-status-warning/10 text-status-warning'
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
                      className="text-teal hover:underline text-body-xs font-bold"
                    >
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-text-muted italic text-body-sm">No resale requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
