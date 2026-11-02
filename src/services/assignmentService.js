import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export async function createAssignment({ profile, user, assignedTo, assignedToName, cropName, task, dueDate }) {
  if (!profile?.farmId || !['owner', 'manager'].includes(profile.role)) throw new Error('You do not have permission to assign tasks.');
  return addDoc(collection(db, 'assignments'), {
    farmId: profile.farmId, createdBy: user.uid, createdByName: profile.fullName || user.email || '',
    assignedTo, assignedToName, cropName: cropName.trim(), task: task.trim(),
    dueDate: dueDate.trim(), status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export async function updateAssignmentStatus({ assignment, user, status, note = '' }) {
  if (!['in_progress', 'completed'].includes(status)) throw new Error('Invalid task status.');
  await updateDoc(doc(db, 'assignments', assignment.id), {
    status, updatedAt: serverTimestamp(), ...(note.trim() ? { completionNote: note.trim() } : {}),
  });
}
