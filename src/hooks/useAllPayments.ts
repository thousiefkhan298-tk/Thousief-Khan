import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';

export const useAllPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToAllPaymentRecords((records) => {
      setPayments(records);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { payments, loading };
};
