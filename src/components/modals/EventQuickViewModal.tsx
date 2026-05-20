import React from 'react';
import { X, Calendar, MapPin, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { Event } from '../../types';
import { formatEventTime } from '../../lib/utils';
import { formatDate } from '../../lib/dateFormat';

interface EventQuickViewModalProps {
  event: Event | null;
  onClose: () => void;
  onBook: (event: Event) => void;
}

export const EventQuickViewModal = ({ event, onClose, onBook }: EventQuickViewModalProps) => {
  if (!event) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-page/80 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-bg-card w-full max-w-2xl rounded-card-2xl overflow-hidden border border-bg-border shadow-2xl relative"
        >
          <div className="relative h-72">
            <img 
              src={event.image_url} 
              alt={event.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/20 to-transparent"></div>
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-bg-page/60 hover:bg-bg-page rounded-card text-text-primary backdrop-blur-md transition-all duration-base shadow-lg border border-white/10 group"
            >
              <X size={20} className="group-hover:rotate-90 transition-transform" />
            </button>
            <div className="absolute bottom-6 left-8">
              <span className="bg-teal text-onteal text-label font-black uppercase tracking-widest px-3 py-1 rounded-tag shadow-teal">Quick View</span>
            </div>
          </div>

          <div className="p-8 content-stack gap-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="content-stack gap-2">
                <h2 className="text-h2 leading-tight">{event.title}</h2>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-text-muted text-body-sm">
                  <div className="flex items-center gap-2"><Calendar className="text-teal" size={16} /> {formatDate(event.event_date || event.date)}</div>
                  <div className="flex items-center gap-2"><Clock className="text-teal" size={16} /> {formatEventTime(event.event_date || event.date, event.event_time || event.time)}</div>
                  <div className="flex items-center gap-2"><MapPin className="text-teal" size={16} /> {event.location}</div>
                </div>
              </div>
              <div className="md:text-right content-stack gap-1">
                <p className="text-label text-text-muted font-black uppercase tracking-widest">Starting from</p>
                <p className="text-h2 text-teal">{event.price || (event.ticket_types?.[0]?.price)} EGP</p>
              </div>
            </div>

            <div className="content-stack gap-3 bg-bg-elevated/30 p-6 rounded-card-xl border border-bg-border/50">
              <h3 className="text-label text-text-primary font-black uppercase tracking-widest">About Event</h3>
              <p className="text-body-base text-text-muted leading-relaxed line-clamp-3">
                {event.description}
              </p>
            </div>

            <div className="flex gap-4 pt-4 border-t border-bg-border">
              <Button variant="outline" className="flex-1 py-4 text-button font-black uppercase tracking-widest" onClick={onClose}>Dismiss</Button>
              <Button variant="accent" className="flex-1 py-4 text-button font-black uppercase tracking-widest" onClick={() => onBook(event)}>Book Now</Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
