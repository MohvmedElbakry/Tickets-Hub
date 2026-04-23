import React from 'react';
import { Calendar, MapPin, Ticket, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Event } from '../types';

interface EventCardProps {
  event: Event;
  onClick: () => void;
}

export const EventCard: React.FC<EventCardProps> = React.memo(({ event, onClick }) => {
  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      className="bg-secondary-bg rounded-[2.5rem] border border-white/5 overflow-hidden group cursor-pointer shadow-xl hover:shadow-accent/10 transition-all duration-500 flex flex-col h-full"
      onClick={onClick}
    >
      <div className="relative h-64 overflow-hidden">
        <img 
          src={event.image_url || event.image || 'https://picsum.photos/seed/event/800/600'} 
          alt={event.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/event/800/600';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary-bg via-secondary-bg/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
        <div className="absolute top-6 right-6">
          <div className="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20 text-white text-xs font-bold shadow-2xl">
            {event.status === 'upcoming' ? 'Coming Soon' : (event.price || (event.ticket_types?.[0]?.price)) + ' EGP'}
          </div>
        </div>
      </div>
      <div className="p-8 flex-1 flex flex-col">
        <h3 className="text-2xl font-bold mb-4 group-hover:text-accent transition-colors line-clamp-1">{event.title}</h3>
        <div className="space-y-3 text-text-secondary text-sm mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-accent">
              <Calendar size={16} />
            </div>
            <span>{event.event_date || event.date}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-accent">
              <MapPin size={16} />
            </div>
            <span className="line-clamp-1">{event.location}</span>
          </div>
        </div>
        <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-accent uppercase tracking-widest">
            <Ticket size={14} />
            <span>{event.status}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all duration-500">
            <ChevronRight size={20} />
          </div>
        </div>
      </div>
    </motion.div>
  );
});
