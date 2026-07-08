import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import { User } from '../types';

export const useClients = (trainerId?: string) => {
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToUsers((users) => {
      let filteredClients = users.filter((u: User) => u.role === 'CLIENT' || !u.role);
      if (trainerId) {
        filteredClients = filteredClients.filter((u: User) => u.trainerId === trainerId);
      }
      setClients(filteredClients);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [trainerId]);

  return { clients, loading };
};
