import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { FirebaseCredentialsError } from './errors';

// Initialize Firebase Admin SDK
import type { FirebaseAdminConfig } from './interfaces';

// Lazy initialization - don't throw errors at module load time
let app: ReturnType<typeof initializeApp> | null = null;
let dbInstance: ReturnType<typeof getFirestore> | null = null;
let authInstance: ReturnType<typeof getAuth> | null = null;

function initializeFirebase() {
  if (app) {
    return { app, db: dbInstance!, auth: authInstance! };
  }

  // Validate required environment variables
  const requiredEnvVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new FirebaseCredentialsError(missingVars);
  }

  console.log('🔑 Using Firebase service account credentials');

  const firebaseAdminConfig: FirebaseAdminConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    credential: cert({
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      projectId: process.env.FIREBASE_PROJECT_ID!,
    }),
  };

  // Initialize Firebase Admin (only if not already initialized)
  try {
    const adminConfig = firebaseAdminConfig as unknown as Record<string, unknown>;
    app = getApps().length === 0 ? initializeApp(adminConfig) : getApps()[0];
    dbInstance = getFirestore(app);
    authInstance = getAuth(app);
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    throw error;
  }

  return { app, db: dbInstance, auth: authInstance };
}

// Export services with lazy initialization
export const db = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_target, prop) {
    const { db: dbInst } = initializeFirebase();
    return (dbInst as any)[prop];
  }
});

export const auth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_target, prop) {
    const { auth: authInst } = initializeFirebase();
    return (authInst as any)[prop];
  }
});

export default new Proxy({} as ReturnType<typeof initializeApp>, {
  get(_target, prop) {
    const { app: appInst } = initializeFirebase();
    return (appInst as any)[prop];
  }
});

