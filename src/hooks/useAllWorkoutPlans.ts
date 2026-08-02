import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';

export const useAllWorkoutPlans = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToAllWorkoutPlans((plans) => {
      setPlans(plans);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { plans, loading };
};
