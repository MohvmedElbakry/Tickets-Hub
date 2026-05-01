
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
          { label: 'Total Revenue', value: `${events.reduce((sum, e) => sum + (e.ticket_types?.reduce((s, tt) => s + tt.price * tt.quantity_sold, 0) || 0), 0)} EGP`, icon: <TrendingUp className="text-status-success" />, trend: '0%' },
          { label: 'Tickets Sold', value: events.reduce((sum, e) => sum + (e.ticket_types?.reduce((s, tt) => s + tt.quantity_sold, 0) || 0), 0).toString(), icon: <Ticket className="text-teal" />, trend: '0%' },
          { label: 'Active Events', value: myEvents.length.toString(), icon: <Calendar className="text-status-info" />, trend: '0%' }
        ].map((stat) => (
          <div key={stat.label} className="bg-bg-card p-6 rounded-3xl border border-bg-border">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-bg-page rounded-2xl flex items-center justify-center">{stat.icon}</div>
              <span className="text-label font-bold text-status-success bg-status-success/10 px-2 py-1 rounded-lg">{stat.trend}</span>
            </div>
            <p className="text-text-muted text-body-sm mb-1">{stat.label}</p>
            <h4 className="text-h3">{stat.value}</h4>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-h3">All Events</h3>
        </div>
        <div className="bg-bg-card rounded-3xl border border-bg-border overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-bg-border">
                <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Event Name</th>
                <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Pre-Reg</th>
                <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Tickets</th>
                <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">QR Status</th>
                <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody>
              {myEvents.length > 0 ? myEvents.map(event => (
                <tr key={event.id} className="border-b border-bg-border last:border-0 hover:bg-bg-elevated transition-colors">
                  <td className="px-6 py-4 text-body-sm font-medium text-text-primary">{event.title}</td>
                  <td className="px-6 py-4 text-body-xs text-text-muted">{event.event_date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-label font-bold uppercase tracking-wider ${
                      event.status === 'live' || event.status === 'published' ? 'bg-status-success/10 text-status-success' : 
                      event.status === 'upcoming' ? 'bg-status-info/10 text-status-info' :
                      event.status === 'closed' ? 'bg-status-error/10 text-status-error' :
                      'bg-status-warning/10 text-status-warning'
                    }`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-body-sm text-teal font-bold">{event.pre_registration_count || 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-body-xs text-text-muted">{event.ticket_types?.length || 0} types</span>
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
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-label font-bold uppercase tracking-wider transition-all ${
                        event.qr_enabled_manual ? 'bg-status-success/20 text-status-success' : 'bg-bg-elevated text-text-muted hover:bg-bg-elevated/80'
                      }`}
                    >
                      {event.qr_enabled_manual ? <CheckCircle2 size={12} /> : <Lock size={12} />}
                      {event.qr_enabled_manual ? 'QR Visible' : 'QR Hidden'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEditEvent(event)} className="p-2 hover:bg-bg-elevated rounded-lg transition-colors text-teal"><Settings size={18} /></button>
                      <button onClick={() => handleDeleteEvent(event.id!)} className="p-2 hover:bg-bg-elevated rounded-lg transition-colors text-status-error"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-muted italic text-body-sm">No events found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};
