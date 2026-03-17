import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, where, onSnapshot, addDoc, writeBatch } from 'firebase/firestore';
import { User, FavoriteExercise } from '../types';

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

  subscribeToUsers(callback: (users: User[]) => void) {
    const path = 'users';
    const q = collection(db, path);
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
        'favoriteExercises'
      ];

      for (const colName of collectionsToClean) {
        const q = query(collection(db, colName), where('clientId', '==', clientId));
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

  async submitOnboarding(uid: string, data: any) {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), { ...data, onboardingCompleted: true });
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

  async saveProgressPhoto(photo: any) {
    const path = 'progressPhotos';
    try {
      await addDoc(collection(db, path), photo);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async deleteProgressPhoto(id: string) {
    const path = `progressPhotos/${id}`;
    try {
      await deleteDoc(doc(db, 'progressPhotos', id));
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
};
