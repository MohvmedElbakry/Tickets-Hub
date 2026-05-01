
import React from 'react';
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
  return (
    <section>
      {loading && allOrders.length === 0 && (
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
            {allOrders.length > 0 ? allOrders.map(order => (
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
                        onClick={async () => {
                          try {
                            const data = await orderService.adminApproveOrder(order.id);
                            if (data) fetchOrders();
                          } catch (err) {
                            console.error('Failed to approve order', err);
                          }
                        }}
                        className="bg-teal/10 text-teal hover:bg-teal hover:text-onteal px-3 py-1 rounded-lg text-label font-bold transition-all"
                      >
                        Approve
                      </button>
                    )}
                    {(order.order_status === 'pending' || order.order_status === 'pending_approval' || order.order_status === 'approved') && (
                      <button 
                        onClick={async () => {
                          try {
                            const data = await orderService.adminRejectOrder(order.id);
                            if (data) fetchOrders();
                          } catch (err) {
                            console.error('Failed to reject order', err);
                          }
                        }}
                        className="bg-status-error/10 text-status-error hover:bg-status-error hover:text-text-primary px-3 py-1 rounded-lg text-label font-bold transition-all"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-body-xs text-text-muted">{new Date(order.created_at).toLocaleDateString()}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-text-muted italic text-body-sm">No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
