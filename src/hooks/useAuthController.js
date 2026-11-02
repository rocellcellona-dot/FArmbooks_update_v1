import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { addDoc, collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from '../../firebase';
import { readProfileWithRetry } from '../services/profileService';
import { friendlyError, isNetworkError } from '../services/errors';

export function useAuthController() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMissing, setProfileMissing] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const uidRef = useRef(null);

  useEffect(() => {
    if (!firebaseConfigured) { setAuthReady(true); return undefined; }
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      const uid = nextUser?.uid || null;
      uidRef.current = uid;
      setUser(nextUser);
      setProfile(null);
      setProfileMissing(false);
      setProfileError('');
      setAuthError('');
      if (!nextUser) {
        setProfileLoading(false); setAuthReady(true);
        return;
      }
      setAuthReady(false); setProfileLoading(true);
      try {
        const data = await readProfileWithRetry(nextUser.uid);
        if (uidRef.current !== nextUser.uid) return;
        setProfile(data); setProfileMissing(!data);
      } catch (error) {
        if (uidRef.current !== nextUser.uid) return;
        setProfile(null); setProfileMissing(false); setProfileError(friendlyError(error));
      } finally {
        if (uidRef.current === nextUser.uid) { setProfileLoading(false); setAuthReady(true); }
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return undefined;
    return onSnapshot(doc(db, 'users', uid), (snapshot) => {
      if (uidRef.current !== uid) return;
      if (!snapshot.exists()) {
        setProfile(null);
        setProfileMissing(true);
        return;
      }
      setProfile({ ...snapshot.data(), uid: snapshot.id, _cachedOffline: snapshot.metadata.fromCache });
      setProfileMissing(false);
      setProfileError('');
    }, (error) => {
      if (uidRef.current === uid && !isNetworkError(error)) setProfileError(friendlyError(error));
    });
  }, [user?.uid]);

  const login = useCallback(async ({ email, password }) => {
    setAuthError('');
    if (!email?.trim() || !password) { setAuthError('Enter your email and password.'); return false; }
    setAuthBusy(true);
    try { await signInWithEmailAndPassword(auth, email.trim(), password); return true; }
    catch (error) { setAuthError(friendlyError(error)); return false; }
    finally { setAuthBusy(false); }
  }, []);

  const register = useCallback(async ({ fullName, role, location, farmName, email, password }) => {
    setAuthError('');
    if (!fullName?.trim()) { setAuthError('Enter your full name.'); return false; }
    if (!['farmer', 'manager', 'owner'].includes(role)) { setAuthError('Choose a valid account role.'); return false; }
    if (!email?.trim()) { setAuthError('Enter your email address.'); return false; }
    if (password?.length < 6) { setAuthError('Use at least 6 characters for your password.'); return false; }
    if (role === 'owner' && !farmName?.trim()) { setAuthError('Farm Owners must enter a farm name.'); return false; }
    setAuthBusy(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = credential.user.uid;
      const baseProfile = {
        uid, fullName: fullName.trim(), email: email.trim(), role, location: (location || '').trim(),
        farmId: null, farmName: role === 'owner' ? farmName.trim() : '',
        membershipStatus: role === 'owner' ? 'pending_setup' : 'unassigned',
      };
      await setDoc(doc(db, 'users', uid), { ...baseProfile, createdAt: serverTimestamp() });
      let finalProfile = { ...baseProfile, createdAt: new Date().toISOString() };
      if (role === 'owner') {
        const farm = await addDoc(collection(db, 'farms'), {
          name: farmName.trim(), location: (location || '').trim(), ownerId: uid,
          ownerName: fullName.trim(), status: 'active', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'users', uid), {
          farmId: farm.id, farmName: farmName.trim(), membershipStatus: 'active', updatedAt: serverTimestamp(),
        });
        finalProfile = { ...finalProfile, farmId: farm.id, farmName: farmName.trim(), membershipStatus: 'active' };
      }
      uidRef.current = uid;
      setUser(credential.user); setProfile(finalProfile); setProfileMissing(false); setProfileError(''); setAuthReady(true);
      Alert.alert('Account created', role === 'owner' ? 'Your farm has been created.' : 'Your account is ready. Apply to join a farm to access shared records.');
      return true;
    } catch (error) {
      setAuthError(friendlyError(error));
      // Keep the auth account recoverable; never create a duplicate account automatically.
      if (auth.currentUser) {
        setUser(auth.currentUser);
        try {
          const data = await readProfileWithRetry(auth.currentUser.uid);
          setProfile(data); setProfileMissing(!data); setProfileError(data ? '' : 'Your login exists, but your FarmBooks profile could not be created. Retry or sign out and inspect Firestore rules.');
          setAuthReady(true);
        } catch (profileFailure) {
          setProfileError(friendlyError(profileFailure)); setAuthReady(true);
        }
      }
      return false;
    } finally { setAuthBusy(false); }
  }, []);

  const resetPassword = useCallback(async (email) => {
    setAuthError('');
    if (!email?.trim()) { setAuthError('Enter your account email first.'); return false; }
    setAuthBusy(true);
    try { await sendPasswordResetEmail(auth, email.trim()); Alert.alert('Check your email', 'If that address is registered, Firebase will send a password-reset link.'); return true; }
    catch (error) { setAuthError(friendlyError(error)); return false; }
    finally { setAuthBusy(false); }
  }, []);

  const recoverMissingProfile = useCallback(async ({ fullName, role, location = '', farmName = '' }) => {
    const current = auth.currentUser;
    if (!current?.uid) throw new Error('Your session expired. Please sign in again.');
    if (!['farmer', 'manager', 'owner'].includes(role)) throw new Error('Choose a valid FarmBooks role.');
    if (!fullName?.trim()) throw new Error('Enter your full name.');
    if (role === 'owner' && !farmName?.trim()) throw new Error('Farm Owners must enter a farm name.');
    setProfileLoading(true); setProfileError('');
    try {
      const existing = await readProfileWithRetry(current.uid);
      if (existing) {
        setProfile(existing); setProfileMissing(false); setProfileError(''); return existing;
      }
      const baseProfile = {
        uid: current.uid, fullName: fullName.trim(), email: current.email || '', role,
        location: location.trim(), farmId: null, farmName: role === 'owner' ? farmName.trim() : '',
        membershipStatus: role === 'owner' ? 'pending_setup' : 'unassigned',
      };
      await setDoc(doc(db, 'users', current.uid), { ...baseProfile, createdAt: serverTimestamp() });
      let finalProfile = { ...baseProfile, createdAt: new Date().toISOString() };
      if (role === 'owner') {
        const farmRef = await addDoc(collection(db, 'farms'), {
          name: farmName.trim(), location: location.trim(), ownerId: current.uid,
          ownerName: fullName.trim(), status: 'active', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'users', current.uid), {
          farmId: farmRef.id, farmName: farmName.trim(), membershipStatus: 'active', updatedAt: serverTimestamp(),
        });
        finalProfile = { ...finalProfile, farmId: farmRef.id, farmName: farmName.trim(), membershipStatus: 'active' };
      }
      setUser(current); setProfile(finalProfile); setProfileMissing(false); setProfileError(''); setAuthReady(true);
      Alert.alert('Profile restored', 'Your FarmBooks profile has been created for this existing login.');
      return finalProfile;
    } catch (error) {
      setProfileError(friendlyError(error));
      throw error;
    } finally { setProfileLoading(false); setAuthReady(true); }
  }, []);

  const retryProfile = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;
    const uid = current.uid;
    setProfileLoading(true); setProfileError('');
    try {
      const data = await readProfileWithRetry(uid);
      if (uidRef.current !== uid) return;
      setProfile(data); setProfileMissing(!data);
      if (!data) setProfileError('No user profile was found in Firestore. Check the users collection and published rules.');
    } catch (error) {
      if (uidRef.current === uid) setProfileError(friendlyError(error));
    } finally {
      if (uidRef.current === uid) { setProfileLoading(false); setAuthReady(true); }
    }
  }, []);

  const logout = useCallback(async () => {
    if (!firebaseConfigured) return;
    try { await signOut(auth); }
    catch (error) { Alert.alert('Could not sign out', friendlyError(error)); }
  }, []);

  const clearAuthError = useCallback(() => setAuthError(''), []);
  const refreshProfile = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;
    const data = await readProfileWithRetry(uid);
    if (uidRef.current !== uid) return null;
    setProfile(data); setProfileMissing(!data); setProfileError(data ? '' : 'Profile not found.');
    return data;
  }, []);

  return {
    user, profile, setProfile, authReady, profileLoading, profileMissing, profileError,
    authBusy, authError, login, register, resetPassword, retryProfile, recoverMissingProfile, logout,
    clearAuthError, refreshProfile,
  };
}
