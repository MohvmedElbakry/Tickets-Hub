
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface UsersTabProps {
  allUsers: UserProfile[];
  loading: boolean;
  handleUpdateUserRole: (userId: number, newRole: 'admin' | 'user') => Promise<void>;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  allUsers,
  loading,
  handleUpdateUserRole
}) => {
  const { user } = useAuth();
  const currentUserEmail = user?.email;
  return (
    <section>
      {loading && allUsers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-secondary-bg rounded-3xl border border-white/5 mb-8">
          <RefreshCw className="w-12 h-12 text-accent animate-spin mb-4" />
          <p className="text-text-secondary font-medium">Loading users...</p>
        </div>
      )}
      <div className="bg-secondary-bg rounded-3xl border border-white/5 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">User</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Email</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Gender</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Role</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Joined</th>
              <th className="px-6 py-4 text-sm font-bold text-text-secondary">Action</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.length > 0 ? allUsers.map(u => (
              <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium">{u.name}</td>
                <td className="px-6 py-4 text-sm text-text-secondary">{u.email}</td>
                <td className="px-6 py-4 text-sm text-text-secondary">{u.gender || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-400/10 text-purple-400' : 'bg-blue-400/10 text-blue-400'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <select 
                    value={u.role} 
                    onChange={(e) => handleUpdateUserRole(u.id, e.target.value as any)}
                    className="bg-primary-bg border border-white/10 rounded-lg px-2 py-1 text-xs focus:border-accent outline-none"
                    disabled={u.email === currentUserEmail}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-text-secondary italic">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
