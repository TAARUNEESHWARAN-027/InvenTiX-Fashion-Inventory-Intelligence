import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useSocket } from '../../lib/socket';
import {
  Package, CreditCard, TrendingDown, Zap,
  AlertTriangle, ShieldAlert, Warehouse, TrendingUp,
  Ghost, BarChart2, Clock, ArrowRight, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageWrapper } from '../../components/shared/PageWrapper';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ErrorCard } from '../../components/shared/ErrorCard';
import { EmptyState } from '../../components/shared/EmptyState';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AlertFlag {
  id: string;
  entity_type: string;
  entity_id: string;
  anomaly_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  notes: string | null;
  status: string;
  created_at: string;
  // injected from live socket push
  _isNew?: boolean;
}

// ── Config maps ───────────────────────────────────────────────────────────────
const typeConfig: Record<string, {
  icon: React.FC<{ className?: string }>;
  label: string;
  category: string;
  description: (notes: string | null) => string;
}> = {
  dead_stock_warning: {
    icon: Ghost,
    label: 'Dead Stock Warning',
    category: 'Dead Stock',
    description: (notes) => notes || 'A variant has not sold in over 14 days while stock remains at the retailer.',
  },
  low_stock: {
    icon: Warehouse,
    label: 'Low Stock Alert',
    category: 'Low Stock',
    description: (notes) => notes || 'Stock level has dropped below the critical threshold of 20 units.',
  },
  credit_risk: {
    icon: CreditCard,
    label: 'Credit Risk Flag',
    category: 'Credit Risk',
    description: (notes) => notes || 'Retailer has high credit utilisation combined with low sell-through rate.',
  },
  sudden_stock_spike: {
    icon: TrendingUp,
    label: 'Sudden Stock Spike',
    category: 'Fast Moving',
    description: (notes) => notes || 'An unusually large stock addition was detected — possible data entry error.',
  },
  zero_sell_through_cliff: {
    icon: TrendingDown,
    label: 'Zero Sell-Through Cliff',
    category: 'Dead Stock',
    description: (notes) => notes || 'Sell-through rate has dropped to zero with stock still held at retailer.',
  },
  ghost_restock: {
    icon: Zap,
    label: 'Ghost Restock Detected',
    category: 'Dead Stock',
    description: (notes) => notes || 'Stock was restocked on a variant with no associated shipment or production record.',
  },
  repeated_damage: {
    icon: ShieldAlert,
    label: 'Repeated Damage Report',
    category: 'Dead Stock',
    description: (notes) => notes || 'Same SKU has recorded multiple negative stock adjustments — possible damage issue.',
  },
  unusual_activity: {
    icon: BarChart2,
    label: 'Unusual Activity',
    category: 'Dead Stock',
    description: (notes) => notes || 'Anomalous stock movement detected by the ML engine.',
  },
};

const severityConfig = {
  critical: { label: 'Critical', pill: 'glass-danger',   pulse: true  },
  high:     { label: 'High',     pill: 'glass-amber',    pulse: false },
  medium:   { label: 'Medium',   pill: 'glass-amber',    pulse: false },
  low:      { label: 'Low',      pill: 'glass-electric', pulse: false },
};

const CATEGORIES = ['All', 'Dead Stock', 'Low Stock', 'Credit Risk', 'Fast Moving'];

// ── Time relative formatter ───────────────────────────────────────────────────
const timeAgo = (dateStr: string) => {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ── Stat Card (premium glass — matches accentColor/accentBg props from stagger array)
// ──────────────────────────────────────────────────────────────────
const StatCard = ({
  icon: Icon, label, value, accentColor, accentBg,
}: {
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: number;
  accentColor: string;
  accentBg: string;
}) => (
  <div className="glass-stat-card hover-glow p-5 flex items-center gap-4 relative overflow-hidden">
    {/* Top accent strip */}
    <div
      className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
      style={{ background: `linear-gradient(90deg, ${accentColor}70, transparent)` }}
    />
    <div className="p-3 rounded-xl flex-shrink-0" style={{ background: accentBg }}>
      <Icon className="w-5 h-5" style={{ color: accentColor }} />
    </div>
    <div>
      <p className="num text-2xl font-black text-white">{value}</p>
      <p className="text-xs mt-0.5 font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
    </div>
  </div>
);

// ── Alert Card ────────────────────────────────────────────────────────────────
const AlertCard = ({ alert, isNew }: { alert: AlertFlag; isNew?: boolean }) => {
  const navigate = useNavigate();
  const cfg = typeConfig[alert.anomaly_type] || typeConfig.unusual_activity;
  const sev = severityConfig[alert.severity] || severityConfig.low;
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -20, scale: 0.97 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-navy-800 border border-navy-700 rounded-2xl p-5 hover:border-navy-600 transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`p-3 rounded-xl shrink-0 mt-0.5 ${
          alert.severity === 'critical' ? 'bg-danger/10' :
          alert.severity === 'high' ? 'bg-orange-500/10' :
          alert.severity === 'medium' ? 'bg-amber/10' : 'bg-gray-500/10'
        }`}>
          <Icon className={`w-5 h-5 ${
            alert.severity === 'critical' ? 'text-danger' :
            alert.severity === 'high' ? 'text-orange-400' :
            alert.severity === 'medium' ? 'text-amber' : 'text-gray-400'
          }`} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Severity badge — glass token handles all styles */}
            <span className={sev.pill}>
              {sev.pulse && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
                </span>
              )}
              {sev.label}
            </span>
            <span className="glass-violet">{cfg.label}</span>
          </div>

          <h3 className="text-sm font-semibold text-white mt-2">
            {cfg.label} — <span className="text-gray-300 font-normal">{alert.entity_type} {alert.entity_id.slice(0, 8)}…</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{cfg.description(alert.notes)}</p>

          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{timeAgo(alert.created_at)}</span>
            </div>
            <button
              onClick={() => navigate('/seller/inventory')}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-electric hover:text-navy-900 bg-electric/10 hover:bg-electric rounded-lg border border-electric/20 hover:border-transparent transition-all"
            >
              View SKU <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const r = await api.get('/alerts');
      // Defensive: always set an array even if backend returns unexpected shape
      setAlerts(Array.isArray(r.data) ? r.data : []);
    } catch (err: any) {
      console.error('[Alerts] fetch error:', err);
      setError(err?.response?.data?.error || 'Failed to load alerts. Please retry.');
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Live push: prepend new alerts with animation marker
  useSocket('alert', useCallback((data: { type: string; variant_id?: string; current_stock?: number; event?: AlertFlag }) => {
    const newAlert: AlertFlag = data.event ?? {
      id: `live-${Date.now()}`,
      entity_type: 'sku_variant',
      entity_id: data.variant_id || 'unknown',
      anomaly_type: data.type,
      severity: data.type === 'credit_risk' ? 'high' : 'medium',
      notes: data.current_stock !== undefined ? `Current stock: ${data.current_stock} units` : null,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    setAlerts(prev => [newAlert, ...prev]);
    setNewIds(prev => new Set([...prev, newAlert.id]));
    // Remove "new" marker after animation completes
    setTimeout(() => setNewIds(prev => { const s = new Set(prev); s.delete(newAlert.id); return s; }), 2000);
  }, []));

  // Stats
  const deadStockCount  = (alerts || []).filter(a => ['dead_stock_warning', 'zero_sell_through_cliff', 'ghost_restock'].includes(a.anomaly_type)).length;
  const lowStockCount   = (alerts || []).filter(a => a.anomaly_type === 'low_stock').length;
  const creditRiskCount = (alerts || []).filter(a => a.anomaly_type === 'credit_risk').length;
  const fastMovingCount = (alerts || []).filter(a => a.anomaly_type === 'sudden_stock_spike').length;

  // Filter
  const filtered = (alerts || []).filter(a => {
    if (activeTab === 'All') return true;
    const cfg = typeConfig[a?.anomaly_type];
    return cfg?.category === activeTab;
  });

  if (error) return <PageWrapper title="Alerts"><ErrorCard message={error} onRetry={fetchAlerts} /></PageWrapper>;
  if (isLoading) return <PageWrapper title="Alerts"><LoadingSpinner message="Detecting anomalies..." /></PageWrapper>;

  return (
    <PageWrapper title="Alerts">
      <div className="space-y-6">
      {/* Stat Cards — stagger in */}
      <motion.div
        className="grid grid-cols-2 xl:grid-cols-4 gap-4"
        initial="hidden" animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
      >
        {[
          { icon: Ghost,         label: 'Dead Stock Warnings',  value: deadStockCount,  accentColor: '#FFB800', accentBg: 'rgba(255,184,0,0.08)' },
          { icon: Warehouse,     label: 'Low Stock Alerts',     value: lowStockCount,   accentColor: '#FFB800', accentBg: 'rgba(255,184,0,0.08)' },
          { icon: AlertTriangle, label: 'Credit Risk Flags',    value: creditRiskCount, accentColor: '#FF4757', accentBg: 'rgba(255,71,87,0.08)' },
          { icon: TrendingUp,    label: 'Fast Moving Detected', value: fastMovingCount, accentColor: '#00E5A0', accentBg: 'rgba(0,229,160,0.08)' },
        ].map((c, i) => (
          <motion.div key={i} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.28 } } }}>
            <StatCard {...c} />
          </motion.div>
        ))}
      </motion.div>

      {/* Filter Tabs */}
      <div className="glass-card flex items-center gap-2 p-2.5" style={{ borderRadius: '0.875rem' }}>
        <Bell className="w-3.5 h-3.5 ml-1.5 mr-1 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className="px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200"
            style={activeTab === cat ? {
              background: 'rgba(0,194,255,0.12)',
              color: '#00C2FF',
              border: '1px solid rgba(0,194,255,0.25)',
              boxShadow: '0 0 12px rgba(0,194,255,0.12)',
            } : {
              color: 'rgba(255,255,255,0.4)',
              border: '1px solid transparent',
            }}
          >
            {cat}
          </button>
        ))}
        <span className="ml-auto num text-xs pr-1.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
          {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Alert Feed — stagger cascade */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 glass-card animate-pulse" style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Bell} title="All clear" description="No alerts matching this filter" />
      ) : (
        <motion.div layout className="space-y-3"
          initial="hidden" animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
        >
          <AnimatePresence initial={false}>
            {filtered.map((alert, i) => (
              <motion.div
                key={alert.id}
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                className={newIds.has(alert.id) ? 'alert-flash' : ''}
              >
                <AlertCard alert={alert} isNew={newIds.has(alert.id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
    </PageWrapper>
  );
};
