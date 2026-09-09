import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { AssistantApp } from '../types';
import { subscribeToAssistantApps } from '../services/appsService';
import {
  MoreVertical,
  LogOut,
  X,
  ArrowRight,
  ArrowUpRight,
  Database,
  Tag,
  Activity,
  Layers,
  Wallet,
  BookOpen,
  Search,
  Copy,
  Check,
  Cpu,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AssistantHubProps {
  onLaunchApp: (appId: string) => void;
}

const getAppIcon = (app: AssistantApp) => {
  const key = (app.id || app.appName || app.name || '').toLowerCase();
  if (key.includes('budget') || key.includes('finance') || key.includes('calc')) {
    return <Wallet className="w-4 h-4 text-emerald-400" />;
  }
  if (key.includes('note') || key.includes('book') || key.includes('bible') || key.includes('study')) {
    return <BookOpen className="w-4 h-4 text-teal-400" />;
  }
  return <Layers className="w-4 h-4 text-cyan-400" />;
};

const getAppAccent = (app: AssistantApp) => {
  const key = (app.id || app.appName || app.name || '').toLowerCase();
  if (key.includes('budget')) {
    return {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:border-emerald-500/40',
      glow: 'group-hover:shadow-emerald-950/40 group-hover:border-emerald-500/40',
      text: 'group-hover:text-emerald-300',
    };
  }
  if (key.includes('note')) {
    return {
      badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20 group-hover:border-teal-500/40',
      glow: 'group-hover:shadow-teal-950/40 group-hover:border-teal-500/40',
      text: 'group-hover:text-teal-300',
    };
  }
  return {
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 group-hover:border-cyan-500/40',
    glow: 'group-hover:shadow-cyan-950/40 group-hover:border-cyan-500/40',
    text: 'group-hover:text-cyan-300',
  };
};

export const AssistantHub: React.FC<AssistantHubProps> = ({ onLaunchApp }) => {
  const { member, displayName, logout } = useAuth();
  const [apps, setApps] = useState<AssistantApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<AssistantApp | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPath, setCopiedPath] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAssistantApps((loadedApps) => {
      setApps(loadedApps);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return apps;
    const q = searchQuery.toLowerCase().trim();
    return apps.filter((a) => {
      const name = (a.appName || a.name || '').toLowerCase();
      const desc = (a.appDescription || a.description || '').toLowerCase();
      const cat = (a.category || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || cat.includes(q);
    });
  }, [apps, searchQuery]);

  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col relative selection:bg-emerald-500/30 overflow-x-hidden font-sans">
      {/* AMBIENT BACKGROUND GLOW */}
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[340px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl opacity-70 rounded-full" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-teal-500/5 blur-3xl rounded-full" />
        <div className="absolute top-2/3 -right-32 w-80 h-80 bg-emerald-500/5 blur-3xl rounded-full" />
      </div>

      {/* TOP BAR */}
      <header className="sticky top-0 z-40 bg-[#0c0e15]/80 backdrop-blur-xl border-b border-white/[0.07]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-950/40 border border-white/15">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">
                Apps Hub
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Firestore Live
              </span>
            </div>
          </div>

          {/* USER PROFILE & LOGOUT */}
          <div className="flex items-center gap-2.5">
            {member && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-inner"
                  style={{ backgroundColor: member.avatarColor || '#10b981' }}
                >
                  {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-medium text-slate-200 hidden sm:inline">
                  {displayName}
                </span>
              </div>
            )}

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 border border-white/[0.08] hover:border-rose-500/20 text-xs font-medium transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-7 sm:py-9 relative z-10 space-y-5">
        {/* SUBHEADER & SEARCH */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Applications</span>
              {!loading && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                  {apps.length}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Available services synced with Firestore <code className="text-emerald-400 font-mono">/apps</code>
            </p>
          </div>

          {/* Search box if apps exist */}
          {apps.length > 2 && (
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search apps..."
                className="w-full pl-8 pr-7 py-1.5 bg-[#12141d]/80 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/40 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* CONTENT STATES */}
        {loading ? (
          /* SKELETON PLACEHOLDERS */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="rounded-2xl border border-white/[0.06] bg-[#12141c]/60 p-4 min-h-[112px] flex flex-col justify-between animate-pulse"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.06]" />
                  <div className="w-5 h-5 rounded bg-white/[0.04]" />
                </div>
                <div className="w-20 h-4 rounded bg-white/[0.08] mt-4" />
              </div>
            ))}
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-white/[0.08] rounded-2xl bg-[#11131b]/40">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-300">
              {searchQuery ? 'No matching apps found' : 'No apps found in Firestore'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery
                ? 'Try a different search term.'
                : 'Documents added to the /apps collection in Firestore will appear here.'}
            </p>
          </div>
        ) : (
          /* APP CONTAINERS GRID */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4"
          >
            {filteredApps.map((app) => {
              const accent = getAppAccent(app);

              return (
                <motion.div
                  key={app.id}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => onLaunchApp(app.id)}
                  className={`group relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#141722]/90 to-[#0e1017]/90 hover:bg-[#181c2b] p-3.5 sm:p-4 flex flex-col justify-between min-h-[108px] sm:min-h-[116px] transition-all duration-200 cursor-pointer shadow-md shadow-black/30 hover:shadow-xl ${accent.glow} select-none overflow-hidden`}
                >
                  {/* SUBTLE CARD HOVER GLOSS */}
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-white/[0.02] rounded-full blur-xl group-hover:bg-emerald-500/[0.08] transition-all" />

                  {/* TOP ROW: ICON + THREE DOT BUTTON */}
                  <div className="flex items-center justify-between w-full relative z-10">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center border transition-colors ${accent.badge}`}
                    >
                      {getAppIcon(app)}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedApp(app);
                      }}
                      className="p-1.5 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                      title={`${app.appName || app.name} Details`}
                      aria-label={`Open details for ${app.appName || app.name}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* BOTTOM ROW: APP NAME ONLY + SUBTLE ARROW */}
                  <div className="pt-3 flex items-center justify-between gap-1 relative z-10">
                    <span
                      className={`font-semibold text-sm sm:text-[15px] text-white tracking-tight ${accent.text} transition-colors block truncate`}
                    >
                      {app.appName || app.name}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:text-emerald-400 -translate-x-1 group-hover:translate-x-0 transition-all shrink-0" />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>

      {/* APP DETAILS MODAL */}
      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.16 }}
              className="relative w-full max-w-md rounded-2xl bg-[#141622] border border-white/[0.12] p-5 sm:p-6 space-y-4 shadow-2xl shadow-black/80"
            >
              {/* MODAL HEADER */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                    {getAppIcon(selectedApp)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">
                      {selectedApp.appName || selectedApp.name}
                    </h3>
                    <span className="text-[11px] text-slate-400">Application Information</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedApp(null)}
                  className="p-1.5 rounded-lg bg-white/[0.05] text-slate-400 hover:text-white transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* MODAL BODY */}
              <div className="space-y-3.5">
                {(selectedApp.appDescription || selectedApp.description) && (
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Overview
                    </label>
                    <p className="text-xs text-slate-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/[0.06]">
                      {selectedApp.appDescription || selectedApp.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Tag className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Category</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200">
                      {selectedApp.category || 'General'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Activity className="w-3.5 h-3.5 text-teal-400" />
                      <span>Status</span>
                    </div>
                    <div className="text-xs font-semibold text-emerald-400 capitalize flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {selectedApp.status || 'Active'}
                    </div>
                  </div>
                </div>

                {/* FIRESTORE INFO */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      Firestore Doc:
                    </span>
                    <button
                      onClick={() => copyToClipboard(`apps/${selectedApp.id}`)}
                      className="flex items-center gap-1 font-mono text-emerald-400 text-[11px] hover:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 cursor-pointer"
                      title="Click to copy path"
                    >
                      {copiedPath ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-emerald-400" />
                          <span>apps/{selectedApp.id}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {selectedApp.aiModel && (
                    <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-white/[0.04]">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-teal-400" />
                        AI Engine:
                      </span>
                      <span className="text-teal-300 font-mono text-[11px]">
                        {selectedApp.aiModel}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* MODAL ACTIONS */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    const id = selectedApp.id;
                    setSelectedApp(null);
                    onLaunchApp(id);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/60 transition cursor-pointer"
                >
                  <span>Open {selectedApp.appName || selectedApp.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setSelectedApp(null)}
                  className="py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
