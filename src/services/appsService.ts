import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase/config';
import { AssistantApp, GlobalUser, UserRole } from '../types';
import { AllowedFamilyMember } from '../utils/authConstants';

export function cleanAppName(raw?: string, id?: string): string {
  if (!raw && !id) return 'App';
  let name = (raw || id || '').trim();
  name = name.replace(/^Bakayise\s+/i, '').trim();
  if (!name) return id ? id.charAt(0).toUpperCase() + id.slice(1) : 'App';
  return name;
}

export const DEFAULT_BUDGET_APP_METADATA: AssistantApp = {
  id: 'budget',
  appName: 'Budget',
  name: 'Budget',
  appDescription: 'Family budgeting, income streams, expense tracking, accounts management, and Dave Ramsey 7 baby steps snowball.',
  description: 'Family budgeting, income streams, expense tracking, accounts management, and Dave Ramsey 7 baby steps snowball.',
  migrationStatus: 'completed',
  sourceProject: 'Bagayise-budget',
  status: 'active',
  icon: 'calculator',
  category: 'Finance',
  route: '/budget',
  dataPath: 'apps/budget',
};

export const DEFAULT_NOTES_APP_METADATA: AssistantApp = {
  id: 'notes',
  appName: 'Notes',
  name: 'Notes',
  appDescription: 'AI-powered sermon transcription, book reading summaries, Bible study notes & audio transcription using kilo-auto/free.',
  description: 'AI-powered sermon transcription, book reading summaries, Bible study notes & audio transcription using kilo-auto/free.',
  status: 'active',
  icon: 'book-open',
  category: 'Knowledge',
  route: '/notes',
  dataPath: 'apps/notes',
  aiModel: 'kilo-auto/free',
};

export const DEFAULT_MEAL_PLANNER_APP_METADATA: AssistantApp = {
  id: 'meal_planner',
  appName: 'Meal Planner',
  name: 'Meal Planner',
  appDescription: 'AI-powered family meal planning, weekly schedules, tailored recipes based on family dietary profile, pantry items & budget.',
  description: 'AI-powered family meal planning, weekly schedules, tailored recipes based on family dietary profile, pantry items & budget.',
  status: 'active',
  icon: 'utensils',
  category: 'Lifestyle',
  route: '/meal_planner',
  dataPath: 'apps/meal_planner',
  aiModel: 'gemini-3.1-flash-lite',
  features: [
    'AI Meal Generator tailored to family dietary goals, budget & pantry items',
    '7-Day Weekly Meal Planning Calendar',
    'Pantry & Fridge Inventory Tracker',
    'Consolidated Interactive Grocery Shopping List',
    'Step-by-Step Recipes with Nutritional Information (Calories, Protein, Carbs, Fats)',
  ],
};

export const DEFAULT_PRAYER_JOURNAL_APP_METADATA: AssistantApp = {
  id: 'prayer_journal',
  appName: 'Prayer Journal',
  name: 'Prayer Journal',
  appDescription: 'Personal & family prayer journal: track prayer requests, people, scriptures, prayer dates, and what the Lord is prompting you to do.',
  description: 'Personal & family prayer journal: track prayer requests, people, scriptures, prayer dates, and what the Lord is prompting you to do.',
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

/**
 * Ensures core registered applications (Budget, Notes, Meal Planner, Prayer Journal) exist in the /apps collection in Firestore,
 * and strips any legacy "Bakayise " prefix from their stored names.
 */
export async function ensureFirestoreAppsExist(): Promise<void> {
  try {
    // 1. Ensure /apps/budget exists and has clean name
    const budgetDocRef = doc(db, 'apps', 'budget');
    const budgetSnap = await getDoc(budgetDocRef);
    if (!budgetSnap.exists()) {
      await setDoc(budgetDocRef, {
        ...DEFAULT_BUDGET_APP_METADATA,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      const data = budgetSnap.data();
      if (data?.appName?.startsWith('Bakayise') || data?.name?.startsWith('Bakayise')) {
        await setDoc(budgetDocRef, {
          ...data,
          appName: 'Budget',
          name: 'Budget',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    }

    // 2. Ensure /apps/notes exists and has clean name
    const notesDocRef = doc(db, 'apps', 'notes');
    const notesSnap = await getDoc(notesDocRef);
    if (!notesSnap.exists()) {
      await setDoc(notesDocRef, {
        ...DEFAULT_NOTES_APP_METADATA,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      const data = notesSnap.data();
      if (data?.appName?.startsWith('Bakayise') || data?.name?.startsWith('Bakayise')) {
        await setDoc(notesDocRef, {
          ...data,
          appName: 'Notes',
          name: 'Notes',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    }

    // 3. Ensure /apps/meal_planner exists and has clean name
    const mealDocRef = doc(db, 'apps', 'meal_planner');
    const mealSnap = await getDoc(mealDocRef);
    if (!mealSnap.exists()) {
      await setDoc(mealDocRef, {
        ...DEFAULT_MEAL_PLANNER_APP_METADATA,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      const data = mealSnap.data();
      if (data?.appName?.startsWith('Bakayise') || data?.name?.startsWith('Bakayise')) {
        await setDoc(mealDocRef, {
          ...data,
          appName: 'Meal Planner',
          name: 'Meal Planner',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    }

    // 4. Ensure /apps/prayer_journal exists
    const prayerDocRef = doc(db, 'apps', 'prayer_journal');
    const prayerSnap = await getDoc(prayerDocRef);
    if (!prayerSnap.exists()) {
      await setDoc(prayerDocRef, {
        ...DEFAULT_PRAYER_JOURNAL_APP_METADATA,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      const data = prayerSnap.data();
      if (data?.appName?.startsWith('Bakayise') || data?.name?.startsWith('Bakayise') || !data?.appName) {
        await setDoc(prayerDocRef, {
          ...data,
          appName: 'Prayer Journal',
          name: 'Prayer Journal',
          status: 'active',
          dataPath: 'apps/prayer_journal',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    }
  } catch (err) {
    console.warn('Notice ensuring firestore apps exist:', err);
  }
}

/**
 * Subscribes ONLY to the root `/apps` collection in Firestore.
 * Only returns applications that actually exist as documents in Firestore's /apps collection.
 */
export function subscribeToAssistantApps(
  callback: (apps: AssistantApp[]) => void
): () => void {
  // Ensure default core apps exist in Firestore
  ensureFirestoreAppsExist();

  const appsCol = collection(db, 'apps');

  return onSnapshot(
    appsCol,
    (snapshot) => {
      const loadedApps: AssistantApp[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Partial<AssistantApp>;
        const id = docSnap.id;
        const cleanedName = cleanAppName(data.appName || data.name, id);

        loadedApps.push({
          id,
          appName: cleanedName,
          name: cleanedName,
          appDescription: data.appDescription || data.description || '',
          description: data.description || data.appDescription || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          migrationStatus: data.migrationStatus,
          sourceProject: data.sourceProject,
          icon: data.icon || (id === 'budget' ? 'calculator' : id === 'notes' ? 'book-open' : id === 'meal_planner' ? 'utensils' : id === 'prayer_journal' ? 'heart-handshake' : 'layers'),
          category: data.category || (id === 'budget' ? 'Finance' : id === 'notes' ? 'Knowledge' : id === 'meal_planner' ? 'Lifestyle' : id === 'prayer_journal' ? 'Spiritual' : 'General'),
          status: (data.status as any) || 'active',
          route: data.route || `/${id}`,
          dataPath: data.dataPath || `apps/${id}`,
          aiModel: data.aiModel,
        });
      });

      // Sort alphabetically by app name
      loadedApps.sort((a, b) => (a.appName || a.id).localeCompare(b.appName || b.id));

      callback(loadedApps);
    },
    (error) => {
      const isPermissionDenied =
        (error as any)?.code === 'permission-denied' ||
        (typeof (error as any)?.message === 'string' &&
          ((error as any).message.toLowerCase().includes('insufficient permissions') ||
           (error as any).message.toLowerCase().includes('permission-denied')));
      if (!isPermissionDenied) {
        console.warn('Notice listening to /apps collection:', error);
      }
      callback([]);
    }
  );
}

/**
 * Synchronizes the global user profile in the root `/users/{uid}` collection.
 * This is the unified user record across all applications.
 */
export async function syncGlobalUser(
  user: { uid: string; email?: string | null; displayName?: string | null },
  member: AllowedFamilyMember
): Promise<void> {
  if (!user.uid || !user.email) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    const existing = snap.exists() ? snap.data() : {};

    const globalUser: Partial<GlobalUser> = {
      uid: user.uid,
      email: user.email.toLowerCase().trim(),
      displayName: user.displayName || member.displayName || member.role,
      role: member.role,
      avatarColor: member.avatarColor,
      accessibleApps: existing.accessibleApps || ['budget', 'notes', 'prayer', 'meals', 'calendar'],
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!snap.exists()) {
      globalUser.createdAt = new Date().toISOString();
    }

    await setDoc(userRef, globalUser, { merge: true });
  } catch (err: any) {
    const isPermissionDenied =
      err?.code === 'permission-denied' ||
      (typeof err?.message === 'string' &&
        (err.message.toLowerCase().includes('insufficient permissions') ||
         err.message.toLowerCase().includes('permission-denied')));
    if (!isPermissionDenied) {
      console.warn('Notice syncing global user to /users:', err);
    }
  }
}
