
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Instagram } from 'lucide-react';
import { Order } from '../../types';
import { calculateAge } from '../../lib/utils';
import { orderService } from '../../services/orderService';

interface OrdersTabProps {
  allOrders: Order[];
  loading: boolean;
  fetchOrders: () => Promise<void>;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  allOrders,
  loading,
  fetchOrders
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all');
  const [localOrders, setLocalOrders] = useState<Order[]>(allOrders);
  const [rowLoading, setRowLoading] = useState<{[key: number]: boolean}>({});

  useEffect(() => {
    setLocalOrders(allOrders);
  }, [allOrders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return localOrders;
    if (statusFilter === 'pending') {
      return localOrders.filter(o => o.order_status === 'pending' || o.order_status === 'pending_approval');
    }
    return localOrders.filter(o => o.order_status === statusFilter);
  }, [localOrders, statusFilter]);

  const handleApprove = async (order: Order) => {
    if (rowLoading[order.id]) return;
    setRowLoading(prev => ({ ...prev, [order.id]: true }));
    
    const originalStatus = order.order_status;
    
    // Optimistic Update
    setLocalOrders(prev => prev.map(o => o.id === order.id ? { ...o, order_status: 'approved' } : o));
    
    try {
      const data = await orderService.adminApproveOrder(order.public_id);
      if (data) {
        fetchOrders();
      } else {
        // Rollback
        setLocalOrders(prev => prev.map(o => o.id === order.id ? { ...o, order_status: originalStatus } : o));
      }
    } catch (err) {
      console.error('Failed to approve order', err);
      // Rollback
      setLocalOrders(prev => prev.map(o => o.id === order.id ? { ...o, order_status: originalStatus } : o));
    } finally {
      setRowLoading(prev => ({ ...prev, [order.id]: false }));
    }
  };

  const handleReject = async (order: Order) => {
    if (rowLoading[order.id]) return;
    setRowLoading(prev => ({ ...prev, [order.id]: true }));
    
    const originalStatus = order.order_status;
    
    // Optimistic Update
    setLocalOrders(prev => prev.map(o => o.id === order.id ? { ...o, order_status: 'rejected' } : o));
    
    try {
      const data = await orderService.adminRejectOrder(order.public_id);
      if (data) {
        fetchOrders();
      } else {
        // Rollback
        setLocalOrders(prev => prev.map(o => o.id === order.id ? { ...o, order_status: originalStatus } : o));
      }
    } catch (err) {
      console.error('Failed to reject order', err);
      // Rollback
      setLocalOrders(prev => prev.map(o => o.id === order.id ? { ...o, order_status: originalStatus } : o));
    } finally {
      setRowLoading(prev => ({ ...prev, [order.id]: false }));
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-h3">Order Management</h3>
          <button 
            type="button"
            onClick={fetchOrders} 
            disabled={loading}
            className="p-3 bg-bg-card hover:bg-bg-elevated border border-bg-border rounded-xl text-text-muted hover:text-text-primary transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center"
            title="Refresh orders"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Pill Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {(['all', 'paid', 'pending', 'approved', 'rejected', 'cancelled'] as const).map(filter => {
            const count = localOrders.filter(o => {
              if (filter === 'all') return true;
              if (filter === 'pending') return o.order_status === 'pending' || o.order_status === 'pending_approval';
              return o.order_status === filter;
            }).length;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap cursor-pointer ${
                  statusFilter === filter 
                    ? 'bg-teal/10 border-teal text-teal shadow-card-glow' 
                    : 'bg-bg-card border-bg-border text-text-muted hover:border-text-muted/40 hover:text-text-primary'
                }`}
              >
                {filter} <span className="ml-1 opacity-60 text-[10px]/none font-black">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading && filteredOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-bg-card rounded-3xl border border-bg-border mb-8">
          <RefreshCw className="w-12 h-12 text-teal animate-spin mb-4" />
          <p className="text-text-muted font-medium text-body-base">Loading order details...</p>
        </div>
      )}

      <div className="bg-bg-card rounded-3xl border border-bg-border overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-bg-border">
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Order ID</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">User</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Instagram</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Age/Phone</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Event</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Total</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest text-right">Action</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? filteredOrders.map(order => {
              const isProcessing = !!rowLoading[order.id];
              return (
                <tr key={order.id} className="border-b border-bg-border last:border-0 hover:bg-bg-elevated transition-colors">
                  <td className="px-6 py-4 text-body-sm font-medium text-text-primary">#{order.id}</td>
                  <td className="px-6 py-4">
                    <div className="text-body-sm font-bold text-text-primary">{order.user?.name}</div>
                    <div className="text-body-xs text-text-muted">{order.user?.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    {order.instagram_username ? (
                      <a 
                        href={`https://instagram.com/${order.instagram_username.replace('@', '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-teal hover:underline text-body-sm flex items-center gap-1"
                      >
                        <Instagram size={14} />
                        {order.instagram_username}
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-body-sm text-text-primary">{calculateAge(order.birthdate || order.user?.birthdate)} yrs</div>
                    <div className="text-body-xs text-text-muted">{order.phone || order.user?.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-body-sm text-text-primary">{order.event?.title}</td>
                  <td className="px-6 py-4 text-body-sm font-bold text-teal">{order.total_price.toFixed(2)} EGP</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-label font-bold uppercase tracking-wider ${
                      order.order_status === 'paid' ? 'bg-status-success/10 text-status-success' : 
                      order.order_status === 'invited' ? 'bg-status-info/10 text-status-info' : 
                      order.order_status === 'pending' || order.order_status === 'pending_approval' ? 'bg-status-warning/10 text-status-warning' : 
                      order.order_status === 'approved' ? 'bg-status-info/10 text-status-info' :
                      order.order_status === 'rejected' ? 'bg-status-error/10 text-status-error' :
                      order.order_status === 'expired' ? 'bg-bg-elevated text-text-muted' :
                      'bg-bg-elevated text-text-muted'
                    }`}>
                      {order.order_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {(order.order_status === 'pending' || order.order_status === 'pending_approval' || order.order_status === 'rejected') && (
                        <button 
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleApprove(order)}
                          className="bg-teal/10 text-teal hover:bg-teal hover:text-onteal px-3 py-1 rounded-lg text-label font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 min-w-[70px] cursor-pointer"
                        >
                          {isProcessing ? <RefreshCw size={12} className="animate-spin" /> : 'Approve'}
                        </button>
                      )}
                      {(order.order_status === 'pending' || order.order_status === 'pending_approval' || order.order_status === 'approved') && (
                        <button 
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleReject(order)}
                          className="bg-status-error/10 text-status-error hover:bg-status-error hover:text-text-primary px-3 py-1 rounded-lg text-label font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 min-w-[60px] cursor-pointer"
                        >
                          {isProcessing ? <RefreshCw size={12} className="animate-spin" /> : 'Reject'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-body-xs text-text-muted">{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-text-muted italic text-body-sm">No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
