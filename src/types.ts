
export enum UserRole {
  TRAINER = 'TRAINER',
  CLIENT = 'CLIENT'
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  phoneNumber?: string;
  onboardingCompleted: boolean;
  name?: string;
  lastActive?: string;
  isOnline?: boolean;
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
  bloodPressure: string;
  painActivities: string[];
  medications: string;
  confirmed: boolean;
}

export interface FitnessAssessment {
  name: string;
  date: string;
  dob: string;
  gender: string;
  height: string;
  weight: string;
  skinFold: {
    triceps: string;
    chest: string;
    midAxillary: string;
    subScapular: string;
    abdomen: string;
    supraIliac: string;
    thigh: string;
  };
  postureAnalysis: string;
  movementScreen: string;
  stepTestBpm: string;
  performanceTest: string; // Air Dyne or Wall Sit
  pushUps: string;
}

export interface FavoriteExercise {
  id: string;
  trainerId: string;
  name: string;
  defaultSets: string;
  defaultReps: string;
}

export interface WorkoutPlan {
  id: string;
  clientId: string;
  plan: string;
  updatedAt: string;
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

export interface PaymentRecord {
  id: string;
  clientId: string;
  package: string;
  startDate: string;
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue';
}

export interface WorkoutLogEntry {
  exercise: string;
  sets: string;
  reps: string;
  weight: string;
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
