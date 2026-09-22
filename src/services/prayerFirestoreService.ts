import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  PrayerPerson,
  PrayerRequestItem,
  PrayerStatus,
  PrayerSessionLog,
  AssistantApp,
} from '../types';
import { getPrayerPersonIds } from '../utils/prayerRequestPeople';

export const PRAYER_JOURNAL_APP_ID = 'prayer_journal';

export const DEFAULT_PRAYER_JOURNAL_METADATA: AssistantApp = {
  id: PRAYER_JOURNAL_APP_ID,
  appName: 'Prayer Journal',
  name: 'Prayer Journal',
  appDescription:
    'Personal & family prayer journal: track prayer requests, people, scriptures, prayer dates, and what the Lord is prompting you to do.',
  description:
    'Personal & family prayer journal: track prayer requests, people, scriptures, prayer dates, and what the Lord is prompting you to do.',
  status: 'active',
  icon: 'heart-handshake',
  category: 'Spiritual',
  route: '/prayer_journal',
  dataPath: 'apps/prayer_journal',
  features: [
    'People Prayer List (Praying for yourself, family, church & friends)',
    'Detailed Prayer Requests with Status (Open, Answered Yes/No, Delayed, Closed)',
    'Built-in Bible & Scripture Selector (Book/Chapter/Verse with instant search)',
    'Prayer Log: Record dates prayed & what the Lord is prompting you to do',
    'Answered Prayers & Testimony celebration journal',
  ],
};

function cleanFirestoreObject<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Ensures the app descriptor document exists at /apps/prayer_journal.
 */
export async function ensurePrayerJournalAppDocument(): Promise<void> {
  try {
    const appDocRef = doc(db, 'apps', PRAYER_JOURNAL_APP_ID);
    const existing = await getDoc(appDocRef);
    if (!existing.exists()) {
      await setDoc(appDocRef, {
        ...DEFAULT_PRAYER_JOURNAL_METADATA,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await updateDoc(appDocRef, {
        appName: 'Prayer Journal',
        name: 'Prayer Journal',
        status: 'active',
        dataPath: 'apps/prayer_journal',
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    console.warn('ensurePrayerJournalAppDocument notice:', err?.message || err);
  }
}

// -------------------------------------------------------------
// PEOPLE (PEOPLE WE ARE PRAYING FOR)
// -------------------------------------------------------------

export function subscribeToPrayerPeople(
  userId: string,
  userEmail: string | undefined,
  onData: (people: PrayerPerson[]) => void,
  onError?: (error: any) => void
) {
  const peopleCol = collection(db, 'apps', PRAYER_JOURNAL_APP_ID, 'people');

  return onSnapshot(
    peopleCol,
    (snapshot) => {
      const items: PrayerPerson[] = [];
      snapshot.forEach((docSnap) => {
        const p = { id: docSnap.id, ...(docSnap.data() as any) } as PrayerPerson;
        items.push(p);
      });
      // Sort: 'Myself' always at top, then newest created
      items.sort((a, b) => {
        if (a.isMyself && !b.isMyself) return -1;
        if (!a.isMyself && b.isMyself) return 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export async function savePrayerPerson(person: PrayerPerson): Promise<void> {
  const personRef = doc(db, 'apps', PRAYER_JOURNAL_APP_ID, 'people', person.id);
  const payload = cleanFirestoreObject({
    ...person,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(personRef, payload, { merge: true });
}

export async function deletePrayerPerson(personId: string, userId: string): Promise<void> {
  const personRef = doc(db, 'apps', PRAYER_JOURNAL_APP_ID, 'people', personId);
  await deleteDoc(personRef);

  // Remove this person from shared prayers, deleting only requests with no people left.
  try {
    const requestsCol = collection(db, 'apps', PRAYER_JOURNAL_APP_ID, 'prayer_requests');
    const snap = await getDocs(requestsCol);
    for (const d of snap.docs) {
      const request = { id: d.id, ...(d.data() as any) } as PrayerRequestItem;
      const personIds = getPrayerPersonIds(request);
      if (!personIds.includes(personId)) continue;

      const remainingPersonIds = personIds.filter((id) => id !== personId);
      if (remainingPersonIds.length === 0) {
        await deleteDoc(d.ref);
      } else {
        await updateDoc(d.ref, {
          personIds: remainingPersonIds,
          personId: remainingPersonIds[0],
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch (e) {
    console.warn('Notice removing person child prayer requests:', e);
  }
}

// -------------------------------------------------------------
// PRAYER REQUESTS
// -------------------------------------------------------------

export function subscribeToAllUserPrayerRequests(
  userId: string,
  userEmail: string | undefined,
  onData: (requests: PrayerRequestItem[]) => void,
  onError?: (error: any) => void
) {
  const requestsCol = collection(db, 'apps', PRAYER_JOURNAL_APP_ID, 'prayer_requests');
  const normalizedEmail = (userEmail || '').toLowerCase().trim();
  const isJabuOrDev =
    normalizedEmail === 'jabuobed1@gmail.com' ||
    normalizedEmail === 'bakayise.developers@gmail.com';
  const isWifey =
    normalizedEmail === 'lumzayopa@gmail.com' ||
    normalizedEmail === 'lumazyopa@gmail.com';

  const matchesEmail = (targetList: string[]) => {
    if (!normalizedEmail) return false;
    if (targetList.includes(normalizedEmail)) return true;
    if (
      isWifey &&
      (targetList.includes('lumzayopa@gmail.com') ||
        targetList.includes('lumazyopa@gmail.com'))
    ) {
      return true;
    }
    return false;
  };

  return onSnapshot(
    requestsCol,
    (snapshot) => {
      const items: PrayerRequestItem[] = [];
      snapshot.forEach((docSnap) => {
        const r = { id: docSnap.id, ...(docSnap.data() as any) } as PrayerRequestItem;
        const authorEmail = (r.authorEmail || '').toLowerCase().trim();
        const sharedEmails = (r.sharedWithEmails || []).map((e) => e.toLowerCase().trim());
        const sharedUids = r.sharedWithUserIds || [];

        const isOwner =
          (Boolean(userId) && r.userId === userId && userId !== 'guest_user') ||
          (Boolean(normalizedEmail) && authorEmail === normalizedEmail);

        // A request is shared if the user is explicitly in sharedEmails or sharedWithUserIds
        const isExplicitlyShared =
          matchesEmail(sharedEmails) || sharedUids.includes(userId);

        const isLegacyUnassigned =
          !r.authorEmail || r.userId === 'guest_user' || !r.userId;

        let hasAccess = false;
        if (isOwner) {
          hasAccess = true;
        } else if (isExplicitlyShared) {
          hasAccess = true;
        } else if (isLegacyUnassigned && isJabuOrDev) {
          hasAccess = true;
        }

        if (hasAccess) {
          items.push(r);
        }
      });
      // Sort newest created first
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export function subscribeToPersonPrayerRequests(
  userId: string,
  personId: string,
  onData: (requests: PrayerRequestItem[]) => void,
  onError?: (error: any) => void
) {
  const requestsCol = collection(db, 'apps', PRAYER_JOURNAL_APP_ID, 'prayer_requests');
  const q = query(
    requestsCol,
    where('personId', '==', personId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: PrayerRequestItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export async function savePrayerRequest(request: PrayerRequestItem): Promise<void> {
  const reqRef = doc(db, 'apps', PRAYER_JOURNAL_APP_ID, 'prayer_requests', request.id);
  const payload = cleanFirestoreObject({
    ...request,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(reqRef, payload, { merge: true });
}

export async function deletePrayerRequest(requestId: string): Promise<void> {
  const reqRef = doc(db, 'apps', PRAYER_JOURNAL_APP_ID, 'prayer_requests', requestId);
  await deleteDoc(reqRef);
}

/**
 * Quick action to log a prayer session with optional promptings from the Lord.
 */
export async function logPrayerSession(
  requestId: string,
  currentRequest: PrayerRequestItem,
  session: PrayerSessionLog
): Promise<void> {
  const updatedSessions = [session, ...(currentRequest.prayerSessions || [])];
  const updatedCount = (currentRequest.prayersCount || 0) + 1;

  await savePrayerRequest({
    ...currentRequest,
    prayerSessions: updatedSessions,
    prayersCount: updatedCount,
    lastPrayedAt: session.timestamp,
    lastPrayedBy: session.prayedBy,
    lastPrayedByEmail: session.prayedByEmail,
    lastPrayedByRole: session.prayedByRole,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Updates prayer status (Open, Answered Yes, Answered No, Delayed, Closed)
 */
export async function updatePrayerStatus(
  requestId: string,
  currentRequest: PrayerRequestItem,
  status: PrayerStatus,
  dateAnswered?: string,
  answerTestimony?: string
): Promise<void> {
  await savePrayerRequest({
    ...currentRequest,
    status,
    dateAnswered: dateAnswered ?? (status.startsWith('answered') ? new Date().toISOString().split('T')[0] : currentRequest.dateAnswered),
    answerTestimony: answerTestimony ?? currentRequest.answerTestimony,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Migrates legacy records without isPrivate or authorEmail for the current user
 */
export async function migrateLegacyPrayerData(userId: string, userEmail?: string): Promise<void> {
  if (!userId || userId === 'guest_user') return;
  try {
    const peopleCol = collection(db, 'apps', PRAYER_JOURNAL_APP_ID, 'people');
    const q = query(peopleCol, where('userId', '==', userId));
    const snap = await getDocs(q);
    
    for (const d of snap.docs) {
      const data = d.data() as Record<string, any>;
      const updates: Record<string, any> = {};
      if (!data.authorEmail && userEmail) {
        updates.authorEmail = userEmail.toLowerCase().trim();
      }
      if (Object.keys(updates).length > 0) {
        await updateDoc(d.ref, updates);
      }
    }

    // Also migrate prayer requests to ensure privacy flags are properly set
    const requestsCol = collection(db, 'apps', PRAYER_JOURNAL_APP_ID, 'prayer_requests');
    const reqQuery = query(requestsCol, where('userId', '==', userId));
    const reqSnap = await getDocs(reqQuery);

    for (const d of reqSnap.docs) {
      const data = d.data() as Record<string, any>;
      const updates: Record<string, any> = {};
      if (data.isPrivate === undefined) {
        // If it had shared emails, keep shared; otherwise private
        updates.isPrivate = !(data.sharedWithEmails && data.sharedWithEmails.length > 0);
      }
      if (!data.authorEmail && userEmail) {
        updates.authorEmail = userEmail.toLowerCase().trim();
      }
      if (Object.keys(updates).length > 0) {
        await updateDoc(d.ref, updates);
      }
    }
  } catch (err) {
    console.warn('migrateLegacyPrayerData notice:', err);
  }
}
