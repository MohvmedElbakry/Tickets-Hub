import React from 'react';
import { X, Calendar, MapPin, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { Event } from '../../types';
import { formatEventTime } from '../../lib/utils';

interface EventQuickViewModalProps {
  event: Event | null;
  onClose: () => void;
  onBook: (event: Event) => void;
}

export const EventQuickViewModal = ({ event, onClose, onBook }: EventQuickViewModalProps) => {
  if (!event) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-bg/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-secondary-bg w-full max-w-2xl rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl"
        >
          <div className="relative h-64">
            <img 
              src={event.image_url || event.image || 'https://picsum.photos/seed/event/800/600'} 
              alt={event.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/event/800/600';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-secondary-bg to-transparent"></div>
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">{event.title}</h2>
                <div className="flex flex-wrap gap-4 text-text-secondary text-sm">
                  <div className="flex items-center gap-2"><Calendar className="text-accent" size={16} /> {event.event_date || event.date}</div>
                  <div className="flex items-center gap-2"><Clock className="text-accent" size={16} /> {formatEventTime(event.event_date || event.date, event.event_time || event.time)}</div>
                  <div className="flex items-center gap-2"><MapPin className="text-accent" size={16} /> {event.location}</div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-secondary uppercase font-bold tracking-widest mb-1">Starting from</p>
                <p className="text-3xl font-bold text-accent">{event.price || (event.ticket_types?.[0]?.price)} EGP</p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-bold mb-3">About Event</h3>
              <p className="text-text-secondary leading-relaxed line-clamp-3">
                {event.description}
              </p>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" className="flex-1 py-4" onClick={onClose}>Close</Button>
              <Button variant="primary" className="flex-1 py-4" onClick={() => onBook(event)}>Book Tickets</Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
