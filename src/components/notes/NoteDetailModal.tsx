import React, { useState, useEffect } from 'react';
import { NoteItem } from '../../types';
import {
  X,
  Play,
  Pause,
  Square,
  Volume2,
  BookOpen,
  Church,
  Cross,
  Layers,
  Calendar,
  User,
  Quote,
  CheckCircle2,
  Tag,
  Edit,
  Trash2,
  Sparkles,
  Share2,
} from 'lucide-react';
import {
  speakNotes,
  pauseSpeech,
  resumeSpeech,
  stopSpeech,
  isSpeaking,
} from '../../services/kiloAIService';

interface NoteDetailModalProps {
  note: NoteItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (note: NoteItem) => void;
  onDelete: (noteId: string) => Promise<void>;
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  note,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPausedAudio, setIsPausedAudio] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Stop audio when closing or switching note
    return () => {
      stopSpeech();
      setIsPlayingAudio(false);
      setIsPausedAudio(false);
    };
  }, [note?.id, isOpen]);

  if (!isOpen || !note) return null;

  // Build full speech script
  const getSpeechScript = (): string => {
    let script = `${note.title}. `;
    if (note.speakerOrAuthor) {
      script += `${note.type === 'sermon' ? 'Preached by' : 'By'} ${note.speakerOrAuthor}. `;
    }
    if (note.biblePassage) {
      script += `Scripture reference: ${note.biblePassage}. `;
    }
    if (note.summary) {
      script += `Summary: ${note.summary}. `;
    }
    if (note.keyTakeaways && note.keyTakeaways.length > 0) {
      script += `Key takeaways: ${note.keyTakeaways.join('. ')}. `;
    }
    if (note.actionPoints && note.actionPoints.length > 0) {
      script += `Action points: ${note.actionPoints.join('. ')}. `;
    }
    return script;
  };

  const handlePlayTTS = () => {
    if (isPausedAudio) {
      resumeSpeech();
      setIsPausedAudio(false);
      setIsPlayingAudio(true);
      return;
    }

    const script = getSpeechScript();
    const success = speakNotes(
      script,
      speechRate,
      () => {
        setIsPlayingAudio(true);
        setIsPausedAudio(false);
      },
      () => {
        setIsPlayingAudio(false);
        setIsPausedAudio(false);
      },
      () => {
        setIsPlayingAudio(false);
        setIsPausedAudio(false);
      }
    );

    if (!success) {
      alert('Speech playback is not supported on this browser device.');
    }
  };

  const handlePauseTTS = () => {
    pauseSpeech();
    setIsPausedAudio(true);
    setIsPlayingAudio(false);
  };

  const handleStopTTS = () => {
    stopSpeech();
    setIsPlayingAudio(false);
    setIsPausedAudio(false);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${note.title}"?`)) {
      setIsDeleting(true);
      try {
        await onDelete(note.id);
        onClose();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#13151d] border border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* TOP BAR */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              {note.type === 'sermon' && <Church className="w-5 h-5" />}
              {note.type === 'book' && <BookOpen className="w-5 h-5" />}
              {note.type === 'bible_study' && <Cross className="w-5 h-5" />}
              {note.type === 'general' && <Layers className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                {note.type.replace('_', ' ')}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white truncate">
                {note.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(note);
              }}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition cursor-pointer"
              title="Edit Note"
            >
              <Edit className="w-4 h-4" />
            </button>

            <button
              disabled={isDeleting}
              onClick={handleDelete}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition cursor-pointer"
              title="Delete Note"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AUDIO PLAYER BANNER */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-emerald-950/40 via-[#161a24] to-teal-950/40 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isPlayingAudio
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/50 animate-pulse'
                  : 'bg-white/[0.06] text-emerald-400'
              }`}
            >
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">
                {isPlayingAudio
                  ? 'Reading Notes Aloud...'
                  : isPausedAudio
                  ? 'Speech Paused'
                  : 'Listen to Notes & Summary'}
              </div>
              <div className="text-[10px] text-slate-400">
                Voice Playback Engine · Web Speech API
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Play / Pause / Stop Controls */}
            {!isPlayingAudio ? (
              <button
                onClick={handlePlayTTS}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{isPausedAudio ? 'Resume' : 'Play Audio'}</span>
              </button>
            ) : (
              <button
                onClick={handlePauseTTS}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 fill-white" />
                <span>Pause</span>
              </button>
            )}

            {(isPlayingAudio || isPausedAudio) && (
              <button
                onClick={handleStopTTS}
                className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-slate-300 hover:text-white transition cursor-pointer"
                title="Stop Speech"
              >
                <Square className="w-3.5 h-3.5 fill-slate-300" />
              </button>
            )}

            {/* Rate Selector */}
            <select
              value={speechRate}
              onChange={(e) => {
                const newRate = Number(e.target.value);
                setSpeechRate(newRate);
                if (isPlayingAudio) {
                  stopSpeech();
                  speakNotes(getSpeechScript(), newRate, () => setIsPlayingAudio(true));
                }
              }}
              className="bg-[#1a1d28] border border-white/10 rounded-xl px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
            >
              <option value="0.8">0.8x</option>
              <option value="1.0">1.0x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
            </select>
          </div>
        </div>

        {/* MODAL CONTENT */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{note.date}</span>
            </div>

            {note.speakerOrAuthor && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>{note.speakerOrAuthor}</span>
              </div>
            )}

            {note.sourceTitle && (
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <span>{note.sourceTitle}</span>
              </div>
            )}

            {note.biblePassage && (
              <div className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                {note.biblePassage}
              </div>
            )}

            <div className="ml-auto inline-flex items-center gap-1 text-[10px] text-teal-400 font-mono">
              <Sparkles className="w-3 h-3" />
              <span>{note.modelUsed || 'kilo-auto/free'}</span>
            </div>
          </div>

          {/* Book Reading Progress Card */}
          {note.readingProgress && (
            <div className="p-4 rounded-2xl bg-[#171922] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  Reading Bookmark
                </span>
                <span className="text-[11px] text-slate-400">
                  {note.readingProgress.chapter || 'Chapter In Progress'}
                </span>
              </div>
              <div className="text-right">
                {note.readingProgress.currentPage && note.readingProgress.totalPages ? (
                  <span className="text-xs font-bold text-emerald-400">
                    Page {note.readingProgress.currentPage} of {note.readingProgress.totalPages} (
                    {Math.round(
                      (note.readingProgress.currentPage / note.readingProgress.totalPages) * 100
                    )}
                    %)
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">In Progress</span>
                )}
                {note.readingProgress.completed && (
                  <span className="block text-[10px] text-emerald-400 font-semibold">
                    ✓ Completed Book
                  </span>
                )}
              </div>
            </div>
          )}

          {/* AI SUMMARY BOX */}
          {note.summary && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/20 to-[#151722] border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Executive Summary (kilo-auto/free)</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-line">
                {note.summary}
              </p>
            </div>
          )}

          {/* KEY TAKEAWAYS */}
          {note.keyTakeaways && note.keyTakeaways.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Key Takeaways
              </h3>
              <div className="space-y-2">
                {note.keyTakeaways.map((point, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#171a24] border border-white/5 flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-200 leading-relaxed">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SCRIPTURES & QUOTES */}
          {note.quotesOrScriptures && note.quotesOrScriptures.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Scriptures & Citations
              </h3>
              <div className="space-y-2">
                {note.quotesOrScriptures.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3 text-amber-200 text-xs italic leading-relaxed"
                  >
                    <Quote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACTION POINTS */}
          {note.actionPoints && note.actionPoints.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Practical Application & Action Items
              </h3>
              <div className="space-y-2">
                {note.actionPoints.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-teal-500/5 border border-teal-500/20 flex items-start gap-3 text-teal-200 text-xs leading-relaxed"
                  >
                    <span className="font-bold text-teal-400 shrink-0">→</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RAW TRANSCRIBED NOTES / TEXT */}
          {note.rawContent && (
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Transcribed Content & Notes
              </h3>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-300 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto">
                {note.rawContent}
              </div>
            </div>
          )}

          {/* TAGS */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              {note.tags.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-[11px] text-slate-400 border border-white/10"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="text-[11px] text-slate-500">
            Recorded by {note.authorName || 'User'}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
