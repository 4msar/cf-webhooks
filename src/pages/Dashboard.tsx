import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import EventsTable, { type WebhookEvent } from '../components/EventsTable';
import { addRecentApp } from '../lib/recentApps';

const REFRESH_OPTIONS = [
  { label: '10s', value: 10 },
  { label: '20s', value: 20 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
] as const;

function formatLastRefresh(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function Dashboard() {
  const { appSlug } = useParams<{ appSlug: string }>();
  const navigate = useNavigate();

  const [appName, setAppName] = useState('');
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshInterval, setRefreshInterval] = useState<20 | 30 | 60>(30);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [truncateConfirm, setTruncateConfirm] = useState(false);
  const [truncating, setTruncating] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const truncateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTruncate = useCallback(async () => {
    if (!appSlug) return;
    setTruncating(true);
    try {
      await fetch(`/api/${appSlug}/events`, { method: 'DELETE' });
      setEvents([]);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Truncate error:', err);
    } finally {
      setTruncating(false);
      setTruncateConfirm(false);
    }
  }, [appSlug]);

  const requestTruncateConfirm = useCallback(() => {
    setTruncateConfirm(true);
    if (truncateTimerRef.current) clearTimeout(truncateTimerRef.current);
    truncateTimerRef.current = setTimeout(() => setTruncateConfirm(false), 4000);
  }, []);

  // Fetch events (merges by ID to preserve expanded rows)
  const fetchEvents = useCallback(
    async (isManual = false) => {
      if (!appSlug) return;
      if (isManual) setRefreshing(true);
      try {
        const res = await fetch(`/api/${appSlug}/events`);
        if (res.status === 404) {
          navigate('/');
          return;
        }
        if (!res.ok) {
          console.error('Failed to fetch events', res.status);
          return;
        }
        const data = (await res.json()) as WebhookEvent[];
        // Merge: replace list but keep stable references so React doesn't re-render unchanged rows
        setEvents((prev) => {
          if (prev.length === 0) return data;
          // Check if content changed by comparing first + last IDs and length
          const same =
            prev.length === data.length &&
            prev[0]?.id === data[0]?.id &&
            prev[prev.length - 1]?.id === data[data.length - 1]?.id;
          return same ? prev : data;
        });
        setLastRefresh(new Date());
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setRefreshing(false);
      }
    },
    [appSlug, navigate],
  );

  // Initial load: validate app then fetch events
  useEffect(() => {
    if (!appSlug) {
      navigate('/');
      return;
    }
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/apps/${appSlug}`);
        if (res.status === 404) {
          navigate('/');
          return;
        }
        if (!res.ok) {
          setError('Failed to load app.');
          return;
        }
        const app = (await res.json()) as { name: string; slug: string };
        setAppName(app.name);
        addRecentApp(app.slug, app.name);
        await fetchEvents();
      } catch {
        setError('Network error. Please reload.');
      } finally {
        setLoading(false);
      }
    })();
  }, [appSlug, navigate, fetchEvents]);

  // Auto-refresh interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      void fetchEvents();
    }, refreshInterval * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshInterval, fetchEvents]);

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/${appSlug}/webhook`
      : `/api/${appSlug}/webhook`;

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/" className="text-sm text-neutral-600 underline">← Go back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top nav */}
      <header className="sticky top-0 z-20 bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="text-neutral-400 hover:text-neutral-700 transition-colors shrink-0" aria-label="Home">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="w-px h-4 bg-neutral-200 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-neutral-900 truncate">
                {appName || appSlug}
              </h1>
              <p className="text-xs text-neutral-400 font-mono truncate">{webhookUrl}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Refresh interval selector */}
            <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
              {REFRESH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRefreshInterval(opt.value as 20 | 30 | 60)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    refreshInterval === opt.value
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Truncate events */}
            {truncateConfirm ? (
              <button
                onClick={() => void handleTruncate()}
                disabled={truncating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300
                           bg-red-50 text-xs font-medium text-red-600 hover:bg-red-100
                           disabled:opacity-50 transition-colors"
                aria-label="Confirm delete all events"
              >
                {truncating ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                )}
                Confirm delete?
              </button>
            ) : (
              <button
                onClick={requestTruncateConfirm}
                disabled={events.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200
                           text-xs font-medium text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Delete all events"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Truncate
              </button>
            )}

            {/* Manual refresh */}
            <button
              onClick={() => void fetchEvents(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200
                         text-xs font-medium text-neutral-600 hover:bg-neutral-50
                         disabled:opacity-50 transition-colors"
              aria-label="Refresh now"
            >
              <svg
                className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Endpoint info + stats bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500">
              <span className="font-medium text-neutral-900">{events.length}</span> event{events.length !== 1 ? 's' : ''}
            </span>
            {loading && (
              <span className="flex items-center gap-1 text-xs text-neutral-400">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading…
              </span>
            )}
          </div>
          <span className="text-xs text-neutral-400">
            Last updated: <span className="tabular-nums">{formatLastRefresh(lastRefresh)}</span>
          </span>
        </div>

        {/* Webhook endpoint snippet */}
        <div className="mb-5 flex items-center gap-2 p-3 bg-neutral-900 rounded-xl">
          <span className="text-xs font-medium text-emerald-400 shrink-0">POST</span>
          <code className="text-xs text-neutral-300 font-mono flex-1 truncate">{webhookUrl}</code>
          <CopyButton text={webhookUrl} />
        </div>

        {/* Events table */}
        <EventsTable events={events} loading={loading} />
      </main>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="shrink-0 text-neutral-400 hover:text-white transition-colors"
      aria-label="Copy URL"
    >
      {copied ? (
        <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
      )}
    </button>
  );
}
