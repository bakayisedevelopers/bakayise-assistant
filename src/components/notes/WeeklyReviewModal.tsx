import React, { useState, useEffect } from 'react';
import { NoteItem, WeeklySummary } from '../../types';
import {
  X,
  Sparkles,
  Play,
  Pause,
  Square,
  Volume2,
  Calendar,
  Layers,
  BookOpen,
  Church,
  Cross,
  CheckCircle2,
  Loader2,
  Save,
} from 'lucide-react';
import {
  generateWeeklyLearningDigest,
  speakNotes,
  pauseSpeech,
  resumeSpeech,
  stopSpeech,
  KILO_MODEL_NAME,
} from '../../services/kiloAIService';
import { saveWeeklySummary } from '../../services/notesFirestoreService';

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: NoteItem[];
  workspaceId: string;
}

export const WeeklyReviewModal: React.FC<WeeklyReviewModalProps> = ({
  isOpen,
  onClose,
  notes,
  workspaceId,
}) => {
  const [digestTitle, setDigestTitle] = useState('');
  const [digestSummary, setDigestSummary] = useState('');
  const [digestThemes, setDigestThemes] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Audio Playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPausedAudio, setIsPausedAudio] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);

  // Get notes from past 7 days by default, or all if few
  const recentNotes = notes.slice(0, 10);

  useEffect(() => {
    if (isOpen) {
      generateDigest();
    } else {
      stopSpeech();
      setIsPlayingAudio(false);
      setIsPausedAudio(false);
    }
  }, [isOpen]);

  const generateDigest = async () => {
    setIsGenerating(true);
    setSavedSuccess(false);
    try {
      const today = new Date();
      const weekLabel = `Week of ${today.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;

      const res = await generateWeeklyLearningDigest(recentNotes, weekLabel);
      setDigestTitle(res.title);
      setDigestSummary(res.summary);
      setDigestThemes(res.keyThemes);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayTTS = () => {
    if (isPausedAudio) {
      resumeSpeech();
      setIsPausedAudio(false);
      setIsPlayingAudio(true);
      return;
    }

    const script = `${digestTitle}. ${digestSummary}`;
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
      alert('Speech playback is not supported on this browser.');
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

  const handleSaveToCloud = async () => {
    if (!digestSummary) return;
    setIsSaving(true);
    try {
      const today = new Date();
      const summaryItem: WeeklySummary = {
        id: `summary_week_${Date.now()}`,
        weekNumber: Math.ceil(today.getDate() / 7),
        year: today.getFullYear(),
        startDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        title: digestTitle || 'Weekly Learning Reflection',
        summary: digestSummary,
        notesCount: recentNotes.length,
        keyThemes: digestThemes,
        workspaceId,
        createdAt: new Date().toISOString(),
      };

      await saveWeeklySummary(summaryItem);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save weekly digest:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 sm:backdrop-blur-md overflow-hidden">
      <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-[#0c0e15] sm:border sm:border-white/[0.12] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* HEADER */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Weekly Learning Review
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                End-of-week synthesis · {KILO_MODEL_NAME}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
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
                  ? 'Playing Weekly Learning Summary...'
                  : isPausedAudio
                  ? 'Speech Paused'
                  : 'Listen to Weekly Synthesis'}
              </div>
              <div className="text-[10px] text-slate-400">
                Voice Playback Engine · Listen while driving or walking
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isPlayingAudio ? (
              <button
                disabled={isGenerating || !digestSummary}
                onClick={handlePlayTTS}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-40"
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
              >
                <Square className="w-3.5 h-3.5 fill-slate-300" />
              </button>
            )}

            <select
              value={speechRate}
              onChange={(e) => {
                const newRate = Number(e.target.value);
                setSpeechRate(newRate);
                if (isPlayingAudio) {
                  stopSpeech();
                  speakNotes(`${digestTitle}. ${digestSummary}`, newRate, () =>
                    setIsPlayingAudio(true)
                  );
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

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {isGenerating ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <div className="text-sm font-semibold text-white">
                Synthesizing Weekly Takeaways...
              </div>
              <p className="text-xs text-slate-400 max-w-xs">
                Scanning through sermons, book notes, and scriptures to create your learning digest.
              </p>
            </div>
          ) : (
            <>
              {/* Themes Chips */}
              {digestThemes.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-400">Themes:</span>
                  {digestThemes.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Weekly Digest Body */}
              <div className="p-5 rounded-2xl bg-[#171922] border border-white/10 space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>{digestTitle}</span>
                </h3>
                <div className="text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                  {digestSummary}
                </div>
              </div>

              {/* Source Notes Overview */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Included Sessions ({recentNotes.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recentNotes.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-xl bg-[#161822] border border-white/5 flex items-center gap-2 text-xs text-slate-300"
                    >
                      {n.type === 'sermon' && <Church className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {n.type === 'book' && <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      {n.type === 'bible_study' && <Cross className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                      {n.type === 'general' && <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      <span className="truncate">{n.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="text-[11px] text-slate-400">
            {savedSuccess ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved to /apps/notes/weekly_summaries!
              </span>
            ) : (
              <span>Path: /apps/notes/weekly_summaries/*</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={isSaving || isGenerating || !digestSummary}
              onClick={handleSaveToCloud}
              className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Save Reflection</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
