import React, { useState } from 'react';
import {
  X,
  Calendar,
  Sparkles,
  HeartHandshake,
  Clock,
  Compass,
} from 'lucide-react';
import { PrayerSessionLog } from '../../types';

interface LogPrayerSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSession: (session: PrayerSessionLog) => void;
  prayerTitle: string;
  personName?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
}

export const LogPrayerSessionModal: React.FC<LogPrayerSessionModalProps> = ({
  isOpen,
  onClose,
  onSaveSession,
  prayerTitle,
  personName,
  userName,
  userEmail,
  userRole,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [promptingNotes, setPromptingNotes] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const session: PrayerSessionLog = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: date || todayStr,
      timestamp: new Date().toISOString(),
      promptingNotes: promptingNotes.trim() || undefined,
      sessionNotes: sessionNotes.trim() || undefined,
      prayedBy: userName,
      prayedByEmail: userEmail,
      prayedByRole: userRole,
    };
    onSaveSession(session);
    setPromptingNotes('');
    setSessionNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[#131226] border border-violet-500/25 rounded-2xl shadow-2xl shadow-violet-950/50 flex flex-col overflow-hidden text-slate-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-violet-500/15 bg-gradient-to-r from-violet-950/40 via-[#16152E] to-[#131226]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Log Prayer Offered
              </h2>
              <p className="text-xs text-violet-300/70 truncate max-w-[280px]">
                {prayerTitle} {personName ? `• for ${personName}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-violet-900/30 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-violet-400" />
              <span>Date Prayer Was Offered *</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#0C0B18] border border-violet-500/25 rounded-xl text-white focus:outline-none focus:border-violet-400 transition-colors"
            />
          </div>

          {/* What the Lord is prompting */}
          <div className="p-3.5 rounded-xl bg-violet-950/25 border border-violet-500/20 space-y-2">
            <label className="block text-xs font-semibold text-violet-300 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-violet-400" />
              <span>What is the Lord prompting you to do?</span>
            </label>
            <p className="text-[11px] text-slate-400 leading-normal">
              Record any impressions, steps of obedience, Scriptures spoken, or actions God laid on your heart during this prayer.
            </p>
            <textarea
              rows={3}
              value={promptingNotes}
              onChange={(e) => setPromptingNotes(e.target.value)}
              placeholder="e.g. Call them with encouragement, be patient and hold my tongue, sow financial seed, fast next Tuesday..."
              className="w-full p-2.5 text-xs bg-[#0C0B18] border border-violet-500/25 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-400 leading-relaxed resize-none"
            />
          </div>

          {/* General Prayer Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-violet-400" />
              <span>Prayer Reflections / Notes (Optional)</span>
            </label>
            <textarea
              rows={2}
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Additional thoughts, how the Holy Spirit led the prayer..."
              className="w-full p-2.5 text-xs bg-[#0C0B18] border border-violet-500/25 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-400 leading-relaxed resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-950/40 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Record Prayer Offered</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
