import React from 'react';
import { Calendar, MapPin, Ticket, ChevronRight, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Event } from '../types';
import { formatEventTime } from '../lib/utils';

interface EventCardProps {
  event: Event;
  onClick: () => void;
}

export const EventCard: React.FC<EventCardProps> = React.memo(({ event, onClick }) => {
  return (
    <motion.div 
      whileHover={{ y: -10, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-bg-card rounded-card-xl border border-bg-border overflow-hidden group cursor-pointer shadow-card hover:bg-bg-elevated hover:border-teal-border-mid hover:shadow-card-glow transition-all duration-base ease-out flex flex-col h-full ring-offset-bg-page focus-within:ring-2 focus-within:ring-teal"
      onClick={onClick}
    >
      <div className="relative h-64 overflow-hidden">
        <img 
          src={event.image_url} 
          alt={event.title} 
          className="w-full h-full object-cover transition-transform duration-slow group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent opacity-60"></div>
        <div className="absolute top-4 right-4">
          <div className="bg-bg-card/60 backdrop-blur-md px-3 py-1.5 rounded-tag border border-teal-border-faint text-teal text-label font-bold shadow-card">
            {event.status === 'upcoming' ? 'Soon' : event.price + ' EGP'}
          </div>
        </div>
      </div>
      <div className="p-6 flex-1 flex flex-col content-stack gap-6">
        <div className="content-stack gap-3">
          <h3 className="text-h4 group-hover:text-teal transition-colors line-clamp-1">{event.title}</h3>
          <div className="space-y-2 text-text-muted">
            <div className="flex items-center gap-3">
              <Calendar size={14} className="text-teal" />
              <span className="text-body-xs font-medium font-mono uppercase tracking-wider">{event.event_date}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={14} className="text-teal" />
              <span className="text-body-sm line-clamp-1">{event.location}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-auto pt-4 border-t border-bg-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-label font-bold text-teal">
            <Ticket size={12} />
            <span>{event.status}</span>
          </div>
          <div className="w-8 h-8 rounded-pill bg-bg-elevated border border-bg-border text-text-muted flex items-center justify-center group-hover:bg-teal group-hover:text-onteal group-hover:border-teal transition-all duration-base">
            <ChevronRight size={16} />
          </div>
        </div>
      </div>
    </motion.div>
  );
});
