import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  HelpCircle, 
  Plus, 
  CheckSquare, 
  History, 
  Info,
  CalendarCheck,
  ShieldAlert
} from 'lucide-react';
import { format } from 'date-fns';
import { safeFormat } from '../../../utils/dateUtils';
import { UpcomingSession, AttendanceRecord, User } from '../../../types';
import { firebaseService } from '../../../services/firebaseService';

interface ClientSessionsViewProps {
  userData: any;
  sessions: UpcomingSession[];
  attendance: AttendanceRecord[];
  trainers: User[];
  initialSubTab?: 'bookings' | 'attendance';
  onRequestSessionSuccess?: () => void;
}

export const ClientSessionsView: React.FC<ClientSessionsViewProps> = ({
  userData,
  sessions,
  attendance,
  trainers,
  initialSubTab = 'bookings',
  onRequestSessionSuccess
}) => {
  const [subTab, setSubTab] = useState<'bookings' | 'attendance'>(initialSubTab);

  // Booking Form State
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestDate, setRequestDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [requestTime, setRequestTime] = useState('10:00');
  const [requestDuration, setRequestDuration] = useState(60);
  const [requestMode, setRequestMode] = useState<'in-person' | 'online'>('in-person');
  const [requestNotes, setRequestNotes] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');

  // Proposal Response State
  const [processingProposalId, setProcessingProposalId] = useState<string | null>(null);

  // Audit view state for attendance
  const [selectedAuditRecord, setSelectedAuditRecord] = useState<AttendanceRecord | null>(null);

  // Attendance stats
  const totalAttended = attendance.filter(a => a.status === 'Present').length;
  const totalLate = attendance.filter(a => a.status === 'Late').length;
  const totalExcused = attendance.filter(a => a.status === 'Excused').length;
  const totalAbsent = attendance.filter(a => a.status === 'Absent' || a.status === 'Missed').length;
  const totalRecorded = attendance.length;
  const attendanceRate = totalRecorded > 0 ? Math.round(((totalAttended + totalLate) / totalRecorded) * 100) : 0;

  // Sorted session lists
  const pendingRequests = sessions.filter(s => s.status === 'Pending');
  const proposedRequests = sessions.filter(s => s.status === 'Proposed');
  const confirmedSessions = sessions.filter(s => s.status === 'Confirmed');
  const completedOrCancelled = sessions.filter(s => ['Completed', 'Cancelled', 'Rejected'].includes(s.status));

  // Time slot options (IST)
  const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
  ];

  const handleBookSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError('');
    setRequestSuccess('');
    setSubmittingRequest(true);

    try {
      const assignedTrainer = trainers.find(t => t.id === userData?.trainerId) || trainers[0];
      const payload = {
        clientId: userData.uid,
        clientName: userData.name || userData.clientDetails?.fullName || 'Client',
        trainerId: userData.trainerId || assignedTrainer?.id || 'thousiefkhan298@gmail.com',
        trainerName: assignedTrainer?.name || 'Speed Fit Coach',
        date: requestDate,
        time: requestTime,
        durationMinutes: requestDuration,
        mode: requestMode,
        notes: requestNotes
      };

      const result = await firebaseService.requestSession(payload);
      if (result.success) {
        setRequestSuccess(`Session request for ${requestDate} at ${requestTime} IST submitted. Awaiting coach approval.`);
        setShowRequestForm(false);
        setRequestNotes('');
        onRequestSessionSuccess?.();
      } else {
        setRequestError(result.error || 'Failed to submit booking request.');
      }
    } catch (err: any) {
      setRequestError(err.message || 'Session request could not be processed.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleRespondProposal = async (sessionId: string, response: 'accept' | 'decline') => {
    setProcessingProposalId(sessionId);
    try {
      await firebaseService.clientRespondProposal(sessionId, userData.uid, response);
    } catch (err: any) {
      alert(err.message || 'Failed to update proposal response.');
    } finally {
      setProcessingProposalId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* Header and Sub-Tab Navigation */}
      <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono text-brand-red font-bold uppercase tracking-widest block">
            Schedule & Attendance Management
          </span>
          <h2 className="text-xl sm:text-2xl font-display font-bold uppercase text-white tracking-tight mt-0.5">
            Sessions & Attendance Log
          </h2>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">
            Timezone: <strong className="text-white">Asia/Kolkata (IST, UTC+05:30)</strong> • Minimum 60-minute booking notice enforced.
          </p>
        </div>

        {/* Toggle Pills */}
        <div className="flex bg-neutral-900 border border-neutral-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setSubTab('bookings')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              subTab === 'bookings'
                ? 'bg-brand-red text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Bookings & Requests</span>
          </button>
          <button
            onClick={() => setSubTab('attendance')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              subTab === 'attendance'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Attendance History</span>
          </button>
        </div>
      </div>

      {/* Global Success / Error Alerts */}
      {requestSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{requestSuccess}</span>
          </div>
          <button onClick={() => setRequestSuccess('')} className="text-neutral-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {requestError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>{requestError}</span>
          </div>
          <button onClick={() => setRequestError('')} className="text-neutral-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* 1. BOOKINGS & REQUESTS SUB-TAB */}
      {subTab === 'bookings' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          
          {/* Action Row: Request Session Button */}
          <div className="flex justify-between items-center bg-[#141417] border border-neutral-800 p-5 rounded-2xl">
            <div>
              <h3 className="text-base font-bold uppercase font-display text-white">Book a Training Slot</h3>
              <p className="text-xs text-neutral-400 font-mono">
                Requests are processed directly by your coach. Requests within 60 minutes of start time will be rejected.
              </p>
            </div>
            <button
              onClick={() => {
                setShowRequestForm(!showRequestForm);
                setRequestError('');
              }}
              className="px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{showRequestForm ? 'Close Form' : 'Request Session'}</span>
            </button>
          </div>

          {/* Request Session Form Modal / Card */}
          {showRequestForm && (
            <div className="bg-[#18181D] border-2 border-brand-red/40 rounded-2xl p-6 shadow-2xl space-y-5 animate-in slide-in-from-top-4 duration-200">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2 text-brand-red font-mono text-xs font-bold uppercase">
                  <Clock className="w-4 h-4" />
                  <span>New Session Request Form</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-400 uppercase bg-neutral-900 px-2 py-1 rounded">
                  Server Time Validated
                </span>
              </div>

              <form onSubmit={handleBookSession} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1.5 font-bold">
                      Session Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={format(new Date(), 'yyyy-MM-dd')}
                      value={requestDate}
                      onChange={(e) => setRequestDate(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono focus:border-brand-red outline-none"
                    />
                  </div>

                  {/* Time slot */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1.5 font-bold">
                      Start Time (Asia/Kolkata IST) *
                    </label>
                    <select
                      value={requestTime}
                      onChange={(e) => setRequestTime(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono focus:border-brand-red outline-none"
                    >
                      {timeSlots.map(t => (
                        <option key={t} value={t}>{t} IST</option>
                      ))}
                    </select>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1.5 font-bold">
                      Duration
                    </label>
                    <select
                      value={requestDuration}
                      onChange={(e) => setRequestDuration(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono focus:border-brand-red outline-none"
                    >
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes (Standard)</option>
                      <option value={90}>90 minutes</option>
                    </select>
                  </div>

                  {/* Mode */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1.5 font-bold">
                      Training Mode
                    </label>
                    <select
                      value={requestMode}
                      onChange={(e) => setRequestMode(e.target.value as any)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono focus:border-brand-red outline-none"
                    >
                      <option value="in-person">In-Person (Speed Fit Gym)</option>
                      <option value="online">Online Video Guidance</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1.5 font-bold">
                    Focus / Notes for Trainer (Optional)
                  </label>
                  <input
                    type="text"
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    placeholder="e.g., Heavy legs day, mobility emphasis, or questions about form"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono focus:border-brand-red outline-none"
                  />
                </div>

                <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800 flex items-center gap-2 text-xs font-mono text-neutral-300">
                  <Info className="w-4 h-4 text-brand-red shrink-0" />
                  <span>
                    Rule: Notice must be at least 60 minutes before start. E.g. for a 6:00 PM session, you must request by 5:00 PM.
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(false)}
                    className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="px-6 py-2.5 bg-brand-red hover:bg-red-700 disabled:opacity-50 text-white font-mono text-xs font-bold uppercase rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    {submittingRequest ? 'Validating...' : 'Submit Session Request'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Proposed Times (Requires Acceptance) */}
          {proposedRequests.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                <AlertCircle className="w-4 h-4" />
                <span>Trainer Proposed Sessions ({proposedRequests.length})</span>
              </div>
              <div className="space-y-2">
                {proposedRequests.map(prop => (
                  <div key={prop.id} className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-amber-400 font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20">
                        Status: Proposed (Action Required)
                      </span>
                      <p className="text-base font-bold text-white uppercase">
                        Proposed: {prop.proposedDate || prop.date} at {prop.proposedTime || prop.time} IST
                      </p>
                      <p className="text-xs text-neutral-400 font-mono">
                        Original Request: {prop.date} at {prop.time} IST • {prop.durationMinutes || 60} mins ({prop.mode || 'in-person'})
                      </p>
                      {prop.trainerNotes && (
                        <p className="text-xs text-neutral-300 italic">
                          Coach note: "{prop.trainerNotes}"
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto shrink-0">
                      <button
                        onClick={() => handleRespondProposal(prop.id, 'accept')}
                        disabled={processingProposalId === prop.id}
                        className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-mono text-xs font-bold uppercase rounded-xl cursor-pointer"
                      >
                        Accept Slot
                      </button>
                      <button
                        onClick={() => handleRespondProposal(prop.id, 'decline')}
                        disabled={processingProposalId === prop.id}
                        className="flex-1 sm:flex-none px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 font-mono text-xs font-bold uppercase rounded-xl cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirmed Sessions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                <CheckCircle className="w-4 h-4" />
                <span>Confirmed Upcoming Sessions ({confirmedSessions.length})</span>
              </div>
            </div>

            {confirmedSessions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {confirmedSessions.map(session => (
                  <div key={session.id} className="bg-[#141417] border border-neutral-800 rounded-2xl p-5 space-y-2 hover:border-neutral-700 transition-colors">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                        Confirmed
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">{session.durationMinutes || 60} mins</span>
                    </div>
                    <p className="text-lg font-bold font-display text-white uppercase">
                      {safeFormat(session.date, 'EEEE, MMM dd, yyyy', session.date)}
                    </p>
                    <div className="flex items-center justify-between text-xs font-mono text-neutral-300 pt-1">
                      <span>Time: <strong className="text-white">{session.time} IST</strong></span>
                      <span className="uppercase text-[10px] text-neutral-400">{session.mode || 'in-person'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-[#141417] border border-neutral-800 rounded-2xl text-center text-xs text-neutral-500 font-mono">
                No confirmed sessions scheduled at this time.
              </div>
            )}
          </div>

          {/* Pending Requests */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Pending Requests ({pendingRequests.length})</span>
            </div>

            {pendingRequests.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pendingRequests.map(req => (
                  <div key={req.id} className="bg-[#141417] border border-neutral-800 rounded-2xl p-5 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                        Pending Trainer Review
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">{req.durationMinutes || 60} mins</span>
                    </div>
                    <p className="text-base font-bold font-display text-white uppercase">
                      {safeFormat(req.date, 'EEEE, MMM dd, yyyy', req.date)}
                    </p>
                    <p className="text-xs font-mono text-neutral-400">
                      Requested Time: <strong className="text-white">{req.time} IST</strong> ({req.mode || 'in-person'})
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-[#141417] border border-neutral-800 rounded-2xl text-center text-xs text-neutral-500 font-mono">
                No requests currently pending review.
              </div>
            )}
          </div>

          {/* Completed / Cancelled / Past Sessions */}
          {completedOrCancelled.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-neutral-800">
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 font-bold uppercase tracking-wider">
                <History className="w-4 h-4" />
                <span>Session History</span>
              </div>
              <div className="space-y-2">
                {completedOrCancelled.slice(0, 5).map(s => (
                  <div key={s.id} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-white font-bold">{s.date} at {s.time} IST</span>
                      <span className="text-neutral-500 text-[10px] block">{s.mode || 'in-person'}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      s.status === 'Completed'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 2. ATTENDANCE HISTORY SUB-TAB */}
      {subTab === 'attendance' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-[#141417] border border-neutral-800 p-4 rounded-2xl text-center">
              <span className="text-2xl font-bold font-display text-white">{attendanceRate}%</span>
              <p className="text-[10px] font-mono text-neutral-400 uppercase mt-0.5">Attendance %</p>
            </div>
            <div className="bg-[#141417] border border-neutral-800 p-4 rounded-2xl text-center">
              <span className="text-2xl font-bold font-display text-emerald-400">{totalAttended}</span>
              <p className="text-[10px] font-mono text-neutral-400 uppercase mt-0.5">Present</p>
            </div>
            <div className="bg-[#141417] border border-neutral-800 p-4 rounded-2xl text-center">
              <span className="text-2xl font-bold font-display text-amber-400">{totalLate}</span>
              <p className="text-[10px] font-mono text-neutral-400 uppercase mt-0.5">Late</p>
            </div>
            <div className="bg-[#141417] border border-neutral-800 p-4 rounded-2xl text-center">
              <span className="text-2xl font-bold font-display text-cyan-400">{totalExcused}</span>
              <p className="text-[10px] font-mono text-neutral-400 uppercase mt-0.5">Excused</p>
            </div>
            <div className="bg-[#141417] border border-neutral-800 p-4 rounded-2xl text-center col-span-2 sm:col-span-1">
              <span className="text-2xl font-bold font-display text-rose-400">{totalAbsent}</span>
              <p className="text-[10px] font-mono text-neutral-400 uppercase mt-0.5">Absent / Missed</p>
            </div>
          </div>

          {/* Audit History Modal */}
          {selectedAuditRecord && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#18181B] border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <h4 className="text-sm font-bold uppercase font-display text-white">Attendance Audit History</h4>
                  <button
                    onClick={() => setSelectedAuditRecord(null)}
                    className="text-neutral-400 hover:text-white text-xs font-mono px-2 py-1 bg-neutral-800 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-mono text-neutral-400">
                    Session Date: <strong className="text-white">{selectedAuditRecord.date}</strong>
                  </p>
                  {selectedAuditRecord.auditHistory && selectedAuditRecord.auditHistory.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedAuditRecord.auditHistory.map((entry, idx) => (
                        <div key={idx} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs font-mono space-y-1">
                          <div className="flex justify-between text-neutral-400 text-[10px]">
                            <span>{entry.changedByName || 'Trainer'}</span>
                            <span>{safeFormat(entry.changedAt, 'MMM dd, hh:mm a')}</span>
                          </div>
                          <p className="text-white">
                            Status: <strong className="text-emerald-400">{entry.newStatus}</strong>
                            {entry.oldStatus && <span className="text-neutral-500"> (from {entry.oldStatus})</span>}
                          </p>
                          {entry.reason && (
                            <p className="text-neutral-400 text-[11px] italic">Reason: {entry.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 font-mono">Original record with no subsequent corrections.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Attendance Records List */}
          <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold uppercase font-display text-white">Verified Attendance Register</h3>
              <span className="text-[10px] font-mono text-neutral-400 uppercase">Trainer-Marked Records</span>
            </div>

            {attendance.length > 0 ? (
              <div className="space-y-2">
                {attendance.map(record => (
                  <div
                    key={record.id}
                    className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold font-mono text-white">{record.date}</span>
                        {record.time && (
                          <span className="text-xs font-mono text-neutral-400">at {record.time} IST</span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                          record.status === 'Present'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : record.status === 'Late'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : record.status === 'Excused'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {record.status}
                        </span>
                      </div>
                      {(record.trainerNotes || record.notes) && (
                        <p className="text-xs text-neutral-400 italic">
                          Coach note: {record.trainerNotes || record.notes}
                        </p>
                      )}
                    </div>

                    {record.auditHistory && record.auditHistory.length > 0 && (
                      <button
                        onClick={() => setSelectedAuditRecord(record)}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-mono flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Audit Log</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-neutral-500 font-mono">
                No attendance records marked yet. Only your trainer can record session attendance.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
