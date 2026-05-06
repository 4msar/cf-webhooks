import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function Home() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const slug = toSlug(value);

  async function handleGetStarted(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) {
      setError('Please enter a valid app name.');
      return;
    }
    setLoading(true);
    setError('');
    setShowCreate(false);
    try {
      const res = await fetch(`/api/apps/${slug}`);
      if (res.ok) {
        navigate(`/${slug}`);
      } else if (res.status === 404) {
        setError(`No app found for "${slug}".`);
        setShowCreate(true);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateApp() {
    if (!slug) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: value.trim() }),
      });
      if (res.ok || res.status === 201) {
        navigate(`/${slug}`);
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to create app.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-900 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Webhook Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">Inspect and debug your incoming webhooks</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
          <form onSubmit={handleGetStarted} className="space-y-4">
            <div>
              <label htmlFor="app-name" className="block text-sm font-medium text-neutral-700 mb-1.5">
                App name
              </label>
              <input
                ref={inputRef}
                id="app-name"
                type="text"
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(''); setShowCreate(false); }}
                placeholder="Enter app name"
                autoComplete="off"
                spellCheck={false}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm
                           bg-white text-neutral-900 placeholder-neutral-400
                           focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                           transition-shadow"
              />
              {slug && slug !== value.toLowerCase().trim() && (
                <p className="mt-1 text-xs text-neutral-400">Slug: <span className="font-mono text-neutral-600">{slug}</span></p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !value.trim()}
              className="w-full py-2 px-4 rounded-lg bg-neutral-900 text-white text-sm font-medium
                         hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2
                         transition-colors"
            >
              {loading ? 'Checking…' : 'Get Started'}
            </button>
          </form>

          {/* Create new app option */}
          {showCreate && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-sm text-neutral-600 mb-3">
                Want to create a new app called <span className="font-medium text-neutral-900">"{slug}"</span>?
              </p>
              <button
                onClick={handleCreateApp}
                disabled={loading}
                className="w-full py-2 px-4 rounded-lg border border-neutral-300 text-sm font-medium
                           text-neutral-700 hover:bg-neutral-50 disabled:opacity-50
                           focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2
                           transition-colors"
              >
                {loading ? 'Creating…' : 'Create New App'}
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-neutral-400">
          Send webhooks to <span className="font-mono">/api/&#123;app-name&#125;/webhook</span>
        </p>
      </div>
    </div>
  );
}
