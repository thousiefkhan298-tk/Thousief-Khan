import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';

export const useMessages = (uid: string) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = firebaseService.subscribeToMessages(uid, (data) => {
      setMessages(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [uid]);

  return { messages, loading };
};
