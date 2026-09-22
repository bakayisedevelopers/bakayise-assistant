import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { SpouseLinkDoc } from '../types';

export const SPOUSE_LINKS_COLLECTION = 'apps/shared_family_workspace/spouse_links';

export function getSpouseLinkId(email1: string, email2: string): string {
  const e1 = email1.toLowerCase().trim();
  const e2 = email2.toLowerCase().trim();
  return [e1, e2].sort().join('__').replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Real-time subscription to find any spouse link involving the user's email.
 */
export function subscribeToUserSpouseLink(
  userEmail: string | undefined | null,
  onData: (link: SpouseLinkDoc | null) => void,
  onError?: (error: any) => void
) {
  if (!userEmail) {
    onData(null);
    return () => {};
  }

  const normalized = userEmail.toLowerCase().trim();
  const colRef = collection(db, 'apps', 'shared_family_workspace', 'spouse_links');

  // We listen to the collection and filter client-side to ensure full real-time coverage
  // for both requester and target emails.
  return onSnapshot(
    colRef,
    (snapshot) => {
      let found: SpouseLinkDoc | null = null;
      snapshot.forEach((d) => {
        const data = d.data() as SpouseLinkDoc;
        const reqE = (data.requesterEmail || '').toLowerCase().trim();
        const tgtE = (data.targetEmail || '').toLowerCase().trim();
        if (reqE === normalized || tgtE === normalized) {
          // If there are multiple, prioritize 'connected', then 'pending'
          if (!found) {
            found = { ...data, id: d.id };
          } else if (data.status === 'connected') {
            found = { ...data, id: d.id };
          } else if (data.status === 'pending' && found.status !== 'connected') {
            found = { ...data, id: d.id };
          }
        }
      });
      onData(found);
    },
    (err) => {
      console.warn('subscribeToUserSpouseLink notice:', err?.message || err);
      if (onError) onError(err);
    }
  );
}

/**
 * Send or update a mutual spouse link request.
 */
export async function sendSpouseLinkRequest(params: {
  requesterEmail: string;
  requesterName: string;
  requesterRole: 'Husband' | 'Wife';
  targetEmail: string;
  targetName?: string;
  targetRole: 'Husband' | 'Wife';
}): Promise<void> {
  const { requesterEmail, requesterName, requesterRole, targetEmail, targetName, targetRole } =
    params;
  const linkId = getSpouseLinkId(requesterEmail, targetEmail);
  const linkRef = doc(db, 'apps', 'shared_family_workspace', 'spouse_links', linkId);

  const payload: SpouseLinkDoc = {
    id: linkId,
    requesterEmail: requesterEmail.toLowerCase().trim(),
    requesterName: requesterName.trim(),
    requesterRole,
    targetEmail: targetEmail.toLowerCase().trim(),
    targetName: targetName?.trim(),
    targetRole,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  await setDoc(linkRef, payload, { merge: true });
}

/**
 * Accept or decline an incoming spouse link request.
 */
export async function respondToSpouseLinkRequest(
  linkId: string,
  accept: boolean
): Promise<void> {
  const linkRef = doc(db, 'apps', 'shared_family_workspace', 'spouse_links', linkId);
  if (accept) {
    await updateDoc(linkRef, {
      status: 'connected',
      confirmedAt: new Date().toISOString(),
    });
  } else {
    await updateDoc(linkRef, {
      status: 'declined',
      declinedAt: new Date().toISOString(),
    });
  }
}

/**
 * Disconnect or cancel a spouse link.
 */
export async function removeSpouseLink(linkId: string): Promise<void> {
  const linkRef = doc(db, 'apps', 'shared_family_workspace', 'spouse_links', linkId);
  await deleteDoc(linkRef);
}
