import { db } from '../firebase';
import { collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { User, FavoriteExercise } from '../types';

export const firebaseService = {
  // Users
  async getUser(uid: string) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  async getUsers(): Promise<User[]> {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  },

  subscribeToUsers(callback: (users: User[]) => void) {
    const q = collection(db, 'users');
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    });
  },

  async updateUser(uid: string, data: any) {
    await updateDoc(doc(db, 'users', uid), data);
  },

  // Workout Logs
  subscribeToWorkoutLogs(callback: (logs: any[]) => void, clientId?: string) {
    const q = clientId 
      ? query(collection(db, 'workoutLogs'), where('clientId', '==', clientId))
      : collection(db, 'workoutLogs');
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  async saveWorkoutLog(log: any) {
    if (log.id) {
      await updateDoc(doc(db, 'workoutLogs', log.id), log);
    } else {
      await addDoc(collection(db, 'workoutLogs'), log);
    }
  },

  async deleteWorkoutLog(id: string) {
    await deleteDoc(doc(db, 'workoutLogs', id));
  },

  // Trainer Notes
  subscribeToTrainerNotes(clientId: string, callback: (notes: any[]) => void) {
    const q = query(collection(db, 'trainerNotes'), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  async saveTrainerNote(note: any) {
    if (note.id) {
      await updateDoc(doc(db, 'trainerNotes', note.id), note);
    } else {
      await addDoc(collection(db, 'trainerNotes'), note);
    }
  },

  async deleteTrainerNote(id: string) {
    await deleteDoc(doc(db, 'trainerNotes', id));
  },

  // Workout Plans
  subscribeToWorkoutPlans(clientId: string, callback: (plans: any[]) => void) {
    const q = query(collection(db, 'workoutPlans'), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  async saveWorkoutPlan(plan: any) {
    if (plan.id) {
      await updateDoc(doc(db, 'workoutPlans', plan.id), plan);
    } else {
      await addDoc(collection(db, 'workoutPlans'), plan);
    }
  },

  async deleteWorkoutPlan(id: string) {
    await deleteDoc(doc(db, 'workoutPlans', id));
  },

  // Attendance
  subscribeToAttendance(clientId: string, callback: (attendance: any[]) => void) {
    const q = query(collection(db, 'attendance'), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  async markAttendance(attendance: any) {
    await addDoc(collection(db, 'attendance'), attendance);
  },

  // Messages
  subscribeToMessages(uid: string, callback: (messages: any[]) => void) {
    const q = query(collection(db, 'messages'), where('participants', 'array-contains', uid));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  async sendMessage(message: any) {
    await addDoc(collection(db, 'messages'), message);
  },

  // Reschedule Requests
  subscribeToRescheduleRequests(callback: (requests: any[]) => void) {
    return onSnapshot(collection(db, 'rescheduleRequests'), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  async updateRescheduleRequest(id: string, data: any) {
    await updateDoc(doc(db, 'rescheduleRequests', id), data);
  },

  // Sessions
  subscribeToAllSessions(callback: (sessions: any[]) => void) {
    const q = collection(db, 'sessions');
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  subscribeToUpcomingSessions(clientId: string, callback: (sessions: any[]) => void) {
    const q = query(collection(db, 'sessions'), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  async addSession(data: any) {
    await addDoc(collection(db, 'sessions'), data);
  },

  async confirmSession(id: string, data: any) {
    await updateDoc(doc(db, 'sessions', id), data);
  },

  async submitOnboarding(uid: string, data: any) {
    await updateDoc(doc(db, 'users', uid), { ...data, onboardingCompleted: true });
  },

  // Diet Plan
  subscribeToDietPlan(clientId: string, callback: (plan: any) => void) {
    const q = query(collection(db, 'dietPlans'), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.length > 0 ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null);
    });
  },

  // Payment Records
  subscribeToPaymentRecords(clientId: string, callback: (records: any[]) => void) {
    const q = query(collection(db, 'paymentRecords'), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  subscribeToAllPaymentRecords(callback: (records: any[]) => void) {
    return onSnapshot(collection(db, 'paymentRecords'), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  async updatePaymentRecord(id: string, data: any) {
    await updateDoc(doc(db, 'paymentRecords', id), data);
  },

  async addPaymentRecord(data: any) {
    await addDoc(collection(db, 'paymentRecords'), data);
  },

  async requestReschedule(data: any) {
    await addDoc(collection(db, 'rescheduleRequests'), data);
  },

  // Favorites
  async getFavorites(uid: string): Promise<FavoriteExercise[]> {
    const q = query(collection(db, 'favorites'), where('uid', '==', uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FavoriteExercise));
  },

  async toggleFavorite(uid: string, exercise: any) {
    const q = query(collection(db, 'favorites'), where('uid', '==', uid), where('name', '==', exercise.name));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      await addDoc(collection(db, 'favorites'), { uid, ...exercise });
    } else {
      await deleteDoc(doc(db, 'favorites', snapshot.docs[0].id));
    }
  },

  // Progress Photos
  subscribeToProgressPhotos(clientId: string, callback: (photos: any[]) => void) {
    const q = query(collection(db, 'progressPhotos'), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  async saveProgressPhoto(photo: any) {
    await addDoc(collection(db, 'progressPhotos'), photo);
  },

  async deleteProgressPhoto(id: string) {
    await deleteDoc(doc(db, 'progressPhotos', id));
  },
};
