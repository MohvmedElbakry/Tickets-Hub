/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Search, 
  Calendar, 
  MapPin, 
  ChevronRight, 
  Filter, 
  User, 
  Ticket, 
  LayoutDashboard, 
  PlusCircle, 
  TrendingUp, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Download, 
  CheckCircle2,
  CreditCard,
  ArrowLeft,
  Star,
  Clock,
  Lock,
  Info,
  Facebook,
  Twitter,
  Instagram,
  Mail,
  Plus,
  Trash2,
  AlertCircle,
  RefreshCw,
  Bell,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- API Configuration ---
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : window.location.origin;

console.log('API_BASE_URL:', API_BASE_URL);
console.log('[API DEBUG] Current Hostname:', window.location.hostname);
console.log('[API DEBUG] Base URL:', API_BASE_URL);
console.log('[API DEBUG] Origin:', window.location.origin);

// --- Types ---

type View = 'home' | 'events' | 'details' | 'checkout' | 'confirmation' | 'user-dashboard' | 'admin-dashboard' | 'payment-success' | 'payment-failure' | 'payment-pending';

type PaymentState = 'idle' | 'verifying' | 'success' | 'failed' | 'pending';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'organizer' | 'admin';
  created_at: string;
  age?: number;
  birthdate?: string;
  points?: number;
  instagram_username?: string;
}

interface TicketType {
  id?: string | number;
  event_id?: string | number;
  name: string;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  description: string;
  sale_start: string;
  sale_end: string;
}

interface Order {
  id: number;
  user_id: number;
  event_id: number;
  total_price: number;
  order_status: 'pending' | 'paid' | 'cancelled' | 'requested' | 'approved' | 'rejected' | 'expired' | 'invited';
  created_at: string;
  items?: OrderTicket[];
  event?: Event;
  user?: { name: string, email: string, age?: number, phone?: string };
  instagram_username?: string;
  phone?: string;
  age?: number;
  birthdate?: string;
  payment_deadline?: string;
  qr_code_token?: string | null;
}

interface OrderTicket {
  id: number;
  order_id: number;
  ticket_type_id: number;
  quantity: number;
  price_each: number;
  name?: string;
  is_used?: boolean;
  scanned_count?: number;
  status?: 'active' | 'reselling' | 'resold';
}

interface Event {
  id?: string | number;
  title: string;
  description: string;
  location: string;
  venue: string;
  event_date: string;
  event_time: string;
  organizer_id?: string | number;
  image_url: string;
  status: 'draft' | 'published' | 'upcoming' | 'live' | 'closed';
  created_at?: string;
  ticket_types?: TicketType[];
  show_qr_codes?: boolean;
  pre_registration_count?: number;
  // For backward compatibility with mock data and UI
  date?: string;
  time?: string;
  price?: number;
  image?: string;
  category?: string;
  organizer?: string;
  capacity?: number;
  sold?: number;
  company_name?: string;
  rules?: string;
  google_maps_url?: string;
  qr_enabled_manual?: boolean;
}

interface PreRegistration {
  id: number;
  user_id: number;
  event_id: number;
  created_at: string;
  event?: Event;
}

interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  event_id?: number;
  type: string;
  read: boolean;
  created_at: string;
}

interface AppConfig {
  service_fee_percent?: number;
}

interface Voucher {
  id: number;
  code: string;
  discount_percent: number;
  max_uses: number;
  current_uses: number;
  expiration_date: string;
  status: 'active' | 'expired' | 'redeemed';
  created_by_type: 'admin' | 'points';
  created_by_id: number;
  creatorName?: string;
}

interface PointsHistory {
  id: number;
  user_id: number;
  points: number;
  type: 'earn' | 'redeem';
  description: string;
  created_at: string;
}

interface ResellRequest {
  id: number;
  user_id: number;
  order_ticket_id: number;
  payout_method: 'instapay' | 'vodafone';
  payout_address: string;
  amount: number;
  status: 'pending' | 'resold' | 'paid';
  created_at: string;
  userName?: string;
  paid_at?: string;
}

// --- Components ---

const COUNTRY_CODES = [
  { name: 'Egypt', code: '+20', flag: '🇪🇬' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'Kuwait', code: '+965', flag: '🇰🇼' },
  { name: 'Qatar', code: '+974', flag: '🇶🇦' },
  { name: 'Bahrain', code: '+973', flag: '🇧🇭' },
  { name: 'Oman', code: '+968', flag: '🇴🇲' },
  { name: 'Jordan', code: '+962', flag: '🇯🇴' },
  { name: 'Lebanon', code: '+961', flag: '🇱🇧' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'Italy', code: '+39', flag: '🇮🇹' },
  { name: 'Spain', code: '+34', flag: '🇪🇸' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'Netherlands', code: '+31', flag: '🇳🇱' },
  { name: 'Switzerland', code: '+41', flag: '🇨🇭' },
  { name: 'Turkey', code: '+90', flag: '🇹🇷' },
].sort((a, b) => a.name.localeCompare(b.name));

const CountryCodeSelector: React.FC<{
  value: string;
  onChange: (code: string) => void;
  className?: string;
}> = ({ value, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const filteredCodes = COUNTRY_CODES.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.code.includes(search)
  );

  const selectedCountry = COUNTRY_CODES.find(c => c.code === value) || COUNTRY_CODES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-primary-bg border border-white/10 rounded-xl px-3 py-3 focus:border-accent outline-none transition-colors text-sm h-full min-w-[100px]"
      >
        <span>{selectedCountry.flag}</span>
        <span>{value}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 mt-2 w-64 bg-secondary-bg border border-white/10 rounded-2xl shadow-2xl z-[150] overflow-hidden"
          >
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                <input
                  type="text"
                  placeholder="Search country..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-primary-bg border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-accent"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {filteredCodes.map((c, i) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    onChange(c.code);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-white/5 transition-colors ${value === c.code ? 'bg-accent/10 text-accent' : 'text-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                  </div>
                  <span className="text-text-secondary text-xs">{c.code}</span>
                </button>
              ))}
              {filteredCodes.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-text-secondary italic">No countries found</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const calculateAge = (birthdate?: string) => {
  if (!birthdate) return 'N/A';
  const today = new Date();
  const birthDate = new Date(birthdate);
  if (isNaN(birthDate.getTime())) return 'N/A';
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const Button: React.FC<{ 
  children: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost', 
  className?: string,
  onClick?: () => void,
  disabled?: boolean,
  type?: 'button' | 'submit' | 'reset'
}> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  onClick,
  disabled = false,
  type = 'button'
}) => {
  const baseStyles = "px-6 py-3 rounded-full font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-accent text-white hover:bg-accent/90 hover:shadow-[0_0_20px_rgba(108,92,231,0.5)] active:scale-95",
    secondary: "bg-secondary-bg text-white hover:bg-white/10",
    outline: "border border-accent text-accent hover:bg-accent hover:text-white",
    ghost: "text-text-secondary hover:text-white hover:bg-white/5"
  };

  return (
    <button 
      type={type}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const EventCard: React.FC<{ event: Event, onClick: () => void }> = React.memo(({ event, onClick }) => {
  const imageUrl = event.image_url || event.image || 'https://picsum.photos/seed/event/800/600';
  const displayDate = event.event_date || event.date || 'TBA';
  const displayPrice = event.ticket_types && event.ticket_types.length > 0 
    ? Math.min(...event.ticket_types.map(t => t.price)) 
    : (event.price || 0);

  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className="bg-secondary-bg rounded-2xl overflow-hidden group cursor-pointer border border-white/5 hover:border-accent/30 transition-colors"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={imageUrl} 
          alt={event.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/event/800/600';
          }}
        />
        {event.status === 'upcoming' && (
          <div className="absolute top-4 left-4 bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
            UPCOMING
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 text-accent text-sm font-medium mb-2">
          <Calendar size={14} />
          <span>{displayDate}</span>
        </div>
        <h3 className="text-xl font-bold mb-2 line-clamp-1 group-hover:text-accent transition-colors">
          {event.title}
        </h3>
        <div className="flex items-center gap-2 text-text-secondary text-sm mb-4">
          <MapPin size={14} />
          <span className="line-clamp-1">{event.location}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">
            {event.status === 'upcoming' ? (
              <span className="text-accent text-sm">Tickets TBA</span>
            ) : (
              <>from <span className="text-accent">{displayPrice} EGP</span></>
            )}
          </div>
          <Button variant={event.status === 'upcoming' ? 'outline' : 'primary'} className="px-4 py-2 text-sm">
            {event.status === 'upcoming' ? 'Notify Me' : 'Buy Ticket'}
          </Button>
        </div>
        {event.status === 'upcoming' && event.pre_registration_count !== undefined && (
          <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-text-secondary flex items-center gap-1">
            <Users size={10} className="text-accent" /> {event.pre_registration_count} people waiting
          </div>
        )}
      </div>
    </motion.div>
  );
});

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  bookingData: any;
  purchaseError: string | null;
  purchaseLoading: boolean;
  handlePurchase: (eventId: number, tickets: any[], details: any) => void;
  bookingForm: any;
  setBookingForm: React.Dispatch<React.SetStateAction<any>>;
}

const BookingModal: React.FC<BookingModalProps> = React.memo(({
  isOpen,
  onClose,
  user,
  bookingData,
  purchaseError,
  purchaseLoading,
  handlePurchase,
  bookingForm,
  setBookingForm
}) => {
  const { instagram, countryCode, phone, birthdate, voucherCode, ticketHolders } = bookingForm;
  const [error, setError] = useState('');

  const setInstagram = (val: string) => setBookingForm((prev: any) => ({ ...prev, instagram: val }));
  const setCountryCode = (val: string) => setBookingForm((prev: any) => ({ ...prev, countryCode: val }));
  const setPhone = (val: string) => setBookingForm((prev: any) => ({ ...prev, phone: val }));
  const setBirthdate = (val: string) => setBookingForm((prev: any) => ({ ...prev, birthdate: val }));
  const setVoucherCode = (val: string) => setBookingForm((prev: any) => ({ ...prev, voucherCode: val }));
  const setTicketHolders = (val: any[]) => setBookingForm((prev: any) => ({ ...prev, ticketHolders: val }));

  useEffect(() => {
    if (user && !phone && !birthdate) {
      setBookingForm((prev: any) => ({
        ...prev,
        phone: prev.phone || (user.phone?.startsWith('+') ? user.phone.split(' ')[1] || '' : user.phone || ''),
        birthdate: prev.birthdate || user.birthdate || '',
        countryCode: prev.countryCode || (user.phone?.startsWith('+') ? user.phone.split(' ')[0] : '+20')
      }));
    }
  }, [user]);

  if (!isOpen || !bookingData) return null;

  const handleHolderChange = (index: number, field: string, value: string) => {
    const newHolders = [...ticketHolders];
    newHolders[index] = { ...newHolders[index], [field]: value };
    setTicketHolders(newHolders);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instagram || !phone || !birthdate) {
      setError('All fields are mandatory');
      return;
    }
    // Validate ticket holders
    for (const holder of ticketHolders) {
      if (!holder.first_name || !holder.last_name || !holder.birthdate) {
        setError('All ticket holder details are mandatory');
        return;
      }
    }
    handlePurchase(bookingData.eventId, bookingData.tickets, {
      instagram_username: instagram,
      phone: `${countryCode} ${phone}`,
      birthdate,
      age: calculateAge(birthdate),
      voucher_code: voucherCode,
      ticket_holders: ticketHolders
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-bg/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-secondary-bg w-full max-w-2xl rounded-[2.5rem] p-8 border border-white/5 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Complete Booking</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm">{error}</div>}
          {purchaseError && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm">{purchaseError}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Instagram Username</label>
              <div className="relative">
                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                <input 
                  type="text" 
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@username"
                  className="w-full bg-primary-bg border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:border-accent outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Phone Number</label>
              <div className="flex gap-2">
                <CountryCodeSelector 
                  value={countryCode}
                  onChange={setCountryCode}
                />
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="10xxxxxxxx"
                  className="flex-1 bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Birthdate</label>
              <input 
                type="date" 
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Voucher Code (Optional)</label>
              <input 
                type="text" 
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="PROMO2024"
                className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-bold border-b border-white/5 pb-2">Ticket Holder Details</h3>
            {ticketHolders.map((holder, idx) => (
              <div key={idx} className="p-6 bg-primary-bg rounded-2xl border border-white/5 space-y-4">
                <p className="text-sm font-bold text-accent">Ticket #{idx + 1}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary uppercase font-bold tracking-wider">First Name</label>
                    <input 
                      type="text" 
                      value={holder.first_name}
                      onChange={(e) => handleHolderChange(idx, 'first_name', e.target.value)}
                      className="w-full bg-secondary-bg border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary uppercase font-bold tracking-wider">Last Name</label>
                    <input 
                      type="text" 
                      value={holder.last_name}
                      onChange={(e) => handleHolderChange(idx, 'last_name', e.target.value)}
                      className="w-full bg-secondary-bg border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary uppercase font-bold tracking-wider">Birthdate</label>
                    <input 
                      type="date" 
                      value={holder.birthdate}
                      onChange={(e) => handleHolderChange(idx, 'birthdate', e.target.value)}
                      className="w-full bg-secondary-bg border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full py-4" disabled={purchaseLoading}>
            {purchaseLoading ? 'Processing...' : 'Submit Booking Request'}
          </Button>
          
          <p className="text-center text-xs text-text-secondary">
            By submitting, you agree to our terms and conditions.
          </p>
        </form>
      </motion.div>
    </div>
  );
});

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingEvent: Event | null;
  setEditingEvent: (event: Event | null) => void;
  events: Event[];
  setEvents: (events: Event[]) => void;
  token: string | null;
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<any>;
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  editingEvent,
  setEditingEvent,
  events,
  setEvents,
  token,
  fetchWithAuth
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    venue: '',
    date: '',
    time: '',
    imageUrl: '',
    companyName: '',
    rules: '',
    googleMapsUrl: '',
    status: 'draft' as const,
    showQRCodes: false,
    government: 'Cairo',
    require_approval: false,
    ticketTypes: [] as any[]
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        setError('Image size must be less than 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField('imageUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (editingEvent) {
        setFormData({
          title: editingEvent.title || '',
          description: editingEvent.description || '',
          location: editingEvent.location || '',
          venue: editingEvent.venue || '',
          date: editingEvent.event_date || editingEvent.date || '',
          time: editingEvent.event_time || editingEvent.time || '',
          imageUrl: editingEvent.image_url || editingEvent.image || '',
          companyName: editingEvent.company_name || '',
          rules: editingEvent.rules || '',
          googleMapsUrl: editingEvent.google_maps_url || '',
          status: editingEvent.status || 'draft',
          showQRCodes: editingEvent.show_qr_codes || false,
          government: editingEvent.government || 'Cairo',
          require_approval: editingEvent.require_approval || false,
          ticketTypes: editingEvent.ticket_types || []
        });
      } else {
        setFormData({
          title: '',
          description: '',
          location: '',
          venue: '',
          date: '',
          time: '',
          imageUrl: '',
          companyName: '',
          rules: '',
          googleMapsUrl: '',
          status: 'draft',
          showQRCodes: false,
          government: 'Cairo',
          require_approval: false,
          ticketTypes: [{ 
            name: 'General Admission', 
            description: 'Standard entry', 
            price: 0, 
            quantity_total: 100, 
            quantity_sold: 0,
            sale_start: new Date().toISOString().split('T')[0],
            sale_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }]
        });
      }
    }
  }, [isOpen, editingEvent]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTicketType = () => {
    updateField('ticketTypes', [...formData.ticketTypes, { 
      name: '', 
      description: '', 
      price: 0, 
      quantity_total: 0, 
      quantity_sold: 0,
      sale_start: new Date().toISOString().split('T')[0],
      sale_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }]);
  };

  const handleRemoveTicketType = (index: number) => {
    updateField('ticketTypes', formData.ticketTypes.filter((_: any, i: number) => i !== index));
  };

  const handleTicketTypeChange = (index: number, field: keyof TicketType, value: any) => {
    const newTicketTypes = [...formData.ticketTypes];
    newTicketTypes[index] = { ...newTicketTypes[index], [field]: value };
    updateField('ticketTypes', newTicketTypes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const eventData = {
      title: formData.title,
      description: formData.description,
      location: formData.location,
      venue: formData.venue,
      event_date: formData.date,
      event_time: formData.time,
      image_url: formData.imageUrl,
      company_name: formData.companyName,
      rules: formData.rules,
      google_maps_url: formData.googleMapsUrl,
      status: formData.status,
      show_qr_codes: formData.showQRCodes,
      government: formData.government,
      require_approval: formData.require_approval,
      ticket_types: formData.ticketTypes
    };

    try {
      const url = editingEvent ? `/api/events/${editingEvent.id}` : '/api/events';
      const method = editingEvent ? 'PUT' : 'POST';
      const data = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });

      if (data) {
        if (editingEvent) {
          setEvents(events.map(e => e.id === editingEvent.id ? data : e));
        } else {
          setEvents([data, ...events]);
        }
        onClose();
        setEditingEvent(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { onClose(); setEditingEvent(null); }}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-secondary-bg/40 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl"
          >
            <button onClick={() => { onClose(); setEditingEvent(null); }} className="absolute top-6 right-6 text-text-secondary hover:text-white"><X size={24} /></button>
            <h2 className="text-3xl font-bold mb-6">{editingEvent ? 'Edit' : 'Create'} <span className="text-accent">Event</span></h2>
            
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm">{error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold border-b border-white/5 pb-2">Basic Info</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1">Event Title</label>
                    <input type="text" value={formData.title} onChange={e => updateField('title', e.target.value)} className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea value={formData.description} onChange={e => updateField('description', e.target.value)} className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none h-32" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Date</label>
                      <input type="date" value={formData.date} onChange={e => updateField('date', e.target.value)} className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Time</label>
                      <input type="time" value={formData.time} onChange={e => updateField('time', e.target.value)} className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none" required />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold border-b border-white/5 pb-2">Location & Media</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1">Government (Location Category)</label>
                    <select 
                      value={formData.government} 
                      onChange={e => updateField('government', e.target.value)} 
                      className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                    >
                      <option value="Cairo">Cairo</option>
                      <option value="Giza">Giza</option>
                      <option value="Alexandria">Alexandria</option>
                      <option value="North Coast">North Coast</option>
                      <option value="Sharm El-Sheikh">Sharm El-Sheikh</option>
                      <option value="Dahab">Dahab</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">City/Location</label>
                    <input type="text" value={formData.location} onChange={e => updateField('location', e.target.value)} className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none" placeholder="e.g. Cairo, Egypt" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Venue Name</label>
                    <input type="text" value={formData.venue} onChange={e => updateField('venue', e.target.value)} className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none" placeholder="e.g. Cairo International Stadium" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium">Event Image</label>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setImageMode('url')}
                          className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider transition-colors ${imageMode === 'url' ? 'bg-accent text-white' : 'bg-white/5 text-text-secondary'}`}
                        >
                          URL
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setImageMode('upload')}
                          className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider transition-colors ${imageMode === 'upload' ? 'bg-accent text-white' : 'bg-white/5 text-text-secondary'}`}
                        >
                          Upload
                        </button>
                      </div>
                    </div>
                    {imageMode === 'url' ? (
                      <input 
                        type="url" 
                        value={formData.imageUrl} 
                        onChange={e => updateField('imageUrl', e.target.value)} 
                        className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none" 
                        placeholder="https://..." 
                      />
                    ) : (
                      <div className="space-y-2">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange} 
                          className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20" 
                        />
                        {formData.imageUrl && formData.imageUrl.startsWith('data:') && (
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10">
                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              type="button" 
                              onClick={() => updateField('imageUrl', '')}
                              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Company Name</label>
                    <input type="text" value={formData.companyName} onChange={e => updateField('companyName', e.target.value)} className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none" placeholder="Organizer Company Name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Rules of Event</label>
                    <textarea value={formData.rules} onChange={e => updateField('rules', e.target.value)} className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none h-24" placeholder="Enter event rules..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Google Maps URL</label>
                    <input type="url" value={formData.googleMapsUrl} onChange={e => updateField('googleMapsUrl', e.target.value)} className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none" placeholder="https://maps.google.com/..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select value={formData.status} onChange={e => updateField('status', e.target.value)} className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none">
                      <option value="draft">Draft</option>
                      <option value="published">Published (Legacy)</option>
                      <option value="upcoming">Upcoming (Pre-Registration)</option>
                      <option value="live">Live (Tickets Available)</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-4 pt-2">
                    <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                      <input 
                        type="checkbox" 
                        id="require_approval"
                        checked={formData.require_approval} 
                        onChange={e => updateField('require_approval', e.target.checked)} 
                        className="w-5 h-5 accent-accent"
                      />
                      <label htmlFor="require_approval" className="text-sm font-medium cursor-pointer">
                        Require Admin Approval for Bookings
                        <p className="text-xs text-text-secondary font-normal">If enabled, users must wait for approval before paying.</p>
                      </label>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                      <input 
                        type="checkbox" 
                        id="show_qr_codes" 
                        checked={formData.showQRCodes} 
                        onChange={e => updateField('showQRCodes', e.target.checked)}
                        className="w-5 h-5 accent-accent"
                      />
                      <label htmlFor="show_qr_codes" className="text-sm font-medium cursor-pointer">
                        Enable QR Codes Manually (Override)
                        <p className="text-xs text-text-secondary font-normal">If enabled, QR codes will be visible to users even before the 1-hour window.</p>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="text-lg font-bold">Ticket Types</h3>
                  <Button type="button" variant="outline" onClick={handleAddTicketType} className="py-1 px-3 text-sm"><Plus size={16} /> Add Type</Button>
                </div>
                
                <div className="space-y-4">
                  {formData.ticketTypes.map((tt: any, index: number) => (
                    <div key={index} className="bg-primary-bg/50 p-4 rounded-2xl border border-white/5 space-y-4">
                      <div className="flex justify-between gap-4">
                        <div className="flex-1">
                          <label className="block text-xs text-text-secondary mb-1">Name</label>
                          <input type="text" value={tt.name} onChange={e => handleTicketTypeChange(index, 'name', e.target.value)} className="w-full bg-primary-bg border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none" placeholder="e.g. VIP" required />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-text-secondary mb-1">Price (EGP)</label>
                          <input type="number" value={tt.price} onChange={e => handleTicketTypeChange(index, 'price', e.target.value === '' ? 0 : parseFloat(e.target.value))} className="w-full bg-primary-bg border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none" required />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-text-secondary mb-1">Total Quantity</label>
                          <input type="number" value={tt.quantity_total} onChange={e => handleTicketTypeChange(index, 'quantity_total', e.target.value === '' ? 0 : parseInt(e.target.value))} className="w-full bg-primary-bg border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none" required />
                        </div>
                        <button type="button" onClick={() => handleRemoveTicketType(index)} className="mt-6 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">Sale Start</label>
                          <input type="date" value={tt.sale_start} onChange={e => handleTicketTypeChange(index, 'sale_start', e.target.value)} className="w-full bg-primary-bg border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none" required />
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">Sale End</label>
                          <input type="date" value={tt.sale_end} onChange={e => handleTicketTypeChange(index, 'sale_end', e.target.value)} className="w-full bg-primary-bg border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none" required />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">Description</label>
                        <input type="text" value={tt.description} onChange={e => handleTicketTypeChange(index, 'description', e.target.value)} className="w-full bg-primary-bg border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none" placeholder="Ticket type description..." />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full py-4" disabled={loading}>
                {loading ? 'Saving Event...' : (editingEvent ? 'Update Event' : 'Create Event')}
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Main App ---

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignup: () => void;
  onLoginSuccess: (data: any) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ 
  isOpen, 
  onClose, 
  onOpenSignup, 
  onLoginSuccess
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("LOGIN CLICKED");
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      console.log('Login response:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      if (data && data.user && data.user.id) {
        onLoginSuccess(data);
        // Clear local state on success
        setEmail('');
        setPassword('');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-secondary-bg/40 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl"
            >
              <button onClick={onClose} className="absolute top-6 right-6 text-text-secondary hover:text-white"><X size={24} /></button>
              <h2 className="text-3xl font-bold mb-2">Welcome <span className="text-accent">Back</span></h2>
              <p className="text-text-secondary mb-8">Login to your TicketsHub account.</p>
            
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm">{error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors"
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button variant="primary" className="w-full py-4" disabled={loading} type="submit">
                {loading ? 'Logging in...' : 'Login'} 
              </Button>
            </form>
            
            <p className="mt-8 text-center text-text-secondary text-sm">
              Don't have an account? <button onClick={() => { onClose(); onOpenSignup(); }} className="text-accent font-bold hover:underline">Sign Up</button>
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
  onSignupSuccess: (data: any) => void;
  signupForm: any;
  setSignupForm: React.Dispatch<React.SetStateAction<any>>;
}

const SignupModal: React.FC<SignupModalProps> = React.memo(({
  isOpen,
  onClose,
  onOpenLogin,
  onSignupSuccess,
  signupForm,
  setSignupForm
}) => {
  const { name, email, password, phone, countryCode, birthdate, role } = signupForm;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setName = (val: string) => setSignupForm((prev: any) => ({ ...prev, name: val }));
  const setEmail = (val: string) => setSignupForm((prev: any) => ({ ...prev, email: val }));
  const setPassword = (val: string) => setSignupForm((prev: any) => ({ ...prev, password: val }));
  const setPhone = (val: string) => setSignupForm((prev: any) => ({ ...prev, phone: val }));
  const setCountryCode = (val: string) => setSignupForm((prev: any) => ({ ...prev, countryCode: val }));
  const setBirthdate = (val: string) => setSignupForm((prev: any) => ({ ...prev, birthdate: val }));
  const setRole = (val: 'user' | 'organizer') => setSignupForm((prev: any) => ({ ...prev, role: val }));

  const validateAge = (dateString: string) => {
    if (!dateString) return false;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 18;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAge(birthdate)) {
      setError('You must be at least 18 years old to sign up.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const fullPhone = `${countryCode}${phone}`;
      const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, birthdate, phone: fullPhone })
      });
      
      const data = await res.json();
      console.log('Signup response:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      
      if (data && data.user && data.user.id) {
        onSignupSuccess(data);
        // Clear local state on success
        setName('');
        setEmail('');
        setPassword('');
        setPhone('');
        setBirthdate('');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-secondary-bg/40 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl"
          >
            <button onClick={onClose} className="absolute top-6 right-6 text-text-secondary hover:text-white"><X size={24} /></button>
            <h2 className="text-3xl font-bold mb-2">Join <span className="text-accent">TicketsHub</span></h2>
            <p className="text-text-secondary mb-8">Create your account to start booking.</p>
            
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm">{error}</div>}
            
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors"
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <div className="flex gap-2">
                  <CountryCodeSelector 
                    value={countryCode}
                    onChange={setCountryCode}
                  />
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors"
                    placeholder="10xxxxxxxx"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Birthdate</label>
                <input 
                  type="date" 
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                {/* Role selection removed as only admins can organize events */}
              </div>
              <Button variant="primary" className="w-full py-4 mt-4" disabled={loading}>
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </form>
            
            <p className="mt-8 text-center text-text-secondary text-sm">
              Already have an account? <button onClick={() => { onClose(); onOpenLogin(); }} className="text-accent font-bold hover:underline">Login</button>
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

  const Navbar = React.memo(({ 
    user, 
    view, 
    setView, 
    setIsLoginModalOpen, 
    setIsSignupModalOpen, 
    handleLogout, 
    notifications, 
    isNotificationsOpen, 
    setIsNotificationsOpen, 
    markNotificationRead, 
    events, 
    setSelectedEvent
  }: {
    user: UserProfile | null,
    view: View,
    setView: (view: View) => void,
    setIsLoginModalOpen: (open: boolean) => void,
    setIsSignupModalOpen: (open: boolean) => void,
    handleLogout: () => void,
    notifications: Notification[],
    isNotificationsOpen: boolean,
    setIsNotificationsOpen: (open: boolean) => void,
    markNotificationRead: (id: number) => void,
    events: Event[],
    setSelectedEvent: (event: Event | null) => void
  }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
      <nav className="sticky top-0 z-50 bg-primary-bg/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
              <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(108,92,231,0.4)]">
                <Ticket className="text-white" size={24} />
              </div>
              <span className="text-2xl font-display font-bold tracking-tight">Tickets<span className="text-accent">Hub</span></span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => setView('home')} className={`font-medium transition-colors ${view === 'home' ? 'text-accent' : 'text-text-secondary hover:text-white'}`}>Home</button>
              <button onClick={() => setView('events')} className={`font-medium transition-colors ${view === 'events' ? 'text-accent' : 'text-text-secondary hover:text-white'}`}>Events</button>
              <button className="text-text-secondary hover:text-white font-medium transition-colors">About</button>
              <div className="h-6 w-px bg-white/10 mx-2"></div>
              
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <button 
                      onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                      className="p-2 text-text-secondary hover:text-accent transition-colors relative"
                    >
                      <Bell size={20} />
                      {notifications.filter(n => !n.read).length > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-primary-bg"></span>
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {isNotificationsOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-4 w-96 bg-secondary-bg border border-white/10 rounded-[2rem] shadow-2xl z-50 overflow-hidden"
                        >
                          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h3 className="font-black text-sm uppercase tracking-widest">Notifications</h3>
                            <span className="px-2 py-0.5 bg-accent/20 text-accent rounded-full text-[10px] font-bold">{notifications.filter(n => !n.read).length} New</span>
                          </div>
                          <div className="max-h-[32rem] overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? (
                              notifications.map(n => (
                                <div 
                                  key={n.id} 
                                  className={`p-6 border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer relative group ${!n.read ? 'bg-accent/5' : ''}`}
                                  onClick={() => {
                                    markNotificationRead(n.id);
                                    if (n.event_id) {
                                      const event = events.find(e => e.id === n.event_id);
                                      if (event) {
                                        setSelectedEvent(event);
                                        setView('details');
                                      }
                                    }
                                    setIsNotificationsOpen(false);
                                  }}
                                >
                                  {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent"></div>}
                                  <div className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                      n.type === 'success' ? 'bg-green-400/10 text-green-400' :
                                      n.type === 'error' ? 'bg-red-400/10 text-red-400' :
                                      'bg-accent/10 text-accent'
                                    }`}>
                                      {n.type === 'success' ? <CheckCircle2 size={18} /> : 
                                       n.type === 'error' ? <AlertCircle size={18} /> : 
                                       <Bell size={18} />}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-sm text-white group-hover:text-accent transition-colors">{n.title}</p>
                                        <p className="text-[10px] text-text-secondary whitespace-nowrap ml-2">{new Date(n.created_at).toLocaleDateString()}</p>
                                      </div>
                                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{n.message}</p>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-12 text-center">
                                <Bell size={48} className="mx-auto text-text-secondary mb-4 opacity-20" />
                                <p className="text-text-secondary text-sm font-medium">All caught up!</p>
                                <p className="text-xs text-text-secondary/60 mt-1">No new notifications for you.</p>
                              </div>
                            )}
                          </div>
                          {notifications.length > 0 && (
                            <div className="p-4 bg-white/5 text-center">
                              <button className="text-[10px] font-black uppercase tracking-widest text-accent hover:underline">Mark all as read</button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button 
                    onClick={() => setView(user.role === 'admin' ? 'admin-dashboard' : 'user-dashboard')}
                    className="flex items-center gap-2 hover:text-accent transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                      <User size={16} />
                    </div>
                    <span className="font-medium">{user.name?.split(' ')[0] || ''}</span>
                  </button>
                  <button onClick={handleLogout} className="text-text-secondary hover:text-red-400 transition-colors">
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setIsLoginModalOpen(true)}>Login</Button>
                  <Button variant="primary" onClick={() => setIsSignupModalOpen(true)}>Sign Up</Button>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white p-2">
                {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-secondary-bg border-t border-white/5 overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 space-y-2">
                <button onClick={() => { setView('home'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-lg font-medium text-white hover:bg-white/5 rounded-xl">Home</button>
                <button onClick={() => { setView('events'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-lg font-medium text-white hover:bg-white/5 rounded-xl">Events</button>
                <button className="block w-full text-left px-4 py-3 text-lg font-medium text-white hover:bg-white/5 rounded-xl">About</button>
                <div className="pt-4 flex flex-col gap-3">
                  {user ? (
                    <>
                      <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl mb-2">
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-bold">{user.name}</p>
                          <p className="text-xs text-text-secondary uppercase tracking-wider">{user.role}</p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => { setView(user.role === 'admin' ? 'admin-dashboard' : 'user-dashboard'); setIsMenuOpen(false); }}>Dashboard</Button>
                      <Button variant="ghost" className="w-full text-red-400" onClick={handleLogout}>Logout</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="w-full" onClick={() => { setIsLoginModalOpen(true); setIsMenuOpen(false); }}>Login</Button>
                      <Button variant="primary" className="w-full" onClick={() => { setIsSignupModalOpen(true); setIsMenuOpen(false); }}>Sign Up</Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    );
  });

  const Footer = React.memo(({ setView }: { setView: (view: View) => void }) => (
    <footer className="bg-secondary-bg border-t border-white/5 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Ticket className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold">TicketsHub</span>
            </div>
            <p className="text-text-secondary max-w-sm mb-8">
              The premium destination for event tickets in Egypt. Secure, fast, and reliable.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-text-secondary hover:bg-accent hover:text-white transition-all">
                <Facebook size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-text-secondary hover:bg-accent hover:text-white transition-all">
                <Twitter size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-text-secondary hover:bg-accent hover:text-white transition-all">
                <Instagram size={18} />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-6">Quick Links</h4>
            <ul className="space-y-4 text-text-secondary">
              <li><button onClick={() => setView('home')} className="hover:text-accent transition-colors">Home</button></li>
              <li><button onClick={() => setView('events')} className="hover:text-accent transition-colors">Browse Events</button></li>
              <li><button className="hover:text-accent transition-colors">About Us</button></li>
              <li><button className="hover:text-accent transition-colors">Contact</button></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-6">Support</h4>
            <ul className="space-y-4 text-text-secondary">
              <li><button className="hover:text-accent transition-colors">Help Center</button></li>
              <li><button className="hover:text-accent transition-colors">Terms of Service</button></li>
              <li><button className="hover:text-accent transition-colors">Privacy Policy</button></li>
              <li><button className="hover:text-accent transition-colors">Refund Policy</button></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 text-center text-text-secondary text-sm">
          <p>© {new Date().getFullYear()} TicketsHub Egypt. All rights reserved.</p>
        </div>
      </div>
    </footer>
  ));

// --- Hooks ---

const useOrder = (orderId: number | null, fetchWithAuth: any) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedOrderIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setLoading(false);
      setError(null);
      fetchedOrderIdRef.current = null;
      return;
    }

    if (fetchedOrderIdRef.current === orderId) return;

    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      fetchedOrderIdRef.current = orderId;
      try {
        const data = await fetchWithAuth(`/api/orders/${orderId}`);
        const realOrder = data?.order || data;
        setOrder(realOrder);
      } catch (err: any) {
        console.error(`[useOrder] Failed to fetch order ${orderId}:`, err);
        setError(err.message || 'Failed to fetch order');
        fetchedOrderIdRef.current = null; // Allow retry on error
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, fetchWithAuth]);

  return { order, loading, error };
};

const usePaymentFlow = (fetchWithAuth: any, setView: (v: View) => void, setLastOrder: (o: Order) => void) => {
  const [status, setStatus] = useState<PaymentState>('idle');
  const processedOrders = useRef(new Set<string>());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    const isReturn = orderId && !params.has('view');

    if (isReturn) {
      // Strip URL immediately
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete('order_id');
      newParams.delete('origin');
      newParams.delete('status');
      const newSearch = newParams.toString();
      const newUrl = `${window.location.pathname}${newSearch ? '?' + newSearch : ''}`;
      window.history.replaceState({}, document.title, newUrl);

      if (processedOrders.current.has(orderId)) return;
      processedOrders.current.add(orderId);

      const verifyPayment = async () => {
        setStatus('verifying');
        try {
          const data = await fetchWithAuth(`/api/payments/verify/${orderId}`);
          if (data?.order) setLastOrder(data.order);
          
          if (data?.is_paid === true) {
            setStatus('success');
            setView('payment-success');
          } else if (data?.is_paid === false) {
            setStatus('failed');
            setView('payment-failure');
          } else {
            setStatus('pending');
            setView('payment-pending');
          }
        } catch (err) {
          console.error('[usePaymentFlow] Verification failed:', err);
          setStatus('failed');
          setView('payment-failure');
        }
      };

      verifyPayment();
    }
  }, [fetchWithAuth, setView, setLastOrder]);

  const handleReturn = useCallback((orderId: string, status?: string) => {
    // Manual trigger if needed
  }, []);

  return { status, handleReturn };
};

export default function App() {
  const hasFetchedUserRef = useRef(false);
  const hasFetchedEventsRef = useRef(false);
  const hasFetchedSettingsRef = useRef(false);
  const hasFetchedInitialDataRef = useRef(false);

  const [view, setView] = useState<View>(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    if (v === 'home' || v === 'admin' || v === 'user' || v === 'events' || v === 'checkout' || v === 'confirmation') return v as View;
    return 'home';
  });

  const [checkoutOrderId, setCheckoutOrderId] = useState<number | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('order_id');
    return id ? parseInt(id) : null;
  });

  // FIX: Improved URL synchronization to prevent unnecessary pushState calls and infinite loops
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentView = params.get('view');
    const currentOrderId = params.get('order_id');

    let changed = false;
    if (currentView !== view) {
      params.set('view', view);
      changed = true;
    }

    // Keep order_id for checkout, confirmation, and payment result pages
    const viewsWithOrder = ['checkout', 'confirmation', 'payment-success', 'payment-failure', 'payment-pending'];
    if (viewsWithOrder.includes(view) && checkoutOrderId) {
      if (currentOrderId !== checkoutOrderId.toString()) {
        params.set('order_id', checkoutOrderId.toString());
        changed = true;
      }
    } else {
      if (params.has('order_id')) {
        params.delete('order_id');
        changed = true;
      }
    }

    if (changed) {
      window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
  }, [view, checkoutOrderId]);

  // FIX: Robust popstate handling with fallback and state cleanup
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view') as View;
      const id = params.get('order_id');

      if (v && ['home', 'admin', 'user', 'events', 'checkout', 'confirmation'].includes(v)) {
        setView(v);
      } else {
        setView('home');
      }

      if (id) {
        setCheckoutOrderId(parseInt(id));
      } else {
        setCheckoutOrderId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  // FIX: Standardized fetch helper with authentication, token validation, and safe error handling
const fetchWithAuth = useCallback(async (endpoint: string, options: RequestInit = {}) => {
  // Use the latest token from state or fallback to localStorage
  const currentToken = token || localStorage.getItem('token');
  
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const headers: any = {
    ...options.headers,
  };

  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  try {
    console.log(`[fetchWithAuth] Calling: ${url}`, { method: options.method, body: options.body });
    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      // Only force login if we actually tried to use a token or if it's a protected route
      // For now, let's just clear the token if it was invalid
      if (currentToken) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setIsLoginModalOpen(true);
        throw new Error('Session expired. Please log in again.');
      }
      throw new Error('Authentication required.');
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(JSON.stringify(errorData));
    }

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    return await res.text();
  } catch (err) {
    console.error(`[fetchWithAuth] Error calling ${url}:`, err);
    throw err;
  }
}, [token, user]);

  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const { status: paymentStatus } = usePaymentFlow(fetchWithAuth, setView, setLastOrder);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingData, setBookingData] = useState<{ eventId: string | number, tickets: any[] } | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  const [settings, setSettings] = useState({ service_fee_percent: 10 });
  const [preRegistrations, setPreRegistrations] = useState<PreRegistration[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    instagram: '',
    countryCode: '+20',
    phone: '',
    birthdate: '',
    voucherCode: '',
    ticketHolders: [] as any[]
  });
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    countryCode: '+20',
    birthdate: '',
    role: 'user' as 'user' | 'organizer'
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health`)
      .then(res => console.log('[API DEBUG] Health check status:', res.status))
      .catch(err => console.error('[API DEBUG] Health check failed:', err));
  }, []);

  const fetchPreRegistrations = useCallback(async () => {
    try {
      const data = await fetchWithAuth('/api/pre-registrations');
      if (data) setPreRegistrations(data);
    } catch (err) {
      console.error('Failed to fetch pre-registrations', err);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('[Global Error]', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await fetchWithAuth('/api/notifications');
      if (data) setNotifications(data);
    } catch (err) {
      // Error is already logged in fetchWithAuth
    }
  }, [fetchWithAuth]);

  const handlePreRegister = async (eventId: string | number) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const data = await fetchWithAuth(`/api/events/${eventId}/pre-register`, {
        method: 'POST'
      });
      if (data) {
        fetchPreRegistrations();
        // FIX: Prevent unnecessary re-fetching of all events by updating local state
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, pre_registrations_count: (e.pre_registrations_count || 0) + 1 } : e));
      }
    } catch (err: any) {
      try {
        const errorData = JSON.parse(err.message);
        alert(errorData.error || 'Failed to pre-register');
      } catch {
        alert(err.message || 'An error occurred');
      }
    }
  };

  const markNotificationRead = async (id: number) => {
    try {
      const res = await fetchWithAuth(`/api/notifications/${id}/read`, {
        method: 'PUT'
      });
      if (res) {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  // FIX: Improved /api/auth/me handling with standardized fetch and error logic
  useEffect(() => {
    // Only fetch if we have a token but no user profile yet
    if (!token || user || hasFetchedUserRef.current) return;

    const fetchUser = async () => {
      hasFetchedUserRef.current = true;
      try {
        const data = await fetchWithAuth('/api/auth/me');
        if (data && data.id) {
          setUser(data);
        }
      } catch (err) {
        hasFetchedUserRef.current = false; // Allow retry on error
      }
    };

    fetchUser();
  }, [token, user, fetchWithAuth]);

  // FIX: Optimized polling effect with correct dependencies and cleanup
  useEffect(() => {
    if (!token || hasFetchedInitialDataRef.current) return;
    hasFetchedInitialDataRef.current = true;

    fetchPreRegistrations();
    fetchNotifications();
    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token, fetchPreRegistrations, fetchNotifications]);

  const handlePurchase = useCallback(async (eventId: string | number, tickets: { ticket_type_id: string | number, quantity: number }[], additionalInfo?: { instagram_username: string, phone: string, birthdate: string, age: number, voucher_code?: string, ticket_holders?: any[] }) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!additionalInfo) {
      setBookingData({ eventId, tickets });
      const total = tickets.reduce((sum: number, t: any) => sum + t.quantity, 0) || 0;
      setBookingForm(prev => ({
        ...prev,
        ticketHolders: Array.from({ length: total }, () => ({ first_name: '', last_name: '', birthdate: '' }))
      }));
      setIsBookingModalOpen(true);
      return;
    }

    setPurchaseLoading(true);
    setPurchaseError('');
    try {
      const data = await fetchWithAuth('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          event_id: eventId, 
          tickets,
          ...additionalInfo
        })
      });
      
      if (data) {
        if (data?.order) {
          setLastOrder(data.order);
        }
        setIsBookingModalOpen(false);
        // FIX: Prevent unnecessary re-fetching of all events by updating local state if possible
        // For simplicity and consistency, we still fetch events but use fetchWithAuth logic
        const eventsData = await fetchWithAuth('/api/events');
        if (eventsData) {
          setEvents(eventsData);
        }
        
        if (data.order_status === 'approved') {
          setCheckoutOrderId(data.id);
          setView('checkout');
        } else {
          setView('confirmation');
        }
      }
    } catch (err: any) {
      setPurchaseError(err.message || 'An error occurred');
    } finally {
      setPurchaseLoading(false);
    }
  }, [user, token, fetchPreRegistrations, fetchNotifications, fetchWithAuth]); // FIX: Correct dependencies

  useEffect(() => {
    const fetchEvents = async () => {
      if (hasFetchedEventsRef.current) return;
      hasFetchedEventsRef.current = true;
      setLoadingEvents(true);
      try {
        const data = await fetchWithAuth('/api/events');
        if (data && Array.isArray(data)) {
          const mappedEvents = data.map((e: any) => ({
            ...e,
            date: e.event_date,
            price: e.ticket_types && e.ticket_types.length > 0 ? Math.min(...e.ticket_types.map((t: any) => t.price)) : 0
          }));
          setEvents(mappedEvents);
        }
      } catch (err) {
        console.error('Failed to fetch events', err);
        hasFetchedEventsRef.current = false;
      } finally {
        setLoadingEvents(false);
      }
    };
    const fetchSettings = async () => {
      if (hasFetchedSettingsRef.current) return;
      hasFetchedSettingsRef.current = true;
      try {
        const data = await fetchWithAuth('/api/settings');
        if (data) setSettings(data);
      } catch (err) {
        console.error('Failed to fetch settings', err);
        hasFetchedSettingsRef.current = false;
      }
    };

    fetchEvents();
    fetchSettings();
  }, [fetchWithAuth]);


  const handleLoginSuccess = useCallback((data: { user: UserProfile, token: string }) => {
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    setIsLoginModalOpen(false);
  }, []);

  const handleSignupSuccess = useCallback((data: { user: UserProfile, token: string }) => {
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    setIsSignupModalOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setView('home');
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [maxPrice, setMaxPrice] = useState<number>(50000);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setView('details');
  };

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           event.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = selectedLocation === 'All' || event.location.toLowerCase().includes(selectedLocation.toLowerCase());
      const minPrice = event.ticket_types?.reduce((min, tt) => Math.min(min, tt.price), Infinity) || event.price || 0;
      const matchesPrice = minPrice <= maxPrice;
      const isPublished = event.status === 'published';
      return matchesSearch && matchesLocation && matchesPrice && isPublished;
    });
  }, [events, searchQuery, selectedLocation, maxPrice]);

  // --- Page Components ---



  const isQRCodeVisible = (eventDate: string, eventTime: string, eventId?: number | string) => {
    const event = events.find(e => e.id === eventId);
    if (event?.qr_enabled_manual) return true;
    
    try {
      const eventDateTime = new Date(`${eventDate}T${eventTime}`);
      const now = new Date();
      const diffInMs = eventDateTime.getTime() - now.getTime();
      const diffInHours = diffInMs / (1000 * 60 * 60);
      
      // Show QR code 1 hour before event and up to 24 hours after it starts
      return diffInHours <= 1 && diffInHours >= -24;
    } catch (e) {
      return false;
    }
  };

  const handleDownloadPDF = async (order: Order) => {
    const element = document.getElementById(`ticket-card-${order.id}`);
    if (!element) return;

    try {
      // Create a style element to override modern color functions that html2canvas doesn't support
      const style = document.createElement('style');
      style.innerHTML = `
        * {
          color-interpolation-filters: auto !important;
          color-rendering: auto !important;
        }
      `;
      document.head.appendChild(style);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f0f13',
        onclone: (clonedDoc) => {
          // Aggressively strip modern color functions from the cloned document's stylesheets
          // html2canvas chokes on oklab/oklch even if not used on the target element
          const styleSheets = Array.from(clonedDoc.styleSheets);
          styleSheets.forEach((sheet) => {
            try {
              const rules = Array.from(sheet.cssRules);
              for (let i = rules.length - 1; i >= 0; i--) {
                const rule = rules[i];
                if (rule.cssText.includes('oklch') || rule.cssText.includes('oklab')) {
                  sheet.deleteRule(i);
                }
              }
            } catch (e) {
              // Some stylesheets might be cross-origin and inaccessible
              console.warn('Could not access stylesheet for stripping modern colors', e);
            }
          });

          // Also check inline styles
          const allElements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            if (el.style) {
              // Remove any inline styles that might use these functions
              const styleText = el.getAttribute('style') || '';
              if (styleText.includes('oklch') || styleText.includes('oklab')) {
                // Replace with a safe fallback or just remove the problematic part
                el.setAttribute('style', styleText.replace(/oklch\([^)]+\)/g, 'rgb(0,0,0)').replace(/oklab\([^)]+\)/g, 'rgb(0,0,0)'));
              }
            }
          }
        }
      });
      
      document.head.removeChild(style);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`TicketsHub-Ticket-${order.id}.pdf`);
    } catch (error) {
      console.error('PDF generation failed', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const HomePage = () => (
    <div className="space-y-24 pb-24">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center pt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-[1.1] mb-6">
              Discover and Book <span className="text-accent">Amazing</span> Events
            </h1>
            <p className="text-xl text-text-secondary mb-10 max-w-lg leading-relaxed">
              Join thousands of people discovering the best concerts, workshops, and conferences happening around you.
            </p>
            
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative hidden lg:block"
          >
            <div className="relative z-10 rounded-[2.5rem] overflow-hidden border-8 border-white/5 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-700">
              <img src="https://picsum.photos/seed/concert/800/1000" alt="Hero" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-10 left-10 right-10">
                <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20">
                  <h4 className="text-xl font-bold mb-1">Summer Beats Festival</h4>
                  <p className="text-sm text-white/70 flex items-center gap-2"><MapPin size={14} /> North Coast, Egypt</p>
                </div>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-accent/20 blur-[100px] rounded-full"></div>
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-accent/30 blur-[100px] rounded-full"></div>
          </motion.div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold mb-2">Featured <span className="text-accent">Events</span></h2>
            <p className="text-text-secondary">The most anticipated events you don't want to miss.</p>
          </div>
          <Button variant="outline" onClick={() => setView('events')}>Explore More</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.filter(e => e.status === 'published').slice(0, 3).map(event => (
            <EventCard key={event.id} event={event} onClick={() => handleEventClick(event)} />
          ))}
          {events.filter(e => e.status === 'published').length === 0 && !loadingEvents && (
            <div className="col-span-3 text-center py-12 text-text-secondary">No events available yet.</div>
          )}
        </div>
      </section>

      {/* How it Works */}
      <section className="bg-secondary-bg py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-4">How <span className="text-accent">TicketsHub</span> Works</h2>
            <p className="text-text-secondary">Getting your tickets has never been easier. Follow these simple steps.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: <Search size={32} />, title: 'Find Events', desc: 'Browse through hundreds of events happening in your city.' },
              { icon: <Ticket size={32} />, title: 'Select Tickets', desc: 'Choose from different ticket types that suit your needs.' },
              { icon: <CheckCircle2 size={32} />, title: 'Get QR Ticket', desc: 'Receive your digital ticket instantly and show it at the door.' }
            ].map((step, i) => (
              <div key={i} className="text-center group">
                <div className="w-20 h-20 bg-primary-bg rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/5 group-hover:border-accent/50 group-hover:bg-accent/10 transition-all duration-500">
                  <div className="text-accent">{step.icon}</div>
                </div>
                <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                <p className="text-text-secondary leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-bold">Upcoming <span className="text-accent">Events</span></h2>
          <div className="flex gap-2">
            {['Today', 'This Week', 'This Month'].map(t => (
              <button key={t} className="px-4 py-2 rounded-full text-sm font-medium bg-white/5 hover:bg-white/10 transition-colors">{t}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {events.filter(e => ['published', 'upcoming', 'live'].includes(e.status)).map(event => (
            <EventCard key={event.id} event={event} onClick={() => handleEventClick(event)} />
          ))}
        </div>
      </section>
    </div>
  );

  const EventsListingPage = () => {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Sidebar Filters */}
          <aside className="w-full md:w-64 space-y-8">
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Filter size={18} className="text-accent" /> Filters
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                    <input 
                      type="text" 
                      placeholder="Event name..." 
                      className="w-full bg-secondary-bg border border-white/10 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-accent"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  {/* Category filter removed as requested */}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-text-secondary">Price Range</label>
                    <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded-lg">Up to {maxPrice.toLocaleString()} EGP</span>
                  </div>
                  <div className="relative pt-2 pb-6">
                    <input 
                      type="range" 
                      min="0" 
                      max="50000" 
                      step="500"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent" 
                    />
                    <div className="flex justify-between text-[10px] text-text-secondary mt-2 font-bold uppercase tracking-wider">
                      <span>0 EGP</span>
                      <span>50,000+ EGP</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-text-secondary mb-2 block">Location</label>
                  <select 
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full bg-secondary-bg border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-accent text-sm"
                  >
                    <option value="All">All Locations</option>
                    {['Cairo', 'North Coast', 'Alexandria', 'Sharm El Sheikh', 'Giza', 'Dahab', 'Hurghada'].map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => { setSearchQuery(''); setSelectedLocation('All'); setMaxPrice(50000); }}>Reset Filters</Button>
          </aside>

          {/* Main Grid */}
          <main className="flex-1">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">{filteredEvents.length} Events Found</h2>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span>Sort by:</span>
                <select className="bg-transparent font-bold text-white focus:outline-none">
                  <option>Newest</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                </select>
              </div>
            </div>

            {loadingEvents ? (
              <div className="text-center py-20">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-text-secondary">Loading events...</p>
              </div>
            ) : filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map(event => (
                  <EventCard key={event.id} event={event} onClick={() => handleEventClick(event)} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-secondary-bg rounded-3xl border border-dashed border-white/10">
                <Search size={48} className="mx-auto text-text-secondary mb-4 opacity-20" />
                <h3 className="text-xl font-bold mb-2">No events found</h3>
                <p className="text-text-secondary">Try adjusting your filters or search query.</p>
              </div>
            )}

            {/* Pagination */}
            <div className="mt-12 flex justify-center gap-2">
              {[1, 2, 3].map(p => (
                <button key={p} className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all ${p === 1 ? 'bg-accent text-white' : 'bg-secondary-bg text-text-secondary hover:bg-white/10'}`}>
                  {p}
                </button>
              ))}
              <button className="w-10 h-10 rounded-xl bg-secondary-bg text-text-secondary flex items-center justify-center hover:bg-white/10">
                <ChevronRight size={18} />
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  };

  const EventDetailsPage = () => {
    if (!selectedEvent) return null;
    const [ticketQuantities, setTicketQuantities] = useState<{[key: string]: number}>({});

    const handleQuantityChange = (ticketId: string | number, delta: number) => {
      setTicketQuantities(prev => ({
        ...prev,
        [ticketId]: Math.max(0, (prev[ticketId] || 0) + delta)
      }));
    };

    const selectedTickets = Object.entries(ticketQuantities)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([id, qty]) => ({ ticket_type_id: id, quantity: qty as number }));

    const totalPrice = selectedTickets.reduce((sum, item) => {
      const tt = selectedEvent.ticket_types?.find(t => t.id?.toString() === item.ticket_type_id);
      return sum + (tt?.price || 0) * (item.quantity as number);
    }, 0);

    return (
      <div className="pb-24">
        {/* Header Image */}
        <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
          <img 
            src={selectedEvent.image_url || selectedEvent.image || 'https://picsum.photos/seed/event/1200/800'} 
            alt={selectedEvent.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/event/1200/800';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-bg via-primary-bg/20 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-12">
            <div className="max-w-7xl mx-auto">
              <button 
                onClick={() => setView('events')}
                className="flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
              >
                <ArrowLeft size={18} /> Back to Events
              </button>
              {/* Category badge removed as requested */}
              <h1 className="text-4xl md:text-6xl font-bold mb-6">{selectedEvent.title}</h1>
              <div className="flex flex-wrap gap-6 text-lg">
                <div className="flex items-center gap-2"><Calendar className="text-accent" size={20} /> {selectedEvent.event_date || selectedEvent.date} at {selectedEvent.event_time || selectedEvent.time}</div>
                <div className="flex items-center gap-2"><MapPin className="text-accent" size={20} /> {selectedEvent.location}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-2xl font-bold mb-4">About the Event</h2>
              <p className="text-text-secondary text-lg leading-relaxed">
                {selectedEvent.description}
                <br /><br />
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-6">Select Tickets</h2>
              {purchaseError && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm">{purchaseError}</div>}
              <div className="space-y-4">
                {selectedEvent.ticket_types && selectedEvent.ticket_types.length > 0 ? selectedEvent.ticket_types.map((ticket: TicketType) => {
                  const remaining = ticket.quantity_total - ticket.quantity_sold;
                  const isSoldOut = remaining <= 0;
                  const isSaleStarted = new Date(ticket.sale_start) <= new Date();
                  const isSaleEnded = new Date(ticket.sale_end) < new Date();
                  const canBuy = !isSoldOut && isSaleStarted && !isSaleEnded && (selectedEvent.status === 'live' || selectedEvent.status === 'published');
                  const currentQty = ticketQuantities[ticket.id!] || 0;

                  return (
                    <div key={ticket.id} className={`p-6 rounded-2xl border transition-all ${!canBuy ? 'opacity-50 grayscale' : 'bg-secondary-bg border-white/5 hover:border-accent/30'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold mb-1">{ticket.name}</h3>
                          <p className="text-text-secondary text-sm">{ticket.description}</p>
                          <div className="mt-2 flex gap-4 text-xs text-text-secondary">
                            <span>Sale: {new Date(ticket.sale_start).toLocaleDateString()} - {new Date(ticket.sale_end).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-accent">{ticket.price} EGP</div>
                          {remaining > 0 && remaining < 20 && (
                            <span className="text-xs text-red-400 font-bold">Only {remaining} left!</span>
                          )}
                          {isSoldOut && (
                            <span className="text-xs text-text-secondary font-bold uppercase">Sold Out</span>
                          )}
                          {!isSaleStarted && (
                            <span className="text-xs text-blue-400 font-bold uppercase">Starts {new Date(ticket.sale_start).toLocaleDateString()}</span>
                          )}
                          {isSaleEnded && (
                            <span className="text-xs text-text-secondary font-bold uppercase">Sale Ended</span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-text-secondary">
                          {remaining} / {ticket.quantity_total} available
                        </div>
                        
                        {canBuy && (
                          <div className="flex items-center gap-4 bg-primary-bg rounded-xl p-1 border border-white/5">
                            <button 
                              onClick={() => handleQuantityChange(ticket.id!, -1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg transition-colors"
                            >
                              -
                            </button>
                            <span className="font-bold w-4 text-center">{currentQty}</span>
                            <button 
                              onClick={() => handleQuantityChange(ticket.id!, 1)}
                              disabled={currentQty >= remaining}
                              className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg transition-colors disabled:opacity-20"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-12 text-center text-text-secondary bg-secondary-bg rounded-2xl border border-white/5">
                    {selectedEvent.status === 'upcoming' ? 'Tickets will be available soon. Pre-register to get notified!' : 'No tickets available for this event.'}
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-6">Venue & Location</h2>
              <div className="bg-secondary-bg rounded-3xl overflow-hidden h-96 border border-white/5 relative">
                <iframe 
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  scrolling="no" 
                  marginHeight={0} 
                  marginWidth={0} 
                  src={`https://maps.google.com/maps?q=${encodeURIComponent((selectedEvent.venue || '') + ' ' + selectedEvent.location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  title="Event Location"
                ></iframe>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-text-secondary">{selectedEvent.venue}, {selectedEvent.location}</p>
                <Button 
                  variant="ghost" 
                  className="text-accent" 
                  onClick={() => window.open(selectedEvent.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((selectedEvent.venue || '') + ' ' + selectedEvent.location)}`, '_blank')}
                >
                  Open in Maps <ChevronRight size={16} />
                </Button>
              </div>
              {selectedEvent.rules && (
                <div className="mt-8 p-6 bg-secondary-bg rounded-2xl border border-white/5">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Info size={18} className="text-accent" /> Rules of Event
                  </h3>
                  <p className="text-text-secondary text-sm whitespace-pre-wrap">{selectedEvent.rules}</p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Info */}
          <aside className="space-y-8">
            <div className="bg-secondary-bg p-8 rounded-3xl border border-white/5 sticky top-32">
              <h3 className="text-xl font-bold mb-6">Event Details</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1">Date & Time</p>
                    <p className="font-medium">{selectedEvent.event_date || selectedEvent.date} at {selectedEvent.event_time || selectedEvent.time}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1">Venue</p>
                    <p className="font-medium">{selectedEvent.location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1">Organizer</p>
                    <p className="font-medium">{selectedEvent.company_name || selectedEvent.organizer || 'TicketsHub Partner'}</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-white/5">
                {selectedEvent.status === 'upcoming' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-accent/10 border border-accent/20 rounded-2xl text-center">
                      <p className="text-accent font-bold text-sm mb-1">Tickets not available yet</p>
                      <p className="text-xs text-text-secondary">Pre-register to get notified when booking opens.</p>
                      {selectedEvent.pre_registration_count !== undefined && (
                        <p className="text-[10px] text-accent mt-2 font-medium">{selectedEvent.pre_registration_count} people are waiting for this event</p>
                      )}
                    </div>
                    <Button 
                      className="w-full py-4" 
                      onClick={() => handlePreRegister(selectedEvent.id!)}
                      disabled={preRegistrations.some(pr => pr.event_id === selectedEvent.id)}
                    >
                      {preRegistrations.some(pr => pr.event_id === selectedEvent.id) ? 'Pre-Registered' : 'Notify Me'}
                    </Button>
                  </div>
                ) : (
                  <>
                    {selectedTickets.length > 0 && (
                      <div className="mb-6 space-y-3">
                        <p className="text-sm font-bold text-text-secondary uppercase tracking-wider">Booking Summary</p>
                        {selectedTickets.map(item => {
                          const tt = selectedEvent.ticket_types?.find(t => t.id?.toString() === item.ticket_type_id);
                          return (
                            <div key={item.ticket_type_id} className="flex justify-between text-sm">
                              <span>{tt?.name} x {item.quantity}</span>
                              <span>{(tt?.price || 0) * item.quantity} EGP</span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between text-sm text-text-secondary">
                          <span>Service Fee (10%)</span>
                          <span>{(totalPrice * 0.1).toFixed(2)} EGP</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-text-secondary">Total Price</span>
                      <span className="text-2xl font-bold text-accent">{(totalPrice * 1.1).toFixed(2)} EGP</span>
                    </div>
                    <Button 
                      className="w-full py-4" 
                      disabled={selectedTickets.length === 0 || purchaseLoading || selectedEvent.status === 'closed'}
                      onClick={() => handlePurchase(selectedEvent.id!, selectedTickets)}
                    >
                      {selectedEvent.status === 'closed' ? 'Event Closed' : (purchaseLoading ? 'Processing...' : 'Book Now')}
                    </Button>
                  </>
                )}
                <p className="text-center text-xs text-text-secondary mt-4 flex items-center justify-center gap-1">
                  <Info size={12} /> Secure checkout powered by TicketsHub
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  };

  const ConfirmationPage = () => {
    const [qrStatus, setQrStatus] = useState<{ visible: boolean, qr_data?: string, reason?: string } | null>(null);
    const [loadingQr, setLoadingQr] = useState(false);

    useEffect(() => {
      if (lastOrder && lastOrder.order_status === 'paid') {
        setLoadingQr(true);
        fetchWithAuth(`/api/orders/${lastOrder.id}/qr-status`)
        .then(data => {
          if (data) setQrStatus(data);
        })
        .catch(err => console.error('Failed to fetch QR status', err))
        .finally(() => setLoadingQr(false));
      }
    }, [lastOrder, fetchWithAuth]); // FIX: Correct dependencies for QR status fetching

    if (!lastOrder) return null;
    
    const isPaid = lastOrder.order_status === 'paid';
    const isProcessing = lastOrder.order_status === 'approved' && !lastOrder.is_paid;
    
    const refreshOrderStatus = async () => {
      try {
        const data = await fetchWithAuth('/api/orders');
        if (data && Array.isArray(data)) {
          const updated = data.find((o: any) => o.id === lastOrder.id);
          if (updated) setLastOrder(updated);
        }
      } catch (err) {
        console.error('Failed to refresh order status', err);
      }
    };

    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`w-24 h-24 ${isPaid ? 'bg-green-500/20 text-green-500' : isProcessing ? 'bg-yellow-500/20 text-yellow-500' : 'bg-accent/20 text-accent'} rounded-full flex items-center justify-center mx-auto mb-8`}
        >
          {isPaid ? <CheckCircle2 size={48} /> : isProcessing ? <RefreshCw className="animate-spin" size={48} /> : <Clock size={48} />}
        </motion.div>
        
        <h1 className="text-4xl font-bold mb-4">
          {isPaid ? 'Booking Confirmed!' : isProcessing ? 'Processing Payment...' : 'Request Submitted!'}
        </h1>
        
        <p className="text-text-secondary text-lg mb-12">
          {isPaid ? (
            <>Your booking for <span className="text-white font-bold">{lastOrder.event?.title}</span> is confirmed. Your tickets are ready below.</>
          ) : isProcessing ? (
            <>We are waiting for Kashier to confirm your payment for <span className="text-white font-bold">{lastOrder.event?.title}</span>. This usually takes a few seconds.</>
          ) : (
            <>Your booking request for <span className="text-white font-bold">{lastOrder.event?.title}</span> has been submitted for approval. You will be notified once an admin reviews your request.</>
          )}
          <br />
          Order ID: #{lastOrder.id}
        </p>

        {isProcessing && (
          <div className="mb-8">
            <Button variant="outline" onClick={refreshOrderStatus} className="gap-2">
              <RefreshCw size={16} /> Refresh Status
            </Button>
          </div>
        )}

        <div id={`ticket-card-${lastOrder.id}`} className="bg-secondary-bg p-8 rounded-[2.5rem] border border-white/5 mb-12 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-2 ${isPaid ? 'bg-green-500' : isProcessing ? 'bg-yellow-500' : 'bg-accent'}`}></div>
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-48 h-48 bg-white p-4 rounded-2xl relative flex items-center justify-center">
              {loadingQr ? (
                <RefreshCw className="animate-spin text-primary-bg" size={32} />
              ) : qrStatus?.visible ? (
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrStatus.qr_data}`} alt="QR Code" className="w-full h-full" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-primary-bg text-center p-2">
                  <Lock size={32} className="mb-2" />
                  <p className="text-[10px] font-bold uppercase">QR Code Locked</p>
                  <p className="text-[8px]">{qrStatus?.reason || (isProcessing ? 'Waiting for payment confirmation' : 'Available after approval')}</p>
                </div>
              )}
            </div>
            <div className="text-left flex-1">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-2xl font-bold">{lastOrder.event?.title}</h3>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isPaid ? 'bg-green-500/20 text-green-500' : isProcessing ? 'bg-yellow-500/20 text-yellow-500' : 'bg-accent/20 text-accent'}`}>
                  {isProcessing ? 'Payment Processing' : lastOrder.order_status}
                </span>
              </div>
              <div className="space-y-2 text-text-secondary">
                <p className="flex items-center gap-2"><Calendar size={16} /> {lastOrder.event?.event_date} at {lastOrder.event?.event_time}</p>
                <p className="flex items-center gap-2"><MapPin size={16} /> {lastOrder.event?.location}</p>
                <div className="mt-4 pt-4 border-t border-white/5">
                  {lastOrder.items?.map((item, index) => (
                    <p key={item.id || index} className="flex items-center gap-2 text-sm"><Ticket size={14} /> {item.quantity}x {item.name || 'Ticket'}</p>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                {isPaid && (
                  <Button 
                    variant="primary" 
                    className="px-4 py-2 text-sm"
                    onClick={() => handleDownloadPDF(lastOrder)}
                  >
                    <Download size={16} /> Download PDF
                  </Button>
                )}
                <div className="relative group">
                  <Button variant="secondary" className="px-4 py-2 text-sm opacity-50 cursor-not-allowed">Add to Wallet</Button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Coming Soon
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => setView('home')}>Back to Home</Button>
          <Button variant="ghost" onClick={() => setView('user-dashboard')}>View My Tickets</Button>
        </div>
      </div>
    );
  };

  const UserDashboard = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [preRegistrations, setPreRegistrations] = useState<PreRegistration[]>([]);
    const [loading, setLoading] = useState(true);

    const [points, setPoints] = useState({ balance: 0, history: [] as PointsHistory[] });
    const [isResaleModalOpen, setIsResaleModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<OrderTicket | null>(null);
    const [payoutMethod, setPayoutMethod] = useState<'instapay' | 'vodafone'>('instapay');
    const [payoutAddress, setPayoutAddress] = useState('');
    const [activeTab, setActiveTab] = useState<'dashboard' | 'tickets' | 'rewards' | 'profile' | 'payments' | 'pre-registrations'>('dashboard');
    const [ticketFilter, setTicketFilter] = useState<'all' | 'pre_registered' | 'pending' | 'paid' | 'invited'>('all');
    const [viewingTicket, setViewingTicket] = useState<Order | null>(null);
    const [viewingTicketQrStatus, setViewingTicketQrStatus] = useState<{ visible: boolean, qr_data?: string, reason?: string } | null>(null);
    const [loadingViewingQr, setLoadingViewingQr] = useState(false);

    useEffect(() => {
      if (viewingTicket && (viewingTicket.order_status === 'paid' || viewingTicket.order_status === 'invited')) {
        setLoadingViewingQr(true);
        fetchWithAuth(`/api/orders/${viewingTicket.id}/qr-status`)
        .then(data => {
          if (data) setViewingTicketQrStatus(data);
        })
        .catch(err => console.error('Failed to fetch QR status', err))
        .finally(() => setLoadingViewingQr(false));
      } else {
        setViewingTicketQrStatus(null);
      }
    }, [viewingTicket, token]);

    const filteredTickets = useMemo(() => {
      const allOrders = orders.map(o => ({ ...o, type: 'order' as const }));
      const allPreReg = preRegistrations.map(p => ({ ...p, type: 'pre_reg' as const }));
      
      if (ticketFilter === 'all') {
        return [
          ...allOrders.map(o => ({ ...o, displayStatus: o.order_status })),
          ...allPreReg.map(p => ({ ...p, displayStatus: 'pre_registered' as const }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      
      if (ticketFilter === 'pre_registered') {
        return allPreReg.map(p => ({ ...p, displayStatus: 'pre_registered' as const }));
      }
      
      if (ticketFilter === 'pending') {
        return allOrders
          .filter(o => o.order_status === 'pending' || o.order_status === 'requested' || o.order_status === 'approved')
          .map(o => ({ ...o, displayStatus: o.order_status }));
      }
      
      if (ticketFilter === 'paid') {
        return allOrders
          .filter(o => o.order_status === 'paid')
          .map(o => ({ ...o, displayStatus: o.order_status }));
      }
      
      if (ticketFilter === 'invited') {
        return allOrders
          .filter(o => o.order_status === 'invited')
          .map(o => ({ ...o, displayStatus: o.order_status }));
      }
      
      return [];
    }, [orders, preRegistrations, ticketFilter]);

    const hasFetchedRef = useRef(false);
    useEffect(() => {
      if (token && !hasFetchedRef.current) {
        hasFetchedRef.current = true;
        setLoading(true);
        // FIX: Standardized fetch for UserPage data
        const loadData = async () => {
          try {
            const [ordersData, preRegData, pointsData] = await Promise.all([
              fetchWithAuth('/api/orders'),
              fetchWithAuth('/api/pre-registrations'),
              fetchWithAuth('/api/user/points')
            ]);
            
            if (ordersData) setOrders(ordersData);
            if (preRegData) setPreRegistrations(preRegData);
            if (pointsData) setPoints(pointsData);
          } catch (err) {
            console.error('Failed to load user dashboard data', err);
            hasFetchedRef.current = false;
          } finally {
            setLoading(false);
          }
        };
        loadData();
      }
    }, [token, fetchWithAuth]); // FIX: Correct dependencies

    const handleResaleRequest = async () => {
      if (!selectedTicket || !payoutAddress) return;
      try {
        const data = await fetchWithAuth('/api/tickets/resale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ticket_id: selectedTicket.id, 
            payout_method: payoutMethod, 
            payout_address: payoutAddress 
          })
        });
        if (data) {
          alert('Resale request submitted successfully.');
          setIsResaleModalOpen(false);
          // Refresh orders
          const updatedOrders = await fetchWithAuth('/api/orders');
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
                              <p className="text-xs text-text-secondary mb-2">{order.event?.event_date}</p>
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
                      <Button variant="accent" className="mt-4" onClick={() => setView('events')}>Explore Events</Button>
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
                            <p className="text-xs text-text-secondary mb-2">{item.event?.event_date}</p>
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
                                        fetchWithAuth(`/api/orders/${item.id}/pay`, {
                                          method: 'PUT'
                                        }).then(data => data && window.location.reload());
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
                                          fetchWithAuth(`/api/orders/${item.id}/pay`, {
                                            method: 'PUT'
                                          }).then(data => data && window.location.reload());
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
                                          fetchWithAuth(`/api/orders/${item.id}/reject`, {
                                            method: 'PUT'
                                          }).then(data => data && window.location.reload());
                                        }
                                      }}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                )}
                                {(item.order_status === 'pending' || item.order_status === 'requested') && (
                                  <span className="text-[10px] text-yellow-500 font-bold">Waiting for approval</span>
                                )}
                              </>
                            ) : (
                              <Button 
                                variant={item.event?.status === 'live' || item.event?.status === 'published' ? 'primary' : 'outline'} 
                                className="px-3 py-1.5 text-xs" 
                                onClick={() => {
                                  if (item.event) {
                                    setSelectedEvent(item.event);
                                    setView('event-details');
                                  }
                                }}
                              >
                                {item.event?.status === 'live' || item.event?.status === 'published' ? 'Book Now' : 'View Event'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-secondary-bg rounded-3xl border border-dashed border-white/10">
                    <Ticket size={48} className="mx-auto text-text-secondary mb-4 opacity-20" />
                    <p className="text-text-secondary">No tickets found in this category.</p>
                    <Button variant="accent" className="mt-4" onClick={() => setView('events')}>Explore Events</Button>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'rewards' && (
              <section className="space-y-8">
                <h3 className="text-2xl font-bold">Rewards & Points</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-accent rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                    <div className="relative z-10">
                      <p className="text-accent-foreground/60 font-bold uppercase tracking-widest text-xs mb-2">Available Points</p>
                      <h4 className="text-5xl font-bold mb-8">{points.balance}</h4>
                      <Button 
                        variant="secondary" 
                        className="bg-accent text-white hover:bg-accent/90"
                        onClick={async () => {
                          if (points.balance >= 100) {
                            if (confirm('Redeem 100 points for a 10% discount voucher?')) {
                              try {
                                const data = await fetchWithAuth('/api/user/redeem', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ points_to_redeem: 100 })
                                });
                                if (data && data.voucher) {
                                  alert(`Voucher created: ${data.voucher.code}`);
                                  const pointsData = await fetchWithAuth('/api/user/points');
                                  if (pointsData) setPoints(pointsData);
                                }
                              } catch (err) {
                                console.error('Failed to redeem points', err);
                              }
                            }
                          } else {
                            alert('You need at least 100 points to redeem.');
                          }
                        }}
                      >
                        Redeem 100 pts
                      </Button>
                    </div>
                    <Star size={120} className="absolute -right-8 -bottom-8 text-white/10 rotate-12" fill="currentColor" />
                  </div>
                  <div className="bg-secondary-bg rounded-[2.5rem] p-8 border border-white/5">
                    <h4 className="font-bold mb-4">How to earn points?</h4>
                    <ul className="space-y-4">
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                          <Plus size={14} />
                        </div>
                        <p className="text-sm text-text-secondary"><span className="text-white font-bold">10 points</span> for every ticket purchased.</p>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                          <Plus size={14} />
                        </div>
                        <p className="text-sm text-text-secondary"><span className="text-white font-bold">50 points</span> for referring a friend.</p>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-secondary-bg rounded-[2.5rem] border border-white/5 overflow-hidden">
                  <div className="p-6 border-b border-white/5">
                    <h4 className="font-bold">Points History</h4>
                  </div>
                  <div className="divide-y divide-white/5">
                    {points.history && points.history.length > 0 ? (
                      points.history.map((h: any, i: number) => (
                        <div key={h.id || `${h.created_at}-${i}`} className="p-6 flex items-center justify-between">
                          <div>
                            <p className="font-bold">{h.reason}</p>
                            <p className="text-xs text-text-secondary">{h.created_at}</p>
                          </div>
                          <p className={`font-bold ${h.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {h.points > 0 ? '+' : ''}{h.points}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center text-text-secondary">No history yet.</div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'profile' && (
              <section className="max-w-2xl">
                <h3 className="text-2xl font-bold mb-8">Profile Settings</h3>
                <div className="bg-secondary-bg rounded-[2.5rem] p-8 border border-white/5 space-y-6">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                      <User size={40} />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">{user?.name}</h4>
                      <p className="text-text-secondary">{user?.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Full Name</label>
                      <input type="text" value={user?.name} readOnly className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 text-text-secondary outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Email Address</label>
                      <input type="email" value={user?.email} readOnly className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 text-text-secondary outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Age</label>
                      <input type="text" value={calculateAge(user?.birthdate)} readOnly className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 text-text-secondary outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Instagram</label>
                      <input type="text" value={user?.instagram_username || 'N/A'} readOnly className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 text-text-secondary outline-none" />
                    </div>
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
                      src={viewingTicket.event?.image_url || 'https://picsum.photos/seed/event/800/400'} 
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
                        {viewingTicket.items?.[0]?.name || 'Standard Entry'}
                      </span>
                      <h2 className="text-xl font-black text-white leading-tight line-clamp-1">{viewingTicket.event?.title}</h2>
                    </div>
                  </div>

                  <div id={`ticket-card-${viewingTicket.id}`} className="p-6 space-y-6">
                    {/* Event Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-0.5">
                        <p className="text-[9px] text-text-secondary font-black uppercase tracking-widest">Date & Time</p>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Calendar size={12} className="text-accent" />
                          {viewingTicket.event?.event_date}
                        </p>
                        <p className="text-[10px] text-text-secondary pl-4">{viewingTicket.event?.event_time}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] text-text-secondary font-black uppercase tracking-widest">Location</p>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <MapPin size={12} className="text-accent" />
                          {viewingTicket.event?.location}
                        </p>
                        <p className="text-[10px] text-text-secondary pl-4 line-clamp-1">{viewingTicket.event?.venue}</p>
                      </div>
                    </div>

                    {/* Ticket Holders Section */}
                    <div className="space-y-3">
                      <p className="text-[9px] text-text-secondary font-black uppercase tracking-widest border-b border-white/5 pb-1.5">Ticket Holders</p>
                      <div className="space-y-2 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                        {viewingTicket.items?.map((item) => (
                          <div key={item.id} className="space-y-1.5">
                            {item.ticket_holders && item.ticket_holders.length > 0 ? (
                              item.ticket_holders.map((holder: any, j: number) => (
                                <div key={`${holder.first_name}-${holder.last_name}-${j}`} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 bg-accent/10 rounded-full flex items-center justify-center text-accent font-bold text-[10px]">
                                      {holder.first_name?.[0]}{holder.last_name?.[0]}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-white">{holder.first_name} {holder.last_name}</p>
                                      <p className="text-[9px] text-text-secondary">{item.name}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[9px] text-text-secondary uppercase font-bold">ID: #{viewingTicket.id}-{item.id}-{j}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 bg-accent/10 rounded-full flex items-center justify-center text-accent font-bold text-[10px]">
                                    {user?.name?.[0]}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-white">{user?.name}</p>
                                    <p className="text-[9px] text-text-secondary">{item.name}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* QR Code Section - Conditional Visibility */}
                    <div className="pt-6 border-t border-dashed border-white/10 flex flex-col items-center">
                      {(() => {
                        const isPaid = viewingTicket.order_status === 'paid' || viewingTicket.order_status === 'invited';

                        if (!isPaid) {
                          return (
                            <div className="text-center p-6 bg-yellow-500/10 rounded-3xl border border-yellow-500/20 w-full">
                              <Lock size={24} className="mx-auto text-yellow-500 mb-2" />
                              <p className="text-sm font-bold text-yellow-500">
                                {viewingTicket.order_status === 'approved' ? 'Payment Required' : 'Pending Approval'}
                              </p>
                              <p className="text-xs text-text-secondary mt-1">
                                {viewingTicket.order_status === 'approved' ? 'Complete payment to see QR' : 'Waiting for admin to approve'}
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
                                <p className="text-xs font-bold text-accent">Order ID: #{viewingTicket.id}</p>
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
                        onClick={() => handleDownloadPDF(viewingTicket)}
                      >
                        <Download size={14} /> Download PDF
                      </Button>
                      
                      {viewingTicket.order_status === 'paid' && (
                        <Button 
                          variant="secondary" 
                          className="flex-1 py-4 rounded-2xl text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 border-none" 
                          onClick={() => {
                            const ticketToResell = viewingTicket.items && viewingTicket.items.length > 0 ? viewingTicket.items[0] : null;
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

                      {viewingTicket.order_status === 'approved' && (
                        <Button 
                          variant="primary" 
                          className="flex-1 py-4 rounded-2xl text-xs shadow-lg shadow-accent/30" 
                          onClick={() => {
                            if (confirm('Proceed to payment? (Simulated)')) {
                              fetchWithAuth(`/api/orders/${viewingTicket.id}/pay`, {
                                method: 'PUT'
                              }).then(data => data && window.location.reload());
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

  const QRScannerTab = ({ token, events }: { token: string | null, events: Event[] }) => {
    const [scanResult, setScanResult] = useState<{ success: boolean; message: string; ticket?: any; scanned_count?: number } | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [cameraError, setCameraError] = useState<string | null>(null);

    const startScanning = async () => {
      setScanResult(null);
      setCameraError(null);

      // Check for secure connection
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isSecure) {
        setCameraError("Camera requires secure connection (HTTPS)");
        return;
      }

      try {
        // Request camera access properly
        await navigator.mediaDevices.getUserMedia({ video: true });
        setIsScanning(true);
      } catch (err: any) {
        console.error("Camera access error:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError("Camera access denied. Please allow camera permission and try again.");
        } else {
          setCameraError(`Camera error: ${err.message || 'Something went wrong'}`);
        }
      }
    };

    useEffect(() => {
      let scanner: any = null;
      if (isScanning && selectedEventId) {
        import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
          scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
          scanner.render((decodedText: string) => {
            // Expected format: TicketsHub-Order-123 or TicketsHub-Ticket-456
            const match = decodedText.match(/TicketsHub-(Order|Ticket)-(\d+)/);
            if (match) {
              const ticketId = match[2];
              handleScan(ticketId);
              scanner.clear();
              setIsScanning(false);
            }
          }, (error: any) => {
            // console.warn(error);
          });
        }).catch(err => {
          setCameraError("Failed to load scanner library.");
          setIsScanning(false);
        });
      }
      return () => {
        if (scanner) {
          scanner.clear().catch((err: any) => console.error("Failed to clear scanner", err));
        }
      };
    }, [isScanning, selectedEventId]);

    const handleScan = async (ticketId: string) => {
      try {
        const data = await fetchWithAuth('/api/admin/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket_id: ticketId, event_id: selectedEventId })
        });
        if (data) {
          setScanResult({ success: true, message: data.message, ticket: data.ticket });
        }
      } catch (err: any) {
        // FIX: Handle specific scan errors from backend
        try {
          const errorData = JSON.parse(err.message);
          setScanResult({ 
            success: false, 
            message: errorData.error || 'Scan failed', 
            scanned_count: errorData.scanned_count 
          });
        } catch {
          setScanResult({ success: false, message: err.message || 'Failed to connect to server.' });
        }
      }
    };

    return (
      <div className="space-y-8">
        <div className="bg-secondary-bg p-8 rounded-3xl border border-white/5">
          <h3 className="text-xl font-bold mb-6">Event Entry Scanner</h3>
          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Select Event</label>
              <select 
                value={selectedEventId} 
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
              >
                <option value="">Select an event...</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="primary" 
                className="w-full py-3" 
                disabled={!selectedEventId || isScanning}
                onClick={startScanning}
              >
                {isScanning ? 'Scanner Active' : 'Start Scanning'}
              </Button>
            </div>
          </div>

          {cameraError && (
            <div className="mt-6 p-6 bg-red-400/10 border border-red-400/20 rounded-3xl text-center">
              <div className="flex items-center justify-center gap-3 text-red-400 mb-4">
                <AlertCircle size={24} />
                <p className="font-bold">{cameraError}</p>
              </div>
              <div className="text-sm text-text-secondary mb-6 space-y-2">
                <p>To fix this:</p>
                <p className="font-medium text-white">Click the lock icon in the browser → allow camera → refresh page</p>
              </div>
              <Button variant="outline" onClick={startScanning}>
                <RefreshCw size={18} className="mr-2" /> Retry
              </Button>
            </div>
          )}

          {isScanning && (
            <div className="max-w-md mx-auto bg-black rounded-2xl overflow-hidden border border-white/10">
              <div id="reader"></div>
              <Button variant="outline" className="w-full rounded-none border-0" onClick={() => setIsScanning(false)}>Cancel</Button>
            </div>
          )}

          {scanResult && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-8 p-8 rounded-3xl border ${scanResult.success ? 'bg-green-400/10 border-green-400/20' : 'bg-red-400/10 border-red-400/20'}`}
            >
              <div className="flex items-center gap-4 mb-4">
                {scanResult.success ? (
                  <CheckCircle2 className="text-green-400" size={32} />
                ) : (
                  <X className="text-red-400" size={32} />
                )}
                <h4 className={`text-2xl font-bold ${scanResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {scanResult.success ? 'Access Granted' : 'Access Denied'}
                </h4>
              </div>
              <p className="text-lg mb-4">{scanResult.message}</p>
              {scanResult.scanned_count !== undefined && (
                <p className="font-bold text-red-400">Previous scans: {scanResult.scanned_count}</p>
              )}
              {scanResult.ticket && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                  <p className="text-sm text-text-secondary">Ticket ID: <span className="text-white font-mono">#{scanResult.ticket.id}</span></p>
                  <p className="text-sm text-text-secondary">Type: <span className="text-white">{scanResult.ticket.name}</span></p>
                </div>
              )}
              <Button variant="outline" className="mt-6" onClick={() => setScanResult(null)}>Clear Result</Button>
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  const InvitationModal = ({ onClose, onSuccess, token, events }: { onClose: () => void, onSuccess: () => void, token: string | null, events: Event[] }) => {
    const [email, setEmail] = useState('');
    const [eventId, setEventId] = useState('');
    const [ticketTypeId, setTicketTypeId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      try {
        const data = await fetchWithAuth('/api/admin/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, event_id: eventId, ticket_type_id: ticketTypeId })
        });
        if (data) {
          onSuccess();
          onClose();
        }
      } catch (err: any) {
        try {
          const errorData = JSON.parse(err.message);
          setError(errorData.error || 'Failed to send invitation');
        } catch {
          setError(err.message || 'Error sending invitation');
        }
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-secondary-bg w-full max-w-md rounded-3xl p-8 border border-white/10 relative"
        >
          <button onClick={onClose} className="absolute top-6 right-6 text-text-secondary hover:text-white">
            <X size={24} />
          </button>
          
          <h2 className="text-2xl font-bold mb-6">Send Invitation</h2>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">User Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Event</label>
              <select 
                required
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
              >
                <option value="">Select Event</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>
            {eventId && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Ticket Type</label>
                <select 
                  required
                  value={ticketTypeId}
                  onChange={(e) => setTicketTypeId(e.target.value)}
                  className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                >
                  <option value="">Select Ticket Type</option>
                  {events.find(ev => String(ev.id) === String(eventId))?.ticket_types?.map(tt => (
                    <option key={tt.id} value={tt.id}>{tt.name}</option>
                  ))}
                </select>
              </div>
            )}
            <Button type="submit" className="w-full py-4" disabled={loading}>
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </form>
        </motion.div>
      </div>
    );
  };

  const VoucherModal = ({ isOpen, onClose, onSuccess, token }: { isOpen: boolean, onClose: () => void, onSuccess: () => void, token: string | null }) => {
    const [code, setCode] = useState('');
    const [discount, setDiscount] = useState('');
    const [maxUses, setMaxUses] = useState('');
    const [expiry, setExpiry] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!code || !discount || !maxUses || !expiry) {
        setError('All fields are required');
        return;
      }

      setIsSubmitting(true);
      try {
        const data = await fetchWithAuth('/api/admin/vouchers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            code, 
            discount_percent: parseInt(discount) || 0, 
            max_uses: parseInt(maxUses) || 0, 
            expiration_date: expiry,
            name: `Admin Created: ${code}`
          })
        });
        
        if (data) {
          onSuccess();
          onClose();
        }
      } catch (err: any) {
        try {
          const errorData = JSON.parse(err.message);
          setError(errorData.error || 'Failed to create voucher');
        } catch {
          setError(err.message || 'Error creating voucher');
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-primary-bg/90 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-secondary-bg w-full max-w-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl"
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Create Voucher</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Voucher Code</label>
              <input 
                type="text" 
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="E.g. SUMMER2024"
                className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Discount (%)</label>
                <input 
                  type="number" 
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  placeholder="10"
                  className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Max Uses</label>
                <input 
                  type="number" 
                  value={maxUses}
                  onChange={e => setMaxUses(e.target.value)}
                  placeholder="100"
                  className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Expiration Date</label>
              <input 
                type="date" 
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
              />
            </div>

            <Button type="submit" className="w-full py-4" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Voucher'}
            </Button>
          </form>
        </motion.div>
      </div>
    );
  };

  const AdminDashboard = React.memo(({ 
    user, 
    token, 
    events, 
    setEvents, 
    settings, 
    setSettings,
    setEditingEvent,
    setIsEventModalOpen,
    fetchWithAuth
  }: { 
    user: UserProfile | null, 
    token: string | null, 
    events: Event[], 
    setEvents: (events: Event[]) => void,
    settings: any,
    setSettings: (settings: any) => void,
    setEditingEvent: (event: Event | null) => void,
    setIsEventModalOpen: (open: boolean) => void,
    fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<any>
  }) => {
    const [activeTab, setActiveTab] = useState<'events' | 'orders' | 'users' | 'vouchers' | 'resale' | 'scanner' | 'settings' | 'invitations'>(() => {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab');
      const validTabs = ['events', 'orders', 'users', 'vouchers', 'resale', 'scanner', 'settings', 'invitations'];
      if (t && validTabs.includes(t)) return t as any;
      return 'events';
    });

    useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') !== activeTab) {
        params.set('tab', activeTab);
        window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
      }
    }, [activeTab]);

    useEffect(() => {
      const handlePopState = () => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab');
        const validTabs = ['events', 'orders', 'users', 'vouchers', 'resale', 'scanner', 'settings', 'invitations'];
        if (t && validTabs.includes(t)) {
          setActiveTab(t as any);
        }
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }, []);
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [allVouchers, setAllVouchers] = useState<Voucher[]>([]);
    const [allResellRequests, setAllResellRequests] = useState<ResellRequest[]>([]);
    const [allInvitations, setAllInvitations] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

    const myEvents = events;

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const data = await fetchWithAuth('/api/admin/orders');
        if (data) setAllOrders(data);
      } catch (err) {
        console.error('Failed to fetch orders', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const data = await fetchWithAuth('/api/users');
        if (data) setAllUsers(data);
      } catch (err) {
        console.error('Failed to fetch users', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchVouchers = async () => {
      setLoading(true);
      try {
        const data = await fetchWithAuth('/api/vouchers');
        if (data) setAllVouchers(data);
      } catch (err) {
        console.error('Failed to fetch vouchers', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchResellRequests = async () => {
      setLoading(true);
      try {
        const data = await fetchWithAuth('/api/resell');
        if (data) setAllResellRequests(data);
      } catch (err) {
        console.error('Failed to fetch resell requests', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchInvitations = async () => {
      setLoading(true);
      try {
        const data = await fetchWithAuth('/api/admin/invitations');
        if (data) setAllInvitations(data);
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
    }, [activeTab, fetchWithAuth]); // FIX: Correct dependencies

    const handleUpdateUserRole = async (userId: number, newRole: 'admin' | 'user') => {
      try {
        const data = await fetchWithAuth(`/api/users/${userId}/role`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole })
        });
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
      const data = await fetchWithAuth(`/api/events/${id}`, {
        method: 'DELETE'
      });
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
      const data = await fetchWithAuth(`/api/admin/invitations/${id}`, {
        method: 'DELETE'
      });
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
          token={token} 
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
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { label: 'Total Revenue', value: `${events.reduce((sum, e) => sum + (e.ticket_types?.reduce((s, tt) => s + tt.price * tt.quantity_sold, 0) || 0), 0)} EGP`, icon: <TrendingUp className="text-green-400" />, trend: '0%' },
                    { label: 'Tickets Sold', value: events.reduce((sum, e) => sum + (e.ticket_types?.reduce((s, tt) => s + tt.quantity_sold, 0) || 0), 0).toString(), icon: <Ticket className="text-accent" />, trend: '0%' },
                    { label: 'Active Events', value: myEvents.length.toString(), icon: <Calendar className="text-blue-400" />, trend: '0%' }
                  ].map((stat) => (
                    <div key={stat.label} className="bg-secondary-bg p-6 rounded-3xl border border-white/5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-primary-bg rounded-2xl flex items-center justify-center">{stat.icon}</div>
                        <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-lg">{stat.trend}</span>
                      </div>
                      <p className="text-text-secondary text-sm mb-1">{stat.label}</p>
                      <h4 className="text-3xl font-bold">{stat.value}</h4>
                    </div>
                  ))}
                </div>

                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">All Events</h3>
                  </div>
                  <div className="bg-secondary-bg rounded-3xl border border-white/5 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="px-6 py-4 text-sm font-bold text-text-secondary">Event Name</th>
                          <th className="px-6 py-4 text-sm font-bold text-text-secondary">Date</th>
                          <th className="px-6 py-4 text-sm font-bold text-text-secondary">Status</th>
                          <th className="px-6 py-4 text-sm font-bold text-text-secondary">Pre-Reg</th>
                          <th className="px-6 py-4 text-sm font-bold text-text-secondary">Tickets</th>
                          <th className="px-6 py-4 text-sm font-bold text-text-secondary">QR Status</th>
                          <th className="px-6 py-4 text-sm font-bold text-text-secondary">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myEvents.length > 0 ? myEvents.map(event => (
                          <tr key={event.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-medium">{event.title}</td>
                            <td className="px-6 py-4 text-sm text-text-secondary">{event.event_date}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                event.status === 'live' || event.status === 'published' ? 'bg-green-400/10 text-green-400' : 
                                event.status === 'upcoming' ? 'bg-blue-400/10 text-blue-400' :
                                event.status === 'closed' ? 'bg-red-400/10 text-red-400' :
                                'bg-yellow-400/10 text-yellow-400'
                              }`}>
                                {event.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-accent font-bold">{event.pre_registration_count || 0}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-text-secondary">{event.ticket_types?.length || 0} types</span>
                            </td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={async () => {
                                  try {
                                    const data = await fetchWithAuth(`/api/events/${event.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ ...event, qr_enabled_manual: !event.qr_enabled_manual })
                                    });
                                    if (data) {
                                      setEvents(events.map(e => e.id === event.id ? data : e));
                                    }
                                  } catch (err) {
                                    console.error('Failed to toggle QR visibility', err);
                                  }
                                }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                                  event.qr_enabled_manual ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-text-secondary hover:bg-white/10'
                                }`}
                              >
                                {event.qr_enabled_manual ? <CheckCircle2 size={12} /> : <Lock size={12} />}
                                {event.qr_enabled_manual ? 'QR Visible' : 'QR Hidden'}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button onClick={() => handleEditEvent(event)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-accent"><Settings size={18} /></button>
                                <button onClick={() => handleDeleteEvent(event.id!)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-red-400"><Trash2 size={18} /></button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-text-secondary italic">No events found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {activeTab === 'orders' && (
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
                                      const data = await fetchWithAuth(`/api/orders/${order.id}/approve`, {
                                        method: 'PUT'
                                      });
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
                                      const data = await fetchWithAuth(`/api/orders/${order.id}/reject`, {
                                        method: 'PUT'
                                      });
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
                          <td colSpan={6} className="px-6 py-12 text-center text-text-secondary italic">No orders found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'users' && (
              <section>
                {loading && allUsers.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 bg-secondary-bg rounded-3xl border border-white/5 mb-8">
                    <RefreshCw className="w-12 h-12 text-accent animate-spin mb-4" />
                    <p className="text-text-secondary font-medium">Loading users...</p>
                  </div>
                )}
                <div className="bg-secondary-bg rounded-3xl border border-white/5 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">User</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Email</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Role</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Joined</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.length > 0 ? allUsers.map(u => (
                        <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium">{u.name}</td>
                          <td className="px-6 py-4 text-sm text-text-secondary">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-400/10 text-purple-400' : 'bg-blue-400/10 text-blue-400'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-text-secondary">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <select 
                              value={u.role} 
                              onChange={(e) => handleUpdateUserRole(u.id, e.target.value as any)}
                              className="bg-primary-bg border border-white/10 rounded-lg px-2 py-1 text-xs focus:border-accent outline-none"
                              disabled={u.email === user?.email}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-text-secondary italic">No users found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'vouchers' && (
              <section className="space-y-6">
                {loading && allVouchers.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 bg-secondary-bg rounded-3xl border border-white/5 mb-8">
                    <RefreshCw className="w-12 h-12 text-accent animate-spin mb-4" />
                    <p className="text-text-secondary font-medium">Loading vouchers...</p>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Voucher Management</h3>
                  <Button variant="primary" onClick={() => setIsVoucherModalOpen(true)}>
                    <PlusCircle size={20} /> Create Voucher
                  </Button>
                </div>
                <div className="bg-secondary-bg rounded-3xl border border-white/5 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Code</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Discount</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Usage</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Created By</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Status</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allVouchers.length > 0 ? allVouchers.map(v => (
                        <tr key={v.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium">{v.code}</td>
                          <td className="px-6 py-4">{v.discount_percent}%</td>
                          <td className="px-6 py-4 text-sm">{v.current_uses} / {v.max_uses}</td>
                          <td className="px-6 py-4 text-sm">{v.creatorName}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                              v.status === 'active' ? 'bg-green-400/10 text-green-400' : 
                              v.status === 'expired' ? 'bg-red-400/10 text-red-400' : 
                              'bg-gray-400/10 text-gray-400'
                            }`}>
                              {v.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-text-secondary">{new Date(v.expiration_date).toLocaleDateString()}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-text-secondary italic">No vouchers found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'resale' && (
              <section className="space-y-6">
                {loading && allResellRequests.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 bg-secondary-bg rounded-3xl border border-white/5 mb-8">
                    <RefreshCw className="w-12 h-12 text-accent animate-spin mb-4" />
                    <p className="text-text-secondary font-medium">Loading resale requests...</p>
                  </div>
                )}
                <h3 className="text-xl font-bold">Resale Management</h3>
                <div className="bg-secondary-bg rounded-3xl border border-white/5 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">User</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Payout Method</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Address</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Amount</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Status</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allResellRequests.length > 0 ? allResellRequests.map(r => (
                        <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium">{r.userName}</td>
                          <td className="px-6 py-4 text-sm uppercase">{r.payout_method}</td>
                          <td className="px-6 py-4 text-sm">{r.payout_address}</td>
                          <td className="px-6 py-4 font-bold text-accent">{r.amount} EGP</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                              r.status === 'paid' ? 'bg-green-400/10 text-green-400' : 
                              r.status === 'resold' ? 'bg-blue-400/10 text-blue-400' : 
                              'bg-yellow-400/10 text-yellow-400'
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
                                      const data = await fetchWithAuth(`/api/admin/resale/${r.id}/payout`, {
                                        method: 'PUT'
                                      });
                                      if (data) fetchResellRequests();
                                    } catch (err) {
                                      console.error('Failed to mark resale paid', err);
                                    }
                                  }
                                }}
                                className="text-accent hover:underline text-sm font-bold"
                              >
                                Mark Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-text-secondary italic">No resale requests found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'scanner' && <QRScannerTab token={token} events={events} />}

            {activeTab === 'invitations' && (
              <section className="space-y-6">
                {loading && allInvitations.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 bg-secondary-bg rounded-3xl border border-white/5 mb-8">
                    <RefreshCw className="w-12 h-12 text-accent animate-spin mb-4" />
                    <p className="text-text-secondary font-medium">Loading invitations...</p>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Admin Invitations</h3>
                  <Button variant="primary" onClick={() => setIsInvitationModalOpen(true)}>
                    <PlusCircle size={20} /> Send Invitation
                  </Button>
                </div>
                {isInvitationModalOpen && (
                  <InvitationModal 
                    onClose={() => setIsInvitationModalOpen(false)} 
                    onSuccess={() => {
                      fetchInvitations();
                      alert('Invitation sent successfully!');
                    }} 
                    token={token}
                    events={events}
                  />
                )}
                <div className="bg-secondary-bg rounded-3xl border border-white/5 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Email</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Event</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Ticket Type</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Status</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary">Date</th>
                        <th className="px-6 py-4 text-sm font-bold text-text-secondary text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allInvitations.length > 0 ? allInvitations.map(inv => (
                        <tr key={inv.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium">{inv.email}</td>
                          <td className="px-6 py-4 text-sm">{inv.event?.title || 'Unknown Event'}</td>
                          <td className="px-6 py-4 text-sm">{inv.ticket_type_name || 'Standard'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                              inv.status === 'accepted' ? 'bg-green-400/10 text-green-400' : 
                              'bg-yellow-400/10 text-yellow-400'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-text-secondary">{new Date(inv.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => setDeleteConfirm({ type: 'invitation', id: inv.id })}
                              className="text-red-500 hover:text-red-400 p-2"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-text-secondary italic">No invitations found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'settings' && (
              <section className="max-w-2xl space-y-8">
                <div className="bg-secondary-bg p-8 rounded-3xl border border-white/5 space-y-8">
                  <h3 className="text-xl font-bold mb-6">General Settings</h3>
                  
                  <div className="space-y-4">
                    <label className="block text-sm font-medium">Service Fee (%)</label>
                    <div className="flex gap-4">
                      <input 
                        type="number" 
                        value={settings.service_fee_percent} 
                        onChange={e => setSettings({ ...settings, service_fee_percent: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                        className="flex-1 bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                      />
                      <Button variant="primary" disabled={isSavingSettings} onClick={async () => {
                        setIsSavingSettings(true);
                        try {
                          const data = await fetchWithAuth('/api/settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(settings)
                          });
                          if (data) alert('Settings saved!');
                        } catch (err) {
                          alert('Failed to save settings');
                        } finally {
                          setIsSavingSettings(false);
                        }
                      }}>{isSavingSettings ? 'Saving...' : 'Save'}</Button>
                    </div>
                    <p className="text-xs text-text-secondary">This fee will be added to the total ticket price at checkout.</p>
                  </div>


                </div>
              </section>
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar 
        user={user}
        view={view}
        setView={setView}
        setIsLoginModalOpen={setIsLoginModalOpen}
        setIsSignupModalOpen={setIsSignupModalOpen}
        handleLogout={handleLogout}
        notifications={notifications}
        isNotificationsOpen={isNotificationsOpen}
        setIsNotificationsOpen={setIsNotificationsOpen}
        markNotificationRead={markNotificationRead}
        events={events}
        setSelectedEvent={setSelectedEvent}
      />
      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onOpenSignup={() => setIsSignupModalOpen(true)}
        onLoginSuccess={handleLoginSuccess}
      />
      <SignupModal 
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onSignupSuccess={handleSignupSuccess}
        signupForm={signupForm}
        setSignupForm={setSignupForm}
      />
      <EventModal 
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        editingEvent={editingEvent}
        setEditingEvent={setEditingEvent}
        events={events}
        setEvents={setEvents}
        token={token}
        fetchWithAuth={fetchWithAuth}
      />
      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        user={user}
        bookingData={bookingData}
        purchaseError={purchaseError}
        purchaseLoading={purchaseLoading}
        handlePurchase={handlePurchase}
        bookingForm={bookingForm}
        setBookingForm={setBookingForm}
      />
      
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {view === 'home' && <HomePage />}
            {view === 'events' && <EventsListingPage />}
            {view === 'details' && <EventDetailsPage />}
            {view === 'checkout' && (
              <CheckoutPage 
                lastOrder={lastOrder}
                checkoutOrderId={checkoutOrderId}
                token={token}
                user={user}
                setView={setView}
                setIsLoginModalOpen={setIsLoginModalOpen}
                fetchWithAuth={fetchWithAuth}
              />
            )}
            {view === 'confirmation' && <ConfirmationPage />}
            {view === 'payment-success' && (
              <PaymentSuccessPage 
                order={lastOrder} 
                orderId={checkoutOrderId}
                setView={setView} 
                fetchWithAuth={fetchWithAuth} 
              />
            )}
            {view === 'payment-failure' && (
              <PaymentFailurePage 
                order={lastOrder} 
                orderId={checkoutOrderId}
                setView={setView} 
                setCheckoutOrderId={setCheckoutOrderId}
                fetchWithAuth={fetchWithAuth} 
              />
            )}
            {view === 'payment-pending' && (
              <PaymentPendingPage 
                order={lastOrder} 
                orderId={checkoutOrderId}
                setView={setView} 
                fetchWithAuth={fetchWithAuth} 
              />
            )}
            {view === 'user-dashboard' && <UserDashboard />}
            {view === 'admin-dashboard' && (
              <AdminDashboard 
                user={user}
                token={token}
                events={events}
                setEvents={setEvents}
                settings={settings}
                setSettings={setSettings}
                setEditingEvent={setEditingEvent}
                setIsEventModalOpen={setIsEventModalOpen}
                fetchWithAuth={fetchWithAuth}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer setView={setView} />
    </div>
  );
}

// --- Sub-components moved outside to prevent remount loops ---

const CheckoutPage = ({ 
  lastOrder, 
  checkoutOrderId, 
  token, 
  user, 
  setView, 
  setIsLoginModalOpen, 
  fetchWithAuth 
}: { 
  lastOrder: Order | null;
  checkoutOrderId: number | null;
  token: string | null;
  user: any;
  setView: (view: View) => void;
  setIsLoginModalOpen: (open: boolean) => void;
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<any>;
}) => {
  const { order, loading, error } = useOrder(checkoutOrderId, fetchWithAuth);
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const serviceFee = order ? order.total_price * 0.1 : 0;
  const finalTotal = order ? order.total_price + serviceFee : 0;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processing) return;

    const currentToken = token || localStorage.getItem('token');

    if (!currentToken || !user) {
      setIsLoginModalOpen(true);
      setPaymentError('Please log in to proceed with payment.');
      return;
    }

    setProcessing(true);
    setPaymentError('');
    try {
      if (!order) throw new Error('Order is missing.');
      if (!order.id) throw new Error('Order ID is missing.');

      const data = await fetchWithAuth('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, amount: finalTotal })
      });

      if (data?.payment_url) {
        window.location.href = data.payment_url;
      } else {
        throw new Error('Failed to initiate payment.');
      }
    } catch (err: any) {
      console.error('Payment Error:', err);
      setPaymentError(err.message || 'An error occurred.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <RefreshCw className="animate-spin text-accent mb-4" size={48} />
      <p className="text-text-secondary">Loading order details...</p>
    </div>
  );

  if (error || !order) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <AlertCircle className="text-red-500 mb-4" size={48} />
      <h2 className="text-2xl font-bold mb-2">Error</h2>
      <p className="text-text-secondary mb-8">{error || 'Something went wrong'}</p>
      <Button onClick={() => setView('home')}>Return Home</Button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setView('home')} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-3xl font-bold">Checkout</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Side: Order Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-secondary-bg p-8 rounded-3xl border border-white/5">
            <h3 className="text-xl font-bold mb-6">Order Summary</h3>
            
            <div className="flex gap-4 mb-8 pb-6 border-b border-white/5">
              <img 
                src={order.event?.image_url || order.event?.image || 'https://picsum.photos/seed/event/200/200'} 
                className="w-24 h-24 rounded-2xl object-cover" 
                alt="Event" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/event/200/200';
                }}
              />
              <div>
                <h4 className="font-bold text-lg leading-tight mb-2">{order.event?.title}</h4>
                <div className="flex items-center gap-2 text-text-secondary text-sm">
                  <Calendar size={14} />
                  <span>{order.event?.event_date}</span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary text-sm mt-1">
                  <MapPin size={14} />
                  <span>{order.event?.location}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-sm font-bold text-text-secondary uppercase tracking-wider">Tickets</p>
              {order.items?.map((item, index) => (
                <div key={item.id || index} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Ticket size={16} className="text-accent" />
                    <span>{item.name || 'Ticket'} x {item.quantity}</span>
                  </div>
                  <span className="font-medium">{item.price_each * item.quantity} EGP</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-6 border-t border-white/5">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span>{order.total_price} EGP</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Service Fee (10%)</span>
                <span>{serviceFee.toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between text-2xl font-bold pt-4 text-white">
                <span>Total</span>
                <span className="text-accent">{finalTotal.toFixed(2)} EGP</span>
              </div>
            </div>
          </div>

          <div className="bg-accent/5 p-6 rounded-3xl border border-accent/20 flex gap-4">
            <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center shrink-0">
              <Lock size={20} className="text-accent" />
            </div>
            <div>
              <h4 className="font-bold text-sm mb-1">Secure Payment</h4>
              <p className="text-xs text-text-secondary">You will be redirected to Kashier's secure payment page.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Payment Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handlePay} className="bg-secondary-bg p-8 md:p-12 rounded-[2.5rem] border border-white/5 relative h-full flex flex-col justify-center">
            <div className="text-center space-y-8">
              <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                <CreditCard className="text-accent" size={48} />
              </div>
              
              <div>
                <h3 className="text-3xl font-bold mb-4">Complete Your Payment</h3>
                <p className="text-text-secondary max-w-md mx-auto">
                  Click the button below to be redirected to Kashier's secure payment gateway to complete your purchase.
                </p>
              </div>

              {paymentError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 max-w-md mx-auto">
                  <AlertCircle size={20} />
                  <p className="text-sm">{paymentError}</p>
                </div>
              )}

              <div className="max-w-md mx-auto w-full pt-4">
                <Button 
                  type="submit" 
                  className="w-full py-6 text-xl font-bold rounded-2xl shadow-xl shadow-accent/20"
                  disabled={processing}
                >
                  {processing ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="animate-spin" size={24} />
                      Redirecting...
                    </span>
                  ) : (
                    `Pay ${finalTotal.toFixed(2)} EGP Now`
                  )}
                </Button>
                
                <div className="flex items-center justify-center gap-8 mt-12 grayscale opacity-40">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" alt="Visa" className="h-5" referrerPolicy="no-referrer" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" alt="Mastercard" className="h-8" referrerPolicy="no-referrer" />
                  <div className="text-xs font-bold border border-white/20 px-2 py-1 rounded">KASHIER</div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const PaymentSuccessPage = ({ order: initialOrder, orderId: initialOrderId, setView, fetchWithAuth }: { order: Order | null, orderId: number | null, setView: (v: View) => void, fetchWithAuth: any }) => {
  const { order, loading, error } = useOrder(initialOrder?.id || initialOrderId, fetchWithAuth);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <RefreshCw className="animate-spin text-accent mb-4" size={48} />
      <p className="text-text-secondary">Loading order details...</p>
    </div>
  );

  if (error || !order) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <AlertCircle className="text-red-500 mb-4" size={48} />
      <h2 className="text-2xl font-bold mb-2">Error</h2>
      <p className="text-text-secondary mb-8">{error || 'Could not load order details'}</p>
      <Button onClick={() => setView('home')}>Return Home</Button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
        <CheckCircle2 className="text-green-500" size={48} />
      </div>
      <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
      <p className="text-text-secondary text-lg mb-12">
        Thank you for your purchase. Your payment for order #{order.id} has been confirmed.
        You can find your tickets in your dashboard.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={() => setView('user-dashboard')} className="px-8 py-4">View My Tickets</Button>
        <Button variant="outline" onClick={() => setView('home')} className="px-8 py-4">Return Home</Button>
      </div>
    </div>
  );
};

const PaymentFailurePage = ({ order: initialOrder, orderId: initialOrderId, setView, setCheckoutOrderId, fetchWithAuth }: { order: Order | null, orderId: number | null, setView: (v: View) => void, setCheckoutOrderId: (id: number) => void, fetchWithAuth: any }) => {
  const { order, loading } = useOrder(initialOrder?.id || initialOrderId, fetchWithAuth);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <RefreshCw className="animate-spin text-accent mb-4" size={48} />
      <p className="text-text-secondary">Loading order details...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
        <AlertCircle className="text-red-500" size={48} />
      </div>
      <h1 className="text-4xl font-bold mb-4">Payment Failed</h1>
      <p className="text-text-secondary text-lg mb-12">
        We couldn't process your payment{order ? ` for order #${order.id}` : ''}. 
        Please try again or contact support if the issue persists.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={() => {
          if (order) setCheckoutOrderId(order.id);
          setView('checkout');
        }} className="px-8 py-4">Try Again</Button>
        <Button variant="outline" onClick={() => setView('home')} className="px-8 py-4">Return Home</Button>
      </div>
    </div>
  );
};

const PaymentPendingPage = ({ order: initialOrder, orderId: initialOrderId, setView, fetchWithAuth }: { order: Order | null, orderId: number | null, setView: (v: View) => void, fetchWithAuth: any }) => {
  const { order, loading } = useOrder(initialOrder?.id || initialOrderId, fetchWithAuth);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <RefreshCw className="animate-spin text-accent mb-4" size={48} />
      <p className="text-text-secondary">Loading order details...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
        <Clock className="text-yellow-500" size={48} />
      </div>
      <h1 className="text-4xl font-bold mb-4">Payment Pending</h1>
      <p className="text-text-secondary text-lg mb-12">
        We are still waiting for confirmation from the payment provider{order ? ` for order #${order.id}` : ''}. 
        Your tickets will appear in your dashboard once the payment is confirmed.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={() => setView('user-dashboard')} className="px-8 py-4">Go to Dashboard</Button>
        <Button variant="outline" onClick={() => setView('home')} className="px-8 py-4">Return Home</Button>
      </div>
    </div>
  );
};
