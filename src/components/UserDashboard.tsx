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
  Users,
  History,
  AlertCircle,
  CheckCircle,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/Button';
import { 
  Order, 
  PointsHistory, 
  OrderTicket
} from '../types';
import { authService } from '../services/authService';
import { orderService } from '../services/orderService';
import { eventService } from '../services/eventService';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { handleDownloadPDF } from '../lib/ticketUtils';
import { TicketCard } from './tickets';
import { useQRStatus, useTicketQRStatus } from '../hooks/useQRStatus';
import { useOrder } from '../hooks/useOrder';
import { formatEventTime } from '../lib/utils';
import { formatDateTime, formatDate } from '../lib/dateFormat';
import { PasswordChecklist } from './ui/PasswordChecklist';

export const UserDashboard = () => {
  const navigate = useNavigate();
  const { user, accessToken, refreshToken, login: updateSession, logout: handleLogout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const startEditing = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditGender(user?.gender || '');
    setEditError('');
    setEditSuccess('');
    setIsEditingProfile(false); // To clear any previous state
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setEditLoading(true);
    setEditError('');
    setEditSuccess('');

    try {
      const updatedUser = await authService.updateProfile(user.id, {
        name: editName,
        phone: editPhone,
        gender: editGender
      });
      
      if (updatedUser) {
        updateSession({
          user: { ...user, ...updatedUser },
          accessToken: accessToken!,
          refreshToken: refreshToken!
        });
        setEditSuccess('Profile details updated successfully.');
        setIsEditingProfile(false);
      }
    } catch (err: any) {
      setEditError(err.message || 'Failed to update profile details.');
    } finally {
      setEditLoading(false);
    }
  };

  // Logged-in password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeSuccess, setChangeSuccess] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setChangeError('Password does not satisfy all security requirements.');
      return;
    }
    setChangeLoading(true);
    setChangeError('');
    setChangeSuccess(false);

    try {
      const data = await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword: confirmNewPassword
      });
      setChangeSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      
      if (data && data.accessToken && data.user) {
        // Update session in the context to keep user logged in on this client
        updateSession({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken
        });
      }
    } catch (err: any) {
      setChangeError(err.message || 'Failed to change password.');
    } finally {
      setChangeLoading(false);
    }
  };

  const [points, setPoints] = useState({ balance: 0, history: [] as PointsHistory[] });
  
  // Account Deletion states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  const handleDeleteRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteLoading(true);
    setDeleteError('');
    setDeleteSuccess('');

    try {
      const res = await authService.requestAccountDeletion(deletePassword);
      setDeleteSuccess(res.message || 'A verification link has been sent to your email. Please check your inbox within 15 minutes.');
      setDeletePassword('');
      setDeleteReason('');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to request account deletion.');
    } finally {
      setDeleteLoading(false);
    }
  };
  const [isResaleModalOpen, setIsResaleModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<OrderTicket | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<'instapay' | 'vodafone'>('instapay');
  const [payoutAddress, setPayoutAddress] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'tickets' | 'rewards' | 'profile' | 'payments' | 'dashboard'>('dashboard');
  const [ticketFilter, setTicketFilter] = useState<'all' | 'pending' | 'paid' | 'invited'>('all');
  const [viewingTicket, setViewingTicket] = useState<Order | null>(null);
  const [viewingTicketInstance, setViewingTicketInstance] = useState<any | null>(null);
  const [exportingOrder, setExportingOrder] = useState<Order | null>(null);

  // --- TICKET TRANSFER SYSTEM STATES (PHASE 2) ---
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [transferHistory, setTransferHistory] = useState<any[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [ticketToTransfer, setTicketToTransfer] = useState<any | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');
  
  // URL token claim flow
  const [claimingToken, setClaimingToken] = useState<string | null>(null);
  const [claimingStatus, setClaimingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [claimingMessage, setClaimingMessage] = useState('');

  
      // Phase 3.2.4: Use single source of truth for the viewing ticket
  const { order: freshOrder, loading: loadingFullOrder } = useOrder(viewingTicket?.public_id || undefined);

  // QR status for export logic removed in favor of server-side Puppeteer migration
  // const { qrStatus: exportingQrStatus, loading: loadingExportingQr } = useQRStatus(...)
  
  // PDF Export
  const handleExport = (order: any) => {
    handleDownloadPDF(order);
  };

  const { 
    qrStatus: viewingTicketQrStatus, 
    loading: loadingViewingQr 
  } = useQRStatus(
    viewingTicket?.public_id || undefined, 
    viewingTicket?.is_paid === true
  );

  const {
    qrStatus: viewingTicketInstanceQrStatus,
    loading: loadingViewingTicketInstanceQr
  } = useTicketQRStatus(
    viewingTicketInstance?.public_id || undefined,
    viewingTicketInstance ? (viewingTicketInstance.status !== 'PENDING') : false
  );

  const fetchTransfers = async () => {
    try {
      const [pending, history] = await Promise.all([
        orderService.getPendingTransfers().catch(() => []),
        orderService.getTransferHistory().catch(() => [])
      ]);
      setPendingTransfers(pending || []);
      setTransferHistory(history || []);
    } catch (err) {
      console.error('Failed to fetch transfers:', err);
    }
  };

  const refreshDashboardData = async () => {
    setLoading(true);
    try {
      const [ordersData, ticketsData, pointsData] = await Promise.all([
        orderService.getOrders(),
        orderService.getTickets().catch(err => {
          console.error('Failed to fetch ticket instances:', err);
          return [];
        }),
        authService.getUserPoints()
      ]);
      if (ordersData && Array.isArray(ordersData)) {
        const normalizedOrders = ordersData.map((o: any) => ({
          ...o,
          displayStatus: o.is_paid ? 'paid' : o.order_status
        }));
        setOrders(normalizedOrders);
      }
      if (ticketsData && Array.isArray(ticketsData)) {
        setTickets(ticketsData);
      }
      if (pointsData) setPoints(pointsData);
      await fetchTransfers();
    } catch (err: any) {
      if (err.status !== 401) {
        console.error('Failed to fetch dashboard data', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboardData();

    // Check for transferToken in URL query params (email redirection claim flow)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('transferToken');
    if (token) {
      setClaimingToken(token);
      setClaimingStatus('idle');
      setClaimingMessage('A ticket transfer invite has been detected. Would you like to claim this ticket and add it to your account?');
      // Clean up URL query parameter cleanly
      const newUrl = window.location.pathname + (window.location.hash || '');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // --- TICKET TRANSFER SYSTEM HANDLERS ---
  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketToTransfer || !recipientEmail) return;
    setTransferLoading(true);
    setTransferError('');
    setTransferSuccess('');
    try {
      await orderService.transferTicket(ticketToTransfer.public_id, recipientEmail);
      setTransferSuccess('Transfer request created! The recipient has been emailed. They have 24 hours to accept.');
      setRecipientEmail('');
      setTimeout(() => {
        setIsTransferModalOpen(false);
        setTicketToTransfer(null);
        setTransferSuccess('');
      }, 3000);
      refreshDashboardData();
    } catch (err: any) {
      setTransferError(err.message || 'Failed to initiate ticket transfer.');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleClaimTokenAccept = async () => {
    if (!claimingToken) return;
    setClaimingStatus('loading');
    setClaimingMessage('Claiming ticket transfer...');
    try {
      await orderService.acceptTransfer({ token: claimingToken });
      setClaimingStatus('success');
      setClaimingMessage('Success! The ticket has been added to your dashboard.');
      setTimeout(() => {
        setClaimingToken(null);
        setClaimingStatus('idle');
      }, 3000);
      refreshDashboardData();
    } catch (err: any) {
      setClaimingStatus('error');
      setClaimingMessage(err.message || 'Failed to claim ticket transfer.');
    }
  };

  const handleAcceptTransferId = async (transferId: number) => {
    try {
      await orderService.acceptTransfer({ transferId });
      alert('Transfer accepted successfully!');
      refreshDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to accept transfer.');
    }
  };

  const handleDeclineTransferId = async (transferId: number) => {
    if (!confirm('Are you sure you want to decline this ticket transfer?')) return;
    try {
      await orderService.declineTransfer({ transferId });
      alert('Transfer declined successfully!');
      refreshDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to decline transfer.');
    }
  };

  const handleCancelTransferId = async (transferId: number) => {
    if (!confirm('Are you sure you want to cancel this transfer request?')) return;
    try {
      await orderService.cancelTransfer(transferId);
      alert('Transfer request cancelled successfully.');
      refreshDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel transfer.');
    }
  };

  const filteredTickets = useMemo(() => {
    const ticketsList = Array.isArray(tickets) ? tickets : [];
    const ordersList = Array.isArray(orders) ? orders : [];

    // Map individual tickets as 'ticket' type items
    const ticketItems = ticketsList.map(t => ({
      ...t,
      type: 'ticket' as const,
      displayStatus: t.status === 'CHECKED_IN' ? 'scanned' : 'paid',
      event: t.order?.event
    }));

    // Map ONLY unpaid/pending orders (so we don't duplicate paid orders with individual tickets)
    const unpaidOrderItems = ordersList
      .filter(o => !o.is_paid && o.order_status !== 'paid')
      .map(o => ({
        ...o,
        type: 'order' as const,
        displayStatus: o.order_status
      }));

    const allItems = [...ticketItems, ...unpaidOrderItems];

    if (ticketFilter === 'all') return allItems;
    if (ticketFilter === 'paid') return allItems.filter(item => item.type === 'ticket');
    if (ticketFilter === 'pending') return allItems.filter(item => item.type === 'order' && (item.displayStatus === 'approved' || item.displayStatus === 'pending'));
    if (ticketFilter === 'invited') return allItems.filter(item => item.type === 'order' && item.displayStatus === 'invited');

    return allItems;
  }, [tickets, orders, ticketFilter]);

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
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        <aside className="w-full md:w-64">
          <div className="content-stack gap-2 bg-bg-card border border-bg-border rounded-card-lg p-2 sticky top-24">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-card font-bold transition-all duration-base group active:scale-95 ${activeTab === 'dashboard' ? 'bg-teal text-onteal shadow-card-glow' : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary'}`}
            >
              <LayoutDashboard size={20} className="group-hover:scale-110 transition-transform" /> <span className="text-body-sm">Dashboard</span>
            </button>
            <button 
              onClick={() => setActiveTab('tickets')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-card font-bold transition-all duration-base group active:scale-95 ${activeTab === 'tickets' ? 'bg-teal text-onteal shadow-card-glow' : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary'}`}
            >
              <Ticket size={20} className="group-hover:scale-110 transition-transform" /> <span className="text-body-sm">My Tickets</span>
            </button>
            <button 
              onClick={() => setActiveTab('rewards')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-card font-bold transition-all duration-base group active:scale-95 ${activeTab === 'rewards' ? 'bg-teal text-onteal shadow-card-glow' : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary'}`}
            >
              <Star size={20} className="group-hover:scale-110 transition-transform" /> <span className="text-body-sm">Rewards</span>
            </button>
            <button 
              onClick={() => setActiveTab('payments')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-card font-bold transition-all duration-base group active:scale-95 ${activeTab === 'payments' ? 'bg-teal text-onteal shadow-card-glow' : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary'}`}
            >
              <CreditCard size={20} className="group-hover:scale-110 transition-transform" /> <span className="text-body-sm">Payments</span>
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-card font-bold transition-all duration-base group active:scale-95 ${activeTab === 'profile' ? 'bg-teal text-onteal shadow-card-glow' : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary'}`}
            >
              <User size={20} className="group-hover:scale-110 transition-transform" /> <span className="text-body-sm">Profile</span>
            </button>
            <div className="pt-4 mt-2 border-t border-bg-border">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-6 py-4 rounded-card text-status-error hover:bg-status-error/10 transition-all duration-base">
                <LogOut size={20} /> <span className="text-body-sm font-bold">Logout</span>
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 layout-stack">
          {activeTab === 'dashboard' && (
            <div className="layout-stack">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="content-stack gap-2">
                  <h1 className="text-h2">Welcome back, {user?.name.split(' ')[0]}!</h1>
                  <p className="text-body-base text-text-muted">You have {orders.length} orders in your history.</p>
                </div>
                <div className="flex items-center gap-4 bg-bg-card p-5 rounded-card-xl border border-bg-border shadow-card">
                  <div className="w-12 h-12 bg-teal/10 text-teal rounded-card flex items-center justify-center">
                    <Star size={24} fill="currentColor" />
                  </div>
                  <div className="content-stack gap-1">
                    <p className="text-label text-text-muted">Points Balance</p>
                    <p className="text-h4">{points.balance} <span className="text-body-xs font-normal text-text-muted">pts</span></p>
                  </div>
                  <Button variant="outline" size="sm" className="ml-4" onClick={() => setActiveTab('rewards')}>Redeem</Button>
                </div>
              </header>

              <section className="content-stack gap-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-h3">Recent Tickets</h3>
                  <button onClick={() => setActiveTab('tickets')} className="text-teal text-label font-bold hover:underline transition-all">View All</button>
                </div>
                {loading ? (
                  <div className="text-center py-20 bg-bg-card rounded-card border border-bg-border animate-pulse">
                    <div className="w-10 h-10 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-muted font-medium">Loading your tickets...</p>
                  </div>
                ) : orders.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-6">
                    {orders.slice(0, 2).map(order => (
                      <div key={order.id} className="bg-bg-card rounded-card-lg border border-bg-border overflow-hidden flex flex-col hover:bg-bg-elevated hover:border-teal/30 hover:shadow-card-glow transition-all duration-base group active:scale-[0.98] cursor-pointer" onClick={() => setViewingTicket(order)}>
                        <div className="flex h-36">
                          <div className="w-36 shrink-0 overflow-hidden">
                            <img 
                              src={order.event?.image_url} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-slow" 
                              alt="Event" 
                            />
                          </div>
                          <div className="p-5 flex-1 content-stack gap-2">
                            <h4 className="text-h4 line-clamp-1 group-hover:text-teal transition-colors">{order.event?.title}</h4>
                            <div className="content-stack gap-1">
                              <p className="text-label text-teal font-bold">{formatDate(order.event?.event_date)}</p>
                              <p className="text-body-xs text-text-muted line-clamp-1">{order.event?.location}</p>
                            </div>
                            <div className="mt-auto">
                              <span className={`px-2 py-0.5 rounded-tag text-label font-bold uppercase ${
                                order.order_status === 'paid' ? 'bg-status-success/10 text-status-success border border-status-success/20 shadow-status-success/5' : 'bg-status-warning/10 text-status-warning border border-status-warning/20'
                              }`}>
                                {order.order_status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="p-5 pt-0 flex justify-between items-center border-t border-bg-border mt-auto h-16 bg-bg-elevated/20 group-hover:bg-bg-elevated transition-colors">
                          <div className="content-stack gap-0">
                            <p className="text-label text-text-muted">Order #{order.public_id?.split('-')[0] || order.id}</p>
                            <p className="text-body-sm text-text-primary font-black uppercase tracking-tight">{order.total_price.toFixed(2)} EGP</p>
                          </div>
                          <Button variant="outline" size="sm">Details</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-bg-card rounded-card-xl border-2 border-dashed border-bg-border content-stack gap-6">
                    <div className="w-20 h-20 bg-bg-elevated rounded-card flex items-center justify-center mx-auto text-text-muted/20">
                      <Ticket size={40} />
                    </div>
                    <div className="content-stack gap-2">
                      <h4 className="text-h3">No Active Bookings</h4>
                      <p className="text-body-base text-text-muted max-w-xs mx-auto">Your upcoming adventure starts here. Secure your first ticket today.</p>
                    </div>
                    <Button variant="accent" className="mx-auto px-10" onClick={() => navigate('/events')}>Browse Live Events</Button>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'tickets' && (
            <div className="layout-stack">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <h3 className="text-h2">My Tickets</h3>
                <div className="flex bg-bg-card p-1 rounded-pill border border-bg-border overflow-x-auto no-scrollbar shadow-card">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'paid', label: 'Paid' },
                    { id: 'invited', label: 'Invited' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setTicketFilter(tab.id as any)}
                      className={`px-5 py-2 rounded-pill text-label font-bold transition-all whitespace-nowrap ${ticketFilter === tab.id ? 'bg-bg-elevated text-teal border border-teal-border-faint' : 'text-text-muted hover:text-text-primary'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Pending Transfers Container */}
              {pendingTransfers.length > 0 && (
                <div className="bg-bg-card border border-bg-border rounded-card-xl p-6 content-stack gap-4 shadow-card mb-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-teal">
                    <Users size={18} />
                    <h4 className="text-body-sm font-bold uppercase tracking-wider">Pending Ticket Transfers</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingTransfers.map((t: any) => {
                      const isIncoming = t.recipient_email?.toLowerCase() === user?.email?.toLowerCase();
                      return (
                        <div key={t.id} className="p-5 bg-bg-page border border-bg-border rounded-card flex flex-col justify-between gap-4 hover:border-bg-border-hover transition-colors">
                          <div className="content-stack gap-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded w-fit border ${isIncoming ? 'bg-teal/10 text-teal border-teal/20' : 'bg-status-info/10 text-status-info border-status-info/20'}`}>
                              {isIncoming ? 'Incoming Transfer' : 'Outgoing Transfer'}
                            </span>
                            <p className="text-body-sm font-bold text-text-primary mt-1">
                              {t.ticket?.ticket_type?.name || 'Entry Pass'}
                            </p>
                            <p className="text-body-xs text-text-muted">
                              for <strong className="text-text-primary font-medium">{t.ticket?.order?.event?.title || 'Event'}</strong>
                            </p>
                            <p className="text-body-xs text-text-muted mt-1">
                              {isIncoming ? `From: ${t.sender?.name || 'Sender'} (${t.sender?.email})` : `To: ${t.recipient_email}`}
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            {isIncoming ? (
                              <>
                                <button
                                  onClick={() => handleAcceptTransferId(t.id)}
                                  className="flex-1 py-2 bg-teal hover:bg-teal/80 text-onteal text-body-xs font-bold rounded-pill transition-all active:scale-95 cursor-pointer"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleDeclineTransferId(t.id)}
                                  className="flex-1 py-2 bg-transparent hover:bg-status-error/10 text-status-error border border-status-error/20 text-body-xs font-bold rounded-pill transition-all active:scale-95 cursor-pointer"
                                >
                                  Decline
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleCancelTransferId(t.id)}
                                className="flex-1 py-2 bg-transparent hover:bg-status-error/10 text-status-error border border-status-error/20 text-body-xs font-bold rounded-pill transition-all active:scale-95 cursor-pointer"
                              >
                                Cancel Request
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredTickets.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredTickets.map((item: any) => (
                    <div key={item.type === 'ticket' ? `t-${item.id}` : `o-${item.id}`} className="bg-bg-card rounded-card-xl border border-bg-border overflow-hidden flex flex-col hover:bg-bg-elevated transition-colors duration-base group">
                      <div className="flex h-36">
                        <div className="w-36 shrink-0 overflow-hidden">
                          <img 
                            src={item.event?.image_url} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow" 
                            alt="Event" 
                          />
                        </div>
                        <div className="p-5 flex-1 content-stack gap-2">
                          <h4 className="text-h4 line-clamp-1">{item.event?.title}</h4>
                          <div className="content-stack gap-1">
                            <p className="text-label text-teal font-bold">{formatDate(item.event?.event_date)}</p>
                            <p className="text-body-xs text-text-muted line-clamp-1">{item.event?.location}</p>
                          </div>
                          <div className="mt-auto">
                            <span className={`px-2 py-0.5 rounded-tag text-label font-bold uppercase border ${
                              item.type === 'ticket' ? (
                                item.status === 'CHECKED_IN' ? 'bg-status-info/10 text-status-info border-status-info/20' :
                                item.status === 'TRANSFER_PENDING' ? 'bg-status-warning/10 text-status-warning border-status-warning/20 font-bold' :
                                'bg-status-success/10 text-status-success border-status-success/20'
                              ) :
                              item.displayStatus === 'approved' ? 'bg-status-info/10 text-status-info border-status-info/20' : 
                              item.displayStatus === 'rejected' ? 'bg-status-error/10 text-status-error border-status-error/20' :
                              item.displayStatus === 'pre_registered' ? 'bg-bg-elevated text-text-muted border-bg-border' :
                              item.displayStatus === 'invited' ? 'bg-teal/10 text-teal border-teal-border-faint' :
                              'bg-status-warning/10 text-status-warning border-status-warning/20'
                            }`}>
                              {item.type === 'ticket' ? (
                                 item.status === 'CHECKED_IN' ? 'Checked In' :
                                 item.status === 'TRANSFER_PENDING' ? 'Transfer Pending' :
                                 'Paid'
                               ) :
                               item.displayStatus === 'approved' ? 'Awaiting Payment' : 
                               item.displayStatus === 'pre_registered' ? 'Pre-Registered' :
                               item.displayStatus === 'invited' ? 'Invited' :
                               item.displayStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-5 pt-0 flex justify-between items-center border-t border-bg-border mt-auto h-20">
                        <div className="content-stack gap-0">
                          <p className="text-label text-text-muted">{item.type === 'ticket' ? `Ticket #${item.public_id}` : `Order #${item.public_id?.split('-')[0] || item.id}`}</p>
                          <p className="text-body-sm font-bold text-text-primary">
                            {item.type === 'ticket' ? `${item.attendee_name || item.owner?.name || 'Attendee'} (${item.ticket_type?.name})` : `${item.total_price ? item.total_price.toFixed(2) : 'TBA'} EGP`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {item.type === 'ticket' ? (
                            <Button variant="outline" size="sm" onClick={() => setViewingTicketInstance(item)}>View</Button>
                          ) : (
                            <>
                              <Button variant="outline" size="sm" onClick={() => setViewingTicket(item)}>View</Button>
                              {item.order_status === 'approved' && (
                                <Button 
                                  variant="accent" 
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Proceed to payment? (Simulated)')) {
                                      orderService.payOrder(item.public_id).then(data => data && window.location.reload());
                                    }
                                  }}
                                >
                                  Pay Now
                                </Button>
                              )}
                              {item.order_status === 'invited' && (
                                <div className="flex gap-2">
                                  <Button 
                                    variant="accent" 
                                    size="sm"
                                    onClick={() => {
                                      if (confirm('Accept this invitation?')) {
                                        orderService.payOrder(item.public_id).then(data => data && window.location.reload());
                                      }
                                    }}
                                  >
                                    Accept
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-status-error hover:bg-status-error/10"
                                    onClick={() => {
                                      if (confirm('Reject this invitation?')) {
                                        orderService.rejectInvitation(item.public_id).then(data => data && window.location.reload());
                                      }
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                              {item.order_status === 'pending' && (
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-label text-status-warning font-black uppercase tracking-widest">Awaiting approval</span>
                                  <span className="text-label text-text-muted flex items-center gap-1 opacity-60">
                                    <Clock size={10} /> 1H window
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-32 bg-bg-card rounded-card-2xl border-2 border-dashed border-bg-border content-stack gap-8">
                  <div className="w-24 h-24 bg-bg-elevated rounded-card flex items-center justify-center mx-auto text-text-muted/10">
                    <History size={48} />
                  </div>
                  <div className="content-stack gap-3">
                    <h3 className="text-h3">No Tickets Found</h3>
                    <p className="text-body-base text-text-muted max-w-sm mx-auto">
                      {ticketFilter === 'all' 
                        ? "You haven't secured any memberships yet. Your future experiences will appear here." 
                        : `You have no tickets currently marked as ${ticketFilter.replace('_', ' ')}.`}
                    </p>
                  </div>
                  {ticketFilter !== 'all' ? (
                    <Button variant="outline" size="sm" className="mx-auto px-8" onClick={() => setTicketFilter('all')}>View All Inventory</Button>
                  ) : (
                    <Button variant="accent" className="mx-auto px-10" onClick={() => navigate('/events')}>Explore Events Hub</Button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'rewards' && (
            <div className="layout-stack gap-8">
              <header className="flex items-center justify-between">
                <h3 className="text-h2">Rewards & Points</h3>
                  <div className="bg-bg-card px-6 py-4 rounded-card-lg border border-teal-border-faint shadow-card hover:shadow-card-glow transition-all duration-slow">
                    <p className="text-label text-text-muted uppercase tracking-widest mb-1">Current Balance</p>
                    <p className="text-h2 text-teal animate-pulse-glow">{points.balance} <span className="text-body-sm font-normal text-text-muted">pts</span></p>
                  </div>
              </header>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-bg-card p-8 rounded-card-xl border border-bg-border content-stack gap-6">
                  <h4 className="text-h4">Redeem Points</h4>
                  <div className="space-y-4">
                    {[
                      { points: 500, discount: 50, label: '50 EGP Discount' },
                      { points: 1000, discount: 100, label: '100 EGP Discount' },
                      { points: 2000, discount: 250, label: '250 EGP Discount' }
                    ].map(reward => (
                      <div key={reward.points} className="flex items-center justify-between p-5 bg-bg-page rounded-card border border-bg-border hover:border-teal-border-faint transition-colors duration-base">
                        <div className="content-stack gap-1">
                          <p className="text-body-base font-bold">{reward.label}</p>
                          <p className="text-body-xs text-text-muted">{reward.points} Points required</p>
                        </div>
                        <Button 
                          variant="accent" 
                          size="sm"
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

                <div className="bg-bg-card p-8 rounded-card-xl border border-bg-border content-stack gap-8">
                  <h4 className="text-h4">How to earn points?</h4>
                  <div className="space-y-6">
                    <div className="flex gap-5">
                      <div className="w-12 h-12 bg-teal/10 text-teal rounded-card flex items-center justify-center shrink-0">
                        <Ticket size={24} />
                      </div>
                      <div className="content-stack gap-1">
                        <p className="text-body-base font-bold">Book Tickets</p>
                        <p className="text-body-sm text-text-muted">Earn 1 point for every 10 EGP spent on tickets. Automatic addition.</p>
                      </div>
                    </div>
                    <div className="flex gap-5">
                      <div className="w-12 h-12 bg-teal/10 text-teal rounded-card flex items-center justify-center shrink-0">
                        <Users size={24} />
                      </div>
                      <div className="content-stack gap-1">
                        <p className="text-body-base font-bold">Refer Friends</p>
                        <p className="text-body-sm text-text-muted">Earn 50 points when a friend makes their first booking using your link.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="content-stack gap-6">
                <h4 className="text-h4">Points History</h4>
                <div className="bg-bg-card rounded-card-xl border border-bg-border overflow-hidden shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-bg-border bg-bg-elevated/50">
                          <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Description</th>
                          <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest text-center">Points</th>
                          <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bg-border">
                        {points.history.length > 0 ? (
                          points.history.map(h => (
                            <tr key={h.id} className="hover:bg-bg-elevated transition-all duration-base group">
                              <td className="px-6 py-5 text-body-sm font-medium group-hover:text-teal transition-colors">{h.description}</td>
                              <td className={`px-6 py-5 text-center font-mono font-bold ${h.type === 'earn' ? 'text-status-success' : 'text-status-error'}`}>
                                {h.type === 'earn' ? '+' : '-'}{h.points}
                              </td>
                              <td className="px-6 py-5 text-body-xs text-text-muted text-right italic">{formatDateTime(h.created_at)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-10 py-24 text-center">
                              <div className="content-stack items-center gap-4">
                                <div className="w-16 h-16 bg-bg-elevated rounded-card flex items-center justify-center text-text-muted/20">
                                  <Star size={32} />
                                </div>
                                <div className="content-stack gap-1">
                                  <p className="text-body-base font-bold text-text-muted">No Movement Yet</p>
                                  <p className="text-body-xs text-text-muted opacity-60">Earn your first points by attending curated events.</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="layout-stack max-w-3xl">
              <h3 className="text-h2">Profile Settings</h3>
              <div className="bg-bg-card p-8 rounded-card-xl border border-bg-border shadow-card content-stack gap-10">
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className="w-32 h-32 bg-bg-elevated border-2 border-bg-border rounded-card-lg flex items-center justify-center text-teal shadow-inner group overflow-hidden relative">
                    <User size={64} className="group-hover:scale-110 transition-transform duration-slow" />
                    <div className="absolute inset-0 bg-teal/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="content-stack gap-2 text-center sm:text-left">
                    <h4 className="text-h3">{user?.name}</h4>
                    <p className="text-body-base text-text-muted">{user?.email}</p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                       <span className="px-3 py-1 bg-teal/10 text-teal rounded-pill text-label font-bold uppercase tracking-wider border border-teal-border-faint">
                        {user?.role} Account
                      </span>
                    </div>
                  </div>
                </div>

                {isEditingProfile ? (
                  <form onSubmit={handleSaveProfile} className="content-stack gap-6 w-full">
                    {editError && (
                      <div className="bg-status-error/10 border border-status-error/20 text-status-error p-4 rounded-card flex items-center gap-3 text-body-sm font-medium">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{editError}</span>
                      </div>
                    )}
                    
                    <div className="grid sm:grid-cols-2 gap-6 pt-4">
                      <div className="content-stack gap-2">
                        <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Full Name</label>
                        <input 
                          type="text" 
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Your Name"
                          className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 px-5 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all"
                        />
                      </div>
                      <div className="content-stack gap-2">
                        <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Email Address (Read Only)</label>
                        <input 
                          type="email" 
                          disabled
                          value={user?.email || ''}
                          className="w-full bg-bg-elevated/40 border border-bg-border rounded-card py-4 px-5 text-body-base text-text-muted cursor-not-allowed"
                        />
                      </div>
                      <div className="content-stack gap-2">
                        <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Phone Number</label>
                        <input 
                          type="text" 
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="e.g. +201000000000"
                          className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 px-5 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all"
                        />
                      </div>
                      <div className="content-stack gap-2">
                        <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Gender</label>
                        <div className="relative">
                          <select
                            value={editGender}
                            onChange={(e) => setEditGender(e.target.value)}
                            className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 px-5 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all appearance-none"
                          >
                            <option value="">Not specified</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-bg-border">
                      <Button 
                        type="submit" 
                        variant="accent" 
                        className="px-10 py-4 uppercase font-black tracking-widest text-button"
                        disabled={editLoading}
                      >
                        {editLoading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsEditingProfile(false)}
                        className="px-10 py-4 uppercase font-black tracking-widest text-button"
                        disabled={editLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    {editSuccess && (
                      <div className="bg-teal/10 border border-teal/20 text-teal p-4 rounded-card flex items-center gap-3 text-body-sm font-medium w-full">
                        <CheckCircle size={14} className="shrink-0 animate-bounce" />
                        <span>{editSuccess}</span>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-8 pt-8 border-t border-bg-border w-full">
                      <div className="content-stack gap-1.5">
                        <label className="text-label font-bold text-text-muted uppercase tracking-widest">Full Name</label>
                        <p className="text-body-base font-bold text-text-primary">{user?.name}</p>
                      </div>
                      <div className="content-stack gap-1.5">
                        <label className="text-label font-bold text-text-muted uppercase tracking-widest">Email Address</label>
                        <p className="text-body-base font-bold text-text-primary">{user?.email}</p>
                      </div>
                      <div className="content-stack gap-1.5">
                        <label className="text-label font-bold text-text-muted uppercase tracking-widest">Phone Number</label>
                        <p className="text-body-base font-bold text-text-primary">{user?.phone || 'Not provided'}</p>
                      </div>
                      <div className="content-stack gap-1.5">
                        <label className="text-label font-bold text-text-muted uppercase tracking-widest">Gender</label>
                        <p className="text-body-base font-bold text-text-primary">{user?.gender || 'Not specified'}</p>
                      </div>
                      <div className="content-stack gap-1.5 sm:col-span-2">
                        <label className="text-label font-bold text-text-muted uppercase tracking-widest">Member Since</label>
                        <p className="text-body-base font-bold text-text-primary">{user?.created_at ? formatDate(user.created_at) : 'N/A'}</p>
                      </div>
                    </div>

                    <div className="pt-6 w-full">
                      <Button 
                        variant="outline" 
                        onClick={startEditing}
                        className="w-full sm:w-auto px-10"
                      >
                        Edit Profile Details
                      </Button>
                    </div>
                  </>
                )}

                <div className="pt-8 border-t border-bg-border content-stack gap-6">
                  <div>
                    <h4 className="text-h4 mb-1">Update Security</h4>
                    <p className="text-body-xs text-text-muted">Change your account password. Note: This will invalidate all other active sessions for safety.</p>
                  </div>
                  
                  <form onSubmit={handleChangePassword} className="content-stack gap-5 max-w-md">
                    {changeSuccess && (
                      <div className="bg-teal/10 border border-teal/20 text-teal p-4 rounded-card flex items-center gap-3 text-body-sm font-medium">
                        <CheckCircle size={14} className="shrink-0 animate-bounce" />
                        <span>Password updated successfully. Other active sessions have been securely signed out.</span>
                      </div>
                    )}
                    
                    {changeError && (
                      <div className="bg-status-error/10 border border-status-error/20 text-status-error p-4 rounded-card flex items-center gap-3 text-body-sm font-medium">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{changeError}</span>
                      </div>
                    )}

                    <div className="content-stack gap-2">
                      <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Current Password</label>
                      <input 
                        type="password" 
                        required
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          if (changeError) setChangeError('');
                        }}
                        placeholder="••••••••"
                        className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 px-5 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all placeholder:text-text-muted/40"
                      />
                    </div>

                    <div className="content-stack gap-2">
                      <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">New Password</label>
                      <input 
                        type="password" 
                        required
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (changeError) setChangeError('');
                        }}
                        placeholder="••••••••"
                        className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 px-5 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all placeholder:text-text-muted/40"
                      />
                    </div>

                    <div className="content-stack gap-2">
                      <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Confirm New Password</label>
                      <input 
                        type="password" 
                        required
                        value={confirmNewPassword}
                        onChange={(e) => {
                          setConfirmNewPassword(e.target.value);
                          if (changeError) setChangeError('');
                        }}
                        placeholder="••••••••"
                        className="w-full bg-bg-elevated border border-bg-border rounded-card py-4 px-5 text-body-base text-text-primary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all placeholder:text-text-muted/40"
                      />
                    </div>

                    {/* Password complexity checklist */}
                    <PasswordChecklist 
                      password={newPassword} 
                      confirmPassword={confirmNewPassword} 
                      onValidationChange={setIsPasswordValid} 
                    />

                    <Button 
                      type="submit" 
                      variant="accent"
                      className="w-full py-4 text-button font-black uppercase tracking-widest"
                      disabled={changeLoading || !isPasswordValid}
                    >
                      {changeLoading ? 'Updating Security...' : 'Update Password'}
                    </Button>
                  </form>
                </div>

                {/* Danger Zone */}
                <div className="pt-8 border-t border-status-error/20 content-stack gap-6">
                  <div>
                    <h4 className="text-h4 text-status-error mb-1">Danger Zone</h4>
                    <p className="text-body-xs text-text-muted">Permanently delete your account and de-authorize all services. This is an irreversible, high-risk action.</p>
                  </div>

                  <div className="bg-status-error/5 border border-status-error/10 p-6 rounded-card content-stack gap-4">
                    <p className="text-body-sm text-text-primary font-medium">To proceed with account deletion, we require that you satisfy all pre-deletion check requirements:</p>
                    <ul className="text-body-xs text-text-muted list-disc pl-5 space-y-1">
                      <li>You must not hold active/future tickets or orders for upcoming events.</li>
                      <li>You must not have any active resale listings in progress.</li>
                      <li>You must not have any unfinished or active reservation/payment sessions.</li>
                      <li>You must not have pending event invitations.</li>
                    </ul>
                    
                    <div className="pt-2">
                      <Button 
                        type="button" 
                        variant="ghost"
                        className="text-status-error hover:bg-status-error/10 border border-status-error/20 px-6 py-3 font-bold text-label"
                        onClick={() => {
                          setDeletePassword('');
                          setDeleteReason('');
                          setDeleteError('');
                          setDeleteSuccess('');
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 size={16} className="mr-2 inline" /> Delete account
                      </Button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="layout-stack">
              <h3 className="text-h2">Payment History</h3>
              <div className="bg-bg-card rounded-card-xl border border-bg-border overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans">
                    <thead>
                      <tr className="border-b border-bg-border bg-bg-elevated/50">
                        <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Order ID</th>
                        <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Event</th>
                        <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Amount</th>
                        <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bg-border">
                      {orders.length > 0 ? (
                        orders.map(order => (
                          <tr key={order.id} className="hover:bg-bg-elevated/50 transition-colors duration-base">
                            <td className="px-6 py-5 font-mono text-body-xs text-text-muted tracking-tighter">#{order.public_id?.split('-')[0] || order.id}</td>
                            <td className="px-6 py-5 text-body-sm font-bold text-text-primary">{order.event?.title}</td>
                            <td className="px-6 py-5 text-body-sm font-bold text-teal">{order.total_price.toFixed(2)} <span className="text-body-xs font-normal opacity-60">EGP</span></td>
                            <td className="px-6 py-5 text-body-xs text-text-muted">{formatDateTime(order.created_at)}</td>
                            <td className="px-6 py-5">
                              <span className={`px-2 py-0.5 rounded-tag text-label font-bold uppercase border ${
                                order.order_status === 'paid' ? 'bg-status-success/10 text-status-success border-status-success/20' : 'bg-status-warning/10 text-status-warning border-status-warning/20'
                              }`}>
                                {order.order_status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-10 py-32 text-center">
                            <div className="content-stack items-center gap-6">
                              <div className="w-20 h-20 bg-bg-elevated rounded-card flex items-center justify-center text-text-muted/10 relative">
                                <CreditCard size={40} />
                                <div className="absolute inset-0 border-4 border-bg-border rounded-card border-dashed"></div>
                              </div>
                              <div className="content-stack gap-2">
                                <h4 className="text-h4 text-text-muted">No Transaction Records</h4>
                                <p className="text-body-xs text-text-muted max-w-[200px]">Complete your first booking to initialize your ledger.</p>
                              </div>
                              <Button variant="outline" size="sm" className="px-8 border-bg-border" onClick={() => navigate('/events')}>Explore Events</Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Viewing Ticket Modal */}
        <AnimatePresence>
          {viewingTicket && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-bg-page/90 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-bg-card w-full max-w-lg rounded-card-2xl overflow-hidden border border-bg-border shadow-2xl flex flex-col"
              >
                {/* Premium Ticket Header */}
                <div className="relative h-40 w-full overflow-hidden">
                  <img 
                    src={(freshOrder || viewingTicket).event?.image_url} 
                    alt="Event" 
                    className="w-full h-full object-cover brightness-50"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-card to-transparent"></div>
                  <button 
                    onClick={() => setViewingTicket(null)} 
                    className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-black/60 rounded-pill text-text-primary backdrop-blur-md transition-all z-20"
                  >
                    <X size={20} />
                  </button>
                  <div className="absolute bottom-6 left-8 right-8 z-10 content-stack gap-1">
                    <span className="px-2.5 py-0.5 bg-teal/20 text-teal rounded-tag text-label font-black uppercase tracking-widest border border-teal/30 w-fit">
                      {(freshOrder || viewingTicket).items?.[0]?.name || 'Standard Entry'}
                    </span>
                    <h2 className="text-h3 text-text-primary leading-tight line-clamp-1">{(freshOrder || viewingTicket).event?.title}</h2>
                  </div>
                </div>

                <div className="p-8 content-stack gap-8">
                  <TicketCard 
                    order={freshOrder || viewingTicket}
                    qrData={viewingTicketQrStatus?.qr_data}
                    qrVisible={viewingTicketQrStatus?.visible}
                    qrReason={viewingTicketQrStatus?.reason}
                    loadingQr={loadingViewingQr}
                  />

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 py-6 rounded-card text-label gap-2 font-bold" 
                      onClick={() => handleExport(freshOrder || viewingTicket)}
                    >
                      <Download size={16} /> PDF Ticket
                    </Button>
                    
                    {(freshOrder || viewingTicket).is_paid && (() => {
                      const orderData = freshOrder || viewingTicket;
                      const ticketInstance = orderData.ticket_instances?.[0];
                      if (!ticketInstance) return null;

                      const statusUpper = ticketInstance.status?.toUpperCase();

                      if (statusUpper === 'TRANSFER_PENDING') {
                        const associatedTransfer = pendingTransfers.find(
                          (t: any) => t.ticket_id === ticketInstance.id && t.status === 'PENDING'
                        );
                        return associatedTransfer ? (
                          <Button
                            variant="ghost"
                            className="flex-1 py-6 rounded-card text-label font-bold text-status-error hover:bg-status-error/10"
                            onClick={() => {
                              handleCancelTransferId(associatedTransfer.id);
                              setViewingTicket(null);
                            }}
                          >
                            Cancel Transfer
                          </Button>
                        ) : null;
                      }

                      if (statusUpper === 'VALID' || statusUpper === 'PENDING') {
                        return (
                          <Button
                            variant="accent"
                            className="flex-1 py-6 rounded-card text-label font-bold text-onteal bg-teal hover:bg-teal/80"
                            onClick={() => {
                              setTicketToTransfer(ticketInstance);
                              setIsTransferModalOpen(true);
                              setViewingTicket(null);
                            }}
                          >
                            Transfer Ticket
                          </Button>
                        );
                      }

                      return null;
                    })()}

                    {(freshOrder || viewingTicket).is_paid && (
                      <Button 
                        variant="ghost" 
                        className="flex-1 py-6 rounded-card text-label font-bold text-status-error hover:bg-status-error/10"
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
                        variant="accent" 
                        className="flex-1 py-6 rounded-card text-label font-bold shadow-card-glow"
                        onClick={() => {
                          if (confirm('Proceed to payment? (Simulated)')) {
                            orderService.payOrder((freshOrder || viewingTicket).public_id).then(data => data && window.location.reload());
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

        {/* Viewing Ticket Instance Modal */}
        <AnimatePresence>
          {viewingTicketInstance && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-bg-page/90 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-bg-card w-full max-w-lg rounded-card-2xl overflow-hidden border border-bg-border shadow-2xl flex flex-col"
              >
                {/* Premium Ticket Header */}
                <div className="relative h-40 w-full overflow-hidden">
                  <img 
                    src={viewingTicketInstance.order?.event?.image_url} 
                    alt="Event" 
                    className="w-full h-full object-cover brightness-50"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-card to-transparent"></div>
                  <button 
                    onClick={() => setViewingTicketInstance(null)} 
                    className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-black/60 rounded-pill text-text-primary backdrop-blur-md transition-all z-20"
                  >
                    <X size={20} />
                  </button>
                  <div className="absolute bottom-6 left-8 right-8 z-10 content-stack gap-1">
                    <span className="px-2.5 py-0.5 bg-teal/20 text-teal rounded-tag text-label font-black uppercase tracking-widest border border-teal/30 w-fit">
                      {viewingTicketInstance.ticket_type?.name || 'Standard Entry'}
                    </span>
                    <h2 className="text-h3 text-text-primary leading-tight line-clamp-1">{viewingTicketInstance.order?.event?.title}</h2>
                  </div>
                </div>

                <div className="p-8 content-stack gap-8">
                  <TicketCard 
                    ticket={viewingTicketInstance}
                    qrData={viewingTicketInstanceQrStatus?.qr_data}
                    qrVisible={viewingTicketInstanceQrStatus?.visible}
                    qrReason={viewingTicketInstanceQrStatus?.reason}
                    loadingQr={loadingViewingTicketInstanceQr}
                  />

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 py-6 rounded-card text-label gap-2 font-bold" 
                      onClick={() => handleExport(viewingTicketInstance)}
                    >
                      <Download size={16} /> PDF Ticket
                    </Button>

                    {viewingTicketInstance.status === 'TRANSFER_PENDING' ? (
                      (() => {
                        const associatedTransfer = pendingTransfers.find(
                          (t: any) => t.ticket_id === viewingTicketInstance.id && t.status === 'PENDING'
                        );
                        return associatedTransfer ? (
                          <Button
                            variant="ghost"
                            className="flex-1 py-6 rounded-card text-label font-bold text-status-error hover:bg-status-error/10"
                            onClick={() => {
                              handleCancelTransferId(associatedTransfer.id);
                              setViewingTicketInstance(null);
                            }}
                          >
                            Cancel Transfer
                          </Button>
                        ) : null;
                      })()
                    ) : (viewingTicketInstance.status === 'VALID' || viewingTicketInstance.status === 'PENDING') ? (
                      <Button
                        variant="accent"
                        className="flex-1 py-6 rounded-card text-label font-bold text-onteal bg-teal hover:bg-teal/80"
                        onClick={() => {
                          setTicketToTransfer(viewingTicketInstance);
                          setIsTransferModalOpen(true);
                          setViewingTicketInstance(null);
                        }}
                      >
                        Transfer Ticket
                      </Button>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Resale Modal */}
        <AnimatePresence>
          {isResaleModalOpen && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-bg-page/80 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-bg-card w-full max-w-md rounded-card-2xl p-10 border border-bg-border shadow-2xl content-stack gap-8"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-h2">Resell Ticket</h2>
                  <button 
                    onClick={() => setIsResaleModalOpen(false)} 
                    className="p-2 hover:bg-bg-elevated rounded-pill transition-colors text-text-primary"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="content-stack gap-8">
                  <div className="p-6 bg-teal/5 rounded-card border border-teal-border-faint content-stack gap-2">
                    <p className="text-label text-text-muted uppercase tracking-widest font-black">Estimated Payout</p>
                    <p className="text-h2 text-teal font-mono">{selectedTicket?.price_each} <span className="text-body-sm font-sans font-normal text-text-muted">EGP</span></p>
                    <p className="text-body-xs text-text-muted mt-2 border-t border-teal/10 pt-2 italic">Note: Payout occurs after original tickets sell out.</p>
                  </div>

                  <div className="content-stack gap-4">
                    <label className="text-label text-text-muted uppercase tracking-widest font-black">Payout Method</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setPayoutMethod('instapay')}
                        className={`p-5 rounded-card border-2 transition-all duration-base text-center content-stack gap-1 ${payoutMethod === 'instapay' ? 'border-teal bg-teal/5 text-teal shadow-card' : 'border-bg-border text-text-muted hover:border-text-muted/30 hover:bg-bg-elevated'}`}
                      >
                        <span className="text-body-sm font-bold">Instapay</span>
                      </button>
                      <button 
                        onClick={() => setPayoutMethod('vodafone')}
                        className={`p-5 rounded-card border-2 transition-all duration-base text-center content-stack gap-1 ${payoutMethod === 'vodafone' ? 'border-teal bg-teal/5 text-teal shadow-card' : 'border-bg-border text-text-muted hover:border-text-muted/30 hover:bg-bg-elevated'}`}
                      >
                        <span className="text-body-sm font-bold">Vodafone Cash</span>
                      </button>
                    </div>
                  </div>

                  <div className="content-stack gap-3">
                    <label className="text-label text-text-muted uppercase tracking-widest font-black">
                      {payoutMethod === 'instapay' ? 'Instapay Address' : 'Wallet Number'}
                    </label>
                    <input 
                      type="text" 
                      value={payoutAddress}
                      onChange={(e) => setPayoutAddress(e.target.value)}
                      placeholder={payoutMethod === 'instapay' ? 'username@instapay' : '01xxxxxxxxx'}
                      className="w-full bg-bg-page border border-bg-border rounded-card px-6 py-4 focus:ring-2 focus:ring-teal/20 focus:border-teal outline-none transition-all text-body-base text-text-primary text-center font-bold tracking-wide"
                    />
                  </div>

                  <Button className="w-full py-6 rounded-card text-label font-black uppercase tracking-widest" onClick={handleResaleRequest}>
                    Submit Request
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Account Deletion Confirmation Modal */}
        <AnimatePresence>
          {isDeleteModalOpen && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-bg-page/80 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-bg-card w-full max-w-md rounded-card-2xl p-10 border border-bg-border shadow-2xl content-stack gap-8"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-h2 text-status-error flex items-center gap-2">
                    <Trash2 size={24} /> Delete Account
                  </h2>
                  <button 
                    onClick={() => {
                      if (!deleteLoading) setIsDeleteModalOpen(false);
                    }} 
                    className="p-2 hover:bg-bg-elevated rounded-pill transition-colors text-text-primary"
                    disabled={deleteLoading}
                  >
                    <X size={24} />
                  </button>
                </div>

                {deleteSuccess ? (
                  <div className="content-stack gap-6 text-center">
                    <div className="w-16 h-16 bg-status-success/10 text-status-success rounded-pill flex items-center justify-center mx-auto">
                      <CheckCircle size={32} />
                    </div>
                    <div className="content-stack gap-2">
                      <h4 className="text-h3 text-status-success">Request Authorized</h4>
                      <p className="text-body-sm text-text-muted">
                        We have sent an authorization email to your registered address:
                      </p>
                      <p className="font-bold text-text-primary text-body-sm bg-bg-elevated py-2 rounded-card border border-bg-border select-all">
                        {user?.email}
                      </p>
                      <p className="text-body-xs text-text-muted mt-2">
                        To permanently delete your account, click the link inside the email within the next <strong>15 minutes</strong>. If you don't receive it shortly, please verify your spam folder.
                      </p>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      variant="outline" 
                      onClick={() => setIsDeleteModalOpen(false)}
                    >
                      Close Window
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleDeleteRequestSubmit} className="content-stack gap-6">
                    <p className="text-body-sm text-text-muted">
                      This is a permanent, high-risk security action. Enter your current password and optionally state your reason for deletion below to send the one-time authorization link.
                    </p>

                    {deleteError && (
                      <div className="bg-status-error/10 border border-status-error/20 text-status-error p-4 rounded-card flex items-start gap-3 text-body-xs font-medium leading-normal">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{deleteError}</span>
                      </div>
                    )}

                    <div className="content-stack gap-2">
                      <label className="text-label text-text-muted uppercase tracking-widest font-black ml-1">Current Password</label>
                      <input 
                        type="password" 
                        required
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-bg-page border border-bg-border rounded-card px-5 py-4 focus:ring-2 focus:ring-status-error/10 focus:border-status-error outline-none transition-all text-body-base text-text-primary"
                        disabled={deleteLoading}
                      />
                    </div>

                    <div className="content-stack gap-2">
                      <label className="text-label text-text-muted uppercase tracking-widest font-black ml-1">Reason for leaving (Optional)</label>
                      <textarea
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        placeholder="e.g. No longer planning to attend events"
                        rows={3}
                        className="w-full bg-bg-page border border-bg-border rounded-card px-5 py-4 focus:ring-2 focus:ring-status-error/10 focus:border-status-error outline-none transition-all text-body-sm text-text-primary resize-none"
                        disabled={deleteLoading}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <Button 
                        type="submit" 
                        variant="ghost" 
                        className="py-5 text-status-error hover:bg-status-error/10 border border-status-error/20 rounded-card font-black uppercase tracking-widest text-button"
                        disabled={deleteLoading || !deletePassword}
                      >
                        {deleteLoading ? 'Processing...' : 'Confirm'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="py-5 rounded-card font-black uppercase tracking-widest text-button border-bg-border text-text-primary"
                        onClick={() => setIsDeleteModalOpen(false)}
                        disabled={deleteLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Ticket Transfer Initiation Modal */}
        <AnimatePresence>
          {isTransferModalOpen && ticketToTransfer && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-bg-page/80 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-bg-card w-full max-w-md rounded-card-2xl p-10 border border-bg-border shadow-2xl content-stack gap-8"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-h2">Transfer Ticket</h2>
                  <button 
                    onClick={() => {
                      setIsTransferModalOpen(false);
                      setTicketToTransfer(null);
                      setTransferError('');
                      setTransferSuccess('');
                    }} 
                    className="p-2 hover:bg-bg-elevated rounded-pill transition-colors text-text-primary"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="content-stack gap-4">
                  <div className="p-4 bg-teal/5 rounded-card border border-teal-border-faint content-stack gap-1">
                    <p className="text-body-xs text-text-muted uppercase tracking-wider font-bold">Ticket Details</p>
                    <p className="text-body-sm font-bold text-text-primary">{ticketToTransfer.order?.event?.title || 'Event'}</p>
                    <p className="text-body-xs text-teal font-mono">{ticketToTransfer.ticket_type?.name || 'Ticket'}</p>
                    <p className="text-body-xs text-text-muted">Public ID: {ticketToTransfer.public_id}</p>
                  </div>

                  <form onSubmit={handleInitiateTransfer} className="content-stack gap-6 mt-2">
                    {transferError && (
                      <div className="bg-status-error/10 border border-status-error/20 text-status-error p-4 rounded-card flex items-start gap-3 text-body-xs font-medium leading-normal">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{transferError}</span>
                      </div>
                    )}

                    {transferSuccess && (
                      <div className="bg-status-success/10 border border-status-success/20 text-status-success p-4 rounded-card flex items-start gap-3 text-body-xs font-medium leading-normal">
                        <CheckCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{transferSuccess}</span>
                      </div>
                    )}

                    <div className="content-stack gap-2">
                      <label className="text-label text-text-muted uppercase tracking-widest font-black ml-1">Recipient Email Address</label>
                      <input 
                        type="email" 
                        required
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="recipient@example.com"
                        className="w-full bg-bg-page border border-bg-border rounded-card px-5 py-4 focus:ring-2 focus:ring-teal/10 focus:border-teal outline-none transition-all text-body-base text-text-primary"
                        disabled={transferLoading || transferSuccess !== ''}
                      />
                      <p className="text-body-xs text-text-muted mt-1 leading-relaxed">
                        The recipient will receive an email invitation to claim this ticket. They will have 24 hours to accept before the transfer expires.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <Button 
                        type="submit" 
                        variant="accent" 
                        className="py-5 rounded-card font-black uppercase tracking-widest text-button shadow-card-glow"
                        disabled={transferLoading || !recipientEmail || transferSuccess !== ''}
                      >
                        {transferLoading ? 'Sending...' : 'Send Transfer'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="py-5 rounded-card font-black uppercase tracking-widest text-button border-bg-border text-text-primary"
                        onClick={() => {
                          setIsTransferModalOpen(false);
                          setTicketToTransfer(null);
                          setTransferError('');
                          setTransferSuccess('');
                        }}
                        disabled={transferLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Ticket Claim/Redeem from Email Link Modal */}
        <AnimatePresence>
          {claimingToken && (
            <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-bg-page/90 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-bg-card w-full max-w-md rounded-card-2xl p-10 border border-bg-border shadow-2xl content-stack gap-8 text-center"
              >
                <div className="flex justify-between items-center border-b border-bg-border pb-4">
                  <h2 className="text-h2 flex items-center gap-2 text-teal">
                    <Ticket size={24} /> Claim Ticket Transfer
                  </h2>
                  {claimingStatus !== 'loading' && (
                    <button 
                      onClick={() => setClaimingToken(null)} 
                      className="p-2 hover:bg-bg-elevated rounded-pill transition-colors text-text-primary"
                    >
                      <X size={24} />
                    </button>
                  )}
                </div>

                <div className="content-stack gap-6 py-4">
                  {claimingStatus === 'loading' && (
                    <div className="flex flex-col items-center gap-4">
                      <RefreshCw size={48} className="animate-spin text-teal" />
                      <p className="text-body-sm font-bold text-text-primary">{claimingMessage}</p>
                    </div>
                  )}

                  {claimingStatus === 'success' && (
                    <div className="flex flex-col items-center gap-4">
                      <CheckCircle size={48} className="text-status-success" />
                      <p className="text-body-sm font-bold text-status-success">{claimingMessage}</p>
                      <p className="text-body-xs text-text-muted">The page will refresh and the ticket will appear in your "My Tickets" section.</p>
                    </div>
                  )}

                  {claimingStatus === 'error' && (
                    <div className="flex flex-col items-center gap-4">
                      <AlertCircle size={48} className="text-status-error" />
                      <p className="text-body-sm font-bold text-status-error">{claimingMessage}</p>
                      <Button 
                        variant="outline" 
                        className="mt-2 border-bg-border"
                        onClick={() => setClaimingToken(null)}
                      >
                        Close
                      </Button>
                    </div>
                  )}

                  {claimingStatus === 'idle' && (
                    <div className="content-stack gap-6">
                      <p className="text-body-sm text-text-primary leading-relaxed">{claimingMessage}</p>
                      <div className="flex gap-4">
                        <Button 
                          variant="accent" 
                          className="flex-1 py-5 font-bold shadow-card-glow"
                          onClick={handleClaimTokenAccept}
                        >
                          Confirm & Accept Ticket
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 py-5 border-bg-border"
                          onClick={() => setClaimingToken(null)}
                        >
                          Decline / Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
