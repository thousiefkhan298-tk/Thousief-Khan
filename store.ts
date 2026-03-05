
import { User, ClientDetails, HealthAssessment, FitnessAssessment, WorkoutPlan, DietPlan, AttendanceRecord, PaymentRecord } from './types';

const STORAGE_KEYS = {
  AUTH_USER: 'speedfit_auth_user',
};

const api = {
  get: async (path: string) => {
    const res = await fetch(`/api${path}`, { cache: 'no-store' });
    return res.json();
  },
  post: async (path: string, data: any) => {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
};

export const store = {
  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    return data ? JSON.parse(data) : null;
  },
  setCurrentUser: (user: User | null) => {
    if (user) localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  },
  saveUser: async (user: User) => {
    return api.post('/users', user);
  },
  getAllClients: async (): Promise<User[]> => {
    const users = await api.get('/users');
    if (!Array.isArray(users)) return [];
    return users.filter((u: User) => u.role === 'CLIENT');
  },
  getClientData: async (clientId: string) => {
    return api.get(`/client-data/${clientId}`);
  },
  getStats: async () => {
    return api.get('/stats');
  },
  getRecentActivity: async () => {
    return api.get('/activity');
  },
  getNotifications: async (clientId: string) => {
    const data = await api.get(`/client-data/${clientId}`);
    return data.notifications || [];
  },
  saveClientDetails: async (clientId: string, data: ClientDetails) => {
    return api.post('/client-details', { clientId, ...data });
  },
  saveHealthAssessment: async (clientId: string, data: HealthAssessment) => {
    return api.post('/health-assessment', { clientId, ...data });
  },
  saveFitnessAssessment: async (clientId: string, data: FitnessAssessment) => {
    return api.post('/fitness-assessment', { clientId, ...data });
  },
  saveWorkout: async (clientId: string, plan: string) => {
    return api.post('/workouts', { clientId, plan });
  },
  saveWorkoutLog: async (log: any) => {
    return api.post('/workout-logs', log);
  },
  saveDiet: async (clientId: string, plan: string) => {
    return api.post('/diets', { clientId, plan });
  },
  addAttendance: async (clientId: string, status: 'Present' | 'Missed') => {
    return api.post('/attendance', { clientId, status });
  },
  savePayment: async (payment: PaymentRecord) => {
    return api.post('/payments', payment);
  },
  markNotificationsAsRead: async (clientId: string) => {
    return api.post('/notifications/read', { clientId });
  },
  updateUserStatus: async (userId: string, isOnline: boolean) => {
    return api.post('/users/status', { userId, isOnline, lastActive: new Date().toISOString() });
  },
  getConfig: async () => {
    return api.get('/config');
  },
  saveConfig: async (config: { projectId: string; clientEmail: string; privateKey: string }) => {
    return api.post('/config', config);
  },
  getSessionRequests: async (clientId?: string) => {
    return api.get(`/session-requests${clientId ? `?clientId=${clientId}` : ''}`);
  },
  createSessionRequest: async (data: any) => {
    return api.post('/session-requests', data);
  },
  updateSessionRequest: async (id: string, data: any) => {
    const res = await fetch(`/api/session-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  saveTrainerNote: async (note: any) => {
    return api.post('/trainer-notes', note);
  },
  getMessages: async (userId: string, otherUserId: string) => {
    return api.get(`/messages/${userId}/${otherUserId}`);
  },
  saveProgressPhoto: async (photo: any) => {
    return api.post('/progress-photos', photo);
  },
  getProgressPhotos: async (clientId: string) => {
    return api.get(`/progress-photos/${clientId}`);
  }
};

