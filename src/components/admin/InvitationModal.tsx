
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { Event } from '../../types';
import { Button } from '../ui/Button';
import { orderService } from '../../services/orderService';

interface InvitationModalProps {
  onClose: () => void;
  onSuccess: () => void;
  events: Event[];
}

export const InvitationModal: React.FC<InvitationModalProps> = ({ onClose, onSuccess, events }) => {
  const [email, setEmail] = useState('');
  const [eventId, setEventId] = useState('');
  const [ticketTypeId, setTicketTypeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await orderService.adminCreateInvitation({ email, event_id: eventId, ticket_type_id: ticketTypeId });
      if (data) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      try {
        const errorData = JSON.parse(err.message);
        setError(errorData.error || 'Failed to send invitation');
      } catch {
        setError(err.message || 'Error sending invitation');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bg-card w-full max-w-md rounded-3xl p-8 border border-bg-border relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-text-muted hover:text-text-primary transition-colors">
          <X size={24} />
        </button>
        
        <h2 className="text-h2 mb-6">Send Invitation</h2>
        
        {error && (
          <div className="bg-status-error/10 border border-status-error/50 text-status-error p-4 rounded-xl mb-6 text-body-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-body-sm font-medium text-text-muted mb-2">User Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary placeholder:text-text-muted/50"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium text-text-muted mb-2">Event</label>
            <select 
              required
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary"
            >
              <option value="">Select Event</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
          {eventId && (
            <div>
              <label className="block text-body-sm font-medium text-text-muted mb-2">Ticket Type</label>
              <select 
                required
                value={ticketTypeId}
                onChange={(e) => setTicketTypeId(e.target.value)}
                className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary"
              >
                <option value="">Select Ticket Type</option>
                {events.find(ev => String(ev.id) === String(eventId))?.ticket_types?.map(tt => (
                  <option key={tt.id} value={tt.id}>{tt.name}</option>
                ))}
              </select>
            </div>
          )}
          <Button variant="accent" type="submit" className="w-full py-4 text-body-base" disabled={loading}>
            {loading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};
