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
import { Logo } from './ui/Logo';
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
    <nav className="sticky top-0 z-50 bg-bg-page/80 backdrop-blur-lg border-b border-bg-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24 lg:h-28">
          <Link to="/" className="cursor-pointer group focus:outline-none">
            <Logo iconOnly size="hero" className="transition-transform hover:scale-110" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className={`text-label font-black uppercase tracking-widest transition-all duration-base relative group py-2 ${isActive('/') ? 'text-teal' : 'text-text-muted hover:text-text-primary'}`}>
              Home
              <span className={`absolute bottom-0 left-0 h-0.5 bg-teal transition-all duration-base ${isActive('/') ? 'w-full' : 'w-0 group-hover:w-1/2'}`}></span>
            </Link>
            <Link to="/events" className={`text-label font-black uppercase tracking-widest transition-all duration-base relative group py-2 ${isActive('/events') ? 'text-teal' : 'text-text-muted hover:text-text-primary'}`}>
              Events
              <span className={`absolute bottom-0 left-0 h-0.5 bg-teal transition-all duration-base ${isActive('/events') ? 'w-full' : 'w-0 group-hover:w-1/2'}`}></span>
            </Link>
            <button className="text-label font-black uppercase tracking-widest text-text-muted hover:text-text-primary transition-all duration-base relative group py-2">
              About
              <span className="absolute bottom-0 left-0 h-0.5 bg-teal transition-all duration-base w-0 group-hover:w-1/2"></span>
            </button>
            
            <div className="h-4 w-px bg-bg-border mx-2"></div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-6">
                  {/* Notifications */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                      className="p-2.5 bg-bg-elevated/50 hover:bg-bg-elevated rounded-card border border-bg-border transition-all duration-base relative group active:scale-90 focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:ring-offset-bg-page"
                    >
                      <Bell size={18} className={notifications.some(n => !n.read) ? 'text-teal' : 'text-text-muted'} />
                      {notifications.some(n => !n.read) && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-teal rounded-full border border-bg-page pulse-glow"></span>
                      )}
                    </button>

                    <AnimatePresence>
                      {isNotificationsOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-4 w-80 bg-bg-card rounded-card-xl border border-bg-border shadow-2xl overflow-hidden z-50"
                        >
                          <div className="p-5 border-b border-bg-border flex justify-between items-center bg-bg-elevated/30">
                            <h3 className="text-label font-black uppercase tracking-widest">Notifications</h3>
                            <span className="text-[10px] bg-teal/10 text-teal px-2 py-0.5 rounded-tag font-black border border-teal/20">{notifications.filter(n => !n.read).length} NEW</span>
                          </div>
                          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? (
                              notifications.map(n => (
                                <div 
                                  key={n.id} 
                                  className={`p-4 border-b border-bg-border hover:bg-bg-elevated/50 transition-colors cursor-pointer relative ${!n.read ? 'bg-teal/5' : ''}`}
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
                                  {!n.read && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-teal"></div>}
                                  <div className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-card flex items-center justify-center shrink-0 border ${
                                      n.type === 'payment' ? 'bg-status-success/10 text-status-success border-status-success/20' : 
                                      n.type === 'alert' ? 'bg-status-error/10 text-status-error border-status-error/20' : 'bg-teal/10 text-teal border-teal/20'
                                    }`}>
                                      {n.type === 'payment' ? <CreditCard size={16} /> : n.type === 'alert' ? <AlertCircle size={16} /> : <Bell size={16} />}
                                    </div>
                                    <div className="flex-1 content-stack gap-1">
                                      <p className="text-body-xs font-bold text-text-primary leading-tight">{n.title}</p>
                                      <p className="text-label text-text-muted line-clamp-2 leading-relaxed">{n.message}</p>
                                      <p className="text-[8px] text-text-muted mt-1 font-mono uppercase opacity-60 tracking-wider font-bold">{n.created_at}</p>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-12 text-center content-stack gap-3">
                                <div className="w-12 h-12 bg-bg-elevated rounded-card flex items-center justify-center mx-auto opacity-30">
                                  <Bell size={24} />
                                </div>
                                <p className="text-body-xs text-text-muted">All caught up!</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* User Menu */}
                  <div className="flex items-center gap-4 pl-4 border-l border-bg-border">
                    <div 
                      className="flex items-center gap-3 cursor-pointer group focus:outline-none"
                      onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')}
                    >
                      <div className="w-10 h-10 bg-bg-elevated border border-bg-border rounded-card flex items-center justify-center text-text-muted group-hover:bg-teal group-hover:text-onteal group-hover:border-teal group-hover:shadow-card-glow group-hover:scale-105 group-active:scale-95 transition-all duration-base">
                        <User size={18} />
                      </div>
                      <div className="hidden lg:block content-stack gap-0">
                        <p className="text-body-xs font-bold leading-none text-text-primary group-hover:text-teal transition-colors">{user.name}</p>
                        <p className="text-label text-text-muted font-black uppercase tracking-widest mt-1 opacity-60">ACCOUNT: {user.role}</p>
                      </div>
                    </div>
                    <button onClick={handleLogout} className="p-2.5 text-text-muted hover:text-status-error hover:bg-status-error/10 hover:shadow-card rounded-card transition-all duration-base active:scale-90">
                      <LogOut size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setIsLoginModalOpen(true)}>Login</Button>
                  <Button variant="accent" size="sm" onClick={() => setIsSignupModalOpen(true)}>Sign Up</Button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            {user && (
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 bg-bg-elevated border border-bg-border rounded-card relative"
              >
                <Bell size={18} className={notifications.some(n => !n.read) ? 'text-teal' : 'text-text-muted'} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-teal rounded-full border border-bg-page"></span>
                )}
              </button>
            )}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-text-muted">
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
            className="md:hidden bg-bg-card border-t border-bg-border overflow-hidden"
          >
            <div className="px-4 py-8 content-stack gap-6">
              <div className="content-stack gap-2">
                <button onClick={() => { navigate('/'); setIsMenuOpen(false); }} className="w-full text-left px-5 py-4 rounded-card hover:bg-bg-elevated text-body-base font-bold text-text-primary transition-colors">Home</button>
                <button onClick={() => { navigate('/events'); setIsMenuOpen(false); }} className="w-full text-left px-5 py-4 rounded-card hover:bg-bg-elevated text-body-base font-bold text-text-primary transition-colors">Events</button>
                <button className="w-full text-left px-5 py-4 rounded-card hover:bg-bg-elevated text-body-base font-bold text-text-primary transition-colors">About</button>
              </div>
              
              <div className="pt-6 border-t border-bg-border">
                {user ? (
                  <div className="content-stack gap-3">
                    <button 
                      onClick={() => { navigate(user.role === 'admin' ? '/admin' : '/dashboard'); setIsMenuOpen(false); }}
                      className="w-full flex items-center justify-center gap-3 p-4 rounded-card bg-teal/10 text-teal font-black uppercase tracking-widest text-label border border-teal/20"
                    >
                      <User size={18} /> My Profile
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 p-4 rounded-card text-status-error font-black uppercase tracking-widest text-label transition-colors hover:bg-status-error/5">
                      <LogOut size={18} /> Logout
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="py-4" onClick={() => setIsLoginModalOpen(true)}>Login</Button>
                    <Button variant="accent" className="py-4" onClick={() => setIsSignupModalOpen(true)}>Sign Up</Button>
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
