
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Calendar, 
  Ticket, 
  Users, 
  ArrowLeft, 
  Mail, 
  Search, 
  PlusCircle, 
  Settings, 
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Event, Order, Voucher, ResellRequest } from '../../types';
import { Button } from '../ui/Button';
import { EventsTab } from './EventsTab';
import { OrdersTab } from './OrdersTab';
import { UsersTab } from './UsersTab';
import { VouchersTab } from './VouchersTab';
import { ResaleTab } from './ResaleTab';
import { InvitationsTab } from './InvitationsTab';
import { SettingsTab } from './SettingsTab';
import { QRScannerTab } from './QRScannerTab';
import { VoucherModal } from './VoucherModal';
import { authService } from '../../services/authService';
import { eventService } from '../../services/eventService';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';
import { useEvents } from '../../context/EventsContext';
import { useUI } from '../../context/UIContext';

export const AdminDashboard: React.FC = React.memo(() => {
  const { setEditingEvent, setIsEventModalOpen } = useUI();
  const { user } = useAuth();
  const { events, setEvents, settings, setSettings } = useEvents();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const activeTab = (searchParams.get('tab') || 'events') as 'events' | 'orders' | 'users' | 'vouchers' | 'resale' | 'scanner' | 'settings' | 'invitations';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allVouchers, setAllVouchers] = useState<Voucher[]>([]);
  const [allResellRequests, setAllResellRequests] = useState<ResellRequest[]>([]);
  const [allInvitations, setAllInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await orderService.adminGetOrders();
      if (data && Array.isArray(data)) setAllOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await authService.adminGetUsers();
      if (data && Array.isArray(data)) setAllUsers(data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const data = await authService.adminGetVouchers();
      if (data && Array.isArray(data)) setAllVouchers(data);
    } catch (err) {
      console.error('Failed to fetch vouchers', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResellRequests = async () => {
    setLoading(true);
    try {
      const data = await orderService.adminGetResellRequests();
      if (data && Array.isArray(data)) setAllResellRequests(data);
    } catch (err) {
      console.error('Failed to fetch resell requests', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const data = await orderService.adminGetInvitations();
      if (data && Array.isArray(data)) setAllInvitations(data);
    } catch (err) {
      console.error('Failed to fetch invitations', err);
    } finally {
      setLoading(false);
    }
  };

  const hasFetchedRef = useRef<{ [key: string]: boolean }>({});
  useEffect(() => {
    if (hasFetchedRef.current[activeTab]) return;
    hasFetchedRef.current[activeTab] = true;

    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'vouchers') fetchVouchers();
    if (activeTab === 'resale') fetchResellRequests();
    if (activeTab === 'invitations') fetchInvitations();
  }, [activeTab]);

  const handleUpdateUserRole = async (userId: number, newRole: 'admin' | 'user') => {
    try {
      const data = await authService.adminUpdateUserRole(userId, newRole);
      if (data) {
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      }
    } catch (err) {
      console.error('Failed to update user role', err);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'event' | 'invitation', id: string | number } | null>(null);

  const handleDeleteEvent = async (id: string | number) => {
    try {
      const data = await eventService.adminDeleteEvent(id);
      if (data) {
        setEvents(events.filter(e => e.id !== id));
        setDeleteConfirm(null);
      }
    } catch (err) {
      console.error('Failed to delete event', err);
    }
  };

  const handleDeleteInvitation = async (id: string | number) => {
    try {
      const data = await orderService.adminDeleteInvitation(id as number);
      if (data) {
        fetchInvitations();
        setDeleteConfirm(null);
      }
    } catch (err) {
      alert('Failed to delete invitation');
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <VoucherModal 
        isOpen={isVoucherModalOpen} 
        onClose={() => setIsVoucherModalOpen(false)} 
        onSuccess={fetchVouchers} 
      />
      <div className="flex flex-col md:flex-row gap-12">
        <aside className="w-full md:w-64 space-y-2">
          <button 
            onClick={() => setActiveTab('events')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'events' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-white/5'}`}
          >
            <Calendar size={20} /> Events
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'orders' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-white/5'}`}
          >
            <Ticket size={20} /> Orders
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'users' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:bg-white/5'}`}
          >
            <Users size={20} /> Users
          </button>
          <button 
            onClick={() => setActiveTab('vouchers')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'vouchers' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:bg-white/5'}`}
          >
            <Ticket size={20} /> Vouchers
          </button>
          <button 
            onClick={() => setActiveTab('resale')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'resale' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:bg-white/5'}`}
          >
            <ArrowLeft size={20} /> Resale
          </button>
          <button 
            onClick={() => setActiveTab('invitations')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'invitations' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:bg-white/5'}`}
          >
            <Mail size={20} /> Invitations
          </button>
          <button 
            onClick={() => setActiveTab('scanner')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'scanner' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:bg-white/5'}`}
          >
            <Search size={20} /> QR Scanner
          </button>
          <button onClick={() => setIsEventModalOpen(true)} className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-text-secondary hover:bg-white/5 transition-colors">
            <PlusCircle size={20} /> Create Event
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'settings' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:bg-white/5'}`}
          >
            <Settings size={20} /> Settings
          </button>
        </aside>

        <main className="flex-1 space-y-12">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-text-secondary">
                {activeTab === 'events' && 'Manage your events and track your sales performance.'}
                {activeTab === 'orders' && 'View and manage all ticket orders.'}
                {activeTab === 'users' && 'Manage user roles and permissions.'}
                {activeTab === 'vouchers' && 'Create and manage discount vouchers.'}
                {activeTab === 'resale' && 'Process ticket resale requests and payouts.'}
                {activeTab === 'scanner' && 'Scan ticket QR codes for event entry.'}
                {activeTab === 'invitations' && 'Manage and send event invitations.'}
                {activeTab === 'settings' && 'Configure global application settings.'}
              </p>
            </div>
            {activeTab === 'events' && (
              <Button variant="primary" onClick={() => setIsEventModalOpen(true)}><PlusCircle size={20} /> Create New Event</Button>
            )}
            {activeTab === 'vouchers' && (
              <Button variant="primary" onClick={() => setIsVoucherModalOpen(true)}><PlusCircle size={20} /> Create Voucher</Button>
            )}
          </header>

          {activeTab === 'events' && (
            <EventsTab 
              handleEditEvent={handleEditEvent}
              handleDeleteEvent={(id) => setDeleteConfirm({ type: 'event', id })}
              setIsEventModalOpen={setIsEventModalOpen}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersTab 
              allOrders={allOrders}
              loading={loading}
              fetchOrders={fetchOrders}
            />
          )}

          {activeTab === 'users' && (
            <UsersTab 
              allUsers={allUsers}
              loading={loading}
              handleUpdateUserRole={handleUpdateUserRole}
            />
          )}

          {activeTab === 'vouchers' && (
            <VouchersTab 
              allVouchers={allVouchers}
              loading={loading}
              setIsVoucherModalOpen={setIsVoucherModalOpen}
            />
          )}

          {activeTab === 'resale' && (
            <ResaleTab 
              allResellRequests={allResellRequests}
              loading={loading}
              fetchResellRequests={fetchResellRequests}
            />
          )}

          {activeTab === 'invitations' && (
            <InvitationsTab 
              allInvitations={allInvitations}
              loading={loading}
              setIsInvitationModalOpen={setIsInvitationModalOpen}
              isInvitationModalOpen={isInvitationModalOpen}
              fetchInvitations={fetchInvitations}
              setDeleteConfirm={setDeleteConfirm}
            />
          )}

          {activeTab === 'scanner' && (
            <QRScannerTab />
          )}

          {activeTab === 'settings' && (
            <SettingsTab />
          )}
        </main>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirm && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-primary-bg/90 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-secondary-bg w-full max-w-sm rounded-[2.5rem] p-8 border border-white/10 shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2">Are you sure?</h3>
                <p className="text-text-secondary mb-8">
                  This action cannot be undone. Are you sure you want to delete this {deleteConfirm.type}?
                </p>
                <div className="flex gap-4">
                  <Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                  <Button 
                    variant="primary" 
                    className="flex-1 bg-red-500 hover:bg-red-600 border-none" 
                    onClick={() => {
                      if (deleteConfirm.type === 'event') handleDeleteEvent(deleteConfirm.id);
                      else handleDeleteInvitation(deleteConfirm.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
