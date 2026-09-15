import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  BookOpen,
  Plus,
  HeartHandshake,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  Check,
  Trash2,
  Edit3,
  Flame,
  Award,
  Share2,
} from 'lucide-react';
import {
  PrayerRequestItem,
  PrayerStatus,
  PrayerScripture,
  PrayerSessionLog,
  PrayerPerson,
} from '../../types';
import { ScriptureSelectorModal } from './ScriptureSelectorModal';
import { LogPrayerSessionModal } from './LogPrayerSessionModal';

interface PrayerRequestDetailViewProps {
  request: PrayerRequestItem;
  person: PrayerPerson;
  onBack: () => void;
  onUpdateRequest: (updated: PrayerRequestItem) => Promise<void> | void;
  onDeleteRequest: (requestId: string) => Promise<void> | void;
  currentUserName?: string;
}

const STATUS_CONFIG: Record<
  PrayerStatus,
  { label: string; bg: string; border: string; text: string; icon: any }
> = {
  open: {
    label: 'Open (In Prayer)',
    bg: 'bg-violet-950/40',
    border: 'border-violet-500/30',
    text: 'text-violet-300',
    icon: Flame,
  },
  delayed: {
    label: 'Delayed / Waiting',
    bg: 'bg-sky-950/40',
    border: 'border-sky-500/30',
    text: 'text-sky-300',
    icon: Clock,
  },
  answered_yes: {
    label: 'Answered (Yes!)',
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    icon: CheckCircle2,
  },
  answered_no: {
    label: 'Answered (No)',
    bg: 'bg-rose-950/40',
    border: 'border-rose-500/30',
    text: 'text-rose-300',
    icon: CheckCircle2,
  },
  closed: {
    label: 'Closed / Concluded',
    bg: 'bg-slate-900/60',
    border: 'border-slate-700/50',
    text: 'text-slate-400',
    icon: Award,
  },
};

export const PrayerRequestDetailView: React.FC<PrayerRequestDetailViewProps> = ({
  request,
  person,
  onBack,
  onUpdateRequest,
  onDeleteRequest,
  currentUserName,
}) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesContent, setNotesContent] = useState(request.notes || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleContent, setTitleContent] = useState(request.title);
  const [detailsContent, setDetailsContent] = useState(request.details || '');
  const [testimonyContent, setTestimonyContent] = useState(request.answerTestimony || '');
  const [dateAnsweredContent, setDateAnsweredContent] = useState(
    request.dateAnswered || new Date().toISOString().split('T')[0]
  );
  const [isEditingTestimony, setIsEditingTestimony] = useState(false);

  const [isScriptureModalOpen, setIsScriptureModalOpen] = useState(false);
  const [isLogSessionModalOpen, setIsLogSessionModalOpen] = useState(false);
  const [copiedScriptureId, setCopiedScriptureId] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);

  const currentStatusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.open;
  const StatusIcon = currentStatusConfig.icon;

  const handleStatusChange = async (newStatus: PrayerStatus) => {
    const isNowAnswered = newStatus.startsWith('answered');
    const updated: PrayerRequestItem = {
      ...request,
      status: newStatus,
      dateAnswered: isNowAnswered
        ? request.dateAnswered || new Date().toISOString().split('T')[0]
        : request.dateAnswered,
      updatedAt: new Date().toISOString(),
    };
    await onUpdateRequest(updated);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const updated: PrayerRequestItem = {
        ...request,
        notes: notesContent.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };
      await onUpdateRequest(updated);
      setIsEditingNotes(false);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveTitleAndDetails = async () => {
    if (!titleContent.trim()) return;
    const updated: PrayerRequestItem = {
      ...request,
      title: titleContent.trim(),
      details: detailsContent.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    await onUpdateRequest(updated);
    setIsEditingTitle(false);
  };

  const handleSaveTestimony = async () => {
    const updated: PrayerRequestItem = {
      ...request,
      answerTestimony: testimonyContent.trim() || undefined,
      dateAnswered: dateAnsweredContent || undefined,
      updatedAt: new Date().toISOString(),
    };
    await onUpdateRequest(updated);
    setIsEditingTestimony(false);
  };

  const handleAddScripture = async (scrip: PrayerScripture) => {
    const current = request.scriptures || [];
    if (current.some((s) => s.reference.toLowerCase() === scrip.reference.toLowerCase())) {
      return;
    }
    const updated: PrayerRequestItem = {
      ...request,
      scriptures: [...current, scrip],
      updatedAt: new Date().toISOString(),
    };
    await onUpdateRequest(updated);
  };

  const handleRemoveScripture = async (scripId: string) => {
    const updated: PrayerRequestItem = {
      ...request,
      scriptures: (request.scriptures || []).filter((s) => s.id !== scripId),
      updatedAt: new Date().toISOString(),
    };
    await onUpdateRequest(updated);
  };

  const handleSavePrayerSession = async (session: PrayerSessionLog) => {
    const updatedSessions = [session, ...(request.prayerSessions || [])];
    const updated: PrayerRequestItem = {
      ...request,
      prayerSessions: updatedSessions,
      prayersCount: (request.prayersCount || 0) + 1,
      lastPrayedAt: session.timestamp,
      updatedAt: new Date().toISOString(),
    };
    await onUpdateRequest(updated);
  };

  const handleCopyScripture = (scrip: PrayerScripture) => {
    const textToCopy = `"${scrip.text}" — ${scrip.reference}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedScriptureId(scrip.id);
    setTimeout(() => setCopiedScriptureId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0B0A16] text-slate-200 flex flex-col pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-[#0E0D1F]/90 backdrop-blur-md border-b border-violet-500/20 px-4 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-950/40 hover:bg-violet-900/50 border border-violet-500/20 text-xs font-medium text-violet-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to {person.name}</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">
              Praying for: <span className="font-semibold text-white">{person.name}</span>
            </span>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this prayer request?')) {
                  onDeleteRequest(request.id);
                  onBack();
                }
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-500/20 transition-colors"
              title="Delete prayer request"
              aria-label="Delete prayer request"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* Title & Status Hero Card */}
        <section className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#161530] via-[#131227] to-[#0E0D1E] border border-violet-500/25 shadow-xl shadow-violet-950/30 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${currentStatusConfig.bg} ${currentStatusConfig.border} ${currentStatusConfig.text}`}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                <span>{currentStatusConfig.label}</span>
              </span>
              <span className="text-xs text-slate-400">
                Created on {new Date(request.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Quick Status Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 hidden sm:inline">Change Status:</span>
              <select
                value={request.status}
                onChange={(e) => handleStatusChange(e.target.value as PrayerStatus)}
                className="px-2.5 py-1 text-xs bg-[#0A0914] border border-violet-500/30 rounded-xl text-violet-200 focus:outline-none focus:border-violet-400 font-medium"
              >
                <option value="open">Open (In Prayer)</option>
                <option value="delayed">Delayed / Waiting</option>
                <option value="answered_yes">Answered (Yes)</option>
                <option value="answered_no">Answered (No)</option>
                <option value="closed">Closed / Archived</option>
              </select>
            </div>
          </div>

          {/* Title and Details Header */}
          {isEditingTitle ? (
            <div className="space-y-3 pt-2">
              <input
                type="text"
                value={titleContent}
                onChange={(e) => setTitleContent(e.target.value)}
                className="w-full px-3 py-2 text-sm sm:text-base font-bold bg-[#0C0B18] border border-violet-500/30 rounded-xl text-white focus:outline-none focus:border-violet-400"
              />
              <textarea
                rows={3}
                value={detailsContent}
                onChange={(e) => setDetailsContent(e.target.value)}
                placeholder="Details of the prayer petition..."
                className="w-full p-3 text-xs bg-[#0C0B18] border border-violet-500/25 rounded-xl text-slate-200 focus:outline-none focus:border-violet-400 leading-relaxed resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTitleAndDetails}
                  className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
                >
                  Save Title
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 group">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                  {request.title}
                </h1>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-violet-300 hover:bg-violet-950/30 transition-colors"
                  title="Edit title & details"
                  aria-label="Edit title"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              {request.details && (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1 whitespace-pre-wrap">
                  {request.details}
                </p>
              )}
            </div>
          )}

          {/* Quick Stats Bar */}
          <div className="pt-3 border-t border-violet-500/15 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 text-slate-300">
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-violet-400" />
                <span>
                  Prayed <strong className="text-white font-semibold">{request.prayersCount || 0}</strong>{' '}
                  {request.prayersCount === 1 ? 'time' : 'times'}
                </span>
              </span>

              {request.lastPrayedAt && (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-violet-400" />
                  <span>
                    Last prayed {new Date(request.lastPrayedAt).toLocaleDateString()}
                  </span>
                </span>
              )}
            </div>

            {/* Prominent Action: "I Prayed for this today" */}
            <button
              onClick={() => setIsLogSessionModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-lg shadow-violet-950/50 hover:shadow-violet-600/30 transition-all transform active:scale-95"
            >
              <HeartHandshake className="w-4 h-4 text-violet-200" />
              <span>I Prayed for This Today</span>
            </button>
          </div>
        </section>

        {/* Answered Prayer / Testimony Card (If Answered) */}
        {(request.status.startsWith('answered') || isEditingTestimony || request.answerTestimony) && (
          <section className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 via-[#191522] to-[#12111E] border border-amber-500/30 shadow-lg shadow-amber-950/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-200">
                    God's Answer & Testimony
                  </h3>
                  <p className="text-[11px] text-amber-300/70">
                    {request.dateAnswered
                      ? `Answered on ${new Date(request.dateAnswered).toLocaleDateString()}`
                      : 'Record how God answered this prayer'}
                  </p>
                </div>
              </div>

              {!isEditingTestimony && (
                <button
                  onClick={() => setIsEditingTestimony(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-xs font-medium transition-colors"
                >
                  {request.answerTestimony ? 'Edit Testimony' : 'Record Testimony'}
                </button>
              )}
            </div>

            {isEditingTestimony ? (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-amber-300 mb-1">
                    Date Answered
                  </label>
                  <input
                    type="date"
                    value={dateAnsweredContent}
                    onChange={(e) => setDateAnsweredContent(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-[#0C0B18] border border-amber-500/30 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-amber-300 mb-1">
                    Testimony: How did God answer? What was the outcome?
                  </label>
                  <textarea
                    rows={4}
                    value={testimonyContent}
                    onChange={(e) => setTestimonyContent(e.target.value)}
                    placeholder="Write down the testimony to remember God's faithfulness..."
                    className="w-full p-3 text-xs bg-[#0C0B18] border border-amber-500/30 rounded-xl text-slate-200 focus:outline-none focus:border-amber-400 leading-relaxed resize-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsEditingTestimony(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTestimony}
                    className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
                  >
                    Save Testimony
                  </button>
                </div>
              </div>
            ) : request.answerTestimony ? (
              <p className="text-xs sm:text-sm text-amber-100 leading-relaxed whitespace-pre-wrap bg-amber-950/20 p-3.5 rounded-xl border border-amber-500/20 italic">
                "{request.answerTestimony}"
              </p>
            ) : (
              <p className="text-xs text-amber-300/80 italic">
                No testimony written yet. Click "Record Testimony" to write what God did!
              </p>
            )}
          </section>
        )}

        {/* Attached Scriptures Section */}
        <section className="p-5 rounded-2xl bg-[#131226] border border-violet-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Attached Scriptures ({(request.scriptures || []).length})
                </h3>
                <p className="text-[11px] text-violet-300/70">
                  Scriptures standing in faith for this petition
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsScriptureModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-950/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Scripture</span>
            </button>
          </div>

          {(request.scriptures || []).length === 0 ? (
            <div className="p-6 rounded-xl bg-[#0C0B18] border border-violet-500/15 text-center space-y-2">
              <p className="text-xs text-slate-400">
                No scriptures attached to this prayer request yet.
              </p>
              <button
                onClick={() => setIsScriptureModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 text-violet-200 text-xs font-medium transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Browse & Add Bible Verses</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {(request.scriptures || []).map((scrip) => (
                <div
                  key={scrip.id}
                  className="p-4 rounded-xl bg-[#161530] border border-violet-500/20 hover:border-violet-500/40 transition-all space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-violet-300">
                        {scrip.reference}
                      </span>
                      {scrip.translation && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-950/60 text-violet-300/80 border border-violet-500/20">
                          {scrip.translation}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyScripture(scrip)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-violet-900/30 transition-colors"
                        title="Copy scripture text"
                        aria-label="Copy scripture"
                      >
                        {copiedScriptureId === scrip.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRemoveScripture(scrip.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                        title="Remove scripture"
                        aria-label="Remove scripture"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {scrip.text && (
                    <p className="text-xs text-slate-200 leading-relaxed font-serif italic pl-2 border-l-2 border-violet-500/40">
                      "{scrip.text}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Notes & Heart of Prayer */}
        <section className="p-5 rounded-2xl bg-[#131226] border border-violet-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Prayer Journal Notes</span>
              {savingNotes && <span className="text-xs text-violet-400">Saving...</span>}
            </h3>
            {!isEditingNotes ? (
              <button
                onClick={() => setIsEditingNotes(true)}
                className="px-2.5 py-1 rounded-lg bg-violet-950/40 hover:bg-violet-900/50 border border-violet-500/20 text-violet-300 text-xs font-medium transition-colors"
              >
                {request.notes ? 'Edit Notes' : 'Add Notes'}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingNotes(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {isEditingNotes ? (
            <textarea
              rows={5}
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              placeholder="Record reflections, feelings, progress, or how the prayer is evolving..."
              className="w-full p-3 text-xs bg-[#0C0B18] border border-violet-500/25 rounded-xl text-slate-200 focus:outline-none focus:border-violet-400 leading-relaxed resize-none"
            />
          ) : request.notes ? (
            <div className="p-4 rounded-xl bg-[#0C0B18] border border-violet-500/15 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
              {request.notes}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              No notes recorded yet. Click "Add Notes" to write details of what was prayed.
            </p>
          )}
        </section>

        {/* Prayer Timeline: Dates Offered & What the Lord is Prompting */}
        <section className="p-5 rounded-2xl bg-[#131226] border border-violet-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Prayer Sessions & Lord's Promptings
                </h3>
                <p className="text-[11px] text-violet-300/70">
                  Dates you prayed and impressions God laid on your heart
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsLogSessionModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 text-violet-200 text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Prayer Date</span>
            </button>
          </div>

          {(request.prayerSessions || []).length === 0 ? (
            <div className="p-6 rounded-xl bg-[#0C0B18] border border-violet-500/15 text-center space-y-2">
              <p className="text-xs text-slate-400">
                No individual prayer sessions logged yet.
              </p>
              <button
                onClick={() => setIsLogSessionModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-950/40 transition-colors"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>I Prayed for This Today</span>
              </button>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-violet-500/20">
              {(request.prayerSessions || []).map((sess) => (
                <div key={sess.id} className="relative space-y-1 group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-violet-600 border-2 border-[#131226] ring-2 ring-violet-500/40"></div>

                  <div className="p-3.5 rounded-xl bg-[#161530] border border-violet-500/15 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-violet-400" />
                        <span>{new Date(sess.date).toLocaleDateString()}</span>
                      </span>
                      {sess.prayedBy && (
                        <span className="text-[10px] text-slate-400">
                          by {sess.prayedBy}
                        </span>
                      )}
                    </div>

                    {sess.promptingNotes && (
                      <div className="p-2.5 rounded-lg bg-violet-950/30 border border-violet-500/20 space-y-1">
                        <span className="text-[11px] font-semibold text-violet-300 flex items-center gap-1">
                          <Compass className="w-3.5 h-3.5 text-violet-400" />
                          <span>Prompting from the Lord:</span>
                        </span>
                        <p className="text-xs text-slate-200 leading-relaxed">
                          {sess.promptingNotes}
                        </p>
                      </div>
                    )}

                    {sess.sessionNotes && (
                      <p className="text-xs text-slate-300 leading-relaxed italic pt-1">
                        "{sess.sessionNotes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Scripture Modal */}
      <ScriptureSelectorModal
        isOpen={isScriptureModalOpen}
        onClose={() => setIsScriptureModalOpen(false)}
        onSelectScripture={handleAddScripture}
        existingScriptures={request.scriptures || []}
      />

      {/* Log Session Modal */}
      <LogPrayerSessionModal
        isOpen={isLogSessionModalOpen}
        onClose={() => setIsLogSessionModalOpen(false)}
        onSaveSession={handleSavePrayerSession}
        prayerTitle={request.title}
        personName={person.name}
        userName={currentUserName}
      />
    </div>
  );
};
