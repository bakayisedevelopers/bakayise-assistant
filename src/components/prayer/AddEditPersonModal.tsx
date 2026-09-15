import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Heart,
  Tag,
  FileText,
  Check,
} from 'lucide-react';
import { PrayerPerson, PrayerRelationship } from '../../types';

interface AddEditPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePerson: (person: PrayerPerson) => Promise<void> | void;
  initialPerson?: PrayerPerson | null;
  currentUserId: string;
  currentUserEmail?: string;
  currentUserName?: string;
}

const RELATIONSHIP_OPTIONS: PrayerRelationship[] = [
  'Myself',
  'Family',
  'Spouse',
  'Children',
  'Parents',
  'Friend',
  'Church & Ministry',
  'Work & Colleagues',
  'Community',
  'Other',
];

const COLOR_OPTIONS = [
  '#8B5CF6', // Violet
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#9333EA', // Purple
];

export const AddEditPersonModal: React.FC<AddEditPersonModalProps> = ({
  isOpen,
  onClose,
  onSavePerson,
  initialPerson,
  currentUserId,
  currentUserEmail,
  currentUserName,
}) => {
  const [name, setName] = useState('');
  const [isMyself, setIsMyself] = useState(false);
  const [relationship, setRelationship] = useState<PrayerRelationship>('Family');
  const [notes, setNotes] = useState('');
  const [avatarColor, setAvatarColor] = useState(COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialPerson) {
      setName(initialPerson.name);
      setIsMyself(Boolean(initialPerson.isMyself));
      setRelationship(initialPerson.relationship || 'Family');
      setNotes(initialPerson.notes || '');
      setAvatarColor(initialPerson.avatarColor || COLOR_OPTIONS[0]);
    } else {
      setName('');
      setIsMyself(false);
      setRelationship('Family');
      setNotes('');
      setAvatarColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]);
    }
  }, [initialPerson, isOpen]);

  if (!isOpen) return null;

  const handleToggleMyself = (checked: boolean) => {
    setIsMyself(checked);
    if (checked) {
      setRelationship('Myself');
      if (!name.trim() || name === 'Myself') {
        setName(currentUserName || 'Myself');
      }
    } else if (relationship === 'Myself') {
      setRelationship('Family');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const person: PrayerPerson = {
        id: initialPerson ? initialPerson.id : `person_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        isMyself: isMyself,
        relationship: isMyself ? 'Myself' : relationship,
        notes: notes.trim() || undefined,
        avatarColor,
        userId: currentUserId,
        authorEmail: currentUserEmail,
        authorName: currentUserName,
        createdAt: initialPerson ? initialPerson.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await onSavePerson(person);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-[#131226] border border-violet-500/25 rounded-2xl shadow-2xl shadow-violet-950/50 flex flex-col overflow-hidden text-slate-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-violet-500/15 bg-gradient-to-r from-violet-950/40 via-[#16152E] to-[#131226]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl border flex items-center justify-center text-white font-semibold"
              style={{
                backgroundColor: `${avatarColor}33`,
                borderColor: `${avatarColor}66`,
              }}
            >
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                {initialPerson ? 'Edit Person' : 'Add Person to Pray For'}
              </h2>
              <p className="text-xs text-violet-300/70">
                {isMyself ? 'Personal prayer focus' : 'Keep prayer records for family & friends'}
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
          {/* Praying for Myself switch */}
          <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/25 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-violet-200 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400/20" />
                <span>Praying for Myself</span>
              </span>
              <p className="text-[11px] text-slate-400">
                Mark this entry as your personal prayer needs
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isMyself}
                onChange={(e) => handleToggleMyself(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
            </label>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Person's Name *
            </label>
            <input
              type="text"
              required
              placeholder={isMyself ? 'Your Name / Myself' : 'e.g. Sarah, Dad, Pastor John, Coworker'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#0C0B18] border border-violet-500/25 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-400 transition-colors"
            />
          </div>

          {/* Relationship */}
          {!isMyself && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-violet-400" />
                <span>Relationship / Category</span>
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as PrayerRelationship)}
                className="w-full px-3 py-2 text-xs bg-[#0C0B18] border border-violet-500/25 rounded-xl text-white focus:outline-none focus:border-violet-400 transition-colors"
              >
                {RELATIONSHIP_OPTIONS.filter((r) => r !== 'Myself').map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Color accent */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Avatar Color
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setAvatarColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center"
                  style={{
                    backgroundColor: c,
                    borderColor: avatarColor === c ? '#ffffff' : 'transparent',
                    transform: avatarColor === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  {avatarColor === c && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-violet-400" />
              <span>Notes / Context (Optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sister living in Pretoria, going through career transition..."
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
              disabled={saving || !name.trim()}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-violet-950/40 transition-colors"
            >
              {saving ? 'Saving...' : initialPerson ? 'Save Changes' : 'Add Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
