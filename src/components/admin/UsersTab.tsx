
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface UsersTabProps {
  allUsers: UserProfile[];
  loading: boolean;
  handleUpdateUserRole: (userId: number, newRole: 'admin' | 'user') => Promise<void>;
  fetchUsers: () => Promise<void>;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  allUsers,
  loading,
  handleUpdateUserRole,
  fetchUsers
}) => {
  const { user } = useAuth();
  const currentUserEmail = user?.email;
  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-h3">User Directory</h3>
        <button 
          type="button"
          onClick={fetchUsers} 
          disabled={loading}
          className="p-3 bg-bg-card hover:bg-bg-elevated border border-bg-border rounded-xl text-text-muted hover:text-text-primary transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
          title="Refresh users"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && allUsers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-bg-card rounded-3xl border border-bg-border mb-8">
          <RefreshCw className="w-12 h-12 text-teal animate-spin mb-4" />
          <p className="text-text-muted font-medium text-body-base">Loading users...</p>
        </div>
      )}
      <div className="bg-bg-card rounded-3xl border border-bg-border overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-bg-border">
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">User</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Email</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Gender</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Role</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Joined</th>
              <th className="px-6 py-4 text-label font-bold text-text-muted uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.length > 0 ? allUsers.map(u => (
              <tr key={u.id} className="border-b border-bg-border last:border-0 hover:bg-bg-elevated transition-colors">
                <td className="px-6 py-4 text-body-sm font-medium text-text-primary">{u.name}</td>
                <td className="px-6 py-4 text-body-xs text-text-muted">{u.email}</td>
                <td className="px-6 py-4 text-body-xs text-text-muted">{u.gender || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-label font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-status-info/10 text-status-info' : 'bg-status-info/10 text-status-info'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-body-xs text-text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <select 
                    value={u.role} 
                    onChange={(e) => handleUpdateUserRole(u.id, e.target.value as any)}
                    className="bg-bg-page border border-bg-border rounded-lg px-2 py-1 text-body-xs text-text-primary focus:border-teal outline-none"
                    disabled={u.email === currentUserEmail}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-text-muted italic text-body-sm">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
