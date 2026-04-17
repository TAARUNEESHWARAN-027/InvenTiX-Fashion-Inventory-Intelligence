import React, { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import {
  AlertTriangle, ShieldAlert, CheckCircle,
  XCircle, ArrowUpCircle, Snowflake, Clock, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../lib/socket';
import { PageWrapper } from '../../components/shared/PageWrapper';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorCard } from '../../components/shared/ErrorCard';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AnomalyFlag {
  id: string;
  entity_type: string;
  entity_id: string;
  anomaly_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  notes: string | null;
  status: string;
  created_at: string;
}

// ── Config ────────────────────────────────────────────────────────────────────
const severityConfig = {
  critical: { label: 'Critical', pill: 'bg-danger/15 text-danger border border-danger/30',     sort: 0 },
  high:     { label: 'High',     pill: 'bg-orange-500/10 text-orange-400 border border-orange-500/20', sort: 1 },
  medium:   { label: 'Medium',   pill: 'bg-amber/10 text-amber border border-amber/20',         sort: 2 },
  low:      { label: 'Low',      pill: 'bg-gray-500/10 text-gray-400 border border-gray-500/20', sort: 3 },
};

const typeLabels: Record<string, string> = {
  dead_stock_warning:      'Dead Stock Warning',
  low_stock:               'Low Stock Alert',
  credit_risk:             'Credit Risk',
  sudden_stock_spike:      'Sudden Stock Spike',
  zero_sell_through_cliff: 'Zero Sell-Through Cliff',
  ghost_restock:           'Ghost Restock',
  repeated_damage:         'Repeated Damage',
  unusual_activity:        'Unusual Activity',
};

const timeAgo = (d: string) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// ── Freeze Confirmation ───────────────────────────────────────────────────────
const FreezeConfirm: React.FC<{ onConfirm: (reason: string) => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => {
  const [text, setText] = useState('');
  const CONFIRM_WORD = 'FREEZE';
  return (
    <div className="mt-4 p-4 bg-danger/5 border border-danger/30 rounded-xl space-y-3">
      <p className="text-sm text-danger font-semibold">⚠ Destructive action — type <span className="font-black">{CONFIRM_WORD}</span> to confirm</p>
      <input value={text} onChange={e => setText(e.target.value)} placeholder={`Type ${CONFIRM_WORD} to confirm...`}
        className="w-full bg-navy-900 border border-danger/40 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-danger/50" />
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 px-3 py-2 border border-navy-600 text-gray-400 rounded-lg text-xs font-semibold">Cancel</button>
        <button disabled={text !== CONFIRM_WORD} onClick={() => onConfirm('Frozen by admin')}
          className="flex-1 px-3 py-2 bg-danger text-white rounded-lg text-xs font-bold disabled:opacity-40">
          Confirm Freeze
        </button>
      </div>
    </div>
  );
};

// ── Detail Panel ──────────────────────────────────────────────────────────────
const DetailPanel: React.FC<{ anomaly: AnomalyFlag; onResolved: () => void }> = ({ anomaly, onResolved }) => {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showFreeze, setShowFreeze] = useState(false);

  const sev = severityConfig[anomaly.severity];

  const resolve = async (action: string, reason: string = '') => {
    setLoading(true);
    setError('');
    try {
      await api.post(`/admin/anomalies/${anomaly.id}/resolve`, { action, reason: reason || `Admin action: ${action}` });
      setDone(action);
      onResolved();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Action failed');
    } finally {
      setLoading(false);
      setShowFreeze(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="p-6 border-b border-navy-700">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-lg font-bold text-white leading-snug">
            {typeLabels[anomaly.anomaly_type] || anomaly.anomaly_type}
          </h2>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${sev.pill}`}>
            {sev.label}
          </span>
        </div>
        <div className="space-y-1.5 text-xs text-gray-500">
          <div className="flex gap-2">
            <span className="text-gray-600 w-24 shrink-0">Entity Type</span>
            <span className="text-gray-300 capitalize">{anomaly.entity_type.replace('_', ' ')}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-600 w-24 shrink-0">Entity ID</span>
            <span className="text-gray-300 font-mono">{anomaly.entity_id}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-600 w-24 shrink-0">Status</span>
            <span className="capitalize text-gray-300">{anomaly.status}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-600 w-24 shrink-0">Detected</span>
            <span className="text-gray-300">{new Date(anomaly.created_at).toLocaleString('en-IN')} ({timeAgo(anomaly.created_at)})</span>
          </div>
        </div>
      </div>

      {/* Notes / Evidence */}
      {anomaly.notes && (
        <div className="mx-6 mt-5 p-4 bg-navy-900 border border-navy-700 rounded-xl">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Evidence / Notes</p>
          <p className="text-sm text-gray-300 leading-relaxed">{anomaly.notes}</p>
        </div>
      )}

      {/* Actions */}
      {anomaly.status === 'pending' && !done && (
        <div className="mx-6 mt-5 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin Actions</p>

          {error && <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs rounded-lg">{error}</div>}

          <button onClick={() => resolve('approve')} disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-3 bg-mint/10 hover:bg-mint/20 border border-mint/30 text-mint font-semibold text-sm rounded-xl transition-all">
            <CheckCircle className="w-4 h-4" />
            Approve — Mark as Reviewed
          </button>
          <button onClick={() => resolve('reject')} disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/20 text-gray-400 font-semibold text-sm rounded-xl transition-all">
            <XCircle className="w-4 h-4" />
            Reject — False Positive
          </button>
          <button onClick={() => resolve('escalate')} disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-3 bg-amber/10 hover:bg-amber/20 border border-amber/20 text-amber font-semibold text-sm rounded-xl transition-all">
            <ArrowUpCircle className="w-4 h-4" />
            Escalate — Needs Senior Review
          </button>
          <button onClick={() => setShowFreeze(v => !v)} disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-3 bg-danger/10 hover:bg-danger/15 border border-danger/30 text-danger font-semibold text-sm rounded-xl transition-all">
            <Snowflake className="w-4 h-4" />
            Freeze SKU — Halt All Stock Changes
          </button>
          <AnimatePresence>
            {showFreeze && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <FreezeConfirm onConfirm={(reason) => resolve('freeze', reason)} onCancel={() => setShowFreeze(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {done && (
        <div className="mx-6 mt-5 p-5 bg-navy-900 border border-navy-700 rounded-xl text-center">
          <CheckCircle className="w-8 h-8 text-mint mx-auto mb-2" />
          <p className="text-white font-semibold capitalize">Anomaly {done}d</p>
          <p className="text-gray-500 text-xs mt-1">Status has been updated successfully.</p>
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const Anomalies: React.FC = () => {
  const [anomalies, setAnomalies] = useState<AnomalyFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AnomalyFlag | null>(null);

  const [error, setError] = useState<string | null>(null);

  const fetchAnomalies = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/admin/anomalies').then(r => {
      const sorted = [...r.data].sort((a, b) =>
        (severityConfig[a.severity]?.sort ?? 9) - (severityConfig[b.severity]?.sort ?? 9)
      );
      setAnomalies(sorted);
      if (!selected && sorted.length > 0) setSelected(sorted[0]);
    }).catch(e => setError('Failed to load pending anomalies.')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAnomalies(); }, [fetchAnomalies]);

  useSocket('anomaly_resolved', useCallback((payload: any) => {
    setAnomalies(prev => {
      const next = prev.filter(a => a.id !== payload.flag_id);
      if (selected?.id === payload.flag_id) {
        setSelected(next.length > 0 ? next[0] : null);
      }
      return next;
    });
  }, [selected]));

  if (error) return <PageWrapper title="Anomalies"><ErrorCard message={error} onRetry={fetchAnomalies} /></PageWrapper>;
  if (loading && anomalies.length === 0) return <PageWrapper title="Anomalies"><LoadingSpinner message="Fetching anomalous records..." /></PageWrapper>;

  return (
    <PageWrapper title="Anomalies">
      <div className="flex gap-6 h-full -m-2">
        {/* Left List */}
      <div className="w-[38%] bg-navy-800 border border-navy-700 rounded-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-navy-700 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-danger" />
          <h2 className="font-bold text-white">Pending Anomalies</h2>
          <span className="ml-auto text-xs font-black text-white px-2 py-0.5 bg-danger rounded-full">{anomalies.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-navy-700/50">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-navy-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-navy-700 rounded w-1/2" />
              </div>
            ))
          ) : anomalies.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No pending anomalies" description="All clear. No active records require admin attention." />
          ) : anomalies.map(a => {
            const sev = severityConfig[a.severity];
            const isSelected = selected?.id === a.id;
            return (
              <button key={a.id} onClick={() => setSelected(a)}
                className={`w-full text-left px-5 py-4 transition-all ${isSelected ? 'bg-navy-700/50 border-l-2 border-electric' : 'hover:bg-navy-700/20'}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {a.severity === 'critical' && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute h-full w-full rounded-full bg-danger opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-danger" />
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sev.pill}`}>{sev.label}</span>
                  <span className="text-[10px] text-gray-500 ml-auto flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {timeAgo(a.created_at)}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white leading-snug">{typeLabels[a.anomaly_type] || a.anomaly_type}</p>
                <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">{a.entity_type} · {a.entity_id.slice(0, 14)}…</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Detail */}
      <div className="flex-1 bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden">
        <AnimatePresence mode="wait">
          {!selected ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col h-full items-center justify-center text-center p-8">
              <ShieldAlert className="w-12 h-12 text-gray-600 mb-3" />
              <p className="text-gray-400 font-semibold">Select an anomaly to review</p>
            </motion.div>
          ) : (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }} className="h-full overflow-y-auto pb-8">
              <DetailPanel anomaly={selected} onResolved={fetchAnomalies} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </PageWrapper>
  );
};
