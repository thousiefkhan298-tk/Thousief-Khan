import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { User, WorkoutLog } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import { Users, ClipboardList, MessageSquare, Calendar, ChevronRight, Activity, LogOut, Search, CreditCard } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

interface Props {
  userData: any;
}

const TrainerDashboard: React.FC<Props> = ({ userData }) => {
  const [clients, setClients] = useState<User[]>([]);
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<{ clientId: string, name: string, reason: string }[]>([]);
  const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeUsers = firebaseService.subscribeToUsers((users) => {
      const clientsOnly = users.filter((u: User) => u.role === 'CLIENT');
      setClients(clientsOnly);
    });

    const unsubscribeLogs = firebaseService.subscribeToWorkoutLogs((logs) => {
      setRecentLogs(logs);
    });

    const unsubscribeRequests = firebaseService.subscribeToRescheduleRequests((requests) => {
      setRescheduleRequests(requests);
    });

    const unsubscribePayments = firebaseService.subscribeToAllPaymentRecords((records) => {
      setPaymentRecords(records);
    });

    const unsubscribeSessions = firebaseService.subscribeToAllSessions((data) => {
      setSessions(data);
    });

    setLoading(false);

    return () => {
      unsubscribeUsers();
      unsubscribeLogs();
      unsubscribeRequests();
      unsubscribePayments();
      unsubscribeSessions();
    };
  }, []);

  useEffect(() => {
    if (clients.length === 0 || recentLogs.length === 0) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newAlerts: { clientId: string, name: string, reason: string }[] = [];

    clients.forEach(async (client) => {
      const clientLogs = recentLogs.filter((log: WorkoutLog) => log.clientId === client.id);
      const lastLog = clientLogs.sort((a: WorkoutLog, b: WorkoutLog) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      if (!lastLog || new Date(lastLog.date) < sevenDaysAgo) {
        newAlerts.push({ clientId: client.id, name: client.name || client.email, reason: 'Inactive (No workout logs in 7+ days)' });
      }
    });
    setAlerts(newAlerts);
  }, [clients, recentLogs]);

  const handleUpdateReschedule = async (id: string, status: string) => {
    try {
      await firebaseService.updateRescheduleRequest(id, { status });
    } catch (err) {
      console.error("Error updating reschedule request:", err);
      alert('Failed to update request.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase();
    return (
      (client.name && client.name.toLowerCase().includes(query)) ||
      (client.email && client.email.toLowerCase().includes(query))
    );
  });

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
      <div className="flex justify-end mb-4">
        <button onClick={handleLogout} className="flex items-center text-neutral-500 hover:text-white transition-colors">
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </button>
      </div>
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
          { label: 'Alerts', value: alerts.length, icon: Activity, color: 'brand-red' },
          { label: 'Recent Logs', value: recentLogs.length, icon: ClipboardList, color: 'brand-red' },
          { label: 'Scheduled', value: sessions.filter(s => s.status === 'Confirmed').length, icon: Calendar, color: 'brand-red' },
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Activity className="w-4 h-4 text-brand-red" />
              <h3 className="text-xl font-display italic uppercase tracking-wider">Recruit Roster</h3>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search recruits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl py-2 pl-10 pr-4 text-sm font-mono text-white focus:outline-none focus:border-brand-red/50 transition-colors"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClients.length === 0 ? (
              <div className="col-span-full bg-neutral-900/30 border border-dashed border-neutral-800 p-10 rounded-3xl text-center">
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600">
                  {searchQuery ? 'No recruits match your search.' : 'No active recruits found in system.'}
                </p>
              </div>
            ) : (
              filteredClients.map(client => (
                <Link 
                  key={client.id} 
                  to={`/client/${client.id}`}
                  className="bg-neutral-900/50 border border-neutral-800 p-5 rounded-3xl hover:border-brand-red/50 transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-display italic text-xl ${alerts.find(a => a.clientId === client.id) ? 'bg-brand-red text-white' : 'bg-neutral-800 text-brand-red'} group-hover:bg-brand-red group-hover:text-white transition-colors`}>
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
                  <div key={alert.clientId} className="bg-neutral-900/50 border border-brand-red/20 p-4 rounded-2xl">
                    <p className="text-xs text-white font-bold">{alert.reason}</p>
                    <p className="text-[10px] font-mono text-neutral-500">{alert.name}</p>
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
                {recentLogs.map(log => {
                  const client = clients.find(c => c.id === log.clientId);
                  return (
                    <div key={log.id} className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-2xl">
                      <p className="text-xs text-brand-red font-mono uppercase tracking-widest">{client?.name || 'Unknown Client'}</p>
                      <p className="text-xs text-white font-bold">Workout Log</p>
                      <p className="text-[10px] font-mono text-neutral-500">{new Date(log.date).toLocaleDateString()}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reschedule Requests */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-brand-red" />
              <h3 className="text-xl font-display italic uppercase tracking-wider">Reschedule Requests</h3>
            </div>
            {rescheduleRequests.length === 0 ? (
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No requests.</p>
            ) : (
              <div className="space-y-2">
                {rescheduleRequests.map(req => {
                  const client = clients.find(c => c.id === req.clientId);
                  return (
                    <div key={req.id} className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-2xl space-y-2">
                      <p className="text-xs text-brand-red font-mono uppercase tracking-widest">{client?.name || 'Unknown Client'}</p>
                      <p className="text-xs text-white font-bold">{req.reason}</p>
                      <p className="text-[10px] font-mono text-neutral-500">{new Date(req.originalDate).toLocaleDateString()} to {new Date(req.requestedDate).toLocaleDateString()}</p>
                      {req.status === 'PENDING' && (
                        <div className="flex space-x-2 pt-2">
                          <button onClick={() => handleUpdateReschedule(req.id, 'APPROVED')} className="btn-primary text-[10px] px-2 py-1">Approve</button>
                          <button onClick={() => handleUpdateReschedule(req.id, 'REJECTED')} className="btn-secondary text-[10px] px-2 py-1">Reject</button>
                        </div>
                      )}
                      {req.status !== 'PENDING' && <p className="text-[10px] font-mono text-brand-red">{req.status}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Reminders */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <CreditCard className="w-4 h-4 text-brand-red" />
              <h3 className="text-xl font-display italic uppercase tracking-wider">Payment Reminders</h3>
            </div>
            {paymentRecords.filter(p => p.status !== 'Paid').length === 0 ? (
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No pending payments.</p>
            ) : (
              <div className="space-y-2">
                {paymentRecords.filter(p => p.status !== 'Paid').map(record => {
                  const client = clients.find(c => c.id === record.clientId);
                  return (
                    <div key={record.id} className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-2xl flex flex-col space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-white font-bold">{client?.name || 'Unknown Client'}</p>
                          <p className="text-[10px] font-mono text-neutral-500">{record.package}</p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-[8px] font-mono uppercase ${record.status === 'Overdue' ? 'bg-brand-red/20 text-brand-red' : 'bg-yellow-900/50 text-yellow-500'}`}>
                          {record.status}
                        </div>
                      </div>
                      <p className="text-[10px] font-mono text-neutral-500">Due: {new Date(record.dueDate).toLocaleDateString()}</p>
                      <button 
                        onClick={() => firebaseService.updatePaymentRecord(record.id, { status: 'Paid' })}
                        className="btn-primary text-[10px] px-2 py-1 mt-2 self-start"
                      >
                        Mark as Paid
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainerDashboard;

