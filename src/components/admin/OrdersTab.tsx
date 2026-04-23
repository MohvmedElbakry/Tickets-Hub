
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
        <div className="flex flex-col items-center justify-center py-20 bg-secondary-bg rounded-3xl border border-white/5 mb-8">
          <RefreshCw className="w-12 h-12 text-accent animate-spin mb-4" />
          <p className="text-text-secondary font-medium">Loading order details...</p>
        </div>
      )}
      <div className="bg-secondary-bg rounded-3xl border border-white/5 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Order ID</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">User</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Instagram</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Age/Phone</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Event</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Total</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Status</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary text-right">Action</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Date</th>
            </tr>
          </thead>
          <tbody>
            {allOrders.length > 0 ? allOrders.map(order => (
              <tr key={order.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium">#{order.id}</td>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold">{order.user?.name}</div>
                  <div className="text-xs text-text-secondary">{order.user?.email}</div>
                </td>
                <td className="px-6 py-4">
                  {order.instagram_username ? (
                    <a 
                      href={`https://instagram.com/${order.instagram_username.replace('@', '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-accent hover:underline text-sm flex items-center gap-1"
                    >
                      <Instagram size={14} />
                      {order.instagram_username}
                    </a>
                  ) : '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">{calculateAge(order.birthdate || order.user?.birthdate)} yrs</div>
                  <div className="text-xs text-text-secondary">{order.phone || order.user?.phone || '-'}</div>
                </td>
                <td className="px-6 py-4 text-sm">{order.event?.title}</td>
                <td className="px-6 py-4 font-bold text-accent">{order.total_price.toFixed(2)} EGP</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    order.order_status === 'paid' ? 'bg-green-400/10 text-green-400' : 
                    order.order_status === 'invited' ? 'bg-purple-400/10 text-purple-400' : 
                    order.order_status === 'pending' || order.order_status === 'pending_approval' ? 'bg-yellow-400/10 text-yellow-400' : 
                    order.order_status === 'approved' ? 'bg-blue-400/10 text-blue-400' :
                    order.order_status === 'rejected' ? 'bg-red-400/10 text-red-400' :
                    order.order_status === 'expired' ? 'bg-gray-400/10 text-gray-400' :
                    'bg-white/10 text-text-secondary'
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
                        className="bg-accent/10 text-accent hover:bg-accent hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-all"
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
                        className="bg-red-400/10 text-red-400 hover:bg-red-400 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-all"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{new Date(order.created_at).toLocaleDateString()}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-text-secondary italic">No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
