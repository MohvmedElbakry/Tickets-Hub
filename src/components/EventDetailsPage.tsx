import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Info, 
  Minus,
  Plus,
  Clock
} from 'lucide-react';
import { Button } from './ui/Button';
import { Event, TicketType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';
import { useUI } from '../context/UIContext';
import { eventService } from '../services/eventService';
import { formatEventTime } from '../lib/utils';

export const EventDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedEvent, setSelectedEvent } = useUI();
  const { preRegistrations: authPreReg, isAuthReady } = useAuth();
  const preRegistrations = Array.isArray(authPreReg) ? authPreReg : [];
  const { handlePreRegister, handlePurchase, purchaseLoading, purchaseError } = useEvents();
  
  const [ticketQuantities, setTicketQuantities] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  console.log("📦 EVENT DETAILS PAGE LOADED", { id, isAuthReady, selectedEventId: selectedEvent?.id });

  useEffect(() => {
    if (!id || !isAuthReady) return;

    // Guard: Prevent double fetch if already loaded for this ID
    if (selectedEvent && selectedEvent.id?.toString() === id) {
      console.log("✅ Event already in state, skipping fetch");
      setLoading(false);
      return;
    }

    // Ref guard to prevent double fetch in Strict Mode
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchEvent = async () => {
      try {
        setLoading(true);
        console.log("📡 Fetching event with ID:", id);
        
        const res = await eventService.getEvent(id);
        
        console.log("✅ EVENT API SUCCESS:", res);
        
        if (!res) {
          console.warn("⚠️ Event not found (empty response)");
          return;
        }

        setSelectedEvent(res);

      } catch (err: any) {
        console.error("❌ EVENT FETCH ERROR:", err);
        
        // Only clear if explicitly 404
        if (err.status === 404) {
          setSelectedEvent(null);
        }
      } finally {
        setLoading(false);
        console.log("🏁 Event fetch cycle complete");
      }
    };

    fetchEvent();
    
    // Cleanup ref on unmount or id change
    return () => {
      hasFetched.current = false;
    };
  }, [id, isAuthReady]); // STABLE DEPENDENCIES

  console.log("⏳ LOADING STATE:", loading);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-text-secondary">Loading event details...</p>
      </div>
    );
  }

  if (!selectedEvent) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Event not found</h2>
        <Button onClick={() => navigate('/events')}>Back to Events</Button>
      </div>
    );
  }

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
              onClick={() => navigate('/events')}
              className="flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft size={18} /> Back to Events
            </button>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">{selectedEvent.title}</h1>
            <div className="flex flex-wrap gap-6 text-lg">
              <div className="flex items-center gap-2"><Calendar className="text-accent" size={20} /> {selectedEvent.event_date || selectedEvent.date} at {formatEventTime(selectedEvent.event_date || selectedEvent.date, selectedEvent.event_time || selectedEvent.time)}</div>
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
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center font-bold">{currentQty}</span>
                          <button 
                            onClick={() => handleQuantityChange(ticket.id!, 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-12 bg-secondary-bg rounded-3xl border border-dashed border-white/10">
                  <p className="text-text-secondary">No ticket types available for this event.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-8">
          <aside className="sticky top-32">
            <div className="bg-secondary-bg rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
              <div className="p-8">
                {selectedEvent.status === 'upcoming' ? (
                  <div className="text-center py-4">
                    <div className="bg-accent/10 p-6 rounded-3xl border border-accent/20 mb-6">
                      <Clock className="text-accent mx-auto mb-3" size={32} />
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
    </div>
  );
};
