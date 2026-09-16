
export interface UIOverlay {
  repBadge: string; // e.g., "A. 16 REPS"
  anatomyTarget: string; // e.g., "QUADS"
  glowColor: string; // e.g., "WHITE_NEON"
}

export interface WorkoutDisplayData {
  exerciseName: string;
  videoUrl: string;
  gridLayout: "8-PANEL_SYNC";
  uiOverlays: UIOverlay;
}

export interface WorkoutTemplateEntry {
  exercise: string;
  defaultSets: string;
  defaultReps: string;
  defaultWeight: string;
  videoUrl?: string;
  uiOverlays?: UIOverlay;
}

export interface WorkoutTemplate {
  id: string;
  trainerId: string;
  name: string;
  entries: WorkoutTemplateEntry[];
  createdAt: string;
}

export type UserRole = 'TRAINER' | 'CLIENT';

export const UserRole = {
  TRAINER: 'TRAINER' as const,
  CLIENT: 'CLIENT' as const,
};

export interface User {
  id: string;
  email: string;
  role: UserRole;
  phoneNumber?: string;
  onboardingCompleted: boolean;
  name?: string;
  lastActive?: string;
  isOnline?: boolean;
  status?: string;
  avatar?: 'male' | 'female';
  isActive?: boolean;
  bio?: string;
  specialties?: string;
  certifications?: string;
  experience?: string;
  photoURL?: string;
  password?: string;
  assignedPassword?: string;
  passwordHash?: string;
  clientDetails?: ClientDetails;
  healthAssessment?: HealthAssessment;
  trainerId?: string;
  isMigrated?: boolean;
  migratedTo?: string;
  claimedFromId?: string;
  uid?: string;
  linkPending?: boolean;
}

export interface ClientDetails {
  fullName: string;
  age: string;
  dob: string;
  gender: string;
  phoneNumber: string;
  email: string;
  address: string;
  emergencyContact: string;
}

export interface ConcernForm {
  primaryConcern: string;
  secondaryConcern: string;
  expectations: string;
  limitations: string;
}

export interface HealthAssessment {
  conditions: string[];
  otherConditions: string;
  smoking: boolean;
  alcohol: boolean;
  stress: 'Low' | 'Moderate' | 'High';
  occupation: 'Active' | 'Sedentary';
  sleepHours: string;
  currentlyActive: boolean;
  pastExperience: string;
  trainingDaysPerWeek: string;
  goals: string[];
  targetWeight?: string;
  targetDate?: string;
  height: string;
  weight: string;
  waist: string;
  bloodPressure?: string;
  painActivities: string[];
  medications: string;
  confirmed: boolean;
  consentGiven: boolean;
  consentDate?: string;
  healthConcerns?: string;
}

export interface ScheduledWorkout {
  id: string;
  clientId: string;
  date: string;
  entries: WorkoutLogEntry[];
  notes?: string;
  status: 'SCHEDULED' | 'COMPLETED';
}

export interface MovementScreenScore {
  raw: string;
  final: string;
  comments: string;
}

export interface FitnessAssessment {
  id?: string;
  clientId: string;
  date: string;
  dob: string;
  gender: string;
  assessNum: string;
  admin: string;
  height: string;
  weight: string;
  bodyFat: {
    triceps: string;
    chest: string;
    midAxillary: string;
    subScapular: string;
    abdomen: string;
    supraIliac: string;
    thigh: string;
  };
  circumference: {
    neck: string;
    shoulders: string;
    chest: string;
    waist: string;
    hips: string;
    rightThigh: string;
    leftThigh: string;
    rightUpperArm: string;
    leftUpperArm: string;
  };
  movementScreen: {
    deepSquat: MovementScreenScore;
    hurdleStepL: MovementScreenScore;
    hurdleStepR: MovementScreenScore;
    inlineLungeL: MovementScreenScore;
    inlineLungeR: MovementScreenScore;
    shoulderMobilityL: MovementScreenScore;
    shoulderMobilityR: MovementScreenScore;
    impingementL: MovementScreenScore;
    impingementR: MovementScreenScore;
    straightLegRaiseL: MovementScreenScore;
    straightLegRaiseR: MovementScreenScore;
    trunkStability: MovementScreenScore;
    pressUpClearing: MovementScreenScore;
    rotaryStabilityL: MovementScreenScore;
    rotaryStabilityR: MovementScreenScore;
    posteriorRocking: MovementScreenScore;
    totalScore: string;
  };
  physicalTests: {
    stepTestBpm: string;
    calorieBurnAirDyne: string;
    maximalWallSitTime: string;
    pushUps: string;
    maximalPlankTime: string;
  };
  postureAnalysis: string;
  notes: string;
  updatedAt?: string;
}

export interface FavoriteExercise {
  id: string;
  trainerId: string;
  name: string;
  defaultSets: string;
  defaultReps: string;
}

export interface WorkoutPlanSection {
  title: string;
  content: string;
}

export interface WorkoutPlan {
  id: string;
  clientId: string;
  sections: WorkoutPlanSection[];
  updatedAt: string;
  approved?: boolean;
  approvalStatus?: 'draft' | 'ready' | 'revision';
}

export interface DietPlan {
  id: string;
  clientId: string;
  plan: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  clientId: string;
  date: string;
  status: 'Present' | 'Missed';
}

export interface SessionRequest {
  id: string;
  clientId: string;
  originalDate: string;
  requestedDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  createdAt: string;
}

export interface UpcomingSession {
  id: string;
  clientId: string;
  date: string;
  status: 'Pending' | 'Confirmed';
}

export interface PaymentTransaction {
  id: string;
  date: string;
  amount: number | string;
  method: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | string;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  clientId: string;
  package: string;
  startDate: string;
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  amount?: number | string;
  packageType?: string;
  transactions?: PaymentTransaction[];
}

export interface WorkoutLogEntry {
  exercise: string;
  sets: string;
  reps: string;
  weight: string;
  videoUrl?: string;
}

export interface WorkoutLog {
  id: string;
  clientId: string;
  date: string;
  entries: WorkoutLogEntry[];
  notes?: string;
}

export interface TrainerNote {
  id: string;
  clientId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface ProgressPhoto {
  id: string;
  clientId: string;
  date: string;
  imageUrl: string;
  notes?: string;
}

export interface HealthMetricsSnapshot {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  metabolicAge: number;
  primaryPath: 'Fat Loss' | 'Muscle Gain' | 'Ready to Shoot';
  calculatedAt: string;
}

export interface Testimonial {
  id?: string;
  clientName: string;
  clientEmail?: string;
  beforeWeight?: string;
  afterWeight?: string;
  durationWeeks?: string;
  bodyQuote: string;
  trainerId: string;
  createdAt: string;
  imageUrl?: string;
  achievement?: string;
}

