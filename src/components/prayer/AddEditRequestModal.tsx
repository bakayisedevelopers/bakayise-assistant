import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Tag,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  PrayerRequestItem,
  PrayerStatus,
  PrayerScripture,
  PrayerPerson,
} from '../../types';
import { ScriptureSelectorModal } from './ScriptureSelectorModal';

interface AddEditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRequest: (req: PrayerRequestItem) => Promise<void> | void;
  person: PrayerPerson;
  initialRequest?: PrayerRequestItem | null;
  currentUserId: string;
  currentUserEmail?: string;
}

const STATUS_OPTIONS: { id: PrayerStatus; label: string; desc: string; color: string }[] = [
  { id: 'open', label: 'Open (Praying)', desc: 'Prayer is active and ongoing', color: 'text-violet-400 border-violet-500/30 bg-violet-950/40' },
  { id: 'delayed', label: 'Delayed / Wait', desc: 'In God’s waiting room & timing', color: 'text-sky-400 border-sky-500/30 bg-sky-950/40' },
  { id: 'answered_yes', label: 'Answered (Yes)', desc: 'God gave the breakthrough!', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40' },
  { id: 'answered_no', label: 'Answered (No)', desc: 'God protected / said no / closed door', color: 'text-rose-400 border-rose-500/30 bg-rose-950/40' },
  { id: 'closed', label: 'Closed', desc: 'Season ended / archived', color: 'text-slate-400 border-slate-700 bg-slate-800/40' },
];

export const AddEditRequestModal: React.FC<AddEditRequestModalProps> = ({
  isOpen,
  onClose,
  onSaveRequest,
  person,
  initialRequest,
  currentUserId,
  currentUserEmail,
}) => {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState<PrayerStatus>('open');
  const [scriptures, setScriptures] = useState<PrayerScripture[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [isScriptureModalOpen, setIsScriptureModalOpen] = useState(false);

  useEffect(() => {
    if (initialRequest) {
      setTitle(initialRequest.title);
      setDetails(initialRequest.details || '');
      setStatus(initialRequest.status || 'open');
      setScriptures(initialRequest.scriptures || []);
      setNotes(initialRequest.notes || '');
    } else {
      setTitle('');
      setDetails('');
      setStatus('open');
      setScriptures([]);
      setNotes('');
    }
  }, [initialRequest, isOpen]);

  if (!isOpen) return null;

  const handleAddScripture = (scrip: PrayerScripture) => {
    setScriptures((prev) => {
      if (prev.some((s) => s.reference.toLowerCase() === scrip.reference.toLowerCase())) {
        return prev;
      }
      return [...prev, scrip];
    });
  };

  const handleRemoveScripture = (scripId: string) => {
    setScriptures((prev) => prev.filter((s) => s.id !== scripId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const reqItem: PrayerRequestItem = {
        id: initialRequest
          ? initialRequest.id
          : `prayer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        personId: person.id,
        personName: person.name,
        userId: currentUserId,
        authorEmail: currentUserEmail,
        title: title.trim(),
        details: details.trim() || undefined,
        status,
        scriptures,
        prayerSessions: initialRequest?.prayerSessions || [],
        prayersCount: initialRequest?.prayersCount || 0,
        lastPrayedAt: initialRequest?.lastPrayedAt,
        notes: notes.trim() || undefined,
        dateAnswered:
          status.startsWith('answered')
            ? initialRequest?.dateAnswered || now.split('T')[0]
            : initialRequest?.dateAnswered,
        answerTestimony: initialRequest?.answerTestimony,
        createdAt: initialRequest?.createdAt || now,
        updatedAt: now,
      };

      await onSaveRequest(reqItem);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
        <div
          className="w-full max-w-lg bg-[#131226] border border-violet-500/25 rounded-2xl shadow-2xl shadow-violet-950/50 flex flex-col max-h-[90vh] overflow-hidden text-slate-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-violet-500/15 bg-gradient-to-r from-violet-950/40 via-[#16152E] to-[#131226]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-semibold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight">
                  {initialRequest ? 'Edit Prayer Request' : 'New Prayer Request'}
                </h2>
                <p className="text-xs text-violet-300/70">
                  Praying for <span className="font-semibold text-white">{person.name}</span>
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
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Prayer Request / Subject *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Guidance in job transition, complete healing, exam peace..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#0C0B18] border border-violet-500/25 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-400 transition-colors font-medium"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Current Status
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStatus(opt.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-left border text-xs transition-all ${
                      status === opt.id
                        ? `${opt.color} ring-1 ring-violet-400/50 shadow-sm font-semibold`
                        : 'bg-[#0C0B18] border-violet-500/15 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-medium text-[11px] truncate">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-violet-400" />
                <span>Details / Specific Petitions (Optional)</span>
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explain the background or specific requests being lifted up in prayer..."
                className="w-full p-2.5 text-xs bg-[#0C0B18] border border-violet-500/25 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-400 leading-relaxed resize-none"
              />
            </div>

            {/* Attached Scriptures */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-violet-400" />
                  <span>Scriptures Attached ({scriptures.length})</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsScriptureModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 text-violet-200 text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Scripture</span>
                </button>
              </div>

              {scriptures.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#0C0B18] border border-violet-500/15 text-center text-slate-400 text-xs">
                  No scriptures attached yet. Click "Add Scripture" to anchor this prayer in God's Word.
                </div>
              ) : (
                <div className="space-y-2">
                  {scriptures.map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-xl bg-[#0C0B18] border border-violet-500/20 flex items-start justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-violet-300">
                          {s.reference}
                        </span>
                        {s.text && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {s.text}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveScripture(s.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        aria-label="Remove scripture"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-violet-500/15">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-violet-950/40 transition-colors"
              >
                {saving ? 'Saving...' : initialRequest ? 'Update Request' : 'Create Prayer Request'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ScriptureSelectorModal
        isOpen={isScriptureModalOpen}
        onClose={() => setIsScriptureModalOpen(false)}
        onSelectScripture={handleAddScripture}
        existingScriptures={scriptures}
      />
    </>
  );
};
