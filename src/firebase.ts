import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one
      console.warn('Firebase persistence failed-precondition: Multiple tabs open');
  } else if (err.code == 'unimplemented') {
      // Browser doesn't support persistence
      console.warn('Firebase persistence unimplemented: Browser does not support persistence');
  }
});

export const auth = getAuth(app);
export const storage = getStorage(app);

export async function testFirebaseConnection() {
  try {
    // Attempt to fetch a non-existent doc just to test connectivity
    await getDocFromServer(doc(db, '_system_', 'connectivity_test'));
    console.log("Firebase connection test: Success (connected to Firestore)");
    return true;
  } catch (error: any) {
    if (error.message?.includes('the client is offline')) {
      console.error("Firebase connection test: FAILED - Client is offline. Check your Firebase configuration and network.");
    } else {
      console.log("Firebase connection test: Success (reached server, even if doc doesn't exist)");
    }
    return false;
  }
}

export type OperationType = 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';

export const OperationType = {
  CREATE: 'create' as const,
  UPDATE: 'update' as const,
  DELETE: 'delete' as const,
  LIST: 'list' as const,
  GET: 'get' as const,
  WRITE: 'write' as const,
};

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
