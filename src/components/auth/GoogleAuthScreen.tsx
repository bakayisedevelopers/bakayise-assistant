import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FigmaIcon } from '../ui/FigmaIcon';
import {
  ShieldAlert,
  Lock,
  Loader2,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { ALLOWED_EMAILS_MAP } from '../../utils/authConstants';

export const GoogleAuthScreen: React.FC = () => {
  const {
    signInWithGoogle,
    signInAsMember,
    blockedEmail,
    authError,
    isUnauthorizedDomain,
    clearBlockedState,
  } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signingInMemberEmail, setSigningInMemberEmail] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseSettingsUrl = 'https://console.firebase.google.com/project/bakayise-assistant/authentication/settings';

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleMemberClick = async (email: string) => {
    setSigningInMemberEmail(email);
    try {
      await signInAsMember(email);
    } finally {
      setSigningInMemberEmail(null);
    }
  };

  const handleCopyDomain = () => {
    if (!currentHost) return;
    navigator.clipboard.writeText(currentHost);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  const allowedMembers = Object.values(ALLOWED_EMAILS_MAP).filter(
    (m, idx, self) => self.findIndex((s) => s.email === m.email) === idx
  );

  return (
    <div className="min-h-screen bg-[#0C0C0E] text-slate-100 flex flex-col justify-center items-center px-4 py-8 selection:bg-emerald-500 selection:text-black">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[300px] bg-rose-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-lg bg-[#161618] border border-white/10 rounded-[28px] p-6 sm:p-8 shadow-2xl shadow-black/80 relative">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[22px] bg-gradient-to-tr from-[#248A3D] via-[#30D158] to-[#34C759] text-white shadow-xl shadow-emerald-950/60 border border-white/25 mb-4">
            <FigmaIcon name="wallet" size="lg" strokeWidth={2.4} />
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Bakayise Budget
          </h1>
          <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            Private Zero-Based Family Budgeting & Multi-Account Wealth Tracker
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#30D158] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Connected to Firebase: bakayise-assistant</span>
          </div>
        </div>

        {/* ACCESS BLOCKED STATE (If an unauthorized email tried to sign in) */}
        {blockedEmail ? (
          <div className="space-y-6">
            <div className="p-4 rounded-[20px] bg-red-500/10 border border-red-500/30 text-left">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-200">
                    Access Blocked: Unauthorized Email
                  </h3>
                  <p className="text-xs text-red-300/90 mt-1 leading-relaxed">
                    The Google account <strong className="text-white font-mono">{blockedEmail}</strong> is not authorized to access this private budget.
                  </p>
                  <p className="text-xs text-slate-400 mt-2 bg-black/30 p-2.5 rounded-[10px] border border-white/5">
                    ⛔ You are not allowed to access unless you are explicitly added to the list of allowed family emails.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-[16px] bg-white hover:bg-slate-100 text-black font-semibold text-sm transition-all shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
                  <span>Signing in with Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Try Another Google Account</span>
                </>
              )}
            </button>

            <div className="text-center">
              <button
                onClick={clearBlockedState}
                className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4 cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD / UNAUTHORIZED DOMAIN STATE */
          <div className="space-y-6">
            
            {/* DOMAIN AUTHORIZATION GUIDE (Shown if Firebase threw auth/unauthorized-domain) */}
            {isUnauthorizedDomain && (
              <div className="p-4 rounded-[20px] bg-amber-500/10 border border-amber-500/30 text-left space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-[12px] bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-200">
                      Firebase Domain Authorization Required
                    </h3>
                    <p className="text-xs text-amber-300/90 mt-1 leading-relaxed">
                      Firebase Auth restricts Google popup sign-in until this hosting domain is added to your project's Authorized Domains.
                    </p>
                  </div>
                </div>

                {/* Domain Copy Box */}
                <div className="bg-black/50 p-3 rounded-[14px] border border-amber-500/20 space-y-2">
                  <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Preview Hostname to Authorize:</span>
                    <button
                      onClick={handleCopyDomain}
                      className="flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 transition cursor-pointer"
                    >
                      {copiedDomain ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Domain</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-amber-100 bg-black/40 p-2 rounded-lg border border-white/5 break-all select-all">
                    {currentHost}
                  </div>
                </div>

                {/* Instructions & Direct Link */}
                <div className="text-xs text-slate-300 space-y-1.5 pt-1">
                  <div className="font-semibold text-white text-[11px] uppercase tracking-wider">
                    Quick Fix Steps:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                    <li>
                      <a
                        href={firebaseSettingsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-amber-300 hover:underline font-medium"
                      >
                        <span>Open Firebase Auth Settings</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>Scroll down to <strong className="text-slate-200">Authorized domains</strong> and click <strong className="text-slate-200">Add domain</strong>.</li>
                    <li>Paste the copied domain above and click <strong className="text-slate-200">Save</strong>.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* General Auth Error Notice (if not already the domain alert) */}
            {authError && !isUnauthorizedDomain && (
              <div className="p-3.5 rounded-[14px] bg-red-500/10 border border-red-500/30 text-red-300 text-xs leading-relaxed">
                {authError}
              </div>
            )}

            {/* Google Sign In Button */}
            <div className="space-y-3">
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-[16px] bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition-all shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer disabled:opacity-40 border border-white/20"
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
                    <span>Connecting Google Auth...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{isUnauthorizedDomain ? 'Retry Google Sign-In' : 'Sign in with Google'}</span>
                  </>
                )}
              </button>
            </div>

            {/* QUICK FAMILY MEMBER ACCESS SECTION */}
            <div className="pt-4 border-t border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Quick Family Access
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-medium">
                  1-Click Entry
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-normal">
                Select your whitelisted family account to enter directly without being blocked by OAuth domain restrictions:
              </p>

              <div className="space-y-2">
                {allowedMembers.map((m) => {
                  const isPending = signingInMemberEmail === m.email;
                  return (
                    <button
                      key={m.email}
                      onClick={() => handleMemberClick(m.email)}
                      disabled={Boolean(signingInMemberEmail)}
                      className="w-full p-3 rounded-[16px] bg-[#1F1F22] hover:bg-[#252529] border border-white/10 hover:border-emerald-500/40 text-left transition flex items-center justify-between group cursor-pointer disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border border-white/10"
                          style={{ backgroundColor: `${m.avatarColor}25`, color: m.avatarColor }}
                        >
                          {m.displayName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{m.displayName}</span>
                            <span className="text-[10px] font-normal text-slate-400">({m.role})</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {m.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 group-hover:text-emerald-400 transition shrink-0 pl-2">
                        {isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        ) : (
                          <>
                            <span className="hidden sm:inline text-[11px]">Enter</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 justify-center pt-2 text-[11px] text-slate-500">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Restricted to authorized Bakayise family members only</span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Footer Branding */}
      <footer className="mt-8 text-center text-xs text-slate-500 flex items-center gap-1.5">
        <span>Bakayise Zero-Based Budget</span>
        <span>•</span>
        <span>Dave Ramsey 7 Baby Steps</span>
      </footer>
    </div>
  );
};

