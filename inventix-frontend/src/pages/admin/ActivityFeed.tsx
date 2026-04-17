import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../lib/api';
import { socket, useSocket } from '../../lib/socket';
import { Activity, Filter, Download, Search, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageWrapper } from '../../components/shared/PageWrapper';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorCard } from '../../components/shared/ErrorCard';

// ── Types ─────────────────────────────────────────────────────────────────────
interface FeedEvent {
  id: string;
  quantity_delta: number;
  reason_code: string;
  ip_address: string;
  created_at: string;
  size: string;
  colour: string;
  sku_name: string;
  category: string;
  season: string;
  manufacturer_name: string;
  manufacturer_city: string;
  updated_by_email: string;
  updated_by_role: string;
  _isNew?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const timeAgo = (d: string) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const reasonColor: Record<string, string> = {
  'Restock':             'bg-mint/10 text-mint border-mint/20',
  'Production Complete': 'bg-electric/10 text-electric border-electric/20',
  'Damaged':             'bg-danger/10 text-danger border-danger/20',
  'QC Failed':           'bg-danger/10 text-danger border-danger/20',
  'Return Received':     'bg-amber/10 text-amber border-amber/20',
  'Transfer Out':        'bg-violet/10 text-violet border-violet/20',
};

const exportCsv = (events: FeedEvent[]) => {
  const headers = ['Time', 'Manufacturer', 'SKU', 'Colour', 'Size', 'Delta', 'Reason', 'User', 'IP'];
  const rows = events.map(e => [
    new Date(e.created_at).toISOString(),
    e.manufacturer_name,
    e.sku_name,
    e.colour,
    e.size,
    e.quantity_delta,
    e.reason_code,
    e.updated_by_email,
    e.ip_address,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'inventix-audit.csv'; a.click();
  URL.revokeObjectURL(url);
};

// ── Event Card ────────────────────────────────────────────────────────────────
const EventCard: React.FC<{ event: FeedEvent; isNew?: boolean }> = ({ event, isNew }) => {
  const rc = reasonColor[event.reason_code] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -16, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`bg-navy-800 border rounded-2xl p-4 flex gap-4 items-start ${isNew ? 'border-electric/40 shadow-[0_0_20px_rgba(0,194,255,0.08)]' : 'border-navy-700'}`}
    >
      {/* Delta badge */}
      <div className={`mt-0.5 shrink-0 min-w-[56px] text-center px-2 py-2 rounded-xl font-black text-lg ${event.quantity_delta > 0 ? 'bg-mint/10 text-mint' : 'bg-danger/10 text-danger'}`}>
        {event.quantity_delta > 0 ? '+' : ''}{event.quantity_delta}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-white">{event.sku_name}</span>
          <span className="text-gray-500 text-sm">·</span>
          <span className="text-sm text-gray-400">{event.colour} / {event.size}</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${rc}`}>{event.reason_code}</span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-gray-500">
          <span className="font-semibold text-gray-400">{event.manufacturer_name}</span>
          <span>{event.manufacturer_city}</span>
          <span>·</span>
          <span>{event.updated_by_email}</span>
          <span className="font-mono text-gray-600">{event.ip_address}</span>
        </div>
      </div>

      {/* Time */}
      <div className="shrink-0 text-right">
        <p className="text-xs text-gray-400">{new Date(event.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
        <p className="text-xs text-gray-600 mt-0.5">{timeAgo(event.created_at)}</p>
      </div>
    </motion.div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const ActivityFeed: React.FC = () => {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [mfFilter, setMfFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [liveCount, setLiveCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/admin/feed').then(r => setEvents(r.data)).catch(e => setError('Failed to load activity feed.')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useSocket('stock_update', useCallback((payload: { update: any; variant: any }) => {
    const ev: FeedEvent = {
        id: payload.update.id,
        quantity_delta: payload.update.quantity_delta,
        reason_code: payload.update.reason_code,
        ip_address: payload.update.ip_address || '—',
        created_at: payload.update.created_at || new Date().toISOString(),
        size: payload.variant.size,
        colour: payload.variant.colour,
        sku_name: 'Live Update', // backend doesn't join sku name to the payload but we can show something
        category: '',
        season: '',
        manufacturer_name: 'Live Account',
        manufacturer_city: '',
        updated_by_email: 'System',
        updated_by_role: 'seller',
        _isNew: true,
      };
      setEvents(prev => [ev, ...prev].slice(0, 200));
      setNewIds(prev => new Set([...prev, ev.id]));
      setLiveCount(c => c + 1);
      setTimeout(() => setNewIds(prev => { const s = new Set(prev); s.delete(ev.id); return s; }), 3000);
  }, []));

  // Unique manufacturer names for filter
  const manufacturers = ['All', ...Array.from(new Set(events.map(e => e.manufacturer_name)))];
  const actionTypes   = ['All', ...Array.from(new Set(events.map(e => e.reason_code)))];

  const filtered = events.filter(e => {
    if (mfFilter !== 'All' && e.manufacturer_name !== mfFilter) return false;
    if (actionFilter !== 'All' && e.reason_code !== actionFilter) return false;
    if (search && !e.sku_name.toLowerCase().includes(search.toLowerCase()) &&
        !e.manufacturer_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom && new Date(e.created_at) < new Date(dateFrom)) return false;
    if (dateTo   && new Date(e.created_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  if (error) return <PageWrapper title="Activity Feed"><ErrorCard message={error} onRetry={fetchEvents} /></PageWrapper>;
  if (loading && events.length === 0) return <PageWrapper title="Activity Feed"><LoadingSpinner message="Loading Feed..." /></PageWrapper>;

  return (
    <PageWrapper title="Activity Feed">
      <div className="space-y-5">
        {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Activity Feed</h1>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint/10 border border-mint/20">
            <Wifi className="w-3 h-3 text-mint animate-pulse" />
            <span className="text-xs font-bold text-mint">Live</span>
            {liveCount > 0 && <span className="text-xs font-black text-white ml-1">+{liveCount}</span>}
          </div>
        </div>
        <button
          onClick={() => exportCsv(filtered)}
          className="flex items-center gap-2 px-4 py-2 bg-navy-700 hover:bg-navy-600 border border-navy-600 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Download className="w-4 h-4" /> Export Audit CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-navy-800 border border-navy-700 rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU or manufacturer..."
            className="w-full pl-9 pr-4 py-2.5 bg-navy-900 border border-navy-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric/50" />
        </div>
        <select value={mfFilter} onChange={e => setMfFilter(e.target.value)}
          className="bg-navy-900 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-electric/50">
          {manufacturers.map(m => <option key={m}>{m}</option>)}
        </select>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          className="bg-navy-900 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-electric/50">
          {actionTypes.map(a => <option key={a}>{a}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-navy-900 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-gray-400 focus:outline-none focus:ring-2 focus:ring-electric/50" />
        <span className="text-gray-600 text-sm">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="bg-navy-900 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-gray-400 focus:outline-none focus:ring-2 focus:ring-electric/50" />
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} events</span>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-navy-800 border border-navy-700 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Activity} title="No events found" description="Adjust your filters or wait for new activity." />
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map(ev => (
              <EventCard key={ev.id} event={ev} isNew={newIds.has(ev.id)} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      </div>
    </PageWrapper>
  );
};
