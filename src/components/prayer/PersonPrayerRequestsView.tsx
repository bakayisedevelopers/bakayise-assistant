import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Search,
  BookOpen,
  ChevronRight,
  Flame,
  CheckCircle2,
  Clock,
  Heart,
  User,
  HeartHandshake,
  Tag,
  Edit3,
  Trash2,
  Filter,
} from 'lucide-react';
import {
  PrayerPerson,
  PrayerRequestItem,
  PrayerStatus,
} from '../../types';
import { AddEditRequestModal } from './AddEditRequestModal';
import { AddEditPersonModal } from './AddEditPersonModal';

interface PersonPrayerRequestsViewProps {
  person: PrayerPerson;
  requests: PrayerRequestItem[];
  onBack: () => void;
  onSelectRequest: (requestId: string) => void;
  onSaveRequest: (req: PrayerRequestItem) => Promise<void> | void;
  onQuickPray: (req: PrayerRequestItem) => Promise<void> | void;
  onSavePerson: (person: PrayerPerson) => Promise<void> | void;
  onDeletePerson: (personId: string) => Promise<void> | void;
  currentUserId: string;
  currentUserEmail?: string;
}

const STATUS_BADGE: Record<
  PrayerStatus,
  { label: string; bg: string; border: string; text: string }
> = {
  open: {
    label: 'Open',
    bg: 'bg-violet-950/50',
    border: 'border-violet-500/30',
    text: 'text-violet-300',
  },
  delayed: {
    label: 'Delayed',
    bg: 'bg-sky-950/50',
    border: 'border-sky-500/30',
    text: 'text-sky-300',
  },
  answered_yes: {
    label: 'Answered (Yes)',
    bg: 'bg-emerald-950/50',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
  },
  answered_no: {
    label: 'Answered (No)',
    bg: 'bg-rose-950/50',
    border: 'border-rose-500/30',
    text: 'text-rose-300',
  },
  closed: {
    label: 'Closed',
    bg: 'bg-slate-900/60',
    border: 'border-slate-700/50',
    text: 'text-slate-400',
  },
};

export const PersonPrayerRequestsView: React.FC<PersonPrayerRequestsViewProps> = ({
  person,
  requests,
  onBack,
  onSelectRequest,
  onSaveRequest,
  onQuickPray,
  onSavePerson,
  onDeletePerson,
  currentUserId,
  currentUserEmail,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'answered' | 'delayed'>('all');
  const [isAddRequestModalOpen, setIsAddRequestModalOpen] = useState(false);
  const [isEditPersonModalOpen, setIsEditPersonModalOpen] = useState(false);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Filter by status
      if (statusFilter === 'open' && r.status !== 'open') return false;
      if (statusFilter === 'answered' && !r.status.startsWith('answered')) return false;
      if (statusFilter === 'delayed' && r.status !== 'delayed') return false;

      // Filter by search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const inTitle = r.title.toLowerCase().includes(q);
      const inDetails = (r.details || '').toLowerCase().includes(q);
      const inScriptures = (r.scriptures || []).some(
        (s) =>
          s.reference.toLowerCase().includes(q) ||
          s.text.toLowerCase().includes(q)
      );
      return inTitle || inDetails || inScriptures;
    });
  }, [requests, statusFilter, searchQuery]);

  const openCount = requests.filter((r) => r.status === 'open').length;
  const answeredCount = requests.filter((r) => r.status.startsWith('answered')).length;

  return (
    <div className="min-h-screen bg-[#0B0A16] text-slate-200 flex flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0E0D1F]/90 backdrop-blur-md border-b border-violet-500/20 px-4 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-950/40 hover:bg-violet-900/50 border border-violet-500/20 text-xs font-medium text-violet-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All People</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditPersonModalOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-violet-300 hover:bg-violet-950/30 border border-transparent hover:border-violet-500/20 transition-colors"
              title="Edit person details"
              aria-label="Edit person"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to delete ${person.name} and all associated prayer requests?`
                  )
                ) {
                  onDeletePerson(person.id);
                  onBack();
                }
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-500/20 transition-colors"
              title="Delete person"
              aria-label="Delete person"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* Person Hero Profile Card */}
        <section className="p-5 rounded-2xl bg-gradient-to-br from-[#161530] via-[#131227] to-[#0E0D1E] border border-violet-500/25 shadow-xl shadow-violet-950/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center font-bold text-white text-lg shadow-lg"
                style={{
                  backgroundColor: `${person.avatarColor || '#8B5CF6'}33`,
                  borderColor: `${person.avatarColor || '#8B5CF6'}66`,
                }}
              >
                {person.isMyself ? (
                  <Heart className="w-6 h-6 text-pink-400 fill-pink-400/30" />
                ) : (
                  person.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {person.name}
                  </h1>
                  {person.isMyself && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-pink-950/60 text-pink-300 border border-pink-500/30">
                      <Heart className="w-3 h-3 fill-pink-400/30" />
                      <span>Praying for Myself</span>
                    </span>
                  )}
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-950/60 text-violet-300/80 border border-violet-500/20">
                    {person.relationship}
                  </span>
                </div>
                {person.notes && (
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    "{person.notes}"
                  </p>
                )}
              </div>
            </div>

            {/* Prominent Action Button */}
            <button
              onClick={() => setIsAddRequestModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-950/50 hover:shadow-violet-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Prayer Request</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="pt-3 border-t border-violet-500/15 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-[#0C0B18]/60 border border-violet-500/10">
              <span className="block text-base sm:text-lg font-bold text-white">
                {requests.length}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400">Total Requests</span>
            </div>
            <div className="p-2 rounded-xl bg-[#0C0B18]/60 border border-violet-500/10">
              <span className="block text-base sm:text-lg font-bold text-violet-300">
                {openCount}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400">Currently Open</span>
            </div>
            <div className="p-2 rounded-xl bg-[#0C0B18]/60 border border-violet-500/10">
              <span className="block text-base sm:text-lg font-bold text-emerald-400">
                {answeredCount}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400">Answered</span>
            </div>
          </div>
        </section>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {(
              [
                { id: 'all', label: `All (${requests.length})` },
                { id: 'open', label: `Open (${openCount})` },
                { id: 'answered', label: `Answered (${answeredCount})` },
                { id: 'delayed', label: 'Delayed' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setStatusFilter(t.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  statusFilter === t.id
                    ? 'bg-violet-600/40 text-violet-100 border border-violet-400/50 shadow-sm'
                    : 'bg-violet-950/20 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search prayers or scriptures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#0E0D1F] border border-violet-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-400 transition-colors"
            />
          </div>
        </div>

        {/* Prayer Requests List (Rendered as clean rows per user instructions) */}
        <section className="space-y-2.5">
          {filteredRequests.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-[#121124] border border-violet-500/15 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-600/15 border border-violet-500/25 flex items-center justify-center text-violet-300 mx-auto">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  {requests.length === 0
                    ? `No prayer requests for ${person.name} yet`
                    : 'No requests match your filter'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {requests.length === 0
                    ? 'Create your first prayer request for this person to track petitions, scriptures, and answers.'
                    : 'Try changing your search term or status filter.'}
                </p>
              </div>
              {requests.length === 0 && (
                <button
                  onClick={() => setIsAddRequestModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-950/50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Prayer Request</span>
                </button>
              )}
            </div>
          ) : (
            filteredRequests.map((req) => {
              const badge = STATUS_BADGE[req.status] || STATUS_BADGE.open;
              const hasScriptures = (req.scriptures || []).length > 0;

              return (
                <div
                  key={req.id}
                  onClick={() => onSelectRequest(req.id)}
                  className="p-3.5 sm:p-4 rounded-xl bg-[#141328] border border-violet-500/15 hover:border-violet-500/40 hover:bg-[#181730] transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-sm"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onSelectRequest(req.id);
                    }
                  }}
                >
                  {/* Left: Status Pill + Title + Scripture Chips */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Status badge */}
                    <span
                      className={`flex-shrink-0 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.border} ${badge.text}`}
                    >
                      {badge.label}
                    </span>

                    {/* Title and details */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-violet-200 transition-colors">
                          {req.title}
                        </h4>
                      </div>

                      {/* Scripture Reference Tags */}
                      {hasScriptures && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {req.scriptures.slice(0, 3).map((s) => (
                            <span
                              key={s.id}
                              className="text-[10px] px-1.5 py-0.2 rounded bg-violet-950/70 text-violet-300 border border-violet-500/20 font-medium truncate max-w-[140px]"
                            >
                              {s.reference}
                            </span>
                          ))}
                          {req.scriptures.length > 3 && (
                            <span className="text-[10px] text-slate-500">
                              +{req.scriptures.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Times prayed + Quick Pray + Chevron */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <Flame className="w-3.5 h-3.5 text-violet-400" />
                      <span>{req.prayersCount || 0}</span>
                    </span>

                    {/* Quick Pray Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickPray(req);
                      }}
                      className="p-1.5 rounded-lg bg-violet-950/40 hover:bg-violet-600/30 text-violet-300 hover:text-white border border-violet-500/20 transition-all text-xs flex items-center gap-1"
                      title="Quick pray today"
                      aria-label="Prayed today"
                    >
                      <HeartHandshake className="w-3.5 h-3.5" />
                      <span className="hidden md:inline text-[11px]">Prayed</span>
                    </button>

                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-300 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>

      {/* Add Request Modal */}
      <AddEditRequestModal
        isOpen={isAddRequestModalOpen}
        onClose={() => setIsAddRequestModalOpen(false)}
        onSaveRequest={onSaveRequest}
        person={person}
        currentUserId={currentUserId}
        currentUserEmail={currentUserEmail}
      />

      {/* Edit Person Modal */}
      <AddEditPersonModal
        isOpen={isEditPersonModalOpen}
        onClose={() => setIsEditPersonModalOpen(false)}
        onSavePerson={onSavePerson}
        initialPerson={person}
        currentUserId={currentUserId}
        currentUserEmail={currentUserEmail}
      />
    </div>
  );
};
