import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as d3 from 'd3';
import api from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Truck, Sparkles, AlertTriangle, Tag,
  RefreshCw, CheckCircle, Save, ArrowLeftRight,
  X
} from 'lucide-react';
import { PageWrapper } from '../../components/shared/PageWrapper';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Retailer { id: string; name: string; city: string; }
interface SKU { id: string; name: string; category: string; }

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface SimResult {
  scenario: string;
  parameters: Record<string, any>;
  risk_level: 'red' | 'yellow' | 'green';
  summary: string;
  details: Record<string, any>;
  saved_at?: string;
}

// ── Scenario tabs config ──────────────────────────────────────────────────────
const SCENARIOS = [
  { key: 'demand_spike',     label: 'Demand Spike',    icon: Zap        },
  { key: 'supply_delay',     label: 'Supply Delay',    icon: Truck      },
  { key: 'festival_surge',   label: 'Festival Surge',  icon: Sparkles   },
  { key: 'retailer_default', label: 'Retailer Default',icon: AlertTriangle },
  { key: 'margin_change',    label: 'Margin Change',   icon: Tag        },
];

const FESTIVALS = ['diwali', 'eid', 'navratri', 'wedding', 'republic'];

// ── Risk Gauge (D3 arc) ───────────────────────────────────────────────────────
const RISK_COLORS = { green: '#00E5A0', yellow: '#FFB800', red: '#FF4757' };

const RiskGauge: React.FC<{ risk: 'red' | 'yellow' | 'green' | null }> = ({ risk }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 220, H = 130, R = 95, r = 58;

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${W / 2},${H - 10})`);

    // Background arc
    const bgArc = d3.arc()({ innerRadius: r, outerRadius: R, startAngle: -Math.PI / 1.25, endAngle: Math.PI / 1.25 } as any);
    g.append('path').attr('d', bgArc as string).attr('fill', '#1A2744');

    if (!risk) return;

    const endAngles = { green: -Math.PI / 1.25 + (2 * Math.PI / 1.25) * 0.3, yellow: -Math.PI / 1.25 + (2 * Math.PI / 1.25) * 0.65, red: Math.PI / 1.25 };
    const endAngle = endAngles[risk] ?? Math.PI / 1.25;
    const color = RISK_COLORS[risk];

    const fgArc = d3.arc()({ innerRadius: r, outerRadius: R, startAngle: -Math.PI / 1.25, endAngle } as any);
    g.append('path').attr('d', fgArc as string).attr('fill', color).attr('opacity', 0.9);

    // Needle
    const needleAngle = endAngles[risk] ?? 0;
    const nx = Math.sin(needleAngle) * (R - 10);
    const ny = -Math.cos(needleAngle) * (R - 10);
    g.append('line').attr('x1', 0).attr('y1', 0).attr('x2', nx).attr('y2', ny)
      .attr('stroke', color).attr('stroke-width', 3).attr('stroke-linecap', 'round');
    g.append('circle').attr('cx', 0).attr('cy', 0).attr('r', 6).attr('fill', color);

    // Labels
    const labels = [{ t: 'SAFE', a: -Math.PI / 1.25 }, { t: 'WARN', a: 0 }, { t: 'RISK', a: Math.PI / 1.25 }];
    labels.forEach(({ t, a }) => {
      const lx = Math.sin(a) * (R + 14), ly = -Math.cos(a) * (R + 14);
      g.append('text').attr('x', lx).attr('y', ly).attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', '#6B7280').attr('font-size', '9px').attr('font-weight', '700').text(t);
    });
  }, [risk]);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg ref={svgRef} width={W} height={H} />
      {risk && (
        <motion.div
          key={risk}
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <p className="text-2xl font-black uppercase tracking-widest" style={{ color: RISK_COLORS[risk] }}>
            {risk === 'green' ? 'LOW RISK' : risk === 'yellow' ? 'MODERATE' : 'HIGH RISK'}
          </p>
        </motion.div>
      )}
      {!risk && <p className="text-gray-600 text-sm">Run a scenario to see risk level</p>}
    </div>
  );
};

// ── Slider ───────────────────────────────────────────────────────────────────
const Slider: React.FC<{ label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }> = ({
  label, value, min, max, step = 1, unit = '', onChange
}) => (
  <div>
    <div className="flex justify-between items-center mb-2">
      <label className="text-sm font-semibold text-gray-300">{label}</label>
      <span className="text-electric font-bold font-mono text-sm">{value}{unit}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full h-2 rounded-full appearance-none cursor-pointer"
      style={{
        background: `linear-gradient(to right, #00C2FF ${((value - min) / (max - min)) * 100}%, #1A2744 ${((value - min) / (max - min)) * 100}%)`
      }}
    />
    <div className="flex justify-between text-xs text-gray-600 mt-1">
      <span>{min}{unit}</span><span>{max}{unit}</span>
    </div>
  </div>
);

// ── Compare Modal ─────────────────────────────────────────────────────────────
const CompareModal: React.FC<{ results: SimResult[]; onClose: () => void }> = ({ results, onClose }) => {
  const [a, b] = results.slice(-2);
  if (!a || !b) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-navy-800 border border-navy-700 rounded-2xl p-6 w-full max-w-3xl shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Scenario Comparison</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-navy-700 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[a, b].map((r, i) => (
            <div key={i} className="bg-navy-900 border border-navy-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 uppercase tracking-wider">{r.scenario.replace('_', ' ')}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: RISK_COLORS[r.risk_level], background: `${RISK_COLORS[r.risk_level]}18` }}>
                  {r.risk_level.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{r.summary}</p>
              <p className="text-xs text-gray-600 mt-3">{r.saved_at ? new Date(r.saved_at).toLocaleTimeString() : ''}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const Simulation: React.FC = () => {
  const { user } = useAuth();
  const manufacturerId = user?.entity_id || '';
  const [activeScenario, setActiveScenario] = useState('demand_spike');
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedResults, setSavedResults] = useState<SimResult[]>(() => {
    try { return JSON.parse(localStorage.getItem('sim_results') || '[]'); } catch { return []; }
  });
  const [showCompare, setShowCompare] = useState(false);

  // Params
  const [demandMultiplier, setDemandMultiplier] = useState(150);
  const [delayDays, setDelayDays] = useState(7);
  const [festival, setFestival] = useState('diwali');
  const [weeksUntil, setWeeksUntil] = useState(6);
  const [selectedRetailers, setSelectedRetailers] = useState<string[]>([]);
  const [markdownDepth, setMarkdownDepth] = useState(20);

  useEffect(() => {
    api.get('/retailers').then(r => setRetailers(r.data)).catch(() => {});
    api.get('/inventory').then(r => setSkus(r.data)).catch(() => {});
  }, []);

  const buildParams = useCallback(() => {
    switch (activeScenario) {
      case 'demand_spike':     return { demand_multiplier: demandMultiplier / 100 };
      case 'supply_delay':     return { delay_days: delayDays };
      case 'festival_surge':   return { festival, weeks_until: weeksUntil };
      case 'retailer_default': return { retailer_ids: selectedRetailers };
      case 'margin_change':    return { markdown_pct: markdownDepth };
      default: return {};
    }
  }, [activeScenario, demandMultiplier, delayDays, festival, weeksUntil, selectedRetailers, markdownDepth]);

  const debouncedParams = useDebounce(buildParams(), 500);

  const runSimulation = useCallback(async (paramsObj: any) => {
    // skip if disabled
    if (activeScenario === 'retailer_default' && paramsObj.retailer_ids?.length === 0) return;
    
    setLoading(true);
    setError('');
    try {
      await new Promise(r => setTimeout(r, 600)); // Shorter delay for responsive sliders
      const res = await api.post('/ml/simulation/run', { manufacturer_id: manufacturerId, scenario: activeScenario, parameters: paramsObj });
      setResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Simulation service unavailable');
    } finally {
      setLoading(false);
    }
  }, [manufacturerId, activeScenario]);

  useEffect(() => {
    if (manufacturerId) {
      runSimulation(debouncedParams);
    }
  }, [debouncedParams, activeScenario, manufacturerId]);

  const saveScenario = () => {
    if (!result) return;
    const toSave = { ...result, saved_at: new Date().toISOString() };
    const updated = [...savedResults, toSave].slice(-10);
    setSavedResults(updated);
    localStorage.setItem('sim_results', JSON.stringify(updated));
  };

  const toggleRetailer = (id: string) =>
    setSelectedRetailers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Risk color helper
  const riskColor = result ? RISK_COLORS[result.risk_level] : '#4B5563';

  // ── Impact rows from details
  const impactRows = result?.details?.stockouts_in_4_weeks?.map((s: any) => ({
    label: `${s.sku_name} ${s.size}/${s.colour}`,
    qty: `Stockout in ${s.weeks_to_stockout}w`,
    revenue: `₹${Number(s.estimated_revenue_at_risk).toLocaleString('en-IN')}`,
  })) ?? result?.details?.variants_at_risk?.map((s: any) => ({
    label: `${s.sku_name} ${s.size}/${s.colour}`,
    qty: `${s.shortfall_units} units short`,
    revenue: `₹${Number(s.lost_revenue).toLocaleString('en-IN')}`,
  })) ?? [];

  const actions: string[] = result?.details?.recommended_actions ?? [];

  return (
    <PageWrapper title="Simulation">
      <div className="flex gap-6 h-full -m-2">
        {/* ── Left Panel ─────────────────────────────────────────────────── */}
      <div className="w-[45%] bg-navy-800 border border-navy-700 rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-navy-700">
          <h2 className="text-lg font-bold text-white">Scenario Simulator</h2>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">Model business disruptions and festival surges before they happen</p>
        </div>

        {/* Scenario Tabs */}
        <div className="px-4 pt-4 flex flex-wrap gap-2">
          {SCENARIOS.map(s => {
            const Icon = s.icon;
            const active = activeScenario === s.key;
            return (
              <button key={s.key} onClick={() => setActiveScenario(s.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  active ? 'bg-electric text-navy-900 border-electric shadow-[0_0_12px_rgba(0,194,255,0.25)]' : 'text-gray-400 border-navy-700 hover:border-navy-600 hover:text-white'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Scenario Inputs */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScenario}
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {activeScenario === 'demand_spike' && (
                <>
                  <Slider label="Demand Multiplier" value={demandMultiplier} min={110} max={400} unit="%" onChange={setDemandMultiplier} />
                  <div className="p-3 bg-navy-900 border border-navy-700 rounded-xl text-xs text-gray-400 leading-relaxed">
                    Simulates a sudden spike in demand — e.g. a viral trend or promotional event. At <span className="text-electric font-bold">{demandMultiplier}%</span>, demand increases by <span className="text-electric font-bold">{demandMultiplier - 100}%</span> above baseline.
                  </div>
                </>
              )}

              {activeScenario === 'supply_delay' && (
                <>
                  <Slider label="Delay Duration" value={delayDays} min={1} max={30} unit=" days" onChange={setDelayDays} />
                  <div className="p-3 bg-navy-900 border border-navy-700 rounded-xl text-xs text-gray-400 leading-relaxed">
                    Models a <span className="text-electric font-bold">{delayDays}-day</span> supply chain disruption. Calculates which variants will hit zero stock before the delayed restock arrives.
                  </div>
                </>
              )}

              {activeScenario === 'festival_surge' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Festival</label>
                    <div className="grid grid-cols-2 gap-2">
                      {FESTIVALS.map(f => (
                        <button key={f} onClick={() => setFestival(f)}
                          className={`px-3 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all border ${festival === f ? 'bg-violet text-white border-violet' : 'border-navy-700 text-gray-400 hover:text-white hover:border-navy-500'}`}>
                          {f === 'republic' ? 'Republic Day' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Slider label="Weeks Until Festival" value={weeksUntil} min={1} max={12} unit=" wks" onChange={setWeeksUntil} />
                  <div className="p-3 bg-navy-900 border border-navy-700 rounded-xl text-xs text-gray-400">
                    Applies category-specific demand multipliers for <span className="text-violet font-bold capitalize">{festival}</span>. Calculates pre-build quantities needed <span className="text-electric font-bold">{weeksUntil} weeks</span> in advance.
                  </div>
                </>
              )}

              {activeScenario === 'retailer_default' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Select Retailers at Risk</label>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {retailers.length === 0 ? (
                        <p className="text-gray-500 text-sm">Loading retailers...</p>
                      ) : retailers.map(r => (
                        <label key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedRetailers.includes(r.id) ? 'border-danger/40 bg-danger/5' : 'border-navy-700 hover:border-navy-600'}`}>
                          <input type="checkbox" checked={selectedRetailers.includes(r.id)} onChange={() => toggleRetailer(r.id)}
                            className="w-4 h-4 rounded accent-danger" />
                          <div>
                            <p className="text-sm font-semibold text-white">{r.name}</p>
                            <p className="text-xs text-gray-500">{r.city}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  {selectedRetailers.length > 0 && (
                    <div className="p-3 bg-danger/5 border border-danger/20 rounded-xl text-xs text-danger">
                      Simulating default risk for <span className="font-bold">{selectedRetailers.length}</span> selected retailer{selectedRetailers.length > 1 ? 's' : ''}
                    </div>
                  )}
                </>
              )}

              {activeScenario === 'margin_change' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Category</label>
                    <select className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-electric/50">
                      <option>All Categories</option>
                      {['ethnic wear', 'knitwear', 'western'].map(c => <option key={c} className="capitalize">{c}</option>)}
                    </select>
                  </div>
                  <Slider label="Markdown Depth" value={markdownDepth} min={0} max={70} unit="%" onChange={setMarkdownDepth} />
                  <div className="p-3 bg-navy-900 border border-navy-700 rounded-xl text-xs text-gray-400">
                    A <span className="text-amber font-bold">{markdownDepth}%</span> price markdown will impact gross margin. This scenario models revenue impact assuming demand increases proportionally.
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Reactive Polling Status */}
        <div className="p-5 border-t border-navy-700 bg-navy-900/40 flex flex-col items-center justify-center">
          {error && <div className="mb-3 w-full p-3 bg-danger/10 border border-danger/20 text-danger text-xs rounded-xl text-center">{error}</div>}
          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold tracking-wide uppercase">
            <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber animate-ping' : 'bg-mint'}`} />
            {loading ? 'Computing variants...' : 'Live Model Linked'}
          </div>
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────────────────── */}
      <div className="flex-1 bg-navy-800 border border-navy-700 rounded-2xl flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-lg bg-[#020611] rounded-xl border border-navy-700 font-mono text-[11px] overflow-hidden shadow-2xl relative text-left">
                <div className="bg-navy-900 border-b border-navy-700 px-4 py-2.5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-danger/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-mint/80"></span>
                  <span className="ml-3 text-gray-400 font-sans text-xs tracking-wide">Monte Carlo Simulation Cluster</span>
                  <RefreshCw className="w-3.5 h-3.5 text-electric ml-auto animate-spin" />
                </div>
                <div className="p-5 space-y-3 h-48 overflow-hidden relative">
                  <motion.div animate={{ y: [-150, 0] }} transition={{ duration: 1.6, ease: 'linear' }} className="space-y-3">
                       <p className="text-gray-500">[00:00:01] <span className="text-electric font-bold">INIT</span> boot simulation cluster node-mc-4</p>
                       <p className="text-gray-500">[00:00:01] <span className="text-mint font-bold">LOAD</span> fetching trailing stock ledgers...</p>
                       <p className="text-gray-500">[00:00:02] <span className="text-violet font-bold">PROC</span> injecting external market anomaly variables...</p>
                       <p className="text-gray-500">[00:00:02] <span className="text-amber font-bold">SIM</span> running stochastic multi-path projections...</p>
                       <p className="text-gray-500">[00:00:03] <span className="text-amber font-bold">SIM</span> aggregating n=10,000 statistical variances...</p>
                       <p className="text-gray-500">[00:00:03] <span className="text-mint font-bold">LOAD</span> computing financial risk delta scores...</p>
                       <p className="text-gray-500 pb-20">[00:00:04] <span className="text-electric font-bold">DONE</span> yielding simulation payload...</p>
                  </motion.div>
                  <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#020611] to-transparent"></div>
                </div>
              </div>
            </motion.div>
          ) : !result ? (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <RiskGauge risk={null} />
              <p className="text-gray-500 text-sm mt-6">Configure a scenario and click <span className="text-electric font-semibold">Run Simulation</span></p>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col overflow-hidden">
              {/* Risk gauge + summary header */}
              <div className="p-6 border-b border-navy-700 flex items-center gap-6">
                <RiskGauge risk={result.risk_level} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Scenario</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-navy-900 border border-navy-700 text-gray-300 capitalize">
                      {result.scenario.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200 leading-relaxed">{result.summary}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={saveScenario}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 hover:bg-navy-600 border border-navy-600 text-white text-xs font-semibold rounded-lg transition-colors">
                      <Save className="w-3 h-3" /> Save
                    </button>
                    {savedResults.length >= 2 && (
                      <button onClick={() => setShowCompare(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet/10 hover:bg-violet/20 border border-violet/20 text-violet text-xs font-semibold rounded-lg transition-colors">
                        <ArrowLeftRight className="w-3 h-3" /> Compare
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Key Metrics */}
                {result.details && (
                  <div className="grid grid-cols-2 gap-3">
                    {result.details.revenue_at_risk !== undefined && (
                      <div className="bg-navy-900 border border-navy-700 rounded-xl p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Revenue at Risk</p>
                        <p className="text-xl font-bold" style={{ color: riskColor }}>₹{Number(result.details.revenue_at_risk).toLocaleString('en-IN')}</p>
                      </div>
                    )}
                    {result.details.estimated_revenue_loss !== undefined && (
                      <div className="bg-navy-900 border border-navy-700 rounded-xl p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Revenue Loss</p>
                        <p className="text-xl font-bold text-danger">₹{Number(result.details.estimated_revenue_loss).toLocaleString('en-IN')}</p>
                      </div>
                    )}
                    {result.details.credit_exposure !== undefined && (
                      <div className="bg-navy-900 border border-navy-700 rounded-xl p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Credit Exposure</p>
                        <p className="text-xl font-bold text-danger">₹{Number(result.details.credit_exposure).toLocaleString('en-IN')}</p>
                      </div>
                    )}
                    {result.details.working_capital_impact !== undefined && (
                      <div className="bg-navy-900 border border-navy-700 rounded-xl p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Working Capital Impact</p>
                        <p className="text-xl font-bold text-amber">₹{Number(result.details.working_capital_impact).toLocaleString('en-IN')}</p>
                      </div>
                    )}
                    {result.details.total_units_to_prebuild !== undefined && (
                      <div className="bg-navy-900 border border-navy-700 rounded-xl p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Units to Pre-build</p>
                        <p className="text-xl font-bold text-electric">{Number(result.details.total_units_to_prebuild).toLocaleString('en-IN')}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Impact Table */}
                {impactRows.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Affected Variants</p>
                    <div className="rounded-xl border border-navy-700 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-navy-900 border-b border-navy-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-gray-400 font-semibold">Variant</th>
                            <th className="px-4 py-3 text-left text-gray-400 font-semibold">Impact</th>
                            <th className="px-4 py-3 text-right text-gray-400 font-semibold">Revenue Risk</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-navy-700/50">
                          {impactRows.slice(0, 8).map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-navy-700/20">
                              <td className="px-4 py-3 text-white font-medium">{row.label}</td>
                              <td className="px-4 py-3 text-amber">{row.qty}</td>
                              <td className="px-4 py-3 text-right text-danger font-mono font-bold">{row.revenue}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {impactRows.length > 8 && <p className="text-xs text-gray-600 mt-2 text-right">+ {impactRows.length - 8} more variants</p>}
                  </div>
                )}

                {/* Recommended Actions */}
                {actions.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recommended Actions</p>
                    <div className="space-y-2">
                      {actions.map((action, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="flex items-start gap-3 p-4 bg-navy-900 border border-navy-700 rounded-xl"
                        >
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-electric/10 text-electric text-xs font-black shrink-0 mt-0.5">{i + 1}</div>
                          <p className="text-sm text-gray-300 leading-relaxed">{action}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scenario with no actions */}
                {actions.length === 0 && impactRows.length === 0 && result && (
                  <div className="flex flex-col items-center py-8 text-center">
                    <CheckCircle className="w-10 h-10 text-mint mb-3" />
                    <p className="text-gray-300 font-semibold">Scenario completed</p>
                    <p className="text-gray-500 text-sm mt-1">No high-impact items found under current parameters</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Compare Modal */}
      <AnimatePresence>
        {showCompare && <CompareModal results={savedResults} onClose={() => setShowCompare(false)} />}
      </AnimatePresence>
      </div>
    </PageWrapper>
  );
};
