import React, { useState, useEffect, useRef } from 'react';
import { NoteItem, NoteType, NoteInputMethod, BookProgress } from '../../types';
import {
  X,
  Camera,
  Mic,
  Volume2,
  FileText,
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
  ShieldCheck,
  Tag,
  Upload,
  Info,
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
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialNote,
  workspaceId,
  authorId,
  authorName,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'audio' | 'editor'>(
    initialNote ? 'editor' : 'camera'
  );

  // Note fields
  const [title, setTitle] = useState('');
  const [type, setType] = useState<NoteType>('sermon');
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
  const [inputMethod, setInputMethod] = useState<NoteInputMethod>('camera_ocr');

  // Book progress fields
  const [currentPage, setCurrentPage] = useState<number | ''>('');
  const [totalPages, setTotalPages] = useState<number | ''>('');
  const [chapter, setChapter] = useState('');
  const [completed, setCompleted] = useState(false);

  // New tag / takeaway input helpers
  const [newTakeaway, setNewTakeaway] = useState('');
  const [newQuote, setNewQuote] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newTag, setNewTag] = useState('');

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

  // AI Loading state
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize or reset state when modal opens or initialNote changes
  useEffect(() => {
    if (initialNote) {
      setTitle(initialNote.title || '');
      setType(initialNote.type || 'sermon');
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
      setChapter(initialNote.readingProgress?.chapter || '');
      setCompleted(initialNote.readingProgress?.completed || false);
      setActiveTab('editor');
    } else {
      resetForm();
    }
  }, [initialNote, isOpen]);

  // Clean up recording on unmount or close
  useEffect(() => {
    if (!isOpen && isRecording) {
      stopRecordingSession();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTitle('');
    setType('sermon');
    setSourceTitle('');
    setSpeakerOrAuthor('');
    setBiblePassage('');
    setDate(new Date().toISOString().split('T')[0]);
    setRawContent('');
    setSummary('');
    setKeyTakeaways([]);
    setQuotesOrScriptures([]);
    setActionPoints([]);
    setTags(['sermon']);
    setInputMethod('camera_ocr');
    setCurrentPage('');
    setTotalPages('');
    setChapter('');
    setCompleted(false);
    setImageFiles([]);
    setActiveTab('camera');
    setLiveTranscript('');
    setAudioError(null);
  };

  // Image handling (Local in-memory data URLs, NO storage)
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

    // Reset input
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
          'Tab audio sharing was cancelled or restricted in this window. Recording smoothly via ambient microphone instead.'
        );
      }

      audioControllerRef.current = controller;
      setIsRecording(true);

      // Start live speech recognizer
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

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Audio recording could not start:', err?.message || err);
      setAudioError(
        err?.message || 'Could not access audio device. Please grant microphone permissions.'
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

        // Switch to editor tab so user can review and save
        setActiveTab('editor');
      }
    } catch (err: any) {
      console.error('Error during kilo-auto/free processing:', err);
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Add items
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
    if (!title.trim()) {
      setTitle(
        type === 'sermon'
          ? `Sermon on ${date}`
          : type === 'book'
          ? `Notes: ${sourceTitle || 'Book Study'}`
          : `Note: ${date}`
      );
    }

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
        id: initialNote ? initialNote.id : `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: title.trim() || 'Untitled Study Note',
        type,
        sourceTitle: sourceTitle.trim() || undefined,
        speakerOrAuthor: speakerOrAuthor.trim() || undefined,
        biblePassage: biblePassage.trim() || undefined,
        date,
        rawContent: rawContent.trim(),
        summary: summary.trim(),
        keyTakeaways,
        quotesOrScriptures: quotesOrScriptures.length > 0 ? quotesOrScriptures : undefined,
        actionPoints: actionPoints.length > 0 ? actionPoints : undefined,
        tags: tags.length > 0 ? tags : [type],
        inputMethod,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#13151d] border border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              {type === 'sermon' && <Church className="w-5 h-5" />}
              {type === 'book' && <BookOpen className="w-5 h-5" />}
              {type === 'bible_study' && <Cross className="w-5 h-5" />}
              {type === 'general' && <Layers className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {initialNote ? 'Edit Study Note' : 'Capture New Note'}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="text-emerald-400 font-mono">apps/notes/*</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-teal-300">
                  <Sparkles className="w-3 h-3" />
                  kilo-auto/free AI Engine
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* INPUT METHOD NAVIGATION TABS */}
        <div className="px-6 pt-3 pb-2 border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto bg-[#101218]">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              activeTab === 'camera'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Multi-Page Camera / Photos</span>
            {imageFiles.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-black font-bold">
                {imageFiles.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              activeTab === 'audio'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Dual Audio Recording</span>
            {isRecording && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              activeTab === 'editor'
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Note Editor & AI Summary</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* TAB 1: CAMERA & PHOTO CAPTURE */}
          {activeTab === 'camera' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-emerald-300">
                    Private In-Memory Image Transcription
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Upload pictures of book pages, sermon notepads, or study sheets. Images are processed directly into text and <strong>never saved to cloud storage</strong>.
                  </p>
                </div>
              </div>

              {/* Note Metadata Quick Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    What are you reading / capturing?
                  </label>
                  <select
                    value={type}
                    onChange={(e) => {
                      const newT = e.target.value as NoteType;
                      setType(newT);
                      setInputMethod('camera_ocr');
                    }}
                    className="w-full bg-[#181b24] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="sermon">⛪ Church Sermon Notes</option>
                    <option value="book">📖 Book Reading (Pages / Chapter)</option>
                    <option value="bible_study">✝️ Bible Reading & Study</option>
                    <option value="general">💡 General Insights & Journal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    {type === 'book' ? 'Book Title' : type === 'sermon' ? 'Church / Series Name' : 'Title / Context'}
                  </label>
                  <input
                    type="text"
                    value={sourceTitle}
                    onChange={(e) => setSourceTitle(e.target.value)}
                    placeholder={type === 'book' ? 'e.g. Mere Christianity' : 'e.g. Grace Fellowship Church'}
                    className="w-full bg-[#181b24] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Drop / Upload Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/15 hover:border-emerald-500/50 rounded-2xl p-6 sm:p-8 text-center bg-[#151720]/60 hover:bg-[#151720] transition cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  Take or Upload Multi-Page Photos
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click to choose 1 to 5+ pictures of consecutive book pages or church notes.
                </p>
              </div>

              {/* Image Preview Thumbnails */}
              {imageFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Captured Pages ({imageFiles.length})
                    </span>
                    <button
                      onClick={() => setImageFiles([])}
                      className="text-xs text-rose-400 hover:text-rose-300 transition"
                    >
                      Clear All Photos
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {imageFiles.map((img, idx) => (
                      <div
                        key={img.id}
                        className="relative group rounded-xl overflow-hidden border border-white/10 bg-black/40 aspect-[3/4]"
                      >
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-bold text-white">
                          Page {idx + 1}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(img.id);
                          }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <button
                  disabled={imageFiles.length === 0 || isProcessingAI}
                  onClick={handleProcessAI}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer"
                >
                  {isProcessingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transcribing & Summarizing with kilo-auto/free...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-200" />
                      <span>Transcribe & Summarize ({imageFiles.length} Pages)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DUAL AUDIO RECORDING */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-teal-300">
                    Dual Audio Capture (Zero Cloud Storage)
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Record live sermons with your ambient microphone, or capture internal system audio while playing an audiobook or podcast on this device. Audio is transcribed in real time and never saved to cloud storage.
                  </p>
                </div>
              </div>

              {/* Audio Mode Switcher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  disabled={isRecording}
                  onClick={() => {
                    setAudioSource('mic');
                    setAudioError(null);
                    setAudioNotice(null);
                  }}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                    audioSource === 'mic'
                      ? 'bg-teal-500/15 border-teal-500/40 text-white'
                      : 'bg-[#181b24] border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5 font-semibold text-xs mb-1">
                    <Mic className="w-4 h-4 text-teal-400" />
                    <span>Mode 1: Ambient Microphone</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    For in-person sermons, church services, seminars, or reading out loud.
                  </p>
                </button>

                <button
                  disabled={isRecording}
                  onClick={() => {
                    setAudioSource('system');
                    setAudioError(null);
                    setAudioNotice(null);
                  }}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                    audioSource === 'system'
                      ? 'bg-teal-500/15 border-teal-500/40 text-white'
                      : 'bg-[#181b24] border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-semibold text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                      <span>Mode 2: System / Device Audio</span>
                    </div>
                    {!isSystemAudioSupported() && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                        Mic Fallback in Preview
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Captures audiobooks, YouTube sermons, or podcasts playing on this device.
                    {!isSystemAudioSupported() && (
                      <span className="block mt-1 text-[10px] text-slate-500">
                        (Seamlessly records speaker sound via microphone in embedded view)
                      </span>
                    )}
                  </p>
                </button>
              </div>

              {/* Audio Notice Box */}
              {audioNotice && (
                <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-teal-400" />
                  <span>{audioNotice}</span>
                </div>
              )}

              {/* Error Box */}
              {audioError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{audioError}</span>
                </div>
              )}

              {/* Active Recording Center */}
              <div className="bg-[#151720] border border-white/10 rounded-2xl p-6 text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isRecording ? 'bg-red-500 animate-ping' : 'bg-slate-600'
                    }`}
                  />
                  <span className="font-mono text-2xl font-bold text-white tracking-widest">
                    {formatSeconds(recordSeconds)}
                  </span>
                </div>

                {/* Animated Audio Frequency Bars */}
                <div className="h-10 flex items-end justify-center gap-1.5 px-4">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const barHeight = isRecording
                      ? Math.max(8, Math.min(40, (audioVolume * (i % 3 + 1)) / 3 + Math.random() * 10))
                      : 6;
                    return (
                      <div
                        key={i}
                        className={`w-1.5 rounded-full transition-all duration-75 ${
                          isRecording ? 'bg-teal-400' : 'bg-slate-700'
                        }`}
                        style={{ height: `${barHeight}px` }}
                      />
                    );
                  })}
                </div>

                {/* Main Toggle Button */}
                <div className="pt-2">
                  {!isRecording ? (
                    <button
                      onClick={startRecordingSession}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-teal-950/60 inline-flex items-center gap-2 cursor-pointer transition"
                    >
                      <Radio className="w-4 h-4 text-teal-200" />
                      <span>
                        Start Recording ({audioSource === 'mic' ? 'Microphone' : 'System Audio'})
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={stopRecordingSession}
                      className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-rose-950/60 inline-flex items-center gap-2 cursor-pointer transition animate-pulse"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Stop & Capture Transcription</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Live Transcript Preview */}
              {liveTranscript && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-medium text-white">Live Transcription Preview:</span>
                    <span className="font-mono text-[10px] text-teal-400">Auto-captured</span>
                  </div>
                  <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 leading-relaxed max-h-36 overflow-y-auto">
                    {liveTranscript}
                  </div>
                </div>
              )}

              {/* Process Button */}
              {liveTranscript && !isRecording && (
                <button
                  disabled={isProcessingAI}
                  onClick={() => {
                    setInputMethod(audioSource === 'mic' ? 'mic_recording' : 'system_audio');
                    handleProcessAI();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold text-xs tracking-wide shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer"
                >
                  {isProcessingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Summarizing Transcript with kilo-auto/free...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-teal-200" />
                      <span>Summarize Speech with kilo-auto/free</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* TAB 3: NOTE EDITOR & SUMMARY */}
          {activeTab === 'editor' && (
            <div className="space-y-6">
              {/* Top Row: Note Type & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Category / Archetype
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as NoteType)}
                    className="w-full bg-[#181b24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="sermon">⛪ Church Sermon</option>
                    <option value="book">📖 Book Reading</option>
                    <option value="bible_study">✝️ Bible Study / Devotional</option>
                    <option value="general">💡 General Insights</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Session Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#181b24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Input Source
                  </label>
                  <div className="px-3 py-2 bg-[#181b24] border border-white/10 rounded-xl text-xs text-slate-300 flex items-center gap-1.5">
                    {inputMethod === 'camera_ocr' && <Camera className="w-3.5 h-3.5 text-emerald-400" />}
                    {inputMethod === 'mic_recording' && <Mic className="w-3.5 h-3.5 text-teal-400" />}
                    {inputMethod === 'system_audio' && <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
                    {inputMethod === 'manual' && <FileText className="w-3.5 h-3.5 text-indigo-400" />}
                    <span className="capitalize">{inputMethod.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Note Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Unshakeable Faith in Trials"
                  className="w-full bg-[#181b24] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Conditional Source & Speaker info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    {type === 'sermon'
                      ? 'Preacher / Speaker'
                      : type === 'book'
                      ? 'Book Author'
                      : 'Author / Teacher'}
                  </label>
                  <input
                    type="text"
                    value={speakerOrAuthor}
                    onChange={(e) => setSpeakerOrAuthor(e.target.value)}
                    placeholder={type === 'book' ? 'e.g. C.S. Lewis' : 'e.g. Pastor John'}
                    className="w-full bg-[#181b24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    {type === 'sermon'
                      ? 'Church / Sermon Series'
                      : type === 'book'
                      ? 'Book Name'
                      : 'Source Reference'}
                  </label>
                  <input
                    type="text"
                    value={sourceTitle}
                    onChange={(e) => setSourceTitle(e.target.value)}
                    placeholder={type === 'book' ? 'e.g. Mere Christianity' : 'e.g. Grace Fellowship Church'}
                    className="w-full bg-[#181b24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Scripture Reference */}
              {(type === 'sermon' || type === 'bible_study') && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Bible Passage(s)
                  </label>
                  <input
                    type="text"
                    value={biblePassage}
                    onChange={(e) => setBiblePassage(e.target.value)}
                    placeholder="e.g. Romans 8:28-39 or Psalm 23"
                    className="w-full bg-[#181b24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Book Reading Progress */}
              {type === 'book' && (
                <div className="p-4 rounded-2xl bg-[#171922] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      Book Reading Bookmark
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={completed}
                        onChange={(e) => setCompleted(e.target.checked)}
                        className="rounded accent-emerald-500"
                      />
                      <span>Finished Book</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Current Page</span>
                      <input
                        type="number"
                        value={currentPage}
                        onChange={(e) =>
                          setCurrentPage(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        placeholder="e.g. 142"
                        className="w-full bg-[#101218] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Total Pages</span>
                      <input
                        type="number"
                        value={totalPages}
                        onChange={(e) =>
                          setTotalPages(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        placeholder="e.g. 280"
                        className="w-full bg-[#101218] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Chapter / Section</span>
                      <input
                        type="text"
                        value={chapter}
                        onChange={(e) => setChapter(e.target.value)}
                        placeholder="e.g. Chapter 7"
                        className="w-full bg-[#101218] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Transcribed Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Transcribed Notes / Raw Reading Content
                  </label>
                  <button
                    disabled={isProcessingAI || !rawContent.trim()}
                    onClick={handleProcessAI}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer disabled:opacity-40"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Re-summarize with kilo-auto/free</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                  placeholder="Paste or edit transcribed text here..."
                  className="w-full bg-[#181b24] border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* AI Structured Summary */}
              <div>
                <label className="block text-xs font-medium text-emerald-300 mb-1.5">
                  AI Summary & Synthesis (kilo-auto/free)
                </label>
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="AI summary will appear here..."
                  className="w-full bg-[#151a22] border border-emerald-500/20 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Key Takeaways */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-400">
                  Key Takeaways
                </label>
                <div className="space-y-1.5">
                  {keyTakeaways.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#181b24] text-xs text-slate-200 border border-white/5"
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                      <button
                        onClick={() =>
                          setKeyTakeaways((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-slate-500 hover:text-rose-400 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newTakeaway}
                    onChange={(e) => setNewTakeaway(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTakeaway()}
                    placeholder="Add a key takeaway point..."
                    className="flex-1 bg-[#181b24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddTakeaway}
                    className="px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Quotes / Scriptures */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-400">
                  Quotes & Scriptures
                </label>
                <div className="space-y-1.5">
                  {quotesOrScriptures.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#181b24] text-xs text-amber-200 border border-white/5 italic"
                    >
                      <span>{item}</span>
                      <button
                        onClick={() =>
                          setQuotesOrScriptures((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-slate-500 hover:text-rose-400 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newQuote}
                    onChange={(e) => setNewQuote(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddQuote()}
                    placeholder="Add memorable scripture or quote..."
                    className="flex-1 bg-[#181b24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddQuote}
                    className="px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Action Points */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-400">
                  Practical Action Points / Life Application
                </label>
                <div className="space-y-1.5">
                  {actionPoints.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#181b24] text-xs text-teal-200 border border-white/5"
                    >
                      <span>• {item}</span>
                      <button
                        onClick={() =>
                          setActionPoints((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-slate-500 hover:text-rose-400 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAction()}
                    placeholder="Add an application or prayer point..."
                    className="flex-1 bg-[#181b24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddAction}
                    className="px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-400">
                  Topic Tags
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
                      className="bg-[#181b24] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white w-24"
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

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Path: /apps/notes/notes/{initialNote ? initialNote.id : 'new'}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-slate-300 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              disabled={isSaving}
              onClick={handleSaveNote}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-emerald-950/60 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to apps/notes...</span>
                </>
              ) : (
                <span>Save Note</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
