import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole, UserProfile } from '../../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getAppDocRef, cleanFirestoreObject } from '../../services/firestoreService';
import {
  X,
  User,
  Mail,
  Shield,
  Palette,
  Check,
  Sparkles,
  Layers,
  Wallet,
  BookOpen,
  LogOut,
  Building,
  Save,
  CheckCircle2,
  Phone,
  Quote,
  ExternalLink,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_COLORS = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    member,
    userRole,
    displayName: currentDisplayName,
    activeWorkspaceId,
    workspaces,
    logout,
  } = useAuth();

  const [displayName, setDisplayName] = useState(currentDisplayName || '');
  const [role, setRole] = useState<UserRole>(userRole || (member?.role as UserRole) || 'Hubby');
  const [avatarColor, setAvatarColor] = useState(member?.avatarColor || '#10b981');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [titleOrMotto, setTitleOrMotto] = useState('');
  const [bio, setBio] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active workspace info
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  useEffect(() => {
    if (!isOpen || !user) return;

    let isMounted = true;
    setIsLoading(true);

    async function loadProfile() {
      try {
        const profileRef = getAppDocRef('user_profiles', user!.uid);
        const snap = await getDoc(profileRef);
        if (snap.exists() && isMounted) {
          const data = snap.data() as UserProfile;
          if (data.displayName) setDisplayName(data.displayName);
          if (data.role) setRole(data.role);
          if (data.avatarColor) setAvatarColor(data.avatarColor);
          if (data.phoneNumber) setPhoneNumber(data.phoneNumber);
          if (data.titleOrMotto) setTitleOrMotto(data.titleOrMotto);
          if (data.bio) setBio(data.bio);
        } else if (isMounted) {
          setDisplayName(currentDisplayName || user!.displayName || '');
          setAvatarColor(member?.avatarColor || '#10b981');
        }
      } catch (err: any) {
        console.warn('Profile fetch notice:', err?.message || err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [isOpen, user, currentDisplayName, member]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const profileRef = getAppDocRef('user_profiles', user.uid);
      const profileData: Partial<UserProfile> = {
        uid: user.uid,
        email: user.email || '',
        displayName: displayName.trim() || user.displayName || 'Family Member',
        role,
        avatarColor,
        phoneNumber: phoneNumber.trim() || undefined,
        titleOrMotto: titleOrMotto.trim() || undefined,
        bio: bio.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(profileRef, cleanFirestoreObject(profileData), { merge: true });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      console.error('Error updating user profile:', err);
      setErrorMessage(err?.message || 'Failed to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 sm:backdrop-blur-md overflow-hidden font-sans">
      <div className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl bg-[#0a0c12] sm:border sm:border-white/[0.1] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* TOP BAR */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                User Profile & Account
              </h2>
              <p className="text-[11px] text-slate-400">
                Manage your identity and apps access across the Bakayise ecosystem
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* HEADER AVATAR CARD */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-[#12141f] to-[#10121a] border border-white/[0.08] flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-xl shadow-black/60 border border-white/20 transition-all duration-300"
                style={{ backgroundColor: avatarColor }}
              >
                {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#0c0e15] text-emerald-400 border border-emerald-500/30 shadow">
                {role}
              </span>
            </div>

            <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">
                {displayName || 'Family Member'}
              </h3>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-400">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate">{user?.email || 'Authenticated User'}</span>
              </div>
              {titleOrMotto ? (
                <p className="text-xs text-emerald-300/90 italic pt-1 line-clamp-2">
                  "{titleOrMotto}"
                </p>
              ) : (
                <p className="text-xs text-slate-500 pt-1">
                  Connected via Google Workspace OAuth
                </p>
              )}
            </div>
          </div>

          {/* EDIT DETAILS FORM */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Personal Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-3.5 py-2.5 bg-[#121520] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                />
              </div>

              {/* Family Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Family Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-[#121520] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                >
                  <option value="Hubby">Hubby (Co-Owner)</option>
                  <option value="Wifey">Wifey (Co-Owner)</option>
                </select>
              </div>

              {/* Email Address (Read Only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Google Account Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.05] rounded-xl text-xs text-slate-400 cursor-not-allowed"
                />
              </div>

              {/* Phone number */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Mobile Phone (Optional)</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+27 82 000 0000"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#121520] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                  />
                </div>
              </div>
            </div>

            {/* Life Motto / Family Vision Snippet */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Personal Motto or Life Scripture</span>
                <span className="text-[10px] text-slate-500">Visible on your profile</span>
              </label>
              <div className="relative">
                <Quote className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                <textarea
                  rows={2}
                  value={titleOrMotto}
                  onChange={(e) => setTitleOrMotto(e.target.value)}
                  placeholder="e.g. As for me and my household, we will serve the Lord. (Joshua 24:15)"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-[#121520] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 leading-relaxed"
                />
              </div>
            </div>

            {/* Avatar Color Picker */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-400" />
                <span>Profile Theme Color</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setAvatarColor(c.value)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition cursor-pointer hover:scale-110 active:scale-95 shadow-md"
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    {avatarColor === c.value && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* APPS YOU ARE PART OF */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Apps You Are Part Of</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Zero-Based Budget App */}
              <div className="p-3.5 rounded-2xl bg-[#121520] border border-emerald-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      Zero-Based Budget
                    </div>
                    <div className="text-[10px] text-emerald-400 font-medium">
                      Co-Manager · Full Access
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  Active
                </span>
              </div>

              {/* Notes & Kilo AI App */}
              <div className="p-3.5 rounded-2xl bg-[#121520] border border-teal-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      Notes & Reflections
                    </div>
                    <div className="text-[10px] text-teal-400 font-medium">
                      Author · Kilo AI Enabled
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">
                  Active
                </span>
              </div>

              {/* Household Meal Planner */}
              <div className="p-3.5 rounded-2xl bg-[#121520]/60 border border-white/[0.06] flex items-center justify-between gap-3 opacity-75">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-400 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-300 truncate">
                      Meal Planning & Grocery
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Family Workspace Service
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.06] text-slate-400 border border-white/[0.08] shrink-0">
                  In Setup
                </span>
              </div>

              {/* Prayer & Family Vision */}
              <div className="p-3.5 rounded-2xl bg-[#121520]/60 border border-white/[0.06] flex items-center justify-between gap-3 opacity-75">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-300 truncate">
                      Family Vision & Prayer
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Spiritual Growth Journal
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.06] text-slate-400 border border-white/[0.08] shrink-0">
                  In Setup
                </span>
              </div>
            </div>
          </div>

          {/* ACTIVE WORKSPACE & SECURITY INFO */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-emerald-400" />
              <span>Workspace & Security</span>
            </h4>

            <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.06] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Workspace:</span>
                <span className="font-semibold text-white">
                  {activeWorkspace?.name || 'The Bakayise Household'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Workspace ID:</span>
                <span className="font-mono text-[11px] text-slate-300">
                  {activeWorkspaceId || 'shared_family_workspace'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Database Sync:</span>
                <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Firestore Live Connected
                </span>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
              {errorMessage}
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-5 py-4 border-t border-white/[0.08] flex items-center justify-between bg-white/[0.02] shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-slate-300 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md shadow-emerald-950/40 transition cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-black" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
