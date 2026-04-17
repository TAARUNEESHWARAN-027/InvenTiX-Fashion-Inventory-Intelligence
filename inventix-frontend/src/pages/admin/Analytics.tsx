import React, { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Activity, Target, ShieldAlert, AlertTriangle } from 'lucide-react';
import { SizeColourHeatmap, type HeatmapDatum } from '../../components/charts/SizeColourHeatmap';
import { PageWrapper } from '../../components/shared/PageWrapper';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ErrorCard } from '../../components/shared/ErrorCard';

// ── Types ─────────────────────────────────────────────────────────────────────
interface CategoryData {
  name: string;
  sell_through_rate: number;
}

interface SizeData {
  size: string;
  velocity: number;
}

interface HeatmapRaw {
  manufacturer: string;
  style_name: string;
  size: string;
  colour: string;
  sell_through_rate: number;
  units_remaining: number;
}

interface RetailerRisk {
  id: string;
  name: string;
  city: string;
  risk_score: number;
  credit_exposure: number;
  sell_through_rate: number;
  trend: 'up' | 'down' | 'flat';
}

interface AnalyticsPayload {
  top_categories: CategoryData[];
  trending_sizes: SizeData[];
  heatmap_data: HeatmapRaw[];
  retailer_risks: RetailerRisk[];
}

// ── Custom Tooltips ────────────────────────────────────────────────────────
const CustomBarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-gray-400 font-semibold mb-1">{payload[0].payload.name}</p>
      <p className="text-electric font-mono font-bold">
        Sell-Through: {(payload[0].value * 100).toFixed(1)}%
      </p>
    </div>
  );
};

const CustomRadarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-gray-400 font-semibold mb-1">Size {payload[0].payload.size}</p>
      <p className="text-violet font-mono font-bold">
        Velocity: {payload[0].value}
      </p>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('All');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/admin/analytics').then(r => setData(r.data)).catch(err => {
      // Setup some empty fallback if route doesn't exist or fails
      console.warn("Analytics API Error", err);
      setData({ top_categories: [], trending_sizes: [], heatmap_data: [], retailer_risks: [] });
      setError('Unable to fetch live analytics data.');
    }).finally(() => setLoading(false));
  }, []);

  const manufacturers = useMemo(() => {
    if (!data?.heatmap_data) return ['All'];
    return ['All', ...Array.from(new Set(data.heatmap_data.map(d => d.manufacturer)))].sort();
  }, [data]);

  const filteredHeatmap = useMemo(() => {
    if (!data?.heatmap_data) return [];
    const filtered = selectedManufacturer === 'All' 
      ? data.heatmap_data 
      : data.heatmap_data.filter(d => d.manufacturer === selectedManufacturer);
    return filtered.map(d => ({
      style_name: selectedManufacturer === 'All' ? `${d.style_name} (${d.manufacturer})` : d.style_name,
      size: d.size,
      colour: d.colour,
      sell_through_rate: d.sell_through_rate,
      units_remaining: d.units_remaining
    } as HeatmapDatum));
  }, [data, selectedManufacturer]);

  if (loading) return <PageWrapper title="Platform Analytics"><LoadingSpinner message="Loading analytics..." /></PageWrapper>;
  if (error && !data) return <PageWrapper title="Platform Analytics"><ErrorCard message={error} onRetry={() => setLoading(true)} /></PageWrapper>;

  if (!data) return null;

  return (
    <PageWrapper title="Platform Analytics">
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-electric" />
          <h1 className="text-xl font-bold text-white">Platform Analytics</h1>
          {error && <span className="ml-auto text-sm text-danger">{error}</span>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* 1. Top Categories by Sell-Through */}
        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-6 shrink-0">
            <Target className="w-5 h-5 text-electric" />
            <h2 className="font-bold text-white">Top Categories by Sell-Through</h2>
          </div>
          <div className="flex-1 min-h-[220px]">
            {data.top_categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.top_categories.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2744" horizontal={true} vertical={false} />
                  <XAxis type="number" domain={[0, 1]} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} stroke="#4B5563" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" stroke="#4B5563" tick={{ fill: '#D1D5DB', fontSize: 11 }} />
                  <RechartsTooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="sell_through_rate" fill="#00C2FF" radius={[0, 4, 4, 0]} barSize={24} style={{ filter: "drop-shadow(0 0 6px text-electric)" }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">No category data available</div>
            )}
          </div>
        </div>

        {/* 2. Trending Sizes Platform-Wide */}
        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-6 shrink-0">
            <Activity className="w-5 h-5 text-violet" />
            <h2 className="font-bold text-white">Trending Sizes Platform-Wide</h2>
          </div>
          <div className="flex-1 min-h-[220px]">
            {data.trending_sizes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data.trending_sizes}>
                  <PolarGrid stroke="#243357" />
                  <PolarAngleAxis dataKey="size" tick={{ fill: '#D1D5DB', fontSize: 12, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                  <RechartsTooltip content={<CustomRadarTooltip />} />
                  <Radar name="Velocity" dataKey="velocity" stroke="#7B2FBE" fill="#7B2FBE" fillOpacity={0.5} style={{ filter: "drop-shadow(0 0 8px rgba(123, 47, 190, 0.6))" }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">No size data available</div>
            )}
          </div>
        </div>

        {/* 3. Dead Stock Heatmap */}
        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber" />
              <h2 className="font-bold text-white">Dead Stock Heatmap</h2>
            </div>
            <select
               value={selectedManufacturer}
               onChange={e => setSelectedManufacturer(e.target.value)}
               className="bg-navy-900 border border-navy-700 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-electric"
             >
               {manufacturers.map(m => (
                 <option key={m} value={m}>{m}</option>
               ))}
            </select>
          </div>
          <div className="flex-1 overflow-auto rounded-xl">
             <SizeColourHeatmap data={filteredHeatmap} />
          </div>
        </div>

        {/* 4. Retailer Risk Leaderboard */}
        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-6 shrink-0">
            <ShieldAlert className="w-5 h-5 text-danger" />
            <h2 className="font-bold text-white">Retailer Risk Leaderboard</h2>
          </div>
          <div className="flex-1 overflow-auto rounded-xl border border-navy-700">
            <table className="w-full text-sm text-left">
              <thead className="bg-navy-900/60 border-b border-navy-700 text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">Retailer</th>
                  <th className="px-4 py-3">Risk Score</th>
                  <th className="px-4 py-3">Credit Exposure</th>
                  <th className="px-4 py-3">Sell-Through</th>
                  <th className="px-4 py-3">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700/50">
                {[...data.retailer_risks].sort((a, b) => b.risk_score - a.risk_score).map(r => {
                  let riskColor = 'text-mint font-bold';
                  if (r.risk_score >= 30 && r.risk_score <= 70) riskColor = 'text-amber font-bold';
                  if (r.risk_score > 70) riskColor = 'text-danger font-bold';

                  const TrendIcon = r.trend === 'up' ? TrendingUp : r.trend === 'down' ? TrendingDown : Minus;
                  const trendColor = r.trend === 'up' ? 'text-danger' : r.trend === 'down' ? 'text-mint' : 'text-gray-500';

                  return (
                    <tr key={r.id} className="hover:bg-navy-700/30">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{r.name}</div>
                        <div className="text-xs text-gray-500">{r.city}</div>
                      </td>
                      <td className={`px-4 py-3 ${riskColor}`}>{r.risk_score}</td>
                      <td className="px-4 py-3 text-white font-mono">₹{r.credit_exposure.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-gray-300 font-mono">{(r.sell_through_rate * 100).toFixed(1)}%</td>
                      <td className={`px-4 py-3 ${trendColor}`}>
                        <TrendIcon className="w-4 h-4" />
                      </td>
                    </tr>
                  )
                })}
                {data.retailer_risks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">No retailer risk data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>
    </PageWrapper>
  );
};
