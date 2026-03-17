import React, { useEffect, useState, useMemo } from 'react';
import { Activity, Target, Calendar, Zap, Shield, ChevronRight, ArrowLeft, LogOut, CheckCircle, CreditCard, Utensils, FileText, ChevronDown, ChevronUp, Play, TrendingUp } from 'lucide-react';
import { firebaseService } from '../../services/firebaseService';
import { auth } from '../../firebase';
import { WorkoutLog, UpcomingSession, DietPlan, PaymentRecord, WorkoutPlan, ScheduledWorkout } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import ExerciseAnimation from '../../components/ExerciseAnimation';
import VisualWorkoutModal from '../../components/VisualWorkoutModal';
import { COMMON_EXERCISES } from '../../constants';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, isSameDay } from 'date-fns';

interface Props {
  userData: any;
}

const ClientDashboard: React.FC<Props> = ({ userData }) => {
  const navigate = useNavigate();
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([]);
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [dietPlans, setDietPlans] = useState<WorkoutPlan[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ originalDate: '', requestedDate: '', reason: '' });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedDietSections, setExpandedDietSections] = useState<Record<string, boolean>>({});
  
  // Visual Workout State
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [currentWorkoutTitle, setCurrentWorkoutTitle] = useState('');
  const [currentWorkoutExercises, setCurrentWorkoutExercises] = useState<string[]>([]);
  const [currentWorkoutContent, setCurrentWorkoutContent] = useState('');

  const toggleSection = (planId: string, sectionIndex: number) => {
    const key = `${planId}-${sectionIndex}`;
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleDietSection = (planId: string, sectionIndex: number) => {
    const key = `${planId}-${sectionIndex}`;
    setExpandedDietSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const startVisualWorkout = (title: string, content: string) => {
    const mentionedExercises = COMMON_EXERCISES.filter(ex => 
      content.toLowerCase().includes(ex.toLowerCase())
    );
    setCurrentWorkoutTitle(title);
    setCurrentWorkoutContent(content);
    setCurrentWorkoutExercises(mentionedExercises);
    setIsWorkoutModalOpen(true);
  };

  useEffect(() => {
    if (!userData?.uid) return;

    const unsubscribeLogs = firebaseService.subscribeToWorkoutLogs((logs) => {
      setRecentLogs(logs);
    }, userData.uid);

    const unsubscribeScheduled = firebaseService.subscribeToScheduledWorkouts(userData.uid, (workouts) => {
      setScheduledWorkouts(workouts.filter(w => new Date(w.date).getTime() >= new Date().setHours(0,0,0,0)));
    });

    const unsubscribePlans = firebaseService.subscribeToWorkoutPlans(userData.uid, (plans) => {
      setWorkoutPlans(plans);
    });

    const unsubscribeDietPlans = firebaseService.subscribeToDietPlans(userData.uid, (plans) => {
      setDietPlans(plans);
    });

    const unsubscribePayments = firebaseService.subscribeToPaymentRecords(userData.uid, (records) => {
      setPaymentRecords(records);
    });

    const unsubscribeAttendance = firebaseService.subscribeToAttendance(userData.uid, (records) => {
      setAttendance(records);
    });

    const unsubscribeRequests = firebaseService.subscribeToRescheduleRequests((requests) => {
      setRescheduleRequests(requests.filter(r => r.clientId === userData.uid));
    });

    setLoading(false);

    return () => {
      unsubscribeLogs();
      unsubscribeScheduled();
      unsubscribePlans();
      unsubscribeDietPlans();
      unsubscribePayments();
      unsubscribeAttendance();
      unsubscribeRequests();
    };
  }, [userData?.uid]);

  const performanceData = useMemo(() => {
    const data = [];
    for (let i = 7; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayLogs = recentLogs.filter(log => isSameDay(new Date(log.date), date));
      
      let avgWeight = 0;
      if (dayLogs.length > 0) {
        const totalWeight = dayLogs.reduce((acc, log) => {
          const logWeight = log.entries.reduce((eAcc, entry) => eAcc + (parseFloat(entry.weight) || 0), 0);
          return acc + (logWeight / (log.entries.length || 1));
        }, 0);
        avgWeight = totalWeight / dayLogs.length;
      }

      data.push({
        name: format(date, 'MMM dd'),
        weight: Math.round(avgWeight),
        logs: dayLogs.length
      });
    }
    return data;
  }, [recentLogs]);

  const handleRequestReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await firebaseService.requestReschedule({ ...rescheduleData, clientId: userData.uid, status: 'PENDING' });
      setShowRescheduleForm(false);
      setRescheduleData({ originalDate: '', requestedDate: '', reason: '' });
      alert('Reschedule request submitted!');
    } catch (error) {
      console.error("Error requesting reschedule:", error);
      alert('Failed to submit reschedule request.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="space-y-10">
      {/* Back and Logout Buttons */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center text-neutral-500 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </button>
        <button onClick={handleLogout} className="flex items-center text-neutral-500 hover:text-white">
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </button>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
          <form onSubmit={handleRequestReschedule} className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl w-full max-w-md space-y-4">
            <h3 className="text-xl font-display italic uppercase text-white">Request Reschedule</h3>
            <input type="date" className="input-field" value={rescheduleData.originalDate} onChange={e => setRescheduleData({...rescheduleData, originalDate: e.target.value})} required />
            <input type="date" className="input-field" value={rescheduleData.requestedDate} onChange={e => setRescheduleData({...rescheduleData, requestedDate: e.target.value})} required />
            <textarea placeholder="Reason" className="input-field" value={rescheduleData.reason} onChange={e => setRescheduleData({...rescheduleData, reason: e.target.value})} required />
            <div className="flex space-x-4">
              <button type="button" onClick={() => setShowRescheduleForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Submit</button>
            </div>
          </form>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-2 h-2 bg-brand-red animate-pulse"></div>
            <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-brand-red/80">SPEEDFIT</p>
          </div>
          <h2 className="text-6xl md:text-8xl font-display italic uppercase leading-tight text-white">
            My <span className="text-brand-red">Dashboard</span>
          </h2>
          <p className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mt-4">
            Welcome back, {userData?.name || 'User'}.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setShowRescheduleForm(true)} className="btn-primary">Request Reschedule</button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Workouts Completed', value: recentLogs.length, icon: Activity, color: 'brand-red', trend: 'Last 30d' },
          { label: 'Attendance Record', value: attendance.length, icon: Calendar, color: 'brand-red', trend: 'Total' },
          { label: 'Active Strategies', value: workoutPlans.length + dietPlans.length, icon: Target, color: 'brand-red', trend: 'Current' },
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

      {/* Performance Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 p-8 rounded-[2.5rem] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-4 h-4 text-brand-red" />
              <h3 className="text-xl font-display italic uppercase tracking-wider">Strength Index</h3>
            </div>
            <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Avg Weight (kg)</p>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
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
                  dataKey="weight" 
                  stroke="#ff0000" 
                  fillOpacity={1} 
                  fill="url(#colorWeight)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 p-8 rounded-[2.5rem] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="w-4 h-4 text-brand-red" />
              <h3 className="text-xl font-display italic uppercase tracking-wider">Consistency</h3>
            </div>
            <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Daily Logs</p>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
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
                  dataKey="logs" 
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
        <div className="lg:col-span-2 space-y-10">
          {/* Scheduled Workouts */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-brand-red" />
              <h3 className="text-xl font-display italic uppercase tracking-wider">Upcoming Workouts</h3>
            </div>
            <div className="space-y-4">
              {scheduledWorkouts.length === 0 ? (
                <div className="bg-neutral-900/30 border border-dashed border-neutral-800 p-10 rounded-[2rem] text-center">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No workouts scheduled for the immediate future.</p>
                </div>
              ) : (
                scheduledWorkouts.map(workout => (
                  <Link 
                    key={workout.id} 
                    to="/workout-logs"
                    className="bg-neutral-900/50 border border-brand-red/30 p-6 rounded-3xl hover:border-brand-red transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-6">
                      <div className="w-12 h-12 bg-brand-red/10 rounded-2xl flex items-center justify-center font-display italic text-xl text-brand-red group-hover:bg-brand-red group-hover:text-white transition-colors">
                        {new Date(workout.date).getDate()}
                      </div>
                      <div>
                        <p className="font-bold text-white uppercase tracking-wider">Scheduled Workout</p>
                        <p className="text-[10px] font-mono text-neutral-500 uppercase">{new Date(workout.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <p className="text-[10px] font-mono text-brand-red uppercase tracking-widest">{workout.entries.length} Modules Assigned</p>
                      <ChevronRight className="w-5 h-5 text-neutral-700 group-hover:text-brand-red group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent Logs */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <Activity className="w-4 h-4 text-brand-red" />
              <h3 className="text-xl font-display italic uppercase tracking-wider">Recent Workouts</h3>
            </div>
            <div className="space-y-4">
              {recentLogs.length === 0 ? (
                <div className="bg-neutral-900/30 border border-dashed border-neutral-800 p-20 rounded-[2.5rem] text-center">
                  <Zap className="w-8 h-8 text-neutral-800 mx-auto mb-4" />
                  <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No recent workouts recorded.</p>
                </div>
              ) : (
                recentLogs.slice(0, 5).map(log => (
                  <Link 
                    key={log.id} 
                    to="/workout-logs"
                    className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-3xl hover:border-brand-red/50 transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-6">
                      <div className="w-12 h-12 bg-neutral-800 rounded-2xl flex items-center justify-center font-display italic text-xl text-brand-red group-hover:bg-brand-red group-hover:text-white transition-colors">
                        {new Date(log.date).getDate()}
                      </div>
                      <div>
                        <p className="font-bold text-white uppercase tracking-wider">Workout Log</p>
                        <p className="text-[10px] font-mono text-neutral-500 uppercase">{new Date(log.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <p className="text-[10px] font-mono text-neutral-500 uppercase">{log.entries.length} Exercises</p>
                      <ChevronRight className="w-5 h-5 text-neutral-700 group-hover:text-brand-red group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <Calendar className="w-4 h-4 text-brand-red" />
            <h3 className="text-xl font-display italic uppercase tracking-wider">Attendance</h3>
          </div>
          <div className="space-y-4">
            {attendance.length === 0 ? (
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No attendance records.</p>
            ) : (
              attendance.slice(0, 5).map(record => (
                <div key={record.id} className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-3xl flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold">{record.date}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase ${record.status === 'ATTENDED' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-brand-red/20 text-brand-red'}`}>
                    {record.status}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center space-x-3 pt-6">
            <Calendar className="w-4 h-4 text-brand-red" />
            <h3 className="text-xl font-display italic uppercase tracking-wider">Reschedule Requests</h3>
          </div>
          <div className="space-y-4">
            {rescheduleRequests.length === 0 ? (
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No reschedule requests.</p>
            ) : (
              rescheduleRequests.map(req => (
                <div key={req.id} className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-3xl flex flex-col space-y-2">
                  <p className="text-white font-bold">{req.reason}</p>
                  <p className="text-[10px] font-mono text-neutral-500">{new Date(req.originalDate).toLocaleDateString()} to {new Date(req.requestedDate).toLocaleDateString()}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase ${req.status === 'APPROVED' ? 'bg-emerald-900/50 text-emerald-400' : req.status === 'REJECTED' ? 'bg-brand-red/20 text-brand-red' : 'bg-neutral-800 text-neutral-400'}`}>
                      {req.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Plans and Payment Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <FileText className="w-4 h-4 text-brand-red" />
            <h3 className="text-xl font-display italic uppercase tracking-wider">Workout Plan</h3>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-[2rem]">
            {workoutPlans.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2 px-2">
                  <p className="text-[8px] font-mono text-brand-red uppercase tracking-widest">
                    Active Plan
                  </p>
                  <p className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest">
                    {new Date(workoutPlans[0].updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-3">
                  {workoutPlans[0].sections?.map((section, idx) => {
                    const isExpanded = expandedSections[`${workoutPlans[0].id}-${idx}`] ?? (idx === 0);
                    return (
                      <div key={idx} className="bg-neutral-950 rounded-2xl border border-neutral-800 overflow-hidden">
                        <button 
                          onClick={() => toggleSection(workoutPlans[0].id, idx)}
                          className="w-full px-5 py-3 flex items-center justify-between hover:bg-neutral-900 transition-colors"
                        >
                          <h5 className="text-[10px] font-bold text-white uppercase tracking-wider">{section.title}</h5>
                          {isExpanded ? <ChevronUp className="w-3 h-3 text-neutral-500" /> : <ChevronDown className="w-3 h-3 text-neutral-500" />}
                        </button>
                        {isExpanded && (
                          <div className="px-5 pb-4 pt-1">
                            <div className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-neutral-400 border-t border-neutral-800 pt-3">
                              {section.content}
                            </div>
                            {(() => {
                              const mentionedExercises = COMMON_EXERCISES.filter(ex => 
                                section.content.toLowerCase().includes(ex.toLowerCase())
                              );
                              if (mentionedExercises.length === 0) return null;
                              return (
                              <div className="mt-4 pt-4 border-t border-neutral-800">
                                <div className="flex items-center justify-between mb-3">
                                  <p className="text-[8px] font-mono text-brand-red uppercase tracking-widest">Exercise Animations</p>
                                  <button 
                                    onClick={() => startVisualWorkout(section.title, section.content)}
                                    className="flex items-center space-x-2 bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                                  >
                                    <Play className="w-3 h-3" />
                                    <span className="text-[8px] font-mono uppercase tracking-widest">Start Visual Workout</span>
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {mentionedExercises.map(ex => (
                                    <ExerciseAnimation key={ex} exerciseName={ex} className="w-16 h-16 mx-auto" />
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No workout plan assigned.</p>
          )}
        </div>
      </div>

      <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <FileText className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xl font-display italic uppercase tracking-wider">Diet Plan</h3>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-[2rem]">
            {dietPlans.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2 px-2">
                  <p className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest">
                    Active Plan
                  </p>
                  <p className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest">
                    {new Date(dietPlans[0].updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-3">
                  {dietPlans[0].sections?.map((section, idx) => {
                    const isExpanded = expandedDietSections[`${dietPlans[0].id}-${idx}`] ?? (idx === 0);
                    return (
                      <div key={idx} className="bg-neutral-950 rounded-2xl border border-neutral-800 overflow-hidden">
                        <button 
                          onClick={() => toggleDietSection(dietPlans[0].id, idx)}
                          className="w-full px-5 py-3 flex items-center justify-between hover:bg-neutral-900 transition-colors"
                        >
                          <h5 className="text-[10px] font-bold text-white uppercase tracking-wider">{section.title}</h5>
                          {isExpanded ? <ChevronUp className="w-3 h-3 text-neutral-500" /> : <ChevronDown className="w-3 h-3 text-neutral-500" />}
                        </button>
                        {isExpanded && (
                          <div className="px-5 pb-4 pt-1">
                            <div className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-neutral-400 border-t border-neutral-800 pt-3">
                              {section.content}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No diet plan assigned.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-4 h-4 text-brand-red" />
            <h3 className="text-xl font-display italic uppercase tracking-wider">Payment Records</h3>
          </div>
          <div className="space-y-4">
            {paymentRecords.length === 0 ? (
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No payment records found.</p>
            ) : (
              paymentRecords.map(record => (
                <div key={record.id} className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-3xl flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold">{record.package}</p>
                    <p className="text-[10px] font-mono text-neutral-500 uppercase">Due: {new Date(record.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase ${record.status === 'Paid' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-brand-red/20 text-brand-red'}`}>
                    {record.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <VisualWorkoutModal
        isOpen={isWorkoutModalOpen}
        onClose={() => setIsWorkoutModalOpen(false)}
        planTitle={currentWorkoutTitle}
        exercises={currentWorkoutExercises}
        planContent={currentWorkoutContent}
      />
    </div>
  );
};

export default ClientDashboard;
