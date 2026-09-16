import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import { User } from '../types';

export const useClients = (trainerId?: string) => {
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToUsers((users) => {
      const claimedFromIds = new Set(users.map((u: any) => u.claimedFromId).filter(Boolean));

      let filteredClients = users.filter((u: User) => {
        const isClient = u.role === 'CLIENT' || !u.role;
        const isGhost = u.isMigrated === true || claimedFromIds.has(u.id || u.uid);
        return isClient && !isGhost;
      });

      if (trainerId) {
        // Only this trainer's own clients. Unassigned profiles stay visible so they
        // can still be claimed, but clients belonging to another trainer are excluded.
        filteredClients = filteredClients.filter((u: User) => !u.trainerId || u.trainerId === trainerId);
      }

      // Deduplicate by email to completely eliminate ghost duplicate clients on roster
      const emailMap = new Map<string, User>();
      for (const u of filteredClients) {
        const emailKey = (u.email || '').trim().toLowerCase();
        if (!emailKey) {
          emailMap.set(u.id || u.uid || Math.random().toString(), u);
          continue;
        }
        
        const existing = emailMap.get(emailKey);
        if (!existing) {
          emailMap.set(emailKey, u);
        } else {
          const uId = u.id || u.uid || '';
          const exId = existing.id || existing.uid || '';
          
          const uIsReal = uId.length > 20 && !u.assignedPassword && !u.password;
          const exIsReal = exId.length > 20 && !existing.assignedPassword && !existing.password;
          
          if (uIsReal && !exIsReal) {
            emailMap.set(emailKey, u);
          } else if (!uIsReal && exIsReal) {
            // Keep existing
          } else {
            const uFields = Object.keys(u).length;
            const exFields = Object.keys(existing).length;
            if (uFields > exFields) {
              emailMap.set(emailKey, u);
            }
          }
        }
      }
      filteredClients = Array.from(emailMap.values());

      setClients(filteredClients);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [trainerId]);

  return { clients, loading };
};
