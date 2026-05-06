import { useState, useCallback } from 'react';
import JsonViewer from './JsonViewer';

export interface WebhookEvent {
  id: number;
  app_id: number;
  event_type: string | null;
  payload: string;
  headers: string;
  created_at: string;
}

interface EventsTableProps {
  events: WebhookEvent[];
  loading: boolean;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function EventTypeBadge({ type }: { type: string | null }) {
  if (!type) {
    return <span className="text-neutral-400 italic text-xs">—</span>;
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-xs font-mono font-medium">
      {type}
    </span>
  );
}

function ExpandedRow({ event }: { event: WebhookEvent }) {
  return (
    <div className="px-4 pb-4 pt-2 grid gap-4 sm:grid-cols-2 bg-neutral-50">
      <JsonViewer data={event.payload} title="Payload" />
      <JsonViewer data={event.headers} title="Request Headers" />
    </div>
  );
}

export default function EventsTable({ events, loading }: EventsTableProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleRow = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading events…
      </div>
    );
  }

  if (!loading && events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <svg className="w-10 h-10 mb-3 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
        <p className="text-sm font-medium">No events yet</p>
        <p className="text-xs mt-1">Send a POST request to your webhook endpoint</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10">
            <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider w-14 sm:w-20">ID</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Event Type</th>
            <th className="hidden sm:table-cell px-4 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Created At</th>
            <th className="px-4 py-3 w-8" aria-hidden="true" />
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 bg-white">
          {events.map((event) => {
            const isOpen = expanded.has(event.id);
            return (
              <tr
                key={event.id}
                className="group"
              >
                <td colSpan={4} className="p-0">
                  {/* Summary row — acts as click target */}
                  <button
                    type="button"
                    onClick={() => toggleRow(event.id)}
                    className="w-full grid grid-cols-[3.5rem_1fr_2rem] sm:grid-cols-[5rem_1fr_14rem_2rem] items-center
                               px-4 py-3 text-left cursor-pointer
                               hover:bg-neutral-50 transition-colors
                               focus:outline-none focus:bg-neutral-50"
                    aria-expanded={isOpen}
                  >
                    {/* ID */}
                    <span className="font-mono text-xs text-neutral-400">#{event.id}</span>

                    {/* Event type */}
                    <span><EventTypeBadge type={event.event_type} /></span>

                    {/* Timestamp — hidden on mobile */}
                    <span className="hidden sm:block text-xs text-right text-neutral-500 tabular-nums">{formatDate(event.created_at)}</span>

                    {/* Chevron */}
                    <span className="flex justify-end">
                      <svg
                        className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>

                  {/* Accordion body */}
                  <div className={`accordion-content ${isOpen ? 'open' : ''}`}>
                    <div className="accordion-inner">
                      <ExpandedRow event={event} />
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
