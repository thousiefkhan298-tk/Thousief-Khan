import React, { useState, useEffect, useMemo } from 'react';
import AvatarDisplay from '../../components/AvatarDisplay.js';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { firebaseService } from '../../services/firebaseService.js';
import { auth } from '../../firebase.js';
import Layout from '../../components/Layout.js';
import { User, ClientDetails, HealthAssessment, WorkoutLog, WorkoutPlan, WorkoutTemplate } from '../../types.js';
import { ArrowLeft, User as UserIcon, Activity, Calendar, FileText, Plus, Edit2, Shield, Target, Zap, Camera, MessageSquare, CreditCard, Trash2, ChevronDown, ChevronUp, GripVertical, TrendingUp, Bell, Play, Download, Check, AlertTriangle } from 'lucide-react';
import ProgressPhotos from '../../components/ProgressPhotos.js';
import AssessmentsSection from '../../components/AssessmentsSection.js';
import CalendarView from '../../components/CalendarView.js';
import ExerciseAnimation from '../../components/ExerciseAnimation.js';
import VisualWorkoutModal from '../../components/VisualWorkoutModal.js';
import { COMMON_EXERCISES } from '../../constants';
import { WorkoutPlanSection } from '../../types.js';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, subDays, isSameDay, addDays, differenceInDays } from 'date-fns';
import { motion } from 'motion/react';
import { exportClientToPDF, exportPaymentReceiptToPDF } from '../../utils/pdfExporter.js';

const ClientProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null); // Current logged in user
  const [client, setClient] = useState<User | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [healthAssessment, setHealthAssessment] = useState<HealthAssessment | null>(null);
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [dietPlans, setDietPlans] = useState<WorkoutPlan[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
  const [healthAssessmentDoc, setHealthAssessmentDoc] = useState<any>(null);
  const [fitnessAssessmentDoc, setFitnessAssessmentDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'overview' | 'logs' | 'plans' | 'assessments' | 'payments') || 'overview';
  
  // Workout Plan Form State
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'plans' | 'assessments' | 'payments'>(initialTab);
  const [pendingDrafts, setPendingDrafts] = useState<any[]>([]);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planSections, setPlanSections] = useState<WorkoutPlanSection[]>([{ title: '', content: '' }]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Diet Plan Form State
  const [showDietForm, setShowDietForm] = useState(false);
  const [editingDietId, setEditingDietId] = useState<string | null>(null);
  const [dietSections, setDietSections] = useState<WorkoutPlanSection[]>([{ title: '', content: '' }]);
  const [expandedDietSections, setExpandedDietSections] = useState<Record<string, boolean>>({});

  const [expandedArchivedPlans, setExpandedArchivedPlans] = useState<Record<string, boolean>>({});
  const [expandedArchivedDietPlans, setExpandedArchivedDietPlans] = useState<Record<string, boolean>>({});
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({
    vitalStats: true,
    goals: true,
    telemetry: true,
    attendance: false,
    package: true
  });

  // Payment Form State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    package: '',
    packageType: 'Monthly',
    startDate: '',
    dueDate: '',
    status: 'Pending' as 'Paid' | 'Pending' | 'Overdue',
    amount: '',
  });
  const [overriddenPackagePrice, setOverriddenPackagePrice] = useState<string>('');
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'attendance' | 'payment', label: string } | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSavingDiet, setIsSavingDiet] = useState(false);

  // Transaction Log Form State
  const [activeTransactionFormId, setActiveTransactionFormId] = useState<string | null>(null);
  const [transactionDate, setTransactionDate] = useState<string>('');
  const [transactionAmount, setTransactionAmount] = useState<string>('');
  const [transactionMethod, setTransactionMethod] = useState<string>('UPI');
  const [transactionNotes, setTransactionNotes] = useState<string>('');
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);

  useEffect(() => {
    if (paymentRecords.length > 0 && paymentRecords[0]?.amount) {
      setOverriddenPackagePrice(paymentRecords[0].amount.toString());
    }
    if (paymentRecords.length > 0 && paymentRecords[0]?.numberOfSessions) {
      setTotalPackageSessions(Number(paymentRecords[0].numberOfSessions));
    }
  }, [paymentRecords]);

  const [totalPackageSessions, setTotalPackageSessions] = useState<number>(30);
  const [attendanceDuration, setAttendanceDuration] = useState<string>('60');

  // Visual Workout State
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [currentWorkoutTitle, setCurrentWorkoutTitle] = useState('');
  const [currentWorkoutExercises, setCurrentWorkoutExercises] = useState<{ exercise: string; videoUrl?: string; sets?: string; reps?: string }[]>([]);
  const [currentWorkoutContent, setCurrentWorkoutContent] = useState('');

  const startVisualWorkout = (title: string, exercises: { exercise: string; videoUrl?: string; sets?: string; reps?: string }[], notes: string) => {
    setCurrentWorkoutTitle(title);
    setCurrentWorkoutExercises(exercises);
    setCurrentWorkoutContent(notes || 'Follow standard form.');
    setIsWorkoutModalOpen(true);
  };

  const [generatedPdf, setGeneratedPdf] = useState<{ blobUrl: string; filename: string } | null>(null);
  const [isExportingReport, setIsExportingReport] = useState(false);

  const handleDownloadTransformationReport = async () => {
    alert("Transformation report generation not available.");
  };

  const handleSaveDraft = async (draft: any) => {
    if (!id) return;
    try {
      await firebaseService.savePendingDraft({
        ...draft,
        clientId: id
      });
    } catch (err) {
      console.error("Error saving pending draft:", err);
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      await firebaseService.deletePendingDraft(draftId);
    } catch (err) {
      console.error("Error deleting draft:", err);
    }
  };

  const handleApproveDraft = async (draft: any) => {
    if (!id) return;
    try {
      // 1. Save active workout plan data
      const workoutPlanData = {
        title: "Speed Fit Custom Plan (AI Assisted)",
        clientId: id,
        description: "Adaptive EMS training schedule designed specifically for physiological alignment.",
        sections: draft.workoutPlan.sections.map((sec: any) => ({
          title: sec.title || 'Workout Schedule',
          content: sec.content || ''
        })),
        createdAt: new Date().toISOString(),
        isArchived: false,
        approved: false // Set to false so the trainer can correct/edit and then release to client
      };
      await firebaseService.saveWorkoutPlan(workoutPlanData);

      // 2. Save active diet plan data
      const dietPlanData = {
        title: "Speed Fit Custom Diet (AI Assisted)",
        clientId: id,
        description: `Macro guided meal chart for ${draft.dietPlan.calories} Calories.`,
        calories: Number(draft.dietPlan.calories || 2000),
        protein: Number(draft.dietPlan.protein || 150),
        carbs: Number(draft.dietPlan.carbs || 180),
        fats: Number(draft.dietPlan.fats || 60),
        meals: {
          breakfast: {
            content: draft.dietPlan.meals.breakfast.content || '',
            alternatives: draft.dietPlan.meals.breakfast.alternatives || ''
          },
          lunch: {
            content: draft.dietPlan.meals.lunch.content || '',
            alternatives: draft.dietPlan.meals.lunch.alternatives || ''
          },
          dinner: {
            content: draft.dietPlan.meals.dinner.content || '',
            alternatives: draft.dietPlan.meals.dinner.alternatives || ''
          },
          snacks: {
            content: draft.dietPlan.meals.snacks.content || '',
            alternatives: draft.dietPlan.meals.snacks.alternatives || ''
          }
        },
        createdAt: new Date().toISOString(),
        isArchived: false,
        approved: false // Set to false so the trainer can correct/edit and then release to client
      };
      await firebaseService.saveDietPlan(dietPlanData);

      // 3. Save as approved status in database
      await firebaseService.savePendingDraft({
        ...draft,
        status: 'approved'
      });
    } catch (err) {
      console.error("Error approving draft:", err);
      throw err;
    }
  };

  const handleSetWorkoutPlanStatus = async (plan: any, status: 'ready' | 'revision') => {
    try {
      await firebaseService.saveWorkoutPlan({
        ...plan,
        approved: status === 'ready',
        approvalStatus: status
      });
      const txt = status === 'ready' 
        ? "Workout plan marked as 'Ready for Client' and released successfully!" 
        : "Workout plan marked as 'Pending Revision' successfully.";
      alert(txt);
    } catch (err) {
      console.error("Error setting workout plan status:", err);
      alert("Failed to update workout plan status.");
    }
  };

  const handleApproveWorkoutPlan = async (plan: any) => {
    await handleSetWorkoutPlanStatus(plan, 'ready');
  };

  const handleSetDietPlanStatus = async (plan: any, status: 'ready' | 'revision') => {
    try {
      await firebaseService.saveDietPlan({
        ...plan,
        approved: status === 'ready',
        approvalStatus: status
      });
      const txt = status === 'ready' 
        ? "Diet plan marked as 'Ready for Client' and released successfully!" 
        : "Diet plan marked as 'Pending Revision' successfully.";
      alert(txt);
    } catch (err) {
      console.error("Error setting diet plan status:", err);
      alert("Failed to update diet plan status.");
    }
  };

  const handleApproveDietPlan = async (plan: any) => {
    await handleSetDietPlanStatus(plan, 'ready');
  };


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'plans') {
      setActiveTab('plans');
    }
  }, [id]);

  useEffect(() => {
    let unsubscribeLogs: () => void;
    let unsubscribePlans: () => void;
    let unsubscribeTemplates: () => void;
    let unsubscribeDietPlans: () => void;
    let unsubscribeAttendance: () => void;
    let unsubscribePayments: () => void;
    let unsubscribeSessions: () => void;
    let unsubscribeHealth: () => void;
    let unsubscribeFitness: () => void;
    let unsubscribeDrafts: () => void;

    const fetchAllData = async () => {
      if (!id) return;

      try {
        // Fetch current user
        const currentUserData = await firebaseService.getUser(auth.currentUser?.uid || '');
        setUserData(currentUserData);

        // Fetch client user doc
        let clientData = await firebaseService.getUser(id);
        let targetId = id;

        // Handle pre-registration migration seamlessly
        if (clientData && (clientData as any).migratedTo) {
          const migratedId = (clientData as any).migratedTo;
          console.log(`Routing client profile page from transient ID ${id} to migrated authenticated ID ${migratedId}`);
          clientData = await firebaseService.getUser(migratedId);
          targetId = migratedId;
          // Smoothly rewrite browser URL to refer to the actual authenticated UID
          window.history.replaceState(null, '', `/client/${migratedId}`);
        }

        setClient(clientData as User);
        if (clientData) {
          setClientDetails((clientData as any).clientDetails || null);
          setHealthAssessment((clientData as any).healthAssessment || null);
        }

        // Fetch workout logs
        unsubscribeLogs = firebaseService.subscribeToWorkoutLogs((logsData) => {
          setRecentLogs(logsData);
        }, targetId);

        // Fetch workout plans
        unsubscribePlans = firebaseService.subscribeToWorkoutPlans(targetId, (plansData) => {
          setWorkoutPlans(plansData);
        });

        // Fetch workout templates
        unsubscribeTemplates = firebaseService.subscribeToWorkoutTemplates(auth.currentUser?.uid || '', (templatesData) => {
          setWorkoutTemplates(templatesData);
        });

        // Fetch diet plans
        unsubscribeDietPlans = firebaseService.subscribeToDietPlans(targetId, (plansData) => {
          setDietPlans(plansData);
        });

        // Fetch pending drafts
        unsubscribeDrafts = firebaseService.subscribeToPendingDrafts(targetId, (draftsData) => {
          setPendingDrafts(draftsData);
        });

        // Fetch attendance
        unsubscribeAttendance = firebaseService.subscribeToAttendance(targetId, (attendanceData) => {
          setAttendance(attendanceData);
        });

        // Fetch payments
        unsubscribePayments = firebaseService.subscribeToPaymentRecords(targetId, (records) => {
          setPaymentRecords(records);
        });

        // Fetch sessions
        unsubscribeSessions = firebaseService.subscribeToUpcomingSessions(targetId, (sessionsData) => {
          setSessions(sessionsData);
        });

        // Fetch assessments
        unsubscribeHealth = firebaseService.subscribeToHealthAssessment(targetId, (data) => {
          setHealthAssessmentDoc(data);
          if (data) setHealthAssessment(data);
        });

        unsubscribeFitness = firebaseService.subscribeToFitnessAssessment(targetId, (data) => {
          setFitnessAssessmentDoc(data);
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
      if (unsubscribeTemplates) unsubscribeTemplates();
      if (unsubscribeDietPlans) unsubscribeDietPlans();
      if (unsubscribeDrafts) unsubscribeDrafts();
      if (unsubscribeAttendance) unsubscribeAttendance();
      if (unsubscribePayments) unsubscribePayments();
      if (unsubscribeSessions) unsubscribeSessions();
      if (unsubscribeHealth) unsubscribeHealth();
      if (unsubscribeFitness) unsubscribeFitness();
    };
  }, [id]);

  const handleMarkAttendance = async (status: 'Present' | 'Missed', customDate?: string, duration?: string) => {
    if (!id) return;
    try {
      const date = customDate || new Date().toISOString().split('T')[0];
      await firebaseService.markAttendance({ 
        clientId: id, 
        date, 
        status, 
        duration: duration || '60' 
      });
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

  const handleSavePlan = async (e: React.FormEvent, publishImmediately: boolean = true) => {
    e?.preventDefault?.();
    if (!id || planSections.length === 0 || isSavingPlan) return;

    setIsSavingPlan(true);
    try {
      const now = new Date().toISOString();
      const existingPlan = editingPlanId ? workoutPlans.find(p => p.id === editingPlanId) : null;
      const isApproved = publishImmediately || (existingPlan ? (existingPlan.approved ?? true) : true);
      
      const planData = {
        id: editingPlanId || undefined,
        clientId: id,
        sections: planSections.filter(s => s.title.trim() || s.content.trim()),
        updatedAt: now,
        isArchived: false,
        approved: isApproved,
        approvalStatus: isApproved ? 'ready' : 'draft'
      };
      
      await firebaseService.saveWorkoutPlan(planData);
      
      setShowPlanForm(false);
      setEditingPlanId(null);
      setPlanSections([{ title: '', content: '' }]);
      alert(isApproved ? "Workout blueprint saved & published to client profile!" : "Workout plan saved as draft.");
    } catch (error) {
      console.error("Error saving workout plan:", error);
      alert("Failed to save workout plan.");
    } finally {
      setIsSavingPlan(false);
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

  const handleSaveDietPlan = async (e: React.FormEvent, publishImmediately: boolean = true) => {
    e?.preventDefault?.();
    if (!id || dietSections.length === 0 || isSavingDiet) return;

    setIsSavingDiet(true);
    try {
      const now = new Date().toISOString();
      const existingPlan = editingDietId ? dietPlans.find(p => p.id === editingDietId) : null;
      const isApproved = publishImmediately || (existingPlan ? (existingPlan.approved ?? true) : true);
      
      const planData = {
        id: editingDietId || undefined,
        clientId: id,
        sections: dietSections.filter(s => s.title.trim() || s.content.trim()),
        updatedAt: now,
        isArchived: false,
        approved: isApproved,
        approvalStatus: isApproved ? 'ready' : 'draft'
      };
      
      await firebaseService.saveDietPlan(planData);
      
      setShowDietForm(false);
      setEditingDietId(null);
      setDietSections([{ title: '', content: '' }]);
      alert(isApproved ? "Diet schedule saved & published to client profile!" : "Diet plan saved as draft.");
    } catch (error) {
      console.error("Error saving diet plan:", error);
      alert("Failed to save diet plan.");
    } finally {
      setIsSavingDiet(false);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || isSavingPayment) return;

    setIsSavingPayment(true);
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
      setPaymentData({
        package: '',
        packageType: 'Monthly',
        startDate: '',
        dueDate: '',
        status: 'Pending',
        amount: '',
      });
    } catch (error) {
      console.error("Error saving payment record:", error);
      alert("Failed to save payment record.");
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleSaveTransaction = async (recordId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingTransaction || !transactionAmount) return;

    setIsSavingTransaction(true);
    try {
      const record = paymentRecords.find(r => r.id === recordId);
      if (!record) {
        alert("Payment statement not found.");
        return;
      }

      const newTx = {
        id: 'tx_' + Math.random().toString(36).substr(2, 9),
        date: transactionDate || new Date().toISOString().split('T')[0],
        amount: Number(transactionAmount) || 0,
        method: transactionMethod,
        notes: transactionNotes.trim()
      };

      const updatedTxList = [...(record.transactions || []), newTx];
      const totalPaid = updatedTxList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const recordAmount = Number(record.amount) || 0;
      const newStatus = totalPaid >= recordAmount ? 'Paid' : record.status;

      await firebaseService.updatePaymentRecord(recordId, {
        transactions: updatedTxList,
        status: newStatus
      });

      // Reset form
      setActiveTransactionFormId(null);
      setTransactionDate('');
      setTransactionAmount('');
      setTransactionMethod('UPI');
      setTransactionNotes('');
    } catch (error) {
      console.error("Error logging transaction:", error);
      alert("Failed to log transaction.");
    } finally {
      setIsSavingTransaction(false);
    }
  };

  const handleDeleteTransaction = async (recordId: string, txId: string) => {
    if (!confirm("Are you sure you want to delete this transaction record?")) return;
    
    const record = paymentRecords.find(r => r.id === recordId);
    if (!record) return;

    const updatedTxList = (record.transactions || []).filter(t => t.id !== txId);
    const totalPaid = updatedTxList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const recordAmount = Number(record.amount) || 0;
    const newStatus = totalPaid >= recordAmount ? 'Paid' : (record.status === 'Paid' ? 'Pending' : record.status);

    try {
      await firebaseService.updatePaymentRecord(recordId, {
        transactions: updatedTxList,
        status: newStatus
      });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Failed to delete transaction.");
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

  const toggleDietSection = (planId: string, sectionIndex: number) => {
    const key = `${planId}-${sectionIndex}`;
    setExpandedDietSections(prev => ({
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

  const alerts = useMemo(() => {
    const newAlerts: { id: string, type: 'inactive' | 'session' | 'payment', title: string, message: string, date: number }[] = [];
    const now = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // 1. Inactive client
    const lastLog = recentLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    if (!lastLog || new Date(lastLog.date) < threeDaysAgo) {
        newAlerts.push({
            id: 'inactive',
            type: 'inactive',
            title: 'Inactive Client',
            message: 'You have been inactive for 3+ days.',
            date: now.getTime()
        });
    }

    // 2. Payments (Dues tracking with descriptive balance reminders)
    const sevenDaysFromNow = addDays(now, 7);
    paymentRecords.filter(p => p.status !== 'Paid').forEach(payment => {
        const dueDate = new Date(payment.dueDate);
        const amountDisplay = payment.amount ? `₹${payment.amount}` : 'due fees';
        if (dueDate < now) {
            newAlerts.push({
                id: `payment-overdue-${payment.id}`,
                type: 'payment',
                title: 'Overdue Balance Reminder',
                message: `Payment of ${amountDisplay} for ${payment.package} was due on ${format(dueDate, 'yyyy-MM-dd')}. Please settle immediately.`,
                date: dueDate.getTime()
            });
        } else if (dueDate <= sevenDaysFromNow) {
            newAlerts.push({
                id: `payment-due-${payment.id}`,
                type: 'payment',
                title: 'Pending Balance Reminder',
                message: `Pending balance of ${amountDisplay} for ${payment.package} is due soon on ${format(dueDate, 'yyyy-MM-dd')}.`,
                date: dueDate.getTime()
            });
        } else {
            newAlerts.push({
                id: `payment-pending-${payment.id}`,
                type: 'payment',
                title: 'Outstanding Balance Notice',
                message: `Outstanding balance of ${amountDisplay} is registered for ${payment.package}, due on ${format(dueDate, 'yyyy-MM-dd')}.`,
                date: dueDate.getTime()
            });
        }
    });

    return newAlerts.sort((a, b) => b.date - a.date);
  }, [recentLogs, paymentRecords]);

  const attendanceStats = useMemo(() => {
    const attended = attendance.filter(a => a.status === 'Present').length;
    const missed = attendance.filter(a => a.status === 'Missed' || a.status === 'Absent').length;
    const total = attendance.length;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
    return { attended, missed, total, percentage };
  }, [attendance]);

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
      const workingUrl = url.trim();
      
      // Check for already embed format
      if (workingUrl.includes('youtube.com/embed/') || workingUrl.includes('player.vimeo.com/video/')) {
        return workingUrl;
      }

      // YouTube Regular Expression
      const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
      const match = workingUrl.match(ytRegex);
      if (match && match[1]) {
        let embedUrl = `https://www.youtube.com/embed/${match[1]}`;
        
        // Handle timestamps
        try {
          const urlObj = new URL(workingUrl.startsWith('http') ? workingUrl : `https://${workingUrl}`);
          const t = urlObj.searchParams.get('t');
          if (t) {
            const secondsMatch = t.match(/(\d+)s/);
            const minutesMatch = t.match(/(\d+)m/);
            let totalSeconds = 0;
            if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60;
            if (secondsMatch) totalSeconds += parseInt(secondsMatch[1]);
            if (!minutesMatch && !secondsMatch && /^\d+$/.test(t)) totalSeconds = parseInt(t);
            if (totalSeconds > 0) embedUrl += `?start=${totalSeconds}`;
          }
        } catch (e) {
          // Ignore URL parsing errors and return basic embed
        }
        return embedUrl;
      }
      
      // Vimeo Regular Expression
      const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i;
      const vMatch = workingUrl.match(vimeoRegex);
      if (vMatch && vMatch[1]) {
        return `https://player.vimeo.com/video/${vMatch[1]}`;
      }
      
      // If it looks like a YouTube ID but not matched (11 chars)
      if (/^[a-zA-Z0-9_-]{11}$/.test(workingUrl)) {
        return `https://www.youtube.com/embed/${workingUrl}`;
      }

      return workingUrl;
    } catch (e) {
      return url;
    }
  };

  if (loading) {
    return (
      <Layout userData={userData}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white font-bold">Accessing Client Profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!client) return <Layout userData={userData}><div className="p-10 font-mono text-red-500 uppercase tracking-widest">Error: Client not found in database.</div></Layout>;

  return (
    <Layout userData={userData}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center space-x-3 text-white font-bold hover:text-brand-red transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-mono text-[10px] uppercase tracking-widest">Go Back</span>
        </button>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={handleDownloadTransformationReport}
            disabled={isExportingReport}
            className={`flex items-center justify-center space-x-2 px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 rounded-xl font-mono text-[10px] font-bold text-white uppercase tracking-wider transition-all shadow-lg active:scale-95 group ${
              isExportingReport ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Download comprehensive athletic transformation report with biometrics & performance journal"
          >
            <Download className={`w-4 h-4 group-hover:translate-y-0.5 transition-transform ${isExportingReport ? 'animate-bounce' : ''}`} />
            <span>{isExportingReport ? 'Preparing Report...' : 'Download Report'}</span>
          </button>

          <button
            onClick={() => {
              const result = exportClientToPDF(
                client,
                healthAssessment,
                recentLogs,
                workoutPlans,
                dietPlans,
                attendance,
                paymentRecords,
                healthAssessmentDoc,
                fitnessAssessmentDoc
              );
              if (result && result.success) {
                setGeneratedPdf({ blobUrl: result.blobUrl, filename: result.filename });
              }
            }}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-brand-red hover:bg-red-600 rounded-xl font-mono text-[10px] font-bold text-white uppercase tracking-wider transition-all shadow-lg hover:shadow-brand-red/10 active:scale-95 group"
            title="Download full client medical, fitness, and workout report in PDF form"
          >
            <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            <span>Download Dossier (PDF)</span>
          </button>
        </div>
      </div>

      {/* Client Profile Header & Details */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-[2.5rem] overflow-hidden mb-10 shadow-2xl">
        <div className="p-10 flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-10 border-b border-neutral-700">
          <div className="relative group">
            <AvatarDisplay type={client.avatar} />
            {userData?.role === 'TRAINER' && (
              <div className="absolute top-0 right-0 p-1 bg-neutral-800 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <select 
                  className="bg-neutral-800 text-white rounded-full p-1 text-[10px] uppercase tracking-widest"
                  value={client.avatar || ''}
                  onChange={async (e) => {
                    const avatar = e.target.value as 'male' | 'female';
                    await firebaseService.updateUser(client.id, { avatar });
                    setClient({ ...client, avatar });
                  }}
                >
                  <option value="">None</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            )}
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-6xl font-display italic uppercase leading-none mb-4 text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)] border-b-4 border-brand-red inline-block pb-2">
              {client.name || 'Unnamed Client'}
            </h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="px-4 py-1.5 bg-neutral-800 text-neutral-50 font-bold text-[8px] font-mono uppercase tracking-widest rounded-full border border-neutral-700">
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
        
      {/* NEW CLIENT PROFILE LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
        {/* Client Account */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-[2rem] p-8 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Client Account</h3>
          <div className="space-y-4">
             <div className="flex justify-between"><span className="text-neutral-400">Name</span><span className="text-white font-bold">{client.name}</span></div>
             <div className="flex justify-between"><span className="text-neutral-400">Package</span><span className="text-white font-bold">{paymentRecords[0]?.package || 'N/A'}</span></div>
             <div className="flex justify-between"><span className="text-neutral-400">Joined</span><span className="text-white font-bold">N/A</span></div>
             <div className="flex justify-between"><span className="text-neutral-400">Renewal</span><span className="text-white font-bold">{paymentRecords[0]?.dueDate ? format(new Date(paymentRecords[0]?.dueDate), 'dd MMM') : 'N/A'}</span></div>
             <div className="flex justify-between"><span className="text-neutral-400">Status</span><span className="text-red-500 font-bold">🔴 {paymentRecords[0]?.status || 'N/A'}</span></div>
          </div>
        </div>

        {/* Account Summary */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-[2rem] p-8 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Account Summary</h3>
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <span className="text-neutral-400">Package Price</span>
                <input 
                  type="number"
                  value={overriddenPackagePrice}
                  onChange={(e) => setOverriddenPackagePrice(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 text-white font-bold text-right rounded p-1 w-24"
                />
             </div>
             <div className="flex justify-between"><span className="text-neutral-400">Amount Paid</span><span className="text-emerald-500 font-bold">₹{paymentRecords.reduce((sum, p) => sum + Number(p.amount || 0), 0)}</span></div>
             <div className="flex justify-between"><span className="text-neutral-400">Balance Due</span><span className="text-red-500 font-bold">₹{Math.max(0, Number(overriddenPackagePrice || 0) - paymentRecords.reduce((sum, p) => sum + Number(p.amount || 0), 0))}</span></div>
             <div className="flex justify-between"><span className="text-neutral-400">Discount</span><span className="text-white font-bold">₹0</span></div>
             <div className="flex justify-between items-center">
                <span className="text-neutral-400">Outstanding</span>
                {(() => {
                  const outstanding = Math.max(0, Number(overriddenPackagePrice || 0) - paymentRecords.reduce((sum, p) => sum + Number(p.amount || 0), 0));
                  const renewalDate = paymentRecords[0]?.dueDate ? new Date(paymentRecords[0]?.dueDate) : null;
                  const overdueDays = renewalDate ? differenceInDays(new Date(), renewalDate) : 0;
                  const shouldAlert = outstanding > 500 || (overdueDays > 7);
                  
                  const content = <span className="text-red-500 font-bold">₹{outstanding}</span>;
                  
                  if (!shouldAlert) return content;
                  
                  return (
                    <motion.div
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="border border-red-500/50 rounded px-2 py-0.5 bg-red-500/10"
                    >
                      {content}
                    </motion.div>
                  );
                })()}
             </div>
          </div>
        </div>

         {/* Attendance */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-[2rem] p-8 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Attendance</h3>
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <span className="text-neutral-400">Total Sessions</span>
                <input 
                  type="number"
                  value={totalPackageSessions}
                  onChange={(e) => setTotalPackageSessions(Number(e.target.value) || 0)}
                  className="bg-neutral-900 border border-neutral-700 text-white font-bold text-right rounded p-1 w-20"
                />
             </div>
             <div className="flex justify-between"><span className="text-neutral-400">Completed</span><span className="text-emerald-500 font-bold">{attendanceStats.attended}</span></div>
             <div className="flex justify-between"><span className="text-neutral-400">Remaining</span><span className="text-red-500 font-bold">{Math.max(0, totalPackageSessions - attendanceStats.attended)}</span></div>
             <div className="flex justify-between">
                <span className="text-neutral-400">Attendance %</span>
                <span className="text-white font-bold">
                  {totalPackageSessions > 0 ? Math.round((attendanceStats.attended / totalPackageSessions) * 100) : 0}%
                </span>
             </div>
          </div>
        </div>
      </div>
      {/* Additional sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
        {/* Early Exit Settlement */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-[2rem] p-8 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Early Exit Settlement</h3>
          <div className="space-y-4">
            <div className="flex justify-between"><span className="text-neutral-400">Standard Price</span><span className="text-white font-bold">₹{paymentRecords[0]?.amount || '0'}</span></div>
            {/* These need actual calculations based on business logic, for now using placeholders */}
            <div className="flex justify-between"><span className="text-neutral-400">Rate Per Session</span><span className="text-white font-bold">₹500</span></div>
            <div className="flex justify-between"><span className="text-neutral-400">Sessions Used</span><span className="text-white font-bold">{attendanceStats.attended}</span></div>
            <div className="flex justify-between"><span className="text-neutral-400">Settlement Amount</span><span className="text-white font-bold">₹{attendanceStats.attended * 500}</span></div>
            <div className="flex justify-between"><span className="text-neutral-400">Already Paid</span><span className="text-emerald-500 font-bold">₹{paymentRecords.reduce((sum, p) => sum + Number(p.amount || 0), 0)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-400">Balance Due</span><span className="text-red-500 font-bold">₹{Math.max(0, (attendanceStats.attended * 500) - paymentRecords.reduce((sum, p) => sum + Number(p.amount || 0), 0))}</span></div>
          </div>
        </div>

        {/* Renewal */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-[2rem] p-8 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Renewal</h3>
          <div className="space-y-4">
            <div className="flex justify-between"><span className="text-neutral-400">Renewal Amount</span><span className="text-white font-bold">₹{paymentRecords[0]?.amount || '0'}</span></div>
            <div className="flex justify-between"><span className="text-neutral-400">Renewal Date</span><span className="text-white font-bold">{paymentRecords[0]?.dueDate ? format(new Date(paymentRecords[0]?.dueDate), 'dd MMM') : 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-neutral-400">Renewal Status</span><span className="text-amber-500 font-bold">Pending</span></div>
          </div>
        </div>

        {/* Follow-up */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-[2rem] p-8 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Follow-up</h3>
          <div className="space-y-2">
            {['Call Client', 'Send Reminder', 'WhatsApp Follow-up', 'Payment Reminder', 'Renewal Reminder', 'Cancel Package'].map((task) => (
                <label key={task} className="flex items-center space-x-2 text-white text-xs">
                    <input type="checkbox" className="rounded border-neutral-700 bg-neutral-900" />
                    <span>{task}</span>
                </label>
            ))}
          </div>
        </div>
      </div>
      {/* Notes */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-[2rem] p-8 shadow-xl mb-10">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Notes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Customer Notes', 'Follow-up Notes', 'Medical Notes'].map((note) => (
                <div key={note}>
                    <label className="block text-neutral-400 text-[10px] uppercase tracking-wider mb-2">{note}</label>
                    <textarea className="w-full bg-neutral-900 rounded-xl p-4 text-white text-xs border border-neutral-700" rows={4}></textarea>
                </div>
            ))}
        </div>
      </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-700/50 mb-10 overflow-x-auto custom-scrollbar">
        {[
          { id: 'overview', label: 'Overview', icon: <UserIcon className="w-4 h-4 mr-2" /> },
          { id: 'plans', label: 'Workout & Diet Plans', icon: <FileText className="w-4 h-4 mr-2" /> },
          { id: 'logs', label: 'Logs & Sessions', icon: <Activity className="w-4 h-4 mr-2" /> },
          { id: 'assessments', label: 'Assessments', icon: <Target className="w-4 h-4 mr-2" /> },
          { id: 'payments', label: 'Payment', icon: <CreditCard className="w-4 h-4 mr-2" /> },
          { id: 'ai-transformation', label: 'AI Transformation', icon: <Zap className="w-4 h-4 mr-2" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center px-8 py-4 font-mono text-[10px] uppercase tracking-widest transition-all ${
              activeTab === tab.id
                ? 'text-brand-red border-b-2 border-brand-red bg-neutral-800/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/20'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-10 animate-fade-in">
      {/* Notifications Section */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-[2.5rem] p-8 mb-10 shadow-xl">
        <div className="flex items-center space-x-3 mb-6">
          <Bell className="w-5 h-5 text-brand-red" />
          <h3 className="text-2xl font-display italic uppercase tracking-wider text-white">Notifications</h3>
        </div>
        
        {alerts.length === 0 ? (
          <div className="bg-neutral-800/30 border border-dashed border-neutral-700 p-8 rounded-2xl text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-50 font-bold italic">No new notifications.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map(alert => (
              <div key={alert.id} className="bg-neutral-800/50 border border-neutral-700 p-4 rounded-2xl flex items-start space-x-4">
                <div className={`p-2 rounded-full ${alert.type === 'inactive' ? 'bg-amber-500/20 text-amber-400' : 'bg-brand-red/20 text-brand-red'}`}>
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white font-bold">{alert.title}</p>
                  <p className="text-[10px] font-mono text-neutral-50 font-bold mt-1">{alert.message}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-mono uppercase tracking-widest ${alert.type === 'inactive' ? 'bg-amber-500/10 text-amber-500' : 'bg-brand-red/10 text-brand-red'}`}>
                  {alert.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress Photos */}
      {id && (
        <ProgressPhotos clientId={id} isTrainer={userData?.role === 'TRAINER'} />
      )}

      {/* Calendar View */}
      <div className="mb-10">
        <CalendarView logs={recentLogs} attendance={attendance} sessions={sessions} />
      </div>

      </div>
      )}

      {activeTab === 'plans' && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="space-y-10 pb-20"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Workout Strategy section */}
            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              className="bg-neutral-800/50 border border-neutral-700 rounded-[2.5rem] overflow-hidden shadow-2xl transition-shadow hover:shadow-neutral-800/10"
            >
              <div className="p-8 border-b border-neutral-700 flex justify-between items-center bg-neutral-800/20">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-brand-red/10 rounded-2xl border border-brand-red/20 shadow-[0_0_15px_rgba(255,0,0,0.1)]">
                    <Activity className="w-6 h-6 text-brand-red" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display italic uppercase tracking-wider text-white">Workout Strategy</h3>
                    <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mt-1">Individual Training Regime</p>
                  </div>
                </div>
                {userData?.role === 'TRAINER' && !showPlanForm && (
                  <button
                    onClick={() => {
                      setEditingPlanId(null);
                      setPlanSections([{ title: '', content: '' }]);
                      setShowPlanForm(true);
                    }}
                    className="bg-brand-red text-white px-5 py-2.5 rounded-2xl font-mono text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Assign Regimen</span>
                  </button>
                )}
              </div>

              <div className="p-8">
                {showPlanForm && userData?.role === 'TRAINER' ? (
                  <form onSubmit={handleSavePlan} className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-mono text-white uppercase tracking-widest font-black">
                        {editingPlanId ? 'Edit Workout Plan' : 'New Workout Plan'}
                      </h4>
                      <button
                        type="button"
                        onClick={addFormSection}
                        className="text-[10px] px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 font-mono uppercase tracking-wider rounded-xl text-neutral-200"
                      >
                        + Add Section
                      </button>
                    </div>

                    <div className="space-y-6 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                      {planSections.map((section, idx) => (
                        <div key={idx} className="bg-neutral-900/60 border border-neutral-800 p-6 rounded-2xl space-y-4 relative">
                          {planSections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeFormSection(idx)}
                              className="absolute top-4 right-4 text-[9px] font-sans text-brand-red hover:underline uppercase font-bold"
                            >
                              Remove
                            </button>
                          )}
                          <div>
                            <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-2">Section Title</label>
                            <input
                              type="text"
                              value={section.title}
                              required
                              onChange={(e) => updateFormSection(idx, 'title', e.target.value)}
                              placeholder="e.g., Target Muscle Groups, Rest Intervals"
                              className="input-field text-xs font-mono bg-neutral-950"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-2">Instructions / Content</label>
                            <textarea
                              value={section.content}
                              required
                              onChange={(e) => updateFormSection(idx, 'content', e.target.value)}
                              placeholder="- Squats: 4 sets of 12 reps&#10;- Deadlifts: 3 sets of 10 reps"
                              rows={5}
                              className="input-field text-xs font-mono bg-neutral-950 p-4"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-700">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPlanForm(false);
                          setPlanSections([{ title: '', content: '' }]);
                        }}
                        className="px-5 py-2.5 rounded-xl font-mono text-[10px] uppercase text-neutral-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleSavePlan(e, false)}
                        disabled={isSavingPlan}
                        className="bg-neutral-800 text-neutral-300 px-4 py-2.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-700 hover:text-white"
                      >
                        Save as Draft
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleSavePlan(e, true)}
                        disabled={isSavingPlan}
                        className="bg-brand-red text-white px-6 py-2.5 rounded-xl font-mono text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 hover:text-black transition-all shadow-[0_0_15px_rgba(255,0,0,0.3)]"
                      >
                        {isSavingPlan ? 'Publishing...' : 'Save & Publish to Client'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    {workoutPlans.length === 0 ? (
                      <div className="p-12 text-center border border-dashed border-neutral-700 rounded-3xl bg-neutral-900/10">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 font-bold italic leading-normal">
                          No customized workout blueprint assigned to this individual.
                        </p>
                      </div>
                    ) : (
                      workoutPlans.map((plan) => (
                        <div key={plan.id} className="bg-neutral-900/40 border border-neutral-800 rounded-[2rem] p-6 space-y-6 shadow-md">
                          <div className="flex justify-between items-center border-b border-neutral-850 pb-4">
                            <div>
                              <span className="text-[8px] font-mono text-brand-red uppercase tracking-widest block mb-0.5">Assigned On</span>
                              <p className="text-xs font-mono text-white">{new Date(plan.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                              {plan.approved ? (
                                <div className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 rounded-full">
                                  <Check className="w-3 h-3" />
                                  <span className="text-[8px] font-mono font-bold uppercase tracking-widest">READY FOR CLIENT</span>
                                </div>
                              ) : plan.approvalStatus === 'revision' ? (
                                <div className="flex items-center space-x-1 px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span className="text-[8px] font-mono font-bold uppercase tracking-widest">PENDING REVISION</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full">
                                  <AlertTriangle className="w-3 h-3 animate-pulse" />
                                  <span className="text-[8px] font-mono font-bold uppercase tracking-widest">DRAFT</span>
                                </div>
                              )}
                              
                              {userData?.role === 'TRAINER' && (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleSetWorkoutPlanStatus(plan, 'ready')}
                                    disabled={plan.approved}
                                    className={`px-3 py-1 rounded-lg font-mono text-[9px] uppercase tracking-wider font-bold transition-all shadow ${
                                      plan.approved
                                        ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                    }`}
                                  >
                                    Approve Plan
                                  </button>
                                  <button
                                    onClick={() => handleSetWorkoutPlanStatus(plan, 'revision')}
                                    disabled={plan.approvalStatus === 'revision'}
                                    className={`px-3 py-1 rounded-lg font-mono text-[9px] uppercase tracking-wider font-bold transition-all shadow ${
                                      plan.approvalStatus === 'revision'
                                        ? "bg-neutral-800 text-rose-450 border border-rose-950 cursor-not-allowed"
                                        : "bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/50"
                                    }`}
                                  >
                                    Request Revision
                                  </button>
                                </div>
                              )}

                              {userData?.role === 'TRAINER' && (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleEditPlan(plan)}
                                    className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-neutral-300 hover:text-white transition-all"
                                    title="Edit workout strategy"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePlan(plan.id)}
                                    className="p-2 bg-neutral-800 hover:bg-brand-red/20 rounded-xl text-neutral-300 hover:text-brand-red transition-all"
                                    title="Delete regimen"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            {plan.sections?.map((section, sIdx) => {
                              const expKey = `${plan.id}-${sIdx}`;
                              const isExp = expandedSections[expKey] ?? (sIdx === 0);
                              return (
                                <div key={sIdx} className="bg-neutral-950/60 rounded-2xl border border-neutral-850 overflow-hidden">
                                  <button
                                    onClick={() => toggleSection(plan.id, sIdx)}
                                    className="w-full px-6 py-4 flex justify-between items-center hover:bg-neutral-900/60 transition-all text-left"
                                  >
                                    <span className="font-mono text-[10px] font-bold text-white uppercase tracking-wider">{section.title}</span>
                                    {isExp ? <ChevronDown className="w-4 h-4 text-neutral-400 rotate-180 transition-transform" /> : <ChevronDown className="w-4 h-4 text-neutral-400 transition-transform" />}
                                  </button>
                                  {isExp && (
                                    <div className="px-6 pb-5 pt-2 border-t border-neutral-850">
                                      <p className="text-xs font-mono text-neutral-300 leading-relaxed whitespace-pre-line">{section.content}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Dietary Strategy section */}
            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              className="bg-neutral-800/50 border border-neutral-700 rounded-[2.5rem] overflow-hidden shadow-2xl transition-shadow hover:shadow-neutral-800/10"
            >
              <div className="p-8 border-b border-neutral-700 flex justify-between items-center bg-neutral-800/20">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-brand-red/10 rounded-2xl border border-brand-red/20 shadow-[0_0_15px_rgba(255,0,0,0.1)]">
                    <Target className="w-6 h-6 text-brand-red" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display italic uppercase tracking-wider text-white">Diet Strategy</h3>
                    <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mt-1">Nutrition & Macros Protocol</p>
                  </div>
                </div>
                {userData?.role === 'TRAINER' && !showDietForm && (
                  <button
                    onClick={() => {
                      setEditingDietId(null);
                      setDietSections([{ title: '', content: '' }]);
                      setShowDietForm(true);
                    }}
                    className="bg-brand-red text-white px-5 py-2.5 rounded-2xl font-mono text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Prescribe Nutrition</span>
                  </button>
                )}
              </div>

              <div className="p-8">
                {showDietForm && userData?.role === 'TRAINER' ? (
                  <form onSubmit={handleSaveDietPlan} className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-mono text-white uppercase tracking-widest font-black">
                        {editingDietId ? 'Edit Diet Plan' : 'New Dietary Plan'}
                      </h4>
                      <button
                        type="button"
                        onClick={addDietFormSection}
                        className="text-[10px] px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 font-mono uppercase tracking-wider rounded-xl text-neutral-200"
                      >
                        + Add Section
                      </button>
                    </div>

                    <div className="space-y-6 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                      {dietSections.map((section, idx) => (
                        <div key={idx} className="bg-neutral-900/60 border border-neutral-800 p-6 rounded-2xl space-y-4 relative">
                          {dietSections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDietFormSection(idx)}
                              className="absolute top-4 right-4 text-[9px] font-sans text-brand-red hover:underline uppercase font-bold"
                            >
                              Remove
                            </button>
                          )}
                          <div>
                            <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-2">Section Title</label>
                            <input
                              type="text"
                              value={section.title}
                              required
                              onChange={(e) => updateDietFormSection(idx, 'title', e.target.value)}
                              placeholder="e.g., Breakfast Protocol, Post-Workout Macros"
                              className="input-field text-xs font-mono bg-neutral-950"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-2">Nutrition Guide / Content</label>
                            <textarea
                              value={section.content}
                              required
                              onChange={(e) => updateDietFormSection(idx, 'content', e.target.value)}
                              placeholder="e.g., 4 egg whites, 1 cup of oats, 50g blueberries"
                              rows={5}
                              className="input-field text-xs font-mono bg-neutral-950 p-4"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-700">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDietForm(false);
                          setDietSections([{ title: '', content: '' }]);
                        }}
                        className="px-5 py-2.5 rounded-xl font-mono text-[10px] uppercase text-neutral-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleSaveDietPlan(e, false)}
                        disabled={isSavingDiet}
                        className="bg-neutral-800 text-neutral-300 px-4 py-2.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-700 hover:text-white"
                      >
                        Save as Draft
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleSaveDietPlan(e, true)}
                        disabled={isSavingDiet}
                        className="bg-brand-red text-white px-6 py-2.5 rounded-xl font-mono text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 hover:text-black transition-all shadow-[0_0_15px_rgba(255,0,0,0.3)]"
                      >
                        {isSavingDiet ? 'Publishing...' : 'Save & Publish to Client'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    {dietPlans.length === 0 ? (
                      <div className="p-12 text-center border border-dashed border-neutral-700 rounded-3xl bg-neutral-900/10">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 font-bold italic leading-normal">
                          No nutrition protocols or macros assigned to this individual.
                        </p>
                      </div>
                    ) : (
                      dietPlans.map((plan) => (
                        <div key={plan.id} className="bg-neutral-900/40 border border-neutral-800 rounded-[2rem] p-6 space-y-6 shadow-md">
                          <div className="flex justify-between items-center border-b border-neutral-850 pb-4">
                            <div>
                              <span className="text-[8px] font-mono text-brand-red uppercase tracking-widest block mb-0.5">Prescribed On</span>
                              <p className="text-xs font-mono text-white">{new Date(plan.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                              {plan.approved ? (
                                <div className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 rounded-full">
                                  <Check className="w-3 h-3" />
                                  <span className="text-[8px] font-mono font-bold uppercase tracking-widest">READY FOR CLIENT</span>
                                </div>
                              ) : plan.approvalStatus === 'revision' ? (
                                <div className="flex items-center space-x-1 px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span className="text-[8px] font-mono font-bold uppercase tracking-widest">PENDING REVISION</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full">
                                  <AlertTriangle className="w-3 h-3 animate-pulse" />
                                  <span className="text-[8px] font-mono font-bold uppercase tracking-widest">DRAFT</span>
                                </div>
                              )}
                              
                              {userData?.role === 'TRAINER' && (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleSetDietPlanStatus(plan, 'ready')}
                                    disabled={plan.approved}
                                    className={`px-3 py-1 rounded-lg font-mono text-[9px] uppercase tracking-wider font-bold transition-all shadow ${
                                      plan.approved
                                        ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                    }`}
                                  >
                                    Approve Plan
                                  </button>
                                  <button
                                    onClick={() => handleSetDietPlanStatus(plan, 'revision')}
                                    disabled={plan.approvalStatus === 'revision'}
                                    className={`px-3 py-1 rounded-lg font-mono text-[9px] uppercase tracking-wider font-bold transition-all shadow ${
                                      plan.approvalStatus === 'revision'
                                        ? "bg-neutral-800 text-rose-450 border border-rose-950 cursor-not-allowed"
                                        : "bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/50"
                                    }`}
                                  >
                                    Request Revision
                                  </button>
                                </div>
                              )}

                              {userData?.role === 'TRAINER' && (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleEditDietPlan(plan)}
                                    className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-neutral-300 hover:text-white transition-all"
                                    title="Edit diet recipe instructions"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDietPlan(plan.id)}
                                    className="p-2 bg-neutral-800 hover:bg-brand-red/20 rounded-xl text-neutral-300 hover:text-brand-red transition-all"
                                    title="Delete nutrition blueprint"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            {plan.sections?.map((section, sIdx) => {
                              const expKey = `${plan.id}-${sIdx}`;
                              const isExp = expandedDietSections[expKey] ?? (sIdx === 0);
                              return (
                                <div key={sIdx} className="bg-neutral-950/60 rounded-2xl border border-neutral-850 overflow-hidden">
                                  <button
                                    onClick={() => toggleDietSection(plan.id, sIdx)}
                                    className="w-full px-6 py-4 flex justify-between items-center hover:bg-neutral-900/60 transition-all text-left"
                                  >
                                    <span className="font-mono text-[10px] font-bold text-white uppercase tracking-wider">{section.title}</span>
                                    {isExp ? <ChevronDown className="w-4 h-4 text-neutral-400 rotate-180 transition-transform" /> : <ChevronDown className="w-4 h-4 text-neutral-400 transition-transform" />}
                                  </button>
                                  {isExp && (
                                    <div className="px-6 pb-5 pt-2 border-t border-neutral-850">
                                      <p className="text-xs font-mono text-neutral-300 leading-relaxed whitespace-pre-line">{section.content}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {activeTab === 'payments' && (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10"
      >
        {/* Payment Records Section */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-neutral-700 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                <h3 className="text-2xl font-display italic uppercase tracking-wider">Payment Records</h3>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {paymentRecords.length === 0 ? (
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-50 font-bold italic">No payment records.</p>
              ) : (
                <div className="space-y-3">
                  {paymentRecords.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()).map((p, pIdx) => (
                    <motion.div 
                      key={p.id} 
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: pIdx * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                      className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50 flex justify-between items-center transition-shadow hover:shadow-md"
                    >
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] text-white">Package: {p.package}</span>
                        <span className="font-mono text-[10px] text-neutral-50 font-bold">Due: {p.dueDate}</span>
                      </div>
                      <span className={`font-mono text-[8px] uppercase tracking-widest font-bold ${p.status === 'Paid' ? 'text-emerald-500' : p.status === 'Overdue' ? 'text-brand-red' : 'text-amber-500'}`}>{p.status}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
      )}
        {/* Attendance Tracking */}
      {activeTab === 'assessments' && id && (
        <div className="space-y-10 animate-fade-in pb-20">
          <AssessmentsSection 
            clientId={id} 
            isTrainer={userData?.role === 'TRAINER'} 
            healthDoc={healthAssessmentDoc || (client as any)?.healthAssessment}
            fitnessDoc={fitnessAssessmentDoc || (client as any)?.fitnessAssessment}
          />
        </div>
      )}

      {activeTab === 'logs' && (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-neutral-700 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-brand-red" />
                <h3 className="text-2xl font-display italic uppercase tracking-wider">Attendance</h3>
              </div>
            </div>

            {/* Package Goal Progress Bar */}
            <div className="mb-6 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-700/50">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Package Progress</span>
                <span className="font-mono text-xs text-white font-bold">
                  {attendanceStats.attended} / {totalPackageSessions} Sessions
                </span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden border border-neutral-700">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, totalPackageSessions > 0 ? (attendanceStats.attended / totalPackageSessions) * 100 : 0)}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="font-mono text-[9px] text-neutral-500">Remaining: {Math.max(0, totalPackageSessions - attendanceStats.attended)} sessions</span>
                <span className="font-mono text-[9px] text-emerald-400 font-bold">
                  {totalPackageSessions > 0 ? Math.round((attendanceStats.attended / totalPackageSessions) * 100) : 0}% Complete
                </span>
              </div>
            </div>

            {userData?.role === 'TRAINER' && (
              <div className="flex flex-col gap-3 mb-6 bg-neutral-900/40 p-4 rounded-2xl border border-neutral-700/30">
                <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-bold">Log New Session</div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-mono uppercase text-neutral-400">Date</label>
                    <input 
                      type="date" 
                      id="attendance-date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 font-mono text-[10px] text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-mono uppercase text-neutral-400">Duration</label>
                    <select
                      value={attendanceDuration}
                      onChange={(e) => setAttendanceDuration(e.target.value)}
                      className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 font-mono text-[10px] text-white focus:outline-none focus:border-brand-red"
                    >
                      <option value="30">30 mins</option>
                      <option value="45">45 mins</option>
                      <option value="60">60 mins</option>
                      <option value="90">90 mins</option>
                      <option value="120">120 mins</option>
                    </select>
                  </div>
                  <div className="flex space-x-2 mt-auto">
                    <button 
                      onClick={() => {
                        const dateInput = document.getElementById('attendance-date') as HTMLInputElement;
                        handleMarkAttendance('Present', dateInput.value, attendanceDuration);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest transition-all h-9 flex items-center"
                    >
                      Present
                    </button>
                    <button 
                      onClick={() => {
                        const dateInput = document.getElementById('attendance-date') as HTMLInputElement;
                        handleMarkAttendance('Missed', dateInput.value, attendanceDuration);
                      }}
                      className="bg-brand-red hover:bg-red-700 text-white px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest transition-all h-9 flex items-center"
                    >
                      Missed
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {attendance.length === 0 ? (
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-50 font-bold italic">No attendance records.</p>
              ) : (
                <div className="space-y-3">
                  {attendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map(a => (
                    <div key={a.id} className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50 flex justify-between items-center hover:border-neutral-600 transition-all group">
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] text-neutral-50 font-bold">{format(new Date(a.date + 'T00:00:00'), 'MMM dd, yyyy')}</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`font-mono text-[8px] uppercase tracking-widest font-bold ${a.status === 'Present' ? 'text-emerald-500' : 'text-brand-red'}`}>{a.status}</span>
                          <span className="text-neutral-500 font-mono text-[8px]">•</span>
                          <span className="text-neutral-400 font-mono text-[8px] uppercase tracking-wider">{a.duration || '60'} mins</span>
                        </div>
                      </div>
                      {userData?.role === 'TRAINER' && (
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => firebaseService.updateAttendance(a.id, {
                              status: a.status === 'Present' ? 'Missed' : 'Present'
                            })}
                            className="p-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-neutral-50 font-bold hover:text-white transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setItemToDelete({ id: a.id, type: 'attendance', label: `Attendance on ${a.date}` })}
                            className="p-1.5 bg-neutral-700 hover:bg-brand-red/20 rounded-lg text-neutral-50 font-bold hover:text-brand-red transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scheduled Sessions */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-neutral-700 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="text-2xl font-display italic uppercase tracking-wider text-white">Sessions</h3>
              </div>
              <span className="font-mono text-[10px] text-white font-bold uppercase tracking-widest">
                {sessions.filter(s => new Date(s.date) >= new Date()).length} Upcoming
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
              {sessions.length === 0 ? (
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-50 font-bold italic">No scheduled sessions.</p>
              ) : (
                <div className="space-y-4">
                  {sessions
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(session => {
                      const isPast = new Date(session.date) < new Date();
                      return (
                        <div key={session.id} className={`p-4 rounded-2xl border ${isPast ? 'bg-neutral-800/30 border-neutral-700 opacity-50' : 'bg-neutral-800/40 border-neutral-700 hover:border-amber-500/50'} transition-all flex justify-between items-center`}>
                          <div>
                            <h4 className="text-white font-bold text-sm">{format(new Date(session.date), 'EEE, MMM do')}</h4>
                            <p className="font-mono text-[10px] text-neutral-50 font-bold">{session.time}</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`font-mono text-[8px] uppercase tracking-widest px-2 py-1 rounded-lg ${
                              session.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {session.status}
                            </span>
                            {userData?.role === 'TRAINER' && !isPast && (
                              <button 
                                onClick={() => firebaseService.confirmSession(session.id, { status: 'confirmed' })}
                                className="text-amber-500 hover:text-white transition-colors p-1"
                              >
                                <Shield className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Workout Logs */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-[2.5rem] overflow-hidden mb-10 shadow-2xl">
        <div className="p-8 border-b border-neutral-700 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Activity className="w-5 h-5 text-emerald-500" />
            <h3 className="text-2xl font-display italic uppercase tracking-wider">Workout Logs</h3>
          </div>
          <Link to="/workout-logs" className="text-[10px] font-mono uppercase tracking-widest text-brand-red hover:text-white transition-colors">View All</Link>
        </div>
        <div className="p-8">
          {recentLogs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-neutral-800/30 border border-neutral-700 p-6 rounded-[2rem] flex flex-col items-center justify-center text-center">
                <span className="text-[8px] font-mono text-white font-bold uppercase tracking-widest mb-2">Total Sessions</span>
                <span className="text-3xl font-display italic text-white">{recentLogs.length}</span>
              </div>
              <div className="bg-neutral-800/30 border border-neutral-700 p-6 rounded-[2rem] flex flex-col items-center justify-center text-center">
                <span className="text-[8px] font-mono text-white font-bold uppercase tracking-widest mb-2">Total Volume</span>
                <span className="text-3xl font-display italic text-emerald-500">
                  {(recentLogs.reduce((acc, log) => acc + log.entries.reduce((sum: number, entry: any) => sum + (parseInt(entry.sets) || 0) * (parseInt(entry.reps) || 0) * (parseFloat(entry.weight) || 0), 0), 0) / 1000).toFixed(1)}t
                </span>
              </div>
              <div className="bg-neutral-800/30 border border-neutral-700 p-6 rounded-[2rem] flex flex-col items-center justify-center text-center">
                <span className="text-[8px] font-mono text-white font-bold uppercase tracking-widest mb-2">Avg Exercises</span>
                <span className="text-3xl font-display italic text-brand-red">
                  {(recentLogs.reduce((acc, log) => acc + log.entries.length, 0) / recentLogs.length).toFixed(1)}
                </span>
              </div>
            </div>
          )}
          {recentLogs.length === 0 ? (
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-50 font-bold italic">No workout logs recorded.</p>
          ) : (
            <div className="space-y-4">
              {recentLogs.map(log => {
                const totalVolume = log.entries.reduce((sum, entry) => sum + (parseInt(entry.sets) || 0) * (parseInt(entry.reps) || 0) * (parseFloat(entry.weight) || 0), 0);
                const avgWeight = log.entries.length > 0 ? log.entries.reduce((sum, entry) => sum + (parseFloat(entry.weight) || 0), 0) / log.entries.length : 0;
                const isExpanded = expandedLogs[log.id] || false;
                
                return (
                  <div key={log.id} className="bg-neutral-800/50 rounded-2xl border border-neutral-700/50 overflow-hidden">
                    <div className="p-4 flex justify-between items-center bg-neutral-800/30">
                      <div 
                        className="flex flex-col cursor-pointer flex-1"
                        onClick={() => toggleLogExpansion(log.id)}
                      >
                        <span className="font-mono text-[10px] text-neutral-50 font-bold">{new Date(log.date).toLocaleDateString()}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] text-emerald-500">{log.entries.length} Exercises</span>
                          <span className="text-neutral-500 text-[10px]">|</span>
                          <span className="font-mono text-[10px] text-neutral-50 font-bold">Vol: {totalVolume.toFixed(0)}kg</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {log.entries.length > 0 && (
                          <button 
                            onClick={() => startVisualWorkout(`Log: ${new Date(log.date).toLocaleDateString()}`, log.entries.map(e => ({ exercise: e.exercise, videoUrl: e.videoUrl, sets: e.sets, reps: e.reps })), log.notes || '')}
                            className="flex items-center space-x-2 bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Play className="w-3 h-3" />
                            <span className="text-[8px] font-mono uppercase tracking-widest hidden sm:inline">Visual Workout</span>
                          </button>
                        )}
                        <button 
                          onClick={() => toggleLogExpansion(log.id)}
                          className="p-2 text-neutral-400 hover:text-white transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-6 border-t border-neutral-700/50 animate-fade-in bg-neutral-900/20">
                        <div className="space-y-6">
                          {log.entries.map((entry, idx) => (
                            <div key={idx} className="flex flex-col space-y-4">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-3">
                                  <div className="w-6 h-6 bg-neutral-800 rounded-full flex items-center justify-center border border-neutral-700">
                                    <span className="text-[8px] font-mono text-brand-red">{idx + 1}</span>
                                  </div>
                                  <h6 className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">{entry.exercise}</h6>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-mono text-neutral-50 font-bold uppercase">Sets</span>
                                    <span className="text-xs font-display italic text-white">{entry.sets || '-'}</span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-mono text-neutral-50 font-bold uppercase">Reps</span>
                                    <span className="text-xs font-display italic text-white">{entry.reps || '-'}</span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-mono text-neutral-50 font-bold uppercase">Load</span>
                                    <span className="text-xs font-display italic text-brand-red">{entry.weight || '-'}kg</span>
                                  </div>
                                </div>
                              </div>
                              
                                {entry.videoUrl && (
                                  <div className="aspect-video w-full max-w-lg mx-auto rounded-xl overflow-hidden bg-black border border-neutral-700 shadow-lg">
                                    {entry.videoUrl.includes('youtube') || entry.videoUrl.includes('youtu.be') || entry.videoUrl.includes('vimeo') ? (
                                      <iframe
                                        key={entry.videoUrl}
                                        src={getEmbedUrl(entry.videoUrl)}
                                        className="w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        loading="lazy"
                                        title="Exercise Video"
                                      ></iframe>
                                    ) : (
                                      <video 
                                        src={entry.videoUrl} 
                                        className="w-full h-full object-cover" 
                                        controls 
                                      />
                                    )}
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>
                        {log.notes && (
                          <div className="mt-6 pt-6 border-t border-neutral-700/50">
                            <p className="text-[8px] font-mono text-brand-red uppercase tracking-widest mb-2">Trainer Observations</p>
                            <p className="text-[10px] font-mono text-neutral-50 font-bold italic leading-relaxed whitespace-pre-wrap">{log.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </>
      )}



      {activeTab === 'payments' && (
      <>
      {/* Payment Records Section */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-[2.5rem] overflow-hidden mb-10 shadow-2xl">
        <div className="p-8 border-b border-neutral-700 flex justify-between items-center">
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
          <div className="p-8 border-b border-neutral-700 bg-neutral-800/30">
            <form onSubmit={handleSavePayment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-brand-red font-bold mb-2 ml-1">Package Template Presets</label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      const baseDate = paymentData.startDate || format(new Date(), 'yyyy-MM-dd');
                      if (val === 'monthly') {
                        setPaymentData({
                          ...paymentData,
                          package: 'Monthly EMS Training (8 Sessions)',
                          packageType: 'Monthly',
                          amount: '5000',
                          dueDate: format(addDays(new Date(baseDate), 30), 'yyyy-MM-dd')
                        });
                      } else if (val === 'session') {
                        setPaymentData({
                          ...paymentData,
                          package: 'Elite Session-Based EMS Pack (20 Sessions)',
                          packageType: 'Session-Based',
                          amount: '12000',
                          dueDate: format(addDays(new Date(baseDate), 30), 'yyyy-MM-dd')
                        });
                      } else if (val === 'transformation') {
                        setPaymentData({
                          ...paymentData,
                          package: '3 Months Body Transformation Program (24 Sessions)',
                          packageType: '3 Months Transformation',
                          amount: '24000',
                          dueDate: format(addDays(new Date(baseDate), 90), 'yyyy-MM-dd')
                        });
                      }
                    }}
                    className="input-field font-mono text-xs bg-brand-red/10 border-brand-red/30 text-white font-bold"
                  >
                    <option value="" className="bg-neutral-900">-- Choose Package Preset (Or custom type below) --</option>
                    <option value="monthly" className="bg-neutral-900">Monthly EMS Training (₹5,000 / 8 Sessions)</option>
                    <option value="session" className="bg-neutral-900">Elite Session-Based Pack (₹12,000 / 20 Sessions)</option>
                    <option value="transformation" className="bg-neutral-900">3 Months Body Transformation (₹24,000 / 24 Sessions)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold mb-2 ml-1">Package Name</label>
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
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold mb-2 ml-1">Billing Category / Package Type</label>
                  <select
                    value={paymentData.packageType}
                    onChange={(e) => {
                      const type = e.target.value;
                      const baseDate = paymentData.startDate || format(new Date(), 'yyyy-MM-dd');
                      const days = type === '3 Months Transformation' ? 90 : 30;
                      setPaymentData({
                        ...paymentData,
                        packageType: type,
                        dueDate: format(addDays(new Date(baseDate), days), 'yyyy-MM-dd')
                      });
                    }}
                    className="input-field font-mono text-xs"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Session-Based">Session-Based</option>
                    <option value="3 Months Transformation">3 Months Transformation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold mb-2 ml-1">Status</label>
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
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold mb-2 ml-1">Payment Date (Start)</label>
                  <input
                    type="date"
                    required
                    value={paymentData.startDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setPaymentData({ ...paymentData, startDate: '' });
                        return;
                      }
                      const [year, month, day] = val.split('-').map(Number);
                      const startObj = new Date(year, month - 1, day);
                      const days = paymentData.packageType === '3 Months Transformation' ? 90 : 30;
                      const calculatedDueDate = format(addDays(startObj, days), 'yyyy-MM-dd');
                      setPaymentData({ 
                        ...paymentData, 
                        startDate: val, 
                        dueDate: calculatedDueDate 
                      });
                    }}
                    className="input-field font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold mb-2 ml-1">Due Date (Auto-calculated)</label>
                  <input
                    type="date"
                    required
                    value={paymentData.dueDate}
                    onChange={(e) => setPaymentData({ ...paymentData, dueDate: e.target.value })}
                    className="input-field font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold mb-2 ml-1">Total Amount in Rs. (₹)</label>
                  <input
                    type="number"
                    required
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    className="input-field font-mono text-xs text-brand-red font-bold"
                    placeholder="e.g. 5000"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setEditingPaymentId(null);
                    setPaymentData({
                      package: '',
                      packageType: 'Monthly',
                      startDate: '',
                      dueDate: '',
                      status: 'Pending',
                      amount: ''
                    });
                  }}
                  className="px-6 py-3 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-white font-bold hover:bg-neutral-800 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSavingPayment}
                  className="bg-white text-black px-8 py-3 rounded-2xl font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingPayment ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="p-8">
          {(() => {
            const getPaidAmountForRecord = (record: any) => {
              if (record.transactions && record.transactions.length > 0) {
                return record.transactions.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
              }
              return record.status === 'Paid' ? (Number(record.amount) || 0) : 0;
            };

            const getBalanceDueForRecord = (record: any) => {
              const recordAmount = Number(record.amount) || 0;
              const paidAmount = getPaidAmountForRecord(record);
              return Math.max(0, recordAmount - paidAmount);
            };

            const totalAmountPaid = paymentRecords.reduce((sum, r) => sum + getPaidAmountForRecord(r), 0);
            const totalBalanceDue = paymentRecords.reduce((sum, r) => sum + getBalanceDueForRecord(r), 0);
            const totalPackageCost = paymentRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

            const pendingList = paymentRecords.filter(r => getBalanceDueForRecord(r) > 0);
            const outstandingSum = pendingList.reduce((sum, r) => sum + getBalanceDueForRecord(r), 0);

            const hasOverdue = paymentRecords.some(r => r.status === 'Overdue' || (r.status !== 'Paid' && r.dueDate && new Date(r.dueDate) < new Date() && getBalanceDueForRecord(r) > 0));
            const hasPending = paymentRecords.some(r => r.status === 'Pending' || (r.status !== 'Paid' && getBalanceDueForRecord(r) > 0));

            return (
              <>
                {outstandingSum > 0 && (
                  <div className="mb-6 p-6 border border-brand-red/30 bg-brand-red/5 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-brand-red animate-pulse text-sm">⚠️</span>
                        <h5 className="text-[10px] font-mono font-bold uppercase tracking-widest text-brand-red">Coach Collection Notice</h5>
                      </div>
                      <p className="text-2xl font-display italic text-white">
                        Outstanding Balance: ₹{outstandingSum.toLocaleString()}
                      </p>
                      <p className="text-[10px] font-mono text-neutral-400">
                        The client has {pendingList.length} statements requiring billing settlement & payment verification.
                      </p>
                    </div>
                    <div>
                      <span className="inline-block bg-brand-red/10 text-brand-red font-mono text-[9px] font-bold px-3 py-1.5 rounded-full uppercase border border-brand-red/20 tracking-wider animate-pulse">
                        Balance Unreconciled
                      </span>
                    </div>
                  </div>
                )}

                {paymentRecords.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* Total Amount Paid */}
                    <div className="bg-neutral-800/40 border border-neutral-700/60 p-6 rounded-[2rem] flex flex-col justify-between hover:border-emerald-500/30 transition-all shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] font-mono text-neutral-400 font-bold uppercase tracking-wider">Amount Paid</span>
                        <div className="bg-emerald-500/10 p-2 rounded-xl">
                          <Shield className="w-4 h-4 text-emerald-400" />
                        </div>
                      </div>
                      <div>
                        <div className="text-3xl font-display italic text-emerald-400 font-bold">
                          ₹{totalAmountPaid.toLocaleString()}
                        </div>
                        <p className="font-mono text-[8px] text-neutral-500 uppercase tracking-widest mt-1">
                          Settled across all packages
                        </p>
                      </div>
                    </div>

                    {/* Total Balance Due */}
                    <div className="bg-neutral-800/40 border border-neutral-700/60 p-6 rounded-[2rem] flex flex-col justify-between hover:border-amber-500/30 transition-all shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] font-mono text-neutral-400 font-bold uppercase tracking-wider">Balance Due</span>
                        <div className="bg-amber-500/10 p-2 rounded-xl">
                          <CreditCard className="w-4 h-4 text-amber-400" />
                        </div>
                      </div>
                      <div>
                        <div className="text-3xl font-display italic text-amber-400 font-bold">
                          ₹{totalBalanceDue.toLocaleString()}
                        </div>
                        <p className="font-mono text-[8px] text-neutral-500 uppercase tracking-widest mt-1">
                          Total Cost: ₹{totalPackageCost.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Overdue Dues */}
                    <div className="bg-neutral-800/40 border border-neutral-700/60 p-6 rounded-[2rem] flex flex-col justify-between hover:border-red-500/30 transition-all shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] font-mono text-neutral-400 font-bold uppercase tracking-wider">Overdue Dues</span>
                        <div className="bg-red-500/10 p-2 rounded-xl">
                          <AlertTriangle className="w-4 h-4 text-brand-red" />
                        </div>
                      </div>
                      <div>
                        {(() => {
                          const overdueRecords = paymentRecords.filter(r => r.status === 'Overdue' || (r.status !== 'Paid' && r.dueDate && new Date(r.dueDate) < new Date()));
                          const sortedOverdue = [...overdueRecords].sort((a, b) => {
                            if (!a.dueDate) return 1;
                            if (!b.dueDate) return -1;
                            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                          });
                          const oldestOverdue = sortedOverdue[0];
                          const totalOverdueSum = overdueRecords.reduce((sum, r) => sum + getBalanceDueForRecord(r), 0);

                          if (totalOverdueSum === 0) {
                            return (
                              <>
                                <div className="text-3xl font-display italic text-neutral-400 font-bold">₹0</div>
                                <p className="font-mono text-[8px] text-neutral-500 uppercase tracking-widest mt-1">No overdue statements</p>
                              </>
                            );
                          }
                          const overdueDays = oldestOverdue && oldestOverdue.dueDate ? differenceInDays(new Date(), new Date(oldestOverdue.dueDate)) : 0;
                          return (
                            <>
                              <div className="text-3xl font-display italic text-red-400 font-bold">
                                ₹{totalOverdueSum.toLocaleString()}
                              </div>
                              <p className={`font-mono text-[8px] uppercase tracking-widest mt-1 text-red-400 font-bold animate-pulse`}>
                                {overdueDays > 0 
                                  ? `Overdue up to ${overdueDays} days` 
                                  : `Dues pending verification`
                                }
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* General Settlement Status */}
                    <div className="bg-neutral-800/40 border border-neutral-700/60 p-6 rounded-[2rem] flex flex-col justify-between hover:border-neutral-600 transition-all shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] font-mono text-neutral-400 font-bold uppercase tracking-wider">Status Overview</span>
                        <div className="bg-neutral-700/30 p-2 rounded-xl">
                          <Activity className="w-4 h-4 text-neutral-300" />
                        </div>
                      </div>
                      <div>
                        {(() => {
                          let statusText = '🟢 SETTLED';
                          let statusColor = 'text-emerald-400';
                          let statusDesc = 'All packages cleared';

                          if (hasOverdue) {
                            statusText = '🔴 OVERDUE';
                            statusColor = 'text-red-400';
                            statusDesc = 'Collection required';
                          } else if (hasPending) {
                            statusText = '⏳ PENDING';
                            statusColor = 'text-amber-400';
                            statusDesc = 'Awaiting reconciliation';
                          }

                          return (
                            <>
                              <div className={`text-2xl font-display italic font-black uppercase ${statusColor}`}>
                                {statusText}
                              </div>
                              <p className="font-mono text-[8px] text-neutral-500 uppercase tracking-widest mt-1">
                                {statusDesc}
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {paymentRecords.length === 0 && !showPaymentForm ? (
                  <div className="p-12 text-center border border-dashed border-neutral-700 rounded-3xl bg-neutral-900/30">
                    <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 font-bold italic">No active ledger items or payment records on file.</p>
                  </div>
                ) : (
                  <div className="space-y-6 mb-10">
                    {paymentRecords.map(record => {
                      const recordPaid = getPaidAmountForRecord(record);
                      const recordDue = getBalanceDueForRecord(record);
                      const isFullyPaid = recordDue === 0;

                      return (
                        <div 
                          key={record.id} 
                          className={`border p-8 rounded-[2rem] flex flex-col gap-6 transition-all shadow-xl hover:shadow-2xl ${
                            isFullyPaid 
                              ? 'bg-neutral-900/40 border-emerald-800/50 shadow-emerald-950/10' 
                              : record.status === 'Overdue'
                                ? 'bg-neutral-900/40 border-brand-red/50 shadow-brand-red/10'
                                : 'bg-neutral-900/40 border-amber-600/50 shadow-amber-950/10'
                          }`}
                        >
                          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                            <div className="flex-1 space-y-4">
                              <div className="flex items-center space-x-3">
                                <span className={`w-3 h-3 rounded-full ${
                                  isFullyPaid ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                                  record.status === 'Overdue' ? 'bg-brand-red shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse' : 
                                  'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                }`} />
                                <p className="text-[10px] font-mono font-bold tracking-widest text-neutral-400 uppercase">
                                  {record.packageType || 'SPEEDFIT ACCESS'} MEMBERSHIP
                                </p>
                              </div>

                              <h4 className="text-2xl md:text-3xl font-display italic uppercase tracking-wide text-white">
                                {record.package}
                              </h4>

                              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 bg-neutral-950 p-4 rounded-2xl border border-neutral-850">
                                <div>
                                  <span className="text-[8px] font-mono text-neutral-500 block uppercase tracking-wider mb-0.5">Start Date</span>
                                  <p className="text-xs text-neutral-200 font-medium font-mono">
                                    {record.startDate ? new Date(record.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-[8px] font-mono text-neutral-500 block uppercase tracking-wider mb-0.5">Renewal Due Date</span>
                                  <p className={`text-xs font-semibold font-mono ${record.status === 'Overdue' ? 'text-brand-red font-bold' : 'text-neutral-200'}`}>
                                    {record.dueDate ? new Date(record.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-[8px] font-mono text-neutral-500 block uppercase tracking-wider mb-0.5">Paid So Far</span>
                                  <p className="text-xs text-emerald-400 font-semibold font-mono">
                                    ₹{recordPaid.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-[8px] font-mono text-neutral-500 block uppercase tracking-wider mb-0.5">Pending Balance</span>
                                  <p className={`text-xs font-semibold font-mono ${recordDue > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}`}>
                                    ₹{recordDue.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-start xl:items-end justify-center py-2 xl:pl-6 xl:border-l border-neutral-800 gap-4 min-w-[200px]">
                              <div className="flex flex-col xl:items-end w-full">
                                <span className="text-[9px] font-mono text-neutral-400 font-bold uppercase tracking-widest">
                                  VALUED STATEMENT
                                </span>
                                <span className="text-3xl md:text-4xl font-display italic font-bold text-white tracking-tight">
                                  ₹{(Number(record.amount) || 0).toLocaleString()}
                                </span>
                              </div>

                              <div className="w-full space-y-3">
                                <span className={`block px-5 py-2.5 rounded-xl text-xs font-mono font-black uppercase tracking-widest border transition-all text-center shadow-md ${
                                  isFullyPaid 
                                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60 shadow-emerald-500/5' 
                                    : record.status === 'Overdue' 
                                      ? 'bg-brand-red/20 text-brand-red border-brand-red/40 animate-pulse shadow-brand-red/5' 
                                      : 'bg-amber-950/40 text-amber-500 border-amber-800/60 shadow-amber-500/5'
                                }`}>
                                  {isFullyPaid ? '✓ FULLY SETTLED' : record.status === 'Overdue' ? '⚠ OVERDUE' : '⏳ PARTIALLY PAID'}
                                </span>

                                {client && (
                                  <button
                                    type="button"
                                    onClick={() => exportPaymentReceiptToPDF(client, record)}
                                    className={`w-full font-mono text-[10px] font-black uppercase tracking-widest py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 border cursor-pointer ${
                                      isFullyPaid
                                        ? 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border-emerald-500/30'
                                        : record.status === 'Overdue'
                                          ? 'bg-brand-red/20 hover:bg-brand-red text-brand-red hover:text-white border-brand-red/30'
                                          : 'bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white border-amber-500/30'
                                    }`}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>{isFullyPaid ? 'Download Receipt PDF' : record.status === 'Overdue' ? 'Download Overdue Bill PDF' : 'Download Invoice PDF'}</span>
                                  </button>
                                )}

                                {userData?.role === 'TRAINER' && (
                                  <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-800/50">
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        setActiveTransactionFormId(activeTransactionFormId === record.id ? null : record.id);
                                        setTransactionDate(new Date().toISOString().split('T')[0]);
                                        setTransactionAmount(String(recordDue));
                                        setTransactionMethod('UPI');
                                        setTransactionNotes('');
                                      }}
                                      className="flex-1 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600 hover:text-white border border-emerald-600/30 text-[10px] px-3 py-2 rounded-xl transition-all font-mono uppercase tracking-wider font-bold"
                                    >
                                      {activeTransactionFormId === record.id ? 'Cancel Payment' : '+ Log Payment'}
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        setPaymentData({
                                          package: record.package,
                                          packageType: record.packageType || 'Monthly',
                                          startDate: record.startDate,
                                          dueDate: record.dueDate,
                                          status: record.status,
                                          amount: record.amount ? String(record.amount) : ''
                                        });
                                        setEditingPaymentId(record.id);
                                        setShowPaymentForm(true);
                                      }}
                                      className="bg-neutral-800 text-neutral-300 font-bold hover:text-white hover:bg-neutral-700 text-[10px] px-3 py-2 rounded-xl transition-all font-mono uppercase tracking-wider"
                                    >
                                      Edit
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => setItemToDelete({ id: record.id, type: 'payment', label: `payment record for ${record.package}` })}
                                      className="bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white border border-brand-red/20 text-[10px] px-3 py-2 rounded-xl transition-all font-mono uppercase tracking-wider"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* INLINE ADD TRANSACTION FORM FOR TRAINER */}
                          {activeTransactionFormId === record.id && userData?.role === 'TRAINER' && (
                            <div className="mt-4 p-6 border border-emerald-500/30 bg-neutral-950 rounded-[1.5rem] animate-fade-in">
                              <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 mb-4 flex items-center">
                                <Plus className="w-3.5 h-3.5 mr-2" /> Log Transaction / Ledger Settlement
                              </h5>
                              <form onSubmit={(e) => handleSaveTransaction(record.id, e)} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                  <label className="block text-[8px] font-mono uppercase tracking-wider text-neutral-400 mb-1 ml-1">Payment Date</label>
                                  <input
                                    type="date"
                                    required
                                    value={transactionDate}
                                    onChange={(e) => setTransactionDate(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-emerald-500/50"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-mono uppercase tracking-wider text-neutral-400 mb-1 ml-1">Amount (₹)</label>
                                  <input
                                    type="number"
                                    required
                                    min="1"
                                    max={recordDue}
                                    value={transactionAmount}
                                    onChange={(e) => setTransactionAmount(e.target.value)}
                                    placeholder="e.g. 5000"
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-emerald-500/50"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-mono uppercase tracking-wider text-neutral-400 mb-1 ml-1">Method</label>
                                  <select
                                    value={transactionMethod}
                                    onChange={(e) => setTransactionMethod(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-emerald-500/50"
                                  >
                                    <option value="UPI">UPI (Google Pay/PhonePe)</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Card">Credit/Debit Card</option>
                                    <option value="Bank Transfer">Bank Net Transfer</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[8px] font-mono uppercase tracking-wider text-neutral-400 mb-1 ml-1">Notes / ID</label>
                                  <input
                                    type="text"
                                    value={transactionNotes}
                                    onChange={(e) => setTransactionNotes(e.target.value)}
                                    placeholder="Tx Ref ID, initial deposit, etc."
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-emerald-500/50"
                                  />
                                </div>
                                <div className="md:col-span-4 flex justify-end gap-2 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setActiveTransactionFormId(null)}
                                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-[9px] font-mono uppercase tracking-wider transition-all"
                                  >
                                    Discard
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={isSavingTransaction}
                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] font-mono uppercase tracking-wider font-bold transition-all disabled:opacity-50"
                                  >
                                    {isSavingTransaction ? 'Saving...' : 'Submit Payment'}
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}

                          {/* LIST OF TRANSACTIONS FOR THIS SPECIFIC RECORD */}
                          {record.transactions && record.transactions.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-neutral-800/40">
                              <h5 className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-400 mb-2.5 flex items-center">
                                <Activity className="w-3.5 h-3.5 mr-2 text-neutral-500" />
                                Statement Reconciliation Logs ({record.transactions.length})
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {record.transactions.map((tx: any) => (
                                  <div key={tx.id} className="bg-neutral-950/50 border border-neutral-850 p-4 rounded-xl flex items-center justify-between">
                                    <div className="border-red-500">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-[10px] font-mono text-neutral-400">
                                          {tx.date ? new Date(tx.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                        </span>
                                        <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono text-[8px] uppercase tracking-wider rounded-lg">
                                          {tx.method}
                                        </span>
                                      </div>
                                      {tx.notes && (
                                        <p className="text-[10px] font-mono text-neutral-500 mt-1 italic font-bold">
                                          "{tx.notes}"
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-4">
                                      <span className="text-sm font-mono text-emerald-400 font-bold">
                                        + ₹{Number(tx.amount || 0).toLocaleString()}
                                      </span>
                                      {userData?.role === 'TRAINER' && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteTransaction(record.id, tx.id)}
                                          className="text-neutral-500 hover:text-brand-red p-1 rounded-lg hover:bg-brand-red/10 transition-all cursor-pointer"
                                          title="Delete transaction entry"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* DETAILED TRANSACTION LOG SECTION */}
                <div className="bg-neutral-900/40 border border-neutral-700/60 p-8 rounded-[2rem] shadow-xl">
                  <div className="flex items-center space-x-3 mb-6 border-b border-neutral-800 pb-4">
                    <div className="bg-emerald-500/10 p-2.5 rounded-2xl">
                      <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xl font-display italic uppercase tracking-wider text-white">
                        Detailed Transaction Log & Reconciliation
                      </h4>
                      <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mt-0.5">
                        Client transaction settlements ledger (Reconciled balances list)
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const allTransactions: any[] = [];
                    paymentRecords.forEach(record => {
                      if (record.transactions && record.transactions.length > 0) {
                        record.transactions.forEach((tx: any) => {
                          allTransactions.push({
                            ...tx,
                            packageName: record.package,
                            recordId: record.id
                          });
                        });
                      } else if (record.status === 'Paid') {
                        allTransactions.push({
                          id: `implicit_${record.id}`,
                          date: record.startDate,
                          amount: record.amount || 0,
                          method: 'Pre-Paid / Settled',
                          notes: 'Fully settled initial statement on ledger registration',
                          packageName: record.package,
                          recordId: record.id,
                          isImplicit: true
                        });
                      }
                    });

                    allTransactions.sort((a, b) => {
                      if (!a.date) return 1;
                      if (!b.date) return -1;
                      return new Date(b.date).getTime() - new Date(a.date).getTime();
                    });

                    if (allTransactions.length === 0) {
                      return (
                        <div className="py-12 text-center bg-neutral-950/20 border border-dashed border-neutral-800 rounded-3xl">
                          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 italic font-bold">
                            No payment transactions have been logged for this client yet.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left font-mono text-xs text-neutral-300">
                          <thead>
                            <tr className="border-b border-neutral-800 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                              <th className="py-4 px-4">Settlement Date</th>
                              <th className="py-4 px-4">Billing Statement / Package</th>
                              <th className="py-4 px-4">Payment Method</th>
                              <th className="py-4 px-4">Settled Amount (₹)</th>
                              <th className="py-4 px-4">Reference Notes</th>
                              {userData?.role === 'TRAINER' && <th className="py-4 px-4 text-right">Actions</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-800/40">
                            {allTransactions.map((tx) => (
                              <tr key={tx.id} className="hover:bg-neutral-800/10 transition-colors">
                                <td className="py-4 px-4 text-neutral-200">
                                  {tx.date ? new Date(tx.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                </td>
                                <td className="py-4 px-4 text-white font-display italic tracking-wide uppercase">
                                  {tx.packageName}
                                </td>
                                <td className="py-4 px-4">
                                  <span className="px-2.5 py-1 bg-neutral-950 border border-neutral-850 text-neutral-200 uppercase text-[9px] font-bold rounded-lg tracking-wider">
                                    {tx.method}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-emerald-400 font-bold text-sm">
                                  ₹{Number(tx.amount || 0).toLocaleString()}
                                </td>
                                <td className="py-4 px-4 text-neutral-400 max-w-xs truncate italic">
                                  {tx.notes || '—'}
                                </td>
                                {userData?.role === 'TRAINER' && (
                                  <td className="py-4 px-4 text-right">
                                    {!tx.isImplicit ? (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteTransaction(tx.recordId, tx.id)}
                                        className="text-neutral-500 hover:text-brand-red p-1.5 rounded-lg hover:bg-brand-red/10 transition-all cursor-pointer inline-flex items-center"
                                        title="Delete Transaction Entry"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                                        <span className="text-[8px] font-black uppercase">Delete</span>
                                      </button>
                                    ) : (
                                      <span className="text-[8px] text-neutral-600 font-bold uppercase select-none">
                                        System Settled
                                      </span>
                                    )}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </>
            );
          })()}
        </div>
      </div>
      </>
      )}


      {/* AI engine removed */}

      {/* Delete Item Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-800 border border-neutral-700 p-6 rounded-3xl max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-display italic uppercase tracking-wider text-white mb-2">Delete Record</h3>
            <p className="text-neutral-50 font-bold mb-6">
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

      <VisualWorkoutModal
        isOpen={isWorkoutModalOpen}
        onClose={() => setIsWorkoutModalOpen(false)}
        planTitle={currentWorkoutTitle}
        exercises={currentWorkoutExercises}
        planContent={currentWorkoutContent}
      />

      {generatedPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <h3 className="text-2xl font-display italic uppercase tracking-wider text-white mb-2">Dossier PDF Compiled</h3>
            <p className="text-xs text-neutral-400 font-mono tracking-wide leading-relaxed mb-6">
              Your SpeedFit dossier report is ready. If the automatic file download was sandboxed or blocked by your browser's iframe security, please use the links below to view and download it directly.
            </p>
            
            <div className="flex flex-col space-y-4 mb-6">
              <a 
                href={generatedPdf.blobUrl} 
                download={generatedPdf.filename}
                className="w-full py-4 bg-brand-red hover:bg-red-600 text-white font-mono uppercase tracking-widest text-xs rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 text-center"
              >
                <Download className="w-4 h-4 inline-block" />
                <span>Save Local Copy (PDF)</span>
              </a>

              <a 
                href={generatedPdf.blobUrl} 
                target="_blank" 
                rel="noreferrer"
                className="w-full py-4 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-white font-mono uppercase tracking-widest text-xs rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 text-center"
              >
                <Play className="w-4 h-4 rotate-90 inline-block" />
                <span>Open in New Tab</span>
              </a>
            </div>

            <div className="text-[10px] font-mono text-neutral-500 bg-neutral-950 p-3 rounded-lg border border-neutral-800 leading-normal mb-6">
              <strong className="text-neutral-400 block mb-1">PRO-TIP:</strong>
              If you are working inside the IDE editor window, click <strong className="text-white">"Open in New Tab"</strong> in the top-right of your main workspace first, then click download!
            </div>

            <button 
              onClick={() => setGeneratedPdf(null)}
              className="w-full py-3 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white font-mono uppercase tracking-wider text-[10px] rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ClientProfile;
