import { db, auth, handleFirestoreError, OperationType, storage, reportFirestoreError } from '../firebase';
import { collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, where, onSnapshot, addDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { User, FavoriteExercise, WorkoutTemplate, Testimonial, LeadSubmission, LeadStatus, LeadFollowUpItem } from '../types';
import { validateSixtyMinuteNotice } from './sessionBookingService';

function compressAndGetBase64(file: File, maxWidth = 400, maxHeight = 400, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => {
        resolve(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
}

export const firebaseService = {
  // Users
  async getUser(uid: string) {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async getUserByEmail(email: string): Promise<User | null> {
    const path = 'users';
    try {
      const q = query(collection(db, path), where('email', '==', email.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const completed = docs.find(u => u.onboardingCompleted);
        return completed || docs[0];
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return null;
    }
  },

  async getUsers(): Promise<User[]> {
    const path = 'users';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getTrainers(): Promise<User[]> {
    const path = 'users';
    try {
      const q = query(collection(db, path), where('role', '==', 'TRAINER'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  subscribeToUsers(callback: (users: User[]) => void) {
    const path = 'users';
    const q = collection(db, path);
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToTrainers(callback: (users: User[]) => void) {
    const path = 'users';
    const q = query(collection(db, path), where('role', '==', 'TRAINER'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async updateUser(uid: string, data: any) {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteUser(uid: string) {
    const path = `users/${uid}`;
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async deleteClientData(clientId: string) {
    try {
      const batch = writeBatch(db);
      
      // Delete user document
      batch.delete(doc(db, 'users', clientId));

      // Collections to clean up
      const collectionsToClean = [
        'workoutLogs',
        'workoutPlans',
        'dietPlans',
        'attendance',
        'paymentRecords',
        'rescheduleRequests',
        'favorites',
        'trainerNotes',
        'progressPhotos',
        'scheduledWorkouts',
        'sessions'
      ];

      for (const colName of collectionsToClean) {
        const queryField = colName === 'favorites' ? 'uid' : 'clientId';
        const q = query(collection(db, colName), where(queryField, '==', clientId));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clientData/${clientId}`);
    }
  },

  async createClient(data: { name: string, email: string, password?: string, trainerId: string }) {
    const path = 'users';
    try {
      const newClientRef = doc(collection(db, path));
      const rawPassword = data.password || 'speedfit123';
      
      // Hash the password securely using SHA-256
      const msgBuffer = new TextEncoder().encode(rawPassword);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Create secure data clone without plaintext password
      const secureData = { ...data };
      delete secureData.password;

      await setDoc(newClientRef, {
        ...secureData,
        passwordHash,
        uid: newClientRef.id,
        role: 'CLIENT',
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
        status: 'Active'
      });
      return newClientRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Workout Logs
  subscribeToWorkoutLogs(callback: (logs: any[]) => void, clientId?: string) {
    const path = 'workoutLogs';
    const q = clientId 
      ? query(collection(db, path), where('clientId', '==', clientId))
      : collection(db, path);
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async saveWorkoutLog(log: any) {
    const path = 'workoutLogs';
    try {
      if (log.id) {
        await updateDoc(doc(db, path, log.id), log);
      } else {
        await addDoc(collection(db, path), log);
      }
    } catch (error) {
      handleFirestoreError(error, log.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },

  async deleteWorkoutLog(id: string) {
    const path = `workoutLogs/${id}`;
    try {
      await deleteDoc(doc(db, 'workoutLogs', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Trainer Notes
  subscribeToTrainerNotes(clientId: string, callback: (notes: any[]) => void) {
    const path = 'trainerNotes';
    const q = query(collection(db, path), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async saveTrainerNote(note: any) {
    const path = 'trainerNotes';
    try {
      if (note.id) {
        await updateDoc(doc(db, path, note.id), note);
      } else {
        await addDoc(collection(db, path), note);
      }
    } catch (error) {
      handleFirestoreError(error, note.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },

  async deleteTrainerNote(id: string) {
    const path = `trainerNotes/${id}`;
    try {
      await deleteDoc(doc(db, 'trainerNotes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Workout Plans
  subscribeToWorkoutPlans(clientId: string, callback: (plans: any[]) => void) {
    const path = 'workoutPlans';
    const q = query(collection(db, path), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async saveWorkoutPlan(plan: any) {
    const path = 'workoutPlans';
    try {
      if (plan.id) {
        await updateDoc(doc(db, path, plan.id), plan);
      } else {
        await addDoc(collection(db, path), plan);
      }
    } catch (error) {
      handleFirestoreError(error, plan.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },

  async deleteWorkoutPlan(id: string) {
    const path = `workoutPlans/${id}`;
    try {
      await deleteDoc(doc(db, 'workoutPlans', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Diet Plans
  subscribeToDietPlans(clientId: string, callback: (plans: any[]) => void) {
    const path = 'dietPlans';
    const q = query(collection(db, path), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async saveDietPlan(plan: any) {
    const path = 'dietPlans';
    try {
      if (plan.id) {
        const { id, ...data } = plan;
        await updateDoc(doc(db, path, id), data);
      } else {
        await addDoc(collection(db, path), { ...plan, createdAt: new Date().toISOString() });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteDietPlan(id: string) {
    const path = `dietPlans/${id}`;
    try {
      await deleteDoc(doc(db, 'dietPlans', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Attendance
  subscribeToAllAttendance(callback: (attendance: any[]) => void) {
    const path = 'attendance';
    const q = query(collection(db, path));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToAllWorkoutPlans(callback: (plans: any[]) => void) {
    const path = 'workoutPlans';
    const q = query(collection(db, path));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToAllDietPlans(callback: (plans: any[]) => void) {
    const path = 'dietPlans';
    const q = query(collection(db, path));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToAttendance(clientId: string, callback: (attendance: any[]) => void) {
    const path = 'attendance';
    const q = query(collection(db, path), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async markAttendance(attendance: any, trainerUser?: { uid: string; name?: string }) {
    const path = 'attendance';
    try {
      const now = new Date().toISOString();
      const auditEntry = {
        changedBy: trainerUser?.uid || 'trainer',
        changedByName: trainerUser?.name || 'Speed Fit Coach',
        changedAt: now,
        newStatus: attendance.status,
        newNotes: attendance.trainerNotes || attendance.notes || '',
        reason: 'Initial attendance entry'
      };

      // Prevent duplicate session deduction: Check if attendance already exists for client on this date
      if (!attendance.id && attendance.clientId && attendance.date) {
        const q = query(
          collection(db, path),
          where('clientId', '==', attendance.clientId),
          where('date', '==', attendance.date)
        );
        const existingSnap = await getDocs(q);
        const matchingDoc = existingSnap.docs.find(d => {
          const dData = d.data();
          return !attendance.time || !dData.time || dData.time === attendance.time;
        });
        if (matchingDoc) {
          await this.updateAttendance(matchingDoc.id, attendance, trainerUser, 'Updated existing session attendance (duplicate prevention)');
          return matchingDoc.id;
        }
      }

      const recordWithAudit = {
        ...attendance,
        status: attendance.status || 'Present',
        trainerNotes: attendance.trainerNotes || attendance.notes || '',
        createdBy: trainerUser?.uid || 'trainer',
        createdAt: now,
        updatedAt: now,
        auditHistory: [auditEntry]
      };

      if (attendance.id) {
        await setDoc(doc(db, path, attendance.id), recordWithAudit);
        return attendance.id;
      } else {
        const ref = await addDoc(collection(db, path), recordWithAudit);
        return ref.id;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateAttendance(id: string, data: any, trainerUser?: { uid: string; name?: string }, reason?: string) {
    const path = `attendance/${id}`;
    try {
      const now = new Date().toISOString();
      const docRef = doc(db, 'attendance', id);
      const snap = await getDoc(docRef);
      const existing = snap.exists() ? snap.data() : {};

      const auditEntry = {
        changedBy: trainerUser?.uid || 'trainer',
        changedByName: trainerUser?.name || 'Speed Fit Coach',
        changedAt: now,
        oldStatus: existing.status,
        newStatus: data.status || existing.status,
        oldNotes: existing.trainerNotes || existing.notes || '',
        newNotes: data.trainerNotes !== undefined ? data.trainerNotes : (data.notes || existing.notes || ''),
        reason: reason || 'Attendance correction'
      };

      const existingAudit = Array.isArray(existing.auditHistory) ? existing.auditHistory : [];

      await updateDoc(docRef, {
        ...data,
        updatedBy: trainerUser?.uid || 'trainer',
        updatedAt: now,
        auditHistory: [...existingAudit, auditEntry]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteAttendance(id: string) {
    const path = `attendance/${id}`;
    try {
      await deleteDoc(doc(db, 'attendance', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Messages
  subscribeToMessages(uid: string, callback: (messages: any[]) => void) {
    const path = 'messages';
    const q = query(collection(db, path), where('participants', 'array-contains', uid));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async sendMessage(message: any) {
    const path = 'messages';
    try {
      await addDoc(collection(db, path), message);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateMessage(id: string, data: any) {
    const path = `messages/${id}`;
    try {
      await updateDoc(doc(db, 'messages', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async markMessagesAsRead(messageIds: string[]) {
    const path = 'messages/batch-read';
    try {
      const batch = writeBatch(db);
      messageIds.forEach(id => {
        batch.update(doc(db, 'messages', id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Reschedule Requests
  subscribeToRescheduleRequests(callback: (requests: any[]) => void) {
    const path = 'rescheduleRequests';
    return onSnapshot(collection(db, path), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async updateRescheduleRequest(id: string, data: any) {
    const path = `rescheduleRequests/${id}`;
    try {
      await updateDoc(doc(db, 'rescheduleRequests', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Sessions
  subscribeToAllSessions(callback: (sessions: any[]) => void) {
    const path = 'sessions';
    const q = collection(db, path);
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToUpcomingSessions(clientId: string, callback: (sessions: any[]) => void) {
    const path = 'sessions';
    const q = query(collection(db, path), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async addSession(data: any) {
    const path = 'sessions';
    try {
      await addDoc(collection(db, path), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Session Bookings & Requests with 60-Minute Notice Rule
  async requestSession(bookingData: any) {
    try {
      const response = await fetch('/api/sessions/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit session request.');
      }
      return data;
    } catch (err: any) {
      // If server route not responding or offline, fallback to direct Firestore with client-side 60m validation
      const check = validateSixtyMinuteNotice(bookingData.date, bookingData.time);
      if (!check.valid) {
        throw new Error(check.error || 'Requests must be made at least 60 minutes in advance.');
      }
      const path = 'sessions';
      const ref = await addDoc(collection(db, path), {
        ...bookingData,
        status: 'Pending',
        requestedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return { success: true, sessionId: ref.id };
    }
  },

  async trainerActionSession(sessionId: string, action: 'approve' | 'reject' | 'propose', details: any = {}) {
    try {
      const response = await fetch('/api/sessions/trainer-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action, ...details })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Action failed.');
      }
      return data;
    } catch (err: any) {
      const path = `sessions/${sessionId}`;
      if (action === 'approve') {
        await updateDoc(doc(db, 'sessions', sessionId), { status: 'Confirmed', updatedAt: new Date().toISOString() });
      } else if (action === 'reject') {
        await updateDoc(doc(db, 'sessions', sessionId), { status: 'Rejected', rejectionReason: details.reason, updatedAt: new Date().toISOString() });
      } else if (action === 'propose') {
        await updateDoc(doc(db, 'sessions', sessionId), { status: 'Proposed', proposedDate: details.proposedDate, proposedTime: details.proposedTime, trainerNotes: details.reason, updatedAt: new Date().toISOString() });
      }
      return { success: true };
    }
  },

  async clientRespondProposal(sessionId: string, clientId: string, response: 'accept' | 'decline') {
    try {
      const res = await fetch('/api/sessions/client-respond-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, clientId, response })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to respond to proposal.');
      }
      return data;
    } catch (err: any) {
      const path = `sessions/${sessionId}`;
      if (response === 'accept') {
        const snap = await getDoc(doc(db, 'sessions', sessionId));
        const s = snap.data();
        await updateDoc(doc(db, 'sessions', sessionId), {
          date: s?.proposedDate || s?.date,
          time: s?.proposedTime || s?.time,
          status: 'Confirmed',
          updatedAt: new Date().toISOString()
        });
      } else {
        await updateDoc(doc(db, 'sessions', sessionId), { status: 'Cancelled', updatedAt: new Date().toISOString() });
      }
      return { success: true };
    }
  },

  async cancelSession(sessionId: string) {
    const path = `sessions/${sessionId}`;
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'Cancelled',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async confirmSession(id: string, data: any) {
    const path = `sessions/${id}`;
    try {
      await updateDoc(doc(db, 'sessions', id), { ...data, status: 'Confirmed', updatedAt: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteSession(id: string) {
    const path = `sessions/${id}`;
    try {
      await deleteDoc(doc(db, 'sessions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Onboarding Save Progress & Submission
  async saveOnboardingProgress(uid: string, step: number, partialData: any) {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        onboardingStep: step,
        onboardingDraft: partialData,
        ...partialData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async setAssessmentReopened(clientId: string, reopened: boolean) {
    const path = `users/${clientId}`;
    try {
      await updateDoc(doc(db, 'users', clientId), {
        assessmentReopened: reopened,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async submitOnboarding(uid: string, data: any) {
    const path = `users/${uid}`;
    try {
      const now = new Date().toISOString();
      // 1. Update user document with all completed sections and flags
      await updateDoc(doc(db, 'users', uid), {
        ...data,
        onboardingCompleted: true,
        onboardingSubmittedAt: now,
        assessmentReopened: false,
        termsAccepted: true,
        termsAcceptedAt: now,
        termsAcceptedName: data.termsConsent?.typedFullName || data.clientDetails?.fullName || '',
        termsVersion: data.termsConsent?.termsVersion || '2.5',
        updatedAt: now
      });

      // 2. Archive submission in assessmentsHistory
      try {
        await addDoc(collection(db, 'assessmentsHistory'), {
          clientId: uid,
          clientDetails: data.clientDetails || null,
          fitnessAssessment: data.fitnessAssessment || null,
          medicalAssessment: data.medicalAssessment || null,
          dietPreferences: data.dietPreferences || null,
          termsConsent: data.termsConsent || null,
          submittedAt: now
        });
      } catch (histErr) {
        console.warn('Could not archive assessment history:', histErr);
      }

      // 2. Also save/update healthAssessment in separate collection
      if (data.healthAssessment) {
        const healthRef = collection(db, 'healthAssessments');
        const hq = query(healthRef, where('clientId', '==', uid));
        const hSnap = await getDocs(hq);
        
        const healthPayload = {
          ...data.healthAssessment,
          clientId: uid,
          updatedAt: new Date().toISOString()
        };
        
        // Allowed keys from security rule isValidHealthAssessment
        const validHealthKeys = [
          'clientId', 'updatedAt', 'height', 'weight', 'waist', 'bloodPressure', 
          'stress', 'occupation', 'conditions', 'goals', 'notes', 'otherConditions', 
          'smoking', 'alcohol', 'sleepHours', 'currentlyActive', 'pastExperience', 
          'trainingDaysPerWeek', 'targetWeight', 'targetDate', 'painActivities', 
          'medications', 'confirmed', 'consentGiven', 'healthConcerns'
        ];
        const cleanHealth: any = {};
        Object.keys(healthPayload).forEach(k => {
          if (validHealthKeys.includes(k)) {
            if (k === 'height' || k === 'weight' || k === 'waist') {
              cleanHealth[k] = healthPayload[k] !== undefined && healthPayload[k] !== null ? String(healthPayload[k]) : '';
            } else {
              cleanHealth[k] = healthPayload[k];
            }
          }
        });

        if (!cleanHealth.clientId) cleanHealth.clientId = uid;
        if (!cleanHealth.updatedAt) cleanHealth.updatedAt = new Date().toISOString();

        if (!hSnap.empty) {
          await updateDoc(doc(db, 'healthAssessments', hSnap.docs[0].id), cleanHealth);
        } else {
          await addDoc(collection(db, 'healthAssessments'), cleanHealth);
        }
      }

      // 3. Also save/update fitnessAssessment in separate collection
      if (data.fitnessAssessment) {
        const fitRef = collection(db, 'fitnessAssessments');
        const fq = query(fitRef, where('clientId', '==', uid));
        const fSnap = await getDocs(fq);

        const fitnessPayload = {
          ...data.fitnessAssessment,
          clientId: uid,
          updatedAt: new Date().toISOString(),
          date: data.fitnessAssessment.date || new Date().toISOString().split('T')[0]
        };

        const validFitKeys = [
          'clientId', 'updatedAt', 'date', 'dob', 'gender', 'assessNum', 'admin', 
          'height', 'weight', 'bodyFat', 'circumference', 'movementScreen', 
          'physicalTests', 'postureAnalysis', 'notes'
        ];
        const cleanFit: any = {};
        Object.keys(fitnessPayload).forEach(k => {
          if (validFitKeys.includes(k)) {
            if (k === 'height' || k === 'weight') {
              cleanFit[k] = fitnessPayload[k] !== undefined && fitnessPayload[k] !== null ? String(fitnessPayload[k]) : '';
            } else {
              cleanFit[k] = fitnessPayload[k];
            }
          }
        });

        if (!cleanFit.clientId) cleanFit.clientId = uid;
        if (!cleanFit.updatedAt) cleanFit.updatedAt = new Date().toISOString();
        if (!cleanFit.date) cleanFit.date = new Date().toISOString().split('T')[0];

        if (!fSnap.empty) {
          await updateDoc(doc(db, 'fitnessAssessments', fSnap.docs[0].id), cleanFit);
        } else {
          await addDoc(collection(db, 'fitnessAssessments'), cleanFit);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Diet Plan
  subscribeToDietPlan(clientId: string, callback: (plan: any) => void) {
    const path = 'dietPlans';
    const q = query(collection(db, path), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.length > 0 ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null);
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Pending Drafts for AI Transformation Engine
  subscribeToPendingDrafts(clientId: string, callback: (drafts: any[]) => void) {
    const path = 'pendingDrafts';
    const q = query(collection(db, path), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToAllPendingDrafts(callback: (drafts: any[]) => void) {
    const path = 'pendingDrafts';
    return onSnapshot(collection(db, path), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async savePendingDraft(draft: any) {
    const path = 'pendingDrafts';
    try {
      if (draft.id) {
        const { id, ...data } = draft;
        await updateDoc(doc(db, path, id), data);
      } else {
        await addDoc(collection(db, path), { ...draft, createdAt: new Date().toISOString() });
      }
    } catch (error) {
      handleFirestoreError(error, draft.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },

  async deletePendingDraft(id: string) {
    const path = `pendingDrafts/${id}`;
    try {
      await deleteDoc(doc(db, 'pendingDrafts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Payment Records
  subscribeToPaymentRecords(clientId: string, callback: (records: any[]) => void) {
    const path = 'paymentRecords';
    const q = query(collection(db, path), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToAllPaymentRecords(callback: (records: any[]) => void) {
    const path = 'paymentRecords';
    return onSnapshot(collection(db, path), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async updatePaymentRecord(id: string, data: any) {
    const path = `paymentRecords/${id}`;
    try {
      await updateDoc(doc(db, 'paymentRecords', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deletePaymentRecord(id: string) {
    const path = `paymentRecords/${id}`;
    try {
      await deleteDoc(doc(db, 'paymentRecords', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async addPaymentRecord(data: any) {
    const path = 'paymentRecords';
    try {
      await addDoc(collection(db, path), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async requestReschedule(data: any) {
    const path = 'rescheduleRequests';
    try {
      await addDoc(collection(db, path), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Favorites
  async getFavorites(uid: string): Promise<FavoriteExercise[]> {
    const path = 'favorites';
    try {
      const q = query(collection(db, path), where('uid', '==', uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FavoriteExercise));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async toggleFavorite(uid: string, exercise: any) {
    const path = 'favorites';
    try {
      const q = query(collection(db, path), where('uid', '==', uid), where('name', '==', exercise.name));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        await addDoc(collection(db, path), { uid, ...exercise });
      } else {
        await deleteDoc(doc(db, path, snapshot.docs[0].id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Progress Photos
  subscribeToProgressPhotos(clientId: string, callback: (photos: any[]) => void) {
    const path = 'progressPhotos';
    const q = query(collection(db, path), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async uploadFile(file: File, path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.warn("Storage Upload failed, falling back to compressed local base64 payload:", error);
      try {
        const isProfile = path.includes('profile');
        const width = isProfile ? 250 : 500;
        const height = isProfile ? 250 : 500;
        const base64Str = await compressAndGetBase64(file, width, height);
        return base64Str;
      } catch (fallbackError) {
        console.error("Base64 representation converter failed too:", fallbackError);
        throw error;
      }
    }
  },

  async saveProgressPhoto(photo: any) {
    const path = 'progressPhotos';
    try {
      if (photo.id) {
        const { id, ...data } = photo;
        await updateDoc(doc(db, path, id), data);
      } else {
        await addDoc(collection(db, path), photo);
      }
    } catch (error) {
      handleFirestoreError(error, photo.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },

  async deleteProgressPhoto(id: string, imageUrl?: string) {
    const path = `progressPhotos/${id}`;
    try {
      await deleteDoc(doc(db, 'progressPhotos', id));
      if (imageUrl && imageUrl.includes('firebasestorage.googleapis.com')) {
        try {
          const fileRef = ref(storage, imageUrl);
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.warn("Could not delete file from storage (it might have been deleted already):", storageErr);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Scheduled Workouts
  subscribeToScheduledWorkouts(clientId: string, callback: (workouts: any[]) => void) {
    const path = 'scheduledWorkouts';
    const q = query(collection(db, path), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async saveScheduledWorkout(workout: any) {
    const path = 'scheduledWorkouts';
    try {
      if (workout.id) {
        await updateDoc(doc(db, path, workout.id), workout);
      } else {
        await addDoc(collection(db, path), workout);
      }
    } catch (error) {
      handleFirestoreError(error, workout.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },

  async deleteScheduledWorkout(id: string) {
    const path = `scheduledWorkouts/${id}`;
    try {
      await deleteDoc(doc(db, 'scheduledWorkouts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Workout Templates
  subscribeToWorkoutTemplates(trainerId: string, callback: (templates: WorkoutTemplate[]) => void) {
    const path = 'workoutTemplates';
    const q = query(collection(db, path), where('trainerId', '==', trainerId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutTemplate)));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async saveWorkoutTemplate(template: WorkoutTemplate) {
    const path = 'workoutTemplates';
    try {
      if (template.id) {
        const { id, ...data } = template;
        await updateDoc(doc(db, path, id), data);
      } else {
        await addDoc(collection(db, path), { ...template, createdAt: new Date().toISOString() });
      }
    } catch (error) {
      handleFirestoreError(error, template.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },

  async deleteWorkoutTemplate(id: string) {
    const path = `workoutTemplates/${id}`;
    try {
      await deleteDoc(doc(db, 'workoutTemplates', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Health Assessments
  subscribeToHealthAssessment(clientId: string, callback: (assessment: any) => void) {
    const path = 'healthAssessments';
    const q = query(collection(db, path), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.length > 0 ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null);
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async saveHealthAssessment(assessment: any) {
    const path = 'healthAssessments';
    try {
      if (assessment.id) {
        const { id, ...data } = assessment;
        await updateDoc(doc(db, path, id), { ...data, updatedAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, path), { ...assessment, updatedAt: new Date().toISOString() });
      }
    } catch (error) {
      handleFirestoreError(error, assessment.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },

  // Fitness Assessments
  subscribeToFitnessAssessment(clientId: string, callback: (assessment: any) => void) {
    const path = 'fitnessAssessments';
    const q = query(collection(db, path), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.length > 0 ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null);
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async saveFitnessAssessment(assessment: any) {
    const path = 'fitnessAssessments';
    try {
      if (assessment.id) {
        const { id, ...data } = assessment;
        await updateDoc(doc(db, path, id), { ...data, updatedAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, path), { ...assessment, updatedAt: new Date().toISOString() });
      }
    } catch (error) {
      handleFirestoreError(error, assessment.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },

  // Testimonials
  subscribeToTestimonials(callback: (testimonials: Testimonial[]) => void) {
    const path = 'testimonials';
    const q = collection(db, path);
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Testimonial)));
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async saveTestimonial(testimonial: any) {
    const path = 'testimonials';
    try {
      if (testimonial.id) {
        const { id, ...data } = testimonial;
        await updateDoc(doc(db, path, id), { ...data });
      } else {
        await addDoc(collection(db, path), { ...testimonial, createdAt: new Date().toISOString() });
      }
    } catch (error) {
      handleFirestoreError(error, testimonial.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },

  async getClientSubscription(clientId: string) {
    return { planName: 'Basic Plan', status: 'Active', nextDueDate: '2026-08-01' };
  },

  async getAllPayments() {
    const path = 'paymentRecords';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Progress Records (Trainer records, Client views progress & feedback)
  subscribeToProgressRecords(clientId: string, callback: (records: any[]) => void) {
    const path = 'progressRecords';
    const q = query(collection(db, path), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      records.sort((a: any, b: any) => new Date(b.reviewDate || b.createdAt).getTime() - new Date(a.reviewDate || a.createdAt).getTime());
      callback(records);
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async saveProgressRecord(record: any) {
    const path = 'progressRecords';
    try {
      const now = new Date().toISOString();
      if (record.id) {
        const { id, ...data } = record;
        await updateDoc(doc(db, path, id), { ...data, updatedAt: now });
        return id;
      } else {
        const ref = await addDoc(collection(db, path), {
          ...record,
          createdAt: now,
          updatedAt: now
        });
        return ref.id;
      }
    } catch (error) {
      handleFirestoreError(error, record.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  },

  async deleteProgressRecord(id: string) {
    const path = `progressRecords/${id}`;
    try {
      await deleteDoc(doc(db, 'progressRecords', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Notifications
  subscribeToNotifications(userId: string, callback: (notifs: any[]) => void) {
    const path = 'notifications';
    const q = query(collection(db, path), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      notifs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(notifs);
    }, (error) => {
      reportFirestoreError(error, OperationType.LIST, path);
    });
  },

  async markNotificationAsRead(id: string) {
    const path = `notifications/${id}`;
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async createNotification(notif: any) {
    const path = 'notifications';
    try {
      await addDoc(collection(db, path), {
        ...notif,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async deleteTestimonial(id: string) {
    const path = `testimonials/${id}`;
    try {
      await deleteDoc(doc(db, 'testimonials', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Lead Submissions (Trainer pipeline access via secure server API)
  subscribeToLeads(callback: (leads: LeadSubmission[]) => void) {
    let active = true;

    const fetchLatest = async () => {
      if (!active) return;
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-User-Role': 'TRAINER'
        };
        const user = auth.currentUser;
        if (user) {
          if (user.email) headers['X-User-Email'] = user.email;
          try {
            const token = await user.getIdToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
          } catch {}
        }
        const res = await fetch('/api/leads', { headers });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.leads) && active) {
            callback(json.leads);
          }
        }
      } catch (err: any) {
        // Silent recovery
      }
    };

    fetchLatest();
    const interval = setInterval(fetchLatest, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  },

  async getLeads(): Promise<LeadSubmission[]> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-User-Role': 'TRAINER'
      };
      const user = auth.currentUser;
      if (user) {
        if (user.email) headers['X-User-Email'] = user.email;
        try {
          const token = await user.getIdToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      }
      const res = await fetch('/api/leads', { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.leads)) {
          return json.leads;
        }
      }
      return [];
    } catch {
      return [];
    }
  },

  async updateLeadStatus(id: string, status: LeadStatus, followUpAt?: string) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-User-Role': 'TRAINER'
      };
      const user = auth.currentUser;
      if (user) {
        if (user.email) headers['X-User-Email'] = user.email;
        try {
          const token = await user.getIdToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      }
      await fetch('/api/leads/update', {
        method: 'POST',
        headers,
        body: JSON.stringify({ leadId: id, status, followUpAt })
      });
    } catch (error) {
      console.warn('Update lead status error:', error);
    }
  },

  async updateLead(id: string, updates: Partial<LeadSubmission>) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-User-Role': 'TRAINER'
      };
      const user = auth.currentUser;
      if (user) {
        if (user.email) headers['X-User-Email'] = user.email;
        try {
          const token = await user.getIdToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      }
      await fetch('/api/leads/update', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          leadId: id,
          status: updates.status,
          followUpAt: updates.followUpAt,
          trainerNotes: updates.trainerNotes
        })
      });
    } catch (error) {
      console.warn('Update lead error:', error);
    }
  },

  async addLeadFollowUp(id: string, item: LeadFollowUpItem) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-User-Role': 'TRAINER'
      };
      const user = auth.currentUser;
      if (user) {
        if (user.email) headers['X-User-Email'] = user.email;
        try {
          const token = await user.getIdToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      }
      await fetch('/api/leads/update', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          leadId: id,
          followUpItem: item
        })
      });
    } catch (error) {
      console.warn('Add lead follow-up error:', error);
    }
  },

  async deleteLead(id: string) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-User-Role': 'TRAINER'
      };
      const user = auth.currentUser;
      if (user) {
        if (user.email) headers['X-User-Email'] = user.email;
        try {
          const token = await user.getIdToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      }
      await fetch('/api/leads/delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ leadId: id })
      });
    } catch (error) {
      console.warn('Delete lead error:', error);
    }
  },
};
