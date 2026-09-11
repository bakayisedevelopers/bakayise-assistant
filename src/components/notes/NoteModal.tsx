import React, { useState, useEffect, useRef } from 'react';
import { NoteItem, NoteType, NoteInputMethod, BookProgress } from '../../types';
import {
  X,
  Camera,
  Mic,
  Volume2,
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  BookOpen,
  Church,
  Cross,
  Layers,
  CheckCircle2,
  AlertCircle,
  Radio,
  Square,
  Tag,
  Upload,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Check,
  Calendar,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { processNotesWithKilo, KILO_MODEL_NAME } from '../../services/kiloAIService';
import {
  startAudioCapture,
  startLiveSpeechRecognition,
  AudioSourceType,
  AudioCaptureController,
  isSystemAudioSupported,
} from '../../utils/audioCapture';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: NoteItem) => Promise<void>;
  initialNote?: NoteItem | null;
  workspaceId: string;
  authorId: string;
  authorName: string;
  existingNotes?: NoteItem[];
  prefilledType?: NoteType;
  prefilledBookTitle?: string;
  prefilledSeriesName?: string;
  prefilledBibleBook?: string;
  prefilledCategoryName?: string;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialNote,
  workspaceId,
  authorId,
  authorName,
  existingNotes = [],
  prefilledType,
  prefilledBookTitle,
  prefilledSeriesName,
  prefilledBibleBook,
  prefilledCategoryName,
}) => {
  // High-level Note type: 'book' | 'sermon' | 'bible_study' | 'normal'
  const [type, setType] = useState<NoteType>(prefilledType || 'book');

  // Book fields: Multiple chapters notes entries belong to a book & chapter
  const [bookTitle, setBookTitle] = useState(prefilledBookTitle || '');
  const [chapter, setChapter] = useState('');
  const [pageRange, setPageRange] = useState('');

  // Sermon fields: sermon series, sermon titles, series or standalone
  const [seriesName, setSeriesName] = useState(prefilledSeriesName || '');
  const [sermonTitle, setSermonTitle] = useState('');

  // Bible Study fields: dynamic book of the bible (not hardcoded), can select from list of books being studied
  const [bibleBook, setBibleBook] = useState(prefilledBibleBook || '');
  const [bibleChapter, setBibleChapter] = useState('');

  // Normal / Life Notes: can be given any title, supports vision for family and other life notes
  const [categoryName, setCategoryName] = useState(prefilledCategoryName || 'Vision for Family');

  // Note fields
  const [title, setTitle] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [speakerOrAuthor, setSpeakerOrAuthor] = useState('');
  const [biblePassage, setBiblePassage] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rawContent, setRawContent] = useState('');
  const [summary, setSummary] = useState('');
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>([]);
  const [quotesOrScriptures, setQuotesOrScriptures] = useState<string[]>([]);
  const [actionPoints, setActionPoints] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [inputMethod, setInputMethod] = useState<NoteInputMethod>('manual');

  // Book progress fields
  const [currentPage, setCurrentPage] = useState<number | ''>('');
  const [totalPages, setTotalPages] = useState<number | ''>('');
  const [completed, setCompleted] = useState(false);

  // Derive unique lists from workspace existing notes for quick autocomplete/selection
  const existingBooks = React.useMemo(() => {
    const list = existingNotes
      .filter((n) => n.type === 'book')
      .map((n) => n.bookTitle || n.sourceTitle || '')
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [existingNotes]);

  const existingSeries = React.useMemo(() => {
    const list = existingNotes
      .filter((n) => n.type === 'sermon')
      .map((n) => n.seriesName || (n.sourceTitle && !n.sourceTitle.toLowerCase().includes('sunday') ? n.sourceTitle : ''))
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [existingNotes]);

  const existingBibleBooks = React.useMemo(() => {
    const list = existingNotes
      .filter((n) => n.type === 'bible_study')
      .map((n) => n.bibleBook || n.sourceTitle || '')
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [existingNotes]);

  const existingCategories = React.useMemo(() => {
    const defaults = ['Vision for Family', 'Personal Reflection', 'Life Goals', 'Prayer Points', 'Family Values'];
    const custom = existingNotes
      .filter((n) => n.type === 'normal' || n.type === 'general')
      .map((n) => n.categoryName || '')
      .filter(Boolean);
    return Array.from(new Set([...defaults, ...custom]));
  }, [existingNotes]);

  // New tag / takeaway input helpers
  const [newTakeaway, setNewTakeaway] = useState('');
  const [newQuote, setNewQuote] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newTag, setNewTag] = useState('');

  // UI state
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [showAiSection, setShowAiSection] = useState(false);

  // Image capture state
  const [imageFiles, setImageFiles] = useState<{ id: string; name: string; dataUrl: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio capture state
  const [audioSource, setAudioSource] = useState<AudioSourceType>('mic');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  const audioControllerRef = useRef<AudioCaptureController | null>(null);
  const speechRecognizerRef = useRef<{ stop: () => void } | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // AI Loading state
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize or reset state when modal opens or initialNote changes
  useEffect(() => {
    if (initialNote) {
      setTitle(initialNote.title || '');
      setType(initialNote.type || 'book');
      setBookTitle(initialNote.bookTitle || (initialNote.type === 'book' ? initialNote.sourceTitle : '') || '');
      setChapter(initialNote.chapter || initialNote.readingProgress?.chapter || '');
      setPageRange(initialNote.pageRange || '');
      setSeriesName(initialNote.seriesName || '');
      setSermonTitle(initialNote.sermonTitle || (initialNote.type === 'sermon' ? initialNote.title : '') || '');
      setBibleBook(initialNote.bibleBook || (initialNote.type === 'bible_study' ? initialNote.sourceTitle : '') || '');
      setBibleChapter(initialNote.bibleChapter || initialNote.biblePassage || '');
      setCategoryName(initialNote.categoryName || 'Vision for Family');
      setSourceTitle(initialNote.sourceTitle || '');
      setSpeakerOrAuthor(initialNote.speakerOrAuthor || '');
      setBiblePassage(initialNote.biblePassage || '');
      setDate(initialNote.date || new Date().toISOString().split('T')[0]);
      setRawContent(initialNote.rawContent || '');
      setSummary(initialNote.summary || '');
      setKeyTakeaways(initialNote.keyTakeaways || []);
      setQuotesOrScriptures(initialNote.quotesOrScriptures || []);
      setActionPoints(initialNote.actionPoints || []);
      setTags(initialNote.tags || []);
      setInputMethod(initialNote.inputMethod || 'manual');
      setCurrentPage(initialNote.readingProgress?.currentPage ?? '');
      setTotalPages(initialNote.readingProgress?.totalPages ?? '');
      setCompleted(initialNote.readingProgress?.completed || false);
      if (initialNote.summary || (initialNote.keyTakeaways && initialNote.keyTakeaways.length > 0)) {
        setShowAiSection(true);
      }
      if (initialNote.speakerOrAuthor || initialNote.biblePassage || initialNote.readingProgress) {
        setShowDetailsDrawer(true);
      }
    } else {
      resetForm();
    }
  }, [
    initialNote,
    isOpen,
    prefilledType,
    prefilledBookTitle,
    prefilledSeriesName,
    prefilledBibleBook,
    prefilledCategoryName,
  ]);

  // Clean up recording on unmount or close
  useEffect(() => {
    if (!isOpen && isRecording) {
      stopRecordingSession();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTitle('');
    setType(prefilledType || 'book');
    setBookTitle(prefilledBookTitle || '');
    setChapter('');
    setPageRange('');
    setSeriesName(prefilledSeriesName || '');
    setSermonTitle('');
    setBibleBook(prefilledBibleBook || '');
    setBibleChapter('');
    setCategoryName(prefilledCategoryName || 'Vision for Family');
    setSourceTitle('');
    setSpeakerOrAuthor('');
    setBiblePassage('');
    setDate(new Date().toISOString().split('T')[0]);
    setRawContent('');
    setSummary('');
    setKeyTakeaways([]);
    setQuotesOrScriptures([]);
    setActionPoints([]);
    setTags(['notes']);
    setInputMethod('manual');
    setCurrentPage('');
    setTotalPages('');
    setCompleted(false);
    setImageFiles([]);
    setShowDetailsDrawer(false);
    setShowAiSection(false);
    setLiveTranscript('');
    setAudioError(null);
    setAudioNotice(null);
  };

  // Image handling (Local in-memory data URLs, NO cloud storage)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    (Array.from(files) as File[]).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setImageFiles((prev) => [
            ...prev,
            {
              id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              dataUrl,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    setImageFiles((prev) => prev.filter((img) => img.id !== id));
  };

  // Audio recording handlers
  const startRecordingSession = async () => {
    setAudioError(null);
    setAudioNotice(null);
    setLiveTranscript('');
    setRecordSeconds(0);

    try {
      const { controller, fallbackToMic } = await startAudioCapture(audioSource, (volume) => {
        setAudioVolume(volume);
      });

      if (fallbackToMic) {
        setAudioNotice(
          'Tab audio sharing was cancelled or restricted. Recording smoothly via ambient microphone instead.'
        );
      }

      audioControllerRef.current = controller;
      setIsRecording(true);

      const recognizer = startLiveSpeechRecognition({
        onTranscript: (interim, final) => {
          setLiveTranscript((prev) => {
            const current = final ? `${final} ` : interim;
            return current;
          });
        },
        onError: (err) => {
          console.warn('Speech recognition warning:', err);
        },
      });
      speechRecognizerRef.current = recognizer;

      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Audio recording could not start:', err?.message || err);
      setAudioError(
        err?.message || 'Could not access microphone. Please check permissions.'
      );
      setIsRecording(false);
    }
  };

  const stopRecordingSession = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.stop();
      speechRecognizerRef.current = null;
    }

    if (audioControllerRef.current) {
      try {
        await audioControllerRef.current.stop();
      } catch {}
      audioControllerRef.current = null;
    }

    setIsRecording(false);
    setAudioVolume(0);

    // Populate rawContent with captured speech
    if (liveTranscript.trim()) {
      setRawContent((prev) =>
        prev ? `${prev}\n\n${liveTranscript.trim()}` : liveTranscript.trim()
      );
    }
  };

  // Trigger AI Processing with kilo-auto/free
  const handleProcessAI = async () => {
    setIsProcessingAI(true);
    try {
      const imagesPayload = imageFiles.map((img) => img.dataUrl);

      const result = await processNotesWithKilo({
        type,
        rawText: rawContent || liveTranscript,
        images: imagesPayload,
        sourceTitle,
        speakerOrAuthor,
        biblePassage,
      });

      if (result) {
        if (!title || title.trim() === '') {
          setTitle(result.title);
        }
        if (result.transcription && (!rawContent || rawContent.trim() === '')) {
          setRawContent(result.transcription);
        }
        setSummary(result.summary);
        if (result.keyTakeaways.length > 0) {
          setKeyTakeaways(result.keyTakeaways);
        }
        if (result.quotesOrScriptures.length > 0) {
          setQuotesOrScriptures(result.quotesOrScriptures);
        }
        if (result.actionPoints.length > 0) {
          setActionPoints(result.actionPoints);
        }
        if (result.tags.length > 0) {
          const mergedTags = Array.from(new Set([...tags, ...result.tags]));
          setTags(mergedTags);
        }
        setShowAiSection(true);
      }
    } catch (err: any) {
      console.error('Error during kilo-auto/free processing:', err);
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Add items helpers
  const handleAddTakeaway = () => {
    if (newTakeaway.trim()) {
      setKeyTakeaways((prev) => [...prev, newTakeaway.trim()]);
      setNewTakeaway('');
    }
  };

  const handleAddQuote = () => {
    if (newQuote.trim()) {
      setQuotesOrScriptures((prev) => [...prev, newQuote.trim()]);
      setNewQuote('');
    }
  };

  const handleAddAction = () => {
    if (newAction.trim()) {
      setActionPoints((prev) => [...prev, newAction.trim()]);
      setNewAction('');
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags((prev) => [...prev, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (t: string) => {
    setTags((prev) => prev.filter((tag) => tag !== t));
  };

  // Final Save
  const handleSaveNote = async () => {
    const finalTitle =
      title.trim() ||
      (type === 'book'
        ? (chapter.trim() ? `${bookTitle.trim() || 'Book'} - ${chapter.trim()}` : (bookTitle.trim() || `Book Reading · ${date}`))
        : type === 'sermon'
        ? (sermonTitle.trim() || (seriesName.trim() ? `${seriesName.trim()} Sermon` : `Sermon · ${date}`))
        : type === 'bible_study'
        ? (bibleBook.trim() ? `${bibleBook.trim()} ${bibleChapter.trim()}`.trim() : `Bible Study · ${date}`)
        : `Note · ${date}`);

    setIsSaving(true);
    try {
      const readingProgress: BookProgress | undefined =
        type === 'book'
          ? {
              currentPage: currentPage === '' ? undefined : Number(currentPage),
              totalPages: totalPages === '' ? undefined : Number(totalPages),
              chapter: chapter || undefined,
              completed,
            }
          : undefined;

      const noteToSave: NoteItem = {
        id: initialNote
          ? initialNote.id
          : `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: finalTitle,
        type,
        bookTitle: type === 'book' ? bookTitle.trim() : undefined,
        chapter: type === 'book' ? chapter.trim() : undefined,
        pageRange: type === 'book' ? pageRange.trim() : undefined,
        seriesName: type === 'sermon' ? seriesName.trim() : undefined,
        sermonTitle: type === 'sermon' ? (sermonTitle.trim() || finalTitle) : undefined,
        bibleBook: type === 'bible_study' ? bibleBook.trim() : undefined,
        bibleChapter: type === 'bible_study' ? bibleChapter.trim() : undefined,
        categoryName: (type === 'normal' || type === 'general') ? categoryName.trim() : undefined,
        sourceTitle:
          type === 'book'
            ? (bookTitle.trim() || sourceTitle.trim())
            : type === 'sermon'
            ? (seriesName.trim() || sourceTitle.trim())
            : type === 'bible_study'
            ? (bibleBook.trim() || sourceTitle.trim())
            : undefined,
        speakerOrAuthor: speakerOrAuthor.trim() || undefined,
        biblePassage:
          (type === 'bible_study' ? bibleChapter.trim() : biblePassage.trim()) || undefined,
        date,
        rawContent: rawContent.trim(),
        summary: summary.trim(),
        keyTakeaways,
        quotesOrScriptures: quotesOrScriptures.length > 0 ? quotesOrScriptures : undefined,
        actionPoints: actionPoints.length > 0 ? actionPoints : undefined,
        tags: tags.length > 0 ? tags : [type],
        inputMethod:
          imageFiles.length > 0
            ? 'camera_ocr'
            : isRecording || liveTranscript
            ? (audioSource === 'mic' ? 'mic_recording' : 'system_audio')
            : 'manual',
        readingProgress,
        workspaceId,
        authorId,
        authorName,
        createdAt: initialNote ? initialNote.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        modelUsed: KILO_MODEL_NAME,
      };

      await onSave(noteToSave);
      onClose();
    } catch (err: any) {
      console.error('Failed to save note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090b10] sm:bg-black/80 sm:backdrop-blur-md flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 overflow-hidden">
      {/* NATIVE-LIKE NOTE TAKING CONTAINER */}
      <div className="w-full h-full sm:max-w-3xl sm:h-[90vh] bg-[#0c0e15] sm:border sm:border-white/[0.12] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative font-sans">
        
        {/* TOP BAR / NAVIGATION (iOS / Android Style) */}
        <header className="px-3 sm:px-6 py-3 border-b border-white/[0.08] bg-[#0f121b]/95 backdrop-blur-xl flex items-center justify-between gap-2 shrink-0 z-20">
          {/* Back Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-slate-300 hover:text-white px-2 py-1.5 -ml-1.5 rounded-xl hover:bg-white/[0.06] transition cursor-pointer text-xs font-semibold shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* 4 HIGH-LEVEL NOTE TYPES */}
          <div className="flex items-center bg-white/[0.05] p-0.5 rounded-full border border-white/[0.08] overflow-x-auto max-w-[280px] xs:max-w-none">
            <button
              onClick={() => setType('book')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer shrink-0 ${
                type === 'book'
                  ? 'bg-teal-500 text-black font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Book</span>
            </button>

            <button
              onClick={() => setType('sermon')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer shrink-0 ${
                type === 'sermon'
                  ? 'bg-emerald-500 text-black font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Church className="w-3 h-3" />
              <span>Sermon</span>
            </button>

            <button
              onClick={() => setType('bible_study')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer shrink-0 ${
                type === 'bible_study'
                  ? 'bg-cyan-500 text-black font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cross className="w-3 h-3" />
              <span>Bible Study</span>
            </button>

            <button
              onClick={() => setType('normal')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer shrink-0 ${
                type === 'normal' || type === 'general'
                  ? 'bg-indigo-500 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Normal</span>
            </button>
          </div>

          {/* Right Top Actions: AI Sparkle + Done/Save */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleProcessAI}
              disabled={isProcessingAI || (!rawContent.trim() && imageFiles.length === 0 && !liveTranscript)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer disabled:opacity-30 ${
                isProcessingAI
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 animate-pulse'
                  : 'bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 shadow-sm'
              }`}
              title="Run kilo-auto/free AI processing"
            >
              {isProcessingAI ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden md:inline">Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                  <span className="hidden md:inline">AI Summarize</span>
                </>
              )}
            </button>

            <button
              onClick={handleSaveNote}
              disabled={isSaving}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-md shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Done</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* SCROLLABLE BLANK CANVAS BODY */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-5 space-y-4 text-slate-100">

          {/* DYNAMIC CONTEXT BAR ACCORDING TO HIGH-LEVEL NOTE TYPE */}
          {type === 'book' && (
            <div className="p-3.5 rounded-2xl bg-[#121520] border border-teal-500/20 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-teal-400">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Book Reading & Chapters
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Belongs to a book & chapter entry
                </span>
              </div>

              {/* Existing Books Quick Select Pills */}
              {existingBooks.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400">Books read:</span>
                  {existingBooks.map((bk) => (
                    <button
                      key={bk}
                      type="button"
                      onClick={() => setBookTitle(bk)}
                      className={`text-[10px] px-2 py-0.5 rounded-md transition cursor-pointer border ${
                        bookTitle === bk
                          ? 'bg-teal-500 text-black font-semibold border-teal-400'
                          : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border-white/10'
                      }`}
                    >
                      {bk}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Book Title */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Book Title
                  </label>
                  <input
                    type="text"
                    list="books-datalist"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    placeholder="e.g. Mere Christianity / Atomic Habits"
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none"
                  />
                  <datalist id="books-datalist">
                    {existingBooks.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                {/* Chapter Note Entry */}
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Chapter Entry
                  </label>
                  <input
                    type="text"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    placeholder="e.g. Chapter 8: The Great Sin"
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    value={speakerOrAuthor}
                    onChange={(e) => setSpeakerOrAuthor(e.target.value)}
                    placeholder="e.g. C.S. Lewis"
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Pages (e.g. 108-118)
                  </label>
                  <input
                    type="text"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="pp. 108-118"
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Reading Bookmark
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={currentPage}
                      onChange={(e) => setCurrentPage(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Current"
                      className="w-1/2 bg-[#181b26] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                    />
                    <span className="text-slate-500 text-xs">/</span>
                    <input
                      type="number"
                      value={totalPages}
                      onChange={(e) => setTotalPages(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Total"
                      className="w-1/2 bg-[#181b26] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {type === 'sermon' && (
            <div className="p-3.5 rounded-2xl bg-[#121520] border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <Church className="w-3.5 h-3.5" />
                  Sermon Notes & Series
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Series or standalone sermon
                </span>
              </div>

              {/* Existing Sermon Series Quick Pills */}
              {existingSeries.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400">Series:</span>
                  {existingSeries.map((ser) => (
                    <button
                      key={ser}
                      type="button"
                      onClick={() => setSeriesName(ser)}
                      className={`text-[10px] px-2 py-0.5 rounded-md transition cursor-pointer border ${
                        seriesName === ser
                          ? 'bg-emerald-500 text-black font-semibold border-emerald-400'
                          : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border-white/10'
                      }`}
                    >
                      {ser}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSeriesName('')}
                    className={`text-[10px] px-2 py-0.5 rounded-md transition cursor-pointer border ${
                      seriesName === ''
                        ? 'bg-slate-700 text-white font-medium border-slate-600'
                        : 'bg-white/[0.04] text-slate-400 border-white/10'
                    }`}
                  >
                    Standalone
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Sermon Series (Optional)
                  </label>
                  <input
                    type="text"
                    list="series-datalist"
                    value={seriesName}
                    onChange={(e) => setSeriesName(e.target.value)}
                    placeholder="e.g. Faith & Obedience Series (or leave empty)"
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
                  />
                  <datalist id="series-datalist">
                    {existingSeries.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Preacher / Speaker
                  </label>
                  <input
                    type="text"
                    value={speakerOrAuthor}
                    onChange={(e) => setSpeakerOrAuthor(e.target.value)}
                    placeholder="e.g. Pastor John Doe"
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Scripture Passage Reference
                  </label>
                  <input
                    type="text"
                    value={biblePassage}
                    onChange={(e) => setBiblePassage(e.target.value)}
                    placeholder="e.g. Romans 8:28-39"
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'bible_study' && (
            <div className="p-3.5 rounded-2xl bg-[#121520] border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-cyan-400">
                <span className="flex items-center gap-1.5">
                  <Cross className="w-3.5 h-3.5" />
                  Bible Study
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Belongs to a dynamic Book of the Bible
                </span>
              </div>

              {/* Dynamic List of Books Being Studied (NOT hardcoded) */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">Books studied:</span>
                  {existingBibleBooks.length > 0 ? (
                    existingBibleBooks.map((bb) => (
                      <button
                        key={bb}
                        type="button"
                        onClick={() => setBibleBook(bb)}
                        className={`text-[10px] px-2 py-0.5 rounded-md transition cursor-pointer border ${
                          bibleBook.toLowerCase() === bb.toLowerCase()
                            ? 'bg-cyan-500 text-black font-semibold border-cyan-400'
                            : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border-white/10'
                        }`}
                      >
                        {bb}
                      </button>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">
                      Type any Bible book below (e.g. Romans, Genesis, Psalms)
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Book of the Bible (Not hardcoded)
                  </label>
                  <input
                    type="text"
                    value={bibleBook}
                    onChange={(e) => setBibleBook(e.target.value)}
                    placeholder="e.g. Romans, James, Genesis..."
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Chapter & Verses
                  </label>
                  <input
                    type="text"
                    value={bibleChapter}
                    onChange={(e) => setBibleChapter(e.target.value)}
                    placeholder="e.g. Chapter 8:1-17"
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {(type === 'normal' || type === 'general') && (
            <div className="p-3.5 rounded-2xl bg-[#121520] border border-indigo-500/20 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-400">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Normal Notes & Life Categories
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Give any title · Supports vision for family and life notes
                </span>
              </div>

              {/* Life Category Quick Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Category:</span>
                {existingCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryName(cat)}
                    className={`text-[10px] px-2 py-0.5 rounded-md transition cursor-pointer border ${
                      categoryName === cat
                        ? 'bg-indigo-500 text-white font-semibold border-indigo-400'
                        : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Custom Category / Life Area
                  </label>
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g. Vision for Family, Financial Goals, Personal"
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* MAIN NOTE TITLE INPUT */}
          <div className="space-y-1.5 pt-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === 'book'
                  ? chapter ? `${chapter} Summary / Insights...` : 'Chapter or Note Title...'
                  : type === 'sermon'
                  ? 'Sermon Title / Main Message...'
                  : type === 'bible_study'
                  ? 'Study Topic / Central Truth...'
                  : 'Note Title (can be given any title)...'
              }
              className="w-full text-xl sm:text-2xl font-bold text-white placeholder:text-slate-600 bg-transparent border-0 focus:outline-none tracking-tight"
            />

            <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 text-[11px]">
                <span>{date}</span>
                {type === 'book' && bookTitle && (
                  <span className="text-teal-400">· {bookTitle}</span>
                )}
                {type === 'sermon' && seriesName && (
                  <span className="text-emerald-400">· {seriesName}</span>
                )}
                {type === 'bible_study' && bibleBook && (
                  <span className="text-cyan-400">· {bibleBook}</span>
                )}
                {(type === 'normal' || type === 'general') && categoryName && (
                  <span className="text-indigo-400">· {categoryName}</span>
                )}
              </div>

              <button
                onClick={() => setShowDetailsDrawer((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{showDetailsDrawer ? 'Hide Details' : 'More Details'}</span>
              </button>
            </div>
          </div>

          {/* COLLAPSIBLE DETAILS DRAWER (Preacher, Passage, Book Pages) */}
          {showDetailsDrawer && (
            <div className="p-4 rounded-2xl bg-[#121520] border border-white/[0.08] space-y-3.5 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    {type === 'sermon' ? 'Preacher / Speaker' : type === 'book' ? 'Author' : 'Speaker / Contributor'}
                  </label>
                  <input
                    type="text"
                    value={speakerOrAuthor}
                    onChange={(e) => setSpeakerOrAuthor(e.target.value)}
                    placeholder="e.g. Pastor John Doe / C.S. Lewis"
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    {type === 'sermon' ? 'Church / Series Name' : type === 'book' ? 'Book Title' : 'Source / Context'}
                  </label>
                  <input
                    type="text"
                    value={sourceTitle}
                    onChange={(e) => setSourceTitle(e.target.value)}
                    placeholder="e.g. Grace Fellowship / Romans Series"
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Scripture Passage Reference
                  </label>
                  <input
                    type="text"
                    value={biblePassage}
                    onChange={(e) => setBiblePassage(e.target.value)}
                    placeholder="e.g. Romans 8:28-39"
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Book Progress if Book */}
              {type === 'book' && (
                <div className="pt-2 border-t border-white/[0.06] space-y-2">
                  <div className="text-[11px] font-bold text-teal-400">Book Reading Tracker</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Current Page</span>
                      <input
                        type="number"
                        value={currentPage}
                        onChange={(e) => setCurrentPage(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="45"
                        className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Total Pages</span>
                      <input
                        type="number"
                        value={totalPages}
                        onChange={(e) => setTotalPages(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="280"
                        className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Chapter</span>
                      <input
                        type="text"
                        value={chapter}
                        onChange={(e) => setChapter(e.target.value)}
                        placeholder="Ch. 4"
                        className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ATTACHED PHOTO THUMBNAILS CAROUSEL (IF ANY UPLOADED) */}
          {imageFiles.length > 0 && (
            <div className="p-3 rounded-2xl bg-[#12141e] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Camera className="w-3.5 h-3.5" />
                  {imageFiles.length} Captured / Uploaded {imageFiles.length === 1 ? 'Page' : 'Pages'}
                </span>
                <span className="text-[10px] text-slate-500">In-memory OCR</span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {imageFiles.map((img, idx) => (
                  <div
                    key={img.id}
                    className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-xl overflow-hidden border border-white/15 shrink-0 group bg-black/40"
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <button
                        onClick={() => removeImage(img.id)}
                        className="w-7 h-7 rounded-full bg-rose-600/90 text-white flex items-center justify-center cursor-pointer"
                        title="Remove page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-black/70 text-white">
                      P.{idx + 1}
                    </span>
                  </div>
                ))}

                {imageFiles.length < 5 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl border-2 border-dashed border-white/15 hover:border-emerald-500/50 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-emerald-300 transition shrink-0 cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Add Page</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* AUDIO RECORDING ACTIVE DRAWER */}
          {isRecording && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-[#181119] to-teal-950/40 border border-red-500/30 space-y-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Recording Live {audioSource === 'mic' ? 'Microphone' : 'System Audio'}
                  </span>
                </div>

                <span className="font-mono text-xs font-bold text-red-400">
                  {formatSeconds(recordSeconds)}
                </span>
              </div>

              {/* Volume bar */}
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-75 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(8, audioVolume))}%` }}
                />
              </div>

              {/* Live transcript ticker */}
              {liveTranscript && (
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-300 italic max-h-20 overflow-y-auto">
                  "{liveTranscript}"
                </div>
              )}

              <div className="flex items-center justify-end">
                <button
                  onClick={stopRecordingSession}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop & Insert Transcription</span>
                </button>
              </div>
            </div>
          )}

          {/* AUDIO ERROR OR NOTICE */}
          {audioError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between">
              <span>{audioError}</span>
              <button onClick={() => setAudioError(null)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {audioNotice && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
              <span>{audioNotice}</span>
              <button onClick={() => setAudioNotice(null)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* THE BLANK NOTE CANVAS (Typing area) */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              placeholder="Start typing your notes here... (Sermon highlights, personal reflection, book quotes, study thoughts)"
              className="w-full bg-transparent text-slate-100 placeholder:text-slate-600 text-sm sm:text-base leading-relaxed focus:outline-none min-h-[220px] sm:min-h-[320px] resize-none border-0"
            />
          </div>

          {/* AI SUMMARY & INSIGHTS (IF GENERATED) */}
          {(showAiSection || summary || keyTakeaways.length > 0) && (
            <div className="pt-4 border-t border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-white tracking-wide uppercase">
                    AI Synthesis · {KILO_MODEL_NAME}
                  </span>
                </div>

                <button
                  onClick={() => setShowAiSection((prev) => !prev)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  {showAiSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {showAiSection && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#111420] via-[#0f111a] to-[#0c0e15] border border-teal-500/20 space-y-4">
                  {/* Executive Summary */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-teal-300">
                      Executive Summary
                    </label>
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="AI generated or manual executive summary..."
                      rows={3}
                      className="w-full bg-[#161925] border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Key Takeaways */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                      Key Takeaways
                    </label>
                    <div className="space-y-1.5">
                      {keyTakeaways.map((takeaway, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-slate-300"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">✓</span>
                            <span>{takeaway}</span>
                          </div>
                          <button
                            onClick={() => setKeyTakeaways((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-slate-500 hover:text-rose-400 shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newTakeaway}
                          onChange={(e) => setNewTakeaway(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTakeaway()}
                          placeholder="Add a key takeaway..."
                          className="flex-1 bg-[#161925] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                        />
                        <button
                          onClick={handleAddTakeaway}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-slate-300"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Scripture / Quotes */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                      Scriptures & Quotes
                    </label>
                    <div className="space-y-1.5">
                      {quotesOrScriptures.map((q, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-slate-300"
                        >
                          <span className="italic">"{q}"</span>
                          <button
                            onClick={() => setQuotesOrScriptures((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-slate-500 hover:text-rose-400 shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newQuote}
                          onChange={(e) => setNewQuote(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddQuote()}
                          placeholder="Add scripture or quote..."
                          className="flex-1 bg-[#161925] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                        />
                        <button
                          onClick={handleAddQuote}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-slate-300"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Points */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      Application & Action Points
                    </label>
                    <div className="space-y-1.5">
                      {actionPoints.map((a, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-slate-300"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold">→</span>
                            <span>{a}</span>
                          </div>
                          <button
                            onClick={() => setActionPoints((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-slate-500 hover:text-rose-400 shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newAction}
                          onChange={(e) => setNewAction(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddAction()}
                          placeholder="Add application point..."
                          className="flex-1 bg-[#161925] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                        />
                        <button
                          onClick={handleAddAction}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-slate-300"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Tags
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] text-xs text-slate-300 border border-white/10"
                        >
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>{t}</span>
                          <button
                            onClick={() => removeTag(t)}
                            className="hover:text-rose-400 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                          placeholder="Add tag..."
                          className="bg-[#161925] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white w-24 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM TOOLBAR (DOCKED AT BOTTOM OF CANVAS LIKE iOS / ANDROID NOTES) */}
        <footer className="px-4 py-2.5 sm:px-6 sm:py-3 border-t border-white/[0.08] bg-[#0d0f18]/95 backdrop-blur-xl flex items-center justify-between gap-2 shrink-0 z-20">
          
          {/* Left Actions: Upload/Camera, Record Audio, AI Assist */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Hidden File Input for 1-5 Pages */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* Scan / Upload Pages Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-emerald-500/15 text-slate-300 hover:text-emerald-300 border border-white/[0.08] text-xs font-semibold transition cursor-pointer"
              title="Upload 1-5 photos of book pages or handwritten sermon notes"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span className="hidden xs:inline">Scan / Upload</span>
              {imageFiles.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-black text-[10px] font-bold">
                  {imageFiles.length}
                </span>
              )}
            </button>

            {/* Record Live Audio Button */}
            <button
              onClick={() => {
                if (isRecording) {
                  stopRecordingSession();
                } else {
                  startRecordingSession();
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                isRecording
                  ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                  : 'bg-white/[0.04] hover:bg-teal-500/15 text-slate-300 hover:text-teal-300 border-white/[0.08]'
              }`}
              title="Record live preacher sermon or reading"
            >
              {isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                  <span>{formatSeconds(recordSeconds)}</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-teal-400" />
                  <span className="hidden xs:inline">Record</span>
                </>
              )}
            </button>

            {/* Optional Audio Source Selector Pill if not recording */}
            {!isRecording && isSystemAudioSupported() && (
              <button
                onClick={() => setAudioSource(audioSource === 'mic' ? 'tab_audio' : 'mic')}
                className="hidden md:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white/[0.03] text-slate-400 hover:text-slate-200 text-[11px] border border-white/5"
                title={`Source: ${audioSource === 'mic' ? 'Microphone' : 'Tab Audio'}`}
              >
                {audioSource === 'mic' ? <Mic className="w-3 h-3" /> : <Radio className="w-3 h-3 text-cyan-400" />}
                <span>{audioSource === 'mic' ? 'Mic' : 'Tab'}</span>
              </button>
            )}
          </div>

          {/* Right Actions: AI Assist & Save */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetailsDrawer((prev) => !prev)}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 transition cursor-pointer border border-white/[0.08]"
              title="Toggle Preacher & Scripture Details"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              onClick={handleSaveNote}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-md shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
