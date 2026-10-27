import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { TrainerDashboardCard } from '../../components/TrainerDashboardCard';
import { firebaseService } from '../../services/firebaseService.js';
import { User, WorkoutLog, WorkoutPlan, Testimonial } from '../../types.js';
import { calculateHealthMetrics, getBMIColor } from '../../utils/healthCalculations';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useClients } from '../../hooks/useClients';
import { useAllWorkoutPlans } from '../../hooks/useAllWorkoutPlans';
import { useAllAttendance } from '../../hooks/useAllAttendance';
import { useAllPayments } from '../../hooks/useAllPayments';
import { useAllDietPlans } from '../../hooks/useAllDietPlans';
import { useMessages } from '../../hooks/useMessages';
import { reconcileClientAccounts } from '../../services/accountLinking';
import { 
  Users, 
  ClipboardList, 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  Activity, 
  LogOut, 
  Search, 
  CreditCard, 
  UserPlus, 
  Trash2, 
  Bell, 
  TrendingUp, 
  AlertTriangle, 
  Edit, 
  Check,
  CheckCircle, 
  Play, 
  Star, 
  Quote, 
  Award, 
  Download, 
  Shield, 
  Camera, 
  Image, 
  Zap, 
  X,
  Info,
  Clock,
  Sparkles,
  Copy,
  Flame
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase.js';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, addDays, isSameDay } from 'date-fns';
import { motion } from 'motion/react';
import VisualWorkoutModal from '../../components/VisualWorkoutModal.js';
import { COMMON_EXERCISES } from '../../constants.js';
import { downloadClientReport, exportPaidClientsReport, exportAllInvoicesReport, exportPaymentReceiptToPDF, exportAllClientsBookletToPDF, exportAttendanceReportToPDF } from '../../utils/pdfExporter.js';
import { isGmailAuthorized, authorizeGmail, sendGmailEmail, clearGmailAuthorization } from '../../services/gmailService.js';
import { GoogleCalendarIntegration } from '../../components/GoogleCalendarIntegration.js';
import TrainerLeadsView from './trainer/TrainerLeadsView';


// Helper functions for payment sums
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

interface Props {
  userData: any;
}

const TrainerDashboard: React.FC<Props> = ({ userData }) => {
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';
  const navigate = useNavigate();

  // Core subscribed states
  const { clients, loading: clientsLoading } = useClients(userData?.uid);
  const { plans: workoutPlans } = useAllWorkoutPlans();
  const { attendance: attendanceRecords } = useAllAttendance();
  const { payments: paymentRecords } = useAllPayments();
  const { plans: dietPlans } = useAllDietPlans();
  
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<{ id: string, clientId?: string, type: 'inactive' | 'session' | 'payment' | 'message', title: string, message: string, date: number }[]>([]);
  const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [allDrafts, setAllDrafts] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  // Page filter / interface states
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [clientToRemove, setClientToRemove] = useState<{ id: string, name: string } | null>(null);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', email: '', password: 'speedfit123' });
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [showInactives, setShowInactives] = useState(false);
  const [showAttendanceOverlay, setShowAttendanceOverlay] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'attendance' | 'payment', label: string } | null>(null);
  const [showQuickAttendance, setShowQuickAttendance] = useState<string | null>(null);
  const [showQuickPayment, setShowQuickPayment] = useState<string | null>(null);
  const [selectedClientSummary, setSelectedClientSummary] = useState<User | null>(null);
  
  // Testimonial modal states
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [testimonialForm, setTestimonialForm] = useState({
    clientName: '',
    clientEmail: '',
    achievement: 'Completed Fat Loss Program',
    beforeWeight: '',
    afterWeight: '',
    durationWeeks: '12',
    bodyQuote: '',
    imageUrl: '',
  });

  // Chart tab state
  const [chartType, setChartType] = useState<'clientFlow' | 'attendance'>('clientFlow');

  // Attendance filter state
  const [attendanceFilter, setAttendanceFilter] = useState({ 
    month: format(new Date(), 'MM'), 
    year: format(new Date(), 'yyyy') 
  });
  const [focusedDate, setFocusedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  const [attendanceFilterQuery, setAttendanceFilterQuery] = useState('');
  const [attendanceHistoryQuery, setAttendanceHistoryQuery] = useState('');
  const [quickAttendanceData, setQuickAttendanceData] = useState({ date: format(new Date(), 'yyyy-MM-dd'), status: 'Present' });
  const [quickPaymentData, setQuickPaymentData] = useState({ 
    package: '', 
    packageType: 'Monthly',
    amount: '',
    paymentRate: '',
    numberOfSessions: '',
    startDate: format(new Date(), 'yyyy-MM-dd'), 
    dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'), 
    status: 'Pending' 
  });
  const [selectedAccountsClientId, setSelectedAccountsClientId] = useState('');

  // Trainer Bio specifications form
  const [trainerBioForm, setTrainerBioForm] = useState({
    name: userData?.name || '',
    phoneNumber: userData?.phoneNumber || '',
    bio: userData?.bio || '',
    specialties: userData?.specialties || '',
    certifications: userData?.certifications || '',
    experience: userData?.experience || '',
    photoURL: userData?.photoURL || userData?.avatar || '',
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [copystate, setCopystate] = useState<Record<string, boolean>>({});

  // Active review draft in pending queue
  const [reviewingDraft, setReviewingDraft] = useState<any | null>(null);

  // Visual demonstration modal states
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [currentWorkoutTitle, setCurrentWorkoutTitle] = useState('');
  const [currentWorkoutExercises, setCurrentWorkoutExercises] = useState<{ exercise: string; videoUrl?: string; sets?: string; reps?: string }[]>([]);
  const [currentWorkoutContent, setCurrentWorkoutContent] = useState('');

  // Subscriptions setup
  
  useEffect(() => {
    const unsubscribeLogs = firebaseService.subscribeToWorkoutLogs((logs) => {
      setRecentLogs(logs);
    });

    const unsubscribeRequests = firebaseService.subscribeToRescheduleRequests((requests) => {
      setRescheduleRequests(requests);
    });

    const unsubscribeSessions = firebaseService.subscribeToAllSessions((data) => {
      setSessions(data);
    });

    const unsubscribeDrafts = firebaseService.subscribeToAllPendingDrafts((data) => {
      setAllDrafts(data);
    });

    const unsubscribeTestimonials = firebaseService.subscribeToTestimonials((data) => {
      setTestimonials(data);
    });

    let isLeadsActive = true;
    const fetchTrainerLeads = async () => {
      try {
        const headers: Record<string, string> = {
          'X-User-Role': 'TRAINER',
          'X-User-Email': userData?.email || 'thousiefkhan298@gmail.com'
        };
        const res = await fetch('/api/leads', { headers });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.leads) && isLeadsActive) {
            setLeads(json.leads);
          }
        }
      } catch {}
    };
    fetchTrainerLeads();
    const leadsInterval = setInterval(fetchTrainerLeads, 30000);

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 800);

    return () => {
      unsubscribeLogs();
      unsubscribeRequests();
      unsubscribeSessions();
      unsubscribeDrafts();
      unsubscribeTestimonials();
      isLeadsActive = false;
      clearInterval(leadsInterval);
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync internal form with incoming profile changes
  useEffect(() => {
    if (userData) {
      setTrainerBioForm({
        name: userData.name || '',
        phoneNumber: userData.phoneNumber || '',
        bio: userData.bio || '',
        specialties: userData.specialties || '',
        certifications: userData.certifications || '',
        experience: userData.experience || '',
        photoURL: userData.photoURL || userData.avatar || '',
      });
    }
  }, [userData]);

  // Reconcile and link client accounts when trainer is logged in
  useEffect(() => {
    if (userData?.uid) {
      if (clients.length > 0) {
        reconcileClientAccounts(clients, userData.uid);
      } else {
        const unsubscribe = firebaseService.subscribeToUsers((allUsers) => {
          const clientList = allUsers.filter(u => u.role === 'CLIENT' || !u.role);
          if (clientList.length > 0) {
            reconcileClientAccounts(clientList, userData.uid);
          }
        });
        return () => unsubscribe();
      }
    }
  }, [clients, userData?.uid]);

  // Derived states
  const pendingReviews = useMemo(() => {
    return allDrafts.filter(d => d.status === 'pending_review');
  }, [allDrafts]);


  const currentReviewingDraftFromAll = useMemo(() => {
    if (!reviewingDraft) return null;
    return allDrafts.find(d => d.id === reviewingDraft.id) || reviewingDraft;
  }, [reviewingDraft, allDrafts]);

  const activeClients = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    return clients.filter(c => c.isActive !== false && 
      (q === '' || 
        ((c.name || '').toLowerCase().includes(q)) || 
        ((c.email || '').toLowerCase().includes(q)))
    );
  }, [clients, searchQuery]);

  const inactiveClients = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    return clients.filter(c => c.isActive === false &&                
      (q === '' || 
        ((c.name || '').toLowerCase().includes(q)) || 
        ((c.email || '').toLowerCase().includes(q)))
    );
  }, [clients, searchQuery]);

  const clientStats = useMemo(() => {
    const stats: Record<string, { present: number, total: number, percentage: number, leave: number }> = {};
    clients.forEach(client => {
      const records = attendanceRecords.filter(a => a.clientId === client.id);
      const present = records.filter(a => a.status === 'Present').length;
      const leave = records.filter(a => a.status === 'Missed' || a.status === 'Absent').length;
      const total = records.length;
      stats[client.id] = {
        present,
        total,
        leave,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0
      };
    });
    return stats;
  }, [clients, attendanceRecords]);

  const overallAttendanceMetrics = useMemo(() => {
    const presentCount = attendanceRecords.filter(a => a.status === 'Present').length;
    const total = attendanceRecords.length;
    const rate = total > 0 ? Math.round((presentCount / total) * 100) : 100;
    
    // Calculate most consistent client
    const clientAttendanceCounts: Record<string, number> = {};
    attendanceRecords.forEach(a => {
      if (a.status === 'Present') {
        clientAttendanceCounts[a.clientId] = (clientAttendanceCounts[a.clientId] || 0) + 1;
      }
    });
    let bestClientId = '';
    let maxPresent = 0;
    Object.entries(clientAttendanceCounts).forEach(([cid, count]) => {
      if (count > maxPresent) {
        maxPresent = count;
        bestClientId = cid;
      }
    });
    const bestClient = clients.find(c => c.id === bestClientId);
    
    // Today's stats
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayRecords = attendanceRecords.filter(a => a.date === todayStr);
    const todayPresentCount = todayRecords.filter(a => a.status === 'Present').length;
    const todayLogged = todayRecords.length;
    
    return {
      rate,
      total,
      presentCount,
      missedCount: total - presentCount,
      bestClientName: bestClient?.name || 'No records yet',
      todayPresentCount,
      todayLogged,
      activeClientsCount: clients.filter(c => c.isActive !== false).length
    };
  }, [attendanceRecords, clients]);

  const getDaysInMonthVector = useMemo(() => {
    const year = selectedCalendarDate.getFullYear();
    const month = selectedCalendarDate.getMonth();
    const days: Date[] = [];
    
    // First day of current month
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
    
    // Fill previous month's padding days
    const prevMonthEnd = new Date(year, month, 0).getDate();
    for (let i = dayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthEnd - i));
    }
    
    // Fill current month days
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Fill next month's padding days to make it a multiple of 7
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  }, [selectedCalendarDate]);

  // Active alerts generation algorithms (Dynamic checks for trainer promptness)
  useEffect(() => {
    const list: any[] = [];
    
    // Inactive alert: Client has zero workout logs recorded in past 5 days
    clients.forEach(c => {
      const logs = recentLogs.filter(l => l.clientId === c.id);
      if (logs.length === 0 && c.isActive !== false) {
        list.push({
          id: `inactive_${c.id}`,
          clientId: c.id,
          type: 'inactive',
          title: 'Inactivity Warning',
          message: `${c.name || c.email} has logged zero physical completions of EMS protocols recently.`,
          date: Date.now()
        });
      }
    });

    // Payment warning alert: Package has expired, pending or overdue
    paymentRecords.forEach(p => {
      if (p.status !== 'Paid') {
        const clientObj = clients.find(c => c.id === p.clientId);
        const amountDisplay = p.amount ? `₹${p.amount}` : 'due value';
        list.push({
          id: `payment_${p.id}`,
          clientId: p.clientId,
          type: 'payment',
          title: p.status === 'Overdue' ? 'Overdue Subscription Alert' : 'Pending Subscription Balance',
          message: `${clientObj?.name || 'Recruit'} has an outstanding ${p.status === 'Overdue' ? 'OVERDUE' : 'PENDING'} balance of ${amountDisplay} for package "${p.package}".`,
          date: Date.now()
        });
      }
    });

    // New Lead Submissions Alert
    leads.filter(l => l.status === 'New').forEach(l => {
      const hasFlags = Array.isArray(l.healthFlags) && l.healthFlags.length > 0;
      list.push({
        id: `lead_${l.id}`,
        type: 'message',
        title: hasFlags ? 'New Lead (Health Flags Flagged)' : 'New Lead Assessment',
        message: `${l.contact?.name || 'Recruit'} submitted an assessment for ${l.goals?.primaryGoal || 'transformation'}.${hasFlags ? ` ⚠️ ${l.healthFlags.length} Health Flag(s) flagged.` : ''}`,
        date: l.createdAt ? new Date(l.createdAt).getTime() : Date.now()
      });
    });

    setAlerts(list);
  }, [clients, recentLogs, paymentRecords, leads]);

  // Recharts Client Flow & Monthly Attendance calculations
  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: format(d, 'MMM yy'),
        monthStr: format(d, 'yyyy-MM')
      });
    }

    const clientFlow = months.map((m, idx) => {
      const baseClients = clients.length > 5 ? Math.min(Math.floor(clients.length / 3), 4) : 1;
      const registeredInOrBefore = clients.filter(c => {
        const userObj = c as any;
        if (!userObj.createdAt) return true;
        const clientDateStr = userObj.createdAt.substring(0, 7);
        return clientDateStr <= m.monthStr;
      }).length;
      
      const mockCurve = [2, 3, 5, 8, 12, clients.length || 15][idx];
      const count = clients.length > 0 ? Math.max(registeredInOrBefore, baseClients) : mockCurve;

      return {
        Month: m.label,
        'Active Recruits': count
      };
    });

    const attendanceTrend = months.map((m, idx) => {
      const recordsInMonth = attendanceRecords.filter(a => {
        if (!a.date) return false;
        return a.date.substring(0, 7) === m.monthStr;
      });
      const Present = recordsInMonth.filter(a => a.status === 'Present').length;
      const Missed = recordsInMonth.filter(a => a.status === 'Missed' || a.status === 'Absent').length;
      
      const hasRecords = recordsInMonth.length > 0;
      const mockPresent = [14, 18, 22, 25, 29, 32][idx];
      const mockMissed = [2, 3, 4, 2, 5, 3][idx];

      return {
        Month: m.label,
        Present: hasRecords ? Present : mockPresent,
        Missed: hasRecords ? Missed : mockMissed,
      };
    });

    return {
      clientFlow,
      attendanceTrend
    };
  }, [clients, attendanceRecords]);

  // Handlers
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientData.name || !newClientData.email) return;

    setIsAddingClient(true);
    const assignedPassword = newClientData.password || 'speedfit123';
    try {
      await firebaseService.createClient({
        name: newClientData.name,
        email: (newClientData.email || '').toLowerCase().trim(),
        password: assignedPassword,
        trainerId: userData.uid
      });
      setNewClientData({ name: '', email: '', password: 'speedfit123' });
      setShowAddClientModal(false);
      
      // Beautiful, secure alert displaying the one-time temporary password
      alert(`Athlete invited successfully!\n\nTemporary Login Password: ${assignedPassword}\n\nPlease share this password with the athlete. For security, the password has been hashed in the database and will never be shown again.`);
    } catch (error) {
      console.error(error);
      alert("Failed to add client.");
    } finally {
      setIsAddingClient(false);
    }
  };

  const handleQuickAttendance = async (clientId: string, status?: string) => {
    try {
      await firebaseService.markAttendance({
        clientId,
        date: status ? format(new Date(), 'yyyy-MM-dd') : quickAttendanceData.date,
        status: status || quickAttendanceData.status,
        timestamp: new Date().toISOString()
      });
      setShowQuickAttendance(null);
    } catch (error) {
      console.error("Error marking attendance:", error);
    }
  };

  const handleUpdateTiming = async (id: string, timing: string) => {
    try {
      await firebaseService.updateAttendance(id, { timing });
    } catch (error) {
      console.error("Error updating timing:", error);
    }
  };

  const handleMarkAttendanceForDate = async (clientId: string, date: string, status: 'Present' | 'Missed') => {
    try {
      const record = attendanceRecords.find(a => a.clientId === clientId && a.date === date);
      if (record) {
        await firebaseService.updateAttendance(record.id, {
          status,
          timestamp: new Date().toISOString()
        });
      } else {
        await firebaseService.markAttendance({
          clientId,
          date,
          status,
          timing: status === 'Present' ? format(new Date(), 'hh:mm a') : '',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
    }
  };

  const handleDeleteAttendanceRecord = async (id: string) => {
    try {
      await firebaseService.deleteAttendance(id);
    } catch (error) {
      console.error("Error deleting attendance:", error);
    }
  };

  const handleBulkMarkPresent = async (date: string) => {
    try {
      const activeOnly = clients.filter(c => c.isActive !== false);
      const batchPromises = activeOnly.map(async (client) => {
        const hasRecord = attendanceRecords.find(a => a.clientId === client.id && a.date === date);
        if (!hasRecord) {
          await firebaseService.markAttendance({
            clientId: client.id,
            date,
            status: 'Present',
            timestamp: new Date().toISOString()
          });
        } else if (hasRecord.status !== 'Present') {
          await firebaseService.updateAttendance(hasRecord.id, {
            status: 'Present'
          });
        }
      });
      await Promise.all(batchPromises);
    } catch (error) {
      console.error("Bulk action failed:", error);
    }
  };

  const handleClearAllAttendanceForDate = async (date: string) => {
    if (!window.confirm(`Are you sure you want to clear all attendance marks for ${date}? This cannot be undone.`)) return;
    try {
      const targets = attendanceRecords.filter(a => a.date === date);
      const deletePromises = targets.map(t => firebaseService.deleteAttendance(t.id));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Failed to clear entries:", error);
    }
  };

  const handleQuickPayment = async (clientId: string) => {
    if (isSavingPayment) return;
    setIsSavingPayment(true);
    try {
      await firebaseService.addPaymentRecord({
        clientId,
        ...quickPaymentData,
        createdAt: new Date().toISOString()
      });
      setShowQuickPayment(null);
      setQuickPaymentData({ 
        package: '', 
        packageType: 'Monthly',
        amount: '',
        paymentRate: '',
        numberOfSessions: '',
        startDate: format(new Date(), 'yyyy-MM-dd'), 
        dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'), 
        status: 'Pending' 
      });
      alert('Billing invoice registered!');
    } catch (error) {
      console.error("Error adding payment:", error);
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleToggleActive = async (clientId: string, currentStatus: boolean | undefined) => {
    try {
      await firebaseService.updateUser(clientId, { isActive: currentStatus === false ? true : false });
      alert("Client status toggle completed successfully!");
    } catch (error) {
      console.error("Error toggling active status:", error);
    }
  };

  const handleApproveDraft = async (draft: any) => {
    if (!draft.clientId) return;
    try {
      // 1. Save active workout plan data
      const workoutPlanData = {
        title: "Speed Fit Custom Plan (AI Assisted)",
        clientId: draft.clientId,
        description: "Adaptive EMS training schedule designed specifically for physiological alignment.",
        sections: draft.workoutPlan.sections.map((sec: any) => ({
          title: sec.title || 'Workout Schedule',
          content: sec.content || ''
        })),
        createdAt: new Date().toISOString(),
        isArchived: false,
        approved: false // Trainer must manually verify and release in Client Profile (corrections possible first)
      };
      await firebaseService.saveWorkoutPlan(workoutPlanData);

      // 2. Save active diet plan data
      const dietPlanData = {
        title: "Speed Fit Custom Diet (AI Assisted)",
        clientId: draft.clientId,
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
        approved: false // Trainer must manually verify and release in Client Profile (corrections possible first)
      };
      await firebaseService.saveDietPlan(dietPlanData);

      // 3. Save as approved status in database
      await firebaseService.savePendingDraft({
        ...draft,
        status: 'approved'
      });
      
      setReviewingDraft(null);
      alert("AI Draft imported into Workspace successfully! You can verify, edit, and release it under the Workouts or Diet Plans tab, or directly in the Client Profile.");
    } catch (err) {
      console.error("Error approving draft:", err);
      alert("Failed to approve draft.");
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

  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonialForm.clientName || !testimonialForm.bodyQuote) {
      alert("Please supply at least a name and a quote.");
      return;
    }
    try {
      const payload: Partial<Testimonial> = {
        clientName: testimonialForm.clientName,
        clientEmail: testimonialForm.clientEmail || '',
        achievement: testimonialForm.achievement,
        beforeWeight: testimonialForm.beforeWeight || '',
        afterWeight: testimonialForm.afterWeight || '',
        durationWeeks: testimonialForm.durationWeeks || '',
        bodyQuote: testimonialForm.bodyQuote,
        imageUrl: testimonialForm.imageUrl || '',
        trainerId: userData?.uid || 'trainer_uid',
      };
      if (editingTestimonial?.id) {
        payload.id = editingTestimonial.id;
        payload.createdAt = editingTestimonial.createdAt;
      } else {
        payload.createdAt = new Date().toISOString();
      }
      await firebaseService.saveTestimonial(payload);
      setShowTestimonialModal(false);
      setEditingTestimonial(null);
      setTestimonialForm({
        clientName: '',
        clientEmail: '',
        achievement: 'Completed Fat Loss Program',
        beforeWeight: '',
        afterWeight: '',
        durationWeeks: '12',
        bodyQuote: '',
        imageUrl: '',
      });
      alert('Testimonial Saved!');
    } catch (err) {
      console.error(err);
      alert("Error saving testimonial.");
    }
  };

  // Gmail trainer states
  const [gmailSyncing, setGmailSyncing] = useState<boolean>(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [gmailSuccess, setGmailSuccess] = useState<string | null>(null);
  const [gmailAuthorized, setGmailAuthorized] = useState<boolean>(false);
  const [trainerTargetEmail, setTrainerTargetEmail] = useState<string>('');
  const [trainerEmailSubject, setTrainerEmailSubject] = useState<string>('Speed Fit Custom Workout Alert');
  const [trainerEmailBody, setTrainerEmailBody] = useState<string>('Dear Athlete,\n\nI have successfully loaded a new custom progressive overload profile in your checking panel.\n\nPlease follow layout guidelines carefully.\n\nBest,\nCoach');
  const handleTrainerGmailAuth = async () => {
    try {
      setGmailError(null);
      await authorizeGmail();
      setGmailAuthorized(true);
    } catch (err: any) {
      console.error(err);
      setGmailError(err.message || 'Gmail custom authorization failed.');
    }
  };

  const handleSendTrainerEmail = async () => {
    if (!trainerTargetEmail) {
      setGmailError('Please select or specify a target client email address.');
      return;
    }
    setGmailSyncing(true);
    setGmailError(null);
    setGmailSuccess(null);
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #1e1e24; background-color: #0d0d0f; color: #1E1E24; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <div style="background-color: #141417; padding: 25px 20px; border-bottom: 2px solid #e60000; text-align: center;">
            <p style="color: #e60000; font-family: monospace; font-size: 11px; margin: 0; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">Coach Direct Portal Notification</p>
            <h1 style="color: #ffffff; margin: 5px 0 0 0; font-size: 24px; font-weight: bold; font-style: italic; letter-spacing: -1px; text-transform: uppercase;">SPEED FIT ATHLETICS ALERT</h1>
          </div>
          <!-- Body -->
          <div style="padding: 24px; line-height: 1.6; color: #a1a1aa; font-size: 14px; white-space: pre-line;">
            ${trainerEmailBody}
            
            <div style="margin-top: 30px; text-align: center; border-top: 1px solid #1e1e24; padding-top: 20px;">
              <p style="font-size: 11px; color: #71717a; margin: 0; font-family: monospace; text-transform: uppercase;">CONFIDENTIAL TRANSMISSION</p>
              <p style="font-size: 10px; color: #52525b; margin: 5px 0 0 0;">Speed Fit Trainer Command Center.</p>
            </div>
          </div>
        </div>
      `;

      await sendGmailEmail(trainerTargetEmail, trainerEmailSubject, emailHtml);
      setGmailSuccess(`Message successfully sent to ${trainerTargetEmail}!`);
    } catch (err: any) {
      console.error(err);
      setGmailError(err.message || 'Error occurred while sending coaching email via Gmail.');
    } finally {
      setGmailSyncing(false);
    }
  };

  const handleTrainerGmailLogout = () => {
    clearGmailAuthorization();
    setGmailAuthorized(false);
    setGmailSuccess(null);
  };

  useEffect(() => {
    setGmailAuthorized(isGmailAuthorized());
  }, []);


  if (loading) {
    return (
      <AppLayout>
        <div className="absolute inset-0 flex items-center justify-center bg-[#121214]">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-10 h-10 border-4 border-[#E10600] border-t-transparent rounded-full animate-spin"></div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#B2B2B2] font-bold">Initializing Premium Console...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 pb-10 trainer-dark-theme bg-[#0D0D0F] text-[#F8FAFC]">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#26262B] pb-5">
          <div>
            <div className="flex items-center space-x-1.5 mb-1.5 text-brand-red font-mono text-[10px] uppercase tracking-widest font-bold">
            <span className="w-1.5 h-1.5 bg-brand-red rounded-full"></span>
            <span>Trainer Workspace</span>
          </div>
          <h1 className="text-3xl font-display font-bold italic uppercase tracking-tight text-white">
            Speed Fit <span className="text-brand-red">Dashboard</span>
          </h1>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mt-1">
            Welcome, {userData?.name || 'Coach'}. Managing {clients.length} client accounts.
          </p>
          {userData?.uid && (
            <div className="flex items-center space-x-2 mt-2.5">
              <span className="text-[11px] font-mono text-slate-300 bg-[#141417] border border-[#26262B] px-3 py-1.5 rounded-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-brand-red font-bold">Trainer ID:</span> 
                <code className="text-white font-mono select-all font-semibold">{userData.uid}</code>
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(userData.uid);
                  alert(`Trainer ID copied to clipboard: ${userData.uid}`);
                }}
                className="text-[10px] font-mono text-slate-300 bg-[#18181C] hover:bg-[#222228] border border-[#26262B] px-3 py-2 min-h-[44px] rounded-lg transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
                title="Copy Trainer ID"
                aria-label="Copy Trainer ID"
              >
                <Copy className="w-3 h-3 text-brand-red" /> Copy ID
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3.5">
          <button 
            onClick={() => setShowNotifications(!showNotifications)} 
            aria-label="View system alerts"
            className="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center bg-[#18181C] border border-[#26262B] text-slate-300 hover:text-white rounded-xl relative transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Bell className="w-4 h-4 text-brand-red" />
            {alerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand-red rounded-full border-2 border-[#18181C]"></span>
            )}
          </button>
          <div className="bg-[#18181C] border border-[#26262B] px-4 py-2.5 rounded-xl text-right min-w-[120px] shadow-sm">
            <p className="text-[8px] font-mono text-slate-400 font-bold uppercase tracking-widest">SYSTEM CLOCK</p>
            <p className="text-sm font-semibold text-white font-mono">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
          </div>
        </div>
      </div>

      {/* 1. MAIN OVERVIEW TAB */}
      {currentTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Main counts Board */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <TrainerDashboardCard 
              title="ACTIVE CLIENTS" 
              value={clients.filter(c => c.isActive !== false).length}
              trend="Client accounts active"
              icon={<Users className="w-5 h-5 text-red-500" />}
              onClick={() => navigate('/dashboard?tab=clients')}
            />
            <TrainerDashboardCard 
              title="LEADS PIPELINE" 
              value={leads.length}
              trend={`${leads.filter(l => l.status === 'New').length} new assessment(s)`}
              icon={<Flame className="w-5 h-5 text-amber-500" />}
              onClick={() => navigate('/dashboard?tab=leads')}
            />
            <TrainerDashboardCard 
              title="SYSTEM ALERTS" 
              value={alerts.length}
              trend="Requiring attention"
              icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            />
            <TrainerDashboardCard 
              title="PENDING SESSIONS" 
              value={sessions.filter(s => s.status === 'PENDING' || s.status === 'Pending').length}
              trend="Upcoming session bookings"
              icon={<Calendar className="w-5 h-5 text-emerald-500" />}
              onClick={() => navigate('/dashboard?tab=calendar')}
            />
            <TrainerDashboardCard 
              title="PENDING DRAFTS" 
              value={allDrafts.length}
              trend="Awaiting review"
              icon={<Sparkles className="w-5 h-5 text-amber-500" />}
              onClick={() => navigate('/dashboard?tab=drafts')}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Attendance checklist card */}
            <div className="lg:col-span-2 bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-[#262630] pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider">DAILY CHECK-IN LOGS</h3>
                  <p className="text-xs text-[#64748B] font-mono">Roll-call checklist for high physical accountability.</p>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 font-bold px-3 py-1 rounded">
                  {format(new Date(), 'MMM dd, yyyy')}
                </span>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {activeClients.length === 0 ? (
                  <p className="text-xs text-[#64748B] font-mono p-4 text-center border rounded-xl">No active clients assigned.</p>
                ) : (
                  activeClients.map((client) => {
                    const todayStr = format(new Date(), 'yyyy-MM-dd');
                    const recordObj = attendanceRecords.find(a => a.clientId === client.id && a.date === todayStr);

                    return (
                      <div key={client.id} className="p-3.5 border border-[#262630] rounded-xl flex items-center justify-between bg-[#0D0D0F]">
                        <div>
                          <p className="text-xs font-bold text-white uppercase">{client.name}</p>
                          <p className="text-[9px] font-mono text-[#64748B] mt-0.5">{client.email}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!recordObj ? (
                            <>
                              <button 
                                onClick={() => handleQuickAttendance(client.id, 'Present')}
                                className="px-3 py-1.5 bg-emerald-500 text-white font-mono text-[9px] uppercase font-bold rounded-lg hover:bg-emerald-600 shadow-sm active:scale-95 transition-all"
                              >
                                Present
                              </button>
                              <button 
                                onClick={() => handleQuickAttendance(client.id, 'Missed')}
                                className="px-3 py-1.5 bg-rose-500 text-white font-mono text-[9px] uppercase font-bold rounded-lg hover:bg-rose-600 shadow-sm active:scale-95 transition-all"
                              >
                                Missed
                              </button>
                            </>
                          ) : (
                            <span className={`text-[9px] font-mono px-2.5 py-1 rounded font-bold ${
                              recordObj.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {(recordObj.status || '').toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Client Flow & Monthly Attendance Chart */}
            <div className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#262630] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    {chartType === 'clientFlow' ? 'Client Flow' : 'Monthly Attendance'}
                  </h3>
                  <p className="text-[10px] text-[#64748B] font-mono uppercase">
                    {chartType === 'clientFlow' ? 'Active recruitment curve' : 'Monthly registration status'}
                  </p>
                </div>
                <div className="flex items-center bg-[#1E1E24] p-0.5 rounded-lg shrink-0">
                  <button
                    onClick={() => setChartType('clientFlow')}
                    className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider font-bold rounded-md transition-all cursor-pointer ${
                      chartType === 'clientFlow'
                        ? 'bg-[#141417] text-brand-red shadow-sm'
                        : 'text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    Flow
                  </button>
                  <button
                    onClick={() => setChartType('attendance')}
                    className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider font-bold rounded-md transition-all cursor-pointer ${
                      chartType === 'attendance'
                        ? 'bg-[#141417] text-brand-red shadow-sm'
                        : 'text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    Attendance
                  </button>
                </div>
              </div>

              <div className="h-48">
                {chartType === 'clientFlow' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData.clientFlow}>
                      <defs>
                        <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E60000" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#E60000" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E1E24" />
                      <XAxis dataKey="Month" stroke="#94A3B8" fontSize={9} className="font-mono" />
                      <YAxis stroke="#94A3B8" fontSize={9} className="font-mono" />
                      <Tooltip wrapperClassName="font-mono rounded-xl text-black bg-[#141417]" />
                      <Area type="monotone" dataKey="Active Recruits" stroke="#E60000" strokeWidth={2} fillOpacity={1} fill="url(#colorClients)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData.attendanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E1E24" />
                      <XAxis dataKey="Month" stroke="#94A3B8" fontSize={9} className="font-mono" />
                      <YAxis stroke="#94A3B8" fontSize={9} className="font-mono" />
                      <Tooltip wrapperClassName="font-mono rounded-xl text-black bg-[#141417]" />
                      <Bar dataKey="Present" fill="#10B981" radius={[3, 3, 0, 0]} name="Present" />
                      <Bar dataKey="Missed" fill="#E60000" radius={[3, 3, 0, 0]} name="Missed" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. CLIENTS TAB */}
      {currentTab === 'clients' && (
        <div className="space-y-6">
          <div className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#64748B]" />
                <input 
                  type="text" 
                  placeholder="Query recruits by name or assigned email address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#262630] text-xs font-mono outline-none focus:border-brand-red/50"
                />
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setShowInactives(!showInactives)}
                  className="px-4 py-2 bg-[#1E1E24] hover:bg-slate-200 text-xs font-mono font-bold uppercase rounded-xl transition-all"
                >
                  {showInactives ? 'Hide de-activated' : 'Show de-activated'}
                </button>
                <button 
                  onClick={() => setShowAddClientModal(true)}
                  className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center space-x-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Client</span>
                </button>
              </div>
            </div>



            {/* Client Lists Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeClients.map((client) => {
                const isSecure = !client.password && !client.assignedPassword && client.passwordHash;
                const clientPass = isSecure ? '[Secured for Privacy]' : (client.password || client.assignedPassword || 'speedfit123');
                return (
                  <div key={client.id} className="bg-[#0D0D0F] border border-[#262630] p-5 rounded-[20px] transition-all hover:bg-[#141417] hover:border-brand-red/40 flex flex-col justify-between space-y-4 shadow-sm group">
                    <div className="space-y-3">
                      <div className="space-y-1.55">
                        <div className="flex justify-between items-start">
                          <div className="w-10 h-10 bg-[#141417] border border-[#262630] rounded-xl flex items-center justify-center font-display italic font-bold text-base text-brand-red">
                            {client.name?.[0]?.toUpperCase() || 'R'}
                          </div>
                          <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded">ACTIVE</span>
                        </div>
                        <p className="text-sm font-bold text-white uppercase tracking-wide group-hover:text-brand-red transition-colors">{client.name}</p>
                        <p className="text-[10px] font-mono text-[#64748B] truncate">{client.email}</p>
                      </div>

                      {/* LOGIN CREDENTIAL DISPLAY COUPLER */}
                      <div className="bg-[#0e0e11] text-white p-3.5 rounded-xl border border-neutral-800 space-y-2 font-mono text-[10px]">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                          <span className="text-[8px] text-[#A1A1AA] font-bold uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-brand-red rounded-full animate-ping"></span>
                            🔑 Access Credentials
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigator.clipboard.writeText(`Email: ${client.email}\nPassword: ${isSecure ? '(Please use the secure password set during invitation)' : clientPass}`);
                              alert('Onboarding credentials copied to clipboard!');
                            }}
                            className="text-[8px] bg-white/10 hover:bg-brand-red hover:text-white text-neutral-300 font-bold uppercase px-1.5 py-0.5 rounded transition-all active:scale-95 cursor-pointer"
                          >
                            Copy Secret
                          </button>
                        </div>
                        <div className="space-y-1 text-[9px]">
                          <div className="flex items-center justify-between text-[#A1A1AA]">
                            <span>EMAIL:</span>
                            <span className="text-white font-bold tracking-tight select-all truncate max-w-[130px]">{client.email}</span>
                          </div>
                          <div className="flex items-center justify-between text-[#A1A1AA]">
                            <span>SECRET:</span>
                            <span className={`${isSecure ? 'text-amber-400 font-medium' : 'text-emerald-400 font-extrabold'} select-all tracking-wider`}>{clientPass}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#262630] pt-3 flex items-center justify-between gap-1.5">
                      <Link 
                        to={`/client/${client.id}`}
                        className="px-3 py-2 bg-[#141417] hover:bg-[#1E1E24] text-xs border border-[#262630] text-[#0f172a] font-mono font-bold uppercase tracking-wider rounded-xl transition-all w-full text-center"
                      >
                        Control Profile
                      </Link>
                      <button 
                        onClick={() => handleToggleActive(client.id, client.isActive)}
                        className="p-2 border border-[#262630] rounded-xl hover:bg-rose-50 text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {showInactives && inactiveClients.map((client) => {
                const isSecure = !client.password && !client.assignedPassword && client.passwordHash;
                const clientPass = isSecure ? '[Secured for Privacy]' : (client.password || client.assignedPassword || 'speedfit123');
                return (
                  <div key={client.id} className="bg-[#0D0D0F]/50 border border-dashed border-[#262630] p-5 rounded-[20px] opacity-60 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-bold text-[#64748B] uppercase">{client.name}</h4>
                        <p className="text-[10px] font-mono text-[#64748B] mt-0.5 truncate">{client.email}</p>
                      </div>

                      {/* INACTIVE LOGIN CREDENTIAL BADGE */}
                      <div className="bg-[#0e0e11]/80 text-white p-3 rounded-lg border border-neutral-800 space-y-1.5 font-mono text-[9px]">
                        <div className="flex justify-between text-[#A1A1AA]">
                          <span>EMAIL:</span>
                          <span className="text-white select-all font-bold truncate max-w-[100px]">{client.email}</span>
                        </div>
                        <div className="flex justify-between text-[#A1A1AA]">
                          <span>SECRET:</span>
                          <span className={`${isSecure ? 'text-amber-400 font-medium' : 'text-neutral-300 font-semibold'} select-all`}>{clientPass}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleToggleActive(client.id, client.isActive)}
                      className="py-2 bg-slate-200 hover:bg-slate-350 text-xs font-mono font-bold uppercase rounded-xl"
                    >
                      Activate Recruit
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. CHECK-INS (ATTENDANCE) TAB */}
      {currentTab === 'checkins' && (
        <div className="space-y-6">
          {/* Quick Analytics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#141417] border border-[#262630] p-5 rounded-[20px] shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-brand-red/10 text-brand-red rounded-xl shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider font-bold">Attendance Rate</p>
                <h4 className="text-xl font-bold text-white tracking-tight">{overallAttendanceMetrics.rate}%</h4>
                <p className="text-[9px] font-mono text-emerald-500 mt-0.5">Average overall records</p>
              </div>
            </div>

            <div className="bg-[#141417] border border-[#262630] p-5 rounded-[20px] shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider font-bold">Total Present Marks</p>
                <h4 className="text-xl font-bold text-white tracking-tight">{overallAttendanceMetrics.presentCount} Logs</h4>
                <p className="text-[9px] font-mono text-[#64748B] mt-0.5">{overallAttendanceMetrics.total} registrations total</p>
              </div>
            </div>

            <div className="bg-[#141417] border border-[#262630] p-5 rounded-[20px] shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider font-bold">Today's Checkins</p>
                <h4 className="text-xl font-bold text-white tracking-tight">{overallAttendanceMetrics.todayPresentCount} / {overallAttendanceMetrics.activeClientsCount}</h4>
                <p className="text-[9px] font-mono text-[#64748B] mt-0.5">{overallAttendanceMetrics.todayLogged} logged in database</p>
              </div>
            </div>

            <div className="bg-[#141417] border border-[#262630] p-5 rounded-[20px] shadow-sm flex items-center space-x-4 flex-1">
              <div className="p-3 bg-brand-red/10 text-brand-red rounded-xl shrink-0">
                <Star className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider font-bold">Most Consistent Client</p>
                <h4 className="text-sm font-bold text-white truncate tracking-tight">{overallAttendanceMetrics.bestClientName}</h4>
                <p className="text-[9px] font-mono text-brand-red mt-0.5 truncate">Highest attendance count</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Interactive Monthly Calendar Planner card (Column width: 7) */}
            <div className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm lg:col-span-7 space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-2 border-b border-[#262630]">
                <div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Attendance Calendar</h3>
                  <p className="text-[10px] text-[#64748B] font-mono">Select a grid segment to display log entries.</p>
                </div>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => setSelectedCalendarDate(new Date(selectedCalendarDate.getFullYear(), selectedCalendarDate.getMonth() - 1, 1))}
                    className="p-1.5 border border-[#262630] hover:bg-[#0D0D0F] rounded-lg text-white cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 text-white min-w-[120px] text-center">
                    {format(selectedCalendarDate, 'MMMM yyyy')}
                  </span>
                  <button 
                    onClick={() => setSelectedCalendarDate(new Date(selectedCalendarDate.getFullYear(), selectedCalendarDate.getMonth() + 1, 1))}
                    className="p-1.5 border border-[#262630] hover:bg-[#0D0D0F] rounded-lg text-white cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedCalendarDate(new Date());
                      setFocusedDate(format(new Date(), 'yyyy-MM-dd'));
                    }}
                    className="ml-2 px-2.5 py-1.5 border border-[#262630] hover:bg-[#0D0D0F] rounded-lg text-[9px] font-mono font-bold uppercase text-white cursor-pointer"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Grid Header Days */}
              <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px] uppercase font-bold tracking-wider text-[#64748B] border-b border-[#1E1E24] pb-2">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Calendar Days Matrix */}
              <div className="grid grid-cols-7 gap-1.5">
                {getDaysInMonthVector.map((dateItem, idx) => {
                  const dateStr = format(dateItem, 'yyyy-MM-dd');
                  const isCurrentMonth = dateItem.getMonth() === selectedCalendarDate.getMonth();
                  const isFocused = dateStr === focusedDate;
                  const isTodayItem = dateStr === format(new Date(), 'yyyy-MM-dd');
                  
                  // Filter records for this day
                  const dayRecords = attendanceRecords.filter(a => a.date === dateStr);
                  const presentCount = dayRecords.filter(a => a.status === 'Present').length;
                  const totalCount = dayRecords.length;
                  const missedCount = totalCount - presentCount;

                  return (
                    <button
                      key={idx}
                      onClick={() => setFocusedDate(dateStr)}
                      className={`min-h-[58px] p-2 border text-left rounded-xl transition-all flex flex-col justify-between relative group cursor-pointer ${
                        isCurrentMonth 
                          ? 'bg-[#0D0D0F]/50 border-[#262630] hover:border-brand-red/40 hover:bg-brand-red/5' 
                          : 'bg-[#1E1E24]/20 text-slate-300 border-dashed border-slate-250 opacity-50'
                      } ${isFocused ? 'ring-2 ring-brand-red border-brand-red bg-red-50/10' : ''}`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={`text-[10px] font-mono font-bold ${
                          isTodayItem ? 'bg-brand-red text-white px-1.5 py-0.5 rounded font-extrabold' : 'text-white'
                        }`}>
                          {dateItem.getDate()}
                        </span>
                        
                        {totalCount > 0 && (
                          <span className="text-[8px] font-mono font-bold bg-[#262630] text-[#0f172a] px-1 rounded-sm">
                            {totalCount}
                          </span>
                        )}
                      </div>

                      {/* Small visual indicator tags for logged records */}
                      <div className="space-y-1 w-full mt-1">
                        {totalCount > 0 ? (
                          <div className="flex flex-wrap gap-0.5">
                            {Array.from({ length: Math.min(presentCount, 4) }).map((_, i) => (
                              <div key={`p-${i}`} className="w-1.5 h-1.5 bg-emerald-500 rounded-full" title="Present" />
                            ))}
                            {Array.from({ length: Math.min(missedCount, 4) }).map((_, i) => (
                              <div key={`m-${i}`} className="w-1.5 h-1.5 bg-rose-500 rounded-full" title="Missed" />
                            ))}
                            {presentCount > 4 && <span className="text-[7px] text-[#64748B] font-mono leading-none">+</span>}
                          </div>
                        ) : (
                          <div className="border-b border-transparent h-1.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daily Log Check-in Controller Column (Column width: 5) */}
            <div className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm lg:col-span-5 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start border-b border-[#262630] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                      Roster Registry
                    </h3>
                    <p className="text-[10px] text-brand-red font-mono font-bold">
                      Date: {format(new Date(focusedDate + 'T00:00:00'), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  
                  {/* Embedded date selector widget */}
                  <div className="relative">
                    <input 
                      type="date" 
                      value={focusedDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setFocusedDate(e.target.value);
                          setSelectedCalendarDate(new Date(e.target.value));
                        }
                      }}
                      className="border border-[#262630] text-[10px] font-mono font-bold uppercase rounded-lg px-2 py-1 text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>
                </div>

                {/* Local search filter for the Roster checklist */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#64748B]" />
                  <input
                    type="text"
                    placeholder="Search recruits..."
                    value={attendanceFilterQuery}
                    onChange={(e) => setAttendanceFilterQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-[#262630] rounded-xl text-[10px] font-mono outline-none focus:border-brand-red/45 text-white"
                  />
                </div>

                {/* Roster Athletes Checklist area */}
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {clients
                    .filter(c => c.isActive !== false)
                    .filter(c => {
                      const q = (attendanceFilterQuery || '').toLowerCase().trim();
                      if (!q) return true;
                      return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
                    })
                    .map((client) => {
                      const dayRecord = attendanceRecords.find(a => a.clientId === client.id && a.date === focusedDate);
                      const isPresent = dayRecord?.status === 'Present';
                      const isMissed = dayRecord?.status === 'Missed';

                      return (
                        <div key={client.id} className="p-3 border border-[#262630] bg-[#0D0D0F]/60 rounded-xl flex items-center justify-between group hover:bg-[#141417] transition-all">
                          <div className="min-w-0 flex-1 mr-3">
                            <p className="text-[11px] font-bold text-white uppercase truncate">{client.name}</p>
                            <div className="text-[9px] font-mono text-[#64748B] truncate mt-0.5">
                              {dayRecord ? (
                                <span className={isPresent ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                                  ● {(dayRecord.status || '').toUpperCase()}
                                </span>
                              ) : (
                                <span className="text-[#A1A1AA] font-bold">○ UNMARKED</span>
                              )}
                            </div>
                            {isPresent && dayRecord && (
                              <div className="flex items-center space-x-1.5 mt-2 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 w-fit">
                                <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="text-[9px] text-emerald-700 font-bold uppercase shrink-0">Timing:</span>
                                <input 
                                  type="text" 
                                  placeholder="e.g. 09:00 AM" 
                                  value={dayRecord.timing || ''} 
                                  onChange={(e) => handleUpdateTiming(dayRecord.id, e.target.value)}
                                  className="w-20 px-1 py-0.5 border border-slate-250 focus:border-brand-red rounded font-mono text-[9px] outline-none bg-[#141417] font-bold text-white"
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => handleMarkAttendanceForDate(client.id, focusedDate, 'Present')}
                              className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider font-bold transition-all border cursor-pointer ${
                                isPresent 
                                  ? 'bg-[#EBFDF5] text-emerald-850 hover:bg-[#EBFDF5] border-emerald-300 font-black shadow-[0_1px_3px_rgba(16,185,129,0.1)]' 
                                  : 'bg-[#141417] hover:bg-[#EBFDF5]/40 text-[#A1A1AA] border-[#262630]'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleMarkAttendanceForDate(client.id, focusedDate, 'Missed')}
                              className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider font-bold transition-all border cursor-pointer ${
                                isMissed 
                                  ? 'bg-[#FEF2F2] text-rose-850 hover:bg-[#FEF2F2] border-rose-300 font-black shadow-[0_1px_3px_rgba(239,68,68,0.1)]' 
                                  : 'bg-[#141417] hover:bg-[#FEF2F2]/40 text-[#A1A1AA] border-[#262630]'
                              }`}
                            >
                              Missed
                            </button>
                            
                            {dayRecord && (
                              <button
                                onClick={() => handleDeleteAttendanceRecord(dayRecord.id)}
                                className="p-1 text-[#A1A1AA] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-transparent cursor-pointer"
                                title="Delete attendance entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {clients.filter(c => c.isActive !== false).length === 0 && (
                    <p className="text-xs text-center p-4 font-mono text-[#A1A1AA]">No active clients onboarded on system.</p>
                  )}
                </div>
              </div>

              {/* Bulk operations panel */}
              <div className="bg-[#0D0D0F] border border-[#262630] p-4 rounded-xl space-y-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] font-bold">Roster Bulk Operations</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleBulkMarkPresent(focusedDate)}
                    className="py-1.5 px-3 bg-[#EBFDF5] hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[9px] font-mono font-bold uppercase rounded-xl transition-all cursor-pointer"
                  >
                    Mark All Present
                  </button>
                  <button
                    onClick={() => handleClearAllAttendanceForDate(focusedDate)}
                    className="py-1.5 px-3 bg-[#FEF2F2] hover:bg-rose-100 border border-rose-200 text-rose-800 text-[9px] font-mono font-bold uppercase rounded-xl transition-all cursor-pointer"
                  >
                    Purge All Logs
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Registry Flow of Last 10 records */}
          <div className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Live Check-in Ledger</h3>
                <p className="text-[10px] text-[#64748B] font-mono">Stream containing the latest recorded attendance marks across all clients.</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Filter by athlete name..."
                  value={attendanceHistoryQuery}
                  onChange={(e) => setAttendanceHistoryQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 border border-[#262630] rounded-xl text-[10px] font-mono outline-none focus:border-brand-red/40 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[300px] overflow-y-auto pr-1">
              {attendanceRecords
                .filter((record) => {
                  const athlete = clients.find(c => c.id === record.clientId);
                  if (!athlete) return false;
                  const q = (attendanceHistoryQuery || '').toLowerCase().trim();
                  if (!q) return true;
                  return (athlete.name || '').toLowerCase().includes(q) || (athlete.email || '').toLowerCase().includes(q);
                })
                .sort((a, b) => new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime() || new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
                .slice(0, 20)
                .map((record) => {
                  const athleteObj = clients.find(c => c.id === record.clientId);
                  if (!athleteObj) return null;

                  return (
                    <div key={record.id} className="p-3 border border-[#262630] rounded-xl flex items-center justify-between bg-[#0D0D0F] text-xs font-mono group hover:bg-[#141417] transition-all">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-red/10 flex items-center justify-center text-brand-red font-bold font-display italic shrink-0">
                          {athleteObj.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#0f172a] uppercase truncate">{athleteObj.name || 'Athlete recruit'}</p>
                          <p className="text-[10px] text-[#64748B] mt-0.5">Logged: {format(new Date(record.date + 'T00:00:00'), 'MMM dd, yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className={`text-[9px] font-mono px-2.5 py-1 rounded font-bold ${
                          record.status === 'Present' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {(record.status || '').toUpperCase()}
                        </span>
                        <button
                          onClick={() => handleDeleteAttendanceRecord(record.id)}
                          className="text-[#A1A1AA] hover:text-rose-600 transition-colors p-1.5 opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Purge Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

              {attendanceRecords.length === 0 && (
                <p className="text-xs text-[#64748B] font-mono p-6 text-center border border-dashed rounded-xl col-span-2">No historical attendance logs found on record.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. PENDING DRAFTS (VALIDATIONS) TAB */}
      {currentTab === 'drafts' && (
        <div className="space-y-6">
          {reviewingDraft ? (
            <div className="space-y-4">
              <button 
                onClick={() => setReviewingDraft(null)}
                className="px-4 py-2 border border-[#262630] hover:bg-[#1E1E24] font-mono text-[10px] uppercase font-bold rounded-xl transition-all"
              >
                ← Back to Draft Queue
              </button>
              
              {/* AI engine removed */}
            </div>
          ) : (
            <div className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider">PENDING REVIEW SYSTEM QUEUE</h3>
                <p className="text-xs text-[#64748B] font-mono">Requires human certified coach validation before launching workout & nutrition plans.</p>
              </div>

              <div className="space-y-3">
                {pendingReviews.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-[#262630] rounded-2xl bg-[#0D0D0F]">
                    <Zap className="w-8 h-8 text-slate-300 mx-auto animate-pulse mb-2.5" />
                    <p className="font-mono text-xs uppercase text-[#64748B]">Zero drafts awaiting human validation.</p>
                  </div>
                ) : (
                  pendingReviews.map((draft) => {
                    const recruitObj = clients.find(c => c.id === draft.clientId);

                    return (
                      <div key={draft.id} className="p-4 border border-[#262630] rounded-xl flex items-center justify-between bg-[#0D0D0F] font-mono text-xs">
                        <div>
                          <p className="font-bold text-white uppercase">{recruitObj?.name || 'Recruit Blueprint'}</p>
                          <p className="text-[10px] text-[#64748B] mt-0.5">Calories target: {draft.dietPlan?.calories} kcal / Protein: {draft.dietPlan?.protein}g</p>
                        </div>
                        <button 
                          onClick={() => setReviewingDraft(draft)}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-mono text-[9px] uppercase font-bold rounded-lg transition-all"
                        >
                          Review & Edit Draft
                        </button>
                      </div>
                    );
                  })
                )}
              </div>


            </div>
          )}
        </div>
      )}

      {/* 5. WORKOUTS (PROGRAM INDEX) TAB */}
      {(currentTab === 'workouts' || currentTab === 'plans') && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-6"
        >
          <div>
            <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider">PRESET ACTIVE WORKOUT SCHEMES</h3>
            <p className="text-xs text-[#64748B] font-mono">Roster of custom plans deployed on client profiles on platform databases.</p>
          </div>

          {workoutPlans.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="p-12 text-center border border-dashed border-[#262630] rounded-2xl bg-[#0D0D0F]"
            >
              <ClipboardList className="w-8 h-8 text-slate-350 mx-auto animate-bounce mb-3" />
              <p className="font-mono text-xs text-[#64748B] uppercase">No workout plans recorded in database yet.</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workoutPlans.map((plan, i) => {
                const clientObj = clients.find(c => c.id === plan.clientId);

                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                    whileHover={{ y: -4, transition: { duration: 0.15 } }}
                    key={plan.id} 
                    className="p-4 border border-[#262630] rounded-2xl bg-[#0D0D0F] space-y-3.5 transition-shadow hover:shadow-md"
                  >
                    <div className="flex justify-between items-start border-b border-[#262630] pb-2">
                      <div>
                        <p className="text-xs font-bold text-[#0f172a] uppercase">{plan.title || "Prestige Plan"}</p>
                        <p className="text-[9px] font-mono text-[#64748B] mt-0.5">For recruit: {clientObj?.name || 'Assigned'}</p>
                      </div>
                      {plan.approved ? (
                        <span className="text-[9px] font-mono bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> READY FOR CLIENT
                        </span>
                      ) : plan.approvalStatus === 'revision' ? (
                        <span className="text-[9px] font-mono bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> PENDING REVISION
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> DRAFT / PENDING
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] font-mono uppercase truncate">{plan.description}</p>

                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSetWorkoutPlanStatus(plan, 'ready')}
                          disabled={plan.approved}
                          className={`flex-1 text-center py-1.5 font-mono text-[9px] uppercase tracking-wider font-bold rounded-lg transition-all ${
                            plan.approved 
                              ? "bg-[#1E1E24] text-[#A1A1AA] cursor-not-allowed border border-[#262630]" 
                              : "bg-emerald-600 hover:bg-emerald-705 text-white shadow-sm"
                          }`}
                        >
                          {plan.approved ? "Released & Live" : "Approve Plan"}
                        </button>
                        <button
                          onClick={() => handleSetWorkoutPlanStatus(plan, 'revision')}
                          className={`flex-1 text-center py-1.5 font-mono text-[9px] uppercase tracking-wider font-bold rounded-lg transition-all ${
                            plan.approvalStatus === 'revision'
                              ? "bg-rose-50 text-rose-500 border border-rose-200"
                              : "bg-[#1E1E24] hover:bg-slate-200 text-white border border-[#262630]"
                          }`}
                        >
                          {plan.approvalStatus === 'revision' ? "Pending Revision" : "Mark Revision"}
                        </button>
                      </div>
                      <Link
                        to={`/client/${plan.clientId}?tab=plans`}
                        className="text-center py-1.5 bg-[#1E1E24] hover:bg-neutral-200 text-white border border-[#262630] font-mono text-[9px] uppercase tracking-wider font-bold rounded-lg transition-all"
                      >
                        Verify, Edit & Update
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* 6. DIET PLANS TAB */}
      {currentTab === 'dietplans' && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-6"
        >
          <div>
            <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider">DIET PLANS CATALOGUE</h3>
            <p className="text-xs text-[#64748B] font-mono">Active macronutrient indices and timelines registered on platform records.</p>
          </div>

          {dietPlans.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="p-12 text-center border border-dashed border-[#262630] rounded-2xl bg-[#0D0D0F]"
            >
              <ClipboardList className="w-8 h-8 text-slate-350 mx-auto animate-bounce mb-3" />
              <p className="font-mono text-xs text-[#64748B] uppercase">No diet plans recorded in database yet.</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dietPlans.map((plan, i) => {
                const clientObj = clients.find(c => c.id === plan.clientId);

                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                    whileHover={{ y: -4, transition: { duration: 0.15 } }}
                    key={plan.id} 
                    className="p-4 border border-[#262630] rounded-2xl bg-[#0D0D0F] space-y-3.5 transition-shadow hover:shadow-md"
                  >
                    <div className="flex justify-between items-start border-b border-[#262630] pb-2">
                      <div>
                        <p className="text-xs font-bold text-[#0f172a] uppercase">{plan.title || "Prestige Diet Strategy"}</p>
                        <p className="text-[9px] font-mono text-[#64748B] mt-0.5">For recruit: {clientObj?.name || 'Assigned'}</p>
                      </div>
                      {plan.approved ? (
                        <span className="text-[9px] font-mono bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> READY FOR CLIENT
                        </span>
                      ) : plan.approvalStatus === 'revision' ? (
                        <span className="text-[9px] font-mono bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> PENDING REVISION
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> DRAFT / PENDING
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 text-center bg-[#141417] p-2 rounded-xl border border-[#262630]">
                      <div>
                        <p className="text-[8px] font-mono text-[#64748B] uppercase">Kcal</p>
                        <p className="text-xs font-extrabold text-white font-mono mt-0.5">{plan.calories || 2000}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-mono text-brand-red uppercase">Protein</p>
                        <p className="text-xs font-extrabold text-white font-mono mt-0.5">{plan.protein || 150}g</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-mono text-amber-600 uppercase">Carb</p>
                        <p className="text-xs font-extrabold text-white font-mono mt-0.5">{plan.carbs || 180}g</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-mono text-emerald-600 uppercase">Fat</p>
                        <p className="text-xs font-extrabold text-white font-mono mt-0.5">{plan.fats || 60}g</p>
                      </div>
                    </div>

                    <p className="text-xs text-[#64748B] font-mono uppercase truncate">{plan.description}</p>

                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSetDietPlanStatus(plan, 'ready')}
                          disabled={plan.approved}
                          className={`flex-1 text-center py-1.5 font-mono text-[9px] uppercase tracking-wider font-bold rounded-lg transition-all ${
                            plan.approved 
                              ? "bg-[#1E1E24] text-[#A1A1AA] cursor-not-allowed border border-[#262630]" 
                              : "bg-emerald-600 hover:bg-emerald-705 text-white shadow-sm"
                          }`}
                        >
                          {plan.approved ? "Released & Live" : "Approve Plan"}
                        </button>
                        <button
                          onClick={() => handleSetDietPlanStatus(plan, 'revision')}
                          className={`flex-1 text-center py-1.5 font-mono text-[9px] uppercase tracking-wider font-bold rounded-lg transition-all ${
                            plan.approvalStatus === 'revision'
                              ? "bg-rose-50 text-rose-500 border border-rose-200"
                              : "bg-[#1E1E24] hover:bg-slate-200 text-white border border-[#262630]"
                          }`}
                        >
                          {plan.approvalStatus === 'revision' ? "Pending Revision" : "Mark Revision"}
                        </button>
                      </div>
                      <Link
                        to={`/client/${plan.clientId}?tab=plans`}
                        className="text-center py-1.5 bg-[#1E1E24] hover:bg-neutral-200 text-white border border-[#262630] font-mono text-[9px] uppercase tracking-wider font-bold rounded-lg transition-all"
                      >
                        Verify, Edit & Update
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* 7. REPORTS DOWNLOAD TAB */}
      {currentTab === 'reports' && (
        <div className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider">COACHES REPORTING DESK</h3>
            <p className="text-xs text-[#64748B] font-mono">Download standard progress summaries, posture reviews, or payment metrics PDFs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-[#262630] bg-[#0D0D0F] rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#0f172a] uppercase">Aggregate Payments Audit</p>
                <p className="text-[9px] font-mono text-[#64748B] mt-0.5">Export PDF of overall collections list.</p>
              </div>
              <button 
                onClick={() => exportPaidClientsReport(paymentRecords, clients)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-[9px] uppercase font-bold rounded-lg transition-all"
              >
                Export PDF
              </button>
            </div>

            <div className="p-4 border border-[#262630] bg-[#0D0D0F] rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#0f172a] uppercase">Master Invoices Summary</p>
                <p className="text-[9px] font-mono text-[#64748B] mt-0.5">Export PDF invoice detailing payment histories and outstanding dues of all clients.</p>
              </div>
              <button 
                onClick={() => exportAllInvoicesReport(paymentRecords, clients)}
                className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white font-mono text-[9px] uppercase font-bold rounded-lg transition-all"
              >
                Export Invoices PDF
              </button>
            </div>

            <div className="p-4 border border-[#262630] bg-[#0D0D0F] rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#0f172a] uppercase">All Athletes Profiles Booklet</p>
                <p className="text-[9px] font-mono text-[#64748B] mt-0.5">Compile detailed multi-page PDF workbook of all client dossiers.</p>
              </div>
              <button 
                onClick={() => exportAllClientsBookletToPDF(clients)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-[9px] uppercase font-bold rounded-lg transition-all"
              >
                Export Booklet PDF
              </button>
            </div>

            <div className="p-4 border border-[#262630] bg-[#0D0D0F] rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#0f172a] uppercase">Attendance Registry Journal</p>
                <p className="text-[9px] font-mono text-[#64748B] mt-0.5">Export PDF of overall arrival times, slots, and marked attendances.</p>
              </div>
              <button 
                onClick={() => exportAttendanceReportToPDF(attendanceRecords, clients)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-[9px] uppercase font-bold rounded-lg transition-all"
              >
                Export Attendance PDF
              </button>
            </div>

            <div className="p-4 border border-[#262630] bg-[#0D0D0F] rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#0f172a] uppercase">transformation testimonials</p>
                <p className="text-[9px] font-mono text-[#64748B] mt-0.5">Edit and upload new success reviews.</p>
              </div>
              <button 
                onClick={() => {
                  setTestimonialForm({
                    clientName: '',
                    clientEmail: '',
                    achievement: 'Completed Fat Loss Program',
                    beforeWeight: '',
                    afterWeight: '',
                    durationWeeks: '12',
                    bodyQuote: '',
                    imageUrl: '',
                  });
                  setEditingTestimonial(null);
                  setShowTestimonialModal(true);
                }}
                className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white font-mono text-[9px] uppercase font-bold rounded-lg transition-all"
              >
                Manage Testimonials
            </button>
          </div>
        </div>

          {/* GMAIL BROADCAST & COMMUNICATIONS HUB */}
          <div className="mt-8 pt-6 border-t border-[#262630]">
            <h4 className="text-sm font-bold text-white font-mono uppercase tracking-widest text-brand-red mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-red rounded-full animate-ping"></span>
              Gmail Broadcast & Communications Center
            </h4>

            {gmailError && (
              <p className="mb-4 text-[10px] font-mono text-rose-500 font-bold uppercase tracking-wider bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                ⚠️ Gmail Error: {gmailError}
              </p>
            )}

            {gmailSuccess && (
              <p className="mb-4 text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-wider bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                ✓ System Success: {gmailSuccess}
              </p>
            )}

            {!gmailAuthorized ? (
              <div className="p-5 border border-[#262630] rounded-2xl bg-[#0D0D0F] flex flex-col items-center justify-center text-center space-y-4">
                <p className="text-xs text-[#64748B] font-mono leading-relaxed">
                  Link your primary Google Mail account to write customized workout digests, meal programs, or bio alerts directly from your command seat.
                </p>
                <button
                  onClick={handleTrainerGmailAuth}
                  className="px-6 py-3 bg-[#141417] border border-[#dadce0] rounded-xl hover:bg-[#0D0D0F] transition-all cursor-pointer flex items-center gap-2.5 shadow-sm active:scale-95"
                >
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0 block">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span className="uppercase text-[#3C4043] font-mono text-[10px] font-bold tracking-wider">Link Gmail Outbox</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 border border-[#262630] p-5 rounded-2xl bg-[#0D0D0F]/50">
                <div className="flex items-center justify-between border-b border-[#262630] pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-widest">Coaching Channel Active</span>
                  </div>
                  <button
                    onClick={handleTrainerGmailLogout}
                    className="text-[10px] font-mono font-bold text-rose-500 hover:underline uppercase"
                  >
                    Disconnect Channel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-[10px] font-mono text-[#64748B] uppercase block font-bold">Recipient Athlete</label>
                    <select
                      value={trainerTargetEmail}
                      onChange={(e) => setTrainerTargetEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-[#141417] border border-[#262630] rounded-lg text-xs font-mono outline-none"
                    >
                      <option value="">-- Choose Athlete --</option>
                      {clients.map(cl => (
                        <option key={cl.id} value={cl.email}>{cl.name} ({cl.email})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-mono text-[#64748B] uppercase block font-bold">Email Subject</label>
                    <input
                      type="text"
                      value={trainerEmailSubject}
                      onChange={(e) => setTrainerEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-[#141417] border border-[#262630] rounded-lg text-xs font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-[#64748B] uppercase block font-bold">Performance Summary / Digest Content</label>
                  <textarea
                    rows={5}
                    value={trainerEmailBody}
                    onChange={(e) => setTrainerEmailBody(e.target.value)}
                    className="w-full p-3 bg-[#141417] border border-[#262630] rounded-lg text-xs font-mono outline-none leading-relaxed"
                    placeholder="Enter email message body..."
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSendTrainerEmail}
                    disabled={gmailSyncing || !trainerTargetEmail}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-mono text-[10px] uppercase font-bold rounded-lg transition-all disabled:opacity-50 active:scale-95 inline-flex items-center gap-2 shadow-sm"
                  >
                    {gmailSyncing ? 'Broadcasting...' : 'Broadcast Coaching Email Via Gmail'}
                  </button>
                </div>
              </div>
            )}
          </div>


        </div>
      )}

      {/* 8. PAYMENTS (LEDGER) TAB */}
      {currentTab === 'payments' && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b pb-3 mb-3 gap-3">
            <div>
              <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider">SUBSCRIPTION BILLING LEDGER</h3>
              <p className="text-xs text-[#64748B] font-mono">Invoice registries, receipts downloads, and client renew controls.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => exportAllInvoicesReport(paymentRecords, clients)}
                className="px-3.5 py-1.5 bg-neutral-900 text-white text-[10px] font-mono font-bold uppercase rounded-lg hover:bg-neutral-800 transition-all shadow-sm flex items-center space-x-1 cursor-pointer"
                title="Download master PDF of all clients' invoice payment records"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Master Invoice PDF</span>
              </button>
              <button
                onClick={() => setShowQuickPayment(showQuickPayment ? null : 'active')}
                className="px-3.5 py-1.5 bg-brand-red text-white text-[10px] font-mono font-bold uppercase rounded-lg hover:bg-neutral-900 transition-all shadow-sm cursor-pointer"
              >
                {showQuickPayment ? 'Close Form ✕' : '➕ Record Payment'}
              </button>
            </div>
          </div>

          {showQuickPayment && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-[#0D0D0F] border border-[#262630] p-5 rounded-2xl space-y-4 text-xs font-mono"
            >
              <div>
                <h4 className="text-sm font-bold text-white font-display uppercase tracking-wider">Record Membership Payment</h4>
                <p className="text-[10px] text-[#64748B]">Fill in amount, due date and package info to register billing.</p>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!selectedAccountsClientId) {
                    alert("Please select an athletic profile from dropdown.");
                    return;
                  }
                  if (!quickPaymentData.amount || !quickPaymentData.package) {
                    alert("Please insert valid Amount and Package name.");
                    return;
                  }

                  try {
                    setIsSavingPayment(true);
                    await firebaseService.addPaymentRecord({
                      clientId: selectedAccountsClientId,
                      package: quickPaymentData.package,
                      packageType: quickPaymentData.packageType,
                      amount: quickPaymentData.amount,
                      startDate: quickPaymentData.startDate,
                      dueDate: quickPaymentData.dueDate,
                      status: quickPaymentData.status,
                      createdAt: new Date().toISOString()
                    });
                    
                    // Reset
                    setQuickPaymentData({
                      package: '',
                      packageType: 'Monthly',
                      amount: '',
                      paymentRate: '',
                      numberOfSessions: '',
                      startDate: format(new Date(), 'yyyy-MM-dd'),
                      dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                      status: 'Pending'
                    });
                    setSelectedAccountsClientId('');
                    setShowQuickPayment(null);
                    alert("Transaction recorded successfully!");
                  } catch (err: any) {
                    alert("Record failure: " + (err.message || err));
                  } finally {
                    setIsSavingPayment(false);
                  }
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
              >
                <div className="space-y-1 col-span-1 md:col-span-2">
                  <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Package Template Presets</label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'monthly') {
                        setQuickPaymentData({
                          ...quickPaymentData,
                          package: 'Monthly EMS Training (8 Sessions)',
                          packageType: 'Monthly',
                          amount: '5000',
                          paymentRate: '625',
                          numberOfSessions: '8',
                          dueDate: format(addDays(new Date(quickPaymentData.startDate), 30), 'yyyy-MM-dd')
                        });
                      } else if (val === 'session') {
                        setQuickPaymentData({
                          ...quickPaymentData,
                          package: 'Elite Session-Based EMS Pack (20 Sessions)',
                          packageType: 'Session-Based',
                          amount: '12000',
                          paymentRate: '600',
                          numberOfSessions: '20',
                          dueDate: format(addDays(new Date(quickPaymentData.startDate), 30), 'yyyy-MM-dd')
                        });
                      } else if (val === 'transformation') {
                        setQuickPaymentData({
                          ...quickPaymentData,
                          package: '3 Months Body Transformation Program (24 Sessions)',
                          packageType: '3 Months Transformation',
                          amount: '24000',
                          paymentRate: '1000',
                          numberOfSessions: '24',
                          dueDate: format(addDays(new Date(quickPaymentData.startDate), 90), 'yyyy-MM-dd')
                        });
                      }
                    }}
                    className="w-full p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-white font-bold"
                  >
                    <option value="">-- Choose Package Preset (Or custom type below) --</option>
                    <option value="monthly">Monthly EMS Training (₹5,000 / 8 Sessions)</option>
                    <option value="session">Elite Session-Based Pack (₹12,000 / 20 Sessions)</option>
                    <option value="transformation">3 Months Body Transformation (₹24,000 / 24 Sessions)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Select Athlete</label>
                  <select
                    value={selectedAccountsClientId}
                    onChange={(e) => setSelectedAccountsClientId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-[#141417] border border-[#262630] rounded-lg text-white"
                  >
                    <option value="">-- Choose Athlete --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Billing Package Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMS 12-Sessions Membership"
                    value={quickPaymentData.package}
                    onChange={(e) => setQuickPaymentData({...quickPaymentData, package: e.target.value})}
                    className="w-full p-2.5 bg-[#141417] border border-[#262630] rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 col-span-1 md:col-span-2">
                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      placeholder="Amount in ₹"
                      value={quickPaymentData.amount}
                      onChange={(e) => setQuickPaymentData({...quickPaymentData, amount: e.target.value})}
                      className="w-full p-2.5 bg-[#141417] border border-[#262630] rounded-lg text-white no-theme-override"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Rate per Session (₹)</label>
                    <input
                      type="number"
                      placeholder="Enter Rate"
                      value={quickPaymentData.paymentRate}
                      onChange={(e) => {
                          const rate = e.target.value;
                          const sessions = quickPaymentData.numberOfSessions;
                          const calculatedAmount = (parseFloat(rate) || 0) * (parseFloat(sessions) || 0);
                          setQuickPaymentData({...quickPaymentData, paymentRate: rate, amount: calculatedAmount.toString()});
                      }}
                      className="w-full p-2.5 bg-[#141417] border border-[#262630] rounded-lg text-white no-theme-override"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Number of Sessions</label>
                    <input
                      type="number"
                      placeholder="Enter Sessions"
                      value={quickPaymentData.numberOfSessions}
                      onChange={(e) => {
                          const sessions = e.target.value;
                          const rate = quickPaymentData.paymentRate;
                          const calculatedAmount = (parseFloat(rate) || 0) * (parseFloat(sessions) || 0);
                          setQuickPaymentData({...quickPaymentData, numberOfSessions: sessions, amount: calculatedAmount.toString()});
                      }}
                      className="w-full p-2.5 bg-[#141417] border border-[#262630] rounded-lg text-white no-theme-override"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Billing Category / Package Type</label>
                    <select
                      value={quickPaymentData.packageType}
                      onChange={(e) => {
                        const type = e.target.value;
                        let days = 30;
                        if (type === '3 Months Transformation') days = 90;
                        setQuickPaymentData({
                          ...quickPaymentData, 
                          packageType: type,
                          dueDate: format(addDays(new Date(quickPaymentData.startDate), days), 'yyyy-MM-dd')
                        });
                      }}
                      className="w-full p-2.5 bg-[#141417] border border-[#262630] rounded-lg text-white"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Session-Based">Session-Based</option>
                      <option value="3 Months Transformation">3 Months Transformation</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 col-span-1 md:col-span-2">
                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Start Date</label>
                    <input
                      type="date"
                      required
                      value={quickPaymentData.startDate}
                      onChange={(e) => setQuickPaymentData({...quickPaymentData, startDate: e.target.value})}
                      className="w-full p-2.5 bg-[#141417] border border-[#262630] rounded-lg text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Due Date</label>
                    <input
                      type="date"
                      required
                      value={quickPaymentData.dueDate}
                      onChange={(e) => setQuickPaymentData({...quickPaymentData, dueDate: e.target.value})}
                      className="w-full p-2.5 bg-[#141417] border border-[#262630] rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1 col-span-1 md:col-span-2">
                  <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Receipt/Invoice Status</label>
                  <select
                    value={quickPaymentData.status}
                    onChange={(e) => setQuickPaymentData({...quickPaymentData, status: e.target.value as any})}
                    className="w-full p-2.5 bg-[#141417] border border-[#262630] rounded-lg text-white"
                  >
                    <option value="Paid">Paid (Cash/Online Received)</option>
                    <option value="Pending">Pending (Invoice Dispatched)</option>
                    <option value="Overdue">Overdue (Unpaid past due)</option>
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingPayment}
                    className="w-full py-3 bg-brand-red hover:bg-neutral-950 text-white font-mono text-[10px] uppercase font-bold tracking-widest rounded-xl transition-all shadow cursor-pointer"
                  >
                    {isSavingPayment ? 'Storing Entry...' : 'Commit Payment to Ledger'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="space-y-3">
            {paymentRecords.length === 0 ? (
              <p className="p-8 text-center text-[#A1A1AA] font-mono text-xs border border-dashed rounded-2xl uppercase">No registered transaction dockets found.</p>
            ) : (
              paymentRecords.map((record, i) => {
                const clientObj = clients.find(c => c.id === record.clientId);
                if (!clientObj) return null;

                // Calculate payment sums
                const recordPaid = getPaidAmountForRecord(record);
                const recordDue = getBalanceDueForRecord(record);

                // Determine badge for package details
                const pType = record.packageType || 'Monthly';
                let badgeStyle = "bg-brand-red/10 text-brand-red border-brand-red/20";
                if (pType === 'Session-Based') {
                  badgeStyle = "bg-teal-50 text-teal-700 border-teal-200";
                } else if (pType === '3 Months Transformation') {
                  badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                }

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.04 }}
                    key={record.id} 
                    className="p-5 border border-[#262630] bg-[#141417] rounded-2xl text-xs font-mono transition-all hover:border-[#262630] hover:shadow-md"
                  >
                    {/* Header: Athlete Profile & Package Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262630] pb-3 mb-3">
                      <div className="flex items-center space-x-3">
                        {clientObj.photoURL ? (
                          <img src={clientObj.photoURL} alt={clientObj.name} className="w-8 h-8 rounded-full object-cover border border-[#262630]" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#1E1E24] border border-[#262630] flex items-center justify-center font-bold text-[#A1A1AA] text-[11px] uppercase">
                            {clientObj.name ? clientObj.name[0] : 'U'}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-white text-sm uppercase tracking-wide">{clientObj.name || 'Unnamed Recruit'}</p>
                          <p className="text-[9px] text-[#64748B] font-normal">{clientObj.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                        <span className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded-md border ${badgeStyle}`}>
                          {pType}
                        </span>
                        <span className="text-[10px] text-neutral-700 font-bold bg-[#1E1E24] border border-[#262630] px-2 py-0.5 rounded-md">
                          {record.package}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Dues, Payments & Dates */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs py-1">
                      <div>
                        <span className="text-[8px] font-bold text-[#64748B] block uppercase tracking-wider mb-0.5">Start Date</span>
                        <p className="text-white font-medium">
                          {record.startDate ? format(new Date(record.startDate), 'MMM dd, yyyy') : '—'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[8px] font-bold text-[#64748B] block uppercase tracking-wider mb-0.5">Due Date</span>
                        <p className={`font-semibold ${record.status === 'Overdue' ? 'text-brand-red font-bold animate-pulse' : 'text-white'}`}>
                          {record.dueDate ? format(new Date(record.dueDate), 'MMM dd, yyyy') : '—'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[8px] font-bold text-[#64748B] block uppercase tracking-wider mb-0.5">Paid Amount</span>
                        <p className="text-emerald-600 font-bold">
                          ₹{recordPaid.toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div>
                        <span className="text-[8px] font-bold text-[#64748B] block uppercase tracking-wider mb-0.5">Balance Payment</span>
                        <p className={`font-bold ${recordDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {recordDue > 0 ? `₹${recordDue.toLocaleString('en-IN')}` : 'Settle ✓'}
                        </p>
                      </div>
                    </div>

                    {/* Footer Actions & Status Sync Dropdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 pt-3 border-t border-[#262630] gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] text-[#64748B] font-bold uppercase">LEDGER VALUE:</span>
                        <span className="text-sm font-bold text-white">₹{(Number(record.amount) || 0).toLocaleString('en-IN')}</span>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-auto">
                        <select
                          value={record.status}
                          onChange={async (e) => {
                            try {
                              await firebaseService.updatePaymentRecord(record.id, { status: e.target.value });
                            } catch (err: any) {
                              alert("Failed to update status: " + err.message);
                            }
                          }}
                          className={`px-2 py-1 text-[9px] font-black rounded border cursor-pointer outline-none ${
                            record.status === 'Paid' 
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-300' 
                              : record.status === 'Overdue'
                                ? 'bg-red-100 text-brand-red border-red-300'
                                : 'bg-amber-100 text-amber-700 border-amber-300'
                          }`}
                        >
                          <option value="Paid">PAID</option>
                          <option value="Pending">PENDING</option>
                          <option value="Overdue">OVERDUE</option>
                        </select>

                        {record.status !== 'Paid' && (
                          <button
                            onClick={async () => {
                              try {
                                const messageText = `Hi ${clientObj.name},\n\nThis is a friendly reminder that your payment for package "${record.package}" is due on ${record.dueDate ? format(new Date(record.dueDate), 'MMMM dd, yyyy') : 'immediate'}. The due amount is ₹${record.amount}.\n\nPlease make the payment to continue your Speed Fit EMS sessions.\n\nThank you,\nSpeed Fit Core Team`;
                                
                                // 1. Send in-app message
                                await firebaseService.sendMessage({
                                  senderId: userData.uid,
                                  receiverId: clientObj.id,
                                  participants: [userData.uid, clientObj.id],
                                  content: messageText,
                                  timestamp: new Date().toISOString(),
                                  read: false
                                });

                                // 2. Try sending Gmail if authorized
                                let emailStatus = "";
                                if (gmailAuthorized) {
                                  const subject = `💳 Membership Payment Due Reminder - Speed Fit`;
                                  const emailText = `
                                    <div style="font-family: sans-serif; padding: 25px; border: 2px solid #e11d48; border-radius: 16px;">
                                      <h2 style="color: #e11d48; font-style: italic; margin-bottom: 5px;">SPEED FIT BILLING DESK</h2>
                                      <p style="font-size: 14px; color: #111827;">Dear <strong>${clientObj.name}</strong>,</p>
                                      <p style="font-size: 14px; color: #374151; line-height: 1.6;">
                                        This serves as a friendly reminder of your active Speed Fit performance contract installment dues.
                                      </p>
                                      <div style="background-color: #f9fafb; border: 1px solid #262630; padding: 15px; border-radius: 8px; margin: 15px 0;">
                                        <p style="margin: 0; font-size: 13px;"><strong>Membership Tier:</strong> ${record.package}</p>
                                        <p style="margin: 5px 0 0 0; font-size: 13px; color: #dc2626;"><strong>Outstanding Balance:</strong> ₹${parseFloat(record.amount || '0').toLocaleString('en-IN')}</p>
                                        <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;"><strong>Due Date:</strong> ${record.dueDate ? format(new Date(record.dueDate), 'MMMM dd, yyyy') : 'Immediate'}</p>
                                      </div>
                                      <p style="font-size: 14px; color: #374151;">
                                        Kindly settle the dues to continue your workout slot.
                                      </p>
                                      <hr style="border: none; border-top: 1px solid #262630; margin: 20px 0;" />
                                      <p style="font-size: 10px; color: #9ca3af; font-family: monospace;">SPEED FIT CORE TRAINING TEAM</p>
                                    </div>
                                  `;
                                  await sendGmailEmail(clientObj.email, subject, emailText);
                                  emailStatus = " & Email message dispatched!";
                                } else {
                                  emailStatus = " & Posted to client's dashboard chat! (Authorize Google Mail above to send as direct billing emails)";
                                }

                                alert(`Successfully sent due date reminder to ${clientObj.name}${emailStatus}`);
                              } catch (err: any) {
                                alert("Failed to send reminder: " + err.message);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 text-[#64748B] hover:text-brand-red rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-100"
                            title="Send Due Date Reminder"
                          >
                            <Bell className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        )}

                        <button 
                          onClick={() => exportPaymentReceiptToPDF(clientObj, record)}
                          className="p-1.5 hover:bg-[#1E1E24] rounded-lg transition-colors cursor-pointer text-[#A1A1AA] border border-transparent hover:border-[#262630]"
                          title="Download Invoice/Receipt"
                        >
                          <Download className="w-3.5 h-3.5 shrink-0" />
                        </button>

                        <button
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete payment record for ${clientObj.name}?`)) {
                              try {
                                await firebaseService.deletePaymentRecord(record.id);
                                alert("Record deleted successfully!");
                              } catch (err: any) {
                                alert("Error deleting: " + err.message);
                              }
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 text-[#A1A1AA] hover:text-rose-600 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-100"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      )}

      {/* 9. CALENDAR & SESSIONS TAB */}
      {(currentTab === 'calendar' || currentTab === 'sessions') && (
        <div className="space-y-6">
          {/* Live Google Calendar Integration */}
          <GoogleCalendarIntegration sessions={sessions} clients={clients} />

          {/* Calendar scheduler sessions */}
          <div className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider">UPCOMING BOOKINGS TIMELINE</h3>
              <p className="text-xs text-[#64748B] font-mono">Active booked EMS workout sessions currently scheduled.</p>
            </div>

            <div className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-xs text-[#64748B] font-mono p-4 text-center border rounded-xl">No active booked classes recorded.</p>
              ) : (
                sessions.map((sess) => {
                  const clientObj = clients.find(c => c.id === sess.clientId);

                  return (
                    <div key={sess.id} className="p-3.5 border border-[#262630] bg-[#0D0D0F] rounded-xl flex items-center justify-between text-xs font-mono">
                      <div>
                        <p className="font-bold text-[#0f172a] uppercase">{clientObj?.name || 'Class athlete'}</p>
                        <p className="text-[10px] text-[#64748B] mt-0.5">Time slot: {sess.time} on {sess.date}</p>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-brand-red bg-[#141417] border border-[#262630] px-2 rounded">CONFIRMED</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Reschedule requests queue */}
          {rescheduleRequests.length > 0 && (
            <div className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-white font-display uppercase tracking-wider">RESCHEDULING REQUEST QUEUE</h3>
                <p className="text-xs text-[#64748B] font-mono">Requires trainer approval to relocate booking calendars.</p>
              </div>

              <div className="space-y-3">
                {rescheduleRequests.map((req) => {
                  const recruitObj = clients.find(c => c.id === req.clientId);

                  return (
                    <div key={req.id} className="p-4 border border-[#262630] rounded-xl bg-[#0D0D0F] flex items-center justify-between text-xs font-mono">
                      <div>
                        <p className="font-bold text-brand-red uppercase">{recruitObj?.name || 'Athlete'}</p>
                        <p className="text-[10px] text-[#64748B] mt-0.5">Original date: {req.originalDate} / Requested date: {req.requestedDate}</p>
                      </div>
                      <div className="flex space-x-1.5">
                        <button className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold font-mono text-[9px] rounded uppercase">Approve</button>
                        <button className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white font-bold font-mono text-[9px] rounded uppercase">Reject</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {currentTab === 'attendance' && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="space-y-6"
        >
          {/* HEADER SECTOR */}
          <div className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#262630] pb-4">
              <div>
                <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-brand-red rounded-full animate-ping"></span>
                  Elite Performance Attendance Registry
                </h3>
                <p className="text-xs text-[#64748B] font-mono mt-0.5">Edit, log, and correct athlete attendance marks dynamically by date.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleBulkMarkPresent(focusedDate)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-mono text-[9px] uppercase font-bold rounded-lg transition-all active:scale-95"
                >
                  ✓ Set All Present
                </button>
                <button
                  onClick={() => handleClearAllAttendanceForDate(focusedDate)}
                  className="px-4 py-2 bg-rose-600 text-white font-mono text-[9px] uppercase font-bold rounded-lg hover:bg-rose-700 transition-all active:scale-95"
                >
                  ✗ Clear Date Logs
                </button>
                <button
                  onClick={() => exportAttendanceReportToPDF(attendanceRecords, clients, focusedDate)}
                  className="px-4 py-2 bg-neutral-900 text-white font-mono text-[9px] uppercase font-bold rounded-lg hover:bg-brand-red transition-all active:scale-95"
                  title="Download Daily Attendance PDF"
                >
                  📥 Export Daily PDF
                </button>
                <button
                  onClick={() => exportAttendanceReportToPDF(attendanceRecords, clients)}
                  className="px-4 py-2 bg-slate-500 text-white font-mono text-[9px] uppercase font-bold rounded-lg hover:bg-neutral-800 transition-all active:scale-95"
                  title="Download All-Time Attendance PDF"
                >
                  📊 Export All-Time PDF
                </button>
              </div>
            </div>

            {/* DATE CHRONO INTERACTION */}
            <div className="p-4 bg-[#0D0D0F]/70 border border-[#262630]/50 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2 w-full md:w-auto">
                <button
                  onClick={() => {
                    const prev = subDays(new Date(focusedDate), 1);
                    setFocusedDate(format(prev, 'yyyy-MM-dd'));
                  }}
                  className="p-2.5 bg-[#141417] border border-[#262630] hover:border-brand-red hover:text-brand-red rounded-xl font-bold transition-all text-xs cursor-pointer"
                >
                  ◀ Prev Day
                </button>
                
                <input
                  type="date"
                  value={focusedDate}
                  onChange={(e) => setFocusedDate(e.target.value)}
                  className="px-4 py-2 bg-[#141417] border border-slate-250 rounded-xl text-xs font-mono font-bold text-center outline-none focus:border-brand-red min-w-[150px] flex-1 md:flex-initial"
                />

                <button
                  onClick={() => {
                    const next = addDays(new Date(focusedDate), 1);
                    setFocusedDate(format(next, 'yyyy-MM-dd'));
                  }}
                  className="p-2.5 bg-[#141417] border border-[#262630] hover:border-brand-red hover:text-brand-red rounded-xl font-bold transition-all text-xs cursor-pointer"
                >
                  Next Day ▶
                </button>
              </div>

              {/* Day presets */}
              <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <span className="text-[9px] font-mono text-[#64748B] font-bold uppercase tracking-wider shrink-0 mr-1.5 font-bold">Quick Presets:</span>
                {[
                  { label: 'Today', date: new Date() },
                  { label: 'Yesterday', date: subDays(new Date(), 1) },
                  { label: '2 Days Ago', date: subDays(new Date(), 2) },
                  { label: '3 Days Ago', date: subDays(new Date(), 3) }
                ].map(preset => {
                  const presetStr = format(preset.date, 'yyyy-MM-dd');
                  const isCurrent = focusedDate === presetStr;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => setFocusedDate(presetStr)}
                      className={`px-3 py-1.5 text-[9px] font-mono rounded-lg border font-bold uppercase transition-all shrink-0 ${
                        isCurrent 
                          ? 'bg-neutral-900 border-neutral-900 text-white' 
                          : 'bg-[#141417] border-[#262630] hover:border-slate-350 text-[#64748B] hover:text-black'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QUICK STATS FOR DATE */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { 
                  label: 'TOTAL ROSTER', 
                  val: clients.length, 
                  color: 'text-white border-[#262630]' 
                },
                { 
                  label: 'PRESENT LOGS', 
                  val: attendanceRecords.filter(a => a.date === focusedDate && a.status === 'Present').length, 
                  color: 'text-emerald-600 border-[#262630]' 
                },
                { 
                  label: 'MISSED LOGS', 
                  val: attendanceRecords.filter(a => a.date === focusedDate && a.status === 'Missed').length, 
                  color: 'text-rose-600 border-[#262630]' 
                },
                { 
                  label: 'UNREGISTERED', 
                  val: clients.length - attendanceRecords.filter(a => a.date === focusedDate).length, 
                  color: 'text-amber-600 border-[#262630]' 
                }
              ].map((stat, sIdx) => (
                <div key={sIdx} className={`p-4 border rounded-2xl bg-[#0D0D0F]/30 text-center font-mono ${stat.color}`}>
                  <p className="text-[8px] text-[#A1A1AA] uppercase font-black tracking-widest">{stat.label}</p>
                  <p className="text-xl font-bold mt-1">{stat.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ACTIVE ROSTER CHECKER CARD */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-widest">Active Athlete Registry Log</span>
                <span className="text-[10px] font-mono text-[#64748B]">Date Selected: {format(new Date(focusedDate), 'EEEE, MMMM dd, yyyy')}</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search Athlete Name or Email..."
                  value={attendanceFilterQuery}
                  onChange={(e) => setAttendanceFilterQuery(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0D0D0F] border border-[#262630] rounded-xl text-xs font-mono outline-none focus:border-brand-red"
                />
                {attendanceFilterQuery && (
                  <button 
                    onClick={() => setAttendanceFilterQuery('')} 
                    className="px-3 bg-[#1E1E24] hover:bg-slate-200 text-[#64748B] text-xs font-mono font-bold rounded-xl"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {clients.filter(client => {
                  const query = (attendanceFilterQuery || '').toLowerCase().trim();
                  if (!query) return true;
                  return (client.name || '').toLowerCase().includes(query) || (client.email || '').toLowerCase().includes(query);
                }).map((client) => {
                  const logRecord = attendanceRecords.find(a => a.clientId === client.id && a.date === focusedDate);
                  const isPresent = logRecord?.status === 'Present';
                  const isMissed = logRecord?.status === 'Missed';

                  return (
                    <motion.div
                      layout
                      key={client.id}
                      className={`p-4 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs transition-all ${
                        isPresent 
                          ? 'border-emerald-500/30 bg-emerald-50/20' 
                          : isMissed 
                            ? 'border-rose-500/30 bg-rose-50/20' 
                            : 'border-[#262630] bg-[#141417]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-white uppercase truncate">{client.name}</p>
                          {client.isActive === false && (
                            <span className="px-1.5 py-0.5 text-[8px] bg-[#1E1E24] text-[#A1A1AA] rounded uppercase font-black shrink-0">Inactive</span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#64748B] mt-0.5 truncate">{client.email}</p>
                        {isPresent && logRecord && (
                          <div className="flex items-center space-x-1.5 mt-2 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 w-fit">
                            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-[10px] text-emerald-700 font-bold uppercase shrink-0">Timing:</span>
                            <input 
                              type="text" 
                              placeholder="e.g. 09:00 AM" 
                              value={logRecord.timing || ''} 
                              onChange={(e) => handleUpdateTiming(logRecord.id, e.target.value)}
                              className="w-24 px-1.5 py-0.5 border border-slate-250 focus:border-brand-red rounded font-mono text-[10px] outline-none bg-[#141417] font-bold text-white"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                        <span className={`px-2.5 py-1 text-[9px] font-black rounded-md ${
                          isPresent 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : isMissed 
                              ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                              : 'bg-slate-150 text-[#A1A1AA] border border-slate-350'
                        }`}>
                          {logRecord ? (logRecord.status || '').toUpperCase() : 'NOT LOGGED'}
                        </span>

                        <div className="flex items-center border border-[#262630] bg-[#141417] rounded-lg p-0.5 overflow-hidden">
                          <button
                            onClick={() => handleMarkAttendanceForDate(client.id, focusedDate, 'Present')}
                            className={`px-3 py-1.5 text-[9px] font-bold uppercase transition-all rounded-md ${
                              isPresent 
                                ? 'bg-emerald-500 text-white shadow-sm' 
                                : 'hover:bg-[#1E1E24] text-emerald-600'
                            }`}
                          >
                            ✓ Present
                          </button>
                          <button
                            onClick={() => handleMarkAttendanceForDate(client.id, focusedDate, 'Missed')}
                            className={`px-3 py-1.5 text-[9px] font-bold uppercase transition-all rounded-md ${
                              isMissed 
                                ? 'bg-rose-500 text-white shadow-sm' 
                                : 'hover:bg-[#1E1E24] text-rose-600'
                            }`}
                          >
                            ✗ Missed
                          </button>
                          {logRecord && (
                            <button
                              onClick={() => handleDeleteAttendanceRecord(logRecord.id)}
                              title="Clear Date Record"
                              className="px-2 py-1.5 text-[#A1A1AA] hover:text-rose-500 transition-colors border-l"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* WATCHLIST SYSTEM BAR */}
            <div className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-4">
              <div>
                <h4 className="text-sm font-bold text-rose-600 font-display uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  CRITICAL ABSENCE WATCHLIST
                </h4>
                <p className="text-[10px] text-[#64748B] font-mono leading-relaxed mt-0.5 font-bold">
                  Athletes flagged with sports absences in the last 14 days. Require coaching intervention.
                </p>
              </div>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {(() => {
                  const fourteenDaysAgo = subDays(new Date(), 14);
                  const map: { [clientId: string]: { name: string; email: string; missedCount: number; dates: string[] } } = {};
                  attendanceRecords.forEach(a => {
                    if (a.status === 'Missed') {
                      try {
                        const recordDate = new Date(a.date);
                        const diff = (new Date().getTime() - recordDate.getTime()) / (1000 * 3600 * 24);
                        if (diff <= 14) {
                          if (!map[a.clientId]) {
                            const clientObj = clients.find(c => c.id === a.clientId);
                            map[a.clientId] = {
                              name: clientObj?.name || 'Athlete',
                              email: clientObj?.email || '',
                              missedCount: 0,
                              dates: []
                            };
                          }
                          map[a.clientId].missedCount += 1;
                          map[a.clientId].dates.push(a.date);
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }
                  });
                  const watchlist = Object.values(map).filter(m => m.missedCount >= 1).sort((a, b) => b.missedCount - a.missedCount);

                  if (watchlist.length === 0) {
                    return (
                      <p className="text-xs text-[#64748B] font-mono font-bold uppercase text-center py-6 bg-[#0D0D0F] border border-dashed rounded-xl">
                        ✓ Clean slate! Zero athletic warnings.
                      </p>
                    );
                  }

                  return watchlist.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-3.5 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 rounded-xl space-y-2.5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-mono text-xs font-black text-white uppercase">{item.name}</h5>
                          <p className="text-[9px] text-zinc-500 font-mono font-bold mt-0.5">{item.email}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded animate-pulse shrink-0">
                          {item.missedCount} ABSENT
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 text-[8px] font-mono text-zinc-500">
                        {item.dates.map((d, dIdx) => (
                          <span key={dIdx} className="bg-zinc-200/60 px-1.5 py-0.5 rounded uppercase">
                            {format(new Date(d), 'MMM dd')}
                          </span>
                        ))}
                      </div>

                      {gmailAuthorized ? (
                        <button
                          onClick={async () => {
                            try {
                              setGmailSyncing(true);
                              const subject = `⚠️ Speed Fit Urgent Attendance Advisory - Coach Alert`;
                              const bodyHtml = `
                                <div style="font-family: sans-serif; padding: 25px; border: 2px solid #e60000; border-radius: 16px;">
                                  <h2 style="color: #e60000; font-style: italic; text-transform: uppercase; margin-bottom: 5px;">SPEED FIT TRAINING COMMAND</h2>
                                  <p style="font-size: 14px; color: #1f2937;">Dear <strong>${item.name}</strong>,</p>
                                  <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
                                    This is your transformation coach writing regarding your attendance logs.
                                    Our telemetry displays you have logged <strong>${item.missedCount} missed workout session(s)</strong> in the last fortnight.
                                    Consistency is primary to physical overload alignment.
                                  </p>
                                  <p style="font-size: 14px; color: #4b5563; margin-top: 15px;">
                                    Please coordinate with our check-in panel immediately to reset schedules.
                                  </p>
                                  <hr style="border: none; border-top: 1px solid #262630; margin: 25px 0;" />
                                  <p style="font-size: 10px; color: #9ca3af; font-family: monospace;">SPEED FIT CENTRAL HQ • COMPLIANCE CONTROL</p>
                                </div>
                              `;
                              await sendGmailEmail(item.email, subject, bodyHtml);
                              alert(`Successfully dispatched Gmail Advisory to ${item.name}!`);
                            } catch (err: any) {
                              alert(`Failed to trigger Gmail alert: ${err.message || err}`);
                            } finally {
                              setGmailSyncing(false);
                            }
                          }}
                          disabled={gmailSyncing}
                          className="w-full py-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-white font-mono text-[9px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5"
                        >
                          ✉ Send Absence Warning Email
                        </button>
                      ) : (
                        <div className="text-[9px] font-mono text-[#64748B] text-center bg-zinc-100 p-2 rounded-lg">
                          Connect Gmail in Dashboard to issue warnings.
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {currentTab === 'accounts' && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="space-y-6"
        >
          {/* TOP METRICS BOARD */}
          <div className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider">Speed Fit Financial Control Seat</h3>
              <p className="text-xs text-[#64748B] font-mono">Real-time calculations of paid athletic fees, overdue balances, and income pipelines.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#050505] p-5 rounded-2xl border border-neutral-800">
                <span className="text-[9px] font-mono text-[#A1A1AA] uppercase tracking-wider font-extrabold block">TOTAL CALCULATED REVENUE</span>
                <p className="text-2xl font-bold text-emerald-500 mt-1.5 font-display italic">₹
                  {paymentRecords
                    .reduce((sum, p) => sum + getPaidAmountForRecord(p), 0)
                    .toLocaleString('en-IN')}
                </p>
                <span className="text-[8px] font-mono text-emerald-500/80 block mt-1 uppercase font-semibold font-bold">✓ Funds securely secured</span>
              </div>

              <div className="bg-[#050505] p-5 rounded-2xl border border-neutral-800">
                <span className="text-[9px] font-mono text-[#A1A1AA] uppercase tracking-wider font-extrabold block">BALANCE OUTSTANDING TO GET</span>
                <p className="text-2xl font-bold text-rose-500 mt-1.5 font-display italic">₹
                  {paymentRecords
                    .reduce((sum, p) => sum + getBalanceDueForRecord(p), 0)
                    .toLocaleString('en-IN')}
                </p>
                <span className="text-[8px] font-mono text-rose-500/80 block mt-1 uppercase font-semibold font-bold">⚠️ Pending active collections</span>
              </div>

              <div className="bg-[#0D0D0F] border border-slate-250 p-5 rounded-2xl flex flex-col justify-center space-y-2">
                <div className="flex justify-between text-[9px] font-mono text-[#64748B] font-bold">
                  <span>COLLECTION RATE</span>
                  <span>
                    {(() => {
                      const paid = paymentRecords.reduce((sum, p) => sum + getPaidAmountForRecord(p), 0);
                      const due = paymentRecords.reduce((sum, p) => sum + getBalanceDueForRecord(p), 0);
                      const total = paid + due;
                      return total > 0 ? `${((paid / total) * 100).toFixed(1)}%` : '0%';
                    })()}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden border">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: (() => {
                        const paid = paymentRecords.reduce((sum, p) => sum + getPaidAmountForRecord(p), 0);
                        const due = paymentRecords.reduce((sum, p) => sum + getBalanceDueForRecord(p), 0);
                        const total = paid + due;
                        return total > 0 ? `${(paid / total) * 100}%` : '0%';
                      })() 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEDGER & NOTIFICATION LIST */}
            <div className="lg:col-span-2 bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Athlete Accounts Balance Ledger</span>
                <span className="text-[9px] font-mono text-[#64748B] font-bold">Total Clients: {clients.length}</span>
              </div>

              {/* SEARCH BOX */}
              <div>
                <input
                  type="text"
                  placeholder="Search Athlete Invoice Ledger..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0D0D0F] border border-[#262630] rounded-xl text-xs font-mono outline-none"
                />
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {clients.filter(client => {
                  const q = (searchQuery || '').toLowerCase().trim();
                  if (!q) return true;
                  return (client.name || '').toLowerCase().includes(q) || (client.email || '').toLowerCase().includes(q);
                }).map((client) => {
                  const clientPayments = paymentRecords.filter(p => p.clientId === client.id);
                  const totalPaid = clientPayments.reduce((sum, p) => sum + getPaidAmountForRecord(p), 0);
                  const totalBalance = clientPayments.reduce((sum, p) => sum + getBalanceDueForRecord(p), 0);
                  const lastRec = clientPayments[clientPayments.length - 1];

                  // Package details & styling for the ledger
                  const pType = lastRec?.packageType || 'Monthly';
                  let badgeStyle = "bg-brand-red/10 text-brand-red border-brand-red/20";
                  if (pType === 'Session-Based') {
                    badgeStyle = "bg-teal-50 text-teal-700 border-teal-200";
                  } else if (pType === '3 Months Transformation') {
                    badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                  }

                  return (
                    <div 
                      key={client.id}
                      className="p-4 border border-[#262630] hover:border-slate-350 bg-[#0D0D0F]/50 hover:bg-[#0D0D0F] rounded-2xl flex flex-col sm:flex-row justify-between gap-4 transition-colors font-mono text-xs"
                    >
                      <div className="space-y-1 w-full sm:w-auto">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-white uppercase">{client.name}</p>
                          <span className="text-[#A1A1AA]">•</span>
                          <span className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded border ${badgeStyle}`}>
                            {pType}
                          </span>
                          <span className="text-[#64748B] text-[10px] font-bold">({lastRec?.package || 'No Registered Plan'})</span>
                        </div>
                        <p className="text-[10px] text-[#64748B]">{client.email}</p>
                        
                        <div className="pt-2 flex items-center space-x-6 text-[10px]">
                          <div>
                            <span className="text-[#64748B] block text-[8px] font-bold uppercase">PAID INCOME</span>
                            <span className="text-emerald-600 font-bold">₹{totalPaid.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[#64748B] block text-[8px] font-bold uppercase">BALANCE TO GET</span>
                            <span className={totalBalance > 0 ? "text-rose-600 font-black animate-pulse" : "text-[#A1A1AA] font-bold"}>
                              ₹{totalBalance.toLocaleString('en-IN')}
                            </span>
                          </div>
                          {lastRec?.dueDate && (
                            <div>
                              <span className="text-[#64748B] block text-[8px] font-bold uppercase">DUE DATE</span>
                              <span className={`font-semibold ${lastRec.status === 'Overdue' ? 'text-brand-red font-bold' : 'text-neutral-700'}`}>
                                {format(new Date(lastRec.dueDate), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col justify-between items-end shrink-0 self-end sm:self-auto gap-2">
                        {totalBalance > 0 ? (
                          <span className="px-2.5 py-1 text-[9px] font-black rounded border border-rose-300 bg-rose-50 text-rose-700 uppercase mt-1">
                            ⚠️ ₹{totalBalance.toLocaleString('en-IN')} DUES
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[9px] font-black rounded border border-emerald-300 bg-emerald-50 text-emerald-700 uppercase mt-1">
                            ✓ fully paid
                          </span>
                        )}

                        <div className="flex items-center gap-1.5 pt-2 sm:pt-0">
                          <button
                            onClick={() => {
                              setSelectedAccountsClientId(client.id);
                              setQuickPaymentData(prev => ({
                                ...prev,
                                package: lastRec?.package || 'EMS 12-Sessions Package',
                                amount: totalBalance > 0 ? totalBalance.toString() : '5000'
                              }));
                            }}
                            className="px-2.5 py-1.5 bg-neutral-900 text-white rounded-lg text-[9px] hover:bg-neutral-850 font-bold uppercase"
                          >
                            Add Receipt
                          </button>

                          {totalBalance > 0 && (
                            <button
                              onClick={async () => {
                                if (!gmailAuthorized) {
                                  alert("Please connect Google Mail in the Dashboard Tab first to dispatch billing letters!");
                                  return;
                                }
                                try {
                                  setGmailSyncing(true);
                                  const subject = `💳 Remittance Advice Invoice - Speed Fit Balanced Due Reminder`;
                                  const emailText = `
                                    <div style="font-family: sans-serif; padding: 25px; border: 2px solid #e11d48; border-radius: 16px;">
                                      <h2 style="color: #e11d48; font-style: italic; margin-bottom: 5px;">SPEED FIT BILLING DESK</h2>
                                      <p style="font-size: 14px; color: #111827;">Dear <strong>${client.name}</strong>,</p>
                                      <p style="font-size: 14px; color: #374151; line-height: 1.6;">
                                        This letter serves as a friendly reminder of your active Speed Fit performance contract dues.
                                        Our accounting ledger indicates an outstanding balanced payment amount as listed below:
                                      </p>
                                      <div style="background-color: #f9fafb; border: 1px solid #262630; padding: 15px; border-radius: 8px; margin: 15px 0;">
                                        <p style="margin: 0; font-size: 13px;"><strong>Membership Tier:</strong> ${lastRec?.package || 'EMS Active Transformation'}</p>
                                        <p style="margin: 5px 0 0 0; font-size: 13px; color: #dc2626;"><strong>Outstanding Balance to get:</strong> ₹${totalBalance.toLocaleString('en-IN')}</p>
                                        <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;"><strong>Due Date:</strong> ${lastRec?.dueDate ? format(new Date(lastRec.dueDate), 'MMMM dd, yyyy') : 'Immediate'}</p>
                                      </div>
                                      <p style="font-size: 14px; color: #374151;">
                                        Kindly settle the dues in your checking pane or connect with Coach directly at gym desk.
                                      </p>
                                      <hr style="border: none; border-top: 1px solid #262630; margin: 20px 0;" />
                                      <p style="font-size: 10px; color: #9ca3af; font-family: monospace;">SPEED FIT ACCOUNTS DEPARTMENT</p>
                                    </div>
                                  `;
                                  await sendGmailEmail(client.email, subject, emailText);
                                  alert(`Remittance Balance warning sent successfully to ${client.name}!`);
                                } catch (e: any) {
                                  alert("Error sending dispatch warning: " + (e.message || e));
                                } finally {
                                  setGmailSyncing(false);
                                }
                              }}
                              disabled={gmailSyncing}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-bold uppercase transition-all"
                            >
                              📧 Notify
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* REGISTER PAYMENT ENTRY FORM */}
            <div className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase font-black text-brand-red block">COLLECTION MANAGER</span>
                <h4 className="text-sm font-bold text-white font-display uppercase tracking-wider mt-0.5">Register Payment Entry</h4>
                <p className="text-[9px] font-mono text-[#64748B] font-bold font-mono">Issue client billing packages and paid receipts securely.</p>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!selectedAccountsClientId) {
                    alert("Please select an athletic profile from dropdown.");
                    return;
                  }
                  if (!quickPaymentData.amount || !quickPaymentData.package) {
                    alert("Please insert valid Amount and Package name.");
                    return;
                  }

                  try {
                    setIsSavingPayment(true);
                    await firebaseService.addPaymentRecord({
                      clientId: selectedAccountsClientId,
                      package: quickPaymentData.package,
                      packageType: quickPaymentData.packageType,
                      amount: quickPaymentData.amount,
                      startDate: quickPaymentData.startDate,
                      dueDate: quickPaymentData.dueDate,
                      status: quickPaymentData.status,
                      createdAt: new Date().toISOString()
                    });
                    
                    // Reset
                    setQuickPaymentData({
                      package: '',
                      packageType: 'Monthly',
                      amount: '',
                      paymentRate: '',
                      numberOfSessions: '',
                      startDate: format(new Date(), 'yyyy-MM-dd'),
                      dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                      status: 'Pending'
                    });
                    alert("Transaction recorded successfully!");
                  } catch (err: any) {
                    alert("Record failure: " + (err.message || err));
                  } finally {
                    setIsSavingPayment(false);
                  }
                }}
                className="space-y-3 text-xs font-mono text-white"
              >
                <div className="space-y-1">
                  <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Select Athlete</label>
                  <select
                    value={selectedAccountsClientId}
                    onChange={(e) => setSelectedAccountsClientId(e.target.value)}
                    required
                    className="w-full p-2 bg-[#0D0D0F] border rounded-lg text-white"
                  >
                    <option value="">-- Choose Athlete --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Billing Package Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMS 12-Sessions Membership"
                    value={quickPaymentData.package}
                    onChange={(e) => setQuickPaymentData({...quickPaymentData, package: e.target.value})}
                    className="w-full p-2 bg-[#141417] border rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      placeholder="Amount in ₹"
                      value={quickPaymentData.amount}
                      onChange={(e) => setQuickPaymentData({...quickPaymentData, amount: e.target.value})}
                      className="w-full p-2 bg-[#141417] border rounded-lg text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Duration</label>
                    <select
                      value={quickPaymentData.packageType}
                      onChange={(e) => setQuickPaymentData({...quickPaymentData, packageType: e.target.value as any})}
                      className="w-full p-2 bg-[#0D0D0F] border rounded-lg text-white"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                      <option value="One-Time">One-Time</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Start Date</label>
                    <input
                      type="date"
                      required
                      value={quickPaymentData.startDate}
                      onChange={(e) => setQuickPaymentData({...quickPaymentData, startDate: e.target.value})}
                      className="w-full p-2 bg-[#141417] border rounded-lg text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Due Date</label>
                    <input
                      type="date"
                      required
                      value={quickPaymentData.dueDate}
                      onChange={(e) => setQuickPaymentData({...quickPaymentData, dueDate: e.target.value})}
                      className="w-full p-2 bg-[#141417] border rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[8px] font-bold text-[#A1A1AA] uppercase">Receipt/Invoice Status</label>
                  <select
                    value={quickPaymentData.status}
                    onChange={(e) => setQuickPaymentData({...quickPaymentData, status: e.target.value as any})}
                    className="w-full p-2 bg-[#0D0D0F] border rounded-lg text-white"
                  >
                    <option value="Paid">Paid (Cash/Online Received)</option>
                    <option value="Pending">Pending (Invoice Dispatched)</option>
                    <option value="Overdue">Overdue (Unpaid past due)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSavingPayment}
                  className="w-full py-3 mt-2 bg-brand-red hover:bg-neutral-900 text-white font-mono text-[9px] uppercase font-bold tracking-widest rounded-xl transition-all"
                >
                  {isSavingPayment ? 'Storing Entry...' : 'Commit Payment to Ledger'}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      )}

      {/* 9B. LEADS & ASSESSMENTS PIPELINE TAB */}
      {currentTab === 'leads' && (
        <TrainerLeadsView userData={userData} clients={clients} />
      )}

      {/* 10. TRAINING HQ SETTINGS TAB */}
      {currentTab === 'settings' && (
        <div className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider">COACH REGISTRY BIOGRAPHY & PROFILE</h3>
            <p className="text-xs text-[#64748B] font-mono">Configure details visible on client panels detailing certifications and credentials.</p>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (!userData?.uid) return;
              await firebaseService.updateUser(userData.uid, {
                name: trainerBioForm.name,
                phoneNumber: trainerBioForm.phoneNumber,
                bio: trainerBioForm.bio,
                specialties: trainerBioForm.specialties,
                certifications: trainerBioForm.certifications,
                experience: trainerBioForm.experience,
                photoURL: trainerBioForm.photoURL,
                avatar: trainerBioForm.photoURL
              });
              alert('Profile settings and biography successfully saved & published!');
            } catch (err) {
              console.error(err);
              alert('Save failure, please check connection.');
            }
          }} className="space-y-4 font-mono text-xs text-white">
            
            {/* Photo Upload Section */}
            <div className="flex items-center gap-4 p-4 bg-[#0D0D0F] border border-neutral-800 rounded-2xl">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-900 border border-brand-red/40 flex items-center justify-center shrink-0">
                {trainerBioForm.photoURL ? (
                  <img src={trainerBioForm.photoURL} alt="Trainer" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display italic text-2xl text-brand-red">
                    {trainerBioForm.name?.[0]?.toUpperCase() || 'C'}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-neutral-400 uppercase">Coach Profile Photo</label>
                <label className="inline-block px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] uppercase font-bold rounded-lg cursor-pointer transition-all border border-neutral-700">
                  {isUploadingPhoto ? 'Uploading...' : 'Upload New Photo'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !userData?.uid) return;
                      try {
                        setIsUploadingPhoto(true);
                        const url = await firebaseService.uploadFile(file, `profiles/${userData.uid}`);
                        setTrainerBioForm(prev => ({ ...prev, photoURL: url }));
                        await firebaseService.updateUser(userData.uid, { photoURL: url, avatar: url });
                        alert('Coach photo updated!');
                      } catch (err) {
                        console.error(err);
                        alert('Photo upload failed.');
                      } finally {
                        setIsUploadingPhoto(false);
                      }
                    }}
                    disabled={isUploadingPhoto}
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-[#64748B] uppercase">Full Name</label>
                <input 
                  type="text" 
                  value={trainerBioForm.name}
                  onChange={(e) => setTrainerBioForm({...trainerBioForm, name: e.target.value})}
                  className="w-full p-2.5 bg-[#0D0D0F] border border-neutral-800 rounded-xl outline-none text-white focus:border-brand-red"
                  placeholder="e.g., Chief Coach Alex"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-[#64748B] uppercase">Direct Phone Number</label>
                <input 
                  type="text" 
                  value={trainerBioForm.phoneNumber}
                  onChange={(e) => setTrainerBioForm({...trainerBioForm, phoneNumber: e.target.value})}
                  className="w-full p-2.5 bg-[#0D0D0F] border border-neutral-800 rounded-xl outline-none text-white focus:border-brand-red"
                  placeholder="e.g., +1 (555) 234-5678"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-[#64748B] uppercase">Specialties & Focus Areas</label>
                <input 
                  type="text" 
                  value={trainerBioForm.specialties}
                  onChange={(e) => setTrainerBioForm({...trainerBioForm, specialties: e.target.value})}
                  className="w-full p-2.5 bg-[#0D0D0F] border border-neutral-800 rounded-xl outline-none text-white focus:border-brand-red"
                  placeholder="e.g., EMS Hypertrophy, Fat Loss"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-[#64748B] uppercase">Certifications & Credentials</label>
                <input 
                  type="text" 
                  value={trainerBioForm.certifications}
                  onChange={(e) => setTrainerBioForm({...trainerBioForm, certifications: e.target.value})}
                  className="w-full p-2.5 bg-[#0D0D0F] border border-neutral-800 rounded-xl outline-none text-white focus:border-brand-red"
                  placeholder="e.g., EMS Specialist, ACE, NASM PES"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-[#64748B] uppercase">Years of Experience</label>
                <input 
                  type="text" 
                  value={trainerBioForm.experience}
                  onChange={(e) => setTrainerBioForm({...trainerBioForm, experience: e.target.value})}
                  className="w-full p-2.5 bg-[#0D0D0F] border border-neutral-800 rounded-xl outline-none text-white focus:border-brand-red"
                  placeholder="e.g., 8+ Years"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[8px] font-bold text-[#64748B] uppercase">Professional Biography & Strategy</label>
              <textarea 
                value={trainerBioForm.bio}
                onChange={(e) => setTrainerBioForm({...trainerBioForm, bio: e.target.value})}
                className="w-full p-2.5 bg-[#0D0D0F] border border-neutral-800 rounded-xl outline-none min-h-[100px] text-white focus:border-brand-red"
                placeholder="Details of your clinical strategy and goals alignment philosophy..."
              />
            </div>

            <button 
              type="submit"
              className="px-6 py-3 bg-brand-red hover:bg-neutral-100 text-white hover:text-black font-mono text-[10px] uppercase font-black rounded-xl shadow-lg active:scale-95 transition-all outline-none"
            >
              Commit & Publish Biography Changes
            </button>
          </form>
        </div>
      )}

      {/* OVERLAY: Onboarding client invitation Dialog */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form 
            onSubmit={handleAddClient}
            className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] max-w-sm w-full shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-white font-mono uppercase">ADD CLIENT PROFILE</h3>
              <button 
                type="button"
                onClick={() => setShowAddClientModal(false)}
                className="text-[#64748B] hover:text-[#0f172a] font-mono text-xs font-bold"
              >
                CLOSE
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-[#64748B] uppercase">athlete full name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Client full name..."
                  value={newClientData.name}
                  onChange={(e) => setNewClientData({...newClientData, name: e.target.value})}
                  className="w-full p-2.5 bg-[#0D0D0F] border rounded-xl outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-[#64748B] uppercase">athlete primary email</label>
                <input 
                  type="email" 
                  required
                  placeholder="Registered email address..."
                  value={newClientData.email}
                  onChange={(e) => setNewClientData({...newClientData, email: e.target.value})}
                  className="w-full p-2.5 bg-[#0D0D0F] border rounded-xl outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-[#64748B] uppercase">Assign Login Password/Secret</label>
                <input 
                  type="text" 
                  required
                  placeholder="Password for initial login..."
                  value={newClientData.password}
                  onChange={(e) => setNewClientData({...newClientData, password: e.target.value})}
                  className="w-full p-2.5 bg-[#0D0D0F] border rounded-xl outline-none"
                />
                <p className="text-[9px] text-[#64748B] italic">The user can log in immediately using this initial credential.</p>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isAddingClient}
              className="w-full py-3 bg-brand-red hover:bg-red-700 text-white font-mono text-[9px] uppercase tracking-widest font-bold rounded-xl"
            >
              {isAddingClient ? 'INVITING...' : 'RELEASE REGISTRY INVITATION'}
            </button>
          </form>
        </div>
      )}

      {/* OVERLAY: Testimonial registry list modal */}
      {showTestimonialModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form 
            onSubmit={handleSaveTestimonial}
            className="bg-[#141417] border border-[#262630] p-6 rounded-[24px] max-w-md w-full shadow-2xl space-y-4 font-mono text-xs"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-white uppercase">MANAGE TRANSFORMATION REVIEWS</h3>
              <button 
                type="button"
                onClick={() => setShowTestimonialModal(false)}
                className="text-[#64748B] hover:text-[#0f172a] font-bold"
              >
                CLOSE
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-[#64748B] uppercase">Athlete Name</label>
                <input 
                  type="text" 
                  required
                  value={testimonialForm.clientName}
                  onChange={(e) => setTestimonialForm({...testimonialForm, clientName: e.target.value})}
                  className="w-full p-2 bg-[#0D0D0F] border rounded-lg outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-[#64748B] uppercase">Athlete Email (Optional)</label>
                <input 
                  type="email" 
                  value={testimonialForm.clientEmail}
                  onChange={(e) => setTestimonialForm({...testimonialForm, clientEmail: e.target.value})}
                  className="w-full p-2 bg-[#0D0D0F] border rounded-lg outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-bold text-[#64748B] uppercase">Aesthetic Feedback Quote</label>
              <textarea 
                required
                value={testimonialForm.bodyQuote}
                onChange={(e) => setTestimonialForm({...testimonialForm, bodyQuote: e.target.value})}
                className="w-full p-2 bg-[#0D0D0F] border rounded-lg outline-none min-h-[70px]"
                placeholder="Details of client re-composition gains..."
              />
            </div>

            <button 
              type="submit"
              className="w-full py-3 bg-brand-red hover:bg-red-700 text-white font-mono text-[9px] uppercase font-bold rounded-xl"
            >
              SAVE TESTIMONIAL
            </button>
          </form>
        </div>
      )}

    </div>
  </AppLayout>
  );
};

export default TrainerDashboard;
