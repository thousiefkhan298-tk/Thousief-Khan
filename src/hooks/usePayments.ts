import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';

export const usePayments = (clientId: string) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    const unsubscribe = firebaseService.subscribeToPaymentRecords(clientId, (data) => {
      setPayments(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [clientId]);

  return { payments, loading };
};
