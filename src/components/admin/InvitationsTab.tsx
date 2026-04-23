
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
        <div className="flex flex-col items-center justify-center py-20 bg-secondary-bg rounded-3xl border border-white/5 mb-8">
          <RefreshCw className="w-12 h-12 text-accent animate-spin mb-4" />
          <p className="text-text-secondary font-medium">Loading invitations...</p>
        </div>
      )}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Admin Invitations</h3>
        <Button variant="primary" onClick={() => setIsInvitationModalOpen(true)}>
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
      <div className="bg-secondary-bg rounded-3xl border border-white/5 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Email</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Event</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Ticket Type</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Status</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Date</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allInvitations.length > 0 ? allInvitations.map(inv => (
              <tr key={inv.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium">{inv.email}</td>
                <td className="px-6 py-4 text-sm">{inv.event?.title || 'Unknown Event'}</td>
                <td className="px-6 py-4 text-sm">{inv.ticket_type_name || 'Standard'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    inv.status === 'accepted' ? 'bg-green-400/10 text-green-400' : 
                    'bg-yellow-400/10 text-yellow-400'
                  }`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{new Date(inv.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setDeleteConfirm({ type: 'invitation', id: inv.id })}
                    className="text-red-500 hover:text-red-400 p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-text-secondary italic">No invitations found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
