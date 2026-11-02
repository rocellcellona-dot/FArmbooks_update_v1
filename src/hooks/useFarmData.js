import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { dateSortValue } from '../theme';
import { friendlyError } from '../services/errors';
import { getPendingTransactions, syncPendingTransactions } from '../services/transactionService';
import { listFarms } from '../services/farmService';

function cacheSafeRecord(item) {
  const copy = { ...item };
  for (const key of ['createdAt', 'updatedAt', 'cancelledAt', 'deletedAt', 'joinedAt', 'reviewedAt']) {
    if (copy[key]?.toDate) copy[key] = copy[key].toDate().toISOString();
  }
  return copy;
}

export function useFarmData(user, profile) {
  const currentUid = user?.uid || null;
  const profileForUser = currentUid && profile?.uid === currentUid ? profile : null;
  const currentUidRef = useRef(currentUid);
  currentUidRef.current = currentUid;
  const currentFarmIdRef = useRef(profileForUser?.farmId || null);
  currentFarmIdRef.current = profileForUser?.farmId || null;
  const [remoteTransactions, setRemoteTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [members, setMembers] = useState([]);
  const [membershipEvents, setMembershipEvents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [farms, setFarms] = useState([]);
  const [farmState, setFarmState] = useState({ uid: null, farmId: null, status: 'checking' });
  const [txLoading, setTxLoading] = useState(false);
  const [farmLoading, setFarmLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const previousMembership = useRef(null);
  const directoryRequest = useRef(0);
  const lastUid = useRef(currentUid);
  const farmStatus = profileForUser?.farmId
    ? (farmState.uid === currentUid && farmState.farmId === profileForUser.farmId ? farmState.status : 'checking')
    : 'none';
  const farmUnavailable = farmStatus !== 'active' && farmStatus !== 'checking' && farmStatus !== 'none';

  useEffect(() => {
    if (lastUid.current === currentUid) return;
    lastUid.current = currentUid;
    directoryRequest.current += 1;
    setRemoteTransactions([]);
    setPendingTransactions([]);
    setAssignments([]);
    setMembers([]);
    setMembershipEvents([]);
    setApplications([]);
    setFarms([]);
    setFarmState({ uid: currentUid, farmId: null, status: 'checking' });
    setTxLoading(false);
    setFarmLoading(false);
    setDataError('');
    setSyncing(false);
  }, [currentUid]);

  const refreshPending = useCallback(async () => {
    const uid = user?.uid;
    const farmId = profileForUser?.farmId || null;
    if (!uid) { setPendingTransactions([]); return []; }
    const queued = await getPendingTransactions(uid);
    if (currentUidRef.current === uid && currentFarmIdRef.current === farmId) {
      setPendingTransactions(queued.filter((item) => farmId && item.farmId === farmId));
    }
    return queued;
  }, [user?.uid, profileForUser?.farmId]);

  useEffect(() => {
    refreshPending().catch((error) => {
      if (currentUidRef.current === user?.uid) setDataError(`Pending transaction queue unavailable: ${friendlyError(error)}`);
    });
  }, [refreshPending, user?.uid]);

  useEffect(() => {
    const uid = user?.uid;
    const farmId = profileForUser?.farmId;
    if (!uid || !farmId) {
      setFarmState({ uid, farmId: null, status: 'none' });
      return undefined;
    }
    let disposed = false;
    setFarmState({ uid, farmId, status: 'checking' });
    const unsubscribe = onSnapshot(doc(db, 'farms', farmId), (snapshot) => {
      if (disposed || currentUidRef.current !== uid) return;
      if (!snapshot.exists()) {
        setFarmState({ uid, farmId, status: 'missing' });
        return;
      }
      const farm = snapshot.data();
      const status = Object.prototype.hasOwnProperty.call(farm, 'status') ? farm.status : 'active';
      setFarmState({ uid, farmId, status });
      if (status === 'disbanded') {
        AsyncStorage.removeItem(`farmbooks.assignments.cache.v2.${uid}.${farmId}`).catch(() => {});
        if (profileForUser?.role !== 'owner') {
          AsyncStorage.removeItem(`farmbooks.transactions.cache.v2.${uid}.${farmId}`).catch(() => {});
        }
      }
    }, (error) => {
      if (!disposed && currentUidRef.current === uid) setDataError(`Farm status unavailable: ${friendlyError(error)}`);
    });
    return () => { disposed = true; unsubscribe(); };
  }, [user?.uid, profileForUser?.farmId, profileForUser?.role]);

  useEffect(() => {
    const previous = previousMembership.current;
    const current = currentUid ? { uid: currentUid, farmId: profileForUser?.farmId || null } : null;
    if (previous && current && previous.uid === current.uid && previous.farmId &&
        previous.farmId !== current.farmId) {
      AsyncStorage.removeItem(`farmbooks.transactions.cache.v2.${current.uid}.${previous.farmId}`).catch(() => {});
      AsyncStorage.removeItem(`farmbooks.assignments.cache.v2.${current.uid}.${previous.farmId}`).catch(() => {});
    }
    previousMembership.current = current;
  }, [currentUid, profileForUser?.farmId]);

  useEffect(() => {
    const uid = user?.uid;
    const archivedOwner = profileForUser?.role === 'owner' && profileForUser.membershipStatus === 'archived' && farmStatus === 'disbanded';
    if (!uid || !profileForUser?.farmId || !['farmer', 'manager', 'owner'].includes(profileForUser.role) ||
        (!archivedOwner && (farmStatus !== 'active' || profileForUser.membershipStatus !== 'active'))) {
      setRemoteTransactions([]); setTxLoading(false); return undefined;
    }
    setTxLoading(true);
    const cacheKey = `farmbooks.transactions.cache.v2.${uid}.${profileForUser.farmId}`;
    let disposed = false;
    let receivedLiveSnapshot = false;
    AsyncStorage.getItem(cacheKey).then((raw) => {
      if (!disposed && !receivedLiveSnapshot && raw) {
        try { setRemoteTransactions(JSON.parse(raw)); setTxLoading(false); } catch { /* ignore damaged cache */ }
      }
    }).catch(() => {});
    const clauses = [where('farmId', '==', profileForUser.farmId)];
    if (profileForUser.role === 'farmer') clauses.push(where('createdBy', '==', uid));
    const txQuery = query(collection(db, 'transactions'), ...clauses);
    const unsubscribe = onSnapshot(txQuery, (snapshot) => {
      if (disposed || currentUidRef.current !== uid) return;
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => item.farmId === profileForUser.farmId)
        .sort((a, b) => dateSortValue(b.createdAt || b.dateISO) - dateSortValue(a.createdAt || a.dateISO));
      // If a Firestore local-cache snapshot is empty, keep the custom last-known cache until a server snapshot arrives.
      if (!snapshot.metadata.fromCache || rows.length > 0) {
        receivedLiveSnapshot = !snapshot.metadata.fromCache || rows.length > 0;
        setRemoteTransactions(rows); setTxLoading(false);
      }
      if (!snapshot.metadata.fromCache) {
        setDataError('');
        AsyncStorage.setItem(cacheKey, JSON.stringify(rows.map(cacheSafeRecord))).catch(() => {});
      }
    }, (error) => {
      if (disposed || currentUidRef.current !== uid) return;
      setRemoteTransactions([]);
      AsyncStorage.removeItem(cacheKey).catch(() => {});
      setDataError(`Record history unavailable: ${friendlyError(error)}`); setTxLoading(false);
    });
    return () => { disposed = true; unsubscribe(); };
  }, [user?.uid, profileForUser?.farmId, profileForUser?.role, profileForUser?.membershipStatus, farmStatus]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !profileForUser?.farmId || profileForUser.membershipStatus !== 'active' || farmStatus !== 'active') {
      setAssignments([]); return undefined;
    }
    const cacheKey = `farmbooks.assignments.cache.v2.${uid}.${profileForUser.farmId}`;
    let disposed = false;
    let receivedLiveSnapshot = false;
    AsyncStorage.getItem(cacheKey).then((raw) => {
      if (!disposed && !receivedLiveSnapshot && raw) {
        try { setAssignments(JSON.parse(raw)); } catch { /* ignore damaged cache */ }
      }
    }).catch(() => {});
    const clauses = [where('farmId', '==', profileForUser.farmId)];
    if (profileForUser.role === 'farmer') clauses.push(where('assignedTo', '==', uid));
    const assignmentQuery = query(collection(db, 'assignments'), ...clauses);
    const unsubscribe = onSnapshot(assignmentQuery, (snapshot) => {
      if (disposed || currentUidRef.current !== uid) return;
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => item.farmId === profileForUser.farmId)
        .sort((a, b) => dateSortValue(b.createdAt) - dateSortValue(a.createdAt));
      if (!snapshot.metadata.fromCache || rows.length > 0) {
        receivedLiveSnapshot = !snapshot.metadata.fromCache || rows.length > 0;
        setAssignments(rows);
      }
      if (!snapshot.metadata.fromCache) AsyncStorage.setItem(cacheKey, JSON.stringify(rows.map(cacheSafeRecord))).catch(() => {});
    }, (error) => {
      if (disposed || currentUidRef.current !== uid) return;
      setAssignments([]);
      AsyncStorage.removeItem(cacheKey).catch(() => {});
      setDataError(`Crop assignments unavailable: ${friendlyError(error)}`);
    });
    return () => { disposed = true; unsubscribe(); };
  }, [user?.uid, profileForUser?.farmId, profileForUser?.role, profileForUser?.membershipStatus, farmStatus]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !profileForUser?.farmId || profileForUser.membershipStatus !== 'active' || farmStatus !== 'active' ||
        !['owner', 'manager'].includes(profileForUser.role)) { setMembers([]); return undefined; }
    let disposed = false;
    const memberQuery = query(collection(db, 'users'), where('farmId', '==', profileForUser.farmId));
    const unsubscribe = onSnapshot(memberQuery, (snapshot) => {
      if (disposed || currentUidRef.current !== uid) return;
      setMembers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => item.farmId === profileForUser.farmId && item.membershipStatus === 'active'));
    }, (error) => {
      if (!disposed && currentUidRef.current === uid) setDataError(`Team list unavailable: ${friendlyError(error)}`);
    });
    return () => { disposed = true; unsubscribe(); };
  }, [user?.uid, profileForUser?.farmId, profileForUser?.role, profileForUser?.membershipStatus, farmStatus]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid || profileForUser?.role !== 'owner' || !profileForUser.farmId ||
        profileForUser.membershipStatus !== 'active' || farmStatus !== 'active') {
      setMembershipEvents([]);
      return undefined;
    }
    let disposed = false;
    const eventsQuery = query(collection(db, 'farmMembershipEvents'), where('farmId', '==', profileForUser.farmId));
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      if (disposed || currentUidRef.current !== uid) return;
      setMembershipEvents(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => dateSortValue(b.changedAt) - dateSortValue(a.changedAt)));
    }, (error) => {
      if (!disposed && currentUidRef.current === uid) setDataError(`Membership history unavailable: ${friendlyError(error)}`);
    });
    return () => { disposed = true; unsubscribe(); };
  }, [user?.uid, profileForUser?.farmId, profileForUser?.role, profileForUser?.membershipStatus, farmStatus]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !profileForUser) { setApplications([]); return undefined; }
    if (profileForUser.role === 'owner' && profileForUser.farmId && profileForUser.membershipStatus === 'active' && farmStatus === 'active') {
      const appQuery = query(collection(db, 'farmJoinApplications'), where('farmId', '==', profileForUser.farmId));
      return onSnapshot(appQuery, (snapshot) => {
        if (currentUidRef.current === uid) setApplications(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      }, (error) => {
        if (currentUidRef.current === uid) setDataError(`Farm applications unavailable: ${friendlyError(error)}`);
      });
    }
    if ((!profileForUser.farmId || farmUnavailable) && ['farmer', 'manager'].includes(profileForUser.role)) {
      const appQuery = query(collection(db, 'farmJoinApplications'), where('userId', '==', uid));
      return onSnapshot(appQuery, (snapshot) => {
        if (currentUidRef.current === uid) setApplications(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      }, (error) => {
        if (currentUidRef.current === uid) setDataError(`Application status unavailable: ${friendlyError(error)}`);
      });
    }
    setApplications([]);
    return undefined;
  }, [user?.uid, profileForUser?.farmId, profileForUser?.role, profileForUser?.membershipStatus, farmStatus, farmUnavailable]);

  const refreshFarms = useCallback(async () => {
    const uid = user?.uid;
    if (!uid) return;
    const requestId = ++directoryRequest.current;
    setFarmLoading(true);
    try {
      const result = await listFarms();
      if (currentUidRef.current === uid && directoryRequest.current === requestId) setFarms(result);
    } catch (error) {
      if (currentUidRef.current === uid && directoryRequest.current === requestId) setDataError(`Farm directory unavailable: ${friendlyError(error)}`);
    } finally {
      if (currentUidRef.current === uid && directoryRequest.current === requestId) setFarmLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user || !profileForUser || (profileForUser.farmId && !farmUnavailable)) {
      directoryRequest.current += 1;
      setFarms([]);
      setFarmLoading(false);
      return;
    }
    refreshFarms();
  }, [user?.uid, profileForUser?.farmId, Boolean(profileForUser), farmUnavailable, refreshFarms]);

  // Attempt to sync this user's local transaction queue when a farm profile becomes available.
  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !profileForUser?.farmId || profileForUser.membershipStatus !== 'active' || farmStatus !== 'active') return;
    let cancelled = false;
    (async () => {
      try {
        const queued = await getPendingTransactions(uid);
        if (!cancelled && currentUidRef.current === uid && queued.length) await syncPendingTransactions(uid);
      } catch (error) {
        if (!cancelled && currentUidRef.current === uid) setDataError(`Pending transaction sync failed: ${friendlyError(error)}`);
      } finally {
        if (!cancelled && currentUidRef.current === uid) await refreshPending();
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid, profileForUser?.farmId, profileForUser?.membershipStatus, farmStatus, refreshPending]);

  const syncNow = useCallback(async () => {
    const uid = user?.uid;
    if (!uid) return { synced: 0, pending: 0, errors: [] };
    setSyncing(true);
    try {
      const result = await syncPendingTransactions(uid);
      await refreshPending();
      if (currentUidRef.current === uid && result.errors.length) setDataError(`Some records still need syncing: ${result.errors[0].message}`);
      else if (currentUidRef.current === uid && result.synced) setDataError('');
      return result;
    } finally {
      if (currentUidRef.current === uid) setSyncing(false);
    }
  }, [user?.uid, refreshPending]);

  const transactions = useMemo(() => {
    const byId = new Map(remoteTransactions.map((item) => [item.id, item]));
    for (const item of pendingTransactions) {
      const remote = byId.get(item.id);
      if (remote) {
        const statusPending = item.status !== remote.status;
        const photoPending = Boolean(item.photoUri && !remote.photoUrl);
        byId.set(item.id, { ...remote, ...item, _pending: false, _pendingSync: statusPending || photoPending, _photoPending: photoPending });
      } else {
        byId.set(item.id, { ...item, _pending: true, _pendingSync: true });
      }
    }
    const archivedOwner = profileForUser?.role === 'owner' && profileForUser.membershipStatus === 'archived' && farmStatus === 'disbanded';
    const canViewTransactions = Boolean(profileForUser?.farmId && (
      (profileForUser.membershipStatus === 'active' && farmStatus === 'active') || archivedOwner
    ));
    return [...byId.values()].filter((item) => canViewTransactions && item.farmId === profileForUser.farmId)
      .sort((a, b) => dateSortValue(b.createdAt || b.dateISO) - dateSortValue(a.createdAt || a.dateISO));
  }, [remoteTransactions, pendingTransactions, profileForUser?.farmId, profileForUser?.role, profileForUser?.membershipStatus, farmStatus]);

  const totals = useMemo(() => {
    const active = transactions.filter((item) => item.status === 'active');
    const income = active.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expenses = active.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { income, expenses, balance: income - expenses, activeCount: active.length };
  }, [transactions]);

  const operatingMembership = profileForUser?.membershipStatus === 'active' && farmStatus === 'active';
  return {
    transactions,
    assignments: operatingMembership ? assignments.filter((item) => item.farmId === profileForUser?.farmId &&
      (profileForUser?.role !== 'farmer' || item.assignedTo === user?.uid)) : [],
    members: operatingMembership ? members.filter((item) => item.farmId === profileForUser?.farmId && item.membershipStatus === 'active') : [],
    membershipEvents: operatingMembership && profileForUser?.role === 'owner'
      ? membershipEvents.filter((item) => item.farmId === profileForUser?.farmId) : [],
    applications: profileForUser?.role === 'owner'
      ? (operatingMembership ? applications.filter((item) => item.farmId === profileForUser?.farmId) : [])
      : ((!profileForUser?.farmId || farmUnavailable) ? applications.filter((item) => item.userId === user?.uid) : []),
    farms: profileForUser ? farms : [], totals, farmUnavailable, farmStatus,
    txLoading, farmLoading, dataError, setDataError, refreshFarms, refreshPending, syncNow, syncing,
  };
}
