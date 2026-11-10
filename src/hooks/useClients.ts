import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import { User } from '../types';
import { ADMIN_EMAIL, TRAINER_EMAILS } from '../constants';

export const useClients = (trainerId?: string, trainerEmail?: string) => {
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isOwnerOrAdmin = 
      (trainerEmail && TRAINER_EMAILS.some(e => e.toLowerCase() === trainerEmail.toLowerCase())) ||
      trainerId === 'Wr3ZaCCtFkM5IuAHUFsZznq973h2';

    const processUsers = (users: User[]) => {
      const claimedFromIds = new Set(users.map((u: any) => u.claimedFromId).filter(Boolean));

      let filteredClients = users.filter((u: User) => {
        const isClient = u.role === 'CLIENT' || !u.role;
        const isGhost = u.isMigrated === true || claimedFromIds.has(u.id || u.uid);
        return isClient && !isGhost;
      });

      // Filter by trainer unless logged in trainer is the gym owner/admin
      if (trainerId && !isOwnerOrAdmin) {
        filteredClients = filteredClients.filter((u: User) => {
          if (!u.trainerId) return true; // Unassigned clients remain visible to all trainers
          if (u.trainerId === trainerId) return true;
          if (trainerEmail && u.trainerId.toLowerCase() === trainerEmail.toLowerCase()) return true;
          return false;
        });
      }

      // Non-destructive deduplication by email: PRESERVE all assessment answers, clientDetails, and biometrics
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

          const uIsRealAuth = uId.length > 20 && !u.assignedPassword && !u.password;
          const exIsRealAuth = exId.length > 20 && !existing.assignedPassword && !existing.password;

          const primary = uIsRealAuth ? u : (exIsRealAuth ? existing : (u.onboardingCompleted ? u : existing));
          const secondary = primary === u ? existing : u;

          const merged: User = {
            ...secondary,
            ...primary,
            id: primary.id || primary.uid || secondary.id || secondary.uid,
            uid: primary.uid || primary.id || secondary.uid || secondary.id,
            email: emailKey,
            clientDetails: primary.clientDetails || secondary.clientDetails,
            fitnessAssessment: primary.fitnessAssessment || secondary.fitnessAssessment,
            medicalAssessment: primary.medicalAssessment || secondary.medicalAssessment,
            dietPreferences: primary.dietPreferences || secondary.dietPreferences,
            termsConsent: primary.termsConsent || secondary.termsConsent,
            healthAssessment: primary.healthAssessment || secondary.healthAssessment,
            onboardingCompleted: Boolean(primary.onboardingCompleted || secondary.onboardingCompleted),
            onboardingSubmittedAt: primary.onboardingSubmittedAt || secondary.onboardingSubmittedAt,
            name: primary.clientDetails?.fullName || primary.name || secondary.clientDetails?.fullName || secondary.name,
            phoneNumber: primary.clientDetails?.phoneNumber || primary.phoneNumber || secondary.clientDetails?.phoneNumber || secondary.phoneNumber,
            role: 'CLIENT'
          };

          emailMap.set(emailKey, merged);
        }
      }

      setClients(Array.from(emailMap.values()));
      setLoading(false);
    };

    // 1. Subscribe to real-time users in Firestore
    const unsubscribe = firebaseService.subscribeToUsers((users) => {
      processUsers(users);
    });

    // 2. Fetch server-side roster as instant backup/hydration
    fetch('/api/trainer/clients')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.clients) && data.clients.length > 0) {
          processUsers(data.clients);
        }
      })
      .catch(() => {});

    return () => unsubscribe();
  }, [trainerId, trainerEmail]);

  return { clients, loading };
};
