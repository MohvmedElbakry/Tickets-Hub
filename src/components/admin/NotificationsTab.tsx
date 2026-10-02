import React, { useState, useEffect } from 'react';
import { 
  Bell, Mail, RefreshCw, AlertTriangle, CheckCircle, Clock, Send, 
  Search, Filter, ChevronRight, Eye, Play, Sparkles, AlertCircle 
} from 'lucide-react';

interface NotificationLog {
  id: number;
  public_id: string;
  event_type: string;
  recipient_email: string;
  recipient_id: number | null;
  idempotency_key: string | null;
  channel: string;
  status: 'QUEUED' | 'PROCESSING' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  subject: string | null;
  created_at: string;
  sent_at: string | null;
  payload_json: string | null;
}

interface Stats {
  queued: number;
  processing: number;
  delivered: number;
  failed: number;
  total: number;
}

export const NotificationsTab: React.FC = () => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  
  // Announcement Modal
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementSubject, setAnnouncementSubject] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'user' | 'admin'>('all');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchLogsAndStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Stats
      const statsRes = await fetch('/api/admin/notifications/stats', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Logs
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15'
      });
      if (statusFilter) params.append('status', statusFilter);
      if (eventTypeFilter) params.append('eventType', eventTypeFilter);
      if (searchTerm) params.append('search', searchTerm);

      const logsRes = await fetch(`/api/admin/notifications/logs?${params.toString()}`, { headers });
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.items || []);
        setTotalPages(logsData.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch notification logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsAndStats();
  }, [page, statusFilter, eventTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogsAndStats();
  };

  const handleRetry = async (logId: number) => {
    setRetryingId(logId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/notifications/retry/${logId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Notification queued for immediate re-attempt.' });
        fetchLogsAndStats();
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Retry failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setRetryingId(null);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementSubject || !announcementMessage) return;

    setSendingAnnouncement(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/notifications/announcement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: announcementSubject,
          message: announcementMessage,
          targetRole,
          sendEmail,
          sendInApp
        })
      });

      if (res.ok) {
        const data = await res.json();
        setFeedback({ type: 'success', message: data.message });
        setShowAnnouncementModal(false);
        setAnnouncementSubject('');
        setAnnouncementMessage('');
        fetchLogsAndStats();
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to send announcement.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle className="w-3.5 h-3.5" /> Delivered</span>;
      case 'QUEUED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20"><Clock className="w-3.5 h-3.5" /> Queued</span>;
      case 'PROCESSING':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing</span>;
      case 'FAILED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20"><AlertCircle className="w-3.5 h-3.5" /> Failed</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            Notification & Email Infrastructure Audit
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time pipeline monitoring, deliverability logs, deduplication tracking, and platform announcements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLogsAndStats()}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={() => setShowAnnouncementModal(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/10"
          >
            <Send className="w-4 h-4" />
            Broadcast Announcement
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {feedback.message}
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100 font-bold">Dismiss</button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            Total Logs
            <Mail className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {stats?.total ?? 0}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            Delivered
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {stats?.delivered ?? 0}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            Queued / Processing
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2">
            {(stats?.queued ?? 0) + (stats?.processing ?? 0)}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            Failed Delivery
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2">
            {stats?.failed ?? 0}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by recipient email or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
          />
        </form>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-semibold focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="DELIVERED">Delivered</option>
              <option value="QUEUED">Queued</option>
              <option value="PROCESSING">Processing</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <select
            value={eventTypeFilter}
            onChange={(e) => { setEventTypeFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-semibold focus:outline-none"
          >
            <option value="">All Event Types</option>
            <option value="AUTH_WELCOME">Auth: Welcome</option>
            <option value="AUTH_EMAIL_VERIFICATION">Auth: Verification</option>
            <option value="ORDER_CREATED">Order: Confirmed</option>
            <option value="MARKETPLACE_TICKET_SOLD">Marketplace: Sold</option>
            <option value="PAYOUT_PAID">Payout: Paid</option>
            <option value="ADMIN_ANNOUNCEMENT">Admin: Announcement</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Event & Subject</th>
                <th className="p-4">Recipient</th>
                <th className="p-4">Status</th>
                <th className="p-4">Attempts</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                    No notification logs match your current filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{log.subject || 'No Subject'}</div>
                      <div className="text-xs font-mono text-emerald-400/80 mt-0.5">{log.event_type}</div>
                    </td>

                    <td className="p-4 font-mono text-xs text-slate-300">
                      {log.recipient_email}
                    </td>

                    <td className="p-4">
                      {getStatusBadge(log.status)}
                    </td>

                    <td className="p-4 font-mono text-xs text-slate-400">
                      {log.attempts} / {log.max_attempts}
                    </td>

                    <td className="p-4 text-xs text-slate-400 font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {log.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetry(log.id)}
                            disabled={retryingId === log.id}
                            className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-lg transition"
                          >
                            <Play className="w-3.5 h-3.5" />
                            {retryingId === log.id ? 'Queuing...' : 'Retry'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-400" />
                Notification Log Inspection
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">Public ID</span>
                <span className="text-slate-200">{selectedLog.public_id}</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">Status</span>
                {getStatusBadge(selectedLog.status)}
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">Recipient</span>
                <span className="text-slate-200">{selectedLog.recipient_email}</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">Idempotency Key</span>
                <span className="text-emerald-400 break-all">{selectedLog.idempotency_key || 'Auto-generated'}</span>
              </div>
            </div>

            {selectedLog.last_error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-xs text-rose-300 font-mono">
                <div className="font-bold font-sans text-rose-400 mb-1">Last Delivery Failure Exception:</div>
                {selectedLog.last_error}
              </div>
            )}

            <div>
              <span className="text-xs font-bold text-slate-400 block mb-2">Sanitized Payload Audit Data:</span>
              <pre className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs text-emerald-400 font-mono overflow-x-auto max-h-48">
                {selectedLog.payload_json ? JSON.stringify(JSON.parse(selectedLog.payload_json), null, 2) : '{}'}
              </pre>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {selectedLog.status === 'FAILED' && (
                <button
                  onClick={() => { handleRetry(selectedLog.id); setSelectedLog(null); }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
                >
                  Retry Delivery Now
                </button>
              )}
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSendAnnouncement} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Broadcast Platform Announcement
              </h3>
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Announcement Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Platform Maintenance / Summer Concert Discount"
                  value={announcementSubject}
                  onChange={(e) => setAnnouncementSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Message Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type your official announcement here..."
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Target Audience</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none"
                >
                  <option value="all">All Registered Users</option>
                  <option value="user">Standard Customers Only</option>
                  <option value="admin">Administrators Only</option>
                </select>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  Send via Email
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={sendInApp}
                    onChange={(e) => setSendInApp(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  Send via In-App Notification
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={sendingAnnouncement}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center gap-2"
              >
                {sendingAnnouncement ? 'Queuing Broadcast...' : 'Broadcast Announcement'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
