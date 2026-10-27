
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

export interface ClientDetails {
  fullName: string;
  age?: string;
  dob: string;
  gender?: string;
  phoneNumber: string;
  email: string;
  occupation: string;
  address?: string;
  emergencyContact: string; // Phone number or name & phone
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface FitnessAssessmentData {
  height: string; // cm
  weight: string; // kg
  goals: string[];
  customGoal?: string;
  trainingExperience: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  activityLevel: 'Sedentary' | 'Lightly Active' | 'Moderately Active' | 'Very Active' | string;
  equipment: string[];
  preferredTrainingTimes: string[];
  updatedAt?: string;
}

export interface MedicalAssessmentData {
  noKnownConditions: boolean;
  conditions: string[];
  otherConditions?: string;
  injuriesOrSurgeries: string;
  painOrRestrictions: string[];
  medications: string;
  allergies: string;
  doctorRestrictions: string;
  flaggedForReview: boolean;
  flaggedNotes?: string;
  updatedAt?: string;
}

export interface DietPreferencesData {
  preference: 'Vegetarian' | 'Non-Vegetarian' | 'Vegan' | 'Eggetarian' | string;
  foodAllergies: string[];
  otherAllergies?: string;
  mealTimings: {
    breakfast?: string;
    lunch?: string;
    eveningSnack?: string;
    dinner?: string;
  };
  dietaryRestrictions: string;
  updatedAt?: string;
}

export interface TermsConsentData {
  accepted: boolean;
  acceptedAt: string;
  typedFullName: string;
  termsVersion: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  phoneNumber?: string;
  onboardingCompleted: boolean;
  onboardingStep?: number;
  onboardingDraft?: any;
  onboardingSubmittedAt?: string;
  assessmentReopened?: boolean;
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
  termsAcceptedName?: string;
  termsVersion?: string;
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
  fitnessAssessment?: FitnessAssessmentData;
  medicalAssessment?: MedicalAssessmentData;
  dietPreferences?: DietPreferencesData;
  termsConsent?: TermsConsentData;
  trainerId?: string;
  isMigrated?: boolean;
  migratedTo?: string;
  claimedFromId?: string;
  uid?: string;
  linkPending?: boolean;
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

export interface WorkoutPlanExercise {
  name: string;
  demoLink?: string;
  sets: string | number;
  reps: string | number;
  rest?: string;
  tempo?: string;
  prescribedLoad?: string;
  instructions?: string;
  alternatives?: string;
}

export interface WorkoutPlan {
  id: string;
  clientId: string;
  title: string;
  startDate?: string;
  endDate?: string;
  trainingDays?: string[];
  exercises?: WorkoutPlanExercise[];
  sections?: WorkoutPlanSection[];
  trainerInstructions?: string;
  isPublished?: boolean;
  isArchived?: boolean;
  version?: number;
  previousVersions?: any[];
  updatedAt: string;
  approved?: boolean;
  approvalStatus?: 'draft' | 'ready' | 'revision';
}

export interface DietMealItem {
  foodName: string;
  quantity: string;
  unit: string;
  alternatives?: string;
}

export interface DietMeal {
  mealTime: string;
  name: string;
  items: DietMealItem[];
  instructions?: string;
}

export interface DietPlan {
  id: string;
  clientId: string;
  title?: string;
  plan?: string;
  meals?: DietMeal[];
  hydrationGuidance?: string;
  trainerNotes?: string;
  calories?: number;
  macros?: {
    protein?: number;
    carbs?: number;
    fats?: number;
  };
  isPublished?: boolean;
  isArchived?: boolean;
  version?: number;
  previousVersions?: any[];
  updatedAt: string;
}

export interface AttendanceAuditEntry {
  changedBy: string;
  changedByName?: string;
  changedAt: string;
  oldStatus?: string;
  newStatus: string;
  oldNotes?: string;
  newNotes?: string;
  reason?: string;
}

export interface AttendanceRecord {
  id: string;
  clientId: string;
  date: string; // YYYY-MM-DD
  time?: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused' | 'Missed';
  notes?: string;
  trainerNotes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  auditHistory?: AttendanceAuditEntry[];
}

export interface SessionRequest {
  id: string;
  clientId: string;
  clientName?: string;
  trainerId?: string;
  trainerName?: string;
  originalDate?: string;
  requestedDate: string;
  time?: string; // HH:mm format
  durationMinutes?: number;
  mode?: 'in-person' | 'online';
  status: 'Pending' | 'Confirmed' | 'Rejected' | 'Cancelled' | 'Completed' | 'Proposed';
  proposedTime?: string;
  proposedDate?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UpcomingSession {
  id: string;
  clientId: string;
  clientName?: string;
  trainerId?: string;
  trainerName?: string;
  date: string;
  time?: string;
  durationMinutes?: number;
  mode?: 'in-person' | 'online';
  status: 'Pending' | 'Confirmed' | 'Rejected' | 'Cancelled' | 'Completed' | 'Proposed';
  proposedTime?: string;
  proposedDate?: string;
  rejectionReason?: string;
  notes?: string;
  trainerNotes?: string;
  createdAt?: string;
  updatedAt?: string;
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
  packageName?: string;
  billingPeriod?: string;
  feeINR?: number;
  amountPaid?: number;
  outstandingBalance?: number;
  startDate: string;
  dueDate: string;
  renewalDate?: string;
  status: 'Paid' | 'Partially Paid' | 'Due' | 'Overdue' | 'Pending';
  amount?: number | string;
  packageType?: string;
  referenceNumber?: string;
  paymentDate?: string;
  charges?: Array<{ id: string; description: string; amountINR: number; date: string }>;
  payments?: Array<{ id: string; amountINR: number; date: string; method: string; receiptNumber: string; referenceNumber?: string; notes?: string; recordedBy?: string }>;
  transactions?: PaymentTransaction[];
  remindersSent?: Array<{ type: string; sentAt: string }>;
  followUpHistory?: Array<{ id: string; date: string; stage: string; channel: string; status: string; notes: string; recipientEmail?: string; recipientPhone?: string; sentBy?: string }>;
  updatedAt?: string;
}

export interface ProgressStrengthItem {
  exercise: string;
  weight: string;
  reps: string;
  notes?: string;
}

export interface ProgressRecord {
  id: string;
  clientId: string;
  reviewDate: string; // YYYY-MM-DD
  weight?: number | string;
  measurements?: {
    chest?: string;
    waist?: string;
    hips?: string;
    arms?: string;
    thighs?: string;
    neck?: string;
  };
  strengthResults?: ProgressStrengthItem[];
  progressPhotoUrl?: string;
  photoConsentRecorded?: boolean;
  clientVisibleFeedback: string;
  privateTrainerNotes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'payment' | 'session' | 'workout' | 'attendance' | 'general';
  read: boolean;
  createdAt: string;
  link?: string;
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

export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Assessment Booked' | 'Won' | 'Not Now';

export interface LeadContact {
  name: string;
  whatsapp: string;
  email?: string;
  age?: number | string;
  sex?: 'Male' | 'Female' | 'Other' | string;
  height?: number | string; // cm
  weight?: number | string; // kg
}

export interface LeadGoals {
  primaryGoal: string;
  targetWeight?: string;
  timeline: string;
  motivationNotes?: string;
}

export interface LeadTraining {
  experience: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  currentActivity: string;
  location: 'Speed Fit Gym' | 'Home' | 'Commercial Gym' | 'Hybrid' | string;
  equipmentAccess: string[];
  sessionsPerWeek: number | string;
  sessionLength: string;
  availability: string[];
}

export interface ParqAnswers {
  heartCondition: boolean;
  chestPainActive: boolean;
  chestPainRest: boolean;
  dizzinessOrBalance: boolean;
  boneOrJointIssue: boolean;
  bloodPressureOrHeartMeds: boolean;
  otherReasonNoExercise: boolean;
}

export interface LeadDailyLife {
  sleepHours: string;
  waterIntakeLiters: string;
  stressLevel: 'Low' | 'Moderate' | 'High' | 'Extreme' | string;
  dietPreference: 'Vegetarian' | 'Non-Vegetarian' | 'Vegan' | 'Eggetarian' | 'Jain' | string;
  tobaccoUse: 'None' | 'Occasional' | 'Regular' | string;
  alcoholUse: 'None' | 'Occasional' | 'Regular' | string;
  allergies?: string;
}

export interface LeadConsent {
  accepted: boolean;
  acceptedAt: string;
  acknowledgedNotMedical: boolean;
}

export interface LeadFollowUpItem {
  date: string;
  stage: 'immediate' | 'day1' | 'day3' | 'day7' | 'day14' | 'custom' | string;
  channel: 'whatsapp' | 'call' | 'email' | string;
  note?: string;
}

export interface LeadSubmission {
  id?: string;
  createdAt: string;
  updatedAt?: string;
  source: 'public_assessment' | 'manual_entry' | string;
  status: LeadStatus;
  followUpAt?: string;
  assignedTrainerId?: string;
  contact: LeadContact;
  goals: LeadGoals;
  assessment: {
    training: LeadTraining;
    parq: ParqAnswers;
    injuriesAndMedicalNotes?: string;
    dailyLife: LeadDailyLife;
  };
  healthFlags: string[];
  consent: LeadConsent;
  trainerNotes?: string;
  followUpHistory?: LeadFollowUpItem[];
  convertedClientId?: string;
  convertedAt?: string;
}

