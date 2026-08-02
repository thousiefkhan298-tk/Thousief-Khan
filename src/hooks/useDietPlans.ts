import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';

export const useDietPlans = (clientId: string) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    const unsubscribe = firebaseService.subscribeToDietPlans(clientId, (plans) => {
      setPlans(plans);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [clientId]);

  return { plans, loading };
};
