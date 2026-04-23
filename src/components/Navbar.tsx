import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Ticket, 
  Menu, 
  X, 
  Bell, 
  User, 
  LogOut, 
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/Button';
import { UserProfile, Event, Notification as AppNotification } from '../types';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';
import { useUI } from '../context/UIContext';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    setIsLoginModalOpen, 
    setIsSignupModalOpen, 
    isNotificationsOpen, 
    setIsNotificationsOpen, 
    setSelectedEvent 
  } = useUI();
  const { user, logout: handleLogout, notifications: authNotifications, markNotificationRead } = useAuth();
  const notifications = Array.isArray(authNotifications) ? authNotifications : [];
  const { events } = useEvents();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-primary-bg/80 backdrop-blur-lg border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(108,92,231,0.4)]">
              <Ticket className="text-white" size={24} />
            </div>
            <span className="text-2xl font-display font-bold tracking-tight">TicketsHub</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className={`text-sm font-bold transition-colors ${isActive('/') ? 'text-accent' : 'text-text-secondary hover:text-white'}`}>Home</Link>
            <Link to="/events" className={`text-sm font-bold transition-colors ${isActive('/events') ? 'text-accent' : 'text-text-secondary hover:text-white'}`}>Events</Link>
            <button className="text-sm font-bold text-text-secondary hover:text-white transition-colors">About</button>
            
            <div className="h-6 w-px bg-white/10 mx-2"></div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-6">
                  {/* Notifications */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                      className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all relative group"
                    >
                      <Bell size={20} className={notifications.some(n => !n.read) ? 'text-accent' : 'text-text-secondary'} />
                      {notifications.some(n => !n.read) && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-accent rounded-full border-2 border-primary-bg animate-pulse"></span>
                      )}
                    </button>

                    <AnimatePresence>
                      {isNotificationsOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-4 w-80 bg-secondary-bg rounded-3xl border border-white/10 shadow-2xl overflow-hidden z-50"
                        >
                          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h3 className="font-black text-sm uppercase tracking-widest">Notifications</h3>
                            <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold">{notifications.filter(n => !n.read).length} New</span>
                          </div>
                          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? (
                              notifications.map(n => (
                                <div 
                                  key={n.id} 
                                  className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer relative ${!n.read ? 'bg-accent/5' : ''}`}
                                  onClick={() => {
                                    markNotificationRead(n.id);
                                    if (n.event_id) {
                                      const event = events.find(e => e.id === n.event_id);
                                      if (event) {
                                        setSelectedEvent(event);
                                        navigate(`/events/${event.id}`);
                                      }
                                    }
                                    setIsNotificationsOpen(false);
                                  }}
                                >
                                  {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent"></div>}
                                  <div className="flex gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                      n.type === 'payment' ? 'bg-green-500/10 text-green-500' : 
                                      n.type === 'alert' ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'
                                    }`}>
                                      {n.type === 'payment' ? <CreditCard size={14} /> : n.type === 'alert' ? <AlertCircle size={14} /> : <Bell size={14} />}
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-xs font-bold mb-1">{n.title}</p>
                                      <p className="text-[10px] text-text-secondary line-clamp-2 leading-relaxed mb-2">{n.message}</p>
                                      <p className="text-[8px] text-text-secondary/50 font-medium">{n.created_at}</p>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-10 text-center">
                                <Bell size={32} className="mx-auto text-text-secondary/20 mb-3" />
                                <p className="text-xs text-text-secondary">All caught up!</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* User Menu */}
                  <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                    <div 
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')}
                    >
                      <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-300">
                        <User size={20} />
                      </div>
                      <div className="hidden lg:block">
                        <p className="text-xs font-bold leading-none mb-1">{user.name}</p>
                        <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">{user.role}</p>
                      </div>
                    </div>
                    <button onClick={handleLogout} className="p-2.5 text-text-secondary hover:text-red-400 transition-colors">
                      <LogOut size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={() => setIsLoginModalOpen(true)}>Login</Button>
                  <Button variant="primary" onClick={() => setIsSignupModalOpen(true)}>Sign Up</Button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            {user && (
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 bg-white/5 rounded-lg relative"
              >
                <Bell size={20} className={notifications.some(n => !n.read) ? 'text-accent' : 'text-text-secondary'} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full border-2 border-primary-bg"></span>
                )}
              </button>
            )}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-text-secondary">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-secondary-bg border-t border-white/5 overflow-hidden"
          >
            <div className="px-4 py-8 space-y-6">
              <div className="space-y-2">
                <button onClick={() => { navigate('/'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 font-bold">Home</button>
                <button onClick={() => { navigate('/events'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 font-bold">Events</button>
                <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 font-bold">About</button>
              </div>
              
              <div className="pt-6 border-t border-white/5">
                {user ? (
                  <div className="space-y-2">
                    <button 
                      onClick={() => { navigate(user.role === 'admin' ? '/admin' : '/dashboard'); setIsMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/10 text-accent font-bold"
                    >
                      <User size={20} /> My Profile
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 font-bold">
                      <LogOut size={20} /> Logout
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" onClick={() => setIsLoginModalOpen(true)}>Login</Button>
                    <Button variant="primary" onClick={() => setIsSignupModalOpen(true)}>Sign Up</Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
