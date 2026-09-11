import React, { useState, useEffect, useMemo } from 'react';
import { NoteItem, NoteType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  Church,
  Cross,
  Layers,
  Search,
  Plus,
  Camera,
  Mic,
  Calendar,
  Sparkles,
  ArrowLeft,
  Play,
  Pause,
  LayoutGrid,
  List,
  X,
  ArrowUpRight,
  BookMarked,
  FolderPlus,
  ChevronRight,
  Tag,
} from 'lucide-react';
import {
  subscribeToNotes,
  saveNote,
  deleteNote,
  ensureNotesAppDocument,
  seedStarterNotesIfEmpty,
} from '../../services/notesFirestoreService';
import { NoteModal } from './NoteModal';
import { NoteDetailModal } from './NoteDetailModal';
import { WeeklyReviewModal } from './WeeklyReviewModal';
import { speakNotes, stopSpeech } from '../../services/kiloAIService';

interface NotesAppProps {
  onBackToAssistantHub: () => void;
}

export const NotesApp: React.FC<NotesAppProps> = ({ onBackToAssistantHub }) => {
  const { user, member, activeWorkspaceId } = useAuth();

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // 4 high-level note types + 'all'
  const [selectedFilter, setSelectedFilter] = useState<NoteType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Sub-hierarchy filters
  const [selectedBookFilter, setSelectedBookFilter] = useState<string | 'all'>('all');
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState<string | 'all'>('all');
  const [selectedBibleBookFilter, setSelectedBibleBookFilter] = useState<string | 'all'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | 'all'>('all');

  // Prefill state for opening new note modal
  const [prefillType, setPrefillType] = useState<NoteType>('book');
  const [prefillBook, setPrefillBook] = useState<string>('');
  const [prefillSeries, setPrefillSeries] = useState<string>('');
  const [prefillBibleBook, setPrefillBibleBook] = useState<string>('');
  const [prefillCategory, setPrefillCategory] = useState<string>('');

  // Modals
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false);

  // Quick Card TTS playback state
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);

  const workspaceId = activeWorkspaceId || 'household_bakayise_main';
  const authorId = user?.uid || 'user_bakayise';
  const authorName = member?.displayName || user?.displayName || 'Family Member';

  // Ensure root app doc /apps/notes and subscribe to /apps/notes/notes
  useEffect(() => {
    ensureNotesAppDocument();
    seedStarterNotesIfEmpty(workspaceId, authorId, authorName);

    const unsubscribe = subscribeToNotes(
      workspaceId,
      (fetchedNotes) => {
        setNotes(fetchedNotes);
        setLoading(false);
      },
      (error) => {
        console.warn('Notes subscription notice:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      stopSpeech();
    };
  }, [workspaceId]);

  // Derived sub-lists for books, series, bible books, and categories
  const booksList = useMemo(() => {
    const map = new Map<string, { count: number; author?: string }>();
    notes
      .filter((n) => n.type === 'book')
      .forEach((n) => {
        const title = n.bookTitle || n.sourceTitle || 'Untitled Book';
        const existing = map.get(title) || { count: 0, author: n.speakerOrAuthor };
        map.set(title, { count: existing.count + 1, author: n.speakerOrAuthor || existing.author });
      });
    return Array.from(map.entries()).map(([bookTitle, meta]) => ({
      bookTitle,
      ...meta,
    }));
  }, [notes]);

  const seriesList = useMemo(() => {
    const map = new Map<string, number>();
    notes
      .filter((n) => n.type === 'sermon')
      .forEach((n) => {
        const series = n.seriesName || (n.sourceTitle && !n.sourceTitle.toLowerCase().includes('sunday') ? n.sourceTitle : 'Standalone');
        map.set(series, (map.get(series) || 0) + 1);
      });
    return Array.from(map.entries()).map(([seriesName, count]) => ({
      seriesName,
      count,
    }));
  }, [notes]);

  // Dynamic Bible Books being studied (NOT hardcoded!)
  const bibleBooksList = useMemo(() => {
    const map = new Map<string, number>();
    notes
      .filter((n) => n.type === 'bible_study')
      .forEach((n) => {
        const book = n.bibleBook || n.sourceTitle || 'Romans';
        map.set(book, (map.get(book) || 0) + 1);
      });
    return Array.from(map.entries()).map(([bibleBook, count]) => ({
      bibleBook,
      count,
    }));
  }, [notes]);

  // Dynamic Life Categories (Vision for Family, etc.)
  const categoriesList = useMemo(() => {
    const map = new Map<string, number>();
    notes
      .filter((n) => n.type === 'normal' || n.type === 'general')
      .forEach((n) => {
        const cat = n.categoryName || (n.tags && n.tags[0] !== 'general' && n.tags[0] !== 'normal' ? n.tags[0] : 'Vision for Family');
        map.set(cat, (map.get(cat) || 0) + 1);
      });
    return Array.from(map.entries()).map(([categoryName, count]) => ({
      categoryName,
      count,
    }));
  }, [notes]);

  // Filter and search
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // High-level type filter
      if (selectedFilter !== 'all') {
        if (selectedFilter === 'normal') {
          if (n.type !== 'normal' && n.type !== 'general') return false;
        } else if (n.type !== selectedFilter) {
          return false;
        }
      }

      // Sub-level filters
      if (selectedFilter === 'book' && selectedBookFilter !== 'all') {
        const title = n.bookTitle || n.sourceTitle || '';
        if (title.toLowerCase() !== selectedBookFilter.toLowerCase()) return false;
      }

      if (selectedFilter === 'sermon' && selectedSeriesFilter !== 'all') {
        const series = n.seriesName || (n.sourceTitle && !n.sourceTitle.toLowerCase().includes('sunday') ? n.sourceTitle : 'Standalone');
        if (series.toLowerCase() !== selectedSeriesFilter.toLowerCase()) return false;
      }

      if (selectedFilter === 'bible_study' && selectedBibleBookFilter !== 'all') {
        const book = n.bibleBook || n.sourceTitle || '';
        if (book.toLowerCase() !== selectedBibleBookFilter.toLowerCase()) return false;
      }

      if (selectedFilter === 'normal' && selectedCategoryFilter !== 'all') {
        const cat = n.categoryName || (n.tags && n.tags[0] !== 'general' ? n.tags[0] : 'Vision for Family');
        if (cat.toLowerCase() !== selectedCategoryFilter.toLowerCase()) return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        (n.bookTitle && n.bookTitle.toLowerCase().includes(q)) ||
        (n.chapter && n.chapter.toLowerCase().includes(q)) ||
        (n.seriesName && n.seriesName.toLowerCase().includes(q)) ||
        (n.sermonTitle && n.sermonTitle.toLowerCase().includes(q)) ||
        (n.bibleBook && n.bibleBook.toLowerCase().includes(q)) ||
        (n.bibleChapter && n.bibleChapter.toLowerCase().includes(q)) ||
        (n.categoryName && n.categoryName.toLowerCase().includes(q)) ||
        (n.sourceTitle && n.sourceTitle.toLowerCase().includes(q)) ||
        (n.speakerOrAuthor && n.speakerOrAuthor.toLowerCase().includes(q)) ||
        (n.biblePassage && n.biblePassage.toLowerCase().includes(q)) ||
        (n.summary && n.summary.toLowerCase().includes(q)) ||
        (n.rawContent && n.rawContent.toLowerCase().includes(q)) ||
        (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
      );
    });
  }, [
    notes,
    selectedFilter,
    selectedBookFilter,
    selectedSeriesFilter,
    selectedBibleBookFilter,
    selectedCategoryFilter,
    searchQuery,
  ]);

  // Stats calculation
  const stats = useMemo(() => {
    const sermons = notes.filter((n) => n.type === 'sermon').length;
    const books = notes.filter((n) => n.type === 'book').length;
    const bibles = notes.filter((n) => n.type === 'bible_study').length;
    const normal = notes.filter((n) => n.type === 'normal' || n.type === 'general').length;
    const activeBooks = notes.filter(
      (n) => n.type === 'book' && n.readingProgress && !n.readingProgress.completed
    );
    return {
      total: notes.length,
      sermons,
      books,
      bibles,
      normal,
      activeBook: activeBooks.length > 0 ? activeBooks[0] : null,
    };
  }, [notes]);

  // Card Audio Quick Player
  const handleQuickPlay = (note: NoteItem, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingNoteId === note.id) {
      stopSpeech();
      setPlayingNoteId(null);
      return;
    }

    stopSpeech();
    const script = `${note.title}. ${note.summary || note.rawContent || ''}`;
    const started = speakNotes(
      script,
      1.0,
      () => setPlayingNoteId(note.id),
      () => setPlayingNoteId(null),
      () => setPlayingNoteId(null)
    );

    if (!started) {
      alert('Text-to-speech audio is not supported in this browser.');
    }
  };

  const handleSaveNote = async (saved: NoteItem) => {
    await saveNote(saved);
    setIsNoteModalOpen(false);
    setEditingNote(null);
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId);
  };

  const openNewNoteCanvas = (
    type?: NoteType,
    meta?: { book?: string; series?: string; bibleBook?: string; category?: string }
  ) => {
    setEditingNote(null);
    setPrefillType(type || (selectedFilter === 'all' ? 'book' : selectedFilter));
    setPrefillBook(meta?.book || (selectedBookFilter !== 'all' ? selectedBookFilter : ''));
    setPrefillSeries(meta?.series || (selectedSeriesFilter !== 'all' ? selectedSeriesFilter : ''));
    setPrefillBibleBook(meta?.bibleBook || (selectedBibleBookFilter !== 'all' ? selectedBibleBookFilter : ''));
    setPrefillCategory(meta?.category || (selectedCategoryFilter !== 'all' ? selectedCategoryFilter : ''));
    setIsNoteModalOpen(true);
  };

  const openExistingNote = (note: NoteItem) => {
    setSelectedNote(note);
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col selection:bg-emerald-500/30 font-sans pb-24 sm:pb-12">
      
      {/* AMBIENT BACKGROUND GLOW */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[340px] bg-gradient-to-b from-teal-500/10 via-emerald-500/5 to-transparent blur-3xl opacity-70 rounded-full" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-500/5 blur-3xl rounded-full" />
      </div>

      {/* TOP HEADER (MOBILE OPTIMIZED) */}
      <header className="sticky top-0 z-40 bg-[#0c0e15]/90 backdrop-blur-xl border-b border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          
          {/* Back & App Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={onBackToAssistantHub}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer border border-white/[0.08]"
              title="Return to Apps Hub"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Hub</span>
            </button>

            <div className="h-4 w-px bg-white/10 hidden xs:block" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-950/40 border border-white/15">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm sm:text-base tracking-tight text-white">
                    Notes
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                    <Sparkles className="w-2.5 h-2.5 text-teal-300" />
                    Kilo AI
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsWeeklyModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/25 text-xs font-semibold transition cursor-pointer"
              title="Weekly learning digest with AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Weekly Synthesis</span>
            </button>

            <button
              onClick={openNewNoteCanvas}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md shadow-emerald-950/50 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT (MOBILE-FIRST ORGANIZER) */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 relative z-10 space-y-4 sm:space-y-5">
        
        {/* SEARCH BAR */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, scriptures, authors, tags..."
            className="w-full pl-10 pr-9 py-2.5 bg-[#12141d]/90 border border-white/[0.08] rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* HIGH LEVEL NOTE TYPE TABS (MOBILE PRIORITY) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setSelectedFilter('all');
                setSelectedBookFilter('all');
                setSelectedSeriesFilter('all');
                setSelectedBibleBookFilter('all');
                setSelectedCategoryFilter('all');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
                selectedFilter === 'all'
                  ? 'bg-emerald-500 text-black shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white bg-white/[0.05] border border-white/[0.06]'
              }`}
            >
              <span>All</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedFilter === 'all' ? 'bg-black/20 text-black' : 'bg-white/10 text-slate-400'
                }`}
              >
                {stats.total}
              </span>
            </button>

            <button
              onClick={() => {
                setSelectedFilter('book');
                setSelectedBookFilter('all');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
                selectedFilter === 'book'
                  ? 'bg-teal-500 text-black shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white bg-white/[0.05] border border-white/[0.06]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Book Reading</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedFilter === 'book' ? 'bg-black/20 text-black' : 'bg-white/10 text-slate-400'
                }`}
              >
                {stats.books}
              </span>
            </button>

            <button
              onClick={() => {
                setSelectedFilter('sermon');
                setSelectedSeriesFilter('all');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
                selectedFilter === 'sermon'
                  ? 'bg-emerald-500 text-black shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white bg-white/[0.05] border border-white/[0.06]'
              }`}
            >
              <Church className="w-3.5 h-3.5" />
              <span>Sermons</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedFilter === 'sermon' ? 'bg-black/20 text-black' : 'bg-white/10 text-slate-400'
                }`}
              >
                {stats.sermons}
              </span>
            </button>

            <button
              onClick={() => {
                setSelectedFilter('bible_study');
                setSelectedBibleBookFilter('all');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
                selectedFilter === 'bible_study'
                  ? 'bg-cyan-500 text-black shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white bg-white/[0.05] border border-white/[0.06]'
              }`}
            >
              <Cross className="w-3.5 h-3.5" />
              <span>Bible Study</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedFilter === 'bible_study'
                    ? 'bg-black/20 text-black'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {stats.bibles}
              </span>
            </button>

            <button
              onClick={() => {
                setSelectedFilter('normal');
                setSelectedCategoryFilter('all');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
                selectedFilter === 'normal'
                  ? 'bg-indigo-500 text-white shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white bg-white/[0.05] border border-white/[0.06]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Normal Notes</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedFilter === 'normal' ? 'bg-black/20 text-white' : 'bg-white/10 text-slate-400'
                }`}
              >
                {stats.normal}
              </span>
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center bg-white/[0.04] p-0.5 rounded-xl border border-white/[0.06] shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-slate-400 transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-white/10 text-white' : 'hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-slate-400 transition cursor-pointer ${
                viewMode === 'list' ? 'bg-white/10 text-white' : 'hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* HIERARCHICAL CONTEXT SUB-SHELF */}
        {selectedFilter === 'book' && (
          <div className="p-3 rounded-2xl bg-teal-950/20 border border-teal-500/20 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
              <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                Books:
              </span>
              <button
                onClick={() => setSelectedBookFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 font-medium ${
                  selectedBookFilter === 'all'
                    ? 'bg-teal-500 text-black font-bold'
                    : 'bg-white/[0.05] text-slate-300 hover:text-white'
                }`}
              >
                All Chapters ({stats.books})
              </button>
              {booksList.map((b) => (
                <button
                  key={b.bookTitle}
                  onClick={() => setSelectedBookFilter(b.bookTitle)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 font-medium ${
                    selectedBookFilter.toLowerCase() === b.bookTitle.toLowerCase()
                      ? 'bg-teal-500 text-black font-bold'
                      : 'bg-white/[0.05] text-slate-300 hover:text-white'
                  }`}
                >
                  {b.bookTitle} ({b.count})
                </button>
              ))}
            </div>

            <button
              onClick={() =>
                openNewNoteCanvas('book', {
                  book: selectedBookFilter !== 'all' ? selectedBookFilter : '',
                })
              }
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold transition cursor-pointer shadow-sm ml-auto"
            >
              <Plus className="w-3 h-3" />
              <span>
                {selectedBookFilter !== 'all' ? `+ Chapter Note` : `+ New Book Note`}
              </span>
            </button>
          </div>
        )}

        {selectedFilter === 'sermon' && (
          <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Church className="w-3 h-3" />
                Series:
              </span>
              <button
                onClick={() => setSelectedSeriesFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 font-medium ${
                  selectedSeriesFilter === 'all'
                    ? 'bg-emerald-500 text-black font-bold'
                    : 'bg-white/[0.05] text-slate-300 hover:text-white'
                }`}
              >
                All Sermons ({stats.sermons})
              </button>
              {seriesList.map((s) => (
                <button
                  key={s.seriesName}
                  onClick={() => setSelectedSeriesFilter(s.seriesName)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 font-medium ${
                    selectedSeriesFilter.toLowerCase() === s.seriesName.toLowerCase()
                      ? 'bg-emerald-500 text-black font-bold'
                      : 'bg-white/[0.05] text-slate-300 hover:text-white'
                  }`}
                >
                  {s.seriesName} ({s.count})
                </button>
              ))}
            </div>

            <button
              onClick={() =>
                openNewNoteCanvas('sermon', {
                  series: selectedSeriesFilter !== 'all' ? selectedSeriesFilter : '',
                })
              }
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition cursor-pointer shadow-sm ml-auto"
            >
              <Plus className="w-3 h-3" />
              <span>
                {selectedSeriesFilter !== 'all' ? `+ Sermon to Series` : `+ New Sermon`}
              </span>
            </button>
          </div>
        )}

        {selectedFilter === 'bible_study' && (
          <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Cross className="w-3 h-3" />
                Books Studied:
              </span>
              <button
                onClick={() => setSelectedBibleBookFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 font-medium ${
                  selectedBibleBookFilter === 'all'
                    ? 'bg-cyan-500 text-black font-bold'
                    : 'bg-white/[0.05] text-slate-300 hover:text-white'
                }`}
              >
                All Bible Studies ({stats.bibles})
              </button>
              {bibleBooksList.map((b) => (
                <button
                  key={b.bibleBook}
                  onClick={() => setSelectedBibleBookFilter(b.bibleBook)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 font-medium ${
                    selectedBibleBookFilter.toLowerCase() === b.bibleBook.toLowerCase()
                      ? 'bg-cyan-500 text-black font-bold'
                      : 'bg-white/[0.05] text-slate-300 hover:text-white'
                  }`}
                >
                  {b.bibleBook} ({b.count})
                </button>
              ))}
            </div>

            <button
              onClick={() =>
                openNewNoteCanvas('bible_study', {
                  bibleBook: selectedBibleBookFilter !== 'all' ? selectedBibleBookFilter : '',
                })
              }
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition cursor-pointer shadow-sm ml-auto"
            >
              <Plus className="w-3 h-3" />
              <span>
                {selectedBibleBookFilter !== 'all' ? `+ Study ${selectedBibleBookFilter}` : `+ Study Bible Book`}
              </span>
            </button>
          </div>
        )}

        {selectedFilter === 'normal' && (
          <div className="p-3 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Life Category:
              </span>
              <button
                onClick={() => setSelectedCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 font-medium ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-indigo-500 text-white font-bold'
                    : 'bg-white/[0.05] text-slate-300 hover:text-white'
                }`}
              >
                All Notes ({stats.normal})
              </button>
              {categoriesList.map((c) => (
                <button
                  key={c.categoryName}
                  onClick={() => setSelectedCategoryFilter(c.categoryName)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 font-medium ${
                    selectedCategoryFilter.toLowerCase() === c.categoryName.toLowerCase()
                      ? 'bg-indigo-500 text-white font-bold'
                      : 'bg-white/[0.05] text-slate-300 hover:text-white'
                  }`}
                >
                  {c.categoryName} ({c.count})
                </button>
              ))}
            </div>

            <button
              onClick={() =>
                openNewNoteCanvas('normal', {
                  category: selectedCategoryFilter !== 'all' ? selectedCategoryFilter : 'Vision for Family',
                })
              }
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition cursor-pointer shadow-sm ml-auto"
            >
              <Plus className="w-3 h-3" />
              <span>+ New Life Note</span>
            </button>
          </div>
        )}

        {/* ACTIVE BOOK READING PROGRESS CARD (IF ANY) */}
        {stats.activeBook && stats.activeBook.readingProgress?.currentPage && stats.activeBook.readingProgress?.totalPages && (
          <div
            onClick={() => openExistingNote(stats.activeBook!)}
            className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-teal-950/40 via-[#131724] to-[#10121a] border border-teal-500/25 flex items-center justify-between gap-3 cursor-pointer hover:border-teal-500/40 transition shadow-md group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 flex items-center justify-center shrink-0">
                <BookMarked className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                    Current Reading
                  </span>
                  <span className="text-[11px] text-slate-400">· {stats.activeBook.title}</span>
                </div>
                <div className="text-xs text-slate-200 font-medium">
                  {stats.activeBook.readingProgress.chapter || 'Chapter in progress'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden xs:block">
                <span className="text-xs font-bold text-teal-300">
                  Page {stats.activeBook.readingProgress.currentPage} / {stats.activeBook.readingProgress.totalPages}
                </span>
                <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                  <div
                    className="h-full bg-teal-400 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (stats.activeBook.readingProgress.currentPage /
                            stats.activeBook.readingProgress.totalPages) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-teal-300 transition-colors shrink-0" />
            </div>
          </div>
        )}

        {/* LOADING & EMPTY STATES */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/[0.06] bg-[#12141c]/60 p-4 min-h-[140px] flex flex-col justify-between animate-pulse"
              >
                <div className="space-y-2">
                  <div className="w-20 h-4 bg-white/[0.06] rounded-md" />
                  <div className="w-3/4 h-5 bg-white/[0.08] rounded-md" />
                  <div className="w-full h-3 bg-white/[0.04] rounded-md" />
                </div>
                <div className="w-24 h-3 bg-white/[0.04] rounded-md mt-4" />
              </div>
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="py-14 sm:py-20 text-center border border-dashed border-white/[0.08] rounded-3xl bg-[#11131a]/40 p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] text-slate-400 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">No notes found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'No notes matched your search query. Try typing something else.'
                  : 'Start capturing your sermon notes, book highlights, or scriptures with a clean blank canvas.'}
              </p>
            </div>
            <button
              onClick={openNewNoteCanvas}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Note</span>
            </button>
          </div>
        ) : (
          /* MODERN NOTES CARDS (ORGANIZER) */
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4'
                : 'flex flex-col gap-2.5 sm:gap-3'
            }
          >
            {filteredNotes.map((note) => {
              const isPlaying = playingNoteId === note.id;

              return (
                <div
                  key={note.id}
                  onClick={() => openExistingNote(note)}
                  className="group relative rounded-[20px] sm:rounded-[22px] border border-white/[0.08] bg-gradient-to-b from-[#131622]/90 via-[#10121b]/90 to-[#0c0e15]/95 hover:bg-[#161a29] p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl hover:border-emerald-500/35 overflow-hidden"
                >
                  {/* AMBIENT CORNER GLOW */}
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/[0.02] rounded-full blur-xl group-hover:bg-emerald-500/[0.08] transition-all" />

                  <div className="space-y-2.5 relative z-10">
                    {/* Header Row: Category Badge + Listen Audio Button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300">
                          {note.type === 'sermon' && <Church className="w-3 h-3 text-emerald-400" />}
                          {note.type === 'book' && <BookOpen className="w-3 h-3 text-teal-400" />}
                          {note.type === 'bible_study' && <Cross className="w-3 h-3 text-cyan-400" />}
                          {note.type === 'general' && <Layers className="w-3 h-3 text-indigo-400" />}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {note.type.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Listen Pill */}
                      <button
                        onClick={(e) => handleQuickPlay(note, e)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                          isPlaying
                            ? 'bg-emerald-500 text-black animate-pulse'
                            : 'bg-white/[0.04] hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/5'
                        }`}
                        title="Listen to note audio aloud"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3 h-3 fill-black" />
                            <span>Playing</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Listen</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Title & Metadata */}
                    <div className="space-y-1.5">
                      {/* Contextual sub-header depending on type */}
                      {note.type === 'book' && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-teal-400/90 font-medium">
                          <span className="truncate max-w-[200px]">
                            📖 {note.bookTitle || note.sourceTitle || 'Book'}
                          </span>
                          {note.chapter && (
                            <>
                              <span className="text-slate-500">·</span>
                              <span className="text-teal-300 font-semibold">{note.chapter}</span>
                            </>
                          )}
                          {note.pageRange && (
                            <>
                              <span className="text-slate-500">·</span>
                              <span className="text-slate-400 text-[10px]">{note.pageRange}</span>
                            </>
                          )}
                        </div>
                      )}

                      {note.type === 'sermon' && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                          {note.seriesName ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px]">
                              Series: {note.seriesName}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Standalone</span>
                          )}
                          {note.speakerOrAuthor && (
                            <span className="text-slate-300">· {note.speakerOrAuthor}</span>
                          )}
                        </div>
                      )}

                      {note.type === 'bible_study' && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-cyan-400 font-medium">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-bold">
                            ✝ {note.bibleBook || note.sourceTitle || 'Scripture'}
                          </span>
                          {note.bibleChapter && (
                            <span className="text-amber-300 font-semibold">{note.bibleChapter}</span>
                          )}
                        </div>
                      )}

                      {(note.type === 'normal' || note.type === 'general') && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-indigo-400 font-medium">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                            {note.categoryName || (note.tags?.[0] !== 'general' && note.tags?.[0]) || 'Vision for Family'}
                          </span>
                        </div>
                      )}

                      <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
                        {note.sermonTitle || note.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                        {note.speakerOrAuthor && note.type !== 'sermon' && (
                          <span className="text-slate-300 font-medium">
                            {note.speakerOrAuthor}
                          </span>
                        )}
                        {note.biblePassage && note.type !== 'bible_study' && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px]">
                            {note.biblePassage}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Book Reading Progress Bar */}
                    {note.readingProgress?.currentPage && note.readingProgress?.totalPages && (
                      <div className="p-2 rounded-xl bg-black/30 border border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{note.readingProgress.chapter || 'Progress'}</span>
                          <span className="font-semibold text-emerald-400">
                            Page {note.readingProgress.currentPage} / {note.readingProgress.totalPages}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (note.readingProgress.currentPage /
                                    note.readingProgress.totalPages) *
                                    100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Note Preview Excerpt */}
                    {(note.summary || note.rawContent) && (
                      <p className="text-xs text-slate-300/90 line-clamp-3 leading-relaxed">
                        {note.summary || note.rawContent}
                      </p>
                    )}

                    {/* Key Takeaways snippet if present */}
                    {note.keyTakeaways && note.keyTakeaways.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {note.keyTakeaways.slice(0, 1).map((takeaway, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-1.5 text-[11px] text-slate-400 line-clamp-1"
                          >
                            <span className="text-emerald-400 font-bold shrink-0">✓</span>
                            <span>{takeaway}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Date & Model badge */}
                  <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 relative z-10">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {note.date}
                    </span>

                    <span className="font-mono text-[10px] text-teal-400/80">
                      {note.modelUsed || 'kilo-auto/free'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MOBILE FLOATING ACTION BUTTON (FAB) */}
      <div className="fixed bottom-5 right-5 z-40 sm:hidden">
        <button
          onClick={() => openNewNoteCanvas()}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black flex items-center justify-center shadow-2xl shadow-emerald-950/80 border border-white/20 active:scale-95 transition cursor-pointer"
          title="Take New Note"
          aria-label="Create note"
        >
          <Plus className="w-7 h-7 text-black stroke-[2.5]" />
        </button>
      </div>

      {/* MODALS */}
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
        initialNote={editingNote}
        workspaceId={workspaceId}
        authorId={authorId}
        authorName={authorName}
        existingNotes={notes}
        prefilledType={prefillType}
        prefilledBookTitle={prefillBook}
        prefilledSeriesName={prefillSeries}
        prefilledBibleBook={prefillBibleBook}
        prefilledCategoryName={prefillCategory}
      />

      <NoteDetailModal
        note={selectedNote}
        isOpen={Boolean(selectedNote)}
        onClose={() => setSelectedNote(null)}
        onEdit={(n) => {
          setSelectedNote(null);
          setEditingNote(n);
          setIsNoteModalOpen(true);
        }}
        onDelete={handleDeleteNote}
      />

      <WeeklyReviewModal
        isOpen={isWeeklyModalOpen}
        onClose={() => setIsWeeklyModalOpen(false)}
        notes={notes}
        workspaceId={workspaceId}
      />
    </div>
  );
};
