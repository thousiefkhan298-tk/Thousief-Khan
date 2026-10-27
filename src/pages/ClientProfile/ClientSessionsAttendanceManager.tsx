import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Plus, 
  History, 
  Edit2, 
  Trash2, 
  ShieldCheck, 
  CheckSquare,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { AttendanceRecord, UpcomingSession } from '../../types';
import { firebaseService } from '../../services/firebaseService';

interface ClientSessionsAttendanceManagerProps {
  clientId: string;
  clientName: string;
  sessions: UpcomingSession[];
  attendance: AttendanceRecord[];
  userData: any;
  totalPackageSessions?: number;
}

export const ClientSessionsAttendanceManager: React.FC<ClientSessionsAttendanceManagerProps> = ({
  clientId,
  clientName,
  sessions,
  attendance,
  userData,
  totalPackageSessions = 30
}) => {
  // Mark Attendance Form State
  const [attDate, setAttDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [attTime, setAttTime] = useState('10:00');
  const [attStatus, setAttStatus] = useState<'Present' | 'Absent' | 'Late' | 'Excused'>('Present');
  const [attNotes, setAttNotes] = useState('');
  const [isMarkingAtt, setIsMarkingAtt] = useState(false);

  // Correction Modal State
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<'Present' | 'Absent' | 'Late' | 'Excused'>('Present');
  const [newNotes, setNewNotes] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);

  // Propose Alternate Time Modal State
  const [proposingSession, setProposingSession] = useState<UpcomingSession | null>(null);
  const [proposedDate, setProposedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [proposedTime, setProposedTime] = useState('11:00');
  const [proposeReason, setProposeReason] = useState('');
  const [isProposing, setIsProposing] = useState(false);

  // Reject Modal State
  const [rejectingSession, setRejectingSession] = useState<UpcomingSession | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Audit Viewer Modal State
  const [viewingAudit, setViewingAudit] = useState<AttendanceRecord | null>(null);

  // Attendance stats
  const totalAttended = attendance.filter(a => a.status === 'Present').length;
  const totalLate = attendance.filter(a => a.status === 'Late').length;
  const totalExcused = attendance.filter(a => a.status === 'Excused').length;
  const totalAbsent = attendance.filter(a => a.status === 'Absent' || a.status === 'Missed').length;
  const totalRecorded = attendance.length;
  const attendanceRate = totalRecorded > 0 ? Math.round(((totalAttended + totalLate) / totalRecorded) * 100) : 0;

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMarkingAtt(true);
    try {
      await firebaseService.markAttendance({
        clientId,
        date: attDate,
        time: attTime,
        status: attStatus,
        trainerNotes: attNotes
      }, userData);
      setAttNotes('');
    } catch (err: any) {
      alert('Failed to mark attendance: ' + err.message);
    } finally {
      setIsMarkingAtt(false);
    }
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRecord) return;
    setIsSavingCorrection(true);
    try {
      await firebaseService.updateAttendance(
        correctingRecord.id,
        {
          status: newStatus,
          trainerNotes: newNotes
        },
        userData,
        correctionReason || 'Trainer manual correction'
      );
      setCorrectingRecord(null);
      setCorrectionReason('');
    } catch (err: any) {
      alert('Failed to update attendance correction: ' + err.message);
    } finally {
      setIsSavingCorrection(false);
    }
  };

  const handleApproveSession = async (session: UpcomingSession) => {
    try {
      await firebaseService.trainerActionSession(session.id, 'approve');
    } catch (err: any) {
      alert('Failed to approve session: ' + err.message);
    }
  };

  const handleRejectSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingSession) return;
    setIsRejecting(true);
    try {
      await firebaseService.trainerActionSession(rejectingSession.id, 'reject', {
        reason: rejectionReason || 'Unavailable at requested time'
      });
      setRejectingSession(null);
      setRejectionReason('');
    } catch (err: any) {
      alert('Failed to decline session: ' + err.message);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleProposeTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposingSession) return;
    setIsProposing(true);
    try {
      await firebaseService.trainerActionSession(proposingSession.id, 'propose', {
        proposedDate,
        proposedTime,
        reason: proposeReason || 'Proposed alternate time'
      });
      setProposingSession(null);
      setProposeReason('');
    } catch (err: any) {
      alert('Failed to propose alternate time: ' + err.message);
    } finally {
      setIsProposing(false);
    }
  };

  const pendingRequests = sessions.filter(s => s.status === 'Pending' || s.status === 'Proposed');
  const confirmedSessions = sessions.filter(s => s.status === 'Confirmed');

  return (
    <div className="space-y-8 font-sans">
      
      {/* Top Strip: Attendance Stats & Progress Bar */}
      <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-800 pb-3">
          <div>
            <h3 className="text-base font-bold font-display uppercase text-white">Client Attendance & Commitment Register</h3>
            <p className="text-xs text-neutral-400 font-mono">Sessions attended towards package contract.</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-emerald-400 font-bold">{totalAttended} Attended</span>
            <span>•</span>
            <span className="text-amber-400 font-bold">{totalLate} Late</span>
            <span>•</span>
            <span className="text-cyan-400 font-bold">{totalExcused} Excused</span>
            <span>•</span>
            <span className="text-rose-400 font-bold">{totalAbsent} Absent</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-neutral-400 uppercase font-bold text-[10px]">Package Completion</span>
            <span className="text-white font-bold">{totalAttended} / {totalPackageSessions} Sessions ({attendanceRate}%)</span>
          </div>
          <div className="w-full bg-neutral-900 rounded-full h-3 overflow-hidden border border-neutral-800">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, totalPackageSessions > 0 ? (totalAttended / totalPackageSessions) * 100 : 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid: Session Requests & Confirmed Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Column 1: Pending & Proposed Session Requests */}
        <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold uppercase font-display text-white">Session Booking Requests ({pendingRequests.length})</h4>
            </div>
            <span className="text-[10px] font-mono text-neutral-400 uppercase">Min 60m Rule Enforced</span>
          </div>

          {pendingRequests.length === 0 ? (
            <p className="text-xs text-neutral-500 font-mono text-center py-8">
              No pending session requests from this client.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        req.status === 'Proposed' ? 'bg-amber-500/20 text-amber-400' : 'bg-brand-red/20 text-brand-red'
                      }`}>
                        {req.status}
                      </span>
                      <p className="text-sm font-bold text-white uppercase font-display mt-1">
                        {req.date} at {req.time} IST
                      </p>
                      <p className="text-xs text-neutral-400 font-mono">
                        {req.durationMinutes || 60} mins • {req.mode || 'in-person'}
                      </p>
                    </div>
                  </div>

                  {req.notes && (
                    <p className="text-xs text-neutral-300 italic bg-neutral-950 p-2 rounded">
                      Client note: "{req.notes}"
                    </p>
                  )}

                  {req.status === 'Pending' && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-neutral-800">
                      <button
                        onClick={() => handleApproveSession(req)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-mono text-xs font-bold uppercase rounded-lg cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setProposingSession(req);
                          setProposedDate(req.date);
                          setProposedTime(req.time || '11:00');
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-mono text-xs font-bold uppercase rounded-lg cursor-pointer"
                      >
                        Propose Alternate
                      </button>
                      <button
                        onClick={() => setRejectingSession(req)}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs font-bold uppercase rounded-lg cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {req.status === 'Proposed' && (
                    <p className="text-xs text-amber-400 font-mono">
                      Proposed {req.proposedDate} at {req.proposedTime} IST • Awaiting client response.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Confirmed Upcoming Sessions */}
        <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold uppercase font-display text-white">Confirmed Upcoming Sessions ({confirmedSessions.length})</h4>
            </div>
            <span className="text-[10px] font-mono text-neutral-400 uppercase">Asia/Kolkata (IST)</span>
          </div>

          {confirmedSessions.length === 0 ? (
            <p className="text-xs text-neutral-500 font-mono text-center py-8">
              No confirmed sessions scheduled.
            </p>
          ) : (
            <div className="space-y-3">
              {confirmedSessions.map(session => (
                <div key={session.id} className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <span className="text-sm font-bold text-white uppercase font-display">
                      {session.date} at {session.time} IST
                    </span>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">
                      {session.durationMinutes || 60} mins • {session.mode || 'in-person'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-mono font-bold uppercase">
                    Confirmed
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Mark Attendance Section */}
      <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="border-b border-neutral-800 pb-3">
          <h4 className="text-base font-bold uppercase font-display text-white">Mark Session Attendance</h4>
          <p className="text-xs text-neutral-400 font-mono">Only certified coaches can record or update client attendance.</p>
        </div>

        <form onSubmit={handleMarkAttendance} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1 font-bold">Session Date *</label>
            <input
              type="date"
              required
              value={attDate}
              onChange={(e) => setAttDate(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1 font-bold">Session Time (IST)</label>
            <input
              type="time"
              value={attTime}
              onChange={(e) => setAttTime(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1 font-bold">Attendance Status *</label>
            <select
              value={attStatus}
              onChange={(e) => setAttStatus(e.target.value as any)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono"
            >
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="Excused">Excused</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1 font-bold">Trainer Notes</label>
            <input
              type="text"
              placeholder="e.g., Arrived 10 min late; finished squats"
              value={attNotes}
              onChange={(e) => setAttNotes(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono"
            />
          </div>

          <div className="sm:col-span-2 md:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={isMarkingAtt}
              className="px-6 py-2.5 bg-brand-red hover:bg-red-700 disabled:opacity-50 text-white font-mono text-xs font-bold uppercase rounded-xl transition-all shadow-md cursor-pointer"
            >
              {isMarkingAtt ? 'Logging...' : 'Record Attendance Entry'}
            </button>
          </div>
        </form>
      </div>

      {/* Attendance History & Audit Trail */}
      <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
          <h4 className="text-base font-bold uppercase font-display text-white">Attendance Log & Audit History</h4>
          <span className="text-[10px] font-mono text-neutral-400 uppercase">{attendance.length} Total Records</span>
        </div>

        {attendance.length === 0 ? (
          <p className="text-xs text-neutral-500 font-mono text-center py-8">
            No attendance records logged yet for this client.
          </p>
        ) : (
          <div className="space-y-2">
            {attendance.map(record => (
              <div
                key={record.id}
                className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold font-mono text-white">{record.date}</span>
                    {record.time && <span className="text-xs font-mono text-neutral-400">{record.time} IST</span>}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                      record.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      record.status === 'Late' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      record.status === 'Excused' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                  {record.trainerNotes && (
                    <p className="text-xs text-neutral-300 italic">Notes: {record.trainerNotes}</p>
                  )}
                  {record.auditHistory && record.auditHistory.length > 1 && (
                    <span className="text-[9px] font-mono text-amber-400 block">
                      Corrected {record.auditHistory.length - 1} time(s) • Last by {record.auditHistory[record.auditHistory.length - 1]?.changedByName || 'Trainer'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => {
                      setCorrectingRecord(record);
                      setNewStatus(record.status as any || 'Present');
                      setNewNotes(record.trainerNotes || '');
                    }}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Correct</span>
                  </button>
                  {record.auditHistory && record.auditHistory.length > 0 && (
                    <button
                      onClick={() => setViewingAudit(record)}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Audit Trail</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Correction Modal */}
      {correctingRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveCorrection} className="bg-[#18181B] border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h4 className="text-sm font-bold uppercase font-display text-white">Correct Attendance Record</h4>
              <button
                type="button"
                onClick={() => setCorrectingRecord(null)}
                className="text-neutral-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <p className="text-xs font-mono text-neutral-400">
              Editing attendance for <strong className="text-white">{correctingRecord.date}</strong>. Current status: <strong className="text-amber-400">{correctingRecord.status}</strong>
            </p>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1 font-bold">New Status *</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as any)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono"
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Excused">Excused</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1 font-bold">Updated Trainer Notes</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-amber-400 mb-1 font-bold">
                Correction Reason (Recorded in Audit History) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Client informed in advance of late arrival"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono focus:border-amber-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCorrectingRecord(null)}
                className="px-4 py-2 bg-neutral-800 text-neutral-300 font-mono text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingCorrection}
                className="px-5 py-2 bg-brand-red text-white font-mono text-xs font-bold uppercase rounded-xl cursor-pointer"
              >
                {isSavingCorrection ? 'Saving...' : 'Save Correction'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Audit Trail Modal */}
      {viewingAudit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h4 className="text-sm font-bold uppercase font-display text-white">Attendance Audit History</h4>
              <button
                onClick={() => setViewingAudit(null)}
                className="text-neutral-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <p className="text-xs font-mono text-neutral-400">
              Audit timeline for session on <strong className="text-white">{viewingAudit.date}</strong>
            </p>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {viewingAudit.auditHistory?.map((entry, idx) => (
                <div key={idx} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs font-mono space-y-1">
                  <div className="flex justify-between text-neutral-400 text-[10px]">
                    <span className="font-bold text-white">{entry.changedByName || 'Trainer'}</span>
                    <span>{format(new Date(entry.changedAt), 'MMM dd, hh:mm a')}</span>
                  </div>
                  <p className="text-white">
                    Status: <strong className="text-emerald-400">{entry.newStatus}</strong>
                    {entry.oldStatus && <span className="text-neutral-500"> (previously {entry.oldStatus})</span>}
                  </p>
                  {entry.reason && (
                    <p className="text-neutral-400 text-[11px] italic">Reason: {entry.reason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Propose Alternate Time Modal */}
      {proposingSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleProposeTime} className="bg-[#18181B] border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h4 className="text-sm font-bold uppercase font-display text-white">Propose Alternate Session Time</h4>
              <button type="button" onClick={() => setProposingSession(null)} className="text-neutral-400 hover:text-white text-xs font-mono">✕</button>
            </div>

            <p className="text-xs font-mono text-neutral-400">
              Client requested: <strong className="text-white">{proposingSession.date} at {proposingSession.time} IST</strong>
            </p>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1 font-bold">Proposed Date *</label>
              <input
                type="date"
                required
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1 font-bold">Proposed Time (IST) *</label>
              <input
                type="time"
                required
                value={proposedTime}
                onChange={(e) => setProposedTime(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1 font-bold">Note for Client</label>
              <input
                type="text"
                placeholder="e.g., Fully booked at requested hour; available 1 hr later"
                value={proposeReason}
                onChange={(e) => setProposeReason(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setProposingSession(null)} className="px-4 py-2 bg-neutral-800 text-neutral-300 font-mono text-xs rounded-xl cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={isProposing} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-mono text-xs font-bold uppercase rounded-xl cursor-pointer">
                {isProposing ? 'Sending...' : 'Send Proposal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reject Session Modal */}
      {rejectingSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleRejectSession} className="bg-[#18181B] border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h4 className="text-sm font-bold uppercase font-display text-white">Decline Session Request</h4>
              <button type="button" onClick={() => setRejectingSession(null)} className="text-neutral-400 hover:text-white text-xs font-mono">✕</button>
            </div>

            <p className="text-xs font-mono text-neutral-400">
              Declining session on <strong className="text-white">{rejectingSession.date} at {rejectingSession.time} IST</strong>
            </p>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1 font-bold">Reason for Rejection</label>
              <input
                type="text"
                placeholder="e.g., Coach travelling / schedule unavailable"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setRejectingSession(null)} className="px-4 py-2 bg-neutral-800 text-neutral-300 font-mono text-xs rounded-xl cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={isRejecting} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold uppercase rounded-xl cursor-pointer">
                {isRejecting ? 'Processing...' : 'Decline Request'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
