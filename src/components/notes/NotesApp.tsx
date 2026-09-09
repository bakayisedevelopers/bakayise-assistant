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
  Volume2,
  Calendar,
  Sparkles,
  ArrowLeft,
  Tag,
  CheckCircle2,
  Filter,
  Play,
  Pause,
  Clock,
  Quote,
  ShieldCheck,
  RotateCcw,
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
  const { user, member, activeWorkspaceId, isAuthorized } = useAuth();

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<NoteType | 'all'>('all');

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

  // Filter and search
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesFilter = selectedFilter === 'all' || n.type === selectedFilter;
      if (!matchesFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        (n.sourceTitle && n.sourceTitle.toLowerCase().includes(q)) ||
        (n.speakerOrAuthor && n.speakerOrAuthor.toLowerCase().includes(q)) ||
        (n.biblePassage && n.biblePassage.toLowerCase().includes(q)) ||
        (n.summary && n.summary.toLowerCase().includes(q)) ||
        (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
      );
    });
  }, [notes, selectedFilter, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const sermons = notes.filter((n) => n.type === 'sermon').length;
    const books = notes.filter((n) => n.type === 'book').length;
    const bibles = notes.filter((n) => n.type === 'bible_study').length;
    const activeBooks = notes.filter((n) => n.type === 'book' && n.readingProgress && !n.readingProgress.completed);
    return {
      total: notes.length,
      sermons,
      books,
      bibles,
      activeBooksCount: activeBooks.length,
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

  return (
    <div className="min-h-screen bg-[#0d0e12] text-slate-100 flex flex-col selection:bg-emerald-500/30">
      {/* TOP BAR */}
      <header className="sticky top-0 z-40 bg-[#12141a]/90 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Back & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToAssistantHub}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer border border-white/[0.08]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Assistant Hub</span>
            </button>

            <div className="h-4 w-px bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-950/50">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm sm:text-base tracking-tight text-white">
                    Notes
                  </span>
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    kilo-auto/free
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 hidden sm:block">
                  Sermon Transcripts & Book Reading Summaries · <span className="font-mono text-emerald-400">apps/notes/*</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsWeeklyModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition cursor-pointer shadow-sm"
              title="Generate end-of-week learning synthesis & listen aloud"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Weekly Review</span>
            </button>

            <button
              onClick={() => {
                setEditingNote(null);
                setIsNoteModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs tracking-wide shadow-md shadow-emerald-950/60 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Capture Notes</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* HERO / STATS STRIP */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-[#14161f] border border-white/[0.08] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold text-white block">
                {stats.total}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Total Study Sessions
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#14161f] border border-white/[0.08] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Church className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold text-white block">
                {stats.sermons}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Sermon Notes
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#14161f] border border-white/[0.08] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold text-white block">
                {stats.books}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Books Read
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#14161f] border border-white/[0.08] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <Cross className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold text-white block">
                {stats.bibles}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Bible Studies
              </span>
            </div>
          </div>
        </section>

        {/* QUICK CAPTURE PROMPT CARD */}
        <section className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-[#161824] to-teal-950/30 border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white">
                Multi-Page Camera & Audio Transcriber
              </h3>
            </div>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Snap 1–5 pages of your book or sermon notes, or record live sermons & audiobooks. The open-source <strong className="text-emerald-300 font-semibold">kilo-auto/free</strong> engine extracts the text and creates executive summaries with zero cloud media storage.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                setEditingNote(null);
                setIsNoteModalOpen(true);
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Snap Pages</span>
            </button>

            <button
              onClick={() => {
                setEditingNote(null);
                setIsNoteModalOpen(true);
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-semibold transition cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Record Audio</span>
            </button>
          </div>
        </section>

        {/* SEARCH & FILTER CONTROLS */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                  selectedFilter === 'all'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white bg-white/[0.04]'
                }`}
              >
                All Notes ({notes.length})
              </button>

              <button
                onClick={() => setSelectedFilter('sermon')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                  selectedFilter === 'sermon'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white bg-white/[0.04]'
                }`}
              >
                <Church className="w-3.5 h-3.5" />
                <span>Sermons</span>
              </button>

              <button
                onClick={() => setSelectedFilter('book')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                  selectedFilter === 'book'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-white bg-white/[0.04]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Books</span>
              </button>

              <button
                onClick={() => setSelectedFilter('bible_study')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                  selectedFilter === 'bible_study'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'text-slate-400 hover:text-white bg-white/[0.04]'
                }`}
              >
                <Cross className="w-3.5 h-3.5" />
                <span>Bible Studies</span>
              </button>

              <button
                onClick={() => setSelectedFilter('general')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                  selectedFilter === 'general'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white bg-white/[0.04]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>General</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search scripture, title, author..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#14161f] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* NOTES GRID */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading notes from apps/notes/notes...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="py-16 px-4 rounded-3xl bg-[#141620]/60 border border-white/5 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-slate-400">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="text-base font-bold text-white">No Notes Found</h4>
              <p className="text-xs text-slate-400">
                {searchQuery
                  ? 'No notes matched your search query. Try clearing your search.'
                  : 'Start capturing your sermon insights, book chapters, or personal devotionals.'}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingNote(null);
                setIsNoteModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-emerald-950/60 inline-flex items-center gap-2 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Note</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredNotes.map((note) => {
              const isPlaying = playingNoteId === note.id;

              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className="group relative flex flex-col justify-between rounded-2xl bg-[#141620] border border-white/[0.08] hover:border-emerald-500/40 p-5 transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-black/40 cursor-pointer"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Type & Audio Listen Button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 rounded-md bg-white/[0.05] text-slate-300">
                          {note.type === 'sermon' && <Church className="w-3.5 h-3.5 text-emerald-400" />}
                          {note.type === 'book' && <BookOpen className="w-3.5 h-3.5 text-indigo-400" />}
                          {note.type === 'bible_study' && <Cross className="w-3.5 h-3.5 text-teal-400" />}
                          {note.type === 'general' && <Layers className="w-3.5 h-3.5 text-amber-400" />}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {note.type.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Listen Quick Button */}
                      <button
                        onClick={(e) => handleQuickPlay(note, e)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                          isPlaying
                            ? 'bg-emerald-500 text-black animate-pulse'
                            : 'bg-white/[0.05] hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/5'
                        }`}
                        title="Listen to note audio playback"
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
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
                        {note.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        {note.speakerOrAuthor && (
                          <span className="text-slate-300 font-medium">
                            {note.speakerOrAuthor}
                          </span>
                        )}
                        {note.sourceTitle && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[140px]">{note.sourceTitle}</span>
                          </>
                        )}
                        {note.biblePassage && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px]">
                            {note.biblePassage}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Book Reading Progress Bar */}
                    {note.readingProgress?.currentPage && note.readingProgress?.totalPages && (
                      <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
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

                    {/* Summary Excerpt */}
                    {note.summary && (
                      <p className="text-xs text-slate-300/90 line-clamp-3 leading-relaxed">
                        {note.summary}
                      </p>
                    )}

                    {/* Key Takeaways snippet */}
                    {note.keyTakeaways && note.keyTakeaways.length > 0 && (
                      <div className="space-y-1">
                        {note.keyTakeaways.slice(0, 2).map((takeaway, idx) => (
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

                  {/* Footer: Date & Model badge */}
                  <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500">
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
