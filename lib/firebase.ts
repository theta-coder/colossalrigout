import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App safely (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Storage safely
export const storage = getStorage(app);

// Initialize Firestore safely with named database and optional long-polling for browser environment
let dbInstance;
const isBrowser = typeof window !== 'undefined';

try {
  if (isBrowser) {
    // Only force long polling in the browser iframe to bypass proxy/WebSocket issues
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
  } else {
    // Server-side (Node.js) uses default optimal connection settings (gRPC/HTTP2)
    dbInstance = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);
  }
} catch (e) {
  // Fallback to existing instance if already initialized (prevents Next.js hot reload crashes)
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = dbInstance;

// Initialize Auth safely
export const auth = getAuth(app);

// Standardized Operation Type enum
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Firestore Error Info Interface
export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Global, reusable secure error handler
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: Client is offline.");
    }
  }
}

// Trigger connection test lazily or immediately
if (typeof window !== 'undefined') {
  testConnection();
}
