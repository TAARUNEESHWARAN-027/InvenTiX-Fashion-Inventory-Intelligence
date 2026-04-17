import React, { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { useSocket } from '../../lib/socket';
import { Search, MapPin, TrendingUp, CreditCard, X, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageWrapper } from '../../components/shared/PageWrapper';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ErrorCard } from '../../components/shared/ErrorCard';
import { EmptyState } from '../../components/shared/EmptyState';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Retailer {
  id: string;
  name: string;
  city: string;
  state: string;
  credit_limit: number;
  credit_used: number;
  risk_score: number;
  total_units_held: number;
  sell_through_rate: number;
  days_since_last_sale: number | null;
  estimated_weeks_cover: number;
  health_status: 'green' | 'yellow' | 'red';
}

interface RetailerDetail {
  id: string;
  name: string;
  city: string;
  state: string;
  credit_limit: number;
  credit_used: number;
  risk_score: number;
  variants: {
    variant_id: string;
    sku_name: string;
    size: string;
    colour: string;
    total_shipped: number;
    total_sold: number;
    units_remaining: number;
    sell_through_rate: number;
    last_sale_date: string | null;
  }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const healthConfig = {
  green:  { label: 'Selling Well', pill: 'glass-mint',   bar: 'bg-mint',   dot: 'bg-mint'   },
  yellow: { label: 'Slowing',      pill: 'glass-amber',  bar: 'bg-amber',  dot: 'bg-amber'  },
  red:    { label: 'Stalled',      pill: 'glass-danger', bar: 'bg-danger', dot: 'bg-danger' },
};

const fmt = (n: number) => n.toLocaleString('en-IN');
const fmtCurrency = (n: number) => `₹${(n / 1000).toFixed(0)}K`;

// ── Log Sell-Through Modal ────────────────────────────────────────────────────
const LogSellThroughModal = ({
  retailer, onClose, onSuccess
}: { retailer: RetailerDetail; onClose: () => void; onSuccess: () => void }) => {
  const [variantId, setVariantId] = useState('');
  const [units, setUnits] = useState(1);
  const [soldAt, setSoldAt] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!variantId || units <= 0) return setError('Select a variant and enter valid units.');
    setLoading(true);
    setError('');
    try {
      await api.post(`/retailers/${retailer.id}/sell-through`, { variant_id: variantId, units_sold: units, sold_at: soldAt });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to log sell-through');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-navy-800 border border-navy-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Log Sell-Through</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-navy-700 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Variant</label>
            <select value={variantId} onChange={e => setVariantId(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-electric/50">
              <option value="">Select variant...</option>
              {retailer.variants.map(v => (
                <option key={v.variant_id} value={v.variant_id}>
                  {v.sku_name} — {v.colour} / {v.size} ({v.units_remaining} remaining)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Units Sold</label>
            <input type="number" min={1} value={units} onChange={e => setUnits(Number(e.target.value))}
              className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-electric/50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Sale Date</label>
            <input type="date" value={soldAt} onChange={e => setSoldAt(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-electric/50" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-navy-600 text-gray-400 hover:text-white rounded-xl text-sm font-semibold">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 px-4 py-3 bg-electric text-navy-900 font-bold text-sm rounded-xl hover:bg-electric-dark disabled:opacity-50">
            {loading ? 'Saving...' : 'Log Sale'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Retailer Health Tile ──────────────────────────────────────────────────────
const RetailerTile = ({ retailer, selected, onClick }: { retailer: Retailer; selected: boolean; onClick: () => void }) => {
  const hc = healthConfig[retailer.health_status];
  const creditPct = retailer.credit_limit > 0 ? (retailer.credit_used / retailer.credit_limit) * 100 : 0;
  const creditDanger = creditPct > 70;

  return (
    <motion.div
      layout
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${selected
          ? 'border-electric/50 bg-navy-700/50 shadow-[0_0_20px_rgba(0,194,255,0.08)]'
          : 'border-navy-700 bg-navy-800 hover:border-navy-600 hover:bg-navy-700/30'
        }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-white text-sm leading-snug">{retailer.name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-500">{retailer.city}, {retailer.state}</span>
          </div>
        </div>
        <span className={hc.pill}>
          {hc.label}
        </span>
      </div>

      {/* Units held + sell-through */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">Units Held</span>
        <span className="text-sm font-bold text-white">{fmt(retailer.total_units_held)}</span>
      </div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-500">Sell-Through</span>
        <span className="text-xs font-bold text-gray-300">{(retailer.sell_through_rate * 100).toFixed(1)}%</span>
      </div>
      <div className="w-full h-1.5 bg-navy-900 rounded-full overflow-hidden mb-3">
        <motion.div
          className={`h-full rounded-full ${hc.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(retailer.sell_through_rate * 100, 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* Credit bar */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Credit Used</span>
        <span className={`text-xs font-bold ${creditDanger ? 'text-danger' : 'text-gray-300'}`}>
          {fmtCurrency(retailer.credit_used)} / {fmtCurrency(retailer.credit_limit)}
        </span>
      </div>
      <div className="w-full h-1.5 bg-navy-900 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${creditDanger ? 'bg-danger' : 'bg-electric'}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(creditPct, 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
};

// ── Right Panel: Retailer Detail ──────────────────────────────────────────────
const RetailerDetail = ({
  retailerId, allRetailers, onRetailerUpdate
}: { retailerId: string; allRetailers: Retailer[]; onRetailerUpdate: () => void }) => {
  const [detail, setDetail] = useState<RetailerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);

  const summary = allRetailers.find(r => r.id === retailerId);
  const hc = summary ? healthConfig[summary.health_status] : healthConfig.green;

  const fetchDetail = useCallback(() => {
    setLoading(true);
    api.get(`/retailers/${retailerId}`).then(r => setDetail(r.data)).finally(() => setLoading(false));
  }, [retailerId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-electric font-mono text-sm tracking-widest animate-pulse">Loading retailer...</div>
    </div>
  );

  if (!detail || !summary) return null;

  const creditPct = detail.credit_limit > 0 ? (detail.credit_used / detail.credit_limit) * 100 : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-navy-700 bg-navy-800">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{detail.name}</h2>
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-sm text-gray-400">{detail.city}, {detail.state}</span>
            </div>
            {summary.days_since_last_sale !== null && (
              <p className="text-xs text-gray-500 mt-1">Last sale {summary.days_since_last_sale} day{summary.days_since_last_sale !== 1 ? 's' : ''} ago</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${hc.pill}`}>{hc.label}</span>
            <button
              onClick={() => setShowLogModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-electric text-navy-900 font-bold text-sm rounded-xl hover:bg-electric-dark transition-all shadow-[0_0_15px_rgba(0,194,255,0.2)]"
            >
              <CheckCircle className="w-4 h-4" /> Log Sale
            </button>
          </div>
        </div>
      </div>

      {/* Credit Card */}
      <div className="p-6 border-b border-navy-700">
        <div className="bg-navy-900 rounded-2xl p-4 border border-navy-700">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-electric" />
            <span className="text-sm font-semibold text-gray-300">Credit Status</span>
            <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${creditPct > 70 ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-mint/10 text-mint border border-mint/20'}`}>
              {creditPct > 70 ? 'At Risk' : 'Healthy'}
            </span>
          </div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-2xl font-bold text-white">₹{fmt(detail.credit_used)}</p>
              <p className="text-xs text-gray-500 mt-0.5">of ₹{fmt(detail.credit_limit)} limit used</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-400">₹{fmt(detail.credit_limit - detail.credit_used)}</p>
              <p className="text-xs text-gray-500">available</p>
            </div>
          </div>
          <div className="w-full h-2 bg-navy-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${creditPct > 70 ? 'bg-danger' : 'bg-electric'}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(creditPct, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-right text-xs text-gray-500 mt-1">{creditPct.toFixed(1)}% utilised</p>
        </div>
      </div>

      {/* SKU Breakdown Table */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-electric" />
          <h3 className="text-sm font-semibold text-gray-300">SKU Breakdown</h3>
          <span className="ml-auto text-xs text-gray-500">{detail.variants.length} variants</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-navy-700">
          <table className="w-full text-xs">
            <thead className="bg-navy-900 border-b border-navy-700">
              <tr>
                {['SKU / Variant', 'Shipped', 'Sold', 'Remaining', 'Sell-Through', 'Last Sale'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/50">
              {detail.variants.map(v => {
                const rate = v.sell_through_rate;
                const rowColor = rate > 0.6 ? 'bg-mint/5' : rate >= 0.3 ? 'bg-amber/5' : 'bg-danger/5';
                const rateColor = rate > 0.6 ? 'text-mint' : rate >= 0.3 ? 'text-amber' : 'text-danger';
                return (
                  <tr key={v.variant_id} className={`${rowColor} hover:bg-navy-700/20 transition-colors`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{v.sku_name}</p>
                      <p className="text-gray-500 mt-0.5">{v.colour} / {v.size}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-300">{v.total_shipped}</td>
                    <td className="px-4 py-3 font-mono text-gray-300">{v.total_sold}</td>
                    <td className="px-4 py-3 font-mono font-bold text-white">{v.units_remaining}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold font-mono ${rateColor}`}>{(rate * 100).toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {v.last_sale_date ? new Date(v.last_sale_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showLogModal && detail && (
          <LogSellThroughModal retailer={detail} onClose={() => setShowLogModal(false)} onSuccess={() => { fetchDetail(); onRetailerUpdate(); }} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const Retailers: React.FC = () => {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchRetailers = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/retailers').then(r => setRetailers(r.data)).catch(e => setError('Failed to load retailer network.')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRetailers();
  }, [fetchRetailers]);

  useSocket('sell_through_update', useCallback((data: { retailerSummary: Retailer }) => {
    setRetailers(prev =>
      prev.map(r => r.id === data.retailerSummary.id ? { ...r, ...data.retailerSummary } : r)
    );
  }, []));

  const filtered = retailers.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.city.toLowerCase().includes(search.toLowerCase())
  );

  const greenCount = retailers.filter(r => r.health_status === 'green').length;
  const yellowCount = retailers.filter(r => r.health_status === 'yellow').length;
  const redCount = retailers.filter(r => r.health_status === 'red').length;

  if (error) return <PageWrapper title="Retailers"><ErrorCard message={error} onRetry={fetchRetailers} /></PageWrapper>;
  if (loading && retailers.length === 0) return <PageWrapper title="Retailers"><LoadingSpinner message="Loading Network..." /></PageWrapper>;

  return (
    <PageWrapper title="Retailers">
      <div className="flex h-full gap-6 -m-2">
      {/* Left Panel */}
      <div className="w-[40%] flex flex-col bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-navy-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-electric" />
              Retailer Network
            </h2>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="px-2 py-0.5 bg-mint/10 text-mint rounded-full">{greenCount}</span>
              <span className="px-2 py-0.5 bg-amber/10 text-amber rounded-full">{yellowCount}</span>
              <span className="px-2 py-0.5 bg-danger/10 text-danger rounded-full">{redCount}</span>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or city..."
              className="w-full pl-10 pr-4 py-2.5 bg-navy-900 border border-navy-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-navy-700 bg-navy-800 animate-pulse space-y-2">
                <div className="h-4 bg-navy-700 rounded w-2/3" />
                <div className="h-3 bg-navy-700 rounded w-1/2" />
                <div className="h-2 bg-navy-700 rounded w-full mt-3" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No retailers found</p>
            </div>
          ) : filtered.map(r => (
            <RetailerTile key={r.id} retailer={r} selected={selectedId === r.id} onClick={() => setSelectedId(r.id)} />
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {!selectedId ? (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-8"
            >
              <div className="w-16 h-16 rounded-2xl bg-navy-700/50 border border-navy-700 flex items-center justify-center mb-4">
                <MapPin className="w-7 h-7 text-gray-600" />
              </div>
              <p className="text-gray-400 font-semibold">Select a retailer</p>
              <p className="text-gray-600 text-sm mt-1">Click any tile on the left to view detailed analytics</p>
            </motion.div>
          ) : (
            <motion.div
              key={selectedId}
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <RetailerDetail
                retailerId={selectedId}
                allRetailers={retailers}
                onRetailerUpdate={fetchRetailers}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </PageWrapper>
  );
};
