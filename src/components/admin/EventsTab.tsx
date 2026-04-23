
import React from 'react';
import { Calendar, Ticket, TrendingUp, CheckCircle2, Lock, Settings, Trash2 } from 'lucide-react';
import { Event } from '../../types';
import { Button } from '../ui/Button';
import { eventService } from '../../services/eventService';
import { useEvents } from '../../context/EventsContext';

interface EventsTabProps {
  handleEditEvent: (event: Event) => void;
  handleDeleteEvent: (id: string | number) => void;
  setIsEventModalOpen: (open: boolean) => void;
}

export const EventsTab: React.FC<EventsTabProps> = ({
  handleEditEvent,
  handleDeleteEvent,
  setIsEventModalOpen
}) => {
  const { events, setEvents } = useEvents();
  const myEvents = events;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Total Revenue', value: `${events.reduce((sum, e) => sum + (e.ticket_types?.reduce((s, tt) => s + tt.price * tt.quantity_sold, 0) || 0), 0)} EGP`, icon: <TrendingUp className="text-green-400" />, trend: '0%' },
          { label: 'Tickets Sold', value: events.reduce((sum, e) => sum + (e.ticket_types?.reduce((s, tt) => s + tt.quantity_sold, 0) || 0), 0).toString(), icon: <Ticket className="text-accent" />, trend: '0%' },
          { label: 'Active Events', value: myEvents.length.toString(), icon: <Calendar className="text-blue-400" />, trend: '0%' }
        ].map((stat) => (
          <div key={stat.label} className="bg-secondary-bg p-6 rounded-3xl border border-white/5">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-primary-bg rounded-2xl flex items-center justify-center">{stat.icon}</div>
              <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-lg">{stat.trend}</span>
            </div>
            <p className="text-text-secondary text-sm mb-1">{stat.label}</p>
            <h4 className="text-3xl font-bold">{stat.value}</h4>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">All Events</h3>
        </div>
        <div className="bg-secondary-bg rounded-3xl border border-white/5 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-4 text-sm font-bold text-text-secondary">Event Name</th>
                <th className="px-6 py-4 text-sm font-bold text-text-secondary">Date</th>
                <th className="px-6 py-4 text-sm font-bold text-text-secondary">Status</th>
                <th className="px-6 py-4 text-sm font-bold text-text-secondary">Pre-Reg</th>
                <th className="px-6 py-4 text-sm font-bold text-text-secondary">Tickets</th>
                <th className="px-6 py-4 text-sm font-bold text-text-secondary">QR Status</th>
                <th className="px-6 py-4 text-sm font-bold text-text-secondary">Action</th>
              </tr>
            </thead>
            <tbody>
              {myEvents.length > 0 ? myEvents.map(event => (
                <tr key={event.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium">{event.title}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{event.event_date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      event.status === 'live' || event.status === 'published' ? 'bg-green-400/10 text-green-400' : 
                      event.status === 'upcoming' ? 'bg-blue-400/10 text-blue-400' :
                      event.status === 'closed' ? 'bg-red-400/10 text-red-400' :
                      'bg-yellow-400/10 text-yellow-400'
                    }`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-accent font-bold">{event.pre_registration_count || 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-text-secondary">{event.ticket_types?.length || 0} types</span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={async () => {
                        try {
                          const data = await eventService.adminUpdateEvent(event.id!, { 
                            ...event, 
                            qr_enabled_manual: !event.qr_enabled_manual 
                          });
                          if (data) {
                            setEvents(events.map(e => e.id === event.id ? data : e));
                          }
                        } catch (err) {
                          console.error('Failed to toggle QR visibility', err);
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                        event.qr_enabled_manual ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-text-secondary hover:bg-white/10'
                      }`}
                    >
                      {event.qr_enabled_manual ? <CheckCircle2 size={12} /> : <Lock size={12} />}
                      {event.qr_enabled_manual ? 'QR Visible' : 'QR Hidden'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEditEvent(event)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-accent"><Settings size={18} /></button>
                      <button onClick={() => handleDeleteEvent(event.id!)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-red-400"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-secondary italic">No events found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};
