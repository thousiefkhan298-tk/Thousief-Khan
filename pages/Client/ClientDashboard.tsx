
import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import Sidebar from '../../components/Sidebar';
import { User, UserRole } from '../../types';
import { store } from '../../store';
import { socket } from '../../socket';
import ClientMessages from './tabs/ClientMessages';
import Logo from '../../components/Logo';

interface ClientDashboardProps {
  user: User;
  onLogout: () => void;
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('workout');
  const [data, setData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logEntries, setLogEntries] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [rescheduleSuccess, setRescheduleSuccess] = useState('');
  const [currentEntry, setCurrentEntry] = useState({
    exercise: '',
    sets: '',
    reps: '',
    weight: ''
  });
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedMissedSession, setSelectedMissedSession] = useState<any>(null);
  const [requestedDate, setRequestedDate] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [workoutNote, setWorkoutNote] = useState('');
  const [confirmWorkoutModalOpen, setConfirmWorkoutModalOpen] = useState(false);
  const [confirmRescheduleModalOpen, setConfirmRescheduleModalOpen] = useState(false);

  const handleOpenReschedule = (session: any) => {
    setSelectedMissedSession(session);
    setRequestedDate('');
    setRequestNote('');
    setRescheduleModalOpen(true);
  };

  const handleSubmitReschedule = async () => {
    if (!selectedMissedSession || !requestedDate) return;
    setConfirmRescheduleModalOpen(false);
    setSubmitting(true);
    try {
      await store.createSessionRequest({
        clientId: user.id,
        originalDate: selectedMissedSession.date,
        requestedDate: requestedDate,
        notes: requestNote
      });
      setRescheduleModalOpen(false);
      fetchData();
      setRescheduleSuccess('Reschedule request sent to trainer!');
      setTimeout(() => setRescheduleSuccess(''), 5000);
    } catch (error) {
      alert('Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const addEntry = () => {
    if (currentEntry.exercise && currentEntry.sets && currentEntry.reps) {
      setLogEntries([...logEntries, currentEntry]);
      setCurrentEntry({ exercise: '', sets: '', reps: '', weight: '' });
    }
  };

  const removeEntry = (index: number) => {
    setLogEntries(logEntries.filter((_, i) => i !== index));
  };

  const submitWorkoutLog = async () => {
    if (logEntries.length === 0) return;
    setConfirmWorkoutModalOpen(false);
    setSubmitting(true);
    try {
      const log = {
        id: Date.now().toString(),
        clientId: user.id,
        date: new Date().toISOString(),
        entries: logEntries,
        notes: workoutNote
      };
      await store.saveWorkoutLog(log);
      setLogEntries([]);
      setWorkoutNote('');
      fetchData();
      setSuccessMessage('Workout logged successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      alert('Failed to log workout');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      // setLoading(true); // Avoid flickering
      const [clientData, notifs] = await Promise.all([
        store.getClientData(user.id),
        store.getNotifications(user.id)
      ]);
      setData(clientData);
      setNotifications(notifs);
      setLoading(false);

      if (activeTab === 'notifications') {
        await store.markNotificationsAsRead(user.id);
      }
    } catch (error) {
      console.error('Failed to fetch client data:', error);
      setLoading(false);
    }
  }, [user.id, activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleUpdate = (clientId: string) => {
      if (clientId === user.id) {
        fetchData();
      }
    };
    socket.on('client_updated', handleUpdate);
    return () => {
      socket.off('client_updated', handleUpdate);
    };
  }, [user.id, fetchData]);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-red-600 animate-pulse font-bold tracking-widest uppercase">Loading Profile...</div>
      </div>
    );
  }

  const [chartData, setChartData] = useState<{ frequency: any[], volume: any[] }>({ frequency: [], volume: [] });

  useEffect(() => {
    if (data) {
      // Process Frequency Data (Sessions per Week)
      const frequencyMap = new Map<string, number>();
      (data.attendance || []).forEach((log: any) => {
        if (log.status === 'Present') {
          const date = new Date(log.date);
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay())).toLocaleDateString();
          frequencyMap.set(weekStart, (frequencyMap.get(weekStart) || 0) + 1);
        }
      });
      const frequency = Array.from(frequencyMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-8); // Last 8 weeks

      // Process Volume Data (Total Volume per Session)
      const volume = (data.workoutLogs || [])
        .map((log: any) => {
          const totalVolume = log.entries.reduce((acc: number, entry: any) => {
            return acc + (Number(entry.sets) * Number(entry.reps) * (Number(entry.weight) || 0));
          }, 0);
          return {
            date: new Date(log.date).toLocaleDateString(),
            volume: totalVolume
          };
        })
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-10); // Last 10 sessions

      setChartData({ frequency, volume });
    }
  }, [data]);

  const renderContent = () => {
    switch (activeTab) {
      case 'workout':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold flex items-center gap-3">
                      <i className="fas fa-dumbbell text-red-600"></i>
                      Training Plan
                    </h3>
                    <span className="text-[10px] font-black uppercase text-neutral-500 bg-neutral-50 px-3 py-1 rounded-full border border-black/10">
                      Updated {data.workout ? new Date(data.workout.updatedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  {data.workout ? (
                    <div className="whitespace-pre-wrap font-mono text-neutral-700 leading-relaxed bg-neutral-50 p-8 rounded-2xl border border-black/10 text-sm">
                      {data.workout.plan}
                    </div>
                  ) : (
                    <div className="text-center py-20 text-neutral-500 border border-dashed border-black/10 rounded-2xl">
                       <p className="font-bold uppercase tracking-widest text-sm mb-2 text-black">No Workout Assigned Yet</p>
                       <p className="text-xs">Your trainer is currently preparing your routine.</p>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-xl">
                  <h3 className="text-2xl font-bold flex items-center gap-3 mb-6">
                    <i className="fas fa-edit text-red-600"></i>
                    Log Completed Workout
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-black text-neutral-500 uppercase mb-2">Exercise</label>
                      <input 
                        type="text" 
                        value={currentEntry.exercise}
                        onChange={e => setCurrentEntry({...currentEntry, exercise: e.target.value})}
                        className="w-full bg-neutral-50 border border-black/10 rounded-xl px-4 py-2 text-sm focus:border-red-600 outline-none text-black"
                        placeholder="e.g. Bench Press"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-neutral-500 uppercase mb-2">Sets</label>
                      <input 
                        type="text" 
                        value={currentEntry.sets}
                        onChange={e => setCurrentEntry({...currentEntry, sets: e.target.value})}
                        className="w-full bg-neutral-50 border border-black/10 rounded-xl px-4 py-2 text-sm focus:border-red-600 outline-none text-black"
                        placeholder="e.g. 4"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-neutral-500 uppercase mb-2">Reps</label>
                      <input 
                        type="text" 
                        value={currentEntry.reps}
                        onChange={e => setCurrentEntry({...currentEntry, reps: e.target.value})}
                        className="w-full bg-neutral-50 border border-black/10 rounded-xl px-4 py-2 text-sm focus:border-red-600 outline-none text-black"
                        placeholder="e.g. 10"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-neutral-500 uppercase mb-2">Weight (kg)</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={currentEntry.weight}
                          onChange={e => setCurrentEntry({...currentEntry, weight: e.target.value})}
                          className="w-full bg-neutral-50 border border-black/10 rounded-xl px-4 py-2 text-sm focus:border-red-600 outline-none text-black"
                          placeholder="e.g. 60"
                        />
                        <button 
                          onClick={addEntry}
                          className="bg-red-600 text-white p-2 rounded-xl hover:bg-red-500 transition-colors"
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  {logEntries.length > 0 && (
                    <div className="space-y-3 mb-6">
                      {logEntries.map((entry, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-black/10">
                          <div className="flex gap-4 items-center">
                            <span className="text-sm font-bold text-black">{entry.exercise}</span>
                            <span className="text-xs text-neutral-500">{entry.sets} sets x {entry.reps} reps {entry.weight ? `@ ${entry.weight}kg` : ''}</span>
                          </div>
                          <button onClick={() => removeEntry(idx)} className="text-red-600 hover:text-red-500">
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mb-6">
                    <label className="block text-[10px] font-black text-neutral-500 uppercase mb-2">Workout Notes (Optional)</label>
                    <textarea
                      value={workoutNote}
                      onChange={(e) => setWorkoutNote(e.target.value)}
                      className="w-full bg-neutral-50 border border-black/10 rounded-xl px-4 py-3 text-sm focus:border-red-600 outline-none text-black h-20 resize-none"
                      placeholder="How did it feel? Any PRs?"
                    />
                  </div>

                  <button 
                    onClick={() => setConfirmWorkoutModalOpen(true)}
                    disabled={logEntries.length === 0 || submitting}
                    className="w-full py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Logging...</span>
                      </>
                    ) : (
                      <span>Submit Workout Log</span>
                    )}
                  </button>
                  {successMessage && (
                    <div className="mt-4 p-3 bg-red-600/10 border border-red-600/20 rounded-xl text-center">
                      <p className="text-red-600 font-bold text-sm flex items-center justify-center gap-2">
                        <i className="fas fa-check-circle"></i>
                        {successMessage}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-xl">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-bold flex items-center gap-3 text-black">
                      <i className="fas fa-history text-red-600"></i>
                      Workout History
                    </h3>
                    <span className="text-[10px] font-black uppercase text-neutral-500 bg-neutral-50 px-3 py-1 rounded-full border border-black/10">
                      {data.workoutLogs?.length || 0} Sessions Logged
                    </span>
                  </div>
                  {data.workoutLogs && data.workoutLogs.length > 0 ? (
                    <div className="space-y-8">
                      {data.workoutLogs.slice().reverse().map((log: any) => (
                        <div key={log.id} className="relative pl-8 border-l border-black/10 group">
                          <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-white border border-black/20 group-hover:bg-red-600 group-hover:border-red-500 transition-colors"></div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <p className="text-xs font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                              <i className="far fa-calendar-alt opacity-50"></i>
                              {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase bg-neutral-50 px-3 py-1 rounded-full border border-black/10">
                              <i className="far fa-clock mr-1.5 opacity-50"></i>
                              {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {log.entries.map((entry: any, i: number) => (
                              <div key={i} className="bg-neutral-50 p-4 rounded-2xl border border-black/5 hover:border-black/10 transition-colors">
                                <p className="text-sm font-bold text-black mb-1 truncate">{entry.exercise}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-neutral-500 uppercase">{entry.sets} Sets</span>
                                  <span className="w-1 h-1 rounded-full bg-neutral-200"></span>
                                  <span className="text-[10px] font-black text-neutral-500 uppercase">{entry.reps} Reps</span>
                                  {entry.weight && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-neutral-200"></span>
                                      <span className="text-[10px] font-black text-red-600/80 uppercase">{entry.weight} kg</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {log.notes && (
                            <div className="mt-4 p-4 bg-neutral-50 border border-black/5 rounded-2xl">
                              <p className="text-[10px] font-black text-neutral-500 uppercase mb-1">Notes</p>
                              <p className="text-sm text-neutral-400 italic">"{log.notes}"</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 text-neutral-400 border border-dashed border-black/10 rounded-2xl">
                      <p className="text-sm font-bold uppercase tracking-widest text-black">No workout history yet.</p>
                      <p className="text-xs mt-2">Log your first session above to see it here!</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-red-600 text-white rounded-3xl p-8 shadow-lg shadow-red-600/10">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Daily Focus</p>
                  <h4 className="text-2xl font-black italic brand-font mb-4">CONSISTENCY IS KEY</h4>
                  <p className="text-sm font-medium leading-relaxed">
                    "The only bad workout is the one that didn't happen." - Stick to the plan and log your progress.
                  </p>
                </div>

                <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-xl">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-6 flex items-center gap-2">
                    <i className="fas fa-bullseye text-red-600"></i> My Goals
                  </h4>
                  {data.health?.targetWeight ? (
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-bold text-neutral-400 uppercase">Weight Goal</span>
                          <span className="text-xs font-bold text-red-600 uppercase">
                            {data.health.weight}kg <i className="fas fa-arrow-right mx-1 text-[10px]"></i> {data.health.targetWeight}kg
                          </span>
                        </div>
                        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-600 rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${Math.min(100, Math.max(0, (1 - (Math.abs(Number(data.health.targetWeight) - Number(data.health.weight)) / Math.abs(Number(data.health.targetWeight) - (Number(data.health.weight) + 10)))) * 100))}%` 
                            }}
                          ></div>
                        </div>
                        {data.health.targetDate && (
                          <p className="text-[10px] text-neutral-500 mt-2 text-right">Target: {new Date(data.health.targetDate).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-neutral-400 border border-dashed border-black/10 rounded-2xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-black">No specific goals set.</p>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-6">Quick Stats</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-neutral-50 rounded-2xl border border-black/5">
                      <span className="text-xs font-bold text-neutral-400 uppercase">Weight</span>
                      <span className="text-lg font-black text-black">{data.health?.weight || '--'} kg</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-neutral-50 rounded-2xl border border-black/5">
                      <span className="text-xs font-bold text-neutral-400 uppercase">Sessions</span>
                      <span className="text-lg font-black text-black">{(data.attendance || []).filter((a: any) => a.status === 'Present').length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'diet':
        return (
          <div className="space-y-8">
            <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold flex items-center gap-3 text-black">
                  <i className="fas fa-utensils text-red-600"></i>
                  Nutrition Guide
                </h3>
                <span className="text-[10px] font-black uppercase text-neutral-500 bg-neutral-50 px-3 py-1 rounded-full border border-black/10">
                  Updated {data.diet ? new Date(data.diet.updatedAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              {data.diet ? (
                <div className="whitespace-pre-wrap font-mono text-neutral-700 leading-relaxed bg-neutral-50 p-8 rounded-2xl border border-black/10 text-sm">
                  {data.diet.plan}
                </div>
              ) : (
                <div className="text-center py-20 text-neutral-400 border border-dashed border-black/10 rounded-2xl">
                   <p className="font-bold uppercase tracking-widest text-sm mb-2 text-black">No Diet Plan Assigned Yet</p>
                   <p className="text-xs">Your personalized nutrition plan will appear here.</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'attendance':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-black">
                  <i className="fas fa-chart-bar text-red-600"></i>
                  Workout Frequency (Weekly)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.frequency}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="date" stroke="#999" fontSize={10} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                      <YAxis stroke="#999" fontSize={10} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px' }}
                        itemStyle={{ color: '#000' }}
                        labelStyle={{ color: '#999' }}
                      />
                      <Bar dataKey="count" fill="#dc2626" radius={[4, 4, 0, 0]} name="Sessions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-black">
                  <i className="fas fa-chart-line text-red-600"></i>
                  Volume Progress (Last 10 Sessions)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.volume}>
                      <defs>
                        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="date" stroke="#999" fontSize={10} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                      <YAxis stroke="#999" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px' }}
                        itemStyle={{ color: '#000' }}
                        labelStyle={{ color: '#999' }}
                      />
                      <Area type="monotone" dataKey="volume" stroke="#dc2626" fillOpacity={1} fill="url(#colorVolume)" name="Volume (kg)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white border border-black/5 rounded-3xl p-8 shadow-xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-black">
                <i className="fas fa-calendar-check text-red-600"></i>
                Attendance Record
              </h3>
              
              {rescheduleSuccess && (
                <div className="mb-4 p-3 bg-red-600/10 border border-red-600/20 rounded-xl animate-fade-in">
                  <p className="text-red-600 font-bold text-xs flex items-center justify-center gap-2">
                    <i className="fas fa-check-circle"></i>
                    {rescheduleSuccess}
                  </p>
                </div>
              )}

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {(data.attendance || []).length > 0 ? (data.attendance || []).slice().reverse().map((log: any) => (
                  <div key={log.id} className="flex flex-col p-5 bg-neutral-50 border border-black/5 rounded-2xl transition-all hover:border-black/10">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.status === 'Present' ? 'bg-red-600/10 text-red-600' : 'bg-orange-500/10 text-orange-500'}`}>
                          <i className={`fas ${log.status === 'Present' ? 'fa-check' : 'fa-times'}`}></i>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-black">{new Date(log.date).toLocaleDateString()}</p>
                          <p className="text-[10px] text-neutral-500 uppercase font-black">{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${log.status === 'Present' ? 'bg-red-600/10 text-red-600' : 'bg-orange-500/10 text-orange-500'}`}>
                        {log.status}
                      </span>
                    </div>
                    {log.status === 'Missed' && (
                      <div className="mt-3 pl-14">
                        {(() => {
                          const request = (data.sessionRequests || []).find((r: any) => r.originalDate === log.date);
                          if (request) {
                            return (
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                                  request.status === 'Approved' ? 'bg-red-600/20 text-red-600' :
                                  request.status === 'Rejected' ? 'bg-orange-500/20 text-orange-500' :
                                  'bg-blue-500/20 text-blue-500'
                                }`}>
                                  Reschedule: {request.status}
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                  Requested: {new Date(request.requestedDate).toLocaleString()}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <button
                              onClick={() => handleOpenReschedule(log)}
                              className="mt-2 w-full py-2 bg-red-600/5 border border-red-600/20 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                              <i className="fas fa-clock"></i> Request Reschedule
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="text-center py-20 text-neutral-400 border border-dashed border-black/10 rounded-2xl">
                    <p className="text-sm font-bold uppercase tracking-widest text-black">No sessions recorded yet.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-black">
                <i className="fas fa-id-card text-red-600"></i>
                Membership
              </h3>
              {(data.payments || []).length > 0 && (data.payments || [])[(data.payments || []).length - 1] ? (
                 <div className="space-y-6">
                    <div className="p-8 bg-red-600/5 border border-red-600/20 rounded-3xl text-center">
                       <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-2">Active Plan</p>
                       <p className="text-3xl font-black text-red-600 italic brand-font">{(data.payments || [])[(data.payments || []).length - 1].package}</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm px-2">
                         <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px]">Status</span>
                         <span className={`px-4 py-1 rounded-full font-black text-[10px] uppercase ${
                           (data.payments || [])[(data.payments || []).length - 1].status === 'Paid' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                         }`}>
                           {(data.payments || [])[(data.payments || []).length - 1].status}
                         </span>
                      </div>
                      <div className="flex justify-between items-center text-sm px-2">
                         <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px]">Next Due</span>
                         <span className="font-bold text-black">{(data.payments || [])[(data.payments || []).length - 1].dueDate}</span>
                      </div>
                    </div>
                 </div>
              ) : (
                <div className="text-center py-10 text-neutral-400">
                  <p className="text-sm">Membership info not updated.</p>
                </div>
              )}
            </div>
          </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-black">
                <i className="fas fa-bell text-red-600"></i>
                Notifications
              </h3>
              <div className="space-y-4">
                {notifications.length > 0 ? notifications.slice().reverse().map((notif: any) => (
                  <div key={notif.id} className="p-6 bg-neutral-50 border border-black/5 rounded-2xl relative overflow-hidden group">
                    {!notif.read && <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>}
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-black">{notif.title}</h4>
                      <span className="text-[10px] text-neutral-500 font-bold uppercase">{new Date(notif.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-neutral-400 leading-relaxed">{notif.message}</p>
                  </div>
                )) : (
                  <div className="text-center py-20 text-neutral-400 border border-dashed border-black/10 rounded-2xl">
                    <p className="text-sm font-bold uppercase tracking-widest text-black">No notifications yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'messages': return <ClientMessages user={user} />;
      case 'photos':
        return (
          <div className="space-y-8">
            <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-black">
                <i className="fas fa-camera text-red-600"></i>
                Progress Photos
              </h3>
              
              <div className="mb-8 p-6 bg-neutral-50 rounded-2xl border border-black/5">
                <label className="block text-[10px] font-black text-neutral-500 uppercase mb-4">Upload New Photo</label>
                <div className="flex gap-4">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const base64String = reader.result as string;
                          await store.saveProgressPhoto({ clientId: user.id, imageUrl: base64String });
                          fetchData();
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {(data.progressPhotos || []).map((photo: any) => (
                  <div key={photo.id} className="bg-neutral-50 rounded-2xl overflow-hidden border border-black/5">
                    <img src={photo.imageUrl} alt="Progress" className="w-full h-48 object-cover" />
                    <div className="p-4">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase">{new Date(photo.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      <Sidebar role={UserRole.CLIENT} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      
      <main className="flex-1 lg:ml-64 overflow-y-auto p-6 lg:p-10">
        <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-16 lg:mt-0">
          <div className="flex items-center gap-4">
            <Logo size={48} />
            <div>
              <h2 className="text-3xl font-black text-black italic tracking-tighter brand-font uppercase">
                Power Up, <span className="text-red-600">{user.name || 'Member'}</span>
              </h2>
              <p className="text-neutral-500 text-sm mt-1">Keep pushing boundaries. Your goals are within reach.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 self-end sm:self-auto">
            <button 
              onClick={() => fetchData()}
              className="hidden sm:flex bg-white border border-black/5 rounded-full px-4 py-2 items-center space-x-2 text-[10px] uppercase font-black tracking-widest hover:border-red-600 transition-colors group shadow-sm"
            >
                <div className={`w-2 h-2 rounded-full bg-red-600 ${loading ? 'animate-spin' : 'animate-pulse'}`}></div>
                <span className="text-neutral-500 group-hover:text-red-600">Sync Now</span>
            </button>
            <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/20">
               <i className="fas fa-user-circle text-2xl"></i>
            </div>
          </div>
        </header>

        {renderContent()}

        {rescheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white border border-black/5 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-scale-in">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-black">
                <i className="fas fa-calendar-alt text-red-600"></i>
                Request Reschedule
              </h3>
              <p className="text-sm text-neutral-400 mb-6">
                Request a new time for your missed session on <span className="text-black font-bold">{selectedMissedSession && new Date(selectedMissedSession.date).toLocaleDateString()}</span>.
              </p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-black text-neutral-500 uppercase mb-2">Preferred Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={requestedDate}
                    onChange={(e) => setRequestedDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-black/10 rounded-xl px-4 py-3 text-sm focus:border-red-600 outline-none text-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-neutral-500 uppercase mb-2">Notes (Optional)</label>
                  <textarea 
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    className="w-full bg-neutral-50 border border-black/10 rounded-xl px-4 py-3 text-sm focus:border-red-600 outline-none text-black h-24 resize-none"
                    placeholder="Any specific preferences?"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setRescheduleModalOpen(false)}
                  className="flex-1 py-3 bg-neutral-100 text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setConfirmRescheduleModalOpen(true)}
                  disabled={!requestedDate}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmWorkoutModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white border border-black/5 rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-scale-in text-center">
              <div className="w-16 h-16 bg-red-600/10 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-question text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold mb-2 text-black">Log Workout?</h3>
              <p className="text-sm text-neutral-400 mb-6">Are you sure you want to submit this workout log? You cannot edit it once submitted.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmWorkoutModalOpen(false)} className="flex-1 py-3 bg-neutral-100 text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors">Cancel</button>
                <button onClick={submitWorkoutLog} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20">Confirm</button>
              </div>
            </div>
          </div>
        )}

        {confirmRescheduleModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white border border-black/5 rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-scale-in text-center">
              <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold mb-2 text-black">Submit Request?</h3>
              <p className="text-sm text-neutral-400 mb-6">Are you sure you want to request a reschedule for this session?</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmRescheduleModalOpen(false)} className="flex-1 py-3 bg-neutral-100 text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors">Cancel</button>
                <button onClick={handleSubmitReschedule} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20">Confirm</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ClientDashboard;
