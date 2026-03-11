import React, { useEffect, useState } from 'react';
import { Activity, Target, Calendar, Zap, Shield, ChevronRight, ArrowLeft, LogOut, CheckCircle, CreditCard, Utensils, FileText } from 'lucide-react';
import { firebaseService } from '../../services/firebaseService';
import { auth } from '../../firebase';
import { WorkoutLog, UpcomingSession, DietPlan, PaymentRecord, WorkoutPlan } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';

interface Props {
  userData: any;
}

const ClientDashboard: React.FC<Props> = ({ userData }) => {
  const navigate = useNavigate();
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ originalDate: '', requestedDate: '', reason: '' });

  useEffect(() => {
    if (!userData?.uid) return;

    const unsubscribeLogs = firebaseService.subscribeToWorkoutLogs((logs) => {
      setRecentLogs(logs);
    }, userData.uid);

    const unsubscribePlans = firebaseService.subscribeToWorkoutPlans(userData.uid, (plans) => {
      setWorkoutPlans(plans);
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
      unsubscribePlans();
      unsubscribePayments();
      unsubscribeAttendance();
      unsubscribeRequests();
    };
  }, [userData?.uid]);

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
            <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-brand-red/80">BUILD TO TRANSFORMATION</p>
          </div>
          <h2 className="text-6xl font-display italic uppercase leading-tight text-white">
            Recruit <span className="text-brand-red">Dashboard</span>
          </h2>
          <p className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mt-4">
            Welcome back, {userData?.name || 'User'}. Systems synchronized.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setShowRescheduleForm(true)} className="btn-primary">Request Reschedule</button>
          <div className="text-right">
            <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Current Phase</p>
            <p className="text-xl font-mono text-white">PHASE 01: INITIALIZATION</p>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Current Role', value: userData?.role || 'CLIENT', icon: Shield, color: 'brand-red' },
          { label: 'Total Sessions', value: attendance.length, icon: Calendar, color: 'brand-red' },
          { label: 'Active Objectives', value: '03', icon: Target, color: 'brand-red' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-3xl relative overflow-hidden group hover:border-brand-red/50 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon className="w-full h-full" />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-4">{stat.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-display italic leading-none uppercase">{stat.value}</p>
              <stat.icon className={`w-5 h-5 text-${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center space-x-3">
            <Activity className="w-4 h-4 text-brand-red" />
            <h3 className="text-xl font-display italic uppercase tracking-wider">Recent Telemetry</h3>
          </div>
          <div className="space-y-4">
            {recentLogs.length === 0 ? (
              <div className="bg-neutral-900/30 border border-dashed border-neutral-800 p-20 rounded-[2.5rem] text-center">
                <Zap className="w-8 h-8 text-neutral-800 mx-auto mb-4" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No recent activity recorded in system logs.</p>
              </div>
            ) : (
              recentLogs.map(log => (
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

      {/* Protocols and Payment Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <FileText className="w-4 h-4 text-brand-red" />
            <h3 className="text-xl font-display italic uppercase tracking-wider">Training Protocol</h3>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800 p-8 rounded-[2rem]">
            {workoutPlans.length > 0 ? (
              <div>
                <p className="text-[10px] font-mono text-brand-red uppercase tracking-widest mb-4">
                  Updated: {new Date(workoutPlans[0].updatedAt).toLocaleDateString()}
                </p>
                <p className="text-neutral-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">{workoutPlans[0].plan}</p>
              </div>
            ) : (
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No training protocol assigned.</p>
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
    </div>
  );
};

export default ClientDashboard;
