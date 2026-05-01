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
import { HeroCarousel } from './hero/HeroCarousel';

export const HomePage = () => {
  const navigate = useNavigate();
  const { handleEventClick } = useUI();
  const { events, loading: loadingEvents } = useEvents();
  return (
    <div className="layout-stack pb-24 -mt-[var(--page-padding-y)] -mx-[var(--page-padding-x)]">
      {/* Hero Section */}
      <HeroCarousel />

    {/* Featured Events */}
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="content-stack gap-2">
          <h2 className="text-h2">Featured <span className="text-teal">Events</span></h2>
          <p className="text-body-base text-text-muted">The most anticipated events you don't want to miss.</p>
        </div>
        <Button variant="outline" size="md" onClick={() => navigate('/events')}>Explore More</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events.filter(e => e.status === 'published').slice(0, 3).map(event => (
          <EventCard key={event.id} event={event} onClick={() => handleEventClick(event)} />
        ))}
        {events.filter(e => e.status === 'published').length === 0 && !loadingEvents && (
          <div className="col-span-3 text-center py-20 bg-bg-card rounded-card border border-bg-border text-text-muted italic text-body">
            No events available yet.
          </div>
        )}
      </div>
    </section>

    {/* How it Works */}
    <section className="bg-bg-card py-24 border-y border-bg-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-20 content-stack gap-4">
          <h2 className="text-h2">How <span className="text-teal">TicketsHub</span> Works</h2>
          <p className="text-body-lg text-text-muted">Getting your tickets has never been easier. Follow these simple steps.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-12">
          {[
            { icon: <Search size={32} />, title: 'Find Events', desc: 'Browse through hundreds of events happening in your city.' },
            { icon: <Ticket size={32} />, title: 'Select Tickets', desc: 'Choose from different ticket types that suit your needs.' },
            { icon: <CheckCircle2 size={32} />, title: 'Get QR Ticket', desc: 'Receive your digital ticket instantly and show it at the door.' }
          ].map((step, i) => (
            <div key={i} className="text-center group content-stack gap-6">
              <div className="w-20 h-20 bg-bg-page rounded-card-lg flex items-center justify-center mx-auto border border-bg-border group-hover:border-teal-border-mid group-hover:bg-bg-elevated transition-all duration-base">
                <div className="text-teal group-hover:scale-110 transition-transform">{step.icon}</div>
              </div>
              <div className="content-stack gap-3">
                <h3 className="text-h3">{step.title}</h3>
                <p className="text-body-base text-text-muted leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Upcoming Events Grid */}
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <h2 className="text-h2">Upcoming <span className="text-teal">Events</span></h2>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {['Today', 'This Week', 'This Month'].map(t => (
            <button key={t} className="px-5 py-2 rounded-pill text-label font-bold bg-bg-card border border-bg-border hover:bg-bg-elevated hover:border-teal-border-faint transition-all whitespace-nowrap">{t}</button>
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
