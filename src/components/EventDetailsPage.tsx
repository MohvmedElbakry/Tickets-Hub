import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Info, 
  Minus,
  Plus,
  Clock,
  Ticket,
  ShieldCheck,
  X
} from 'lucide-react';
import { Button } from './ui/Button';
import { Event, TicketType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useEvents, useSettings } from '../context/EventsContext';
import { useUI } from '../context/UIContext';
import { eventService } from '../services/eventService';
import { formatEventTime } from '../lib/utils';

export const EventDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedEvent, setSelectedEvent } = useUI();
  const { isAuthReady } = useAuth();
  const { handlePreRegister, handlePurchase, purchaseLoading, purchaseError } = useEvents();
  const { settings } = useSettings();
  
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
        <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mb-4 shadow-card-glow"></div>
        <p className="text-text-muted font-black tracking-widest uppercase text-label">Parsing Event Stream...</p>
      </div>
    );
  }

  if (!selectedEvent) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center layout-stack gap-10">
        <div className="w-24 h-24 bg-bg-elevated text-status-error/40 rounded-card flex items-center justify-center border-2 border-dashed border-bg-border relative">
          <Calendar size={48} />
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-status-error text-white rounded-card flex items-center justify-center shadow-card">
            <X size={16} />
          </div>
        </div>
        <div className="content-stack gap-3 text-center">
          <h2 className="text-h2">Experience Unavailable</h2>
          <p className="text-body-lg text-text-muted max-w-sm mx-auto leading-relaxed">
            The event you are looking for might have been archived or moved to a private repository.
          </p>
        </div>
        <Button variant="accent" className="px-10 py-4 font-black tracking-widest uppercase" onClick={() => navigate('/events')}>
          Browse Live Assets
        </Button>
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
    return sum + (Number(tt?.price) || 0) * (item.quantity as number);
  }, 0);

  return (
    <div className="pb-24">
      {/* Header Image */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <img 
          src={selectedEvent.image_url} 
          alt={selectedEvent.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-page via-bg-page/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-12">
          <div className="max-w-7xl mx-auto">
            <button 
              onClick={() => navigate('/events')}
              className="flex items-center gap-2 text-text-primary/70 hover:text-text-primary mb-6 transition-all"
            >
              <ArrowLeft size={18} /> Back to Events
            </button>
            <h1 className="text-h2 md:text-hero mb-6">{selectedEvent.title}</h1>
            <div className="flex flex-wrap gap-6 text-body-lg">
              <div className="flex items-center gap-2"><Calendar className="text-teal" size={20} /> {selectedEvent.event_date} at {formatEventTime(selectedEvent.event_date, selectedEvent.event_time)}</div>
              <div className="flex items-center gap-2"><MapPin className="text-teal" size={20} /> {selectedEvent.location}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 layout-stack gap-12">
          <section className="content-stack gap-6">
            <h2 className="text-h2">About the <span className="text-teal font-sans italic">Event</span></h2>
            <p className="text-body-lg text-text-muted leading-relaxed">
              {selectedEvent.description}
            </p>
          </section>

          <section className="content-stack gap-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <h2 className="text-h2">Select <span className="text-teal">Tickets</span></h2>
              <div className="flex items-center gap-2 px-4 py-2 bg-bg-elevated/50 border border-bg-border rounded-pill">
                <Ticket size={14} className="text-teal" />
                <span className="text-label font-black tracking-widest text-text-muted">{selectedEvent.ticket_types?.length || 0} OPTIONS</span>
              </div>
            </div>

            {purchaseError && (
              <div className="bg-status-error/10 border border-status-error/20 text-status-error p-5 rounded-card flex items-center gap-3">
                <Info size={18} />
                <p className="text-body-sm font-medium">{purchaseError}</p>
              </div>
            )}

            <div className="layout-stack gap-6">
              {selectedEvent.ticket_types && selectedEvent.ticket_types.length > 0 ? selectedEvent.ticket_types.map((ticket: TicketType) => {
                const remaining = ticket.quantity_total - ticket.quantity_sold;
                const isSoldOut = remaining <= 0;
                const isSaleStarted = new Date(ticket.sale_start) <= new Date();
                const isSaleEnded = new Date(ticket.sale_end) < new Date();
                const canBuy = !isSoldOut && isSaleStarted && !isSaleEnded && (selectedEvent.status === 'live' || selectedEvent.status === 'published');
                const currentQty = ticketQuantities[ticket.id!] || 0;

                return (
                  <div key={ticket.id} className={`p-8 rounded-card-2xl border-2 transition-all duration-base relative overflow-hidden group ${!canBuy ? 'opacity-40 grayscale border-bg-border bg-bg-page' : 'bg-bg-card border-bg-border hover:border-teal/50 hover:bg-bg-elevated hover:shadow-card-glow'}`}>
                    {!canBuy && <div className="absolute inset-0 bg-bg-page/40 z-10"></div>}
                    
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 group">
                      <div className="content-stack gap-2 max-w-md">
                        <div className="flex items-center gap-3">
                          <h3 className="text-h3 leading-tight transition-colors group-hover:text-teal">{ticket.name}</h3>
                          {canBuy && remaining < 50 && (
                            <span className="px-2 py-0.5 bg-status-error/10 text-status-error border border-status-error/20 rounded-tag text-label font-black tracking-widest leading-none">Limited</span>
                          )}
                        </div>
                        <p className="text-body-sm text-text-muted italic">{ticket.description}</p>
                      </div>
                      <div className="md:text-right content-stack gap-1">
                        <div className="text-price text-teal text-h3 transform group-hover:scale-110 transition-transform origin-right">{ticket.price} <span className="text-body-xs font-normal opacity-60">EGP</span></div>
                        <div className="text-label text-text-muted font-black uppercase tracking-widest">PER TICKET HOLDER</div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-bg-border gap-6">
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 text-label text-text-muted font-bold tracking-widest bg-bg-elevated/50 py-1.5 px-4 rounded-card border border-bg-border group-hover:border-teal/20 transition-all">
                          <Calendar size={14} className="text-teal" />
                          SALE: {new Date(ticket.sale_start).toLocaleDateString()}
                        </div>
                        {remaining > 0 && remaining < 20 && (
                          <div className="flex items-center gap-2 text-label text-status-error font-black tracking-widest animate-pulse">
                            <Info size={14} /> ONLY {remaining} LEFT!
                          </div>
                        )}
                        {isSoldOut && (
                          <span className="text-label text-text-muted font-black tracking-widest bg-bg-elevated px-4 py-1.5 rounded-card">SOLD OUT</span>
                        )}
                      </div>
                      
                      {canBuy ? (
                        <div className="flex items-center gap-6 bg-bg-elevated rounded-card p-2 border border-bg-border shadow-inner">
                          <button 
                            onClick={() => handleQuantityChange(ticket.id!, -1)}
                            className="w-10 h-10 flex items-center justify-center rounded-card-lg hover:bg-bg-card hover:text-teal transition-all text-text-muted"
                          >
                            <Minus size={18} />
                          </button>
                          <span className="w-8 text-center text-h4 font-mono">{currentQty}</span>
                          <button 
                            onClick={() => handleQuantityChange(ticket.id!, 1)}
                            className="w-10 h-10 flex items-center justify-center rounded-card-lg hover:bg-bg-card hover:text-teal transition-all text-text-muted"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="text-label text-text-muted font-black tracking-widest border border-bg-border px-6 py-3 rounded-card bg-bg-elevated/30">
                          {isSoldOut ? 'REGISTRATION CLOSED' : !isSaleStarted ? `OPENS ${new Date(ticket.sale_start).toLocaleDateString()}` : 'EXPIRED'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-24 bg-bg-card rounded-card-2xl border border-dashed border-bg-border content-stack gap-4">
                  <div className="w-16 h-16 bg-bg-elevated rounded-card flex items-center justify-center mx-auto text-text-muted/30">
                    <Ticket size={32} />
                  </div>
                  <p className="text-body-base text-text-muted italic">Tiered ticketing options are being finalized. Check back soon.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-8">
          <aside className="sticky top-32">
            <div className="bg-bg-card rounded-card-2xl border border-bg-border overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-teal"></div>
              <div className="p-10 content-stack gap-10">
                {selectedEvent.status === 'upcoming' ? (
                  <div className="text-center content-stack gap-8">
                    <div className="bg-teal/5 p-8 rounded-card-xl border border-teal/10 content-stack gap-4">
                      <div className="w-16 h-16 bg-teal/10 text-teal rounded-card flex items-center justify-center mx-auto">
                        <Clock size={32} />
                      </div>
                      <div className="content-stack gap-1">
                        <p className="text-h4 text-teal">Join the Waitlist</p>
                        <p className="text-body-sm text-text-muted leading-relaxed">Be the first to know when registrations go live.</p>
                      </div>
                      {selectedEvent.pre_registration_count !== undefined && (
                        <div className="pt-4 border-t border-teal/10">
                          <p className="text-label text-teal font-black tracking-widest">{selectedEvent.pre_registration_count} PEOPLE IN QUEUE</p>
                        </div>
                      )}
                    </div>
                    <Button 
                      className="w-full py-5 text-button font-black uppercase tracking-widest shadow-card-glow" 
                      variant="accent"
                      onClick={() => handlePreRegister(selectedEvent.id!)}
                    >
                      NOTIFY ME
                    </Button>
                  </div>
                ) : (
                  <div className="content-stack gap-8">
                    <div className="content-stack gap-6">
                      <div className="flex items-center justify-between">
                        <p className="text-label font-black text-text-primary uppercase tracking-widest">Order Details</p>
                        {selectedTickets.length > 0 && <span className="w-2 h-2 bg-teal rounded-full animate-pulse shadow-teal"></span>}
                      </div>

                      {selectedTickets.length > 0 ? (
                        <div className="layout-stack gap-4">
                          {selectedTickets.map(item => {
                            const tt = selectedEvent.ticket_types?.find(t => t.id?.toString() === item.ticket_type_id);
                            return (
                              <div key={item.ticket_type_id} className="flex justify-between items-center text-body-sm">
                                <span className="text-text-primary font-bold uppercase tracking-tight">{tt?.name} <span className="text-text-muted lowercase font-normal ml-1">× {item.quantity}</span></span>
                                <span className="text-data font-mono">{(tt?.price || 0) * item.quantity} EGP</span>
                              </div>
                            );
                          })}
                          <div className="flex flex-col gap-2 pt-4 border-t border-bg-border/30 italic">
                            <div className="flex justify-between items-center text-body-xs text-text-muted">
                              <span>Platform Service Fee ({settings.service_fee_percent}%)</span>
                              <span className="font-mono">{(totalPrice * (settings.service_fee_percent / 100)).toFixed(2)} EGP</span>
                            </div>
                            <div className="flex justify-between items-center text-body-xs text-text-muted">
                              <span>Processing Fee ({settings.processing_fee_percent}% + {settings.fixed_fee_egp} EGP)</span>
                              <span className="font-mono">{(totalPrice * (settings.processing_fee_percent / 100) + settings.fixed_fee_egp).toFixed(2)} EGP</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center border-bg-border/30 bg-bg-elevated/30 rounded-card italic text-body-xs text-text-muted">
                          Select tickets to proceed
                        </div>
                      )}
                    </div>

                    <div className="pt-8 border-t border-bg-border content-stack gap-8">
                      <div className="flex justify-between items-center bg-bg-elevated/50 p-4 rounded-card border border-bg-border/30">
                        <span className="text-label font-black text-text-muted tracking-widest">Total Price</span>
                        <span className="text-h2 text-teal drop-shadow-teal">{(totalPrice > 0 ? (totalPrice + (totalPrice * (settings.service_fee_percent / 100)) + (totalPrice * (settings.processing_fee_percent / 100) + settings.fixed_fee_egp)) : 0).toFixed(2)} <span className="text-body-xs font-normal text-text-muted">EGP</span></span>
                      </div>
                      
                      <Button 
                        variant="accent"
                        className={`w-full py-6 text-button font-black uppercase tracking-widest shadow-card-glow transition-all duration-medium ${selectedTickets.length > 0 ? 'scale-105' : 'opacity-50'}`} 
                        disabled={selectedTickets.length === 0 || purchaseLoading || selectedEvent.status === 'closed'}
                        onClick={() => handlePurchase(selectedEvent.id!, selectedTickets)}
                      >
                        {selectedEvent.status === 'closed' ? 'EVENT CLOSED' : (purchaseLoading ? 'PROCESSING...' : (selectedTickets.length > 0 ? (selectedTickets.reduce((sum, item) => sum + item.quantity, 0) === 1 ? 'BOOK TICKET' : 'BOOK TICKETS') : 'SELECT TICKETS'))}
                      </Button>
                    </div>
                  </div>
                )}
                
                  <div className="py-4"></div>
                </div>
              </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
