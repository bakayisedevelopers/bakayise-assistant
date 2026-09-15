/**
 * Free & Open-Source Bible & Scripture Service for Prayer Journal
 * Powered by the open-source Bible API (https://bible-api.com)
 *
 * Provides:
 * - Complete metadata for all 66 Bible books (Old & New Testaments)
 * - Real-time open-source API lookup for ANY book, chapter, verse, or passage
 * - Chapter verse listing for interactive verse-by-verse selection
 * - Multiple public domain translations (WEB, KJV, BBE, etc.)
 */

export interface BibleBook {
  name: string;
  testament: 'OT' | 'NT';
  chapters: number;
  abbr: string;
}

export const BIBLE_BOOKS: BibleBook[] = [
  // Old Testament
  { name: 'Genesis', testament: 'OT', chapters: 50, abbr: 'Gen' },
  { name: 'Exodus', testament: 'OT', chapters: 40, abbr: 'Ex' },
  { name: 'Leviticus', testament: 'OT', chapters: 27, abbr: 'Lev' },
  { name: 'Numbers', testament: 'OT', chapters: 36, abbr: 'Num' },
  { name: 'Deuteronomy', testament: 'OT', chapters: 34, abbr: 'Deut' },
  { name: 'Joshua', testament: 'OT', chapters: 24, abbr: 'Josh' },
  { name: 'Judges', testament: 'OT', chapters: 21, abbr: 'Judg' },
  { name: 'Ruth', testament: 'OT', chapters: 4, abbr: 'Ruth' },
  { name: '1 Samuel', testament: 'OT', chapters: 31, abbr: '1Sam' },
  { name: '2 Samuel', testament: 'OT', chapters: 24, abbr: '2Sam' },
  { name: '1 Kings', testament: 'OT', chapters: 22, abbr: '1Kgs' },
  { name: '2 Kings', testament: 'OT', chapters: 25, abbr: '2Kgs' },
  { name: '1 Chronicles', testament: 'OT', chapters: 29, abbr: '1Chr' },
  { name: '2 Chronicles', testament: 'OT', chapters: 36, abbr: '2Chr' },
  { name: 'Ezra', testament: 'OT', chapters: 10, abbr: 'Ezra' },
  { name: 'Nehemiah', testament: 'OT', chapters: 13, abbr: 'Neh' },
  { name: 'Esther', testament: 'OT', chapters: 10, abbr: 'Esth' },
  { name: 'Job', testament: 'OT', chapters: 42, abbr: 'Job' },
  { name: 'Psalms', testament: 'OT', chapters: 150, abbr: 'Ps' },
  { name: 'Proverbs', testament: 'OT', chapters: 31, abbr: 'Prov' },
  { name: 'Ecclesiastes', testament: 'OT', chapters: 12, abbr: 'Eccl' },
  { name: 'Song of Solomon', testament: 'OT', chapters: 8, abbr: 'Song' },
  { name: 'Isaiah', testament: 'OT', chapters: 66, abbr: 'Isa' },
  { name: 'Jeremiah', testament: 'OT', chapters: 52, abbr: 'Jer' },
  { name: 'Lamentations', testament: 'OT', chapters: 5, abbr: 'Lam' },
  { name: 'Ezekiel', testament: 'OT', chapters: 48, abbr: 'Ezek' },
  { name: 'Daniel', testament: 'OT', chapters: 12, abbr: 'Dan' },
  { name: 'Hosea', testament: 'OT', chapters: 14, abbr: 'Hos' },
  { name: 'Joel', testament: 'OT', chapters: 3, abbr: 'Joel' },
  { name: 'Amos', testament: 'OT', chapters: 9, abbr: 'Amos' },
  { name: 'Obadiah', testament: 'OT', chapters: 1, abbr: 'Obad' },
  { name: 'Jonah', testament: 'OT', chapters: 4, abbr: 'Jonah' },
  { name: 'Micah', testament: 'OT', chapters: 7, abbr: 'Mic' },
  { name: 'Nahum', testament: 'OT', chapters: 3, abbr: 'Nah' },
  { name: 'Habakkuk', testament: 'OT', chapters: 3, abbr: 'Hab' },
  { name: 'Zephaniah', testament: 'OT', chapters: 3, abbr: 'Zeph' },
  { name: 'Haggai', testament: 'OT', chapters: 2, abbr: 'Hag' },
  { name: 'Zechariah', testament: 'OT', chapters: 14, abbr: 'Zech' },
  { name: 'Malachi', testament: 'OT', chapters: 4, abbr: 'Mal' },

  // New Testament
  { name: 'Matthew', testament: 'NT', chapters: 28, abbr: 'Matt' },
  { name: 'Mark', testament: 'NT', chapters: 16, abbr: 'Mark' },
  { name: 'Luke', testament: 'NT', chapters: 24, abbr: 'Luke' },
  { name: 'John', testament: 'NT', chapters: 21, abbr: 'John' },
  { name: 'Acts', testament: 'NT', chapters: 28, abbr: 'Acts' },
  { name: 'Romans', testament: 'NT', chapters: 16, abbr: 'Rom' },
  { name: '1 Corinthians', testament: 'NT', chapters: 16, abbr: '1Cor' },
  { name: '2 Corinthians', testament: 'NT', chapters: 13, abbr: '2Cor' },
  { name: 'Galatians', testament: 'NT', chapters: 6, abbr: 'Gal' },
  { name: 'Ephesians', testament: 'NT', chapters: 6, abbr: 'Eph' },
  { name: 'Philippians', testament: 'NT', chapters: 4, abbr: 'Phil' },
  { name: 'Colossians', testament: 'NT', chapters: 4, abbr: 'Col' },
  { name: '1 Thessalonians', testament: 'NT', chapters: 5, abbr: '1Thess' },
  { name: '2 Thessalonians', testament: 'NT', chapters: 3, abbr: '2Thess' },
  { name: '1 Timothy', testament: 'NT', chapters: 6, abbr: '1Tim' },
  { name: '2 Timothy', testament: 'NT', chapters: 4, abbr: '2Tim' },
  { name: 'Titus', testament: 'NT', chapters: 3, abbr: 'Titus' },
  { name: 'Philemon', testament: 'NT', chapters: 1, abbr: 'Phlm' },
  { name: 'Hebrews', testament: 'NT', chapters: 13, abbr: 'Heb' },
  { name: 'James', testament: 'NT', chapters: 5, abbr: 'Jas' },
  { name: '1 Peter', testament: 'NT', chapters: 5, abbr: '1Pet' },
  { name: '2 Peter', testament: 'NT', chapters: 3, abbr: '2Pet' },
  { name: '1 John', testament: 'NT', chapters: 5, abbr: '1John' },
  { name: '2 John', testament: 'NT', chapters: 1, abbr: '2John' },
  { name: '3 John', testament: 'NT', chapters: 1, abbr: '3John' },
  { name: 'Jude', testament: 'NT', chapters: 1, abbr: 'Jude' },
  { name: 'Revelation', testament: 'NT', chapters: 22, abbr: 'Rev' },
];

export interface BibleTranslation {
  id: string;
  name: string;
  description: string;
}

export const SUPPORTED_TRANSLATIONS: BibleTranslation[] = [
  { id: 'web', name: 'World English Bible (WEB)', description: 'Modern, clear English (Public Domain)' },
  { id: 'kjv', name: 'King James Version (KJV)', description: 'Classic 1611 majestic text (Public Domain)' },
  { id: 'bbe', name: 'Bible in Basic English (BBE)', description: 'Simple, direct vocabulary (Public Domain)' },
  { id: 'oeb-us', name: 'Open English Bible (OEB)', description: 'Contemporary open-source English' },
];

export interface BibleVerseItem {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface FetchedScripture {
  reference: string;
  text: string;
  translation: string;
  translationId?: string;
  verses?: BibleVerseItem[];
  versesCount?: number;
}

/**
 * Searches and fetches any passage, chapter, or verse across the entire Bible
 * using the public open-source API: https://bible-api.com
 */
export async function fetchScriptureByReference(
  reference: string,
  translation: string = 'web'
): Promise<FetchedScripture> {
  const cleanRef = reference.trim();
  if (!cleanRef) {
    throw new Error('Please specify a Bible book, chapter, or verse reference (e.g. John 3:16, Romans 8:28, Psalm 23).');
  }

  const encodedRef = encodeURIComponent(cleanRef);
  const url = `https://bible-api.com/${encodedRef}?translation=${encodeURIComponent(translation)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Reference "${cleanRef}" not found. Please check book name and chapter/verse numbers.`);
      }
      throw new Error(`Bible API returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data.text) {
      throw new Error(`No scripture text found for "${cleanRef}".`);
    }

    const cleanVerses: BibleVerseItem[] = Array.isArray(data.verses)
      ? data.verses.map((v: any) => ({
          book_id: v.book_id || '',
          book_name: v.book_name || '',
          chapter: Number(v.chapter) || 1,
          verse: Number(v.verse) || 1,
          text: (v.text || '').trim().replace(/\s+/g, ' '),
        }))
      : [];

    return {
      reference: data.reference || cleanRef,
      text: data.text.trim().replace(/\s+/g, ' '),
      translation: data.translation_name || translation.toUpperCase(),
      translationId: data.translation_id || translation,
      verses: cleanVerses,
      versesCount: cleanVerses.length || 1,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('The Bible API took too long to respond. Please check your internet connection or retry.');
    }
    throw err;
  }
}

/**
 * Fetches all verses for an entire chapter so the user can interactively browse
 * and select specific verses.
 */
export async function fetchChapterVerses(
  book: string,
  chapter: number,
  translation: string = 'web'
): Promise<BibleVerseItem[]> {
  const ref = `${book} ${chapter}`;
  const result = await fetchScriptureByReference(ref, translation);
  return result.verses || [];
}
