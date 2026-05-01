
import React from 'react';
import { RefreshCw, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { InvitationModal } from './InvitationModal';
import { useEvents } from '../../context/EventsContext';

interface InvitationsTabProps {
  allInvitations: any[];
  loading: boolean;
  setIsInvitationModalOpen: (open: boolean) => void;
  isInvitationModalOpen: boolean;
  fetchInvitations: () => Promise<void>;
  setDeleteConfirm: (confirm: { type: 'event' | 'invitation', id: string | number } | null) => void;
}

export const InvitationsTab: React.FC<InvitationsTabProps> = ({
  allInvitations,
  loading,
  setIsInvitationModalOpen,
  isInvitationModalOpen,
  fetchInvitations,
  setDeleteConfirm
}) => {
  const { events } = useEvents();
  return (
    <section className="space-y-6">
      {loading && allInvitations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-bg-card rounded-3xl border border-bg-border mb-8">
          <RefreshCw className="w-12 h-12 text-teal animate-spin mb-4" />
          <p className="text-text-muted font-medium text-body-base">Loading invitations...</p>
        </div>
      )}
      <div className="flex justify-between items-center">
        <h3 className="text-h3">Admin Invitations</h3>
        <Button variant="accent" onClick={() => setIsInvitationModalOpen(true)}>
          <PlusCircle size={20} /> Send Invitation
        </Button>
      </div>
      {isInvitationModalOpen && (
        <InvitationModal 
          onClose={() => setIsInvitationModalOpen(false)} 
          onSuccess={() => {
            fetchInvitations();
            alert('Invitation sent successfully!');
          }} 
          events={events}
        />
      )}
      <div className="bg-bg-card rounded-3xl border border-bg-border overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-bg-border">
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Email</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Event</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Ticket Type</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allInvitations.length > 0 ? allInvitations.map(inv => (
              <tr key={inv.id} className="border-b border-bg-border last:border-0 hover:bg-bg-elevated transition-colors">
                <td className="px-6 py-4 text-body-sm font-medium text-text-primary">{inv.email}</td>
                <td className="px-6 py-4 text-body-xs text-text-muted">{inv.event?.title || 'Unknown Event'}</td>
                <td className="px-6 py-4 text-body-xs text-text-muted">{inv.ticket_type_name || 'Standard'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-label font-bold uppercase tracking-wider ${
                    inv.status === 'accepted' ? 'bg-status-success/10 text-status-success' : 
                    'bg-status-warning/10 text-status-warning'
                  }`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-body-xs text-text-muted">{new Date(inv.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setDeleteConfirm({ type: 'invitation', id: inv.id })}
                    className="text-status-error hover:text-status-error/80 p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-text-muted italic text-body-sm">No invitations found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
