import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { User, WorkoutLog, Message } from '../../types';
import { Link } from 'react-router-dom';
import { Users, ClipboardList, MessageSquare, Calendar, ChevronRight, Activity } from 'lucide-react';

interface Props {
  userData: any;
}

const TrainerDashboard: React.FC<Props> = ({ userData }) => {
  const [clients, setClients] = useState<User[]>([]);
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientsData = await api.getUsers();
        // Filter for clients only
        const clientsOnly = clientsData.filter((u: User) => u.role === 'CLIENT');
        setClients(clientsOnly);

        // Fetch logs for all clients
        const allLogs = await api.getWorkoutLogs();
        setRecentLogs(allLogs.slice(0, 5));

        setLoading(false);
      } catch (error) {
        console.error("Error fetching trainer data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Calculate alerts (e.g., inactive clients - no activity in 7 days)
  const getAlerts = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return clients.filter(client => {
      if (!client.lastActive) return true; // Assume inactive if no activity recorded
      return new Date(client.lastActive) < sevenDaysAgo;
    });
  };

  const alerts = getAlerts();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Syncing Systems...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-2 h-2 bg-brand-red animate-pulse"></div>
            <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-brand-red/80">BUILD TO TRANSFORMATION</p>
          </div>
          <h2 className="text-6xl font-display italic uppercase leading-tight text-white">
            Command <span className="text-brand-red">Center</span>
          </h2>
          <p className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mt-4">
            Welcome back, {userData?.name || 'Trainer'}. Monitoring {clients.length} active recruits.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Local Time</p>
            <p className="text-xl font-mono text-white">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Recruits', value: clients.length, icon: Users, color: 'brand-red' },
          { label: 'Alerts (Inactive)', value: alerts.length, icon: Activity, color: 'brand-red' },
          { label: 'Recent Logs', value: recentLogs.length, icon: ClipboardList, color: 'brand-red' },
          { label: 'Scheduled', value: 0, icon: Calendar, color: 'brand-red' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-3xl relative overflow-hidden group hover:border-brand-red/50 transition-colors">
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 group-hover:opacity-10 transition-opacity`}>
              <stat.icon className="w-full h-full" />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-4">{stat.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-4xl font-display italic leading-none">{stat.value}</p>
              <stat.icon className={`w-5 h-5 text-${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Clients List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="w-4 h-4 text-brand-red" />
              <h3 className="text-xl font-display italic uppercase tracking-wider">Recruit Roster</h3>
            </div>
            <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">{clients.length} Total</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clients.length === 0 ? (
              <div className="col-span-full bg-neutral-900/30 border border-dashed border-neutral-800 p-10 rounded-3xl text-center">
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600">No active recruits found in system.</p>
              </div>
            ) : (
              clients.map(client => (
                <Link 
                  key={client.id} 
                  to={`/client/${client.id}`}
                  className="bg-neutral-900/50 border border-neutral-800 p-5 rounded-3xl hover:border-brand-red/50 transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-display italic text-xl ${alerts.find(a => a.id === client.id) ? 'bg-brand-red text-white' : 'bg-neutral-800 text-brand-red'} group-hover:bg-brand-red group-hover:text-white transition-colors`}>
                      {(client.name || client.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white uppercase tracking-wider truncate">{client.name || 'Unnamed Client'}</p>
                      <p className="text-[10px] font-mono text-neutral-500 uppercase truncate">{client.email}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-700 group-hover:text-brand-red group-hover:translate-x-1 transition-all" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Sidebar (Alerts & Progress) */}
        <div className="space-y-10">
          {/* Alerts */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <Activity className="w-4 h-4 text-brand-red" />
              <h3 className="text-xl font-display italic uppercase tracking-wider">Alerts</h3>
            </div>
            {alerts.length === 0 ? (
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No alerts.</p>
            ) : (
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div key={alert.id} className="bg-neutral-900/50 border border-brand-red/20 p-4 rounded-2xl">
                    <p className="text-xs text-white font-bold">Inactive Recruit</p>
                    <p className="text-[10px] font-mono text-neutral-500">{alert.name || alert.email} has been inactive for over 7 days.</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Progress Overview */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <ClipboardList className="w-4 h-4 text-brand-red" />
              <h3 className="text-xl font-display italic uppercase tracking-wider">Recent Progress</h3>
            </div>
            {recentLogs.length === 0 ? (
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No recent progress logs.</p>
            ) : (
              <div className="space-y-2">
                {recentLogs.map(log => (
                  <div key={log.id} className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-2xl">
                    <p className="text-xs text-white font-bold">Workout Log</p>
                    <p className="text-[10px] font-mono text-neutral-500">{new Date(log.date).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainerDashboard;
