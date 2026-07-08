import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js';
import { WorkoutLog } from '../types';

export const generateReport = async (clientId: string, type: 'weekly' | 'monthly') => {
  const logsRef = collection(db, 'workoutLogs');
  const q = query(logsRef, where('clientId', '==', clientId));
  const querySnapshot = await getDocs(q);
  
  const logs: WorkoutLog[] = [];
  querySnapshot.forEach((doc) => {
    logs.push(doc.data() as WorkoutLog);
  });

  // Aggregate data
  const totalVolume = logs.reduce((sum, log) => 
    sum + log.entries.reduce((s, entry) => s + (parseInt(entry.sets) || 0) * (parseInt(entry.reps) || 0) * (parseFloat(entry.weight) || 0), 0), 0);
  
  const sessionCount = logs.length;

  return {
    totalVolume,
    sessionCount,
    logs
  };
};
