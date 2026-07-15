
import React, { useState, useEffect } from 'react';
import { X, User, Instagram, Phone, AlertCircle, Calendar, MapPin, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { CountryCodeSelector } from '../ui/CountryCodeSelector';
import { useAuth } from '../../context/AuthContext';
import { useEvents } from '../../context/EventsContext';
import { useUI } from '../../context/UIContext';

export const BookingModal = () => {
  const { 
    isBookingModalOpen: isOpen, 
    setIsBookingModalOpen, 
    bookingData
  } = useUI();
  
  const { purchaseError, purchaseLoading, handlePurchase } = useEvents();
  const { user } = useAuth();

  const [bookingForm, setBookingForm] = useState({
    instagram: '',
    countryCode: '+20',
    phone: '',
    birthdate: '',
    voucherCode: '',
    ticketHolders: [] as any[]
  });

  useEffect(() => {
    if (isOpen && bookingData) {
      // Initialize form with user data if available
      const totalQty = bookingData.tickets.reduce((sum, t) => sum + (t.quantity || 1), 0);
      setBookingForm(prev => ({
        ...prev,
        instagram: user?.instagram_username || prev.instagram,
        phone: user?.phone || prev.phone,
        birthdate: user?.birthdate || prev.birthdate,
        ticketHolders: Array.from({ length: totalQty }).map(() => ({
          first_name: '',
          last_name: '',
          birthdate: ''
        }))
      }));
    }
  }, [isOpen, bookingData, user]);
  
  const onClose = () => setIsBookingModalOpen(false);
  
  if (!bookingData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseLoading) return;

    // Basic phone validation (Egypt: 11 digits starting with 01)
    const phoneRegex = /^[0-9]{11}$/;
    if (!phoneRegex.test(bookingForm.phone)) {
      alert('Please enter a valid 11-digit phone number (e.g., 01012345678)');
      return;
    }
    
    const age = bookingForm.birthdate ? 
      new Date().getFullYear() - new Date(bookingForm.birthdate).getFullYear() : 0;

    handlePurchase(bookingData.eventId, bookingData.tickets, {
      instagram_username: bookingForm.instagram,
      phone: `${bookingForm.countryCode}${bookingForm.phone}`,
      birthdate: bookingForm.birthdate,
      age,
      voucher_code: bookingForm.voucherCode,
      ticket_holders: bookingForm.ticketHolders
    });
  };

  const updateTicketHolder = (index: number, field: string, value: string) => {
    const newHolders = [...bookingForm.ticketHolders];
    newHolders[index] = { ...newHolders[index], [field]: value };
    setBookingForm({ ...bookingForm, ticketHolders: newHolders });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-bg-page/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-bg-card w-full max-w-2xl rounded-card-2xl p-8 border border-bg-border shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-teal shadow-teal/20 shadow-lg"></div>
            
            <div className="flex justify-between items-center mb-10">
              <div className="content-stack gap-1">
                <h2 className="text-h2">Complete <span className="text-teal">Booking</span></h2>
                <p className="text-label text-text-muted font-bold tracking-widest uppercase">Secure your spot in the experience</p>
              </div>
              <button 
                onClick={onClose} 
                className="w-10 h-10 flex items-center justify-center bg-bg-elevated/50 hover:bg-bg-elevated rounded-card transition-all duration-base group"
              >
                <X size={20} className="text-text-muted group-hover:text-text-primary transition-colors" />
              </button>
            </div>

            {purchaseError && (
              <div className="bg-status-error/10 border border-status-error/20 text-status-error p-4 rounded-card mb-8 flex items-center gap-3 text-body-sm font-medium">
                <div className="w-6 h-6 rounded-full bg-status-error/20 flex items-center justify-center shrink-0">
                  <AlertCircle size={14} />
                </div>
                {purchaseError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="layout-stack gap-10">
              {/* Personal Info */}
              <div className="content-stack gap-8">
                <div className="flex items-center gap-3 border-b border-bg-border pb-3">
                  <div className="w-8 h-8 rounded-card bg-teal/10 text-teal flex items-center justify-center">
                    <User size={18} />
                  </div>
                  <h3 className="text-h4">Personal Information</h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-8">
                  <div className="content-stack gap-2">
                    <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Instagram Username</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-card flex items-center justify-center text-text-muted group-focus-within:text-teal group-focus-within:bg-teal/10 transition-all duration-base">
                        <Instagram size={16} />
                      </div>
                      <input 
                        type="text" 
                        value={bookingForm.instagram}
                        onChange={(e) => setBookingForm({ ...bookingForm, instagram: e.target.value })}
                        placeholder="@username"
                        className="w-full bg-bg-elevated border border-bg-border rounded-card py-3.5 pl-14 pr-4 text-body-sm text-text-primary focus:outline-none focus:border-teal transition-all"
                        required
                      />
                    </div>
                    {!bookingForm.instagram && <p className="text-[9px] text-text-muted/60 uppercase tracking-widest font-bold ml-1 italic">Required for verification</p>}
                  </div>

                  <div className="content-stack gap-2">
                    <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Phone Number</label>
                    <div className="flex gap-2">
                      <CountryCodeSelector 
                        value={bookingForm.countryCode}
                        onChange={(code) => setBookingForm({ ...bookingForm, countryCode: code })}
                      />
                      <div className="relative flex-1 group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-card flex items-center justify-center text-text-muted group-focus-within:text-teal group-focus-within:bg-teal/10 transition-all duration-base">
                          <Phone size={16} />
                        </div>
                        <input 
                          type="tel" 
                          value={bookingForm.phone}
                          onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                          placeholder="01xxxxxxxxx"
                          className="w-full bg-bg-elevated border border-bg-border rounded-card py-3.5 pl-14 pr-4 text-body-sm text-text-primary focus:outline-none focus:border-teal transition-all"
                          required
                        />
                      </div>
                    </div>
                    <p className="text-[9px] text-text-muted/60 uppercase tracking-widest font-bold ml-1 italic">We'll send you a confirmation SMS</p>
                  </div>

                  <div className="content-stack gap-2">
                    <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Birthdate</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-card flex items-center justify-center text-text-muted group-focus-within:text-teal group-focus-within:bg-teal/10 transition-all duration-base">
                        <Calendar size={16} />
                      </div>
                      <input 
                        type="date" 
                        value={bookingForm.birthdate}
                        onChange={(e) => setBookingForm({ ...bookingForm, birthdate: e.target.value })}
                        className="w-full bg-bg-elevated border border-bg-border rounded-card py-3.5 pl-14 pr-4 text-body-sm text-text-primary focus:outline-none focus:border-teal transition-all [color-scheme:dark]"
                        required
                      />
                    </div>
                    <p className="text-[9px] text-text-muted/60 uppercase tracking-widest font-bold ml-1 italic">Age-restricted entry verification</p>
                  </div>

                  <div className="content-stack gap-2">
                    <label className="text-label text-text-muted font-black uppercase tracking-widest ml-1">Voucher Code (Optional)</label>
                    <input 
                      type="text" 
                      value={bookingForm.voucherCode}
                      onChange={(e) => setBookingForm({ ...bookingForm, voucherCode: e.target.value })}
                      placeholder="ENTER CODE"
                      className="w-full bg-bg-elevated border border-bg-border rounded-card py-3.5 px-5 text-body-sm text-text-primary focus:outline-none focus:border-teal transition-all uppercase placeholder:text-text-muted/40"
                    />
                  </div>
                </div>
              </div>

              {/* Ticket Holders */}
              {bookingForm.ticketHolders.length > 0 && (
                <div className="content-stack gap-8">
                  <div className="flex items-center gap-3 border-b border-bg-border pb-3">
                    <div className="w-8 h-8 rounded-card bg-teal/10 text-teal flex items-center justify-center">
                      <Ticket size={18} />
                    </div>
                    <h3 className="text-h4">Ticket Holders Information</h3>
                  </div>

                  <div className="layout-stack gap-6">
                    {bookingForm.ticketHolders.map((holder: any, index: number) => (
                      <div key={index} className="p-6 bg-bg-elevated/40 rounded-card-xl border border-bg-border shadow-card relative overflow-hidden group">
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-teal opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <p className="text-label text-teal font-black uppercase tracking-widest mb-6">TICKET HOLDER #{index + 1}</p>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <input 
                            type="text" 
                            placeholder="First Name"
                            value={holder.first_name}
                            onChange={(e) => updateTicketHolder(index, 'first_name', e.target.value)}
                            className="w-full bg-bg-card border border-bg-border rounded-card py-3 px-4 text-body-sm text-text-primary focus:outline-none focus:border-teal transition-all"
                            required
                          />
                          <input 
                            type="text" 
                            placeholder="Last Name"
                            value={holder.last_name}
                            onChange={(e) => updateTicketHolder(index, 'last_name', e.target.value)}
                            className="w-full bg-bg-card border border-bg-border rounded-card py-3 px-4 text-body-sm text-text-primary focus:outline-none focus:border-teal transition-all"
                            required
                          />
                          <div className="sm:col-span-2 content-stack gap-2">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Holder's Birthdate</label>
                            <input 
                              type="date" 
                              value={holder.birthdate}
                              onChange={(e) => updateTicketHolder(index, 'birthdate', e.target.value)}
                              className="w-full bg-bg-card border border-bg-border rounded-card py-3 px-4 text-body-sm text-text-primary focus:outline-none focus:border-teal transition-all [color-scheme:dark]"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-bg-border">
                <Button 
                  type="submit"
                  variant="accent" 
                  className="w-full py-5 text-button font-black uppercase tracking-widest" 
                  disabled={purchaseLoading}
                >
                  {purchaseLoading ? 'Processing Order...' : 'Confirm & Proceed to Payment'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
