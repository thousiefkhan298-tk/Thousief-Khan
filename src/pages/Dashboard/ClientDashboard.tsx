import React, { useEffect, useState, useMemo } from 'react';
import AvatarDisplay from '../../components/AvatarDisplay.js';
import { 
  Activity, 
  Target, 
  Calendar, 
  Zap, 
  Shield, 
  ChevronRight, 
  ArrowLeft, 
  LogOut, 
  CheckCircle, 
  CreditCard, 
  Utensils, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  TrendingUp, 
  Camera, 
  Trash2, 
  Star, 
  Quote, 
  Award, 
  Download, 
  Check, 
  ChevronRightSquare,
  HelpCircle,
  Plus,
  Moon,
  Droplet,
  Smartphone,
  ExternalLink,
  Brain,
  Sparkles,
  Dumbbell,
  ArrowUpRight
} from 'lucide-react';
import { firebaseService } from '../../services/firebaseService.js';
import { auth } from '../../firebase.js';
import { WorkoutLog, UpcomingSession, DietPlan, PaymentRecord, WorkoutPlan, ScheduledWorkout, Testimonial, User } from '../../types.js';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import ExerciseAnimation from '../../components/ExerciseAnimation';
import VisualWorkoutModal from '../../components/VisualWorkoutModal';
import { COMMON_EXERCISES } from '../../constants';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, isSameDay } from 'date-fns';
import { safeFormat } from '../../utils/dateUtils';
import { motion } from 'motion/react';
import { exportPaymentReceiptToPDF, exportAITransformationReportToPDF, exportClientToPDF } from '../../utils/pdfExporter.js';
import { calculateHealthMetrics, getBMIBarPercent, getBMIColor } from '../../utils/healthCalculations';
import { isGmailAuthorized, authorizeGmail, sendGmailEmail, listGmailMessages, getGmailMessageDetails, clearGmailAuthorization } from '../../services/gmailService.js';
import { GoogleCalendarIntegration } from '../../components/GoogleCalendarIntegration.js';
import { ClientHomeView } from './client/ClientHomeView';
import { ClientMyPlanView } from './client/ClientMyPlanView';
import { ClientSessionsView } from './client/ClientSessionsView';
import { ClientProgressView } from './client/ClientProgressView';
import { ClientProfileView } from './client/ClientProfileView';


const DEFAULT_WORKOUT_SEGMENTS = [
  {
    id: "ex-1",
    name: "Barbell Bench Press",
    target: "Chest",
    sets: "4",
    reps: "8-10",
    rest: "60s"
  },
  {
    id: "ex-2",
    name: "Seated Cable Row",
    target: "Back & Lats",
    sets: "4",
    reps: "10-12",
    rest: "60s"
  },
  {
    id: "ex-3",
    name: "Incline Dumbbell Press",
    target: "Chest",
    sets: "3",
    reps: "10-12",
    rest: "60s"
  },
  {
    id: "ex-4",
    name: "Lat Pulldown",
    target: "Back & Lats",
    sets: "3",
    reps: "10-12",
    rest: "45s"
  },
  {
    id: "ex-5",
    name: "Dumbbell Lateral Raise",
    target: "Shoulders",
    sets: "3",
    reps: "12-15",
    rest: "45s"
  },
  {
    id: "ex-6",
    name: "Tricep Pushdown",
    target: "Physical Extension",
    sets: "3",
    reps: "12-15",
    rest: "45s"
  }
];

const DEFAULT_WARM_UP_SEGMENTS = [
  {
    id: "wu-1",
    name: "Arm Circles & Torso Twists",
    target: "Mobility",
    sets: "1",
    reps: "1 min",
    rest: "15s"
  },
  {
    id: "wu-2",
    name: "Dynamic Body Squats Warm Up",
    target: "Lumbopelvic Rhythm",
    sets: "2",
    reps: "12",
    rest: "30s"
  }
];

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

const ClientDashboard: React.FC<Props> = ({ userData }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'home';

  // Subscribed States
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [scheduledWorkouts, setScheduledWorkouts] = useState<any[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<any[]>([]);
  const [dietPlans, setDietPlans] = useState<any[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [pendingDrafts, setPendingDrafts] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [progressRecords, setProgressRecords] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Page States
  const [loading, setLoading] = useState(true);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingProgress, setIsUploadingProgress] = useState(false);
  const [progressCategory, setProgressCategory] = useState<'transformation' | 'diet' | 'general'>('transformation');
  
  // Gmail integration state variables
  const [gmailSyncing, setGmailSyncing] = useState<boolean>(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [gmailSuccess, setGmailSuccess] = useState<string | null>(null);
  const [gmailAuthorized, setGmailAuthorized] = useState<boolean>(false);
  const [gmailMessages, setGmailMessages] = useState<any[]>([]);
  const [gmailQuery, setGmailQuery] = useState<string>("Speed Fit");
  const [selectedMail, setSelectedMail] = useState<any | null>(null);
  const [loadingMailDetails, setLoadingMailDetails] = useState<boolean>(false);
  
  // Interactive Checklist states (Stored in LocalStorage to maintain consistency during session)
  const [completedWorkoutToday, setCompletedWorkoutToday] = useState(() => {
    return localStorage.getItem(`workout_completed_${userData?.uid}_${format(new Date(), 'yyyy-MM-dd')}`) === 'true';
  });
  const [mealsChecked, setMealsChecked] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(`meals_checked_${userData?.uid}_${format(new Date(), 'yyyy-MM-dd')}`);
    return saved ? JSON.parse(saved) : { breakfast: false, lunch: false, dinner: false, snack: false };
  });
  const [waterCups, setWaterCups] = useState(() => {
    const saved = localStorage.getItem(`water_cups_${userData?.uid}_${format(new Date(), 'yyyy-MM-dd')}`);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [sleepHours, setSleepHours] = useState(() => {
    const saved = localStorage.getItem(`sleep_hours_${userData?.uid}_${format(new Date(), 'yyyy-MM-dd')}`);
    return saved ? parseInt(saved, 10) : 7;
  });

  // Food Alternates state
  const [showAlternativeFor, setShowAlternativeFor] = useState<string | null>(null);

  // Active workout demo modal state
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [currentWorkoutTitle, setCurrentWorkoutTitle] = useState('');
  const [currentWorkoutExercises, setCurrentWorkoutExercises] = useState<{ exercise: string; videoUrl?: string; sets?: string; reps?: string }[]>([]);
  const [currentWorkoutContent, setCurrentWorkoutContent] = useState('');
  const [initialWorkoutIndex, setInitialWorkoutIndex] = useState(0);

  // New interactive workout specific states
  const [workoutSubTab, setWorkoutSubTab] = useState<'workout' | 'warmup'>('workout');
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`completed_exercises_${userData?.uid}_${format(new Date(), 'yyyy-MM-dd')}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (userData?.uid) {
      localStorage.setItem(
        `completed_exercises_${userData?.uid}_${format(new Date(), 'yyyy-MM-dd')}`,
        JSON.stringify(completedExercises)
      );
    }
  }, [completedExercises, userData?.uid]);

  // COGNITIVE TRANSFORMATION ANALYTICS CLIENT-SIDE HOOKS & COMPILATIONS
  const [cognitiveReport, setCognitiveReport] = useState<any>(() => {
    try {
      if (userData?.cognitiveTransformReport) {
        return userData.cognitiveTransformReport;
      }
      const saved = localStorage.getItem(`cognitive_transform_report_${userData?.uid}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [generatingCognitive, setGeneratingCognitive] = useState(false);
  const [cognitiveError, setCognitiveError] = useState<string | null>(null);

  // Sync up our database value to local state if updated by trainer or loaded dynamically
  useEffect(() => {
    if (userData?.cognitiveTransformReport) {
      setCognitiveReport(userData.cognitiveTransformReport);
    }
  }, [userData?.cognitiveTransformReport]);

  // Compiled Weight Progression list
  const weightHistory = useMemo(() => {
    const sortedLogs = [...recentLogs].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const history: { date: string; weight: number }[] = [];
    
    // Include starting weight from onboarding profile
    const baselineWeight = parseFloat(userData?.healthAssessment?.weight || '0');
    if (baselineWeight > 0) {
      history.push({
        date: 'Onboarding Target Baseline',
        weight: baselineWeight
      });
    }

    sortedLogs.forEach(log => {
      if (log.entries && Array.isArray(log.entries)) {
        const firstWithWeight = log.entries.find((e: any) => e.weight && parseFloat(e.weight) > 0);
        if (firstWithWeight) {
          const logDate = safeFormat(log.date, 'MMM dd, yyyy', 'Recent');
          if (!history.find(h => h.date === logDate)) {
            history.push({
              date: logDate,
              weight: parseFloat(firstWithWeight.weight)
            });
          }
        }
      }
    });

    return history;
  }, [recentLogs, userData?.healthAssessment?.weight]);

  // Compiled Muscle strength gains/progressive overload history
  const strengthGains = useMemo(() => {
    const exercisesMap: Record<string, { exercise: string; baselineWeight: number; maxWeight: number; lastDate: string; sampleSetRep: string }> = {};
    const sortedLogs = [...recentLogs].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    sortedLogs.forEach(log => {
      if (log.entries && Array.isArray(log.entries)) {
        log.entries.forEach((entry: any) => {
          if (entry.exercise && entry.weight) {
            const exName = entry.exercise.trim();
            const curWeight = parseFloat(entry.weight) || 0;
            if (curWeight > 0) {
              if (!exercisesMap[exName]) {
                exercisesMap[exName] = {
                  exercise: exName,
                  baselineWeight: curWeight,
                  maxWeight: curWeight,
                  lastDate: safeFormat(log.date, 'MMM dd, yyyy', 'Recent'),
                  sampleSetRep: `${entry.sets || '3'}x${entry.reps || '10'}`
                };
              } else {
                if (curWeight > exercisesMap[exName].maxWeight) {
                  exercisesMap[exName].maxWeight = curWeight;
                  exercisesMap[exName].lastDate = safeFormat(log.date, 'MMM dd, yyyy', 'Recent');
                  exercisesMap[exName].sampleSetRep = `${entry.sets || '3'}x${entry.reps || '10'}`;
                }
              }
            }
          }
        });
      }
    });

    return Object.values(exercisesMap);
  }, [recentLogs]);

  // Compilation trigger handler
  const handleGenerateCognitiveReport = async () => {
    setGeneratingCognitive(true);
    setCognitiveError(null);

    const clientInfo = {
      name: userData?.name || 'Speed Fit Client',
      age: userData?.clientDetails?.age || userData?.healthAssessment?.age || '25',
      gender: userData?.clientDetails?.gender || userData?.healthAssessment?.gender || 'Male',
      height: userData?.healthAssessment?.height || '175',
      weight: userData?.healthAssessment?.weight || '78',
      goals: userData?.clientDetails?.goals || userData?.healthAssessment?.goals || []
    };

    const weightTrends = weightHistory.map(w => ({ date: w.date, weight: w.weight }));
    
    const strengthLogs = strengthGains.map(s => ({
      exercise: s.exercise,
      baselineWeight: s.baselineWeight,
      maxWeight: s.maxWeight,
      lastUpdated: s.lastDate,
      setsReps: s.sampleSetRep
    }));

    const compliance = {
      attendanceRate: attendanceStats.percentage,
      totalPresent: attendanceStats.present,
      totalMissed: attendanceStats.leave,
      workoutLogsCount: recentLogs.length
    };

    try {
      const response = await fetch('/api/transformation/summarize-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientInfo,
          weightTrends,
          strengthLogs,
          compliance
        })
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve progress insights from the master SpeedFit coaching engine.');
      }

      const resData = await response.json();
      if (resData.success && resData.data) {
        const report = resData.data;
        setCognitiveReport(report);
        localStorage.setItem(`cognitive_transform_report_${userData?.uid}`, JSON.stringify(report));
        
        // Save to User Profile for cross-session/cross-device access
        if (userData?.uid) {
          try {
            await firebaseService.updateUser(userData.uid, {
              cognitiveTransformReport: report
            });
          } catch (dbErr) {
            console.error('Error saving cognitive report to Firebase:', dbErr);
          }
        }
      } else {
        throw new Error('Invalid coaching synthesis response format received.');
      }
    } catch (err: any) {
      console.error('Cognitive Report Error:', err);
      setCognitiveError(err.message || 'Operation failed. Standard gateway timeout.');
    } finally {
      setGeneratingCognitive(false);
    }
  };

  // Selected trainer/coach note state
  const [selectedCoachNote, setSelectedCoachNote] = useState<string | null>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme((localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  const isDark = true;

  // Motivation string selection
  const motivations = useMemo(() => [
    "The clock is ticking. Are you achieving your optimal capability today?",
    "Discipline holds you accountable to your goals, far beyond motivation.",
    "True progress is verified through data compliance and physical re-composition.",
    "Formulate habits that support your trajectory. Sleep, hydrate, and move.",
    "Each target rep completed aligns your physical capacity with high performance."
  ], []);
  
  const motivation = useMemo(() => {
    return motivations[Math.abs(userData?.uid?.charCodeAt(0) || 0) % motivations.length];
  }, [motivations, userData?.uid]);

  // Greeting based on hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Fetch Firebase Data on Mount
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

    const unsubscribeUpcomingSessions = firebaseService.subscribeToUpcomingSessions(userData.uid, (servicesData) => {
      setSessions(servicesData);
    });

    const unsubscribePhotos = firebaseService.subscribeToProgressPhotos(userData.uid, (photos) => {
      setProgressPhotos(photos);
    });

    const unsubscribeTestimonials = firebaseService.subscribeToTestimonials((data) => {
      setTestimonials(data);
    });

    const unsubscribeDrafts = firebaseService.subscribeToPendingDrafts(userData.uid, (drafts) => {
      setPendingDrafts(drafts);
    });

    const unsubscribeTrainers = firebaseService.subscribeToTrainers((users) => {
      setTrainers(users);
    });

    const unsubscribeProgress = firebaseService.subscribeToProgressRecords(userData.uid, (records) => {
      setProgressRecords(records);
    });

    const unsubscribeNotifs = firebaseService.subscribeToNotifications(userData.uid, (notifs) => {
      setNotifications(notifs);
    });

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 800);

    return () => {
      unsubscribeLogs();
      unsubscribeScheduled();
      unsubscribePlans();
      unsubscribeDietPlans();
      unsubscribePayments();
      unsubscribeAttendance();
      unsubscribeUpcomingSessions();
      unsubscribePhotos();
      unsubscribeTestimonials();
      unsubscribeDrafts();
      unsubscribeTrainers();
      unsubscribeProgress();
      unsubscribeNotifs();
      clearTimeout(timeout);
    };
  }, [userData?.uid]);

  // Sync checklist states to LocalStorage
  useEffect(() => {
    if (!userData?.uid) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    localStorage.setItem(`workout_completed_${userData.uid}_${today}`, String(completedWorkoutToday));
  }, [completedWorkoutToday, userData?.uid]);

  useEffect(() => {
    if (!userData?.uid) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    localStorage.setItem(`meals_checked_${userData.uid}_${today}`, JSON.stringify(mealsChecked));
  }, [mealsChecked, userData?.uid]);

  useEffect(() => {
    if (!userData?.uid) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    localStorage.setItem(`water_cups_${userData.uid}_${today}`, String(waterCups));
  }, [waterCups, userData?.uid]);

  useEffect(() => {
    if (!userData?.uid) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    localStorage.setItem(`sleep_hours_${userData.uid}_${today}`, String(sleepHours));
  }, [sleepHours, userData?.uid]);

  // Aggregate user assessments and stats
  const attendanceStats = useMemo(() => {
    const present = attendance.filter(a => a.status === 'Present').length;
    const leave = attendance.filter(a => a.status === 'Missed' || a.status === 'Absent').length;
    const total = attendance.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, leave, total, percentage };
  }, [attendance]);

  const activeAndDraftApproved = useMemo(() => {
    return pendingDrafts.find(d => d.status === 'approved') || null;
  }, [pendingDrafts]);

  const activeWorkoutPlan = useMemo(() => {
    const approvedPlans = workoutPlans.filter(p => p.approved === true);
    return approvedPlans.length > 0 ? approvedPlans[0] : null;
  }, [workoutPlans]);

  const activeDietPlan = useMemo(() => {
    const approvedPlans = dietPlans.filter(p => p.approved === true);
    return approvedPlans.length > 0 ? approvedPlans[0] : null;
  }, [dietPlans]);

  // Render health calculations
  const healthMetrics = useMemo(() => {
    const h = parseFloat(userData?.healthAssessment?.height || '0');
    const w = parseFloat(userData?.healthAssessment?.weight || '0');
    const a = parseInt(userData?.clientDetails?.age || '25');
    const g = userData?.clientDetails?.gender || 'Male';
    const occ = userData?.healthAssessment?.occupation || 'Sedentary';
    const stress = userData?.healthAssessment?.stress;
    if (!h || !w) return null;
    return calculateHealthMetrics(h, w, a, g, occ, stress);
  }, [userData]);

  // Next Session
  const nextSession = useMemo(() => {
    const upcoming = sessions
      .filter(s => s.status === 'CONFIRMED' && new Date(s.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return upcoming[0] || null;
  }, [sessions]);

  // Meal completeness scoring
  const mealKcalIntake = useMemo(() => {
    if (!activeDietPlan) return 0;
    const targetKcal = activeDietPlan.calories || 2000;
    let eaten = 0;
    let counts = 0;
    if (mealsChecked.breakfast) { eaten += 0.25; counts++; }
    if (mealsChecked.lunch) { eaten += 0.35; counts++; }
    if (mealsChecked.dinner) { eaten += 0.30; counts++; }
    if (mealsChecked.snack) { eaten += 0.10; counts++; }
    return Math.round(targetKcal * eaten);
  }, [activeDietPlan, mealsChecked]);

  // Compliant weight performance trend points
  const performanceData = useMemo(() => {
    const data = [];
    const baselineWeight = parseFloat(userData?.healthAssessment?.weight || '78');
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayLogs = recentLogs.filter(log => isSameDay(new Date(log.date), date));
      let currentWeight = baselineWeight;
      if (dayLogs.length > 0) {
        const topWeight = parseFloat(dayLogs[0].entries?.[0]?.weight || '0');
        if (topWeight > 0) currentWeight = topWeight;
      } else {
        // Add minimal fluctuating progress variance to make graph lively
        currentWeight = baselineWeight - (6 - i) * 0.15 + (Math.sin(i) * 0.2);
      }
      data.push({
        name: format(date, 'MMM dd'),
        Weight: Math.round(currentWeight * 10) / 10,
        Logs: dayLogs.length
      });
    }
    return data;
  }, [recentLogs, userData]);

  const handleWorkoutCompletionClick = async () => {
    if (completedWorkoutToday) {
      alert("Workout already logged for today!");
      return;
    }

    try {
      // Build a standard workout log schema for client target
      const newLog = {
        clientId: userData.uid,
        date: new Date().toISOString(),
        title: activeWorkoutPlan?.title || "EMS Strength Recomposition",
        duration: "45 mins",
        notes: "Completed daily physical prescription guidelines completely.",
        entries: [
          { exercise: "Daily Target Cardio", reps: "20m", sets: "1", weight: userData?.healthAssessment?.weight || "0" }
        ]
      };
      await firebaseService.saveWorkoutLog(newLog);
      setCompletedWorkoutToday(true);
      alert("Verification complete! Saved to physical logs successfully.");
    } catch (err) {
      console.error(err);
      alert("Log saving failed, please retry.");
    }
  };

  const handleToggleExerciseComplete = (exerciseName: string) => {
    setCompletedExercises(prev => {
      const updated = { ...prev, [exerciseName]: !prev[exerciseName] };
      return updated;
    });
  };

  const handleMarkWorkoutCompleteSequence = async () => {
    if (completedWorkoutToday) {
      alert("Workout already logged for today!");
      return;
    }

    try {
      const segmentsToSave = Object.keys(completedExercises)
        .filter(k => completedExercises[k])
        .map(k => ({ exercise: k, sets: "4", reps: "8-10" }));

      const newLog = {
        clientId: userData.uid,
        date: new Date().toISOString(),
        title: activeWorkoutPlan?.title || "EMS Strength Recomposition",
        duration: "45 mins",
        notes: "Completed customized high-fidelity physical guidelines with high compliance.",
        entries: segmentsToSave.length > 0 ? segmentsToSave : [
          { exercise: "Today's Workout Program", reps: "6", sets: "4", weight: userData?.healthAssessment?.weight || "0" }
        ]
      };
      await firebaseService.saveWorkoutLog(newLog);
      setCompletedWorkoutToday(true);
      alert("Verification complete! Saved to physical logs successfully.");
    } catch (err) {
      console.error(err);
      alert("Log saving failed, please retry.");
    }
  };

  // Gmail integration handlers
  const handleGmailAuth = async () => {
    try {
      setGmailError(null);
      await authorizeGmail();
      setGmailAuthorized(true);
      await handleFetchGmailMessages();
    } catch (err: any) {
      console.error(err);
      setGmailError(err.message || 'Gmail OAuth authorization failed.');
    }
  };

  const handleFetchGmailMessages = async () => {
    setGmailSyncing(true);
    setGmailError(null);
    try {
      const msgs = await listGmailMessages(gmailQuery);
      const detailsArray = await Promise.all(
        msgs.slice(0, 5).map(async (msg: any) => {
          try {
            return await getGmailMessageDetails(msg.id);
          } catch (e) {
            return null;
          }
        })
      );
      setGmailMessages(detailsArray.filter(d => d !== null));
    } catch (err: any) {
      console.error(err);
      setGmailError('Failed to list emails: ' + (err.message || err));
    } finally {
      setGmailSyncing(false);
    }
  };

  const handleSendGmailReport = async () => {
    setGmailSyncing(true);
    setGmailError(null);
    setGmailSuccess(null);
    try {
      const targetEmail = userData?.email || auth.currentUser?.email || '';
      if (!targetEmail) {
        throw new Error("No receiver email address is specified in profile.");
      }

      const userName = userData?.name || 'Valued Client';
      const weightText = userData?.healthAssessment?.weight ? `${userData.healthAssessment.weight} kg` : 'Not specified';
      const bmiText = userData?.healthAssessment?.bmi ? Number(userData.healthAssessment.bmi).toFixed(1) : 'Not specified';
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #1e1e24; background-color: #0d0d0f; color: #f1f5f9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <div style="background-color: #141417; padding: 25px 20px; border-bottom: 2px solid #e60000; text-align: center;">
            <p style="color: #e60000; font-family: monospace; font-size: 11px; margin: 0; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">Speed Fit Performance Portal</p>
            <h1 style="color: #ffffff; margin: 5px 0 0 0; font-size: 24px; font-weight: bold; text-transform: uppercase;">FITNESS ASSESSMENT SUMMARY</h1>
          </div>
          
          <!-- Content Body -->
          <div style="padding: 24px; line-height: 1.6; color: #a1a1aa; font-size: 14px;">
            <p style="color: #ffffff; font-size: 15px; margin-top: 0;">Dear <strong style="color: #ffffff;">${userName}</strong>,</p>
            <p>Your authentic Speed Fit fitness progress has been updated successfully. Below is your current performance summary compiled directly from your health logs:</p>
            
            <!-- Matrix Table -->
            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #141417; border-radius: 8px; overflow: hidden; border: 1px solid #1e1e24;">
              <thead>
                <tr style="background-color: #1c1c22; text-align: left;">
                  <th style="padding: 10px 14px; color: #ffffff; font-size: 12px; font-family: monospace; border-bottom: 1px solid #1e1e24; text-transform: uppercase;">METRIC PARAMETER</th>
                  <th style="padding: 10px 14px; color: #e60000; font-size: 12px; font-family: monospace; border-bottom: 1px solid #1e1e24; text-transform: uppercase;">CURRENT VALUES</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #1e1e24; font-family: monospace; font-size: 13px;">Body Weight Tracked</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #1e1e24; color: #ffffff; font-size: 13px; font-weight: bold;">${weightText}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #1e1e24; font-family: monospace; font-size: 13px;">Calculated Body Mass Index (BMI)</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #1e1e24; color: #ffffff; font-size: 13px; font-weight: bold;">${bmiText}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #1e1e24; font-family: monospace; font-size: 13px;">Onboarding Status</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #1e1e24; color: #ffffff; font-size: 13px;">Active Client</td>
                </tr>
              </tbody>
            </table>
            
            <p style="margin-top: 20px;">Use your Speed Fit dashboard to submit daily metric updates and track your fitness progress.</p>
            
            <div style="margin-top: 30px; text-align: center; border-top: 1px solid #1e1e24; padding-top: 20px;">
              <p style="font-size: 11px; color: #71717a; margin: 0; font-family: monospace; text-transform: uppercase;">CONFIDENTIAL - FOR CLIENT ONLY</p>
              <p style="font-size: 10px; color: #52525b; margin: 5px 0 0 0;">Speed Fit Fitness Management.</p>
            </div>
          </div>
        </div>
      `;

      await sendGmailEmail(targetEmail, `Your Speed Fit Biometrics Progress Summary Report`, emailHtml);
      setGmailSuccess(`Comprehensive physical metrics sent successfully to ${targetEmail}! Check your inbox.`);
    } catch (err: any) {
      console.error(err);
      setGmailError(err.message || 'Failed to dispatch Gmail message.');
    } finally {
      setGmailSyncing(false);
    }
  };

  const handleGmailLogout = () => {
    clearGmailAuthorization();
    setGmailAuthorized(false);
    setGmailMessages([]);
    setGmailSuccess(null);
  };

  useEffect(() => {
    const isGmailAuth = isGmailAuthorized();
    setGmailAuthorized(isGmailAuth);
    if (isGmailAuth) {
      handleFetchGmailMessages();
    }
  }, []);

  const handleProgressPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingProgress(true);
      const url = await firebaseService.uploadFile(file, `progress/${userData.uid}_${Date.now()}`);
      await firebaseService.saveProgressPhoto({
        clientId: userData.uid,
        imageUrl: url,
        category: progressCategory,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      alert("Progress image uploaded to platform database successfully!");
    } catch (err) {
      console.error(err);
      alert("Media upload failed, please retry.");
    } finally {
      setIsUploadingProgress(false);
    }
  };

  // Standard interactive exercise demonstrator modal builder
  const handleStartWorkoutOverview = (title: string, sections: any[]) => {
    if (!sections || sections.length === 0) return;
    const mentionedExercises = COMMON_EXERCISES.filter(ex => 
      sections.some(s => s.content?.toLowerCase()?.includes(ex.toLowerCase()))
    ).map(ex => ({ exercise: ex }));
    
    // Fallback exercises
    if (mentionedExercises.length === 0) {
      mentionedExercises.push({ exercise: "EMS Body Squats" });
      mentionedExercises.push({ exercise: "EMS Core Planks" });
    }

    setCurrentWorkoutTitle(title);
    setCurrentWorkoutContent(sections.map(s => `=== ${s.title} ===\n${s.content}`).join("\n\n"));
    setCurrentWorkoutExercises(mentionedExercises);
    setIsWorkoutModalOpen(true);
  };

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#B2B2B2] font-bold">Syncing Prestige Cloud...</p>
        </div>
      </div>
    );
  }


  const handleMarkNotificationRead = async (id: string) => {
    try {
      await firebaseService.markNotificationAsRead(id);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleRespondProposal = async (sessionId: string, response: 'accept' | 'decline') => {
    try {
      await firebaseService.clientRespondProposal(sessionId, userData.uid, response);
    } catch (err: any) {
      alert(err.message || 'Failed to update proposal response.');
    }
  };

  const handleNavigateTab = (tab: string, sub?: string) => {
    if (sub) {
      setSearchParams({ tab, sub });
    } else {
      setSearchParams({ tab });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. HOME VIEW */}
      {currentTab === 'home' && (
        <ClientHomeView
          userData={userData}
          activeWorkoutPlan={activeWorkoutPlan}
          activeDietPlan={activeDietPlan}
          sessions={sessions}
          attendance={attendance}
          progressRecords={progressRecords}
          paymentRecords={paymentRecords}
          notifications={notifications}
          onNavigateTab={handleNavigateTab}
          onMarkNotificationRead={handleMarkNotificationRead}
          onRespondProposal={handleRespondProposal}
        />
      )}

      {/* 2. MY PLAN VIEW (Workout and Diet inside My Plan) */}
      {(currentTab === 'myplan' || currentTab === 'workout' || currentTab === 'diet') && (
        <ClientMyPlanView
          activeWorkoutPlan={activeWorkoutPlan}
          workoutPlans={workoutPlans}
          activeDietPlan={activeDietPlan}
          dietPlans={dietPlans}
          initialSubTab={searchParams.get('sub') === 'diet' || currentTab === 'diet' ? 'diet' : 'workout'}
        />
      )}

      {/* 3. SESSIONS VIEW (Sessions and Attendance inside Sessions) */}
      {currentTab === 'sessions' && (
        <ClientSessionsView
          userData={userData}
          sessions={sessions}
          attendance={attendance}
          trainers={trainers}
          initialSubTab={searchParams.get('sub') === 'attendance' ? 'attendance' : 'bookings'}
          onRequestSessionSuccess={() => {}}
        />
      )}

      {/* 4. PROGRESS VIEW (Trainer-Managed Progress) */}
      {currentTab === 'progress' && (
        <ClientProgressView
          userData={userData}
          progressRecords={progressRecords}
        />
      )}

      {/* 5. PROFILE VIEW (Assessments, Payments, and Terms inside Profile) */}
      {(currentTab === 'profile' || currentTab === 'assessments' || currentTab === 'payments' || currentTab === 'terms') && (
        <ClientProfileView
          userData={userData}
          paymentRecords={paymentRecords}
          onLogout={() => signOut(auth)}
          initialSubTab={
            currentTab === 'assessments' ? 'assessments' :
            currentTab === 'payments' ? 'payments' :
            currentTab === 'terms' ? 'terms' :
            (searchParams.get('sub') as any) || 'profile'
          }
        />
      )}

      {/* Embedded interactive exercise and video demonstration modal */}
      {isWorkoutModalOpen && (
        <VisualWorkoutModal 
          isOpen={isWorkoutModalOpen}
          onClose={() => setIsWorkoutModalOpen(false)}
          planTitle={currentWorkoutTitle}
          exercises={currentWorkoutExercises}
          planContent={currentWorkoutContent}
          onToggleComplete={handleToggleExerciseComplete}
          completedExercises={completedExercises}
          initialIndex={initialWorkoutIndex}
        />
      )}
    </div>
  );
};


export default ClientDashboard;
