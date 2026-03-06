
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../../../types';
import { store } from '../../../store';
import { socket } from '../../../socket';

const Overview: React.FC<{ clients: User[] }> = ({ clients = [] }) => {
  const [storeStats, setStoreStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [renewals, setRenewals] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    // setLoading(true); // Avoid flickering
    const [stats, activity, allClientData, requests] = await Promise.all([
      store.getStats(),
      store.getRecentActivity(),
      Promise.all(clients.map(c => store.getClientData(c.id))),
      store.getSessionRequests()
    ]);

    setStoreStats(stats);
    setRecentActivity(activity);
    
    // Ensure requests is an array before filtering
    const validRequests = Array.isArray(requests) ? requests : [];
    setPendingRequests(validRequests.filter((r: any) => r.status === 'Pending'));

    const upcomingRenewals = clients.filter((c, index) => {
      const data = allClientData[index];
      const latestPayment = (data.payments || [])[(data.payments || []).length - 1];
      if (!latestPayment) return false;
      const dueDate = new Date(latestPayment.dueDate);
      const diff = dueDate.getTime() - new Date().getTime();
      return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
    });
    setRenewals(upcomingRenewals);

    setLoading(false);
  }, [clients]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchData();
    };

    socket.on('client_updated', handleUpdate);
    socket.on('users_updated', handleUpdate);
    socket.on('session_request_updated', handleUpdate);

    return () => {
      socket.off('client_updated', handleUpdate);
      socket.off('users_updated', handleUpdate);
      socket.off('session_request_updated', handleUpdate);
    };
  }, [fetchData]);

  if (loading || !storeStats) {
    return <div className="text-neutral-500 text-sm">Loading overview...</div>;
  }

  const stats = [
    { label: 'Total Clients', value: storeStats.totalClients, icon: 'fa-users', color: 'text-red-600' },
    { label: 'Pending Payments', value: storeStats.pendingPayments, icon: 'fa-credit-card', color: 'text-red-600' },
    { label: 'Pending Requests', value: pendingRequests.length, icon: 'fa-clock', color: 'text-red-600' },
    { label: 'Missed Today', value: storeStats.missedToday, icon: 'fa-calendar-times', color: 'text-red-600' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white border border-black/5 p-6 rounded-3xl hover:border-red-600/20 transition-all shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <i className={`fas ${stat.icon} text-xl ${stat.color}`}></i>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Realtime</span>
            </div>
            <p className="text-3xl font-black text-black mb-1">{stat.value}</p>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-black">
            <i className="fas fa-history text-red-600"></i>
            Recent Activity
          </h3>
          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {recentActivity.length > 0 ? recentActivity.map(activity => (
              <div key={activity.id} className="flex items-start gap-4 p-4 rounded-2xl bg-neutral-50 border border-black/5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.type === 'ATTENDANCE' ? 'bg-red-600/10 text-red-600' : 'bg-black/5 text-black'}`}>
                  <i className={`fas ${activity.type === 'ATTENDANCE' ? 'fa-check' : 'fa-receipt'}`}></i>
                </div>
                <div>
                  <p className="text-sm font-bold text-black">{activity.title}</p>
                  <p className="text-xs text-neutral-500">{activity.description}</p>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold mt-1 inline-block">
                    {new Date(activity.date).toLocaleString()}
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-neutral-400">
                <p className="text-sm">No recent activity found.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-black">
              <i className="fas fa-clock text-red-600"></i>
              Pending Reschedule Requests
            </h3>
            <div className="space-y-4">
              {pendingRequests.map((req, i) => {
                const client = clients.find(c => c.id === req.clientId);
                return (
                  <div key={i} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-black/5">
                    <div>
                      <span className="text-sm font-bold block text-black">{client?.name || client?.email}</span>
                      <span className="text-[10px] text-neutral-400 uppercase font-bold">Requested: {new Date(req.requestedDate).toLocaleDateString()}</span>
                    </div>
                    <span className="px-3 py-1 bg-red-600/10 text-red-600 text-[10px] font-black uppercase rounded-full">Action Required</span>
                  </div>
                );
              })}
              {pendingRequests.length === 0 && (
                <p className="text-neutral-400 text-sm text-center py-10">No pending requests.</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-black">
              <i className="fas fa-bell text-red-600"></i>
              Upcoming Renewals
            </h3>
            <div className="space-y-4">
              {renewals.map((client, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-black/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400">
                      <i className="fas fa-user text-xs"></i>
                    </div>
                    <span className="text-sm font-bold text-black">{client.name || client.email}</span>
                  </div>
                  <span className="px-3 py-1 bg-red-600/10 text-red-600 text-[10px] font-black uppercase rounded-full">Renewal Due</span>
                </div>
              ))}
              {renewals.length === 0 && (
                <p className="text-neutral-400 text-sm text-center py-10">No upcoming renewals this week.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
