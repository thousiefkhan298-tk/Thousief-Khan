import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';

export const useAttendance = (clientId: string) => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    const unsubscribe = firebaseService.subscribeToAttendance(clientId, (data) => {
      setAttendance(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [clientId]);

  return { attendance, loading };
};
