import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';

export const useAllAttendance = () => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToAllAttendance((data) => {
      setAttendance(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { attendance, loading };
};
