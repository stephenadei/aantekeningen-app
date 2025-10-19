import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Firebase client configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyArr2tiLVt72688gGvs3DDclxHeABUVRxI',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'stephen-s-aantekeningen.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'stephen-s-aantekeningen',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'stephen-s-aantekeningen.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '368332757985',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:368332757985:web:b9c38cc8abbf2ff93350a0',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-HZT3CRYLQJ',
};

// Initialize Firebase client - prevent duplicate apps
let app: FirebaseApp | undefined;
let authClientInstance: Auth | undefined;

try {
  // Only initialize on client side
  if (typeof window !== 'undefined') {
    console.log('🔥 Firebase configuratie:', {
      apiKey: firebaseConfig.apiKey ? '✅ Present' : '❌ Missing',
      authDomain: firebaseConfig.authDomain ? '✅ Present' : '❌ Missing',
      projectId: firebaseConfig.projectId ? '✅ Present' : '❌ Missing',
      usingFallback: !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '⚠️ Using fallback values' : '✅ Using env vars',
    });

    const apps = getApps();
    if (apps.length === 0) {
      app = initializeApp(firebaseConfig);
      console.log('✅ Firebase client geïnitialiseerd:', firebaseConfig.projectId);
    } else {
      app = apps[0];
      console.log('✅ Firebase client al geïnitialiseerd:', firebaseConfig.projectId);
    }
    
    if (app) {
      authClientInstance = getAuth(app);
      console.log('✅ Firebase Auth client geïnitialiseerd');
    }
  }
} catch (error) {
  console.error('❌ Firebase initialisatie gefaald:', error);
  if (error instanceof Error) {
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
  }
  // Don't throw - allow graceful degradation
}

// Export services (will be undefined if initialization failed or on server)
export const authClient = authClientInstance;

// Initialize Analytics only in browser environment
export const analytics = typeof window !== 'undefined' && app ? getAnalytics(app) : null;

export default app;

