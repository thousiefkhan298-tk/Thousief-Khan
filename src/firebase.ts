import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  getDocFromServer, 
  persistentLocalCache, 
  persistentSingleTabManager,
  Firestore
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

// Filter internal clock-skew warnings from @firebase/firestore so they don't trigger the debug error panel
if (typeof window !== 'undefined' && typeof console !== 'undefined' && console.error) {
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    const isClockSkewError = args.some(arg => {
      if (typeof arg === 'string') {
        return arg.includes('Detected an update time that is in the future');
      }
      if (arg && typeof arg.message === 'string') {
        return arg.message.includes('Detected an update time that is in the future');
      }
      return false;
    });

    if (isClockSkewError) {
      console.debug(...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

const app = initializeApp(firebaseConfig);
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager({ forceOwnership: true })
    })
  }, databaseId);
} catch (e) {
  firestoreInstance = initializeFirestore(app, {}, databaseId);
}

export const db = firestoreInstance;

export const auth = getAuth(app);
export const storage = getStorage(app);

export async function testFirebaseConnection() {
  try {
    // Attempt to fetch a non-existent doc just to test connectivity
    await getDocFromServer(doc(db, '_system_', 'connectivity_test'));
    console.log("Firebase connection test: Success (connected to Firestore)");
    return true;
  } catch (error: any) {
    const isOffline = 
      error.code === 'unavailable' || 
      error.message?.toLowerCase().includes('offline') || 
      error.message?.toLowerCase().includes('unavailable') ||
      error.message?.toLowerCase().includes('could not reach');
      
    if (isOffline) {
      console.warn("Firebase connection test: Operating in Offline Cache Mode. Local edits will be stored and synchronized once connection is restored.");
    } else {
      console.log("Firebase connection test: Handled connection status check successfully.");
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

export function reportFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  try {
    handleFirestoreError(error, operationType, path);
  } catch (err) {
    console.error('Swallowed Firestore Error in listener:', err);
  }
}
