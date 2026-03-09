import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import Layout from '../../components/Layout';
import { User, ClientDetails, HealthAssessment, WorkoutLog, WorkoutPlan } from '../../types';
import { ArrowLeft, User as UserIcon, Activity, Calendar, FileText, Plus, Edit2, Shield, Target, Zap, Camera, MessageSquare } from 'lucide-react';
import ProgressPhotos from '../../components/ProgressPhotos';

const ClientProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null); // Current logged in user
  const [client, setClient] = useState<User | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [healthAssessment, setHealthAssessment] = useState<HealthAssessment | null>(null);
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<any[]>([]);
  const [trainerNotes, setTrainerNotes] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Workout Plan Form State
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planContent, setPlanContent] = useState('');

  // Trainer Notes Form State
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    const fetchAllData = async () => {
      if (!id) return;

      try {
        // Fetch current user
        const currentUserData = await api.getMe();
        setUserData(currentUserData);

        // Fetch client user doc
        const clientData = await api.getUserById(id);
        setClient(clientData);

        // Fetch workout logs
        const logsData = await api.getWorkoutLogs(id);
        setRecentLogs(logsData.slice(0, 5));

        // Fetch workout plans
        const plansData = await api.getWorkoutPlans(id);
        setWorkoutPlans(plansData);

        // Fetch trainer notes
        const notesData = await api.getTrainerNotes(id);
        setTrainerNotes(notesData);

        // Fetch attendance
        const attendanceData = await api.getAttendance(id);
        setAttendance(attendanceData);
        
      } catch (error) {
        console.error("Error fetching client profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [id]);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !noteContent.trim() || !userData) return;
    try {
      await api.saveTrainerNote({
        id: editingNoteId,
        trainerId: userData.id,
        clientId: id,
        note: noteContent,
        updatedAt: new Date().toISOString()
      });
      setNoteContent('');
      setEditingNoteId(null);
      setShowNoteForm(false);
      const notesData = await api.getTrainerNotes(id);
      setTrainerNotes(notesData);
    } catch (error) {
      console.error("Error saving trainer note:", error);
      alert("Failed to save trainer note.");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await api.deleteTrainerNote(noteId);
      const notesData = await api.getTrainerNotes(id!);
      setTrainerNotes(notesData);
    } catch (error) {
      console.error("Error deleting trainer note:", error);
      alert("Failed to delete trainer note.");
    }
  };

  const handleMarkAttendance = async (status: 'present' | 'missed') => {
    if (!id) return;
    try {
      const date = new Date().toISOString().split('T')[0];
      await api.markAttendance({ clientId: id, date, status });
      const attendanceData = await api.getAttendance(id);
      setAttendance(attendanceData);
    } catch (error) {
      console.error("Error marking attendance:", error);
      alert("Failed to mark attendance.");
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    try {
      await api.deleteWorkoutPlan(planId);
      const plansData = await api.getWorkoutPlans(id!);
      setWorkoutPlans(plansData);
    } catch (error) {
      console.error("Error deleting workout plan:", error);
      alert("Failed to delete workout plan.");
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !planContent.trim()) return;

    try {
      const now = new Date().toISOString();
      const planData = {
        id: editingPlanId || undefined,
        clientId: id,
        plan: planContent,
        updatedAt: now
      };
      
      const savedPlan = await api.saveWorkoutPlan(planData);
      
      if (editingPlanId) {
        setWorkoutPlans(plans => plans.map(p => p.id === editingPlanId ? savedPlan : p));
      } else {
        setWorkoutPlans([savedPlan, ...workoutPlans]);
      }
      
      setShowPlanForm(false);
      setEditingPlanId(null);
      setPlanContent('');
    } catch (error) {
      console.error("Error saving workout plan:", error);
      alert("Failed to save workout plan.");
    }
  };

  const handleEditPlan = (plan: WorkoutPlan) => {
    setPlanContent(plan.plan);
    setEditingPlanId(plan.id);
    setShowPlanForm(true);
  };

  if (loading) {
    return (
      <Layout userData={userData}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Accessing Recruit Profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!client) return <Layout userData={userData}><div className="p-10 font-mono text-red-500 uppercase tracking-widest">Error: Recruit not found in database.</div></Layout>;

  return (
    <Layout userData={userData}>
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center space-x-3 text-neutral-500 hover:text-brand-red transition-all mb-10 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="font-mono text-[10px] uppercase tracking-widest">Return to Command Center</span>
      </button>

      {/* Quick Actions */}
      {userData?.role === 'TRAINER' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <button 
            onClick={() => {
              setPlanContent('');
              setEditingPlanId(null);
              setShowPlanForm(true);
            }}
            className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl hover:border-brand-red/50 transition-all text-left group"
          >
            <FileText className="w-6 h-6 text-brand-red mb-4 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-bold text-white uppercase tracking-wider">Create Protocol</p>
            <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mt-1">Initialize new training plan.</p>
          </button>
          
          <button 
            onClick={() => navigate(`/messages/${id}`)}
            className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl hover:border-brand-red/50 transition-all text-left group"
          >
            <MessageSquare className="w-6 h-6 text-brand-red mb-4 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-bold text-white uppercase tracking-wider">Send Message</p>
            <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mt-1">Direct communication.</p>
          </button>

          <button 
            onClick={() => handleMarkAttendance('present')}
            className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl hover:border-brand-red/50 transition-all text-left group"
          >
            <Calendar className="w-6 h-6 text-brand-red mb-4 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-bold text-white uppercase tracking-wider">Mark Attendance</p>
            <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mt-1">Log session presence.</p>
          </button>
        </div>
      )}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] overflow-hidden mb-10 shadow-2xl relative">
        <div className="absolute top-0 right-0 p-8">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest">Active Status</span>
          </div>
        </div>

        <div className="p-10 flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-10 border-b border-neutral-800">
          <div className="w-32 h-32 bg-neutral-800 rounded-[2rem] flex items-center justify-center font-display italic text-5xl text-brand-red border border-neutral-700 shadow-inner">
            {(client.name || client.email || '?')[0].toUpperCase()}
          </div>
          <div className="text-center md:text-left">
            <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.3em] mb-2">Subject Profile</p>
            <h2 className="text-5xl font-display italic uppercase leading-none mb-4">{client.name || 'Unnamed Client'}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="px-4 py-1.5 bg-neutral-800 text-neutral-400 text-[8px] font-mono uppercase tracking-widest rounded-full border border-neutral-700">
                ID: {id?.slice(0, 8)}...
              </span>
              {client.onboardingCompleted && (
                <span className="px-4 py-1.5 bg-brand-red/10 text-brand-red text-[8px] font-mono uppercase tracking-widest rounded-full border border-brand-red/20">
                  Onboarding Verified
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-800">
          <div className="p-8 group hover:bg-neutral-800/30 transition-colors">
            <h3 className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] mb-6 flex items-center">
              <UserIcon className="w-3 h-3 mr-2 text-brand-red" /> Vital Statistics
            </h3>
            {clientDetails ? (
              <div className="space-y-4 font-mono text-[10px] uppercase tracking-wider">
                <div className="flex justify-between border-b border-neutral-800/50 pb-2"><span className="text-neutral-600">Age</span> <span className="text-white">{clientDetails.age}</span></div>
                <div className="flex justify-between border-b border-neutral-800/50 pb-2"><span className="text-neutral-600">Gender</span> <span className="text-white">{clientDetails.gender}</span></div>
                <div className="flex justify-between border-b border-neutral-800/50 pb-2"><span className="text-neutral-600">Comm Link</span> <span className="text-white">{clientDetails.phoneNumber}</span></div>
                <div className="flex justify-between"><span className="text-neutral-600">Emergency</span> <span className="text-white truncate max-w-[120px]">{clientDetails.emergencyContact}</span></div>
              </div>
            ) : (
              <p className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest italic">Data not synchronized.</p>
            )}
          </div>

          <div className="p-8 group hover:bg-neutral-800/30 transition-colors">
            <h3 className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] mb-6 flex items-center">
              <Target className="w-3 h-3 mr-2 text-brand-red" /> Performance Goals
            </h3>
            {healthAssessment ? (
              <div className="space-y-4 font-mono text-[10px] uppercase tracking-wider">
                <div className="flex justify-between border-b border-neutral-800/50 pb-2"><span className="text-neutral-600">Height</span> <span className="text-white">{healthAssessment.height}</span></div>
                <div className="flex justify-between border-b border-neutral-800/50 pb-2"><span className="text-neutral-600">Weight</span> <span className="text-white">{healthAssessment.weight}</span></div>
                <div className="flex flex-col space-y-2">
                  <span className="text-neutral-600">Objectives</span>
                  <div className="flex flex-wrap gap-2">
                    {healthAssessment.goals.map((g, i) => (
                      <span key={i} className="text-[8px] bg-neutral-800 px-2 py-1 rounded border border-neutral-700 text-white">{g}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest italic">Assessment pending.</p>
            )}
          </div>

          <div className="p-8 group hover:bg-neutral-800/30 transition-colors">
            <h3 className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] mb-6 flex items-center">
              <Zap className="w-3 h-3 mr-2 text-brand-red" /> Recent Telemetry
            </h3>
            {recentLogs.length > 0 ? (
              <div className="space-y-4 font-mono text-[10px] uppercase tracking-wider">
                {recentLogs.map(log => (
                  <div key={log.id} className="flex justify-between items-center border-b border-neutral-800/50 pb-2">
                    <span className="text-neutral-600">{new Date(log.date).toLocaleDateString()}</span>
                    <span className="text-emerald-500">{log.entries.length} Exercises</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest italic">No activity recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* Trainer Notes Section */}
      {userData?.role === 'TRAINER' && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] overflow-hidden mb-10 shadow-2xl">
          <div className="p-8 border-b border-neutral-800 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-brand-red" />
              <h3 className="text-2xl font-display italic uppercase tracking-wider">Trainer Notes</h3>
            </div>
            <button 
              onClick={() => { setShowNoteForm(true); setEditingNoteId(null); setNoteContent(''); }}
              className="bg-brand-red text-white px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all"
            >
              Add Note
            </button>
          </div>
          
          {showNoteForm && (
            <div className="p-8 border-b border-neutral-800 bg-neutral-800/50">
              <form onSubmit={handleSaveNote} className="space-y-4">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-white font-mono text-sm"
                  placeholder="Enter private note..."
                  rows={4}
                />
                <div className="flex space-x-2">
                  <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-emerald-700">Save Note</button>
                  <button type="button" onClick={() => setShowNoteForm(false)} className="bg-neutral-700 text-white px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-neutral-600">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="p-8">
            {trainerNotes.length === 0 ? (
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No trainer notes.</p>
            ) : (
              <div className="space-y-4">
                {trainerNotes.map(note => (
                  <div key={note.id} className="bg-neutral-800 p-6 rounded-xl flex justify-between items-start">
                    <div>
                      <p className="text-white font-mono text-sm whitespace-pre-wrap">{note.note}</p>
                      <p className="text-neutral-500 font-mono text-[10px] mt-2">Updated: {new Date(note.updatedAt).toLocaleString()}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => { setEditingNoteId(note.id); setNoteContent(note.note); setShowNoteForm(true); }} className="text-neutral-400 hover:text-white">Edit</button>
                      <button onClick={() => handleDeleteNote(note.id)} className="text-brand-red hover:text-red-400">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Photos */}
      {id && (
        <ProgressPhotos clientId={id} isTrainer={userData?.role === 'TRAINER'} />
      )}

      {/* Attendance Tracking */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] overflow-hidden mb-10 shadow-2xl">
        <div className="p-8 border-b border-neutral-800 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-brand-red" />
            <h3 className="text-2xl font-display italic uppercase tracking-wider">Attendance</h3>
          </div>
          {userData?.role === 'TRAINER' && (
            <div className="flex space-x-2">
              <button 
                onClick={() => handleMarkAttendance('present')}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all"
              >
                Present
              </button>
              <button 
                onClick={() => handleMarkAttendance('missed')}
                className="bg-brand-red text-white px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all"
              >
                Missed
              </button>
            </div>
          )}
        </div>
        <div className="p-8">
          {attendance.length === 0 ? (
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No attendance records.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {attendance.map(a => (
                <div key={a.id} className="bg-neutral-800 p-4 rounded-xl flex justify-between items-center">
                  <span className="font-mono text-[10px] text-neutral-400">{a.date}</span>
                  <span className={`font-mono text-[10px] uppercase ${a.status === 'present' ? 'text-emerald-500' : 'text-brand-red'}`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workout Plans Section */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] overflow-hidden mb-10 shadow-2xl">
        <div className="p-8 border-b border-neutral-800 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-brand-red" />
            <h3 className="text-2xl font-display italic uppercase tracking-wider">Training Protocols</h3>
          </div>
          {userData?.role === 'TRAINER' && !showPlanForm && (
            <button 
              onClick={() => {
                setPlanContent('');
                setEditingPlanId(null);
                setShowPlanForm(true);
              }}
              className="bg-brand-red text-white px-6 py-2.5 rounded-2xl font-mono text-[10px] uppercase tracking-widest flex items-center space-x-2 hover:bg-red-700 transition-all shadow-[0_0_15px_rgba(255,0,0,0.3)]"
            >
              <Plus className="w-4 h-4" />
              <span>New Protocol</span>
            </button>
          )}
        </div>

        {showPlanForm && userData?.role === 'TRAINER' && (
          <div className="p-8 border-b border-neutral-800 bg-neutral-800/30">
            <form onSubmit={handleSavePlan} className="space-y-6">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-4 ml-1">
                  {editingPlanId ? 'Modify Existing Protocol' : 'Initialize New Protocol'}
                </label>
                <textarea 
                  value={planContent}
                  onChange={(e) => setPlanContent(e.target.value)}
                  required
                  rows={8}
                  className="input-field font-mono text-xs leading-relaxed"
                  placeholder="Enter training sequence details..."
                ></textarea>
              </div>
              <div className="flex justify-end space-x-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowPlanForm(false);
                    setEditingPlanId(null);
                  }}
                  className="px-6 py-3 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-neutral-500 hover:bg-neutral-800 transition-all"
                >
                  Abort
                </button>
                <button 
                  type="submit"
                  className="bg-white text-black px-8 py-3 rounded-2xl font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all"
                >
                  Commit Changes
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="p-8">
          {workoutPlans.length === 0 && !showPlanForm ? (
            <div className="p-12 text-center border border-dashed border-neutral-800 rounded-3xl">
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No training protocols established for this recruit.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Current Plan */}
              {workoutPlans.length > 0 && (
                <div className="relative">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-1.5 h-1.5 bg-brand-red rounded-full shadow-[0_0_8px_rgba(255,0,0,0.5)]"></div>
                      <span className="text-[10px] font-mono font-bold text-brand-red uppercase tracking-[0.2em]">
                        Active Protocol
                      </span>
                      <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest">
                        Updated: {new Date(workoutPlans[0].updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {userData?.role === 'TRAINER' && (
                      <button 
                        onClick={() => handleEditPlan(workoutPlans[0])}
                        className="text-neutral-600 hover:text-white transition-all p-2 bg-neutral-800/50 rounded-xl"
                        title="Edit Protocol"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-neutral-300 bg-neutral-900/80 p-8 rounded-3xl border border-neutral-800 shadow-inner">
                    {workoutPlans[0].plan}
                  </div>
                </div>
              )}

              {/* Past Plans */}
              {workoutPlans.length > 1 && (
                <div className="pt-12 border-t border-neutral-800">
                  <h4 className="text-xl font-display italic uppercase tracking-wider mb-8 text-neutral-500">Archived Protocols</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {workoutPlans.slice(1).map(plan => (
                      <div key={plan.id} className="group">
                        <div className="flex justify-between items-center mb-3 px-2">
                          <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest">
                            Archive: {new Date(plan.updatedAt).toLocaleDateString()}
                          </span>
                          {userData?.role === 'TRAINER' && (
                            <button 
                              onClick={() => handleEditPlan(plan)}
                              className="text-neutral-700 hover:text-brand-red transition-all"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-neutral-500 bg-neutral-900/30 p-6 rounded-2xl border border-neutral-800 group-hover:border-neutral-700 transition-colors">
                          {plan.plan.slice(0, 150)}{plan.plan.length > 150 ? '...' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ClientProfile;
