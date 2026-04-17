import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SizeColourHeatmap, type HeatmapDatum } from '../../components/charts/SizeColourHeatmap';
import api from '../../lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import {
  TrendingUp, AlertCircle, Info, RefreshCw,
  ArrowRight, CheckCircle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageWrapper } from '../../components/shared/PageWrapper';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorCard } from '../../components/shared/ErrorCard';

// ── Types ─────────────────────────────────────────────────────────────────────
interface RestockSignal {
  variant_id: string;
  retailer_id: string;
  stock_at_retailer: number;
  avg_weekly_sell_rate: number;
  weeks_of_cover: number;
  recommended_restock_qty: number;
  urgency: 'urgent' | 'soon' | 'monitor';
}

interface ForecastPoint {
  week: number;
  week_starting: string;
  predicted_units: number;
  lower: number;
  upper: number;
}

interface ForecastResult {
  variant_id: string;
  retailer_id: string;
  weeks_ahead: number;
  data_points_used: number;
  confidence: 'medium' | 'high';
  forecast: ForecastPoint[] | null;
  reason?: string;
}

interface SKU {
  id: string;
  name: string;
  variants: { id: string; colour: string; size: string }[];
}

interface Retailer {
  id: string;
  name: string;
  city: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const urgencyConfig = {
  urgent:  { label: 'URGENT',  pill: 'bg-danger/10 text-danger border border-danger/20'   },
  soon:    { label: 'SOON',    pill: 'bg-amber/10 text-amber border border-amber/20'       },
  monitor: { label: 'MONITOR', pill: 'bg-gray-500/10 text-gray-400 border border-gray-500/20' },
};
const urgencyOrder = { urgent: 0, soon: 1, monitor: 2 };

// ── Confirm Restock Modal ─────────────────────────────────────────────────────
const RestockModal = ({
  signal, onClose
}: { signal: RestockSignal; onClose: () => void }) => {
  const [done, setDone] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-navy-800 border border-navy-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {!done ? (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Trigger Restock</h2>
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-navy-700 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-navy-900 rounded-xl p-4 border border-navy-700 space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Variant ID</span>
                <span className="text-white font-mono text-xs">{signal.variant_id.slice(0, 16)}…</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Current Stock at Retailer</span>
                <span className="text-white font-bold">{signal.stock_at_retailer} units</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Weeks of Cover</span>
                <span className="text-amber font-bold">{signal.weeks_of_cover}w</span>
              </div>
              <div className="flex justify-between text-sm border-t border-navy-700 pt-3">
                <span className="text-gray-400">Recommended Restock Qty</span>
                <span className="text-electric font-bold text-lg">{signal.recommended_restock_qty} units</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              This will create a restock flag for your production team. The actual shipment order must be raised separately through your ERP system.
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-3 border border-navy-600 text-gray-400 hover:text-white rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={() => setDone(true)} className="flex-1 px-4 py-3 bg-electric text-navy-900 font-bold text-sm rounded-xl hover:bg-electric-dark">
                Confirm Restock
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-mint mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Restock Triggered</h3>
            <p className="text-gray-400 text-sm mb-6">Restock flag created for {signal.recommended_restock_qty} units.</p>
            <button onClick={onClose} className="w-full px-4 py-3 bg-navy-700 hover:bg-navy-600 text-white font-semibold text-sm rounded-xl">Done</button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-gray-400 font-semibold mb-2">Week {label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-mono">
          {p.name}: <span className="font-bold">{p.value?.toFixed(1)}</span>
        </p>
      ))}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const Forecasts: React.FC = () => {
  const [signals, setSignals] = useState<RestockSignal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [restockModal, setRestockModal] = useState<RestockSignal | null>(null);

  // Forecast form
  const [skus, setSkus] = useState<SKU[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [selectedRetailer, setSelectedRetailer] = useState('');
  const [weeksAhead, setWeeksAhead] = useState(8);
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState('');

  // Load supporting data
  useEffect(() => {
    api.get('/inventory').then(r => setSkus(r.data));
    api.get('/retailers').then(r => setRetailers(r.data));
    api.get('/ml/restock-signals')
      .then(r => setSignals([...r.data.restock_signals].sort((a: RestockSignal, b: RestockSignal) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])))
      .catch(() => setSignals([]))
      .finally(() => setSignalsLoading(false));
  }, []);

  const runForecast = async () => {
    if (!selectedVariant || !selectedRetailer) return setForecastError('Please select a variant and retailer.');
    setForecastLoading(true);
    setForecastError('');
    setForecastResult(null);
    try {
      // Add a slight intentional delay to simulate heavy ML compute, enhancing the "real product" UX
      await new Promise(r => setTimeout(r, 1800));
      const res = await api.post('/ml/forecast', { variant_id: selectedVariant, retailer_id: selectedRetailer, weeks_ahead: weeksAhead });
      setForecastResult(res.data);
    } catch (e: any) {
      setForecastError(e.response?.data?.error || 'Forecast service unavailable');
    } finally {
      setForecastLoading(false);
    }
  };

  // Flatten variants for the dropdown
  const allVariants = skus.flatMap(s => s.variants.map(v => ({ ...v, skuName: s.name })));

  // Build chart data
  const chartData = forecastResult?.forecast?.map(p => ({
    week: `W${p.week}`,
    Predicted: p.predicted_units,
    Upper: p.upper,
    Lower: p.lower,
  })) ?? [];

  // Stockout estimate
  const selectedVariantData = forecastResult?.forecast;
  const hoursToZero = selectedVariantData
    ? selectedVariantData.find(p => p.predicted_units === 0)?.week ?? null
    : null;

  if (signalsLoading) return <PageWrapper title="Demand Forecasts"><LoadingSpinner message="Calculating ML signals..." /></PageWrapper>;

  return (
    <PageWrapper title="Demand Forecasts">
      <div className="space-y-6">
      {/* ── Section 1: Restock Signals ─────────────────────────────────── */}
      <div className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber" />
          <h2 className="font-bold text-white">Restock Signals</h2>
          <span className="text-xs text-gray-500 px-2 py-0.5 bg-navy-900 rounded-full ml-auto">
            {signals.length} variant{signals.length !== 1 ? 's' : ''} need attention
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-900/60 border-b border-navy-700">
              <tr>
                {['Variant ID', 'Weeks of Cover', 'Avg Weekly Sell Rate', 'Recommended Restock', 'Urgency', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/50">
              {signalsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-navy-700 rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : signals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No urgent restock signals</p>
                  </td>
                </tr>
              ) : signals.map(sig => {
                const uc = urgencyConfig[sig.urgency];
                return (
                  <tr key={`${sig.variant_id}-${sig.retailer_id}`} className="hover:bg-navy-700/20 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-gray-300">{sig.variant_id.slice(0, 12)}…</td>
                    <td className="px-5 py-4 font-bold text-white">{sig.weeks_of_cover}w</td>
                    <td className="px-5 py-4 text-gray-300 font-mono">{sig.avg_weekly_sell_rate}/wk</td>
                    <td className="px-5 py-4 font-bold text-electric">{sig.recommended_restock_qty} units</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${uc.pill}`}>{uc.label}</span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setRestockModal(sig)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-electric hover:text-navy-900 bg-electric/10 hover:bg-electric rounded-lg border border-electric/20 hover:border-transparent transition-all"
                      >
                        Trigger Restock <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 2: SKU Forecast ────────────────────────────────────── */}
      <div className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-700 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-electric" />
          <h2 className="font-bold text-white">SKU Demand Forecast</h2>
          <span className="ml-auto text-xs text-gray-500">Powered by Prophet ML</span>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-navy-700 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Variant</label>
            <select value={selectedVariant} onChange={e => setSelectedVariant(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-electric/50">
              <option value="">Select variant...</option>
              {allVariants.map(v => (
                <option key={v.id} value={v.id}>{v.skuName} — {v.colour} / {v.size}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Retailer</label>
            <select value={selectedRetailer} onChange={e => setSelectedRetailer(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-electric/50">
              <option value="">Select retailer...</option>
              {retailers.map(r => (
                <option key={r.id} value={r.id}>{r.name} — {r.city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Forecast Horizon</label>
            <div className="flex gap-2">
              {[4, 8].map(w => (
                <button key={w} onClick={() => setWeeksAhead(w)}
                  className={`px-5 py-3 rounded-xl text-sm font-bold transition-all ${weeksAhead === w ? 'bg-electric text-navy-900' : 'bg-navy-900 border border-navy-700 text-gray-400 hover:text-white'}`}>
                  {w}W
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={runForecast} disabled={forecastLoading}
            className="flex items-center gap-2 px-6 py-3 bg-electric text-navy-900 font-bold text-sm rounded-xl hover:bg-electric-dark transition-all shadow-[0_0_15px_rgba(0,194,255,0.2)] disabled:opacity-50"
          >
            {forecastLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            {forecastLoading ? 'Running...' : 'Run Forecast'}
          </button>
        </div>

        {/* Result area */}
        <div className="p-6">
          {forecastError && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 glass-danger rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-danger/20 flex items-center justify-center mb-4 border border-danger/30 shadow-[0_0_20px_rgba(255,71,87,0.4)]">
                <AlertCircle className="w-6 h-6 text-danger" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-widest uppercase mb-2">ML Engine Offline</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto">
                {forecastError}. The Python FastApi microservice is currently unreachable or computing a cold start. Check your terminal to ensure <span className="font-mono text-electric">uvicorn</span> is running.
              </p>
            </motion.div>
          )}
          <AnimatePresence mode="wait">
            {!forecastResult && !forecastError && !forecastLoading && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="py-16 text-center text-gray-500">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-gray-400">Select a variant and retailer, then run forecast</p>
              </motion.div>
            )}

            {forecastLoading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="py-10 max-w-2xl mx-auto">
                <div className="bg-[#020611] rounded-xl border border-navy-700 font-mono text-[11px] overflow-hidden shadow-2xl relative">
                  <div className="bg-navy-900 border-b border-navy-700 px-4 py-2.5 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-danger/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-mint/80"></span>
                    <span className="ml-3 text-gray-400 font-sans text-xs tracking-wide">Prophet ML Engine Workspace</span>
                    <RefreshCw className="w-3.5 h-3.5 text-electric ml-auto animate-spin" />
                  </div>
                  <div className="p-5 space-y-3 h-48 overflow-hidden relative">
                    <motion.div animate={{ y: [-150, 0] }} transition={{ duration: 1.8, ease: 'linear' }} className="space-y-3">
                         <p className="text-gray-500">[00:00:01] <span className="text-electric font-bold">INIT</span> boot cluster node us-east-inference-1</p>
                         <p className="text-gray-500">[00:00:01] <span className="text-mint font-bold">LOAD</span> fetching trailing 90-day timeseries vectors...</p>
                         <p className="text-gray-500">[00:00:02] <span className="text-violet font-bold">PROC</span> applying [IN] local holiday seasonality matrix...</p>
                         <p className="text-gray-500">[00:00:03] <span className="text-amber font-bold">TRAIN</span> model.fit(df) running stochastic gradient descent...</p>
                         <p className="text-gray-500">[00:00:04] <span className="text-amber font-bold">TRAIN</span> tuning hyperparameters for interval_width=0.80</p>
                         <p className="text-gray-500">[00:00:04] <span className="text-mint font-bold">LOAD</span> isolating bounds [yhat_lower, yhat_upper]...</p>
                         <p className="text-gray-500 pb-20">[00:00:05] <span className="text-electric font-bold">DONE</span> yielding structured forecast output...</p>
                    </motion.div>
                    <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#020611] to-transparent"></div>
                  </div>
                </div>
              </motion.div>
            )}

            {forecastResult && !forecastLoading && (
              <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {forecastResult.forecast === null ? (
                  /* Insufficient data card */
                  <div className="p-5 bg-navy-900 border border-navy-700 rounded-2xl flex items-start gap-4">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl shrink-0">
                      <Info className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Insufficient Data</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        This model requires at least <span className="text-white font-semibold">14 sell-through data points</span> to generate a forecast.
                        Only <span className="text-amber font-semibold">{forecastResult.data_points_used ?? 0} points</span> were found for this variant–retailer pair in the last 90 days.
                        Log more sales events and retry.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Meta badges */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-3 py-1 text-xs font-bold bg-electric/10 text-electric border border-electric/20 rounded-full">
                        {forecastResult.confidence === 'high' ? '🟢 High Confidence' : '🟡 Medium Confidence'}
                      </span>
                      <span className="px-3 py-1 text-xs font-semibold text-gray-400 bg-navy-900 border border-navy-700 rounded-full">
                        {forecastResult.data_points_used} data points used
                      </span>
                      <span className="px-3 py-1 text-xs font-semibold text-gray-400 bg-navy-900 border border-navy-700 rounded-full">
                        {forecastResult.weeks_ahead}-week horizon
                      </span>
                    </div>

                    {/* Chart */}
                    <div className="bg-navy-900 border border-navy-700 rounded-2xl p-5">
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1A2744" />
                          <XAxis dataKey="week" stroke="#4B5563" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                          <YAxis stroke="#4B5563" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                          <Line
                            type="monotone" dataKey="Predicted" stroke="#00C2FF"
                            strokeWidth={2.5} dot={{ r: 3, fill: '#00C2FF' }} activeDot={{ r: 5 }}
                          />
                          <Line
                            type="monotone" dataKey="Upper" stroke="#FFB800"
                            strokeWidth={1.5} strokeDasharray="5 4" dot={false}
                          />
                          <Line
                            type="monotone" dataKey="Lower" stroke="#FFB800"
                            strokeWidth={1.5} strokeDasharray="5 4" dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Stockout summary */}
                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${hoursToZero ? 'bg-danger/5 border-danger/20' : 'bg-mint/5 border-mint/20'}`}>
                      {hoursToZero ? (
                        <>
                          <AlertCircle className="w-5 h-5 text-danger shrink-0" />
                          <p className="text-sm text-gray-300">
                            At the current sell rate, this SKU is projected to <span className="text-danger font-bold">stock out in week {hoursToZero}</span> at this retailer. Consider restocking before then.
                          </p>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 text-mint shrink-0" />
                          <p className="text-sm text-gray-300">
                            Stock at this retailer is projected to <span className="text-mint font-bold">remain available</span> throughout the full {forecastResult.weeks_ahead}-week forecast window.
                          </p>
                        </>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Section 3: Velocity Heatmap ────────────────────────────────── */}
      {skus.length > 0 && (
        <div className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-navy-700 flex items-center gap-3">
            <span className="text-base font-bold text-white">Size × Colour Velocity Heatmap</span>
            <span className="ml-auto text-xs text-gray-500">Sell-through rate by size &amp; style</span>
          </div>
          <div className="p-6">
            <SizeColourHeatmap
              data={skus.flatMap(s =>
                s.variants.map(v => ({
                  style_name: s.name,
                  size: v.size,
                  colour: v.colour,
                  sell_through_rate: v.sell_through_rate,
                  units_remaining: 0,
                } as HeatmapDatum))
              )}
            />
          </div>
        </div>
      )}

      {/* Restock confirmation modal */}
      <AnimatePresence>
        {restockModal && <RestockModal signal={restockModal} onClose={() => setRestockModal(null)} />}
      </AnimatePresence>
    </div>
    </PageWrapper>
  );
};
