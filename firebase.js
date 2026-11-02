import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase Console > Project settings > General > Your apps > Web app.
// Paste your FarmBooks Firebase Web App values below. These placeholders are intentional.
const firebaseConfig = {
  apiKey: "AIzaSyDbvWKozvvAi-0bOCRMlq0Un8n-fPEtjMA",
  authDomain: "farmbooks-final-db.firebaseapp.com",
  projectId: "farmbooks-final-db",
  storageBucket: "farmbooks-final-db.firebasestorage.app",
  messagingSenderId: "154686304305",
  appId: "1:154686304305:web:78d6477b36b2e284c8e510",
  measurementId: "G-017K0VCTJT"
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId &&
  !firebaseConfig.apiKey.startsWith('YOUR_') &&
  !firebaseConfig.projectId.startsWith('YOUR_') &&
  !firebaseConfig.appId.startsWith('YOUR_'),
);

// Expo Fast Refresh can re-evaluate this module; reuse an existing Firebase app.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  // Auth may already be initialized during Fast Refresh.
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
// Avoid instantiating Storage when the config still contains placeholders.
export const storage = firebaseConfigured ? getStorage(app) : null;
