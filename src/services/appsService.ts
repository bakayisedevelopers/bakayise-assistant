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

export const DEFAULT_BUDGET_APP_METADATA: AssistantApp = {
  id: 'budget',
  appName: 'Bakayise Budget',
  name: 'Bakayise Budget',
  appDescription: 'Family budgeting, income streams, expense tracking, accounts management, and Dave Ramsey 7 baby steps snowball.',
  description: 'Family budgeting, income streams, expense tracking, accounts management, and Dave Ramsey 7 baby steps snowball.',
  migrationStatus: 'completed',
  sourceProject: 'Bagayise-budget',
  status: 'active',
  icon: 'calculator',
  category: 'Finance',
  route: '/budget',
};

// Planned companion apps for the Bakayise Family ecosystem
export const PLANNED_COMPANION_APPS: AssistantApp[] = [
  {
    id: 'notes',
    appName: 'Family Notes & Study',
    name: 'Family Notes & Study',
    appDescription: 'Centralized family notes, Bible reading reflections, ideas, and shared journals.',
    description: 'Centralized family notes, Bible reading reflections, ideas, and shared journals.',
    status: 'coming_soon',
    icon: 'notebook',
    category: 'Knowledge',
    route: '/notes',
  },
  {
    id: 'prayer',
    appName: 'Prayer & Gratitude',
    name: 'Prayer & Gratitude',
    appDescription: 'Household prayer requests, petitions, thanksgiving records, and answered prayers.',
    description: 'Household prayer requests, petitions, thanksgiving records, and answered prayers.',
    status: 'coming_soon',
    icon: 'heart-handshake',
    category: 'Spiritual',
    route: '/prayer',
  },
  {
    id: 'meals',
    appName: 'Meal Planner & Pantry',
    name: 'Meal Planner & Pantry',
    appDescription: 'Weekly healthy meal schedules, grocery budgeting, and family recipes.',
    description: 'Weekly healthy meal schedules, grocery budgeting, and family recipes.',
    status: 'coming_soon',
    icon: 'utensils',
    category: 'Lifestyle',
    route: '/meals',
  },
  {
    id: 'calendar',
    appName: 'Smart Family Calendar',
    name: 'Smart Family Calendar',
    appDescription: 'AI-assisted family schedule, paydays, bill reminders, and joint events.',
    description: 'AI-assisted family schedule, paydays, bill reminders, and joint events.',
    status: 'coming_soon',
    icon: 'calendar',
    category: 'Productivity',
    route: '/calendar',
  },
];

/**
 * Subscribes to the root `/apps` collection in Firestore.
 * Always ensures the budget app metadata is represented.
 */
export function subscribeToAssistantApps(
  callback: (apps: AssistantApp[]) => void
): () => void {
  const appsCol = collection(db, 'apps');

  return onSnapshot(
    appsCol,
    (snapshot) => {
      const loadedMap = new Map<string, AssistantApp>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Partial<AssistantApp>;
        const id = docSnap.id;
        loadedMap.set(id, {
          id,
          appName: data.appName || data.name || (id === 'budget' ? 'Bakayise Budget' : id),
          name: data.name || data.appName || (id === 'budget' ? 'Bakayise Budget' : id),
          appDescription: data.appDescription || data.description || '',
          description: data.description || data.appDescription || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          migrationStatus: data.migrationStatus,
          sourceProject: data.sourceProject,
          icon: data.icon || (id === 'budget' ? 'calculator' : 'layers'),
          category: data.category || (id === 'budget' ? 'Finance' : 'General'),
          status: (data.status as any) || (id === 'budget' ? 'active' : 'coming_soon'),
          route: data.route || `/${id}`,
        });
      });

      // Always guarantee 'budget' is present
      if (!loadedMap.has('budget')) {
        loadedMap.set('budget', DEFAULT_BUDGET_APP_METADATA);
      }

      // Merge planned companion apps if not already created in Firestore
      for (const planned of PLANNED_COMPANION_APPS) {
        if (!loadedMap.has(planned.id)) {
          loadedMap.set(planned.id, planned);
        }
      }

      const allApps = Array.from(loadedMap.values());
      // Keep budget first, then active apps, then others
      allApps.sort((a, b) => {
        if (a.id === 'budget') return -1;
        if (b.id === 'budget') return 1;
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        return (a.appName || a.id).localeCompare(b.appName || b.id);
      });

      callback(allApps);
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
      // Fallback with default apps
      callback([DEFAULT_BUDGET_APP_METADATA, ...PLANNED_COMPANION_APPS]);
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
