import React, { useState, useEffect } from 'react';
import { RefreshCw, Eye, EyeOff, Check, AlertCircle, ShoppingCart } from 'lucide-react';
import { ResellRequest, TicketResaleListing } from '../../types';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';

interface ResaleTabProps {
  allResellRequests: ResellRequest[];
  loading: boolean;
  fetchResellRequests: () => Promise<void>;
}

export const ResaleTab: React.FC<ResaleTabProps> = ({
  allResellRequests,
  loading: legacyLoading,
  fetchResellRequests
}) => {
  const { accessToken } = useAuth();
  
  // Dual-tab structure: 'marketplace' or 'legacy'
  const [subTab, setSubTab] = useState<'marketplace' | 'legacy'>('marketplace');
  
  // Marketplace Listings admin state
  const [marketplaceListings, setMarketplaceListings] = useState<TicketResaleListing[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);

  const fetchMarketplaceListings = async () => {
    setMarketLoading(true);
    setMarketError(null);
    try {
      const res = await fetch('/api/admin/marketplace/listings', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to retrieve administrative marketplace listings');
      const data = await res.json();
      setMarketplaceListings(data.listings || []);
    } catch (err: any) {
      console.error('[AdminResaleTab] fetch error:', err);
      setMarketError(err.message || 'Error loading marketplace listings');
    } finally {
      setMarketLoading(false);
    }
  };

  const handleToggleVisibility = async (publicId: string, currentVisibility: boolean) => {
    try {
      const res = await fetch(`/api/admin/marketplace/listings/${publicId}/visibility`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ visibility: !currentVisibility })
      });
      if (!res.ok) throw new Error('Failed to update visibility');
      
      // Update local state instantly
      setMarketplaceListings(prev => 
        prev.map(l => l.public_id === publicId ? { ...l, visibility: !currentVisibility } : l)
      );
    } catch (err: any) {
      alert(err.message || 'Error updating listing visibility');
    }
  };

  useEffect(() => {
    if (subTab === 'marketplace') {
      fetchMarketplaceListings();
    } else {
      fetchResellRequests();
    }
  }, [subTab]);

  return (
    <section className="space-y-6">
      {/* Tab Header & Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4 border-b border-bg-border/60">
        <div>
          <h3 className="text-h3 font-black uppercase tracking-wider text-text-primary">Resale Management</h3>
          <p className="text-body-xs text-text-muted mt-1">Audit, regulate and moderate ticket resale transactions across the system.</p>
        </div>

        <div className="flex bg-bg-card p-1 rounded-pill border border-bg-border shadow-card overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSubTab('marketplace')}
            className={`px-5 py-2 rounded-pill text-label font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              subTab === 'marketplace' 
                ? 'bg-bg-elevated text-teal border border-teal-border-faint' 
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Marketplace (Production)
          </button>
          <button
            onClick={() => setSubTab('legacy')}
            className={`px-5 py-2 rounded-pill text-label font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              subTab === 'legacy' 
                ? 'bg-bg-elevated text-teal border border-teal-border-faint' 
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Legacy Resell Requests
          </button>
        </div>
      </div>

      {/* Production Marketplace Tab */}
      {subTab === 'marketplace' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-teal" />
              <h4 className="text-body-sm font-bold uppercase tracking-wider">All Production Listings</h4>
            </div>
            <button 
              type="button"
              onClick={fetchMarketplaceListings} 
              disabled={marketLoading}
              className="p-3 bg-bg-card hover:bg-bg-elevated border border-bg-border rounded-xl text-text-muted hover:text-text-primary transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
              title="Refresh listings"
            >
              <RefreshCw size={16} className={marketLoading ? "animate-spin" : ""} />
            </button>
          </div>

          {marketError && (
            <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error text-body-xs font-bold rounded-card flex items-center gap-2">
              <AlertCircle size={16} /> {marketError}
            </div>
          )}

          {marketLoading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-bg-card rounded-3xl border border-bg-border">
              <RefreshCw className="w-12 h-12 text-teal animate-spin mb-4" />
              <p className="text-text-muted font-bold tracking-widest uppercase text-label">Syncing Marketplace listings...</p>
            </div>
          ) : (
            <div className="bg-bg-card rounded-3xl border border-bg-border overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-bg-border bg-bg-elevated/30">
                      <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest">Listing Info</th>
                      <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest">Seller</th>
                      <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest">Pricing</th>
                      <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest">Platform Fee</th>
                      <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest">Visibility</th>
                      <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest text-right">Moderation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketplaceListings.length > 0 ? marketplaceListings.map(listing => {
                      const ticket = listing.ticket_instance;
                      const event = ticket?.order?.event;
                      
                      return (
                        <tr key={listing.id} className="border-b border-bg-border last:border-0 hover:bg-bg-elevated/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="content-stack gap-1">
                              <p className="text-body-xs font-bold text-text-primary line-clamp-1">{event?.title || 'Unknown Event'}</p>
                              <p className="text-[10px] font-mono text-teal">ID: {listing.public_id}</p>
                              <p className="text-[10px] text-text-muted">{ticket?.ticket_type?.name || 'Entry ticket'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="content-stack gap-0.5">
                              <p className="text-body-xs font-bold text-text-primary">{listing.seller?.name}</p>
                              <p className="text-[10px] text-text-muted font-mono">{listing.seller?.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-body-xs font-bold text-text-primary">
                            {listing.price} EGP
                          </td>
                          <td className="px-6 py-4 font-mono text-body-xs font-bold text-text-muted">
                            {listing.marketplace_fee} EGP
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-tag text-[9px] font-black uppercase tracking-wider border ${
                              listing.status === 'SOLD' ? 'bg-status-success/10 text-status-success border-status-success/20' : 
                              listing.status === 'CANCELLED' ? 'bg-bg-elevated text-text-muted border-bg-border' : 
                              listing.status === 'LISTED' ? 'bg-teal/10 text-teal border-teal/20' : 
                              'bg-status-warning/10 text-status-warning border-status-warning/20'
                            }`}>
                              {listing.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-tag text-[9px] font-black uppercase tracking-wider border ${
                              listing.visibility ? 'bg-status-success/10 text-status-success border-status-success/20' : 'bg-status-error/10 text-status-error border-status-error/20'
                            }`}>
                              {listing.visibility ? 'VISIBLE' : 'HIDDEN'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {listing.status === 'LISTED' && (
                              <button
                                onClick={() => handleToggleVisibility(listing.public_id, listing.visibility)}
                                className={`p-2 rounded-xl border transition-all ${
                                  listing.visibility 
                                    ? 'bg-status-error/5 border-status-error/20 text-status-error hover:bg-status-error/10' 
                                    : 'bg-status-success/5 border-status-success/20 text-status-success hover:bg-status-success/10'
                                }`}
                                title={listing.visibility ? 'Hide Listing' : 'Make Visible'}
                              >
                                {listing.visibility ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center text-text-muted italic text-body-sm">
                          No active marketplace listings found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legacy Resell Tab */}
      {subTab === 'legacy' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-teal" />
              <h4 className="text-body-sm font-bold uppercase tracking-wider">All Legacy Resell Requests</h4>
            </div>
            <button 
              type="button"
              onClick={fetchResellRequests} 
              disabled={legacyLoading}
              className="p-3 bg-bg-card hover:bg-bg-elevated border border-bg-border rounded-xl text-text-muted hover:text-text-primary transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
              title="Refresh resell requests"
            >
              <RefreshCw size={16} className={legacyLoading ? "animate-spin" : ""} />
            </button>
          </div>

          {legacyLoading && allResellRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-bg-card rounded-3xl border border-bg-border">
              <RefreshCw className="w-12 h-12 text-teal animate-spin mb-4" />
              <p className="text-text-muted font-bold tracking-widest uppercase text-label">Loading legacy requests...</p>
            </div>
          ) : (
            <div className="bg-bg-card rounded-3xl border border-bg-border overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-bg-border bg-bg-elevated/30">
                      <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest">User</th>
                      <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest">Payout Method</th>
                      <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest">Address</th>
                      <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest">Amount</th>
                      <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4.5 text-label font-black text-text-muted uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allResellRequests.length > 0 ? allResellRequests.map(r => (
                      <tr key={r.id} className="border-b border-bg-border last:border-0 hover:bg-bg-elevated/40 transition-colors">
                        <td className="px-6 py-4 text-body-sm font-medium text-text-primary">{r.userName}</td>
                        <td className="px-6 py-4 text-body-xs uppercase text-text-muted">{r.payout_method}</td>
                        <td className="px-6 py-4 text-body-xs text-text-muted">{r.payout_address}</td>
                        <td className="px-6 py-4 text-body-sm font-bold text-teal">{r.amount} EGP</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-tag text-[9px] font-black uppercase tracking-wider border ${
                            r.status === 'paid' ? 'bg-status-success/10 text-status-success border-status-success/20' : 
                            r.status === 'resold' ? 'bg-status-info/10 text-status-info border-status-info/20' : 
                            'bg-status-warning/10 text-status-warning border-status-warning/20'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
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
                              className="text-teal hover:underline text-body-xs font-black uppercase tracking-wider"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center text-text-muted italic text-body-sm">
                          No legacy resale requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
