import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  Plus,
  Search,
  Heart,
  HeartHandshake,
  ChevronRight,
  Flame,
  CheckCircle2,
  Edit3,
  Trash2,
} from 'lucide-react';
import {
  PrayerPerson,
  PrayerRequestItem,
} from '../../types';
import { AddEditPersonModal } from './AddEditPersonModal';

interface PrayerPeopleLandingViewProps {
  people: PrayerPerson[];
  allRequests: PrayerRequestItem[];
  onBackToHub: () => void;
  onSelectPerson: (personId: string) => void;
  onSavePerson: (person: PrayerPerson) => Promise<void> | void;
  onDeletePerson: (personId: string) => Promise<void> | void;
  currentUserId: string;
  currentUserEmail?: string;
  currentUserName?: string;
}

export const PrayerPeopleLandingView: React.FC<PrayerPeopleLandingViewProps> = ({
  people,
  allRequests,
  onBackToHub,
  onSelectPerson,
  onSavePerson,
  onDeletePerson,
  currentUserId,
  currentUserEmail,
  currentUserName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState<string>('All');
  const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<PrayerPerson | null>(null);

  // Derive request counts per person
  const personStats = useMemo(() => {
    const stats: Record<string, { total: number; open: number; answered: number; lastPrayed?: string }> = {};
    for (const r of allRequests) {
      if (!stats[r.personId]) {
        stats[r.personId] = { total: 0, open: 0, answered: 0 };
      }
      stats[r.personId].total += 1;
      if (r.status === 'open') stats[r.personId].open += 1;
      if (r.status.startsWith('answered')) stats[r.personId].answered += 1;
      if (r.lastPrayedAt) {
        if (!stats[r.personId].lastPrayed || r.lastPrayedAt > (stats[r.personId].lastPrayed || '')) {
          stats[r.personId].lastPrayed = r.lastPrayedAt;
        }
      }
    }
    return stats;
  }, [allRequests]);

  // Filter people
  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      if (selectedRelationship === 'Myself' && !p.isMyself) return false;
      if (selectedRelationship !== 'All' && selectedRelationship !== 'Myself' && p.relationship !== selectedRelationship) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.notes && p.notes.toLowerCase().includes(q)) ||
        p.relationship.toLowerCase().includes(q)
      );
    });
  }, [people, selectedRelationship, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0B0A16] text-slate-200 flex flex-col pb-24">
      {/* Top Bar / Navigation */}
      <header className="sticky top-0 z-30 bg-[#0E0D1F]/90 backdrop-blur-md border-b border-violet-500/20 px-4 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={onBackToHub}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-violet-950/40 hover:bg-violet-900/50 border border-violet-500/20 text-violet-300 hover:text-white transition-colors"
            title="Back"
            aria-label="Back"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-bold text-xs">
              PJ
            </div>
            <span className="text-xs font-semibold text-white hidden sm:inline">
              Prayer Journal
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* Section Header & Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-violet-400" />
              <span>People You Are Praying For</span>
            </h2>
            <p className="text-xs text-slate-400">
              Select any person to view and record their prayer requests
            </p>
          </div>

          <button
            onClick={() => {
              setPersonToEdit(null);
              setIsAddPersonModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-950/50 hover:shadow-violet-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Person to Pray For</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        {people.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search people by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#0E0D1F] border border-violet-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-400 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {['All', 'Myself', 'Family', 'Friends', 'Church'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedRelationship(cat)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    selectedRelationship === cat
                      ? 'bg-violet-600/40 text-violet-100 border border-violet-400/50 shadow-sm'
                      : 'bg-violet-950/20 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* People List / Empty State */}
        {people.length === 0 ? (
          /* Empty state exactly as user requested:
             "And then if there's no people, it will just show there's no one and then maybe with a button that says add a prayer to pray for [add person to pray for]." */
          <div className="p-8 sm:p-14 rounded-2xl bg-[#121124] border border-violet-500/20 text-center space-y-4 shadow-xl shadow-violet-950/30">
            <div className="w-16 h-16 rounded-3xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-300 mx-auto shadow-inner">
              <HeartHandshake className="w-8 h-8 text-violet-400" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-bold text-white">
                There's No One in Your Prayer List Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Begin your prayer journey by adding yourself or someone God has placed on your heart (family member, friend, spouse, or church).
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setPersonToEdit(null);
                  setIsAddPersonModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-950/50 hover:shadow-violet-600/30 transition-all transform active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Person to Pray For</span>
              </button>
            </div>
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#121124] border border-violet-500/15 text-center text-slate-400 text-xs">
            No people match your search "{searchQuery}".
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {filteredPeople.map((person) => {
              const stats = personStats[person.id] || { total: 0, open: 0, answered: 0 };

              return (
                <div
                  key={person.id}
                  onClick={() => onSelectPerson(person.id)}
                  className="p-4 rounded-2xl bg-[#141328] border border-violet-500/15 hover:border-violet-500/40 hover:bg-[#171630] transition-all cursor-pointer flex flex-col justify-between gap-3 group shadow-sm hover:shadow-md hover:shadow-violet-950/30"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onSelectPerson(person.id);
                    }
                  }}
                >
                  {/* Top: Avatar, Name, Badges, Edit */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-11 h-11 rounded-xl border flex items-center justify-center font-bold text-white text-sm shadow-md flex-shrink-0"
                        style={{
                          backgroundColor: `${person.avatarColor || '#8B5CF6'}33`,
                          borderColor: `${person.avatarColor || '#8B5CF6'}66`,
                        }}
                      >
                        {person.isMyself ? (
                          <Heart className="w-5 h-5 text-pink-400 fill-pink-400/30" />
                        ) : (
                          person.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-white truncate group-hover:text-violet-200 transition-colors">
                            {person.name}
                          </h3>
                          {person.isMyself && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.2 rounded-full bg-pink-950/60 text-pink-300 border border-pink-500/30">
                              <Heart className="w-2.5 h-2.5 fill-pink-400/30" />
                              <span>Myself</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-violet-400/80 font-medium">
                          {person.relationship}
                        </span>
                      </div>
                    </div>

                    {/* Quick Edit/Delete buttons */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setPersonToEdit(person);
                          setIsAddPersonModalOpen(true);
                        }}
                        className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-violet-900/30 transition-colors"
                        title="Edit person"
                        aria-label="Edit person"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to delete ${person.name} and all associated prayer requests?`
                            )
                          ) {
                            onDeletePerson(person.id);
                          }
                        }}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                        title="Delete person"
                        aria-label="Delete person"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Notes snippet if present */}
                  {person.notes && (
                    <p className="text-xs text-slate-300/90 line-clamp-1 italic">
                      "{person.notes}"
                    </p>
                  )}

                  {/* Bottom: Request stats & Arrow */}
                  <div className="pt-2 border-t border-violet-500/10 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-violet-400" />
                        <span>
                          <strong className="text-slate-200 font-semibold">{stats.open}</strong> open
                        </span>
                      </span>
                      {stats.answered > 0 && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            <strong className="font-semibold">{stats.answered}</strong> answered
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-violet-300 group-hover:translate-x-0.5 transition-transform text-xs font-medium">
                      <span>View Prayers</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add / Edit Person Modal */}
      <AddEditPersonModal
        isOpen={isAddPersonModalOpen}
        onClose={() => {
          setIsAddPersonModalOpen(false);
          setPersonToEdit(null);
        }}
        onSavePerson={onSavePerson}
        initialPerson={personToEdit}
        currentUserId={currentUserId}
        currentUserEmail={currentUserEmail}
        currentUserName={currentUserName}
      />
    </div>
  );
};
