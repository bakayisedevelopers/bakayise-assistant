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
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { NoteItem, WeeklySummary, AssistantApp } from '../types';

export const NOTES_APP_ID = 'notes';

/**
 * Root Document: /apps/notes
 * Stores application-level metadata, configuration, and AI routing settings.
 */
export const DEFAULT_NOTES_APP_METADATA: AssistantApp = {
  id: NOTES_APP_ID,
  appName: 'Notes',
  name: 'Notes',
  appDescription:
    'AI-powered sermon transcription, book reading summaries, Bible study notes & audio transcription using kilo-auto/free.',
  description:
    'AI-powered sermon transcription, book reading summaries, Bible study notes & audio transcription using kilo-auto/free.',
  status: 'active',
  icon: 'book-open',
  category: 'Knowledge',
  route: '/notes',
  dataPath: 'apps/notes',
  aiModel: 'kilo-auto/free',
  features: [
    'Multi-Page Camera & Book OCR Transcriber',
    'Dual Audio Recording (Ambient Mic & System Audio)',
    'kilo-auto/free Open-Source AI Summarization',
    'Sermon Notes & Scripture Extractor',
    'Book Reading Chapter Progress Tracker',
    'Web Speech Text-To-Speech Playback',
    'End-of-Week Learning Synthesis Digest',
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
 * Ensures the app descriptor document exists at /apps/notes.
 */
export async function ensureNotesAppDocument(): Promise<void> {
  try {
    const appDocRef = doc(db, 'apps', NOTES_APP_ID);
    const existing = await getDoc(appDocRef);
    if (!existing.exists()) {
      await setDoc(appDocRef, {
        ...DEFAULT_NOTES_APP_METADATA,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Keep status active, update name to 'Notes' without Bakayise prefix, and ensure dataPath is marked
      await updateDoc(appDocRef, {
        appName: 'Notes',
        name: 'Notes',
        status: 'active',
        dataPath: 'apps/notes',
        aiModel: 'kilo-auto/free',
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    // Non-blocking in offline or restricted permission environments
    console.warn('ensureNotesAppDocument notice:', err?.message || err);
  }
}

/**
 * Subscribes to notes under /apps/notes/notes scoped by workspace.
 */
export function subscribeToNotes(
  workspaceId: string,
  onData: (notes: NoteItem[]) => void,
  onError?: (error: any) => void
) {
  const notesCol = collection(db, 'apps', NOTES_APP_ID, 'notes');
  const q = query(notesCol, where('workspaceId', '==', workspaceId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: NoteItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      // Sort newest first by date or createdAt
      items.sort((a, b) => {
        const dateA = a.date || a.createdAt || '';
        const dateB = b.date || b.createdAt || '';
        return dateB.localeCompare(dateA);
      });
      onData(items);
    },
    (error) => {
      const isPerm =
        error?.code === 'permission-denied' ||
        (typeof error?.message === 'string' &&
          error.message.toLowerCase().includes('insufficient permissions'));
      if (!isPerm) {
        console.warn('Firestore onSnapshot error [apps/notes/notes]:', error?.message || error);
      }
      if (onError) onError(error);
    }
  );
}

/**
 * Saves or updates a note at /apps/notes/notes/{noteId}.
 */
export async function saveNote(note: NoteItem): Promise<void> {
  const noteRef = doc(db, 'apps', NOTES_APP_ID, 'notes', note.id);
  const payload = cleanFirestoreObject({
    ...note,
    modelUsed: note.modelUsed || 'kilo-auto/free',
    updatedAt: new Date().toISOString(),
  });
  await setDoc(noteRef, payload, { merge: true });
}

/**
 * Deletes a note at /apps/notes/notes/{noteId}.
 */
export async function deleteNote(noteId: string): Promise<void> {
  const noteRef = doc(db, 'apps', NOTES_APP_ID, 'notes', noteId);
  await deleteDoc(noteRef);
}

/**
 * Subscribes to weekly summaries under /apps/notes/weekly_summaries.
 */
export function subscribeToWeeklySummaries(
  workspaceId: string,
  onData: (summaries: WeeklySummary[]) => void,
  onError?: (error: any) => void
) {
  const col = collection(db, 'apps', NOTES_APP_ID, 'weekly_summaries');
  const q = query(col, where('workspaceId', '==', workspaceId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: WeeklySummary[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      items.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

/**
 * Saves a weekly learning summary at /apps/notes/weekly_summaries/{summaryId}.
 */
export async function saveWeeklySummary(summary: WeeklySummary): Promise<void> {
  const docRef = doc(db, 'apps', NOTES_APP_ID, 'weekly_summaries', summary.id);
  await setDoc(docRef, cleanFirestoreObject(summary), { merge: true });
}

/**
 * Deletes a weekly learning summary at /apps/notes/weekly_summaries/{summaryId}.
 */
export async function deleteWeeklySummary(summaryId: string): Promise<void> {
  const docRef = doc(db, 'apps', NOTES_APP_ID, 'weekly_summaries', summaryId);
  await deleteDoc(docRef);
}

/**
 * Seed starter notes if the collection is empty, showing a Sermon note and Book reading note.
 */
export async function seedStarterNotesIfEmpty(
  workspaceId: string,
  authorId: string,
  authorName: string
): Promise<void> {
  try {
    const notesCol = collection(db, 'apps', NOTES_APP_ID, 'notes');
    const q = query(notesCol, where('workspaceId', '==', workspaceId));
    const snap = await getDocs(q);

    if (snap.empty) {
      const today = new Date().toISOString().split('T')[0];
      const starterNotes: NoteItem[] = [
        {
          id: `note_starter_sermon_${Date.now()}`,
          title: 'Unshakeable Faith in Trials',
          type: 'sermon',
          sermonTitle: 'Unshakeable Faith in Trials',
          seriesName: 'Sunday Morning Service',
          sourceTitle: 'Sunday Morning Service',
          speakerOrAuthor: 'Pastor John',
          biblePassage: 'Romans 8:28-39',
          date: today,
          rawContent:
            'Pastor preached on how all things work together for good to those who love God. In South Africa and everywhere, trials come, but nothing can separate us from the love of Christ. Three points: God is sovereign over circumstances, Christ intercedes for us, and our victory is already secured.',
          summary:
            'A powerful exposition of Romans 8:28-39 emphasizing God\'s eternal sovereignty over difficulties. Even when circumstances appear confusing, God is actively orchestrating them for spiritual growth and maturity.',
          keyTakeaways: [
            'All things work together for good according to God\'s purpose (v. 28).',
            'Christ constantly intercedes for believers at the right hand of God (v. 34).',
            'No hardship, distress, or future threat can sever our union with Christ.',
          ],
          quotesOrScriptures: [
            '"If God is for us, who can be against us?" — Romans 8:31',
            '"In all these things we are more than conquerors through Him who loved us." — Romans 8:37',
          ],
          actionPoints: [
            'Memorize Romans 8:31 this week during family prayer.',
            'Release anxiety about current challenges into God\'s capable hands.',
          ],
          tags: ['Faith', 'Romans', 'Sunday Sermon', 'Comfort'],
          inputMethod: 'manual',
          workspaceId,
          authorId,
          authorName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          modelUsed: 'kilo-auto/free',
        },
        {
          id: `note_starter_book_ch8_${Date.now() + 1}`,
          title: 'The Great Sin: Pride vs Humility',
          type: 'book',
          bookTitle: 'Mere Christianity',
          chapter: 'Chapter 8: The Great Sin',
          pageRange: '108-118',
          sourceTitle: 'Mere Christianity',
          speakerOrAuthor: 'C.S. Lewis',
          date: today,
          rawContent:
            'Read chapter 8 on Pride. Lewis describes pride as the complete anti-God state of mind. Pride is essentially competitive—it gets no pleasure out of having something, only out of having more of it than the next person. Humility is not thinking less of yourself; it is thinking of yourself less.',
          summary:
            'C.S. Lewis identifies pride as the root of all spiritual vice and discord. Pride thrives solely on rivalry and comparison. True humility liberates us by focusing our attention upward toward God and outward toward others.',
          keyTakeaways: [
            'Pride is competitive by its very nature: it seeks superiority, not just attainment.',
            'Comparison destroys contentment and poisons relationships.',
            'A truly humble person does not constantly ponder their own humility; they are genuinely interested in others.',
          ],
          quotesOrScriptures: [
            '"Pride gets no pleasure out of having something, only out of having more of it than the next man." — C.S. Lewis',
          ],
          actionPoints: [
            'Catch thoughts of comparison today and replace them with gratitude.',
            'Celebrate a colleague or family member\'s win without measuring against self.',
          ],
          tags: ['Christian Living', 'C.S. Lewis', 'Humility', 'Books'],
          inputMethod: 'manual',
          readingProgress: {
            currentPage: 118,
            totalPages: 227,
            chapter: 'Chapter 8: The Great Sin',
            completed: false,
          },
          workspaceId,
          authorId,
          authorName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          modelUsed: 'kilo-auto/free',
        },
        {
          id: `note_starter_book_ch9_${Date.now() + 2}`,
          title: 'Charity: Christian Love in Action',
          type: 'book',
          bookTitle: 'Mere Christianity',
          chapter: 'Chapter 9: Charity',
          pageRange: '119-126',
          sourceTitle: 'Mere Christianity',
          speakerOrAuthor: 'C.S. Lewis',
          date: today,
          rawContent:
            'Chapter 9 deals with Charity (agape love). Lewis explains that charity is not merely an emotion, but a state of the will. Do not waste time bothering whether you "love" your neighbor; act as if you did. As soon as we do this we find one of the great secrets.',
          summary:
            'A life-changing perspective on love as an active decision of the will rather than a passive emotion. Practicing loving acts toward others softens our hearts and kindles genuine affection.',
          keyTakeaways: [
            'Love is primarily an act of the will, not an emotional sentiment.',
            'Behaving charitably toward someone eventually births genuine compassion.',
            'Giving should pinch a little to remain truly sacrificial.',
          ],
          quotesOrScriptures: [
            '"Do not waste time bothering whether you love your neighbor; act as if you did." — C.S. Lewis',
          ],
          tags: ['Christian Living', 'Love', 'Books'],
          inputMethod: 'manual',
          readingProgress: {
            currentPage: 126,
            totalPages: 227,
            chapter: 'Chapter 9: Charity',
            completed: false,
          },
          workspaceId,
          authorId,
          authorName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          modelUsed: 'kilo-auto/free',
        },
        {
          id: `note_starter_bible_${Date.now() + 3}`,
          title: 'Life in the Spirit',
          type: 'bible_study',
          bibleBook: 'Romans',
          bibleChapter: 'Romans 8:1-17',
          sourceTitle: 'Romans Study',
          biblePassage: 'Romans 8:1-17',
          date: today,
          rawContent:
            'Inductive Bible study on Romans 8. Key verse: "There is therefore now no condemnation to those who are in Christ Jesus." Walking according to the Spirit vs the flesh. The Spirit bears witness with our spirit that we are children of God and fellow heirs with Christ.',
          summary:
            'Study of believers\' identity in Christ through the Holy Spirit. Freedom from condemnation, the transformative power of spiritual mindset, and adoption into God\'s royal family.',
          keyTakeaways: [
            'Zero condemnation exists for those united with Christ Jesus.',
            'The mind set on the Spirit brings life and deep supernatural peace.',
            'The Holy Spirit confirms our eternal status as God\'s adopted children.',
          ],
          quotesOrScriptures: [
            '"There is therefore now no condemnation for those who are in Christ Jesus." — Romans 8:1',
          ],
          actionPoints: [
            'Declare freedom from guilt and shame daily in morning devotion.',
          ],
          tags: ['Romans', 'Bible Study', 'Holy Spirit', 'Identity'],
          inputMethod: 'manual',
          workspaceId,
          authorId,
          authorName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          modelUsed: 'kilo-auto/free',
        },
        {
          id: `note_starter_family_vision_${Date.now() + 4}`,
          title: '2026 Household Vision & Core Principles',
          type: 'normal',
          categoryName: 'Vision for Family',
          date: today,
          rawContent:
            'Our family vision for 2026 and beyond: 1. Spiritual foundation: Daily prayer, scripture study, and Sunday corporate worship. 2. Financial stewardship: Living on zero-based budget, accelerating debt elimination, building 6-month emergency fund, and generous kingdom giving. 3. Family culture: Unhurried dinners, mutual honor, celebrating wins together, and raising children in warmth and wisdom.',
          summary:
            'Strategic family vision centering spiritual discipleship, financial health, and generational legacy. Anchored in mutual love, stewardship, and intentional family traditions.',
          keyTakeaways: [
            'Keep Christ at the center of all major household decisions.',
            'Complete Baby Step 2 debt snowball with joyful discipline.',
            'Protect unhurried weekly family evenings together.',
          ],
          quotesOrScriptures: [
            '"As for me and my house, we will serve the Lord." — Joshua 24:15',
          ],
          actionPoints: [
            'Review family goals at the start of each month over coffee.',
          ],
          tags: ['Family Vision', 'Household', 'Legacy', 'Goals'],
          inputMethod: 'manual',
          workspaceId,
          authorId,
          authorName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          modelUsed: 'kilo-auto/free',
        },
      ];

      for (const note of starterNotes) {
        await saveNote(note);
      }
    }
  } catch (err: any) {
    console.warn('seedStarterNotes notice:', err?.message || err);
  }
}
