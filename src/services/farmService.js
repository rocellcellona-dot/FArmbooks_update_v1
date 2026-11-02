import {
  addDoc, collection, doc, getDocs, query, runTransaction, serverTimestamp,
  updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { getPendingTransactions } from './transactionService';

const NO_FARM_VALUES = [undefined, null, ''];
const isFarmOpen = (farm) =>
  !Object.prototype.hasOwnProperty.call(farm, 'status') || farm.status === 'active';

function hasNoActiveFarm(profile, formerFarm) {
  return (NO_FARM_VALUES.includes(profile.farmId) && profile.membershipStatus !== 'active') ||
    (typeof profile.farmId === 'string' && formerFarm?.status === 'disbanded');
}

function validateCleanupSize(size) {
  if (size > 498) throw new Error('This membership has too many open tasks or applications to update safely. Contact the Farm Owner for assistance.');
}

export async function listFarms() {
  const snapshot = await getDocs(collection(db, 'farms'));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    .filter((farm) => isFarmOpen(farm))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

export async function createFarmForOwner({ uid, profile, name, location }) {
  if (profile.role !== 'owner') throw new Error('Only a Farm Owner can create a farm.');
  if (profile.farmId) throw new Error('Your profile is already connected to a farm.');
  const farm = await addDoc(collection(db, 'farms'), {
    name: name.trim(), location: location.trim(), ownerId: uid,
    ownerName: profile.fullName || '', status: 'active',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', uid), {
    farmId: farm.id, farmName: name.trim(), membershipStatus: 'active', updatedAt: serverTimestamp(),
  });
  return { ...profile, farmId: farm.id, farmName: name.trim(), membershipStatus: 'active' };
}

export async function applyToFarm({ uid, profile, farm }) {
  if (!uid) throw new Error('Sign in before applying to a farm.');
  if (!profile || !['farmer', 'manager'].includes(profile.role)) throw new Error('Only Farmers and Farm Managers can apply to join a farm.');
  if (!farm?.id) throw new Error('Choose a valid farm.');

  const applicationRef = doc(db, 'farmJoinApplications', `${farm.id}_${uid}`);
  return runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', uid);
    const farmRef = doc(db, 'farms', farm.id);
    const [userSnapshot, farmSnapshot, applicationSnapshot] = await Promise.all([
      transaction.get(userRef), transaction.get(farmRef), transaction.get(applicationRef),
    ]);
    if (!userSnapshot.exists()) throw new Error('Your FarmBooks profile could not be found. Sign out and restore your profile before applying.');
    if (!farmSnapshot.exists()) throw new Error('This farm is no longer available.');

    const actualProfile = userSnapshot.data();
    const actualFarm = farmSnapshot.data();
    const formerFarmSnapshot = typeof actualProfile.farmId === 'string' && actualProfile.farmId.length > 0
      ? (actualProfile.farmId === farm.id ? farmSnapshot : await transaction.get(doc(db, 'farms', actualProfile.farmId)))
      : null;
    const formerFarm = formerFarmSnapshot?.exists() ? formerFarmSnapshot.data() : null;
    if (!['farmer', 'manager'].includes(actualProfile.role) || !hasNoActiveFarm(actualProfile, formerFarm)) {
      throw new Error('Your profile is not eligible to apply. Refresh your profile and try again.');
    }
    if (!isFarmOpen(actualFarm)) throw new Error('This farm is no longer accepting applications.');

    const existing = applicationSnapshot.exists() ? applicationSnapshot.data() : null;
    if (existing) {
      if (existing.farmId !== farm.id || existing.userId !== uid || existing.requestedRole !== actualProfile.role) {
        throw new Error('The existing application does not match your profile. Contact the Farm Owner before retrying.');
      }
      if (existing.status === 'pending') return { status: 'pending', message: 'Your application is already pending.' };
      if (existing.status === 'approved' && actualProfile.farmId === farm.id && actualProfile.membershipStatus === 'active') {
        return { status: 'approved', message: 'You have already been approved for this farm.' };
      }
      if (existing.status === 'approved' && !hasNoActiveFarm(actualProfile, formerFarm)) {
        throw new Error('The application is approved but your profile is connected to another farm. Contact the Farm Owner.');
      }
      if (!['rejected', 'approved'].includes(existing.status)) throw new Error('This application cannot be resubmitted.');

      transaction.update(applicationRef, {
        status: 'pending', createdAt: serverTimestamp(), reappliedAt: serverTimestamp(),
      });
      return { status: 'pending', message: 'Your application was submitted again.' };
    }

    transaction.set(applicationRef, {
      farmId: farm.id, farmName: actualFarm.name, userId: uid,
      userName: actualProfile.fullName || '', userEmail: actualProfile.email || '',
      requestedRole: actualProfile.role, status: 'pending', createdAt: serverTimestamp(),
    });
    return { status: 'pending', message: 'Application submitted. The Farm Owner must approve it.' };
  });
}

export async function reviewApplication({ application, reviewerUid, approve }) {
  if (!application?.id || !application.farmId || !application.userId) throw new Error('Application information is incomplete.');
  const applicationRef = doc(db, 'farmJoinApplications', application.id);
  const farmRef = doc(db, 'farms', application.farmId);
  const ownerRef = doc(db, 'users', reviewerUid);
  const applicantRef = doc(db, 'users', application.userId);

  await runTransaction(db, async (transaction) => {
    const [applicationSnapshot, farmSnapshot, ownerSnapshot] = await Promise.all([
      transaction.get(applicationRef), transaction.get(farmRef),
      transaction.get(ownerRef),
    ]);
    if (!applicationSnapshot.exists() || !farmSnapshot.exists() || !ownerSnapshot.exists()) {
      throw new Error('The farm, owner, or application no longer exists.');
    }
    const currentApplication = applicationSnapshot.data();
    const farmData = farmSnapshot.data();
    const ownerProfile = ownerSnapshot.data();
    if (farmData.ownerId !== reviewerUid || ownerProfile.role !== 'owner' ||
        ownerProfile.farmId !== application.farmId || ownerProfile.membershipStatus !== 'active' ||
        !isFarmOpen(farmData)) {
      throw new Error('Only the active Owner of this farm can review its applications.');
    }
    if (currentApplication.status !== 'pending' ||
        currentApplication.userId !== application.userId ||
        currentApplication.farmId !== application.farmId ||
        currentApplication.requestedRole !== application.requestedRole) {
      throw new Error('The application changed or no longer matches the applicant profile. Refresh and try again.');
    }

    transaction.update(applicationRef, {
      status: approve ? 'approved' : 'rejected', reviewedBy: reviewerUid, reviewedAt: serverTimestamp(),
    });
    if (approve) {
      transaction.update(applicantRef, {
        farmId: application.farmId, farmName: farmData.name || '',
        membershipStatus: 'active', joinedAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
    }
  });
}

async function getOpenUserApplications(uid) {
  const snapshot = await getDocs(query(
    collection(db, 'farmJoinApplications'),
    where('userId', '==', uid),
  ));
  return snapshot.docs.filter((item) => item.data().status === 'pending');
}

async function getAssignedTasks(farmId, uid) {
  const snapshot = await getDocs(query(
    collection(db, 'assignments'),
    where('farmId', '==', farmId),
    where('assignedTo', '==', uid),
  ));
  return snapshot.docs.filter((item) => ['pending', 'in_progress'].includes(item.data().status));
}

async function getFarmApplications(farmId) {
  const snapshot = await getDocs(query(
    collection(db, 'farmJoinApplications'),
    where('farmId', '==', farmId),
  ));
  return snapshot.docs;
}

export async function leaveFarm({ uid, profile }) {
  if (!uid || !profile?.farmId || !['farmer', 'manager'].includes(profile.role) ||
      profile.membershipStatus !== 'active') {
    throw new Error('Only an active Farmer or Farm Manager can leave a farm.');
  }

  const farmId = profile.farmId;
  const pendingTransactions = (await getPendingTransactions(uid)).filter((item) => item.farmId === farmId);
  if (pendingTransactions.length) {
    throw new Error('Sync your locally queued transactions before leaving so they are not stranded on this device.');
  }
  const [applications, assignments] = await Promise.all([
    getOpenUserApplications(uid),
    getAssignedTasks(farmId, uid),
  ]);
  validateCleanupSize(applications.length + assignments.length);

  const batch = writeBatch(db);
  const eventRef = doc(collection(db, 'farmMembershipEvents'));
  batch.update(doc(db, 'users', uid), {
    farmId: null, farmName: '', membershipStatus: 'left',
    formerFarmId: farmId, formerFarmName: profile.farmName || '',
    membershipChangedBy: uid, membershipChangeReason: 'Left voluntarily',
    membershipChangedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  batch.set(eventRef, {
    farmId, farmName: profile.farmName || '', userId: uid,
    userName: profile.fullName || '', userRole: profile.role,
    action: 'left', changedBy: uid, changedByName: profile.fullName || '',
    reason: 'Left voluntarily', changedAt: serverTimestamp(),
  });
  applications.forEach((item) => batch.update(item.ref, {
    status: 'withdrawn', withdrawnAt: serverTimestamp(),
  }));
  assignments.forEach((item) => batch.update(item.ref, {
    status: 'cancelled', cancelledBy: uid, cancelledAt: serverTimestamp(),
    cancellationReason: 'Assignee left the farm', updatedAt: serverTimestamp(),
  }));
  await batch.commit();
  return { ...profile, farmId: null, farmName: '', membershipStatus: 'left' };
}

export async function removeFarmMember({ ownerUid, ownerName = '', farmId, member, reason = '' }) {
  if (!ownerUid || !farmId || !member?.id || member.id === ownerUid ||
      !['farmer', 'manager'].includes(member.role) || member.farmId !== farmId ||
      member.membershipStatus !== 'active') {
    throw new Error('Choose an active Farmer or Farm Manager in your own farm.');
  }

  const [farmApplications, assignments] = await Promise.all([
    getFarmApplications(farmId),
    getAssignedTasks(farmId, member.id),
  ]);
  const applications = farmApplications.filter((item) =>
    item.data().userId === member.id && item.data().status === 'pending');
  validateCleanupSize(applications.length + assignments.length);

  const batch = writeBatch(db);
  const eventRef = doc(collection(db, 'farmMembershipEvents'));
  batch.update(doc(db, 'users', member.id), {
    farmId: null, farmName: '', membershipStatus: 'removed',
    formerFarmId: farmId, formerFarmName: member.farmName || '',
    membershipChangedBy: ownerUid, membershipChangedAt: serverTimestamp(),
    membershipChangeReason: reason.trim().slice(0, 500),
    updatedAt: serverTimestamp(),
  });
  batch.set(eventRef, {
    farmId, farmName: member.farmName || '', userId: member.id,
    userName: member.fullName || member.email || '', userRole: member.role,
    action: 'removed', changedBy: ownerUid, changedByName: ownerName,
    reason: reason.trim().slice(0, 500), changedAt: serverTimestamp(),
  });
  applications.forEach((item) => batch.update(item.ref, {
    status: 'rejected', reviewedBy: ownerUid, reviewedAt: serverTimestamp(),
  }));
  assignments.forEach((item) => batch.update(item.ref, {
    status: 'cancelled', cancelledBy: ownerUid, cancelledAt: serverTimestamp(),
    cancellationReason: 'Assignee removed from the farm', updatedAt: serverTimestamp(),
  }));
  await batch.commit();
}

export async function disbandFarm({ ownerUid, profile, farmNameConfirmation }) {
  if (!ownerUid || profile?.role !== 'owner' || !profile.farmId || profile.membershipStatus !== 'active') {
    throw new Error('Only the active Farm Owner can disband this farm.');
  }
  const pendingTransactions = (await getPendingTransactions(ownerUid)).filter((item) => item.farmId === profile.farmId);
  if (pendingTransactions.length) {
    throw new Error('Sync your locally queued transactions before disbanding so they are included in the farm archive.');
  }
  const ownerRef = doc(db, 'users', ownerUid);
  const farmRef = doc(db, 'farms', profile.farmId);
  const eventRef = doc(collection(db, 'farmMembershipEvents'));
  await runTransaction(db, async (transaction) => {
    const [ownerSnapshot, farmSnapshot] = await Promise.all([
      transaction.get(ownerRef), transaction.get(farmRef),
    ]);
    if (!ownerSnapshot.exists() || !farmSnapshot.exists()) throw new Error('The Owner profile or farm could not be found.');
    const owner = ownerSnapshot.data();
    const farm = farmSnapshot.data();
    if (owner.role !== 'owner' || owner.membershipStatus !== 'active' ||
        owner.farmId !== profile.farmId || farm.ownerId !== ownerUid || !isFarmOpen(farm)) {
      throw new Error('Only the active Owner of an open farm can disband it.');
    }
    if (farmNameConfirmation !== farm.name) throw new Error('Type the exact current farm name to confirm disbanding.');
    const event = {
      farmId: profile.farmId, farmName: farm.name, userId: ownerUid,
      userName: owner.fullName || '', userRole: 'owner',
      action: 'disbanded', changedBy: ownerUid, changedByName: owner.fullName || '',
      reason: 'Farm disbanded', changedAt: serverTimestamp(),
    };
    transaction.update(farmRef, {
      status: 'disbanded', disbandedBy: ownerUid,
      disbandedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    transaction.update(ownerRef, {
      membershipStatus: 'archived', membershipChangedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    transaction.set(eventRef, event);
  });
  return { ...profile, membershipStatus: 'archived' };
}

export async function queryMyApplications(uid) {
  const snapshot = await getDocs(query(collection(db, 'farmJoinApplications'), where('userId', '==', uid)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}
