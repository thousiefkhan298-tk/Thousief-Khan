import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';

export const useAllDietPlans = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToAllDietPlans((plans) => {
      setPlans(plans);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { plans, loading };
};
