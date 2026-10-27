import React from 'react';
import { 
  Activity, 
  Calendar, 
  Dumbbell, 
  Utensils, 
  TrendingUp, 
  CreditCard, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  Bell, 
  Check, 
  ShieldAlert,
  ArrowRight,
  Flame,
  Award
} from 'lucide-react';
import { format } from 'date-fns';
import { safeFormat } from '../../../utils/dateUtils';
import { WorkoutPlan, DietPlan, PaymentRecord, AttendanceRecord, ProgressRecord, InAppNotification, UpcomingSession } from '../../../types';

interface ClientHomeViewProps {
  userData: any;
  activeWorkoutPlan: WorkoutPlan | null;
  activeDietPlan: DietPlan | null;
  sessions: UpcomingSession[];
  attendance: AttendanceRecord[];
  progressRecords: ProgressRecord[];
  paymentRecords: PaymentRecord[];
  notifications: InAppNotification[];
  onNavigateTab: (tab: string, sub?: string) => void;
  onMarkNotificationRead: (id: string) => void;
  onRespondProposal: (sessionId: string, response: 'accept' | 'decline') => void;
}

export const ClientHomeView: React.FC<ClientHomeViewProps> = ({
  userData,
  activeWorkoutPlan,
  activeDietPlan,
  sessions,
  attendance,
  progressRecords,
  paymentRecords,
  notifications,
  onNavigateTab,
  onMarkNotificationRead,
  onRespondProposal
}) => {
  // 1. Next confirmed session & pending requests
  const confirmedSessions = sessions
    .filter(s => s.status === 'Confirmed' && new Date(s.date).getTime() >= new Date().setHours(0, 0, 0, 0))
    .sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime());
  const nextSession = confirmedSessions[0] || null;

  const pendingRequests = sessions.filter(s => s.status === 'Pending');
  const proposedRequests = sessions.filter(s => s.status === 'Proposed');

  // 2. Attendance stats
  const totalAttended = attendance.filter(a => a.status === 'Present').length;
  const totalRecorded = attendance.length;
  const attendanceRate = totalRecorded > 0 ? Math.round((totalAttended / totalRecorded) * 100) : 0;
  const lastAttendance = attendance[0] || null;

  // 3. Latest trainer-recorded progress
  const latestProgress = progressRecords[0] || null;

  // 4. Latest payment record & due status
  const currentPayment = paymentRecords[0] || null;
  const paymentFee = currentPayment ? Number(currentPayment.feeINR || currentPayment.amount || 0) : 0;
  const paymentPaid = currentPayment ? Number(currentPayment.amountPaid || 0) : 0;
  const paymentBalance = currentPayment
    ? (currentPayment.outstandingBalance !== undefined ? Number(currentPayment.outstandingBalance) : Math.max(0, paymentFee - paymentPaid))
    : 0;

  // Unread notifications
  const unreadNotifs = notifications.filter(n => !n.read);

  // Greeting
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* Welcome Banner */}
      <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-brand-red font-mono text-[10px] uppercase tracking-widest font-bold">
            <span className="w-2 h-2 bg-brand-red rounded-full animate-pulse"></span>
            <span>Speed Fit Client Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-white">
            {greeting}, <span className="text-brand-red">{userData?.name?.split(' ')[0] || 'Client'}</span>
          </h1>
          <p className="text-xs text-neutral-400 font-mono max-w-xl">
            Welcome back to your Speed Fit dashboard. Follow your assigned routine, monitor sessions, and stay accountable.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto relative z-10">
          <button
            onClick={() => onNavigateTab('myplan', 'workout')}
            className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] bg-brand-red hover:bg-red-700 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-xl transition-all shadow-md active:scale-95 text-center flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus:outline-none"
          >
            <Dumbbell className="w-4 h-4" />
            <span>View Workout</span>
          </button>
          <button
            onClick={() => onNavigateTab('myplan', 'diet')}
            className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-xl transition-all active:scale-95 text-center flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-700 focus-visible:ring-2 focus-visible:ring-white focus:outline-none"
          >
            <Utensils className="w-4 h-4" />
            <span>View Diet</span>
          </button>
          <button
            onClick={() => onNavigateTab('sessions', 'bookings')}
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] bg-white text-black hover:bg-neutral-200 font-mono text-xs uppercase tracking-wider font-bold rounded-xl transition-all active:scale-95 text-center flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-black focus:outline-none"
          >
            <Calendar className="w-4 h-4" />
            <span>Request Session</span>
          </button>
        </div>
      </div>

      {/* Trainer Proposed Time Alert (Action Required) */}
      {proposedRequests.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-5 space-y-3 animate-pulse">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase font-mono tracking-wider">
            <AlertCircle className="w-4 h-4" />
            <span>Trainer Proposed Alternate Session Time</span>
          </div>
          {proposedRequests.map(prop => (
            <div key={prop.id} className="bg-black/40 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-white text-sm font-bold">
                  Proposed for: {prop.proposedDate || prop.date} at {prop.proposedTime || prop.time} IST
                </p>
                <p className="text-neutral-400 text-xs font-mono mt-0.5">
                  Original requested: {prop.date} at {prop.time} IST • {prop.trainerNotes || 'Trainer proposed alternate time'}
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => onRespondProposal(prop.id, 'accept')}
                  className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-mono text-xs font-bold rounded-lg uppercase cursor-pointer"
                >
                  Accept
                </button>
                <button
                  onClick={() => onRespondProposal(prop.id, 'decline')}
                  className="flex-1 sm:flex-none px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs font-bold rounded-lg uppercase cursor-pointer"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notifications Drawer Banner */}
      {unreadNotifs.length > 0 && (
        <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-red" />
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">
                Notifications ({unreadNotifs.length} new)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase">Speed Fit Alerts</span>
          </div>
          <div className="space-y-2">
            {unreadNotifs.slice(0, 3).map(notif => (
              <div key={notif.id} className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <p className="font-bold text-white">{notif.title}</p>
                  <p className="text-neutral-400 text-[11px] leading-relaxed">{notif.message}</p>
                  <p className="text-[9px] font-mono text-neutral-500">{safeFormat(notif.createdAt, 'MMM dd, hh:mm a')}</p>
                </div>
                <button
                  onClick={() => onMarkNotificationRead(notif.id)}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[10px] font-mono shrink-0 cursor-pointer"
                >
                  Mark read
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2-Column Core Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Card 1: Today's Workout */}
        <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-colors shadow-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-brand-red uppercase tracking-wider">
                <Dumbbell className="w-4 h-4" />
                <span>Assigned Workout Routine</span>
              </div>
              {activeWorkoutPlan && (
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono rounded font-bold uppercase">
                  Active
                </span>
              )}
            </div>

            {activeWorkoutPlan ? (
              <div className="space-y-2">
                <h3 className="text-xl font-display font-bold uppercase text-white tracking-tight">
                  {activeWorkoutPlan.title}
                </h3>
                {activeWorkoutPlan.trainingDays && activeWorkoutPlan.trainingDays.length > 0 && (
                  <p className="text-xs text-neutral-400 font-mono">
                    Schedule: <span className="text-white font-bold">{activeWorkoutPlan.trainingDays.join(', ')}</span>
                  </p>
                )}
                <p className="text-xs text-neutral-400 line-clamp-2">
                  {activeWorkoutPlan.trainerInstructions || 'Follow prescribed sets and tempo precisely as assigned by your trainer.'}
                </p>
              </div>
            ) : (
              <div className="py-4 text-center space-y-1">
                <p className="text-sm font-bold text-white">Your trainer has not assigned a workout yet.</p>
                <p className="text-xs text-neutral-500 font-mono">Your custom routine will appear here once published by your coach.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('myplan', 'workout')}
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>View Workout</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 2: Current Diet Plan */}
        <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-colors shadow-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                <Utensils className="w-4 h-4" />
                <span>Assigned Nutrition Plan</span>
              </div>
              {activeDietPlan && (
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono rounded font-bold uppercase">
                  Active
                </span>
              )}
            </div>

            {activeDietPlan ? (
              <div className="space-y-2">
                <h3 className="text-xl font-display font-bold uppercase text-white tracking-tight">
                  {activeDietPlan.title || 'Personalized Diet Regime'}
                </h3>
                {activeDietPlan.calories && (
                  <p className="text-xs text-neutral-400 font-mono">
                    Calorie Target: <span className="text-white font-bold">{activeDietPlan.calories} kcal</span>
                    {activeDietPlan.macros?.protein && ` • Protein: ${activeDietPlan.macros.protein}g`}
                  </p>
                )}
                <p className="text-xs text-neutral-400 line-clamp-2">
                  {activeDietPlan.hydrationGuidance || activeDietPlan.trainerNotes || 'Adhere strictly to assigned meal timings and water targets.'}
                </p>
              </div>
            ) : (
              <div className="py-4 text-center space-y-1">
                <p className="text-sm font-bold text-white">Your trainer has not assigned a diet plan yet.</p>
                <p className="text-xs text-neutral-500 font-mono">Your meal structure and macros will appear here once published.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('myplan', 'diet')}
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>View Diet</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 3: Next Confirmed Session & Requests */}
        <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-colors shadow-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                <Calendar className="w-4 h-4" />
                <span>Training Sessions</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase">Asia/Kolkata (IST)</span>
            </div>

            {nextSession ? (
              <div className="space-y-1.5 bg-neutral-900/60 border border-neutral-800 p-4 rounded-xl">
                <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider font-bold block">Next Confirmed Session</span>
                <p className="text-lg font-display font-bold text-white uppercase">
                  {safeFormat(nextSession.date, 'EEEE, MMMM dd, yyyy', nextSession.date)}
                </p>
                <p className="text-xs font-mono text-neutral-300">
                  Time: <span className="font-bold text-white">{nextSession.time} IST</span> ({nextSession.durationMinutes || 60} mins, {nextSession.mode || 'in-person'})
                </p>
              </div>
            ) : (
              <div className="p-3 bg-neutral-900/40 rounded-xl border border-neutral-800 text-xs text-neutral-400 font-mono">
                No upcoming confirmed sessions scheduled.
              </div>
            )}

            {pendingRequests.length > 0 && (
              <div className="text-xs font-mono text-amber-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{pendingRequests.length} session request(s) awaiting trainer confirmation.</span>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('sessions', 'bookings')}
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Request Session</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 4: Attendance Summary */}
        <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-colors shadow-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
                <CheckCircle className="w-4 h-4" />
                <span>Attendance Summary</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase">Trainer-Verified Only</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-900/60 border border-neutral-800 p-3 rounded-xl text-center">
                <span className="text-2xl font-bold font-display text-white">{attendanceRate}%</span>
                <p className="text-[10px] font-mono text-neutral-400 uppercase mt-0.5">Attendance Rate</p>
              </div>
              <div className="bg-neutral-900/60 border border-neutral-800 p-3 rounded-xl text-center">
                <span className="text-2xl font-bold font-display text-teal-400">{totalAttended}</span>
                <p className="text-[10px] font-mono text-neutral-400 uppercase mt-0.5">Sessions Attended</p>
              </div>
            </div>

            {lastAttendance ? (
              <p className="text-xs text-neutral-400 font-mono">
                Last recorded: {lastAttendance.date} • Status: <span className="text-white font-bold">{lastAttendance.status}</span>
              </p>
            ) : (
              <p className="text-xs text-neutral-500 font-mono">No attendance entries recorded yet.</p>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('sessions', 'attendance')}
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>View Attendance</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 5: Latest Trainer-Recorded Progress */}
        <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-colors shadow-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                <TrendingUp className="w-4 h-4" />
                <span>Trainer-Recorded Progress</span>
              </div>
              {latestProgress?.reviewDate && (
                <span className="text-[10px] font-mono text-neutral-400 font-bold">
                  {latestProgress.reviewDate}
                </span>
              )}
            </div>

            {latestProgress ? (
              <div className="space-y-2 bg-neutral-900/60 border border-neutral-800 p-4 rounded-xl">
                {latestProgress.weight && (
                  <p className="text-xs font-mono text-neutral-300">
                    Recorded Body Weight: <span className="text-white font-bold text-base">{latestProgress.weight} kg</span>
                  </p>
                )}
                {latestProgress.clientVisibleFeedback && (
                  <div className="mt-2 text-xs text-neutral-300 leading-relaxed italic border-l-2 border-amber-500 pl-3">
                    "{latestProgress.clientVisibleFeedback}"
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center space-y-1">
                <p className="text-sm font-bold text-white">No progress review recorded yet.</p>
                <p className="text-xs text-neutral-500 font-mono">Your trainer will log physical measurements and review notes here.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('progress')}
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>View Progress</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 6: Payments & Due Date */}
        <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-colors shadow-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                <CreditCard className="w-4 h-4" />
                <span>Package Dues & Balance</span>
              </div>
              {currentPayment && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  currentPayment.status === 'Paid'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : currentPayment.status === 'Overdue'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {currentPayment.status}
                </span>
              )}
            </div>

            {currentPayment ? (
              <div className="space-y-2">
                <h3 className="text-xl font-display font-bold uppercase text-white tracking-tight">
                  {currentPayment.packageName || currentPayment.package || 'Speed Fit Training'}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block uppercase">Outstanding</span>
                    <span className="text-white font-bold text-base">₹{paymentBalance.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block uppercase">Due Date</span>
                    <span className="text-white font-bold">{currentPayment.dueDate || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-1">
                <p className="text-sm font-bold text-white">No active billing record found.</p>
                <p className="text-xs text-neutral-500 font-mono">Your trainer handles package records and receipts.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('profile', 'payments')}
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>View Payments</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
