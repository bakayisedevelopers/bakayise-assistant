import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AssistantApp } from '../types';
import { subscribeToAssistantApps } from '../services/appsService';
import {
  Sparkles,
  Calculator,
  BookOpen,
  HeartHandshake,
  Utensils,
  Calendar,
  Layers,
  ArrowRight,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
  X,
  Copy,
  Check,
  KeyRound,
} from 'lucide-react';

interface AssistantHubProps {
  onLaunchApp: (appId: string) => void;
}

export const AssistantHub: React.FC<AssistantHubProps> = ({ onLaunchApp }) => {
  const { user, member, displayName, logout } = useAuth();
  const [apps, setApps] = useState<AssistantApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewApp, setPreviewApp] = useState<AssistantApp | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

  const copyRulesToClipboard = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2000);
  };

  useEffect(() => {
    const unsub = subscribeToAssistantApps((loadedApps) => {
      setApps(loadedApps);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const getAppIcon = (iconName?: string, appId?: string) => {
    switch (iconName || appId) {
      case 'calculator':
      case 'budget':
        return <Calculator className="w-6 h-6 text-emerald-400" />;
      case 'notebook':
      case 'notes':
        return <BookOpen className="w-6 h-6 text-indigo-400" />;
      case 'heart-handshake':
      case 'prayer':
        return <HeartHandshake className="w-6 h-6 text-rose-400" />;
      case 'utensils':
      case 'meals':
        return <Utensils className="w-6 h-6 text-amber-400" />;
      case 'calendar':
        return <Calendar className="w-6 h-6 text-sky-400" />;
      default:
        return <Layers className="w-6 h-6 text-teal-400" />;
    }
  };

  const getAppBadgeColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'finance':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      case 'knowledge':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
      case 'spiritual':
        return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
      case 'lifestyle':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      case 'productivity':
        return 'bg-sky-500/10 text-sky-300 border-sky-500/20';
      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-slate-100 flex flex-col selection:bg-emerald-500/30">
      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-[#12141a]/90 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* LOGO & BRAND */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-white/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white">
                  Bakayise Assistant
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hidden sm:inline-block">
                  Family Suite
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Unified Ecosystem · Connected Apps
              </p>
            </div>
          </div>

          {/* USER PROFILE & LOGOUT */}
          <div className="flex items-center gap-3">
            {member && (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-inner"
                  style={{ backgroundColor: member.avatarColor || '#10b981' }}
                >
                  {displayName ? displayName.charAt(0).toUpperCase() : 'B'}
                </div>
                <div className="text-left hidden md:block leading-tight">
                  <div className="text-xs font-semibold text-white">{displayName}</div>
                  <div className="text-[10px] text-slate-400 capitalize">
                    {member.role === 'Hubby' ? 'Head of Household' : 'Financial Partner'}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/10 text-slate-300 hover:text-rose-300 border border-white/[0.08] hover:border-rose-500/30 text-xs font-medium transition cursor-pointer"
              title="Sign Out of Bakayise Assistant"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        
        {/* HERO SECTION */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161822] via-[#13151c] to-[#0f1015] border border-white/[0.08] p-6 sm:p-10 shadow-2xl">
          {/* Subtle glow circles */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Unified Firebase Authentication & Multi-App Cloud Database</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{displayName}</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              This is your central navigation launcher for all Bakayise Family applications. Launch your active South African zero-based budget, manage income streams and Dave Ramsey debt snowball, or explore planned companion apps.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/30 border border-white/[0.06]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Project: <strong className="text-slate-200">bakayise-assistant</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/30 border border-white/[0.06]">
                <span>Root Collection: <strong className="text-slate-200">/apps</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/30 border border-white/[0.06]">
                <span>Global Identity: <strong className="text-slate-200">/users</strong></span>
              </div>
              <button
                onClick={() => setShowRulesModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
                title="View Firestore Security Rules Guide"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>Firestore Cloud Sync & Rules</span>
              </button>
            </div>
          </div>
        </section>

        {/* APPLICATIONS SECTION */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                Available Applications
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select an application to launch its dedicated workspace.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400 self-start sm:self-auto">
              {apps.length} Applications Registered
            </span>
          </div>

          {/* APP CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => {
              const isActive = app.status === 'active' || app.id === 'budget';

              return (
                <div
                  key={app.id}
                  className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-300 p-6 ${
                    isActive
                      ? 'bg-gradient-to-b from-[#171a24] to-[#12141c] border-emerald-500/30 hover:border-emerald-500/60 shadow-lg shadow-emerald-950/20 hover:shadow-emerald-950/40 hover:-translate-y-0.5'
                      : 'bg-[#13151d]/70 border-white/[0.08] hover:border-white/[0.15] opacity-90'
                  }`}
                >
                  {/* Top Bar: Icon & Category */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${
                          isActive
                            ? 'bg-emerald-500/10 border-emerald-500/30 shadow-emerald-950/50'
                            : 'bg-white/[0.04] border-white/[0.08]'
                        }`}
                      >
                        {getAppIcon(app.icon, app.id)}
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getAppBadgeColor(
                            app.category
                          )}`}
                        >
                          {app.category || 'App'}
                        </span>

                        {isActive ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Connected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <Clock className="w-3 h-3 text-slate-500" />
                            Coming Soon
                          </span>
                        )}
                      </div>
                    </div>

                    {/* App Title & Description */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {app.appName || app.name}
                      </h3>
                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                        {app.appDescription || app.description}
                      </p>
                    </div>

                    {/* Additional Metadata for Budget */}
                    {app.id === 'budget' && (
                      <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Data Subcollection:</span>
                          <span className="font-mono text-emerald-400">/apps/budget/*</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Source Project:</span>
                          <span className="text-slate-300">{app.sourceProject || 'Bagayise-budget'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Migration Status:</span>
                          <span className="text-emerald-400 font-medium">✓ Completed</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ACTION BUTTON */}
                  <div className="pt-6 mt-4">
                    {isActive ? (
                      <button
                        onClick={() => onLaunchApp(app.id)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs tracking-wide shadow-md shadow-emerald-950/60 transition cursor-pointer"
                      >
                        <span>Launch Application</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setPreviewApp(app)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-medium transition cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                        <span>Roadmap Preview</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ROADMAP / ARCHITECTURE INFO CARD */}
        <section className="rounded-2xl bg-[#12141b] border border-white/[0.08] p-6 sm:p-8 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-white">
                How Bakayise Assistant Organizes Family Applications
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                All applications run under a unified root Firestore database. Global users are registered under{' '}
                <code className="px-1.5 py-0.5 rounded bg-black/40 text-emerald-400 font-mono">/users</code>{' '}
                for single sign-on. Each application has a dedicated document inside{' '}
                <code className="px-1.5 py-0.5 rounded bg-black/40 text-emerald-400 font-mono">/apps/{'{appId}'}</code>, with all its operational records housed cleanly in child subcollections (e.g.{' '}
                <code className="px-1.5 py-0.5 rounded bg-black/40 text-emerald-400 font-mono">/apps/budget/incomes</code>,{' '}
                <code className="px-1.5 py-0.5 rounded bg-black/40 text-emerald-400 font-mono">/apps/budget/financial_accounts</code>,{' '}
                <code className="px-1.5 py-0.5 rounded bg-black/40 text-emerald-400 font-mono">/apps/budget/workspaces</code>).
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ROADMAP PREVIEW MODAL */}
      {previewApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-[#161822] border border-white/[0.12] p-6 space-y-5 shadow-2xl">
            <button
              onClick={() => setPreviewApp(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/[0.05] text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center">
                {getAppIcon(previewApp.icon, previewApp.id)}
              </div>
              <div>
                <h4 className="font-bold text-base text-white">{previewApp.appName || previewApp.name}</h4>
                <span className="text-xs text-slate-400">{previewApp.category} Companion App</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {previewApp.appDescription || previewApp.description}
            </p>

            <div className="rounded-xl bg-black/30 border border-white/[0.06] p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Database Path:</span>
                <span className="font-mono text-emerald-400">/apps/{previewApp.id}/*</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Access Status:</span>
                <span className="text-amber-400 font-medium">In Development Roadmap</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>User Sync:</span>
                <span className="text-emerald-400">Unified Single Sign-On Active</span>
              </div>
            </div>

            <button
              onClick={() => setPreviewApp(null)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* FIRESTORE RULES & CLOUD SYNC MODAL */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#161822] border border-white/[0.12] p-6 space-y-5 shadow-2xl">
            <button
              onClick={() => setShowRulesModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/[0.05] text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">Firestore Security Rules</h4>
                <p className="text-xs text-slate-400">Firebase Project: bakayise-assistant</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                To allow seamless real-time cloud sync across your devices and family member accounts, paste these security rules into your Firebase Console:
              </p>
            </div>

            <div className="relative rounded-xl bg-black/60 border border-white/[0.08] p-3.5 font-mono text-[11px] text-emerald-300">
              <pre className="overflow-x-auto whitespace-pre">{FIRESTORE_RULES_SNIPPET}</pre>
              <button
                onClick={copyRulesToClipboard}
                className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-sans font-medium transition cursor-pointer"
              >
                {copiedRules ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Rules</span>
                  </>
                )}
              </button>
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-xs text-slate-400 space-y-1.5">
              <div className="font-semibold text-slate-200">How to publish in 30 seconds:</div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                <li>Click <strong>Open Firebase Console Rules</strong> below.</li>
                <li>Paste the rules snippet into the editor.</li>
                <li>Click the blue <strong>Publish</strong> button in Firebase Console.</li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <a
                href="https://console.firebase.google.com/project/bakayise-assistant/firestore/rules"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-950/40"
              >
                <span>Open Firebase Console Rules</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-slate-500">
        Bakayise Assistant Ecosystem · Connected to bakayise-assistant · Single Sign-On Active
      </footer>
    </div>
  );
};
