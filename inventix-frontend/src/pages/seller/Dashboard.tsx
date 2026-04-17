import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';
import {
  AlertCircle, ArrowRight, ShieldAlert, PackageX,
  TrendingUp, DollarSign, Users, Bell
} from 'lucide-react';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { PageWrapper } from '../../components/shared/PageWrapper';

// ── Animated Number ────────────────────────────────────────────────────────────
const AnimatedNumber: React.FC<{ value: number; prefix?: string; suffix?: string; decimals?: number }> = ({
  value, prefix = '', suffix = '', decimals = 0
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let startTime: number | null = null;
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / 1400, 1);
      const eased = 1 - Math.pow(2, -10 * progress);
      setDisplayValue(value * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span>{prefix}{displayValue.toFixed(decimals)}{suffix}</span>;
};

// ── D3 Credit Gauge ────────────────────────────────────────────────────────────
const CreditGauge = ({ used, limit }: { used: number; limit: number }) => {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current || limit === 0) return;
    const pct = used / limit;
    const W = 200, H = 130, r = 78, sw = 12;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    const g = svg.append('g').attr('transform', `translate(${W / 2},${H - 8})`);
    // Track
    const bgArc = d3.arc()({ innerRadius: r - sw, outerRadius: r, startAngle: -Math.PI / 1.6, endAngle: Math.PI / 1.6 } as any);
    g.append('path').attr('d', bgArc as string).attr('fill', 'rgba(255,255,255,0.04)');
    // Fill
    const color = pct > 0.7 ? '#FF4757' : pct > 0.5 ? '#FFB800' : '#00E5A0';
    const endAngle = -Math.PI / 1.6 + (Math.PI / 1.6 * 2) * Math.min(pct, 1);
    const fgArc = d3.arc()({ innerRadius: r - sw, outerRadius: r, startAngle: -Math.PI / 1.6, endAngle } as any);
    g.append('path').attr('d', fgArc as string).attr('fill', color)
      .attr('filter', `drop-shadow(0 0 6px ${color}88)`);
    // Center text
    g.append('text').attr('x', 0).attr('y', -12).attr('text-anchor', 'middle')
      .attr('fill', 'white').attr('font-size', '24px').attr('font-weight', '900')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(`${(pct * 100).toFixed(0)}%`);
    g.append('text').attr('x', 0).attr('y', 6).attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.3)').attr('font-size', '10px').attr('font-weight', '600')
      .attr('letter-spacing', '0.08em').text('LIMIT USED');
  }, [used, limit]);
  return <svg ref={ref} width={200} height={130} className="mx-auto" />;
};

// ── Sparkline ──────────────────────────────────────────────────────────────────
const Sparkline = ({ data }: { data: number[] }) => {
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width={72} height={32}>
      <LineChart data={chartData}>
        <defs>
          <linearGradient id="spkGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00C2FF" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#00C2FF" stopOpacity={1} />
          </linearGradient>
        </defs>
        <Line type="monotone" dataKey="v" stroke="url(#spkGrad)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

// ── Glass Recharts Tooltip ─────────────────────────────────────────────────────
const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="recharts-tooltip-glass" style={{
      background: 'rgba(3,9,24,0.92)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(0,194,255,0.18)',
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      padding: '10px 14px',
      minWidth: 160,
    }}>
      <p className="section-label mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 mt-1">
          <span className="text-xs" style={{ color: p.color }}>{p.name}</span>
          <span className="num text-xs font-bold text-white">{p.value} units</span>
        </div>
      ))}
    </div>
  );
};

// ── Stagger container & item variants ─────────────────────────────────────────
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item      = { hidden: { opacity: 0, y: 22, filter: 'blur(4px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } } };

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/seller/dashboard').then(r => setData(r.data)).catch(() => {
      setData({
        stats: {
          inventoryValue: 12450000,
          activeRetailers: 15,
          alertsCount: 8,
          highestRiskRetailer: { name: 'Chandigarh Style Hub', score: 82 },
        },
        alerts: [
          { id: '1', title: 'Critical Stockout Risk',  desc: 'Festive Bandhani Kurti Ivory/XL — 18 units remain', urgency: 'urgent', route: '/seller/forecasts' },
          { id: '2', title: 'Credit Limit Warning',    desc: 'Westend Wardrobe at 88% credit limit',            urgency: 'urgent', route: '/seller/retailers' },
          { id: '3', title: 'Dead Stock Flag',         desc: 'Chanderi Silk Kurta Royal Blue/S — 0 sales in 22d', urgency: 'high', route: '/seller/inventory' },
          { id: '4', title: 'Restock Recommended',     desc: 'Modal Slub Kurti Navy/M — 2 weeks of cover left', urgency: 'medium', route: '/seller/forecasts' },
          { id: '5', title: 'Ghost Restock Detected',  desc: 'Acid Wash Jacket Black/L — no shipment linked',   urgency: 'medium', route: '/seller/alerts' },
        ],
        credit: { used: 3450000, limit: 8000000 },
        sellThrough: Array.from({ length: 30 }).map((_, i) => {
          const day = new Date(); day.setDate(day.getDate() - (29 - i));
          return {
            date: day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            'Meena Boutique':  Math.floor(Math.random() * 35 + 15),
            'Rajwadi Fashions': Math.floor(Math.random() * 28 + 8),
            'Silk Route':      Math.floor(Math.random() * 22 + 5),
          };
        }),
        topMovers: [
          { sku: 'Festive Bandhani Kurti', category: 'Ethnic', sold: 312, trend: [8,12,15,20,32,40,48] },
          { sku: 'Pique Polo Collar Shirt', category: 'Casual', sold: 265, trend: [5,8,10,16,20,24,28] },
          { sku: 'Chanderi Silk Kurta',     category: 'Ethnic', sold: 198, trend: [12,14,16,20,22,26,30] },
          { sku: 'Hand Block Print Saree',  category: 'Ethnic', sold: 175, trend: [6,8,9,11,14,16,20] },
          { sku: 'Cable Knit Sweater',      category: 'Winter', sold: 142, trend: [4,5,8,8,10,13,15] },
        ],
        deadStock: [
          { sku: 'Chanderi Silk Kurta Royal Blue/S', location: 'Rajwadi Fashions',  units: 38, daysStagnant: 22 },
          { sku: 'Mod. Slub Kurti Black/XS',         location: 'Westend Wardrobe',  units: 25, daysStagnant: 31 },
          { sku: 'Cable Knit Sweater Charcoal/XL',   location: 'Bhopal Ethnic',     units: 19, daysStagnant: 18 },
          { sku: 'Acid Wash Denim Jacket Black/L',   location: 'Chandigarh Style',  units: 14, daysStagnant: 15 },
        ],
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <LoadingSpinner message="Calculating Live Dashboard..." />;

  const urgencyMap: Record<string, { bar: string; glow: string }> = {
    urgent: { bar: '#FF4757', glow: 'rgba(255,71,87,0.5)' },
    high:   { bar: '#FF8C00', glow: 'rgba(255,140,0,0.4)' },
    medium: { bar: '#FFB800', glow: 'rgba(255,184,0,0.3)' },
  };

  return (
    <PageWrapper title="Dashboard">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-8">

        {/* ── Hero row header ─────────────────────────────────────────── */}
        <motion.div variants={item} className="flex items-center gap-3">
          <h1 className="text-xl font-black text-white tracking-tight">Overview</h1>
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(0,194,255,0.08)', border: '1px solid rgba(0,194,255,0.2)', color: '#00C2FF' }}
          >Live</span>
          <span className="ml-auto text-xs font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </motion.div>

        {/* ── Stat Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              icon: DollarSign, label: 'Total Inventory Value',
              val: <><span className="text-xs font-semibold mr-0.5">₹</span><AnimatedNumber value={data.stats.inventoryValue / 100000} decimals={1} suffix="L" /></>,
              color: '#00E5A0', bg: 'rgba(0,229,160,0.08)', border: 'rgba(0,229,160,0.15)',
            },
            {
              icon: Users, label: 'Active Retailers',
              val: <AnimatedNumber value={data.stats.activeRetailers} />,
              color: '#00C2FF', bg: 'rgba(0,194,255,0.08)', border: 'rgba(0,194,255,0.15)',
            },
            {
              icon: Bell, label: 'Alerts Requiring Action',
              val: <AnimatedNumber value={data.stats.alertsCount} />,
              color: '#FFB800', bg: 'rgba(255,184,0,0.08)', border: 'rgba(255,184,0,0.15)', badge: data.stats.alertsCount > 0,
            },
            {
              icon: ShieldAlert, label: 'Highest Risk Retailer',
              val: <span className="text-base font-extrabold">{data.stats.highestRiskRetailer.name.split(' ').slice(0, 2).join(' ')}</span>,
              sub: `${data.stats.highestRiskRetailer.score}/100`,
              color: '#FF4757', bg: 'rgba(255,71,87,0.08)', border: 'rgba(255,71,87,0.15)',
            },
          ].map((card, i) => (
            <motion.div
              key={i} variants={item}
              className="glass-stat-card hover-glow p-5 flex flex-col relative overflow-hidden"
              style={{ borderColor: card.border }}
            >
              {/* Colored accent strip at top */}
              <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
                   style={{ background: `linear-gradient(90deg, ${card.color}60, ${card.color}10)` }} />
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl" style={{ background: card.bg }}>
                  <card.icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
                {card.badge && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#FF4757' }} />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: '#FF4757' }} />
                  </span>
                )}
              </div>
              <div>
                <p className="num text-2xl font-black text-white">{card.val}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{card.label}</p>
                  {card.sub && <p className="num text-xs font-bold" style={{ color: card.color }}>{card.sub}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Alerts + Credit Gauge ────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-5">
          {/* Alerts panel */}
          <motion.div variants={item} className="col-span-12 xl:col-span-8 glass-card hover-glow overflow-hidden">
            <div
              className="px-5 py-3.5 border-b flex items-center gap-2"
              style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}
            >
              <AlertCircle className="w-3.5 h-3.5" style={{ color: '#FFB800' }} />
              <span className="section-label">Attention Required</span>
              <span
                className="ml-auto num text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,71,87,0.1)', color: '#FF4757', border: '1px solid rgba(255,71,87,0.2)' }}
              >
                {data.alerts.length} active
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {data.alerts.map((alert: any, i: number) => {
                const uc = urgencyMap[alert.urgency] || urgencyMap.medium;
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, ease: 'easeOut' }}
                    className="flex items-center gap-4 px-5 py-3.5 cursor-pointer group transition-all duration-200"
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    onClick={() => navigate(alert.route)}
                  >
                    <div className="w-[3px] h-9 rounded-full flex-shrink-0"
                         style={{ background: uc.bar, boxShadow: `0 0 8px ${uc.glow}` }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white group-hover:text-[#00C2FF] transition-colors duration-200 truncate">{alert.title}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{alert.desc}</p>
                    </div>
                    <button
                      className="p-1.5 rounded-lg flex-shrink-0 transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,194,255,0.12)'; e.currentTarget.style.color = '#00C2FF'; e.currentTarget.style.borderColor = 'rgba(0,194,255,0.25)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Credit gauge */}
          <motion.div variants={item}
            className="col-span-12 xl:col-span-4 glass-card hover-glow p-5 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-3.5 h-3.5" style={{ color: '#00C2FF' }} />
              <span className="section-label">Credit Exposure</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <CreditGauge used={data.credit.used} limit={data.credit.limit} />
              <div className="flex gap-3 w-full mt-3">
                {[
                  { label: 'Used', val: `₹${(data.credit.used / 100000).toFixed(1)}L`, color: '#FF4757' },
                  { label: 'Limit', val: `₹${(data.credit.limit / 100000).toFixed(1)}L`, color: 'rgba(255,255,255,0.5)' },
                ].map((s) => (
                  <div key={s.label} className="flex-1 text-center py-2.5 rounded-xl"
                       style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="num text-sm font-black" style={{ color: s.color }}>{s.val}</p>
                    <p className="section-label mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Sell-Through Chart ───────────────────────────────────────── */}
        <motion.div variants={item} className="glass-chart hover-glow">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4" style={{ color: '#A855F7' }} />
            <h2 className="text-sm font-bold text-white">Sell-Through Overview</h2>
            <span className="ml-1 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Last 30 days — Top 3 Retailers</span>
            <div className="ml-auto flex items-center gap-4">
              {[
                { label: 'Meena Boutique', color: '#00C2FF' },
                { label: 'Rajwadi Fashions', color: '#A855F7' },
                { label: 'Silk Route', color: '#00E5A0' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
                  <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.sellThrough} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gEl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00C2FF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#00C2FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gVi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gMi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E5A0" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#00E5A0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="transparent" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
                <YAxis stroke="transparent" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<GlassTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="Meena Boutique" stroke="#00C2FF" fill="url(#gEl)" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="Rajwadi Fashions" stroke="#A855F7" fill="url(#gVi)" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="Silk Route" stroke="#00E5A0" fill="url(#gMi)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ── Bottom Lists ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Top movers */}
          <motion.div variants={item} className="glass-card hover-glow overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center gap-2"
                 style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
              <TrendingUp className="w-3.5 h-3.5 text-[#00E5A0]" />
              <span className="section-label">Top Moving SKUs</span>
            </div>
            <div className="p-3 space-y-0.5">
              {data.topMovers.map((m: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.055 }}
                  className="flex items-center justify-between p-3 rounded-xl transition-all duration-200 group"
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="flex items-center gap-3">
                    <span className="num text-sm font-black" style={{ color: 'rgba(0,194,255,0.4)', width: 18 }}>{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{m.sku}</p>
                      <p className="num text-[10px] font-bold mt-0.5" style={{ color: '#00E5A0' }}>{m.sold.toLocaleString()} units sold</p>
                    </div>
                  </div>
                  <Sparkline data={m.trend} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Dead stock */}
          <motion.div variants={item} className="glass-card hover-glow overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center gap-2"
                 style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
              <PackageX className="w-3.5 h-3.5" style={{ color: '#FFB800' }} />
              <span className="section-label">Dead Stock Risk</span>
            </div>
            <div className="p-3 space-y-0.5">
              {data.deadStock.map((d: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.055 }}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200"
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="p-2 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.12)' }}>
                    <AlertCircle className="w-3.5 h-3.5" style={{ color: '#FFB800' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{d.sku}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{d.location} · <span className="num">{d.units}</span> units</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="num text-sm font-black" style={{ color: d.daysStagnant > 30 ? '#FF4757' : '#FFB800' }}>{d.daysStagnant}d</p>
                    <p className="section-label mt-0.5">stagnant</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

      </motion.div>
    </PageWrapper>
  );
};
