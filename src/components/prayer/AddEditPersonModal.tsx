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

const RELATIONSHIP_GROUPS: { group: string; options: PrayerRelationship[] }[] = [
  {
    group: 'Spouse',
    options: ['Husband', 'Wife', 'Spouse'],
  },
  {
    group: 'Children & Spiritual Children',
    options: [
      'Son',
      'Daughter',
      'Spiritual Son',
      'Spiritual Daughter',
      'Children',
    ],
  },
  {
    group: 'Parents & Spiritual Parents',
    options: [
      'Father',
      'Mother',
      'Spiritual Father',
      'Spiritual Mother',
      'Parents',
    ],
  },
  {
    group: 'Family & In-Laws',
    options: [
      'Brother',
      'Sister',
      'Brother-in-law',
      'Sister-in-law',
      'Mother-in-law',
      'Father-in-law',
      'Family',
    ],
  },
  {
    group: 'Faith & Church Community',
    options: [
      'Pastor',
      'Brother in Christ',
      'Sister in Christ',
      'Church & Ministry',
    ],
  },
  {
    group: 'Friends & Colleagues',
    options: ['Friend', 'Work & Colleagues', 'Community'],
  },
  {
    group: 'Other (Custom)',
    options: ['Other'],
  },
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
  const [customRelationship, setCustomRelationship] = useState('');
  const [notes, setNotes] = useState('');
  const [avatarColor, setAvatarColor] = useState(COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialPerson) {
      setName(initialPerson.name);
      setIsMyself(Boolean(initialPerson.isMyself));
      setRelationship(initialPerson.relationship || 'Family');
      setCustomRelationship(initialPerson.customRelationship || '');
      setNotes(initialPerson.notes || '');
      setAvatarColor(initialPerson.avatarColor || COLOR_OPTIONS[0]);
    } else {
      setName('');
      setIsMyself(false);
      setRelationship('Family');
      setCustomRelationship('');
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
        id: initialPerson
          ? initialPerson.id
          : `person_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        isMyself: isMyself,
        relationship: isMyself ? 'Myself' : relationship,
        customRelationship:
          relationship === 'Other'
            ? customRelationship.trim() || 'Other'
            : customRelationship.trim() || undefined,
        notes: notes.trim() || undefined,
        avatarColor,
        userId: initialPerson ? initialPerson.userId : currentUserId,
        authorEmail: initialPerson ? initialPerson.authorEmail || currentUserEmail : currentUserEmail,
        authorName: initialPerson ? initialPerson.authorName || currentUserName : currentUserName,
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
        className="w-full max-w-lg bg-[#131226] border border-violet-500/25 rounded-2xl shadow-2xl shadow-violet-950/50 flex flex-col max-h-[92vh] overflow-hidden text-slate-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-violet-500/15 bg-gradient-to-r from-violet-950/40 via-[#16152E] to-[#131226] shrink-0">
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
                {initialPerson ? 'Edit Person & Category' : 'Add Person to Pray For'}
              </h2>
              <p className="text-xs text-violet-300/70">
                {isMyself
                  ? 'Personal prayer focus'
                  : 'Manage details, relationship category, and notes'}
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
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
              placeholder={isMyself ? 'Your Name / Myself' : 'e.g. Lumka, Jabu, Pastor John, Son'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#0C0B18] border border-violet-500/25 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-400 transition-colors"
            />
          </div>

          {/* Relationship Selection with full semantic groupings */}
          {!isMyself && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-violet-400" />
                <span>Relationship / Category *</span>
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as PrayerRelationship)}
                className="w-full px-3 py-2.5 text-xs bg-[#0C0B18] border border-violet-500/25 rounded-xl text-white focus:outline-none focus:border-violet-400 transition-colors font-medium"
              >
                {RELATIONSHIP_GROUPS.map((grp) => (
                  <optgroup key={grp.group} label={grp.group} className="bg-[#121124] text-slate-300 font-semibold">
                    {grp.options.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#0C0B18] text-white font-normal py-1">
                        {opt}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* Dynamic custom specification for "Other" or custom sub-categories */}
              {(relationship === 'Other' || customRelationship) && (
                <div className="pt-1.5 animate-in fade-in duration-200">
                  <label className="block text-[11px] font-medium text-violet-300 mb-1">
                    Specific Relationship / Title {relationship === 'Other' ? '*' : '(Optional)'}
                  </label>
                  <input
                    type="text"
                    required={relationship === 'Other'}
                    placeholder="e.g. Cousin, Aunt, Mentee, Neighbor, Godchild..."
                    value={customRelationship}
                    onChange={(e) => setCustomRelationship(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#0C0B18] border border-violet-500/35 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-400 transition-colors"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    This custom label will display alongside their tag badge.
                  </p>
                </div>
              )}
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
                  className="w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer"
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
              placeholder="e.g. Spiritual journey, health needs, counseling requests..."
              className="w-full p-2.5 text-xs bg-[#0C0B18] border border-violet-500/25 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-400 leading-relaxed resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 shrink-0 border-t border-violet-500/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-violet-950/40 transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : initialPerson ? 'Save Changes' : 'Add Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
