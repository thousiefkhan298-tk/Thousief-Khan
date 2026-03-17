import React, { useState, useEffect, useMemo } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { User, WorkoutLog } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import { Users, ClipboardList, MessageSquare, Calendar, ChevronRight, Activity, LogOut, Search, CreditCard, UserPlus, Trash2, Bell, TrendingUp } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, isSameDay } from 'date-fns';

interface Props {
  userData: any;
}

const TrainerDashboard: React.FC<Props> = ({ userData }) => {
  const [clients, setClients] = useState<User[]>([]);
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<{ id: string, clientId?: string, type: 'inactive' | 'session' | 'payment' | 'message', title: string, message: string, date: number }[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientToRemove, setClientToRemove] = useState<{ id: string, name: string } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'attendance' | 'payment', label: string } | null>(null);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
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

    const unsubscribeAttendance = firebaseService.subscribeToAllAttendance((data) => {
      setAttendanceRecords(data);
    });

    const unsubscribeMessages = firebaseService.subscribeToMessages(userData.uid, (msgs) => {
      setMessages(msgs);
    });

    setLoading(false);

    return () => {
      unsubscribeUsers();
      unsubscribeLogs();
      unsubscribeRequests();
      unsubscribePayments();
      unsubscribeSessions();
      unsubscribeAttendance();
      unsubscribeMessages();
    };
  }, [userData.uid]);

  useEffect(() => {
    if (clients.length === 0) return;

    const newAlerts: { id: string, clientId?: string, type: 'inactive' | 'session' | 'payment' | 'message', title: string, message: string, date: number }[] = [];
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fortyEightHoursFromNow = new Date();
    fortyEightHoursFromNow.setHours(fortyEightHoursFromNow.getHours() + 48);

    clients.forEach(client => {
      // 1. Inactive clients
      const clientLogs = recentLogs.filter((log: WorkoutLog) => log.clientId === client.id);
      const lastLog = clientLogs.sort((a: WorkoutLog, b: WorkoutLog) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      if (!lastLog || new Date(lastLog.date) < sevenDaysAgo) {
        newAlerts.push({ 
          id: `inactive-${client.id}`, 
          clientId: client.id, 
          type: 'inactive',
          title: 'Inactive Client',
          message: `${client.name || client.email} has no workout logs in 7+ days.`,
          date: now.getTime()
        });
      }

      // 2. Overdue payments
      const clientPayments = paymentRecords.filter(p => p.clientId === client.id && p.status !== 'Paid');
      clientPayments.forEach(payment => {
        if (new Date(payment.dueDate) < now) {
          newAlerts.push({
            id: `payment-${payment.id}`,
            clientId: client.id,
            type: 'payment',
            title: 'Overdue Payment',
            message: `${client.name || client.email} has an overdue payment for ${payment.package}.`,
            date: new Date(payment.dueDate).getTime()
          });
        }
      });

      // 3. Upcoming sessions
      const clientSessions = sessions.filter(s => s.clientId === client.id && s.status === 'CONFIRMED');
      clientSessions.forEach(session => {
        const sessionDate = new Date(session.date);
        if (sessionDate >= now && sessionDate <= fortyEightHoursFromNow) {
          newAlerts.push({
            id: `session-${session.id}`,
            clientId: client.id,
            type: 'session',
            title: 'Upcoming Session',
            message: `Session with ${client.name || client.email} on ${sessionDate.toLocaleDateString()} at ${session.time}.`,
            date: sessionDate.getTime()
          });
        }
      });
    });

    // 4. Unread messages
    messages.forEach(msg => {
      if (!msg.read && msg.senderId !== userData.uid) {
        const sender = clients.find(c => c.id === msg.senderId);
        newAlerts.push({
          id: `msg-${msg.id}`,
          clientId: msg.senderId,
          type: 'message',
          title: 'New Message',
          message: `Unread message from ${sender?.name || 'Client'}.`,
          date: new Date(msg.timestamp).getTime()
        });
      }
    });

    newAlerts.sort((a, b) => b.date - a.date);
    setAlerts(newAlerts);
  }, [clients, recentLogs, paymentRecords, sessions, messages, userData.uid]);

  const handleUpdateReschedule = async (id: string, status: string) => {
    try {
      await firebaseService.updateRescheduleRequest(id, { status });
    } catch (err) {
      console.error("Error updating reschedule request:", err);
      alert('Failed to update request.');
    }
  };

  const handleRemoveClient = (e: React.MouseEvent, clientId: string, clientName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setClientToRemove({ id: clientId, name: clientName });
  };

  const confirmRemoveClient = async () => {
    if (!clientToRemove) return;
    
    try {
      await firebaseService.deleteClientData(clientToRemove.id);
      setClientToRemove(null);
    } catch (error) {
      console.error("Error removing client:", error);
      alert("Failed to remove client.");
    }
  };

  const cancelRemoveClient = () => {
    setClientToRemove(null);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      if (itemToDelete.type === 'attendance') {
        await firebaseService.deleteAttendance(itemToDelete.id);
      } else if (itemToDelete.type === 'payment') {
        await firebaseService.deletePaymentRecord(itemToDelete.id);
      }
      setItemToDelete(null);
    } catch (error) {
      console.error(`Error deleting ${itemToDelete.type}:`, error);
    }
  };

  const handleSavePaymentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    try {
      await firebaseService.updatePaymentRecord(editingPayment.id, {
        package: editingPayment.package,
        status: editingPayment.status,
        startDate: editingPayment.startDate,
        dueDate: editingPayment.dueDate
      });
      setEditingPayment(null);
    } catch (error) {
      console.error("Error updating payment:", error);
    }
  };

  const handleAddClient = () => {
    // In a real app, this would open a modal to invite/add a client
    alert("This feature would open a modal to invite a new client via email or generate an invite link.");
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

  const activityData = useMemo(() => {
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const count = recentLogs.filter(log => isSameDay(new Date(log.date), date)).length;
      data.push({
        name: format(date, 'MMM dd'),
        logs: count,
      });
    }
    return data;
  }, [recentLogs]);

  const revenueData = useMemo(() => {
    // Group payments by month for the last 6 months
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = subDays(new Date(), i * 30);
      const monthStr = format(date, 'MMM');
      const monthPayments = paymentRecords.filter(p => {
        const pDate = new Date(p.startDate);
        return pDate.getMonth() === date.getMonth() && pDate.getFullYear() === date.getFullYear();
      });
      data.push({
        name: monthStr,
        amount: monthPayments.length * 100, // Mocking amount since it's not in type, or just count
        count: monthPayments.length
      });
    }
    return data;
  }, [paymentRecords]);

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
          <h2 className="text-8xl font-display italic uppercase leading-tight text-white">
            Command <span className="text-brand-red">Center</span>
          </h2>
          <p className="text-neutral-300 font-mono text-[10px] uppercase tracking-widest mt-4">
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
          { label: 'Active Recruits', value: clients.length, icon: Users, color: 'brand-red', trend: '+12%' },
          { label: 'System Alerts', value: alerts.length, icon: Activity, color: 'brand-red', trend: 'Critical' },
          { label: 'Total Logs', value: recentLogs.length, icon: ClipboardList, color: 'brand-red', trend: 'Last 30d' },
          { label: 'Confirmed Sessions', value: sessions.filter(s => s.status === 'Confirmed').length, icon: Calendar, color: 'brand-red', trend: 'Next 48h' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 p-6 rounded-[2rem] relative overflow-hidden group hover:border-brand-red/30 transition-all duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 rotate-12 group-hover:rotate-0">
              <stat.icon className="w-full h-full" />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-neutral-800/50 rounded-2xl border border-neutral-700/50 group-hover:border-brand-red/30 transition-colors">
                <stat.icon className="w-4 h-4 text-brand-red" />
              </div>
              <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest bg-neutral-800/30 px-2 py-1 rounded-lg border border-neutral-800/50">
                {stat.trend}
              </span>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 mb-1">{stat.label}</p>
            <p className="text-5xl font-display italic leading-none text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 p-8 rounded-[2.5rem] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-4 h-4 text-brand-red" />
              <h3 className="text-xl font-display italic uppercase tracking-wider">Activity Volume</h3>
            </div>
            <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Last 14 Days</p>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorLogs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff0000" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ff0000" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#737373', fontSize: 10, fontFamily: 'monospace' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#737373', fontSize: 10, fontFamily: 'monospace' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '12px', fontSize: '10px', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#ff0000' }}
                  cursor={{ stroke: '#ff0000', strokeWidth: 1 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="logs" 
                  stroke="#ff0000" 
                  fillOpacity={1} 
                  fill="url(#colorLogs)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 p-8 rounded-[2.5rem] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCard className="w-4 h-4 text-brand-red" />
              <h3 className="text-xl font-display italic uppercase tracking-wider">Revenue Stream</h3>
            </div>
            <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Last 6 Months</p>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#737373', fontSize: 10, fontFamily: 'monospace' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#737373', fontSize: 10, fontFamily: 'monospace' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '12px', fontSize: '10px', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#ff0000' }}
                  cursor={{ fill: '#262626', opacity: 0.4 }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#ff0000" 
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Clients List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Activity className="w-4 h-4 text-brand-red" />
              <h3 className="text-xl font-display italic uppercase tracking-wider">Client Roster</h3>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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
              <button 
                onClick={handleAddClient}
                className="btn-primary flex items-center justify-center space-x-2 py-2 px-4 whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Client</span>
              </button>
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
              filteredClients.map(client => {
                const clientAttendance = attendanceRecords
                  .filter(a => a.clientId === client.id)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const recentAttendance = clientAttendance[0];

                return (
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
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="text-[10px] font-mono text-neutral-300 uppercase truncate">{client.email}</p>
                          {clientAttendance.slice(0, 3).map(a => (
                            <div key={a.id} className="flex items-center space-x-2 bg-neutral-800/50 px-2 py-1 rounded-lg">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest border ${
                                a.status === 'Present' 
                                  ? 'bg-emerald-900/30 text-emerald-500 border-emerald-800/50' 
                                  : 'bg-brand-red/20 text-brand-red border-brand-red/30'
                              }`}>
                                {a.status}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  firebaseService.updateAttendance(a.id, {
                                    status: a.status === 'Present' ? 'Absent' : 'Present'
                                  });
                                }}
                                className="text-[8px] font-mono uppercase tracking-widest text-neutral-500 hover:text-brand-red"
                              >
                                [Correct]
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setItemToDelete({ id: a.id, type: 'attendance', label: `attendance record for ${a.date}` });
                                }}
                                className="text-[8px] font-mono uppercase tracking-widest text-neutral-500 hover:text-brand-red ml-2"
                              >
                                [Delete]
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button 
                        onClick={(e) => handleRemoveClient(e, client.id, client.name || client.email || '')}
                        className="p-2 text-neutral-600 hover:text-brand-red hover:bg-brand-red/10 rounded-xl transition-colors"
                        title="Remove Client"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-neutral-700 group-hover:text-brand-red group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                );
              })
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
                    <p className="text-xs text-white font-bold">{alert.title}</p>
                    <p className="text-[10px] font-mono text-neutral-500">{alert.message}</p>
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
            {rescheduleRequests.filter(req => req.status === 'PENDING').length === 0 ? (
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No pending requests.</p>
            ) : (
              <div className="space-y-4">
                {rescheduleRequests.filter(req => req.status === 'PENDING').map(req => {
                  const client = clients.find(c => c.id === req.clientId);
                  return (
                    <div key={req.id} className="bg-neutral-900/50 border border-brand-red/30 p-5 rounded-2xl space-y-3 shadow-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-brand-red font-bold uppercase tracking-widest">{client?.name || 'Unknown Client'}</p>
                          <p className="text-[10px] font-mono text-neutral-400 mt-1">
                            Requested Date: <span className="text-white">{new Date(req.requestedDate).toLocaleDateString()}</span>
                          </p>
                          <p className="text-[10px] font-mono text-neutral-500">
                            Original Date: {new Date(req.originalDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-full text-[8px] font-mono uppercase tracking-widest">Pending</span>
                      </div>
                      
                      <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                        <p className="text-xs text-neutral-300 font-mono italic">"{req.reason}"</p>
                      </div>

                      <div className="flex space-x-3 pt-2">
                        <button 
                          onClick={() => handleUpdateReschedule(req.id, 'APPROVED')} 
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono uppercase tracking-widest py-2 rounded-xl transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleUpdateReschedule(req.id, 'REJECTED')} 
                          className="flex-1 bg-neutral-800 hover:bg-brand-red text-white text-xs font-mono uppercase tracking-widest py-2 rounded-xl transition-colors border border-neutral-700 hover:border-brand-red"
                        >
                          Reject
                        </button>
                      </div>
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
                      <div className="flex space-x-2 mt-2">
                        <button 
                          onClick={() => firebaseService.updatePaymentRecord(record.id, { status: 'Paid' })}
                          className="bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600 hover:text-white text-[10px] px-2 py-1 rounded transition-colors font-mono uppercase tracking-widest"
                        >
                          Mark Paid
                        </button>
                        <button 
                          onClick={() => setEditingPayment(record)}
                          className="bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 text-[10px] px-2 py-1 rounded transition-colors font-mono uppercase tracking-widest"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => setItemToDelete({ id: record.id, type: 'payment', label: `payment record for ${record.package}` })}
                          className="bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white text-[10px] px-2 py-1 rounded transition-colors font-mono uppercase tracking-widest"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Confirmation Modal */}
      {clientToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-display italic uppercase tracking-wider text-white mb-2">Remove Client</h3>
            <p className="text-neutral-400 mb-6">
              Are you sure you want to remove <span className="text-brand-red font-bold">{clientToRemove.name || 'this client'}</span> from the system? 
              This will permanently delete all associated data including workout logs, plans, diet plans, attendance, and payment records. This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={cancelRemoveClient}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-xl font-mono uppercase tracking-widest text-xs transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmRemoveClient}
                className="flex-1 bg-brand-red hover:bg-red-600 text-white py-3 rounded-xl font-mono uppercase tracking-widest text-xs transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-display italic uppercase tracking-wider text-white mb-2">Delete Record</h3>
            <p className="text-neutral-400 mb-6">
              Are you sure you want to delete this <span className="text-brand-red font-bold">{itemToDelete.label}</span>? 
              This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setItemToDelete(null)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-xl font-mono uppercase tracking-widest text-xs transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 bg-brand-red hover:bg-red-600 text-white py-3 rounded-xl font-mono uppercase tracking-widest text-xs transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-display italic uppercase tracking-wider text-white mb-6">Edit Payment Record</h3>
            <form onSubmit={handleSavePaymentEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 ml-1">Package Name</label>
                <input
                  type="text"
                  required
                  value={editingPayment.package}
                  onChange={(e) => setEditingPayment({ ...editingPayment, package: e.target.value })}
                  className="input-field font-mono text-xs w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 ml-1">Status</label>
                <select
                  value={editingPayment.status}
                  onChange={(e) => setEditingPayment({ ...editingPayment, status: e.target.value })}
                  className="input-field font-mono text-xs w-full"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 ml-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editingPayment.startDate}
                    onChange={(e) => setEditingPayment({ ...editingPayment, startDate: e.target.value })}
                    className="input-field font-mono text-xs w-full"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 ml-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={editingPayment.dueDate}
                    onChange={(e) => setEditingPayment({ ...editingPayment, dueDate: e.target.value })}
                    className="input-field font-mono text-xs w-full"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-xl font-mono uppercase tracking-widest text-xs transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-brand-red hover:bg-red-600 text-white py-3 rounded-xl font-mono uppercase tracking-widest text-xs transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerDashboard;

