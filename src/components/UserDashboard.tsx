import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Ticket, 
  Star, 
  CreditCard, 
  User, 
  LogOut, 
  Calendar, 
  MapPin, 
  Download, 
  X, 
  Clock, 
  RefreshCw,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/Button';
import { 
  Order, 
  PreRegistration, 
  PointsHistory, 
  OrderTicket
} from '../types';
import { authService } from '../services/authService';
import { orderService } from '../services/orderService';
import { eventService } from '../services/eventService';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { handleDownloadPDF } from '../lib/ticketUtils';
import { useQRStatus } from '../hooks/useQRStatus';
import { useOrder } from '../hooks/useOrder';
import { formatEventTime } from '../lib/utils';

export const UserDashboard = () => {
  const navigate = useNavigate();
  const { user, logout: handleLogout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [myPreRegistrations, setMyPreRegistrations] = useState<PreRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  const [points, setPoints] = useState({ balance: 0, history: [] as PointsHistory[] });
  const [isResaleModalOpen, setIsResaleModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<OrderTicket | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<'instapay' | 'vodafone'>('instapay');
  const [payoutAddress, setPayoutAddress] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tickets' | 'rewards' | 'profile' | 'payments' | 'pre-registrations'>('dashboard');
  const [ticketFilter, setTicketFilter] = useState<'all' | 'pre_registered' | 'pending' | 'paid' | 'invited'>('all');
  const [viewingTicket, setViewingTicket] = useState<Order | null>(null);
  
  // Phase 3.2.4: Use single source of truth for the viewing ticket
  const { order: freshOrder, loading: loadingFullOrder } = useOrder(viewingTicket?.id);

  const { 
    qrStatus: viewingTicketQrStatus, 
    loading: loadingViewingQr 
  } = useQRStatus(
    viewingTicket?.id?.toString(), 
    viewingTicket?.is_paid === true
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ordersData, preRegData, pointsData] = await Promise.all([
          orderService.getOrders(),
          eventService.getPreRegistrationsForUser(),
          authService.getUserPoints()
        ]);
        if (ordersData && Array.isArray(ordersData)) {
          // Normalize status representation for UI
          const normalizedOrders = ordersData.map((o: any) => ({
            ...o,
            displayStatus: o.is_paid ? 'paid' : o.order_status
          }));
          setOrders(normalizedOrders);
        }
        if (preRegData && Array.isArray(preRegData)) setMyPreRegistrations(preRegData);
        if (pointsData) setPoints(pointsData);
      } catch (err: any) {
        if (err.status !== 401) {
          console.error('Failed to fetch dashboard data', err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredTickets = useMemo(() => {
    // Ultra-defensive check to prevent "map is not a function"
    const ordersList = Array.isArray(orders) ? orders : [];
    const preRegList = Array.isArray(myPreRegistrations) ? myPreRegistrations : [];

    const orderItems = ordersList.map(o => ({ 
      ...o, 
      type: 'order' as const 
    }));
    
    const preRegItems = preRegList.map(pr => ({ 
      ...pr, 
      type: 'pre_reg' as const, 
      displayStatus: 'pre_registered' as const 
    }));

    const allItems = [...orderItems, ...preRegItems];

    if (ticketFilter === 'all') return allItems;
    if (ticketFilter === 'paid') return allItems.filter(item => item.is_paid);
    if (ticketFilter === 'pending') return allItems.filter(item => !item.is_paid && (item.displayStatus === 'approved' || item.displayStatus === 'pending'));

    return allItems.filter(item => item.displayStatus === ticketFilter);
  }, [orders, myPreRegistrations, ticketFilter]);

  const handleResaleRequest = async () => {
    if (!selectedTicket || !payoutAddress) return;
    try {
      const data = await orderService.createResaleRequest({
        order_ticket_id: selectedTicket.id,
        payout_method: payoutMethod,
        payout_address: payoutAddress,
        amount: selectedTicket.price_each
      });
      if (data) {
        alert('Resale request submitted successfully.');
        setIsResaleModalOpen(false);
        // Refresh orders
        const updatedOrders = await orderService.getOrders();
        if (updatedOrders) setOrders(updatedOrders);
      }
    } catch (err) {
      alert('Error submitting resale request.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row gap-12">
        <aside className="w-full md:w-64 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:bg-white/5'}`}
          >
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('tickets')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'tickets' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:bg-white/5'}`}
          >
            <Ticket size={20} /> My Tickets
          </button>
          <button 
            onClick={() => setActiveTab('rewards')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'rewards' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:bg-white/5'}`}
          >
            <Star size={20} /> Rewards
          </button>
          <button 
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'payments' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:bg-white/5'}`}
          >
            <CreditCard size={20} /> Payments
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'profile' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:bg-white/5'}`}
          >
            <User size={20} /> Profile
          </button>
          <div className="pt-8">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-red-400 hover:bg-red-400/5 transition-colors">
              <LogOut size={20} /> Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 space-y-12">
          {activeTab === 'dashboard' && (
            <>
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
                  <p className="text-text-secondary">You have {orders.length} orders in your history.</p>
                </div>
                <div className="flex items-center gap-4 bg-secondary-bg p-4 rounded-3xl border border-white/5">
                  <div className="w-12 h-12 bg-accent/10 text-accent rounded-2xl flex items-center justify-center">
                    <Star size={24} fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">Points Balance</p>
                    <p className="text-2xl font-bold">{points.balance} <span className="text-sm font-normal text-text-secondary">pts</span></p>
                  </div>
                  <Button variant="accent" className="ml-4 px-4 py-2 text-xs" onClick={() => setActiveTab('rewards')}>Redeem</Button>
                </div>
              </header>

              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Recent Tickets</h3>
                  <button onClick={() => setActiveTab('tickets')} className="text-accent text-sm font-bold hover:underline">View All</button>
                </div>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-secondary">Loading your tickets...</p>
                  </div>
                ) : orders.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-6">
                    {orders.slice(0, 2).map(order => (
                      <div key={order.id} className="bg-secondary-bg rounded-3xl border border-white/5 overflow-hidden flex flex-col">
                        <div className="flex h-32">
                          <div className="w-32 shrink-0">
                            <img 
                              src={order.event?.image_url || 'https://picsum.photos/seed/event/400/300'} 
                              className="w-full h-full object-cover" 
                              alt="Event" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/event/400/300';
                              }}
                            />
                          </div>
                          <div className="p-6 flex-1">
                            <h4 className="font-bold mb-1 line-clamp-1">{order.event?.title}</h4>
                            <p className="text-xs text-text-secondary mb-1">{order.event?.event_date}</p>
                            <p className="text-[10px] text-text-secondary mb-2 uppercase tracking-wider font-medium">
                              {formatEventTime(order.event?.event_date || order.event?.date, order.event?.event_time || order.event?.time)}
                            </p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              order.order_status === 'paid' ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'
                            }`}>
                              {order.order_status}
                            </span>
                          </div>
                        </div>
                        <div className="p-6 pt-0 flex justify-between items-center border-t border-white/5 mt-auto">
                          <div>
                            <p className="text-xs text-text-secondary">Order #{order.id}</p>
                            <p className="font-bold text-accent">{order.total_price.toFixed(2)} EGP</p>
                          </div>
                          <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => setViewingTicket(order)}>View Ticket</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-secondary-bg rounded-3xl border border-dashed border-white/10">
                    <Ticket size={48} className="mx-auto text-text-secondary mb-4 opacity-20" />
                    <p className="text-text-secondary">You haven't booked any tickets yet.</p>
                    <Button variant="accent" className="mt-4" onClick={() => navigate('/events')}>Explore Events</Button>
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === 'tickets' && (
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <h3 className="text-2xl font-bold">My Tickets</h3>
                <div className="flex bg-secondary-bg p-1 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'pre_registered', label: 'Pre-Reg' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'paid', label: 'Paid' },
                    { id: 'invited', label: 'Invited' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setTicketFilter(tab.id as any)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${ticketFilter === tab.id ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:text-white'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredTickets.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-6">
                  {filteredTickets.map((item: any) => (
                    <div key={item.id} className="bg-secondary-bg rounded-3xl border border-white/5 overflow-hidden flex flex-col">
                      <div className="flex h-32">
                        <div className="w-32 shrink-0">
                          <img 
                            src={item.event?.image_url || 'https://picsum.photos/seed/event/400/300'} 
                            className="w-full h-full object-cover" 
                            alt="Event" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/event/400/300';
                            }}
                          />
                        </div>
                        <div className="p-6 flex-1">
                          <h4 className="font-bold mb-1 line-clamp-1">{item.event?.title}</h4>
                          <p className="text-xs text-text-secondary mb-1">{item.event?.event_date}</p>
                          <p className="text-[10px] text-text-secondary mb-2 uppercase tracking-wider font-medium">
                            {formatEventTime(item.event?.event_date || item.event?.date, item.event?.event_time || item.event?.time)}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.displayStatus === 'paid' ? 'bg-green-400/10 text-green-400' : 
                            item.displayStatus === 'approved' ? 'bg-blue-400/10 text-blue-400' :
                            item.displayStatus === 'rejected' ? 'bg-red-400/10 text-red-400' :
                            item.displayStatus === 'pre_registered' ? 'bg-gray-400/10 text-gray-400' :
                            item.displayStatus === 'invited' ? 'bg-purple-400/10 text-purple-400' :
                            'bg-yellow-400/10 text-yellow-400'
                          }`}>
                            {item.displayStatus === 'approved' ? 'Approved (Waiting for Payment)' : 
                             item.displayStatus === 'pre_registered' ? 'Pre-Registered' :
                             item.displayStatus === 'invited' ? 'Invited' :
                             item.displayStatus}
                          </span>
                        </div>
                      </div>
                      <div className="p-6 pt-0 flex justify-between items-center border-t border-white/5 mt-auto">
                        <div>
                          <p className="text-xs text-text-secondary">{item.type === 'order' ? `Order #${item.id}` : 'Pre-Registration'}</p>
                          <p className="font-bold text-accent">{item.total_price ? `${item.total_price.toFixed(2)} EGP` : 'TBA'}</p>
                        </div>
                        <div className="flex gap-2">
                          {item.type === 'order' ? (
                            <>
                              <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => setViewingTicket(item)}>View</Button>
                              {item.order_status === 'approved' && (
                                <Button 
                                  variant="primary" 
                                  className="px-3 py-1.5 text-xs"
                                  onClick={() => {
                                    if (confirm('Proceed to payment? (Simulated)')) {
                                      orderService.payOrder(item.id).then(data => data && window.location.reload());
                                    }
                                  }}
                                >
                                  Pay Now
                                </Button>
                              )}
                              {item.order_status === 'paid' && (
                                <Button 
                                  variant="outline" 
                                  className="px-3 py-1.5 text-xs text-red-400 border-red-400/20 hover:bg-red-400/5"
                                  onClick={() => {
                                    const ticketToResell = item.items && item.items.length > 0 ? item.items[0] : null;
                                    if (ticketToResell) {
                                      setSelectedTicket(ticketToResell);
                                      setIsResaleModalOpen(true);
                                    } else {
                                      alert('No tickets found in this order.');
                                    }
                                  }}
                                >
                                  Resell
                                </Button>
                              )}
                              {item.order_status === 'invited' && (
                                <div className="flex gap-2">
                                  <Button 
                                    variant="primary" 
                                    className="px-3 py-1.5 text-xs bg-green-500 hover:bg-green-600 border-none"
                                    onClick={() => {
                                      if (confirm('Accept this invitation?')) {
                                        orderService.payOrder(item.id).then(data => data && window.location.reload());
                                      }
                                    }}
                                  >
                                    Accept
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    className="px-3 py-1.5 text-xs text-red-400 border-red-400/20 hover:bg-red-400/5"
                                    onClick={() => {
                                      if (confirm('Reject this invitation?')) {
                                        orderService.rejectInvitation(item.id).then(data => data && window.location.reload());
                                      }
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                              {item.order_status === 'pending' && (
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider">Awaiting approval</span>
                                  <span className="text-[8px] text-text-secondary flex items-center gap-1 uppercase tracking-widest leading-none">
                                    <Clock size={8} /> 1hr Reservation
                                  </span>
                                </div>
                              )}
                              {item.order_status === 'requested' && (
                                <span className="text-[10px] text-yellow-500 font-bold">Waiting for approval</span>
                              )}
                            </>
                          ) : (
                            <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => navigate('/events')}>View Event</Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-secondary-bg rounded-3xl border border-dashed border-white/10">
                  <Ticket size={48} className="mx-auto text-text-secondary mb-4 opacity-20" />
                  <h3 className="text-xl font-bold mb-2">No tickets found</h3>
                  <p className="text-text-secondary">You don't have any tickets matching this filter.</p>
                </div>
              )}
            </section>
          )}

          {activeTab === 'rewards' && (
            <section>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">Rewards & Points</h3>
                <div className="bg-accent/10 px-4 py-2 rounded-2xl border border-accent/20">
                  <p className="text-xs text-accent font-bold uppercase tracking-wider">Current Balance</p>
                  <p className="text-xl font-bold text-accent">{points.balance} Points</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-secondary-bg p-8 rounded-[2.5rem] border border-white/5">
                  <h4 className="text-xl font-bold mb-6">Redeem Points</h4>
                  <div className="space-y-4">
                    {[
                      { points: 500, discount: 50, label: '50 EGP Discount' },
                      { points: 1000, discount: 100, label: '100 EGP Discount' },
                      { points: 2000, discount: 250, label: '250 EGP Discount' }
                    ].map(reward => (
                      <div key={reward.points} className="flex items-center justify-between p-4 bg-primary-bg rounded-2xl border border-white/5">
                        <div>
                          <p className="font-bold">{reward.label}</p>
                          <p className="text-xs text-text-secondary">{reward.points} Points</p>
                        </div>
                        <Button 
                          variant="accent" 
                          className="px-4 py-2 text-xs"
                          disabled={points.balance < reward.points}
                          onClick={() => {
                            if (confirm(`Redeem ${reward.points} points for a ${reward.discount} EGP voucher?`)) {
                              authService.redeemPoints(reward.points).then(data => {
                                if (data) {
                                  alert(`Success! Your voucher code is: ${data.voucher_code}`);
                                  window.location.reload();
                                }
                              });
                            }
                          }}
                        >
                          Redeem
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-secondary-bg p-8 rounded-[2.5rem] border border-white/5">
                  <h4 className="text-xl font-bold mb-6">How to earn points?</h4>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center shrink-0">
                        <Ticket size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Book Tickets</p>
                        <p className="text-xs text-text-secondary">Earn 1 point for every 10 EGP spent on tickets.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center shrink-0">
                        <Users size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Refer Friends</p>
                        <p className="text-xs text-text-secondary">Earn 50 points when a friend makes their first booking.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xl font-bold mb-6">Points History</h4>
                <div className="bg-secondary-bg rounded-[2.5rem] border border-white/5 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-widest">Description</th>
                        <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-widest">Points</th>
                        <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-widest">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {points.history.length > 0 ? (
                        points.history.map(h => (
                          <tr key={h.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 text-sm">{h.description}</td>
                            <td className={`px-6 py-4 font-bold ${h.type === 'earn' ? 'text-green-400' : 'text-red-400'}`}>
                              {h.type === 'earn' ? '+' : '-'}{h.points}
                            </td>
                            <td className="px-6 py-4 text-xs text-text-secondary">{h.created_at}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-text-secondary">No points history yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'profile' && (
            <section className="max-w-2xl">
              <h3 className="text-2xl font-bold mb-8">Profile Settings</h3>
              <div className="bg-secondary-bg p-8 rounded-[2.5rem] border border-white/5 space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-accent/10 rounded-3xl flex items-center justify-center text-accent">
                    <User size={48} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold">{user?.name}</h4>
                    <p className="text-text-secondary">{user?.email}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-accent/20 text-accent rounded-full text-[10px] font-bold uppercase tracking-wider border border-accent/30">
                      {user?.role} Account
                    </span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Full Name</label>
                    <p className="font-bold">{user?.name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Email Address</label>
                    <p className="font-bold">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Phone Number</label>
                    <p className="font-bold">{user?.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Gender</label>
                    <p className="font-bold">{user?.gender || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Member Since</label>
                    <p className="font-bold">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <Button variant="outline" className="w-full py-4 text-sm">Edit Profile Details</Button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'payments' && (
            <section>
              <h3 className="text-2xl font-bold mb-8">Payment History</h3>
              <div className="bg-secondary-bg rounded-[2.5rem] border border-white/5 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-widest">Order ID</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-widest">Event</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-widest">Amount</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {orders.length > 0 ? (
                      orders.map(order => (
                        <tr key={order.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-mono text-sm">#{order.id}</td>
                          <td className="px-6 py-4 font-bold">{order.event?.title}</td>
                          <td className="px-6 py-4">{order.total_price.toFixed(2)} EGP</td>
                          <td className="px-6 py-4 text-sm text-text-secondary">{order.created_at}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              order.order_status === 'paid' ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'
                            }`}>
                              {order.order_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-text-secondary">No payments yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>

        {/* Viewing Ticket Modal */}
        <AnimatePresence>
          {viewingTicket && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-primary-bg/90 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-secondary-bg w-full max-w-lg rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col"
              >
                {/* Premium Ticket Header */}
                <div className="relative h-32 w-full overflow-hidden">
                  <img 
                    src={(freshOrder || viewingTicket).event?.image_url || 'https://picsum.photos/seed/event/800/400'} 
                    alt="Event" 
                    className="w-full h-full object-cover brightness-50"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/event/800/400';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-secondary-bg to-transparent"></div>
                  <button 
                    onClick={() => setViewingTicket(null)} 
                    className="absolute top-4 right-4 p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition-all z-20"
                  >
                    <X size={18} />
                  </button>
                  <div className="absolute bottom-4 left-6 right-6 z-10">
                    <span className="px-2 py-0.5 bg-accent/20 text-accent rounded-full text-[9px] font-black uppercase tracking-widest border border-accent/30 mb-1 inline-block">
                      {(freshOrder || viewingTicket).items?.[0]?.name || 'Standard Entry'}
                    </span>
                    <h2 className="text-xl font-black text-white leading-tight line-clamp-1">{(freshOrder || viewingTicket).event?.title}</h2>
                  </div>
                </div>

                <div id={`ticket-card-${(freshOrder || viewingTicket).id}`} className="p-6 space-y-6">
                  {/* Event Details Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <p className="text-[9px] text-text-secondary font-black uppercase tracking-widest">Date & Time</p>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Calendar size={12} className="text-accent" />
                        {(freshOrder || viewingTicket).event?.event_date}
                      </p>
                      <p className="text-[10px] text-text-secondary pl-4">
                        {formatEventTime((freshOrder || viewingTicket).event?.event_date || (freshOrder || viewingTicket).event?.date, (freshOrder || viewingTicket).event?.event_time || (freshOrder || viewingTicket).event?.time)}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] text-text-secondary font-black uppercase tracking-widest">Location</p>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <MapPin size={12} className="text-accent" />
                        {(freshOrder || viewingTicket).event?.location}
                      </p>
                      <p className="text-[10px] text-text-secondary pl-4 line-clamp-1">{(freshOrder || viewingTicket).event?.venue}</p>
                    </div>
                  </div>

                  {/* Ticket Holders Section */}
                  <div className="space-y-3">
                    <p className="text-[9px] text-text-secondary font-black uppercase tracking-widest">Ticket Holders</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                      {loadingFullOrder && !(freshOrder || viewingTicket).items ? (
                        <div className="flex justify-center py-4">
                          <RefreshCw className="animate-spin text-accent" size={24} />
                        </div>
                      ) : (freshOrder || viewingTicket).items?.map((item, idx) => (
                        <div key={item.id || idx} className="flex justify-between items-center p-3 bg-primary-bg rounded-2xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center text-accent text-[10px] font-bold">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-xs font-bold">{item.name || 'Ticket Holder'}</p>
                              <p className="text-[10px] text-text-secondary">#{item.id}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${item.is_used ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                            {item.is_used ? 'Used' : 'Valid'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* QR Code Section */}
                  <div className="flex flex-col items-center justify-center py-4 border-t border-dashed border-white/10">
                    {(() => {
                      if (!(freshOrder || viewingTicket).is_paid) {
                        return (
                          <div className="text-center p-6 bg-yellow-500/5 rounded-3xl border border-yellow-500/10 w-full">
                            <Clock size={24} className="mx-auto text-yellow-500 mb-2" />
                            <p className="text-sm font-bold text-yellow-500">
                              {(freshOrder || viewingTicket).displayStatus === 'approved' ? 'Payment Required' : 'Pending Approval'}
                            </p>
                            <p className="text-xs text-text-secondary mt-1">
                              {(freshOrder || viewingTicket).displayStatus === 'approved' ? 'Complete payment to see QR' : 'Approval pending. Reservation expires in 1 hour if not paid/approved.'}
                            </p>
                          </div>
                        );
                      }

                      if (loadingViewingQr) {
                        return (
                          <div className="p-12">
                            <RefreshCw className="animate-spin text-accent" size={32} />
                          </div>
                        );
                      }

                      if (viewingTicketQrStatus?.visible) {
                        return (
                          <div className="flex flex-col items-center gap-4">
                            <div className="bg-white p-4 rounded-[2rem] shadow-2xl shadow-accent/20">
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${viewingTicketQrStatus.qr_data}`} 
                                alt="QR Code" 
                                className="w-40 h-40" 
                              />
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-1">Scan for Entry</p>
                              <p className="text-xs font-bold text-accent">Order ID: #{(freshOrder || viewingTicket).id}</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="text-center p-6 bg-accent/5 rounded-3xl border border-accent/10 w-full">
                          <Clock size={24} className="mx-auto text-accent mb-2" />
                          <p className="text-sm font-bold text-accent">QR Code Locked</p>
                          <p className="text-xs text-text-secondary mt-1">{viewingTicketQrStatus?.reason || 'QR codes appear 1 hour before the event starts.'}</p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 py-4 rounded-2xl text-xs gap-2 border-white/10 hover:bg-white/5" 
                      onClick={() => handleDownloadPDF(freshOrder || viewingTicket)}
                    >
                      <Download size={14} /> Download PDF
                    </Button>
                    
                    {(freshOrder || viewingTicket).is_paid && (
                      <Button 
                        variant="secondary" 
                        className="flex-1 py-4 rounded-2xl text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 border-none" 
                        onClick={() => {
                          const ticketToResell = (freshOrder || viewingTicket).items && (freshOrder || viewingTicket).items.length > 0 ? (freshOrder || viewingTicket).items[0] : null;
                          if (ticketToResell) {
                            setSelectedTicket(ticketToResell);
                            setIsResaleModalOpen(true);
                            setViewingTicket(null);
                          }
                        }}
                      >
                        Resell Ticket
                      </Button>
                    )}

                    {!(freshOrder || viewingTicket).is_paid && (freshOrder || viewingTicket).displayStatus === 'approved' && (
                      <Button 
                        variant="primary" 
                        className="flex-1 py-4 rounded-2xl text-xs shadow-lg shadow-accent/30" 
                        onClick={() => {
                          if (confirm('Proceed to payment? (Simulated)')) {
                            orderService.payOrder((freshOrder || viewingTicket).id).then(data => data && window.location.reload());
                          }
                        }}
                      >
                        Pay Now
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Resale Modal */}
        <AnimatePresence>
          {isResaleModalOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-primary-bg/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-secondary-bg w-full max-w-md rounded-[2.5rem] p-8 border border-white/5 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold">Resell Ticket</h2>
                  <button onClick={() => setIsResaleModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-accent/5 rounded-2xl border border-accent/10">
                    <p className="text-sm text-text-secondary mb-1">Estimated Payout</p>
                    <p className="text-2xl font-bold text-accent">{selectedTicket?.price_each} EGP</p>
                    <p className="text-[10px] text-text-secondary mt-2">Note: Ticket will be placed in resale queue and sold after original tickets are sold out.</p>
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-medium text-text-secondary">Payout Method</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setPayoutMethod('instapay')}
                        className={`p-4 rounded-xl border transition-all text-center ${payoutMethod === 'instapay' ? 'border-accent bg-accent/10 text-white' : 'border-white/10 text-text-secondary hover:bg-white/5'}`}
                      >
                        Instapay
                      </button>
                      <button 
                        onClick={() => setPayoutMethod('vodafone')}
                        className={`p-4 rounded-xl border transition-all text-center ${payoutMethod === 'vodafone' ? 'border-accent bg-accent/10 text-white' : 'border-white/10 text-text-secondary hover:bg-white/5'}`}
                      >
                        Vodafone Cash
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">
                      {payoutMethod === 'instapay' ? 'Instapay Address' : 'Wallet Number'}
                    </label>
                    <input 
                      type="text" 
                      value={payoutAddress}
                      onChange={(e) => setPayoutAddress(e.target.value)}
                      placeholder={payoutMethod === 'instapay' ? 'username@instapay' : '01xxxxxxxxx'}
                      className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors"
                    />
                  </div>

                  <Button className="w-full py-4" onClick={handleResaleRequest}>Submit Resale Request</Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
