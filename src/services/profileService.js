import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { isNetworkError } from './errors';

const cacheKey = (uid) => `farmbooks.profile.cache.v2.${uid}`;

async function readCachedProfile(uid) {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    const profile = JSON.parse(raw);
    return profile?.uid === uid ? { ...profile, _cachedOffline: true } : null;
  } catch {
    return null;
  }
}

export async function readProfileWithRetry(uid) {
  let lastError = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const snapshot = await getDoc(doc(db, 'users', uid));
      if (!snapshot.exists()) return null;
      const profile = { ...snapshot.data(), uid: snapshot.id, _cachedOffline: false };
      AsyncStorage.setItem(cacheKey(uid), JSON.stringify(profile)).catch(() => {});
      return profile;
    } catch (error) {
      lastError = error;
      // Do not use a stale local profile to mask a real permission-denied response.
      if (isNetworkError(error)) {
        const cached = await readCachedProfile(uid);
        if (cached) return cached;
        throw error;
      }
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  if (lastError) throw lastError;
  return null;
}
