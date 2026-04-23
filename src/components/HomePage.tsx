import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Search, 
  Ticket, 
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/Button';
import { EventCard } from './EventCard';
import { Event } from '../types';
import { useEvents } from '../context/EventsContext';
import { useUI } from '../context/UIContext';

export const HomePage = () => {
  const navigate = useNavigate();
  const { handleEventClick } = useUI();
  const { events, loading: loadingEvents } = useEvents();
  return (
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
        <Button variant="outline" onClick={() => navigate('/events')}>Explore More</Button>
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
};
