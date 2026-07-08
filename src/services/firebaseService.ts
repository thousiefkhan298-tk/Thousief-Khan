import { db, handleFirestoreError, OperationType, storage } from '../firebase';
import { collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, where, onSnapshot, addDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { User, FavoriteExercise, WorkoutTemplate, Testimonial } from '../types';

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
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToTrainers(callback: (users: User[]) => void) {
    const path = 'users';
    const q = query(collection(db, path), where('role', '==', 'TRAINER'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
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
      await setDoc(newClientRef, {
        ...data,
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
      handleFirestoreError(error, OperationType.LIST, path);
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
      handleFirestoreError(error, OperationType.LIST, path);
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
      handleFirestoreError(error, OperationType.LIST, path);
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
      handleFirestoreError(error, OperationType.LIST, path);
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
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToAllWorkoutPlans(callback: (plans: any[]) => void) {
    const path = 'workoutPlans';
    const q = query(collection(db, path));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToAllDietPlans(callback: (plans: any[]) => void) {
    const path = 'dietPlans';
    const q = query(collection(db, path));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToAttendance(clientId: string, callback: (attendance: any[]) => void) {
    const path = 'attendance';
    const q = query(collection(db, path), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async markAttendance(attendance: any) {
    const path = 'attendance';
    try {
      await addDoc(collection(db, path), attendance);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateAttendance(id: string, data: any) {
    const path = `attendance/${id}`;
    try {
      await updateDoc(doc(db, 'attendance', id), data);
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
      handleFirestoreError(error, OperationType.LIST, path);
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
      handleFirestoreError(error, OperationType.LIST, path);
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
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToUpcomingSessions(clientId: string, callback: (sessions: any[]) => void) {
    const path = 'sessions';
    const q = query(collection(db, path), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
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

  async confirmSession(id: string, data: any) {
    const path = `sessions/${id}`;
    try {
      await updateDoc(doc(db, 'sessions', id), data);
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

  async submitOnboarding(uid: string, data: any) {
    const path = `users/${uid}`;
    try {
      // 1. Update user document
      await updateDoc(doc(db, 'users', uid), { ...data, onboardingCompleted: true });

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
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Pending Drafts for AI Transformation Engine
  subscribeToPendingDrafts(clientId: string, callback: (drafts: any[]) => void) {
    const path = 'pendingDrafts';
    const q = query(collection(db, path), where('clientId', '==', clientId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToAllPendingDrafts(callback: (drafts: any[]) => void) {
    const path = 'pendingDrafts';
    return onSnapshot(collection(db, path), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
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
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToAllPaymentRecords(callback: (records: any[]) => void) {
    const path = 'paymentRecords';
    return onSnapshot(collection(db, path), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
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
      handleFirestoreError(error, OperationType.LIST, path);
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
      handleFirestoreError(error, OperationType.LIST, path);
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
      handleFirestoreError(error, OperationType.LIST, path);
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
      handleFirestoreError(error, OperationType.LIST, path);
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
      handleFirestoreError(error, OperationType.LIST, path);
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
      handleFirestoreError(error, OperationType.LIST, path);
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

  async deleteTestimonial(id: string) {
    const path = `testimonials/${id}`;
    try {
      await deleteDoc(doc(db, 'testimonials', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};
