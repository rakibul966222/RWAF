import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: "AIzaSyCJn2zMfWYz_gFN5goDUrkUjVAIqPGCW-Y",
  authDomain: "mtxr-d8b90.firebaseapp.com",
  projectId: "mtxr-d8b90",
  storageBucket: "mtxr-d8b90.firebasestorage.app",
  messagingSenderId: "688078973753",
  appId: "1:688078973753:web:c7279cdd8ba04c8e0b56e8",
  vapidKey: "YOUR_VAPID_KEY_HERE" // User needs to provide this from Firebase Console
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export const googleProvider = new GoogleAuthProvider();
