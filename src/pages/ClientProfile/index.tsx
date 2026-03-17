import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { firebaseService } from '../../services/firebaseService';
import { auth } from '../../firebase';
import Layout from '../../components/Layout';
import { User, ClientDetails, HealthAssessment, WorkoutLog, WorkoutPlan } from '../../types';
import { ArrowLeft, User as UserIcon, Activity, Calendar, FileText, Plus, Edit2, Shield, Target, Zap, Camera, MessageSquare, CreditCard, Trash2, ChevronDown, ChevronUp, GripVertical, TrendingUp } from 'lucide-react';
import ProgressPhotos from '../../components/ProgressPhotos';
import CalendarView from '../../components/CalendarView';
import ExerciseAnimation from '../../components/ExerciseAnimation';
import { COMMON_EXERCISES } from '../../constants';
import { WorkoutPlanSection } from '../../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, subDays, isSameDay } from 'date-fns';

const ClientProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null); // Current logged in user
  const [client, setClient] = useState<User | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [healthAssessment, setHealthAssessment] = useState<HealthAssessment | null>(null);
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [dietPlans, setDietPlans] = useState<WorkoutPlan[]>([]);
  const [trainerNotes, setTrainerNotes] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Workout Plan Form State
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planSections, setPlanSections] = useState<WorkoutPlanSection[]>([{ title: '', content: '' }]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Diet Plan Form State
  const [showDietForm, setShowDietForm] = useState(false);
  const [editingDietId, setEditingDietId] = useState<string | null>(null);
  const [dietSections, setDietSections] = useState<WorkoutPlanSection[]>([{ title: '', content: '' }]);
  const [expandedDietSections, setExpandedDietSections] = useState<Record<string, boolean>>({});

  // Trainer Notes Form State
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [expandedArchivedPlans, setExpandedArchivedPlans] = useState<Record<string, boolean>>({});
  const [expandedArchivedDietPlans, setExpandedArchivedDietPlans] = useState<Record<string, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({
    vitalStats: true,
    goals: true,
    telemetry: true,
    attendance: false,
    package: true
  });

  // Payment Form State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({ package: '', startDate: '', dueDate: '', status: 'Pending' });
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'attendance' | 'payment', label: string } | null>(null);

  useEffect(() => {
    let unsubscribeLogs: () => void;
    let unsubscribePlans: () => void;
    let unsubscribeDietPlans: () => void;
    let unsubscribeNotes: () => void;
    let unsubscribeAttendance: () => void;
    let unsubscribePayments: () => void;

    const fetchAllData = async () => {
      if (!id) return;

      try {
        // Fetch current user
        const currentUserData = await firebaseService.getUser(auth.currentUser?.uid || '');
        setUserData(currentUserData);

        // Fetch client user doc
        const clientData = await firebaseService.getUser(id);
        setClient(clientData as User);
        if (clientData) {
          setClientDetails((clientData as any).clientDetails || null);
          setHealthAssessment((clientData as any).healthAssessment || null);
        }

        // Fetch workout logs
        unsubscribeLogs = firebaseService.subscribeToWorkoutLogs((logsData) => {
          setRecentLogs(logsData);
        }, id);

        // Fetch workout plans
        unsubscribePlans = firebaseService.subscribeToWorkoutPlans(id, (plansData) => {
          setWorkoutPlans(plansData);
        });

        // Fetch diet plans
        unsubscribeDietPlans = firebaseService.subscribeToDietPlans(id, (plansData) => {
          setDietPlans(plansData);
        });

        // Fetch trainer notes
        unsubscribeNotes = firebaseService.subscribeToTrainerNotes(id, (notesData) => {
          setTrainerNotes(notesData);
        });

        // Fetch attendance
        unsubscribeAttendance = firebaseService.subscribeToAttendance(id, (attendanceData) => {
          setAttendance(attendanceData);
        });

        // Fetch payments
        unsubscribePayments = firebaseService.subscribeToPaymentRecords(id, (records) => {
          setPaymentRecords(records);
        });
        
      } catch (error) {
        console.error("Error fetching client profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
    
    return () => {
      if (unsubscribeLogs) unsubscribeLogs();
      if (unsubscribePlans) unsubscribePlans();
      if (unsubscribeDietPlans) unsubscribeDietPlans();
      if (unsubscribeNotes) unsubscribeNotes();
      if (unsubscribeAttendance) unsubscribeAttendance();
      if (unsubscribePayments) unsubscribePayments();
    };
  }, [id]);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !noteContent.trim() || !userData) return;
    try {
      await firebaseService.saveTrainerNote({
        id: editingNoteId,
        trainerId: userData.id,
        clientId: id,
        note: noteContent,
        updatedAt: new Date().toISOString()
      });
      setNoteContent('');
      setEditingNoteId(null);
      setShowNoteForm(false);
    } catch (error) {
      console.error("Error saving trainer note:", error);
      alert("Failed to save trainer note.");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await firebaseService.deleteTrainerNote(noteId);
    } catch (error) {
      console.error("Error deleting trainer note:", error);
      alert("Failed to delete trainer note.");
    }
  };

  const handleMarkAttendance = async (status: 'Present' | 'Missed') => {
    if (!id) return;
    try {
      const date = new Date().toISOString().split('T')[0];
      await firebaseService.markAttendance({ clientId: id, date, status });
    } catch (error) {
      console.error("Error marking attendance:", error);
      alert("Failed to mark attendance.");
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    try {
      await firebaseService.deleteWorkoutPlan(planId);
    } catch (error) {
      console.error("Error deleting workout plan:", error);
      alert("Failed to delete workout plan.");
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || planSections.length === 0) return;

    try {
      const now = new Date().toISOString();
      const planData = {
        id: editingPlanId || undefined,
        clientId: id,
        sections: planSections.filter(s => s.title.trim() || s.content.trim()),
        updatedAt: now
      };
      
      await firebaseService.saveWorkoutPlan(planData);
      
      setShowPlanForm(false);
      setEditingPlanId(null);
      setPlanSections([{ title: '', content: '' }]);
    } catch (error) {
      console.error("Error saving workout plan:", error);
      alert("Failed to save workout plan.");
    }
  };

  const handleDeleteDietPlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this diet plan?")) return;
    try {
      await firebaseService.deleteDietPlan(planId);
    } catch (error) {
      console.error("Error deleting diet plan:", error);
      alert("Failed to delete diet plan.");
    }
  };

  const handleSaveDietPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || dietSections.length === 0) return;

    try {
      const now = new Date().toISOString();
      const planData = {
        id: editingDietId || undefined,
        clientId: id,
        sections: dietSections.filter(s => s.title.trim() || s.content.trim()),
        updatedAt: now
      };
      
      await firebaseService.saveDietPlan(planData);
      
      setShowDietForm(false);
      setEditingDietId(null);
      setDietSections([{ title: '', content: '' }]);
    } catch (error) {
      console.error("Error saving diet plan:", error);
      alert("Failed to save diet plan.");
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      if (editingPaymentId) {
        await firebaseService.updatePaymentRecord(editingPaymentId, paymentData);
      } else {
        await firebaseService.addPaymentRecord({
          clientId: id,
          ...paymentData
        });
      }
      
      setShowPaymentForm(false);
      setEditingPaymentId(null);
      setPaymentData({ package: '', startDate: '', dueDate: '', status: 'Pending' });
    } catch (error) {
      console.error("Error saving payment record:", error);
      alert("Failed to save payment record.");
    }
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
      alert(`Failed to delete ${itemToDelete.type}.`);
    }
  };

  const handleEditPlan = (plan: WorkoutPlan) => {
    setPlanSections(plan.sections || [{ title: '', content: '' }]);
    setEditingPlanId(plan.id);
    setShowPlanForm(true);
  };

  const handleEditDietPlan = (plan: WorkoutPlan) => {
    setDietSections(plan.sections || [{ title: '', content: '' }]);
    setEditingDietId(plan.id);
    setShowDietForm(true);
  };

  const toggleSection = (planId: string, sectionIndex: number) => {
    const key = `${planId}-${sectionIndex}`;
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const addFormSection = () => {
    setPlanSections([...planSections, { title: '', content: '' }]);
  };

  const removeFormSection = (index: number) => {
    setPlanSections(planSections.filter((_, i) => i !== index));
  };

  const updateFormSection = (index: number, field: keyof WorkoutPlanSection, value: string) => {
    const newSections = [...planSections];
    newSections[index][field] = value;
    setPlanSections(newSections);
  };

  const addDietFormSection = () => {
    setDietSections([...dietSections, { title: '', content: '' }]);
  };

  const removeDietFormSection = (index: number) => {
    setDietSections(dietSections.filter((_, i) => i !== index));
  };

  const updateDietFormSection = (index: number, field: keyof WorkoutPlanSection, value: string) => {
    const newSections = [...dietSections];
    newSections[index][field] = value;
    setDietSections(newSections);
  };

  const toggleNote = (noteId: string) => {
    setExpandedNotes(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const toggleArchivedPlan = (planId: string) => {
    setExpandedArchivedPlans(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }));
  };

  const toggleArchivedDietPlan = (planId: string) => {
    setExpandedArchivedDietPlans(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }));
  };

  const toggleDetail = (key: string) => {
    setExpandedDetails(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const performanceData = useMemo(() => {
    const data = [];
    for (let i = 14; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayLogs = recentLogs.filter(log => isSameDay(new Date(log.date), date));
      
      let avgWeight = 0;
      let totalVolume = 0;
      if (dayLogs.length > 0) {
        let entryCount = 0;
        dayLogs.forEach(log => {
          log.entries.forEach(entry => {
            const w = parseFloat(entry.weight) || 0;
            const r = parseFloat(entry.reps) || 0;
            const s = parseFloat(entry.sets) || 0;
            totalVolume += w * r * s;
            avgWeight += w;
            entryCount++;
          });
        });
        if (entryCount > 0) avgWeight = avgWeight / entryCount;
      }

      data.push({
        name: format(date, 'MMM dd'),
        weight: Math.round(avgWeight),
        volume: Math.round(totalVolume),
        logs: dayLogs.length
      });
    }
    return data;
  }, [recentLogs]);

  if (loading) {
    return (
      <Layout userData={userData}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Accessing Client Profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!client) return <Layout userData={userData}><div className="p-10 font-mono text-red-500 uppercase tracking-widest">Error: Client not found in database.</div></Layout>;

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
              setPlanSections([{ title: '', content: '' }]);
              setEditingPlanId(null);
              setShowPlanForm(true);
            }}
            className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl hover:border-brand-red/50 transition-all text-left group"
          >
            <FileText className="w-6 h-6 text-brand-red mb-4 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-bold text-white uppercase tracking-wider">Workout Plan</p>
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
            onClick={() => handleMarkAttendance('Present')}
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

        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-neutral-800">
          <div className="p-8 group hover:bg-neutral-800/30 transition-colors">
            <button 
              onClick={() => toggleDetail('vitalStats')}
              className="w-full flex items-center justify-between mb-6 group/btn"
            >
              <h3 className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] flex items-center">
                <UserIcon className="w-3 h-3 mr-2 text-brand-red" /> Vital Statistics
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-[8px] font-mono text-neutral-700 uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-opacity">
                  {expandedDetails.vitalStats ? 'Hide' : 'Show'}
                </span>
                {expandedDetails.vitalStats ? <ChevronUp className="w-3 h-3 text-neutral-600" /> : <ChevronDown className="w-3 h-3 text-neutral-600" />}
              </div>
            </button>
            {expandedDetails.vitalStats && (
              clientDetails ? (
                <div className="space-y-4 font-mono text-[10px] uppercase tracking-wider animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between border-b border-neutral-800/50 pb-2"><span className="text-neutral-600">Age</span> <span className="text-white">{clientDetails.age}</span></div>
                  <div className="flex justify-between border-b border-neutral-800/50 pb-2"><span className="text-neutral-600">Gender</span> <span className="text-white">{clientDetails.gender}</span></div>
                  <div className="flex justify-between border-b border-neutral-800/50 pb-2"><span className="text-neutral-600">Comm Link</span> <span className="text-white">{clientDetails.phoneNumber}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-600">Emergency</span> <span className="text-white truncate max-w-[120px]">{clientDetails.emergencyContact}</span></div>
                </div>
              ) : (
                <p className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest italic animate-in fade-in duration-300">Data not synchronized.</p>
              )
            )}
          </div>

          <div className="p-8 group hover:bg-neutral-800/30 transition-colors">
            <button 
              onClick={() => toggleDetail('goals')}
              className="w-full flex items-center justify-between mb-6 group/btn"
            >
              <h3 className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] flex items-center">
                <Target className="w-3 h-3 mr-2 text-brand-red" /> Performance Goals
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-[8px] font-mono text-neutral-700 uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-opacity">
                  {expandedDetails.goals ? 'Hide' : 'Show'}
                </span>
                {expandedDetails.goals ? <ChevronUp className="w-3 h-3 text-neutral-600" /> : <ChevronDown className="w-3 h-3 text-neutral-600" />}
              </div>
            </button>
            {expandedDetails.goals && (
              healthAssessment ? (
                <div className="space-y-4 font-mono text-[10px] uppercase tracking-wider animate-in fade-in slide-in-from-top-2 duration-300">
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
                  {healthAssessment.healthConcerns && (
                    <div className="flex flex-col space-y-2 pt-2 border-t border-neutral-800/50">
                      <span className="text-neutral-600">Additional Concerns</span>
                      <p className="text-white text-[10px] leading-relaxed bg-neutral-900 p-3 rounded-xl border border-neutral-800 whitespace-pre-wrap normal-case tracking-normal">
                        {healthAssessment.healthConcerns}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest italic animate-in fade-in duration-300">Assessment pending.</p>
              )
            )}
          </div>

          <div className="p-8 group hover:bg-neutral-800/30 transition-colors">
            <button 
              onClick={() => toggleDetail('telemetry')}
              className="w-full flex items-center justify-between mb-6 group/btn"
            >
              <h3 className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] flex items-center">
                <Zap className="w-3 h-3 mr-2 text-brand-red" /> Recent Workouts
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-[8px] font-mono text-neutral-700 uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-opacity">
                  {expandedDetails.telemetry ? 'Hide' : 'Show'}
                </span>
                {expandedDetails.telemetry ? <ChevronUp className="w-3 h-3 text-neutral-600" /> : <ChevronDown className="w-3 h-3 text-neutral-600" />}
              </div>
            </button>
            {expandedDetails.telemetry && (
              recentLogs.length > 0 ? (
                <div className="space-y-4 font-mono text-[10px] uppercase tracking-wider animate-in fade-in slide-in-from-top-2 duration-300">
                  {recentLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex justify-between items-center border-b border-neutral-800/50 pb-2">
                      <span className="text-neutral-600">{new Date(log.date).toLocaleDateString()}</span>
                      <span className="text-emerald-500">{log.entries.length} Exercises</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest italic animate-in fade-in duration-300">No activity recorded.</p>
              )
            )}
          </div>

          <div className="p-8 group hover:bg-neutral-800/30 transition-colors">
            <button 
              onClick={() => toggleDetail('package')}
              className="w-full flex items-center justify-between mb-6 group/btn"
            >
              <h3 className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] flex items-center">
                <CreditCard className="w-3 h-3 mr-2 text-brand-red" /> Active Package
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-[8px] font-mono text-neutral-700 uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-opacity">
                  {expandedDetails.package ? 'Hide' : 'Show'}
                </span>
                {expandedDetails.package ? <ChevronUp className="w-3 h-3 text-neutral-600" /> : <ChevronDown className="w-3 h-3 text-neutral-600" />}
              </div>
            </button>
            {expandedDetails.package && (
              paymentRecords.length > 0 ? (
                (() => {
                  const activePackage = [...paymentRecords].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())[0];
                  return (
                    <div className="space-y-4 font-mono text-[10px] uppercase tracking-wider animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex justify-between border-b border-neutral-800/50 pb-2"><span className="text-neutral-600">Plan</span> <span className="text-white truncate max-w-[100px]">{activePackage.package}</span></div>
                      <div className="flex justify-between border-b border-neutral-800/50 pb-2"><span className="text-neutral-600">Start</span> <span className="text-white">{new Date(activePackage.startDate).toLocaleDateString()}</span></div>
                      <div className="flex justify-between border-b border-neutral-800/50 pb-2"><span className="text-neutral-600">Due</span> <span className="text-brand-red">{new Date(activePackage.dueDate).toLocaleDateString()}</span></div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-600">Status</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest border ${
                          activePackage.status === 'Paid' 
                            ? 'bg-emerald-900/30 text-emerald-500 border-emerald-800/50' 
                            : activePackage.status === 'Overdue'
                            ? 'bg-brand-red/20 text-brand-red border-brand-red/30'
                            : 'bg-yellow-900/30 text-yellow-500 border-yellow-800/50'
                        }`}>
                          {activePackage.status}
                        </span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest italic animate-in fade-in duration-300">No active package.</p>
              )
            )}
          </div>
        </div>
      </div>

      {/* Performance Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 p-8 rounded-[2.5rem] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-4 h-4 text-brand-red" />
              <h3 className="text-xl font-display italic uppercase tracking-wider">Strength Progress</h3>
            </div>
            <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Avg Weight (kg)</p>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorWeightProfile" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#colorWeightProfile)" 
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
              <h3 className="text-xl font-display italic uppercase tracking-wider">Workload Volume</h3>
            </div>
            <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Total kg Lifted</p>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
                  itemStyle={{ color: '#10b981' }}
                  cursor={{ stroke: '#10b981', strokeWidth: 1 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorVolume)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
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
                {trainerNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(note => {
                  const isExpanded = expandedNotes[note.id] ?? false;
                  return (
                    <div key={note.id} className="bg-neutral-800 rounded-2xl border border-neutral-700 overflow-hidden transition-all">
                      <div className="px-6 py-4 flex items-center justify-between bg-neutral-800/50">
                        <button 
                          onClick={() => toggleNote(note.id)}
                          className="flex-1 flex items-center space-x-4 text-left"
                        >
                          <div className="flex flex-col">
                            <span className="text-[8px] font-mono text-brand-red uppercase tracking-[0.2em] mb-1">
                              {new Date(note.updatedAt).toLocaleDateString()} @ {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider truncate max-w-md">
                              {note.note.split('\n')[0]}
                            </h4>
                          </div>
                        </button>
                        <div className="flex items-center space-x-3">
                          <button onClick={() => { setEditingNoteId(note.id); setNoteContent(note.note); setShowNoteForm(true); }} className="p-2 text-neutral-500 hover:text-white transition-colors">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDeleteNote(note.id)} className="p-2 text-neutral-500 hover:text-brand-red transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => toggleNote(note.id)} className="p-2 text-neutral-500">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-4 border-t border-neutral-700/50">
                          <p className="text-neutral-300 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                            {note.note}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Photos */}
      {id && (
        <ProgressPhotos clientId={id} isTrainer={userData?.role === 'TRAINER'} />
      )}

      {/* Calendar View */}
      <div className="mb-10">
        <CalendarView logs={recentLogs} notes={trainerNotes} attendance={attendance} />
      </div>

      {/* Attendance Tracking */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] overflow-hidden mb-10 shadow-2xl">
        <div className="p-8 border-b border-neutral-800 flex justify-between items-center">
          <button 
            onClick={() => toggleDetail('attendance')}
            className="flex items-center space-x-3 group/title"
          >
            <Calendar className="w-5 h-5 text-brand-red" />
            <h3 className="text-2xl font-display italic uppercase tracking-wider">Attendance</h3>
            {expandedDetails.attendance ? <ChevronUp className="w-4 h-4 text-neutral-600 ml-2" /> : <ChevronDown className="w-4 h-4 text-neutral-600 ml-2" />}
          </button>
          {userData?.role === 'TRAINER' && (
            <div className="flex space-x-2">
              <button 
                onClick={() => handleMarkAttendance('Present')}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all"
              >
                Present
              </button>
              <button 
                onClick={() => handleMarkAttendance('Missed')}
                className="bg-brand-red text-white px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all"
              >
                Missed
              </button>
            </div>
          )}
        </div>
        {expandedDetails.attendance && (
          <div className="p-8 animate-in fade-in slide-in-from-top-2 duration-300">
            {attendance.length === 0 ? (
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No attendance records.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {attendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(a => (
                  <div key={a.id} className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50 flex justify-between items-center hover:border-neutral-600 transition-colors">
                    <span className="font-mono text-[10px] text-neutral-400">{new Date(a.date).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-3">
                      <span className={`font-mono text-[10px] uppercase tracking-widest ${a.status === 'Present' ? 'text-emerald-500' : 'text-brand-red'}`}>{a.status}</span>
                      {userData?.role === 'TRAINER' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => firebaseService.updateAttendance(a.id, {
                              status: a.status === 'Present' ? 'Absent' : 'Present'
                            })}
                            className="text-[8px] font-mono uppercase tracking-widest text-neutral-500 hover:text-brand-red"
                          >
                            [Correct]
                          </button>
                          <button
                            onClick={() => setItemToDelete({ id: a.id, type: 'attendance', label: `attendance record for ${new Date(a.date).toLocaleDateString()}` })}
                            className="text-[8px] font-mono uppercase tracking-widest text-neutral-500 hover:text-brand-red"
                          >
                            [Delete]
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workout Plans Section */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] overflow-hidden mb-10 shadow-2xl">
        <div className="p-8 border-b border-neutral-800 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-brand-red" />
            <h3 className="text-2xl font-display italic uppercase tracking-wider">Workout Plans</h3>
          </div>
          {userData?.role === 'TRAINER' && !showPlanForm && (
            <button 
              onClick={() => {
                setPlanSections([{ title: '', content: '' }]);
                setEditingPlanId(null);
                setShowPlanForm(true);
              }}
              className="bg-brand-red text-white px-6 py-2.5 rounded-2xl font-mono text-[10px] uppercase tracking-widest flex items-center space-x-2 hover:bg-red-700 transition-all shadow-[0_0_15px_rgba(255,0,0,0.3)]"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Plan</span>
            </button>
          )}
        </div>

        {showPlanForm && userData?.role === 'TRAINER' && (
          <div className="p-8 border-b border-neutral-800 bg-neutral-800/30">
            <form onSubmit={handleSavePlan} className="space-y-8">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">
                    {editingPlanId ? 'Modify Existing Plan' : 'Initialize New Plan'}
                  </label>
                  <button 
                    type="button"
                    onClick={addFormSection}
                    className="text-brand-red font-mono text-[10px] uppercase tracking-widest flex items-center space-x-2 hover:text-white transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Section</span>
                  </button>
                </div>

                {planSections.map((section, index) => (
                  <div key={index} className="bg-neutral-900/50 p-6 rounded-3xl border border-neutral-800 space-y-4 relative group">
                    <button 
                      type="button"
                      onClick={() => removeFormSection(index)}
                      className="absolute top-4 right-4 text-neutral-600 hover:text-brand-red transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="space-y-2">
                      <label className="block text-[8px] font-mono uppercase tracking-widest text-neutral-600 ml-1">Section Title (e.g. Day 1: Chest)</label>
                      <input 
                        type="text"
                        value={section.title}
                        onChange={(e) => updateFormSection(index, 'title', e.target.value)}
                        className="input-field font-mono text-xs"
                        placeholder="Enter section title..."
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[8px] font-mono uppercase tracking-widest text-neutral-600 ml-1">Exercises & Instructions</label>
                      <textarea 
                        value={section.content}
                        onChange={(e) => updateFormSection(index, 'content', e.target.value)}
                        required
                        rows={5}
                        className="input-field font-mono text-xs leading-relaxed"
                        placeholder="List exercises, sets, reps, and rest periods..."
                      ></textarea>
                    </div>
                  </div>
                ))}
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
                        Active Plan
                      </span>
                      <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest">
                        Updated: {new Date(workoutPlans[0].updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {userData?.role === 'TRAINER' && (
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditPlan(workoutPlans[0])}
                          className="text-neutral-600 hover:text-white transition-all p-2 bg-neutral-800/50 rounded-xl"
                          title="Edit Plan"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeletePlan(workoutPlans[0].id)}
                          className="text-neutral-600 hover:text-brand-red transition-all p-2 bg-neutral-800/50 rounded-xl"
                          title="Delete Plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    {workoutPlans[0].sections?.map((section, idx) => {
                      const isExpanded = expandedSections[`${workoutPlans[0].id}-${idx}`] ?? (idx === 0);
                      return (
                        <div key={idx} className="bg-neutral-900/40 rounded-[2rem] border border-neutral-800/50 overflow-hidden hover:border-brand-red/30 transition-all group">
                          <button 
                            onClick={() => toggleSection(workoutPlans[0].id, idx)}
                            className="w-full px-8 py-6 flex items-center justify-between hover:bg-neutral-800/20 transition-colors"
                          >
                            <div className="flex items-center space-x-6">
                              <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-mono text-brand-red border border-neutral-700 group-hover:border-brand-red/50 transition-colors">
                                {String(idx + 1).padStart(2, '0')}
                              </div>
                              <h5 className="text-sm font-bold text-white uppercase tracking-[0.2em]">{section.title}</h5>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                {isExpanded ? 'Collapse' : 'Expand'}
                              </span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-brand-red" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="px-8 pb-8 pt-2">
                              <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-neutral-400 border-t border-neutral-800/50 pt-6 pl-14">
                                {section.content}
                              </div>
                              {(() => {
                                const mentionedExercises = COMMON_EXERCISES.filter(ex => 
                                  section.content.toLowerCase().includes(ex.toLowerCase())
                                );
                                if (mentionedExercises.length === 0) return null;
                                return (
                                  <div className="mt-6 pt-6 border-t border-neutral-800/50 pl-14">
                                    <p className="text-[8px] font-mono text-brand-red uppercase tracking-widest mb-4">Exercise Animations</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                      {mentionedExercises.map(ex => (
                                        <ExerciseAnimation key={ex} exerciseName={ex} className="w-12 h-12 mx-auto" />
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
              )}

              {/* Past Plans */}
              {workoutPlans.length > 1 && (
                <div className="pt-16 border-t border-neutral-800/50">
                  <div className="flex items-center space-x-4 mb-10">
                    <h4 className="text-xl font-display italic uppercase tracking-wider text-neutral-500">Archived Plans</h4>
                    <div className="h-px flex-1 bg-neutral-800/50"></div>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {workoutPlans.slice(1).map(plan => {
                      const isPlanExpanded = expandedArchivedPlans[plan.id] ?? false;
                      return (
                        <div key={plan.id} className="bg-neutral-900/20 rounded-3xl border border-neutral-800/50 overflow-hidden hover:border-neutral-700 transition-all">
                          <div className="px-8 py-5 flex justify-between items-center bg-neutral-900/40">
                            <button 
                              onClick={() => toggleArchivedPlan(plan.id)}
                              className="flex-1 flex items-center space-x-4 text-left"
                            >
                              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                                Deployed: {new Date(plan.updatedAt).toLocaleDateString()}
                              </span>
                              <div className="h-1 w-1 bg-neutral-700 rounded-full"></div>
                              <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest">
                                {plan.sections?.length || 0} Sections
                              </span>
                            </button>
                            <div className="flex items-center space-x-4">
                              {userData?.role === 'TRAINER' && (
                                <div className="flex space-x-2 mr-4 border-r border-neutral-800 pr-4">
                                  <button 
                                    onClick={() => handleEditPlan(plan)}
                                    className="text-neutral-600 hover:text-white transition-all p-1.5"
                                    title="Edit Plan"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeletePlan(plan.id)}
                                    className="text-neutral-600 hover:text-brand-red transition-all p-1.5"
                                    title="Delete Plan"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                              <button 
                                onClick={() => toggleArchivedPlan(plan.id)}
                                className="text-neutral-500 hover:text-white transition-colors"
                              >
                                {isPlanExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          
                          {isPlanExpanded && (
                            <div className="p-8 space-y-8 bg-neutral-950/30">
                              {plan.sections?.map((s, i) => (
                                <div key={i} className="space-y-4">
                                  <h6 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center">
                                    <span className="w-4 h-px bg-brand-red/50 mr-3"></span>
                                    {s.title}
                                  </h6>
                                  <div className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-neutral-500 pl-7">
                                    {s.content}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Diet Plans Section */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] overflow-hidden mb-10 shadow-2xl">
        <div className="p-8 border-b border-neutral-800 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-emerald-500" />
            <h3 className="text-2xl font-display italic uppercase tracking-wider">Diet Plans</h3>
          </div>
          {userData?.role === 'TRAINER' && !showDietForm && (
            <button 
              onClick={() => {
                setDietSections([{ title: '', content: '' }]);
                setEditingDietId(null);
                setShowDietForm(true);
              }}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-mono text-[10px] uppercase tracking-widest flex items-center space-x-2 hover:bg-emerald-700 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Diet Plan</span>
            </button>
          )}
        </div>

        {showDietForm && userData?.role === 'TRAINER' && (
          <div className="p-8 border-b border-neutral-800 bg-neutral-800/30">
            <form onSubmit={handleSaveDietPlan} className="space-y-8">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">
                    {editingDietId ? 'Modify Existing Diet Plan' : 'Initialize New Diet Plan'}
                  </label>
                  <button 
                    type="button"
                    onClick={addDietFormSection}
                    className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest flex items-center space-x-2 hover:text-white transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Section</span>
                  </button>
                </div>

                {dietSections.map((section, index) => (
                  <div key={index} className="bg-neutral-900/50 p-6 rounded-3xl border border-neutral-800 space-y-4 relative group">
                    <button 
                      type="button"
                      onClick={() => removeDietFormSection(index)}
                      className="absolute top-4 right-4 text-neutral-600 hover:text-brand-red transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="space-y-2">
                      <label className="block text-[8px] font-mono uppercase tracking-widest text-neutral-600 ml-1">Section Title (e.g. Breakfast)</label>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateDietFormSection(index, 'title', e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-white font-mono text-sm focus:border-emerald-500/50 focus:outline-none transition-colors"
                        placeholder="Enter section title..."
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[8px] font-mono uppercase tracking-widest text-neutral-600 ml-1">Meal Details</label>
                      <textarea
                        value={section.content}
                        onChange={(e) => updateDietFormSection(index, 'content', e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-white font-mono text-sm focus:border-emerald-500/50 focus:outline-none transition-colors"
                        placeholder="Enter meal details, macros, etc..."
                        rows={4}
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex space-x-4 pt-4 border-t border-neutral-800/50">
                <button 
                  type="button" 
                  onClick={() => setShowDietForm(false)} 
                  className="px-8 py-3 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-neutral-500 hover:bg-neutral-800 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-white text-black px-8 py-3 rounded-2xl font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all"
                >
                  Deploy Diet Plan
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="p-8">
          {dietPlans.length === 0 && !showDietForm ? (
            <div className="p-12 text-center border border-dashed border-neutral-800 rounded-3xl">
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No diet plans assigned.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Active Diet Plan */}
              {dietPlans.length > 0 && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <h4 className="text-3xl font-display italic uppercase tracking-wider text-white">Active Diet Plan</h4>
                    </div>
                    {userData?.role === 'TRAINER' && (
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditDietPlan(dietPlans[0])}
                          className="bg-neutral-800 text-white px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-neutral-700 transition-all flex items-center space-x-2"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteDietPlan(dietPlans[0].id)}
                          className="bg-brand-red/10 text-brand-red border border-brand-red/20 px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all flex items-center space-x-2"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {dietPlans[0].sections?.map((section: any, index: number) => (
                      <div key={index} className="bg-neutral-900/80 p-8 rounded-3xl border border-neutral-800/50 hover:border-emerald-500/30 transition-colors group">
                        <h5 className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-6 flex items-center">
                          <span className="w-6 h-px bg-emerald-500/50 mr-4"></span>
                          {section.title}
                        </h5>
                        <div className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-neutral-400 group-hover:text-neutral-300 transition-colors">
                          {section.content}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <p className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest">
                      Last Updated: {new Date(dietPlans[0].updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Archived Diet Plans */}
              {dietPlans.length > 1 && (
                <div className="pt-16 border-t border-neutral-800/50">
                  <div className="flex items-center space-x-4 mb-10">
                    <h4 className="text-xl font-display italic uppercase tracking-wider text-neutral-500">Archived Diet Plans</h4>
                    <div className="h-px flex-1 bg-neutral-800/50"></div>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {dietPlans.slice(1).map(plan => {
                      const isPlanExpanded = expandedArchivedDietPlans[plan.id] ?? false;
                      return (
                        <div key={plan.id} className="bg-neutral-900/20 rounded-3xl border border-neutral-800/50 overflow-hidden hover:border-neutral-700 transition-all">
                          <div className="px-8 py-5 flex justify-between items-center bg-neutral-900/40">
                            <button 
                              onClick={() => toggleArchivedDietPlan(plan.id)}
                              className="flex-1 flex items-center space-x-4 text-left"
                            >
                              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                                Deployed: {new Date(plan.updatedAt).toLocaleDateString()}
                              </span>
                              <div className="h-1 w-1 bg-neutral-700 rounded-full"></div>
                              <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest">
                                {plan.sections?.length || 0} Sections
                              </span>
                            </button>
                            <div className="flex items-center space-x-4">
                              {userData?.role === 'TRAINER' && (
                                <div className="flex space-x-2 mr-4 border-r border-neutral-800 pr-4">
                                  <button 
                                    onClick={() => handleEditDietPlan(plan)}
                                    className="text-neutral-600 hover:text-white transition-all p-1.5"
                                    title="Edit Plan"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteDietPlan(plan.id)}
                                    className="text-neutral-600 hover:text-brand-red transition-all p-1.5"
                                    title="Delete Plan"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                              <button 
                                onClick={() => toggleArchivedDietPlan(plan.id)}
                                className="text-neutral-500 hover:text-white transition-colors"
                              >
                                {isPlanExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          
                          {isPlanExpanded && (
                            <div className="p-8 space-y-8 bg-neutral-950/30">
                              {plan.sections?.map((s: any, i: number) => (
                                <div key={i} className="space-y-4">
                                  <h6 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center">
                                    <span className="w-4 h-px bg-emerald-500/50 mr-3"></span>
                                    {s.title}
                                  </h6>
                                  <div className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-neutral-500 pl-7">
                                    {s.content}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Records Section */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] overflow-hidden mb-10 shadow-2xl">
        <div className="p-8 border-b border-neutral-800 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-5 h-5 text-brand-red" />
            <h3 className="text-2xl font-display italic uppercase tracking-wider">Payment Records</h3>
          </div>
          {userData?.role === 'TRAINER' && !showPaymentForm && (
            <button 
              onClick={() => setShowPaymentForm(true)}
              className="bg-brand-red text-white px-6 py-2.5 rounded-2xl font-mono text-[10px] uppercase tracking-widest flex items-center space-x-2 hover:bg-red-700 transition-all shadow-[0_0_15px_rgba(255,0,0,0.3)]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Record</span>
            </button>
          )}
        </div>

        {showPaymentForm && userData?.role === 'TRAINER' && (
          <div className="p-8 border-b border-neutral-800 bg-neutral-800/30">
            <form onSubmit={handleSavePayment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 ml-1">Package Name</label>
                  <input
                    type="text"
                    required
                    value={paymentData.package}
                    onChange={(e) => setPaymentData({ ...paymentData, package: e.target.value })}
                    className="input-field font-mono text-xs"
                    placeholder="e.g. 12 Weeks Transformation"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 ml-1">Status</label>
                  <select
                    value={paymentData.status}
                    onChange={(e) => setPaymentData({ ...paymentData, status: e.target.value as any })}
                    className="input-field font-mono text-xs"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 ml-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={paymentData.startDate}
                    onChange={(e) => setPaymentData({ ...paymentData, startDate: e.target.value })}
                    className="input-field font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 ml-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={paymentData.dueDate}
                    onChange={(e) => setPaymentData({ ...paymentData, dueDate: e.target.value })}
                    className="input-field font-mono text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setEditingPaymentId(null);
                    setPaymentData({ package: '', startDate: '', dueDate: '', status: 'Pending' });
                  }}
                  className="px-6 py-3 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-neutral-500 hover:bg-neutral-800 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-white text-black px-8 py-3 rounded-2xl font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="p-8">
          {paymentRecords.length === 0 && !showPaymentForm ? (
            <div className="p-12 text-center border border-dashed border-neutral-800 rounded-3xl">
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No payment records found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentRecords.map(record => (
                <div key={record.id} className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-white font-bold text-lg">{record.package}</h4>
                    <div className="flex space-x-4 mt-2">
                      <p className="text-[10px] font-mono text-neutral-500 uppercase">Start: {new Date(record.startDate).toLocaleDateString()}</p>
                      <p className="text-[10px] font-mono text-neutral-500 uppercase">Due: {new Date(record.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className={`px-4 py-2 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest ${
                      record.status === 'Paid' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800/50' : 
                      record.status === 'Overdue' ? 'bg-brand-red/20 text-brand-red border border-brand-red/30' : 
                      'bg-yellow-900/50 text-yellow-500 border border-yellow-800/50'
                    }`}>
                      {record.status}
                    </div>
                    {userData?.role === 'TRAINER' && (
                      <div className="flex space-x-2">
                        {record.status !== 'Paid' && (
                          <button 
                            onClick={() => firebaseService.updatePaymentRecord(record.id, { status: 'Paid' })}
                            className="bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600 hover:text-white text-[10px] px-4 py-2 rounded-xl transition-colors font-mono uppercase tracking-widest"
                          >
                            Mark Paid
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setPaymentData({
                              package: record.package,
                              startDate: record.startDate,
                              dueDate: record.dueDate,
                              status: record.status
                            });
                            setEditingPaymentId(record.id);
                            setShowPaymentForm(true);
                          }}
                          className="bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 text-[10px] px-4 py-2 rounded-xl transition-colors font-mono uppercase tracking-widest"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => setItemToDelete({ id: record.id, type: 'payment', label: `payment record for ${record.package}` })}
                          className="bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white text-[10px] px-4 py-2 rounded-xl transition-colors font-mono uppercase tracking-widest"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
    </Layout>
  );
};

export default ClientProfile;
