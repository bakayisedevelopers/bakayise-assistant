import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  BookOpen,
  Plus,
  Check,
  Loader2,
  Bookmark,
  Globe,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { PrayerScripture } from '../../types';
import {
  BIBLE_BOOKS,
  SUPPORTED_TRANSLATIONS,
  BibleVerseItem,
  fetchScriptureByReference,
  fetchChapterVerses,
} from '../../services/bibleService';

interface ScriptureSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScripture: (scripture: PrayerScripture) => void;
  existingScriptures?: PrayerScripture[];
}

export const ScriptureSelectorModal: React.FC<ScriptureSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectScripture,
  existingScriptures = [],
}) => {
  const [tab, setTab] = useState<'browse' | 'search' | 'manual'>('browse');
  const [selectedTranslation, setSelectedTranslation] = useState<string>('web');

  // Browse state
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'OT' | 'NT'>('NT');
  const [bookSearch, setBookSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState<string>('Philippians');
  const [selectedChapter, setSelectedChapter] = useState<number>(4);
  const [chapterVerses, setChapterVerses] = useState<BibleVerseItem[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [versesError, setVersesError] = useState<string | null>(null);
  const [selectedVerseNumbers, setSelectedVerseNumbers] = useState<number[]>([6, 7]);

  // Quick search state
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<{
    reference: string;
    text: string;
    translation: string;
  } | null>(null);

  // Manual entry state
  const [manualReference, setManualReference] = useState('');
  const [manualText, setManualText] = useState('');
  const [manualTranslation, setManualTranslation] = useState('Personal Translation');

  // Book metadata
  const currentBookObj = useMemo(() => {
    return BIBLE_BOOKS.find((b) => b.name === selectedBook) || BIBLE_BOOKS[0];
  }, [selectedBook]);

  // Filtered books for list
  const filteredBooks = useMemo(() => {
    return BIBLE_BOOKS.filter((b) => {
      if (testamentFilter !== 'ALL' && b.testament !== testamentFilter) return false;
      if (!bookSearch.trim()) return true;
      const q = bookSearch.toLowerCase().trim();
      return b.name.toLowerCase().includes(q) || b.abbr.toLowerCase().includes(q);
    });
  }, [testamentFilter, bookSearch]);

  // Load verses when book or chapter or translation changes in browse tab
  useEffect(() => {
    if (!isOpen || tab !== 'browse') return;

    let isMounted = true;
    const loadVerses = async () => {
      setLoadingVerses(true);
      setVersesError(null);
      try {
        const verses = await fetchChapterVerses(selectedBook, selectedChapter, selectedTranslation);
        if (isMounted) {
          setChapterVerses(verses);
          // If previous selection isn't within this chapter, default to first verse or none
          setSelectedVerseNumbers((prev) => {
            const valid = prev.filter((v) => verses.some((item) => item.verse === v));
            return valid.length > 0 ? valid : [1];
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setVersesError(err?.message || 'Unable to load verses from open-source Bible API');
          setChapterVerses([]);
        }
      } finally {
        if (isMounted) {
          setLoadingVerses(false);
        }
      }
    };

    loadVerses();

    return () => {
      isMounted = false;
    };
  }, [isOpen, tab, selectedBook, selectedChapter, selectedTranslation]);

  if (!isOpen) return null;

  // Toggle a verse selection
  const handleToggleVerse = (verseNum: number) => {
    setSelectedVerseNumbers((prev) => {
      if (prev.includes(verseNum)) {
        // Don't deselect if it's the only one
        if (prev.length === 1) return prev;
        return prev.filter((v) => v !== verseNum);
      } else {
        return [...prev, verseNum].sort((a, b) => a - b);
      }
    });
  };

  const handleSelectAllInChapter = () => {
    if (chapterVerses.length === 0) return;
    setSelectedVerseNumbers(chapterVerses.map((v) => v.verse));
  };

  const handleClearVerseSelection = () => {
    if (chapterVerses.length > 0) {
      setSelectedVerseNumbers([chapterVerses[0].verse]);
    }
  };

  // Format reference from selected verses
  const formatSelectedReference = () => {
    if (selectedVerseNumbers.length === 0) return `${selectedBook} ${selectedChapter}`;
    const sorted = [...selectedVerseNumbers].sort((a, b) => a - b);
    if (sorted.length === 1) {
      return `${selectedBook} ${selectedChapter}:${sorted[0]}`;
    }
    // Check if consecutive
    const isConsecutive = sorted.every((v, i, arr) => i === 0 || v === arr[i - 1] + 1);
    if (isConsecutive) {
      return `${selectedBook} ${selectedChapter}:${sorted[0]}-${sorted[sorted.length - 1]}`;
    }
    return `${selectedBook} ${selectedChapter}:${sorted.join(',')}`;
  };

  const getCombinedSelectedText = () => {
    const selectedItems = chapterVerses.filter((v) => selectedVerseNumbers.includes(v.verse));
    return selectedItems.map((v) => v.text).join(' ');
  };

  // Add selected from browse tab
  const handleAddFromBrowse = () => {
    const ref = formatSelectedReference();
    const text = getCombinedSelectedText();
    const currentTranslationName =
      SUPPORTED_TRANSLATIONS.find((t) => t.id === selectedTranslation)?.name || 'WEB';

    onSelectScripture({
      id: `scrip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      reference: ref,
      text: text,
      translation: currentTranslationName,
      book: selectedBook,
      chapter: selectedChapter,
      verse: selectedVerseNumbers.join(','),
    });
    onClose();
  };

  // Handle Quick Search Lookup
  const handleQuickLookup = async () => {
    if (!quickSearchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const result = await fetchScriptureByReference(quickSearchQuery, selectedTranslation);
      setSearchResult(result);
    } catch (err: any) {
      setSearchError(err?.message || 'Could not fetch scripture reference');
    } finally {
      setSearchLoading(false);
    }
  };

  // Add from Quick Search
  const handleAddFromSearch = () => {
    if (!searchResult) return;
    onSelectScripture({
      id: `scrip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      reference: searchResult.reference,
      text: searchResult.text,
      translation: searchResult.translation,
    });
    onClose();
  };

  // Add from Manual Entry
  const handleAddManual = () => {
    if (!manualReference.trim()) return;
    onSelectScripture({
      id: `scrip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      reference: manualReference.trim(),
      text: manualText.trim() || '(Scripture reference)',
      translation: manualTranslation.trim() || 'Custom',
    });
    setManualReference('');
    setManualText('');
    onClose();
  };

  const isRefAlreadyAdded = (ref: string) => {
    return existingScriptures.some(
      (s) => s.reference.toLowerCase().replace(/\s+/g, '') === ref.toLowerCase().replace(/\s+/g, '')
    );
  };

  const activeBrowseRef = formatSelectedReference();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl bg-[#121124] border border-violet-500/25 rounded-2xl shadow-2xl shadow-violet-950/40 flex flex-col max-h-[92vh] overflow-hidden text-slate-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-violet-500/15 bg-[#15142B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  Bible Verse Selector
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-950/70 border border-violet-500/30 text-[10px] text-violet-300 font-medium">
                  <Globe className="w-2.5 h-2.5 text-violet-400" />
                  Open Source API
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-violet-300/70">
                Select any verse across all 66 books of the Bible
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Translation Dropdown */}
            <select
              value={selectedTranslation}
              onChange={(e) => setSelectedTranslation(e.target.value)}
              className="text-[11px] sm:text-xs bg-[#0C0B17] border border-violet-500/30 rounded-lg px-2 py-1 text-violet-200 focus:outline-none focus:border-violet-400 cursor-pointer"
              title="Select Bible Translation"
            >
              {SUPPORTED_TRANSLATIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-violet-900/30 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-violet-500/15 px-3 sm:px-4 bg-[#0E0D1C]">
          <button
            onClick={() => setTab('browse')}
            className={`flex items-center gap-1.5 py-2.5 sm:py-3 px-3 text-xs font-medium border-b-2 transition-colors ${
              tab === 'browse'
                ? 'border-violet-400 text-violet-200'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-violet-400" />
            <span>Browse Book & Chapter</span>
          </button>
          <button
            onClick={() => setTab('search')}
            className={`flex items-center gap-1.5 py-2.5 sm:py-3 px-3 text-xs font-medium border-b-2 transition-colors ${
              tab === 'search'
                ? 'border-violet-400 text-violet-200'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-violet-400" />
            <span>Quick Verse Search</span>
          </button>
          <button
            onClick={() => setTab('manual')}
            className={`flex items-center gap-1.5 py-2.5 sm:py-3 px-3 text-xs font-medium border-b-2 transition-colors ${
              tab === 'manual'
                ? 'border-violet-400 text-violet-200'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-violet-400" />
            <span>Custom Entry</span>
          </button>
        </div>

        {/* TAB 1: BROWSE BOOK & CHAPTER & VERSES */}
        {tab === 'browse' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 divide-y md:divide-y-0 md:divide-x divide-violet-500/15 overflow-hidden">
            {/* Left Column: Book & Chapter Navigation */}
            <div className="w-full md:w-72 flex flex-col bg-[#0F0E1E] shrink-0 max-h-60 md:max-h-none overflow-hidden">
              {/* Testament Filter & Book Search */}
              <div className="p-2.5 border-b border-violet-500/10 space-y-2 bg-[#121124]">
                <div className="grid grid-cols-3 gap-1 bg-[#090813] p-0.5 rounded-lg border border-violet-500/15">
                  <button
                    onClick={() => setTestamentFilter('ALL')}
                    className={`py-1 text-[10px] font-semibold rounded-md transition-colors ${
                      testamentFilter === 'ALL'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All (66)
                  </button>
                  <button
                    onClick={() => setTestamentFilter('OT')}
                    className={`py-1 text-[10px] font-semibold rounded-md transition-colors ${
                      testamentFilter === 'OT'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Old Test.
                  </button>
                  <button
                    onClick={() => setTestamentFilter('NT')}
                    className={`py-1 text-[10px] font-semibold rounded-md transition-colors ${
                      testamentFilter === 'NT'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    New Test.
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Find book (e.g. John, Psalms)..."
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#090813] border border-violet-500/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-400"
                  />
                </div>
              </div>

              {/* Books List */}
              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-36 md:max-h-none">
                {filteredBooks.map((b) => {
                  const isSelected = b.name === selectedBook;
                  return (
                    <button
                      key={b.name}
                      onClick={() => {
                        setSelectedBook(b.name);
                        setSelectedChapter(1);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all text-left ${
                        isSelected
                          ? 'bg-violet-600/30 border border-violet-400/50 text-white font-semibold'
                          : 'text-slate-300 hover:bg-violet-950/40 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      <span className="text-[10px] text-violet-400/70 font-mono">
                        {b.chapters} ch
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Chapter selector for selected book */}
              <div className="p-2.5 border-t border-violet-500/15 bg-[#141328]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-violet-300">
                    {selectedBook} Chapters
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Ch. {selectedChapter} of {currentBookObj.chapters}
                  </span>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto pb-1 max-h-20 flex-wrap">
                  {Array.from({ length: currentBookObj.chapters }, (_, i) => i + 1).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setSelectedChapter(ch)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                        selectedChapter === ch
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-900/50'
                          : 'bg-[#090813] text-slate-300 hover:bg-violet-950/60 hover:text-white border border-violet-500/10'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Verses of Selected Chapter (Fetched from Open Source API) */}
            <div className="flex-1 flex flex-col bg-[#121124] overflow-hidden min-h-0">
              {/* Verse action header */}
              <div className="p-3 border-b border-violet-500/10 bg-[#141328] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    {selectedBook} {selectedChapter}
                  </span>
                  <span className="text-[10px] text-violet-400 bg-violet-950/80 px-2 py-0.5 rounded-full border border-violet-500/20">
                    {chapterVerses.length} verses available
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={handleSelectAllInChapter}
                    className="text-[11px] text-violet-300 hover:text-white px-2 py-1 rounded bg-violet-950/40 hover:bg-violet-900/50 border border-violet-500/20"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleClearVerseSelection}
                    className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-violet-950/30"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Verses Scroll Area */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
                {loadingVerses ? (
                  <div className="flex flex-col items-center justify-center py-16 text-violet-300 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                    <span className="text-xs font-medium">
                      Loading verses from open-source Bible API...
                    </span>
                  </div>
                ) : versesError ? (
                  <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span>Could not load chapter verses</span>
                    </div>
                    <p className="text-rose-200/80">{versesError}</p>
                    <button
                      onClick={() => {
                        setLoadingVerses(true);
                        setVersesError(null);
                        fetchChapterVerses(selectedBook, selectedChapter, selectedTranslation)
                          .then((v) => {
                            setChapterVerses(v);
                            setLoadingVerses(false);
                          })
                          .catch((e) => {
                            setVersesError(e.message);
                            setLoadingVerses(false);
                          });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-900/40 text-rose-200 hover:bg-rose-900/60 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry Loading</span>
                    </button>
                  </div>
                ) : chapterVerses.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No verses found for {selectedBook} {selectedChapter}.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-slate-400 mb-2">
                      Tap any verse to select or toggle multiple verses:
                    </p>
                    {chapterVerses.map((verseItem) => {
                      const isSelected = selectedVerseNumbers.includes(verseItem.verse);
                      return (
                        <div
                          key={verseItem.verse}
                          onClick={() => handleToggleVerse(verseItem.verse)}
                          className={`p-2.5 rounded-xl text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                            isSelected
                              ? 'bg-violet-900/30 border border-violet-400/60 text-white shadow-sm'
                              : 'bg-[#0E0D1B] border border-violet-500/10 text-slate-300 hover:bg-[#151428] hover:border-violet-500/25'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-md shrink-0 flex items-center justify-center font-bold text-[10px] ${
                              isSelected
                                ? 'bg-violet-600 text-white shadow'
                                : 'bg-violet-950/60 text-violet-400 border border-violet-500/20'
                            }`}
                          >
                            {verseItem.verse}
                          </span>
                          <p className="leading-relaxed flex-1 font-serif text-[13px]">
                            {verseItem.text}
                          </p>
                          {isSelected && (
                            <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Selected Verse Summary & Add Button */}
              <div className="p-3 sm:p-4 border-t border-violet-500/15 bg-[#0F0E1E] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-violet-300">
                      {activeBrowseRef}
                    </span>
                    {isRefAlreadyAdded(activeBrowseRef) && (
                      <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                        Already attached
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1 italic font-serif">
                    "{getCombinedSelectedText() || 'No verse selected'}"
                  </p>
                </div>

                <button
                  onClick={handleAddFromBrowse}
                  disabled={selectedVerseNumbers.length === 0 || chapterVerses.length === 0}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-violet-950/60 transition-all shrink-0 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Attach Verse ({selectedVerseNumbers.length})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUICK VERSE SEARCH (BY ANY REFERENCE) */}
        {tab === 'search' && (
          <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 overflow-y-auto">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-violet-300">
                Type Any Bible Reference:
              </label>
              <p className="text-[11px] text-slate-400">
                You can look up any book, chapter, or verse range (e.g., "Philippians 4:6-7", "Romans 8:28", "Psalm 23", "Jeremiah 29:11", "1 Corinthians 13:4-8").
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter reference: e.g. John 3:16 or Psalm 23:1-3"
                  value={quickSearchQuery}
                  onChange={(e) => setQuickSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickLookup();
                    }
                  }}
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#0C0B17] border border-violet-500/25 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-400"
                />
              </div>

              <button
                onClick={handleQuickLookup}
                disabled={searchLoading || !quickSearchQuery.trim()}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
              >
                {searchLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>Lookup</span>
              </button>
            </div>

            {/* Error Message */}
            {searchError && (
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Could not find verse</span>
                  <span>{searchError}</span>
                </div>
              </div>
            )}

            {/* Search Result Preview Card */}
            {searchResult && (
              <div className="p-4 rounded-xl bg-[#15142B] border border-violet-500/30 space-y-3 shadow-lg">
                <div className="flex items-center justify-between gap-2 border-b border-violet-500/15 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-violet-400" />
                      <span>{searchResult.reference}</span>
                    </h3>
                    <span className="text-[11px] text-violet-300 font-mono">
                      {searchResult.translation}
                    </span>
                  </div>

                  <button
                    onClick={handleAddFromSearch}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Attach to Prayer</span>
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-violet-100 font-serif leading-relaxed italic">
                  "{searchResult.text}"
                </p>

                {searchResult.verses && searchResult.verses.length > 1 && (
                  <span className="text-[10px] text-slate-400 block">
                    Includes {searchResult.verses.length} verses
                  </span>
                )}
              </div>
            )}

            {/* Quick Inspiration suggestions without restricting the user */}
            <div className="space-y-2 pt-2 border-t border-violet-500/10">
              <span className="text-[11px] text-slate-400 font-medium">
                Example references you can try:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'John 3:16',
                  'Romans 8:28',
                  'Philippians 4:6-7',
                  'Psalm 23:1-4',
                  'Isaiah 40:31',
                  'Jeremiah 29:11',
                  'Proverbs 3:5-6',
                  'Matthew 6:33',
                  '2 Timothy 1:7',
                ].map((sample) => (
                  <button
                    key={sample}
                    onClick={() => {
                      setQuickSearchQuery(sample);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-violet-950/30 hover:bg-violet-900/40 border border-violet-500/15 text-violet-300 hover:text-white text-[11px] transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOM / MANUAL ENTRY */}
        {tab === 'manual' && (
          <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-violet-300">Custom Scripture Entry</h3>
              <p className="text-[11px] text-slate-400">
                Manually record any Bible verse or personal translation notes:
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Scripture Reference *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2 Corinthians 12:9"
                  value={manualReference}
                  onChange={(e) => setManualReference(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0C0B17] border border-violet-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Translation / Source
                </label>
                <input
                  type="text"
                  placeholder="e.g. NIV, ESV, NLT, or Personal Study"
                  value={manualTranslation}
                  onChange={(e) => setManualTranslation(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0C0B17] border border-violet-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Verse Text (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Paste or write the verse text here..."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0C0B17] border border-violet-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-400 resize-none font-serif"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleAddManual}
                  disabled={!manualReference.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach Custom Scripture</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
