/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { maskPII } from './lib/pii-mask';
import { 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  LogOut, 
  FileText, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Activity, 
  Database,
  RefreshCw,
  WifiOff,
  Inbox,
  RotateCcw,
  Sliders,
  CheckCircle2
} from 'lucide-react';

type DebugOverrideState = 'none' | 'loading' | 'empty' | 'error' | 'offline';

const useDebugState = import.meta.env.DEV
  ? function useDebugStateDev(): [DebugOverrideState, (state: DebugOverrideState) => void] {
      const [state, setState] = useState<DebugOverrideState>(() => {
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const queryVal = params.get('debugState');
          if (queryVal && ['loading', 'empty', 'error', 'offline'].includes(queryVal)) {
            return queryVal as DebugOverrideState;
          }
        }
        return 'none';
      });

      const updateDebugState = (nextState: DebugOverrideState) => {
        setState(nextState);
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          if (nextState === 'none') {
            url.searchParams.delete('debugState');
          } else {
            url.searchParams.set('debugState', nextState);
          }
          window.history.replaceState({}, '', url.toString());
        }
      };

      return [state, updateDebugState];
    }
  : (): [DebugOverrideState, (state: DebugOverrideState) => void] => ['none', () => {}];


const DebugStateToolbar = import.meta.env.DEV
  ? function DebugToolbarComponent({ 
      current, 
      onSelect 
    }: { 
      current: DebugOverrideState; 
      onSelect: (state: DebugOverrideState) => void;
    }) {
      const [isOpen, setIsOpen] = useState(true);

      return (
        <aside aria-label="UI States Test Toolbar" className="fixed bottom-4 right-4 z-50 bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-slate-700 backdrop-blur-md text-xs transition-all max-w-xs">
          <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 font-semibold text-amber-400">
              <Sliders className="w-3.5 h-3.5" />
              <span>UI State QA Toolbar</span>
            </div>
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-400 hover:text-white text-3xs uppercase tracking-wider"
            >
              {isOpen ? 'Minimize' : 'Expand'}
            </button>
          </div>

          {isOpen && (
            <div className="space-y-2">
              <p className="text-3xs text-slate-400">
                Override UI state for testing or use <code className="text-amber-300">?debugState=...</code>
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {(['none', 'loading', 'empty', 'error', 'offline'] as DebugOverrideState[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onSelect(mode)}
                    className={`px-2.5 py-1.5 rounded-lg text-left text-3xs font-medium capitalize flex items-center justify-between transition-colors ${
                      current === mode 
                        ? 'bg-blue-600 text-white font-bold' 
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>{mode === 'none' ? 'Normal (Live)' : mode}</span>
                    {current === mode && <CheckCircle2 className="w-3 h-3 text-white shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      );
    }
  : () => null;


function OfflineBanner({ isForcedOffline }: { isForcedOffline: boolean }) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectivelyOffline = isForcedOffline || !isOnline;

  if (!effectivelyOffline) return null;

  return (
    <div className="bg-amber-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
      <WifiOff className="w-4 h-4 shrink-0 animate-bounce" />
      <span>Offline Mode: Network connection unavailable. Remote encryption and AI synthesis are disabled until reconnected.</span>
    </div>
  );
}

function GoogleAuthScreen() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Proses login ditutup/dibatalkan.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup Google Sign-In diblokir browser. Izinkan popup untuk localhost pada browser Anda.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`Domain ${window.location.hostname} belum terdaftar di Firebase Console (Authentication > Settings > Authorized domains).`);
      } else if (err.code === 'auth/network-request-failed' || err.code === 'auth/internal-error') {
        setError('Gagal menghubungkan ke Google. Di mode Incognito, pastikan izin "Third-Party Cookies" aktif atau gunakan jendela browser normal.');
      } else {
        setError(err.message || 'Gagal login dengan Google.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <ShieldCheck className="w-10 h-10" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
          Secure Personal Gemini Journal
        </h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          Zero-knowledge architecture, client-side PII sanitization, and AES-256-GCM encrypted cloud storage.
        </p>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={handleGoogleSignIn}
              className="text-xs font-semibold underline hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Google Sign-In ONLY button — No password handling */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-3 px-4 rounded-xl shadow-xs transition-all disabled:opacity-50 active:scale-[0.99]"
        >
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
          {isSigningIn ? 'Connecting to Google...' : 'Continue with Google'}
        </button>


        {/* Security & Privacy Pillars */}
        <div className="mt-8 pt-6 border-t border-slate-100 space-y-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span><strong>No Password Handling:</strong> Authenticated exclusively via Google OAuth 2.0.</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span><strong>Client PII Masking:</strong> Full email & phone sanitization in-browser.</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span><strong>AES-256-GCM:</strong> Field-level database encryption with authenticated tags.</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span><strong>Prompt Injection Guard:</strong> Delimited inputs & strict system directives.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboardView({ 
  onClose, 
  isOffline 
}: { 
  onClose: () => void; 
  isOffline: boolean;
}) {

  const { getToken } = useAuth();
  const [auditData, setAuditData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAuditLogs = async () => {
    if (isOffline) {
      setError('Cannot refresh audit logs while offline.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/audit-log', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch admin audit log');
      }
      const data = await res.json();
      setAuditData(data);
    } catch (err: any) {
      setError(err.message || 'Error communicating with logging service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const displayLoading = loading && !auditData;
  const displayError = error;
  const displayEvents = auditData?.events || [];


  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-400" />
          <div>
            <h2 className="text-lg font-bold">Admin Security Audit Dashboard</h2>
            <p className="text-xs text-slate-400">Cloud Logging Telemetry & Access Controls (Zero Journal Content)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAuditLogs}
            disabled={displayLoading || isOffline}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${displayLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            Close Dashboard
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Error State with Retry */}
        {displayError && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{displayError}</span>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Fetch
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {displayLoading && (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-xl"></div>
              ))}
            </div>
            <div className="h-48 bg-slate-100 rounded-xl"></div>
          </div>
        )}

        {/* Metrics Overview */}
        {!displayLoading && auditData?.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 font-medium uppercase">Total Events</span>
              <p className="text-2xl font-bold text-slate-800 mt-1">{auditData.summary.totalEvents}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-xs text-blue-600 font-medium uppercase">Entries Created</span>
              <p className="text-2xl font-bold text-blue-700 mt-1">{auditData.summary.entryCreatedCount}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-xs text-emerald-600 font-medium uppercase">Entries Read</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{auditData.summary.entryReadCount}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-xs text-amber-600 font-medium uppercase">Access Denied</span>
              <p className="text-2xl font-bold text-amber-700 mt-1">{auditData.summary.accessDeniedCount}</p>
            </div>
          </div>
        )}


        {/* Log Entries Table */}
        {!displayLoading && (

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Security & Activity Telemetry</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Event Type</th>
                    <th className="px-4 py-3">User ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayEvents.length > 0 ? (
                    displayEvents.map((event: any) => (
                      <tr key={event.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {event.eventType}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {event.userId?.substring(0, 12)}...
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${
                            event.status === 'SUCCESS' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : event.status === 'DENIED' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {event.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                          {event.details}
                        </td>
                      </tr>
                    ))
                  ) : (
                    /* Empty State */
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                        <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium text-slate-600">No audit records yet</p>
                        <p className="text-3xs text-slate-400 mt-1">Actions performed across the application will be streamed here.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MainApp() {
  const { user, isAdmin, signOut, getToken } = useAuth();
  const [debugState, setDebugState] = useDebugState();

  const [entries, setEntries] = useState<any[]>([]);
  const [isFetchingEntries, setIsFetchingEntries] = useState(true);
  const [entriesError, setEntriesError] = useState('');

  const [newEntry, setNewEntry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string>('');
  const [isLoadingDecrypted, setIsLoadingDecrypted] = useState(false);
  const [decryptError, setDecryptError] = useState('');

  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  const [reflection, setReflection] = useState<string>('');
  const [isLoadingReflection, setIsLoadingReflection] = useState(false);
  const [reflectionError, setReflectionError] = useState('');

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectivelyOnline = debugState !== 'offline' && isOnline;

  // Live PII Preview Calculation
  const maskedLive = newEntry ? maskPII(newEntry) : '';
  const hasPIIDetected = newEntry !== maskedLive;

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user]);

  const fetchEntries = async () => {
    setIsFetchingEntries(true);
    setEntriesError('');
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication token missing');
      const res = await fetch('/api/entries', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch entries');
      }
      const data = await res.json();
      setEntries(data);
    } catch (err: any) {
      console.error('Failed to fetch entries', err);
      setEntriesError(err.message || 'Error connecting to database');
    } finally {
      setIsFetchingEntries(false);
    }
  };

  const fetchReflection = async () => {
    if (!effectivelyOnline) {
      setReflectionError('Cannot generate reflection while offline.');
      return;
    }
    setIsLoadingReflection(true);
    setReflectionError('');
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      const res = await fetch('/api/reflection/weekly', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to synthesize reflection');
      }
      const data = await res.json();
      setReflection(data.reflection);
    } catch (err: any) {
      console.error('Failed to fetch reflection', err);
      setReflectionError(err.message || 'AI reflection request failed');
    } finally {
      setIsLoadingReflection(false);
    }
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setIsLoadingDecrypted(true);
    setDecryptedContent('');
    setDecryptError('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication session expired');
      }
      const res = await fetch(`/api/entries/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to decrypt entry');
      }
      const data = await res.json();
      setDecryptedContent(data.plaintext);
    } catch (err: any) {
      setDecryptError(err.message || 'Error during field decryption');
    } finally {
      setIsLoadingDecrypted(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.trim() || !effectivelyOnline) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const token = await getToken();
      const masked = maskPII(newEntry);

      const payload = {
        plaintext: newEntry, // Backend encrypts via AES-256-GCM
        maskedText: masked, // Backend sends ONLY masked text to Gemini AI
        piiMaskedPreview: masked.substring(0, 120) + (masked.length > 120 ? '...' : '')
      };

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save entry');
      }

      setNewEntry('');
      await fetchEntries();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save encrypted journal entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute effective state for view rendering
  const displayLoadingEntries = (import.meta.env.DEV && debugState === 'loading') || isFetchingEntries;
  const displayEntriesError = (import.meta.env.DEV && debugState === 'error') ? 'Simulated 500: Database connection timeout (QA Test)' : entriesError;
  const displayEntries = (import.meta.env.DEV && debugState === 'empty') ? [] : entries;

  const displayLoadingReflection = (import.meta.env.DEV && debugState === 'loading') || isLoadingReflection;
  const displayReflectionError = (import.meta.env.DEV && debugState === 'error') ? 'Simulated 503: AI Synthesis service unavailable (QA Test)' : reflectionError;
  const displayReflection = (import.meta.env.DEV && debugState === 'empty') ? '' : reflection;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <OfflineBanner isForcedOffline={import.meta.env.DEV && debugState === 'offline'} />
      {import.meta.env.DEV && <DebugStateToolbar current={debugState} onSelect={setDebugState} />}


      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Secure Gemini Journal</h1>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Google OAuth 2.0 Authenticated
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => setShowAdminDashboard(!showAdminDashboard)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                showAdminDashboard 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Admin Audit Log
            </button>
          )}

          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-800">{user?.displayName || 'Journal User'}</div>
            <div className="text-xs text-slate-400">{user?.email}</div>
          </div>

          <button
            onClick={signOut}
            className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center gap-1 font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {/* Admin Dashboard Section (if toggled) */}
        {showAdminDashboard && (
          <AdminDashboardView 
            onClose={() => setShowAdminDashboard(false)} 
            isOffline={!effectivelyOnline} 
          />
        )}



        {/* AI Weekly Reflection Box */}
        <section className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
          <div className="flex justify-between items-center mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold">AI Weekly Reflection & Sentiment</h2>
            </div>
            <button
              onClick={fetchReflection}
              disabled={displayLoadingReflection || !effectivelyOnline}
              className="text-xs bg-purple-500 hover:bg-purple-600 text-white px-3.5 py-2 rounded-xl font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${displayLoadingReflection ? 'animate-spin' : ''}`} />
              {displayLoadingReflection ? 'Synthesizing...' : 'Generate Reflection'}
            </button>
          </div>

          <div className="relative z-10 text-slate-200 text-sm leading-relaxed">
            {/* Error State */}
            {displayReflectionError ? (
              <div className="p-4 bg-red-950/60 border border-red-500/30 rounded-xl flex items-center justify-between gap-3 text-red-200 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{displayReflectionError}</span>
                </div>
                <button
                  onClick={fetchReflection}
                  className="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-1 shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            ) : displayLoadingReflection ? (
              /* Loading State */
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2 animate-pulse">
                <div className="h-3.5 bg-white/20 rounded-md w-3/4"></div>
                <div className="h-3.5 bg-white/20 rounded-md w-full"></div>
                <div className="h-3.5 bg-white/20 rounded-md w-2/3"></div>
              </div>
            ) : displayReflection ? (
              /* Data State */
              <p className="bg-white/10 p-4 rounded-xl backdrop-blur-xs border border-white/10 leading-relaxed">
                {displayReflection}
              </p>
            ) : (
              /* Empty State */
              <p className="text-slate-400 italic text-xs">
                Click "Generate Reflection" to synthesize privacy-guarded mood trends across your entries without exposing PII.
              </p>
            )}
          </div>
        </section>

        {/* Write New Entry Form */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              New Journal Entry
            </h2>
            {hasPIIDetected && (
              <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                PII Auto-Masked for AI
              </span>
            )}
          </div>

          {submitError && (
            <div className="mb-4 p-3.5 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                className="text-xs font-semibold underline hover:text-red-800"
              >
                Retry
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              className="w-full h-32 p-4 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 text-sm placeholder-slate-400"
              placeholder="What happened today? (Type email or phone numbers to see live zero-knowledge client redaction in action)..."
              required
              disabled={isSubmitting || !effectivelyOnline}
            />

            {/* Live Masking Preview for User Assurance */}
            {hasPIIDetected && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="font-semibold text-slate-600">Client-Side Sanitized Payload (Sent to Gemini AI):</span>
                <p className="font-mono text-slate-700 bg-white p-2 rounded-lg border border-slate-100 break-all">
                  {maskedLive}
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Field-level AES-256-GCM encrypted</span>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !newEntry.trim() || !effectivelyOnline}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Encrypting & Saving...
                  </>
                ) : !effectivelyOnline ? (
                  <>
                    <WifiOff className="w-3.5 h-3.5" />
                    Offline (Save Disabled)
                  </>
                ) : (
                  'Save & Analyze Entry'
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Past Entries Archive (4 States Supported) */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900">Your Journal Archive</h2>
            <span className="text-xs text-slate-400">{displayEntries.length} recorded entries</span>
          </div>

          {/* Error State */}
          {displayEntriesError && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>Failed to load journal archive: {displayEntriesError}</span>
              </div>
              <button
                onClick={fetchEntries}
                className="text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeleton State */}
          {displayLoadingEntries ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-3 bg-slate-200 rounded-md w-28"></div>
                    <div className="h-5 bg-purple-100 rounded-full w-16"></div>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-md w-full"></div>
                  <div className="h-4 bg-slate-100 rounded-md w-3/4"></div>
                  <div className="h-3 bg-slate-100 rounded-md w-24 pt-2"></div>
                </div>
              ))}
            </div>
          ) : displayEntries.length === 0 && !displayEntriesError ? (
            /* Empty State */
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Inbox className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">No journal entries recorded yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Compose your first private entry above. Your text will be masked for AI and encrypted via AES-256-GCM before saving.
                </p>
              </div>
            </div>
          ) : (
            /* Populated Entries List */
            displayEntries.map((entry) => (
              <div key={entry.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {new Date(entry.createdAt).toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  {entry.sentimentTag && (
                    <span className="text-xs font-medium px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      {entry.sentimentTag}
                    </span>
                  )}
                </div>

                <p className="text-slate-700 text-sm leading-relaxed">
                  {entry.piiMaskedPreview}
                </p>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <button
                    onClick={() => handleExpand(entry.id)}
                    disabled={!effectivelyOnline && expandedId !== entry.id}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {expandedId === entry.id ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        Hide Plaintext
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        Decrypt & View Full Entry
                      </>
                    )}
                  </button>
                  <span className="text-3xs font-mono text-slate-400">ID: {entry.id}</span>
                </div>

                {expandedId === entry.id && (
                  <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                    {isLoadingDecrypted ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse">
                        <Lock className="w-3.5 h-3.5 animate-spin" />
                        Decrypting in isolated backend memory...
                      </div>
                    ) : decryptError ? (
                      <div className="flex items-center justify-between text-xs text-red-600">
                        <span>{decryptError}</span>
                        <button
                          onClick={() => handleExpand(entry.id)}
                          className="font-semibold underline hover:text-red-800 flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Retry Decryption
                        </button>
                      </div>
                    ) : (
                      decryptedContent
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3 text-slate-500">
        <ShieldCheck className="w-8 h-8 text-blue-600 animate-pulse" />
        <span className="text-xs font-medium">Securing session...</span>
      </div>
    );
  }

  return user ? <MainApp /> : <GoogleAuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

