
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
      setBookingForm(prev => ({
        ...prev,
        instagram: user?.instagram_username || prev.instagram,
        phone: user?.phone || prev.phone,
        birthdate: user?.birthdate || prev.birthdate,
        ticketHolders: bookingData.tickets.map(() => ({
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-primary-bg/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-secondary-bg w-full max-w-2xl rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-accent"></div>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold">Complete <span className="text-accent">Booking</span></h2>
                <p className="text-text-secondary text-sm mt-1">Please provide additional information to finalize your order.</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {purchaseError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl mb-6 flex items-center gap-3 text-sm">
                <AlertCircle size={18} /> {purchaseError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Info */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2 border-b border-white/5 pb-2">
                  <User size={20} className="text-accent" /> Personal Information
                </h3>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Instagram Username</label>
                    <div className="relative">
                      <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                      <input 
                        type="text" 
                        value={bookingForm.instagram}
                        onChange={(e) => setBookingForm({ ...bookingForm, instagram: e.target.value })}
                        placeholder="@username"
                        className="w-full bg-primary-bg border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-accent text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Phone Number</label>
                    <div className="flex gap-2">
                      <CountryCodeSelector 
                        value={bookingForm.countryCode}
                        onChange={(code) => setBookingForm({ ...bookingForm, countryCode: code })}
                      />
                      <div className="relative flex-1">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                        <input 
                          type="tel" 
                          value={bookingForm.phone}
                          onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                          placeholder="01xxxxxxxxx"
                          className="w-full bg-primary-bg border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-accent text-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Birthdate</label>
                    <input 
                      type="date" 
                      value={bookingForm.birthdate}
                      onChange={(e) => setBookingForm({ ...bookingForm, birthdate: e.target.value })}
                      className="w-full bg-primary-bg border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-accent text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Voucher Code (Optional)</label>
                    <input 
                      type="text" 
                      value={bookingForm.voucherCode}
                      onChange={(e) => setBookingForm({ ...bookingForm, voucherCode: e.target.value })}
                      placeholder="ENTER CODE"
                      className="w-full bg-primary-bg border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-accent text-sm uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Ticket Holders */}
              {bookingForm.ticketHolders.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold flex items-center gap-2 border-b border-white/5 pb-2">
                    <Ticket size={20} className="text-accent" /> Ticket Holders Info
                  </h3>
                  <div className="space-y-6">
                    {bookingForm.ticketHolders.map((holder: any, index: number) => (
                      <div key={index} className="p-6 bg-primary-bg rounded-3xl border border-white/5 space-y-4">
                        <p className="text-xs font-bold text-accent uppercase tracking-widest">Ticket #{index + 1}</p>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <input 
                            type="text" 
                            placeholder="First Name"
                            value={holder.first_name}
                            onChange={(e) => updateTicketHolder(index, 'first_name', e.target.value)}
                            className="w-full bg-secondary-bg border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-accent text-sm"
                            required
                          />
                          <input 
                            type="text" 
                            placeholder="Last Name"
                            value={holder.last_name}
                            onChange={(e) => updateTicketHolder(index, 'last_name', e.target.value)}
                            className="w-full bg-secondary-bg border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-accent text-sm"
                            required
                          />
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block ml-1">Birthdate</label>
                            <input 
                              type="date" 
                              value={holder.birthdate}
                              onChange={(e) => updateTicketHolder(index, 'birthdate', e.target.value)}
                              className="w-full bg-secondary-bg border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-accent text-sm"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-white/5">
                <Button 
                  type="submit"
                  variant="primary" 
                  className="w-full py-4 text-lg font-bold" 
                  disabled={purchaseLoading}
                >
                  {purchaseLoading ? 'Processing...' : 'Confirm & Proceed to Payment'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
