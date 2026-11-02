import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { isNetworkError } from './errors';

const queueKey = (uid) => `farmbooks.pendingTransactions.v2.${uid}`;

async function readQueue(uid) {
  try { return JSON.parse((await AsyncStorage.getItem(queueKey(uid))) || '[]'); }
  catch { return []; }
}
async function writeQueue(uid, items) {
  await AsyncStorage.setItem(queueKey(uid), JSON.stringify(items));
}
export async function getPendingTransactions(uid) { return uid ? readQueue(uid) : []; }

export async function enqueueTransaction(uid, transaction) {
  const current = await readQueue(uid);
  const next = [transaction, ...current.filter((item) => item.id !== transaction.id)];
  await writeQueue(uid, next);
  return next;
}

export async function patchPendingTransaction(uid, id, patch) {
  const current = await readQueue(uid);
  const next = current.map((item) => item.id === id ? { ...item, ...patch } : item);
  await writeQueue(uid, next);
  return next;
}

async function uploadImage(uri, farmId, transactionId) {
  if (!storage) throw new Error('Firebase Storage is not configured. Add the storageBucket value in firebase.js.');
  const response = await fetch(uri);
  const blob = await response.blob();
  const extension = String(uri).toLowerCase().includes('.png') ? 'png' : 'jpg';
  const path = `farms/${farmId}/transactions/${transactionId}/${Date.now()}.${extension}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: extension === 'png' ? 'image/png' : 'image/jpeg' });
  const photoUrl = await getDownloadURL(storageRef);
  if (blob?.close) blob.close();
  return { photoUrl, photoPath: path };
}

function cloudPayload(item) {
  const { id, _pending, photoUri, syncError, cancellationReason, cancelledBy, cancelledAt, deletedBy, deletedAt, photoUrl, photoPath, ...data } = item;
  return {
    ...data,
    status: 'active',
    createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : (data.createdAt || new Date().toISOString()),
  };
}

function isActionableStatus(status) { return ['active', 'cancelled'].includes(status); }

// Store first in phone-local AsyncStorage, then try to sync. Unsent records are clearly marked.
export async function createTransactionOfflineFirst({ uid, profile, user, values }) {
  if (!uid || !profile?.farmId) throw new Error('Your account must belong to a farm before adding transactions.');
  // Prefix ID with UID. Rules allow this user to safely check their deterministic own-record path.
  const id = `${uid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const transaction = {
    ...values,
    id,
    farmId: profile.farmId,
    farmName: profile.farmName || '',
    createdBy: uid,
    createdByName: profile.fullName || user?.email || '',
    status: 'active',
    createdAt: new Date().toISOString(),
    ...(values.photoUri ? { photoUri: values.photoUri } : {}),
    _pending: true,
  };
  await enqueueTransaction(uid, transaction);
  const sync = await syncPendingTransactions(uid);
  const stillQueued = (await readQueue(uid)).some((item) => item.id === id);
  return { transaction: { ...transaction }, queued: stillQueued, sync };
}

export async function syncPendingTransactions(uid) {
  if (!uid) return { synced: 0, pending: 0, errors: [] };
  const queue = await readQueue(uid);
  if (!queue.length) return { synced: 0, pending: 0, errors: [] };
  let profileSnapshot;
  try {
    profileSnapshot = await getDoc(doc(db, 'users', uid));
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    return { synced: 0, pending: queue.length, errors: [{ id: '', code: error?.code || '', message: error?.message || 'Membership could not be checked while offline.' }] };
  }
  let activeFarmId = null;
  if (profileSnapshot.exists()) {
    const profile = profileSnapshot.data();
    if (profile.membershipStatus === 'active' && profile.farmId) {
      let farmSnapshot;
      try {
        farmSnapshot = await getDoc(doc(db, 'farms', profile.farmId));
      } catch (error) {
        if (!isNetworkError(error)) throw error;
        return { synced: 0, pending: queue.length, errors: [{ id: '', code: error?.code || '', message: error?.message || 'Farm status could not be checked while offline.' }] };
      }
      if (farmSnapshot.exists()) {
        const farm = farmSnapshot.data();
        if (!Object.prototype.hasOwnProperty.call(farm, 'status') || farm.status === 'active') {
          activeFarmId = profile.farmId;
        }
      }
    }
  }
  let synced = 0;
  const errors = [];
  for (const item of queue) {
    if (!activeFarmId || item.farmId !== activeFarmId) {
      errors.push({ id: item.id, code: 'membership/inactive', message: 'This local transaction was not synced because your active farm membership changed.' });
      continue;
    }
    const transactionRef = doc(db, 'transactions', item.id);
    try {
      const existing = await getDoc(transactionRef);
      let cloudStatus = existing.exists() ? existing.data().status : null;
      if (!existing.exists()) {
        await setDoc(transactionRef, cloudPayload(item));
        cloudStatus = 'active';
      }
      if (item.photoUri && !item.photoUrl) {
        const uploaded = await uploadImage(item.photoUri, item.farmId, item.id);
        await updateDoc(transactionRef, { ...uploaded, updatedAt: serverTimestamp() });
        item.photoUrl = uploaded.photoUrl;
        item.photoPath = uploaded.photoPath;
        await patchPendingTransaction(uid, item.id, { photoUrl: uploaded.photoUrl, photoPath: uploaded.photoPath });
      }
      if (item.status === 'cancelled' && cloudStatus !== 'cancelled') {
        await updateDoc(transactionRef, {
          status: 'cancelled',
          cancellationReason: item.cancellationReason || 'Cancelled offline by farmer',
          cancelledBy: item.cancelledBy || uid,
          cancelledAt: serverTimestamp(),
        });
      } else if (item.status === 'deleted' && cloudStatus !== 'deleted') {
        await updateDoc(transactionRef, {
          status: 'deleted', deletedBy: item.deletedBy || uid, deletedAt: serverTimestamp(),
        });
      }
      const latest = await readQueue(uid);
      await writeQueue(uid, latest.filter((queued) => queued.id !== item.id));
      synced += 1;
    } catch (error) {
      errors.push({ id: item.id, code: error?.code || '', message: error?.message || 'Sync failed' });
      // Keep later queue entries for another attempt; avoid noisy repeated requests after a network outage.
      if (isNetworkError(error)) break;
    }
  }
  return { synced, pending: (await readQueue(uid)).length, errors };
}

export async function cancelTransaction({ uid, transaction, reason }) {
  if (!reason || !reason.trim()) throw new Error('Enter a reason before cancelling this transaction.');
  if (transaction.status !== 'active') throw new Error('Only active transactions can be cancelled.');
  const pending = await readQueue(uid);
  const queued = pending.find((item) => item.id === transaction.id);
  if (queued) {
    await patchPendingTransaction(uid, transaction.id, {
      status: 'cancelled', cancellationReason: reason.trim(), cancelledBy: uid,
      cancelledAt: new Date().toISOString(), _pending: true,
    });
    return { local: true, result: await syncPendingTransactions(uid) };
  }
  await updateDoc(doc(db, 'transactions', transaction.id), {
    status: 'cancelled', cancellationReason: reason.trim(), cancelledBy: uid,
    cancelledAt: serverTimestamp(),
  });
  return { local: false };
}

export async function softDeleteTransaction({ uid, transaction }) {
  if (!isActionableStatus(transaction.status)) throw new Error('This transaction can no longer be deleted.');
  const pending = await readQueue(uid);
  const queued = pending.find((item) => item.id === transaction.id);
  if (queued) {
    await patchPendingTransaction(uid, transaction.id, {
      status: 'deleted', deletedBy: uid, deletedAt: new Date().toISOString(), _pending: true,
    });
    return { local: true, result: await syncPendingTransactions(uid) };
  }
  await updateDoc(doc(db, 'transactions', transaction.id), {
    status: 'deleted', deletedBy: uid, deletedAt: serverTimestamp(),
  });
  return { local: false };
}
