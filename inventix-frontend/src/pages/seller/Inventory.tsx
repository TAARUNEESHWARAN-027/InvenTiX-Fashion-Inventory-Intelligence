import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import api from '../../lib/api';
import {
  Package, AlertTriangle, XCircle, CheckCircle,
  Search, Upload, RefreshCw, ChevronDown, ChevronUp,
  X, Plus, Minus, Clock, LayoutGrid, TableProperties
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SizeColourHeatmap } from '../../components/charts/SizeColourHeatmap';
import { useSocket } from '../../lib/socket';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { PageWrapper } from '../../components/shared/PageWrapper';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorCard } from '../../components/shared/ErrorCard';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Variant {
  id: string;
  colour: string;
  size: string;
  current_stock: number;
  last_updated: string;
  sell_through_rate: number;
}

interface SKU {
  id: string;
  name: string;
  category: string;
  season: string;
  base_price: number;
  variants: Variant[];
}

interface TimelineEntry {
  id: string;
  quantity_delta: number;
  reason_code: string;
  created_at: string;
  size: string;
  colour: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const stockStatus = (qty: number) => {
  if (qty >= 50) return { label: 'Healthy',  cls: 'glass-mint'   };
  if (qty >= 20) return { label: 'Low',      cls: 'glass-amber'  };
  return              { label: 'Critical', cls: 'glass-danger' };
};

const REASON_CODES = [
  'Restock', 'Production Complete', 'Damaged', 'QC Failed', 'Return Received', 'Transfer Out'
];

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({
  icon: Icon, label, value, accentColor, accentBg
}: { icon: any; label: string; value: number | string; accentColor: string; accentBg: string }) => (
  <div className="glass-stat-card hover-glow p-5 flex items-center gap-4 relative overflow-hidden">
    <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
         style={{ background: `linear-gradient(90deg, ${accentColor}70, ${accentColor}10)` }} />
    <div className="p-3 rounded-xl flex-shrink-0" style={{ background: accentBg }}>
      <Icon className="w-5 h-5" style={{ color: accentColor }} />
    </div>
    <div>
      <p className="num text-2xl font-black text-white">{value}</p>
      <p className="text-xs mt-0.5 font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
    </div>
  </div>
);


// ── Update Stock Modal ────────────────────────────────────────────────────────
const UpdateStockModal = ({ skus, onClose, onSuccess }: { skus: SKU[]; onClose: () => void; onSuccess: () => void }) => {
  const [variantId, setVariantId] = useState('');
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('Restock');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allVariants = skus.flatMap(s =>
    s.variants.map(v => ({ ...v, skuName: s.name }))
  );

  const handleSubmit = async () => {
    if (!variantId || delta === 0) return setError('Select a variant and enter a non-zero quantity.');
    setLoading(true);
    setError('');
    try {
      await api.post('/inventory/update', { variant_id: variantId, quantity_delta: delta, reason_code: reason });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update stock');
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
          <h2 className="text-lg font-bold text-white">Update Stock</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-navy-700 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Variant</label>
            <select value={variantId} onChange={e => setVariantId(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-electric/50">
              <option value="">Select variant...</option>
              {allVariants.map(v => (
                <option key={v.id} value={v.id}>{v.skuName} — {v.colour} / {v.size} ({v.current_stock} units)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Quantity Delta</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setDelta(d => d - 1)} className="p-2.5 bg-navy-700 hover:bg-navy-600 text-white rounded-xl"><Minus className="w-4 h-4" /></button>
              <input type="number" value={delta} onChange={e => setDelta(Number(e.target.value))}
                className="flex-1 bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-center text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-electric/50" />
              <button onClick={() => setDelta(d => d + 1)} className="p-2.5 bg-navy-700 hover:bg-navy-600 text-white rounded-xl"><Plus className="w-4 h-4" /></button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Positive = add stock, Negative = remove stock</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Reason Code</label>
            <select value={reason} onChange={e => setReason(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-electric/50">
              {REASON_CODES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-navy-600 text-gray-400 hover:text-white rounded-xl text-sm font-semibold transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 px-4 py-3 bg-electric text-navy-900 font-bold text-sm rounded-xl hover:bg-electric-dark transition-all shadow-[0_0_20px_rgba(0,194,255,0.2)] disabled:opacity-50">
            {loading ? 'Saving...' : 'Confirm Update'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Add SKU Modal ─────────────────────────────────────────────────────────────
const AddSkuModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ethnic wear');
  const [season, setSeason] = useState('all-season');
  const [basePrice, setBasePrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const CATEGORIES = ['ethnic wear', 'casual wear', 'bottoms', 'westernwear', 'accessories', 'general'];
  const SEASONS = ['all-season', 'summer 2025', 'festive 2025', 'winter 2025', 'clearance'];
  const handleSubmit = async () => {
    if (!name.trim()) return setError('SKU name is required.');
    setLoading(true); setError('');
    try {
      await api.post('/inventory/skus', { name: name.trim(), category, season, base_price: parseFloat(basePrice) || 0 });
      onSuccess(); onClose();
    } catch (e: any) { setError(e.response?.data?.error || 'Failed to create SKU'); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-navy-800 border border-navy-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-lg font-bold text-white">Add New SKU</h2><p className="text-xs text-gray-500 mt-0.5">Create a new product style</p></div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-navy-700 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">SKU Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bandhani Cotton Kurti"
              className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-electric/50 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-electric/50 text-sm">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Season</label>
              <select value={season} onChange={e => setSeason(e.target.value)}
                className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-electric/50 text-sm">
                {SEASONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Base Price (₹)</label>
            <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="e.g. 899"
              className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-electric/50 text-sm" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-navy-600 text-gray-400 hover:text-white rounded-xl text-sm font-semibold">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 px-4 py-3 bg-electric text-navy-900 font-bold text-sm rounded-xl hover:bg-electric-dark shadow-[0_0_20px_rgba(0,194,255,0.2)] disabled:opacity-50">
            {loading ? 'Creating...' : 'Create SKU'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Add Variant Modal ─────────────────────────────────────────────────────────
const AddVariantModal = ({ skus, onClose, onSuccess }: { skus: SKU[]; onClose: () => void; onSuccess: () => void }) => {
  const [skuId, setSkuId] = useState(skus[0]?.id || '');
  const [colour, setColour] = useState('');
  const [size, setSize] = useState('M');
  const [stock, setStock] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];
  const PRESET_COLOURS = ['Ivory', 'Coral Pink', 'Sky Blue', 'Terracotta', 'Olive Green', 'Rose Gold', 'Navy Blue', 'Charcoal', 'White', 'Black', 'Mint Green', 'Mustard'];
  const handleSubmit = async () => {
    if (!skuId) return setError('Select a SKU.');
    if (!colour.trim()) return setError('Colour is required.');
    setLoading(true); setError('');
    try {
      await api.post(`/inventory/skus/${skuId}/variants`, { colour: colour.trim(), size, current_stock: parseInt(stock) || 0 });
      onSuccess(); onClose();
    } catch (e: any) { setError(e.response?.data?.error || 'Failed to add variant'); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-navy-800 border border-navy-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-lg font-bold text-white">Add Variant</h2><p className="text-xs text-gray-500 mt-0.5">Add a colour/size variant to an existing SKU</p></div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-navy-700 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">SKU *</label>
            <select value={skuId} onChange={e => setSkuId(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-electric/50 text-sm">
              <option value="">Select SKU...</option>
              {skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Colour *</label>
            <input value={colour} onChange={e => setColour(e.target.value)} placeholder="Type or pick below..."
              className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-electric/50 text-sm mb-2" />
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLOURS.map(c => (
                <button key={c} onClick={() => setColour(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                    colour === c ? 'bg-electric text-navy-900 border-electric' : 'border-navy-600 text-gray-400 hover:text-white hover:border-navy-500'
                  }`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Size *</label>
              <div className="flex flex-wrap gap-1.5">
                {SIZES.map(s => (
                  <button key={s} onClick={() => setSize(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      size === s ? 'bg-electric text-navy-900 border-electric' : 'border-navy-600 text-gray-400 hover:text-white'
                    }`}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Initial Stock</label>
              <input type="number" value={stock} onChange={e => setStock(e.target.value)} min="0"
                className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-electric/50 text-sm" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-navy-600 text-gray-400 hover:text-white rounded-xl text-sm font-semibold">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 px-4 py-3 bg-electric text-navy-900 font-bold text-sm rounded-xl hover:bg-electric-dark shadow-[0_0_20px_rgba(0,194,255,0.2)] disabled:opacity-50">
            {loading ? 'Adding...' : 'Add Variant'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};


const BulkUploadModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [result, setResult] = useState<{ success: number; errors: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = text.split('\n').slice(0, 6).map(r => r.split(',').map(c => c.trim()));
      setPreview(rows);
    };
    reader.readAsText(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/inventory/bulk-upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data);
      onSuccess();
    } catch (e: any) {
      setResult({ success: 0, errors: [{ row: '-', error: e.response?.data?.error || 'Upload failed' }] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-navy-800 border border-navy-700 rounded-2xl p-6 w-full max-w-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Bulk Stock Upload</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-navy-700 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        {!file ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-navy-600 hover:border-electric/50 rounded-2xl p-12 text-center cursor-pointer transition-all group"
          >
            <Upload className="w-10 h-10 text-gray-500 group-hover:text-electric mx-auto mb-3 transition-colors" />
            <p className="text-white font-semibold">Drop your CSV here or click to browse</p>
            <p className="text-gray-500 text-sm mt-1">Required columns: <code className="text-electric font-mono">SKU name, colour, size, quantity, reason_code</code></p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 p-4 bg-mint/10 border border-mint/20 rounded-xl text-center">
                <p className="text-3xl font-bold text-mint">{result.success}</p>
                <p className="text-sm text-gray-400 mt-1">Rows Succeeded</p>
              </div>
              <div className="flex-1 p-4 bg-danger/10 border border-danger/20 rounded-xl text-center">
                <p className="text-3xl font-bold text-danger">{result.errors.length}</p>
                <p className="text-sm text-gray-400 mt-1">Rows Failed</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {result.errors.map((e, i) => (
                  <div key={i} className="text-xs text-danger bg-danger/5 border border-danger/10 rounded-lg px-3 py-2">
                    Row {e.row}: {e.error}
                  </div>
                ))}
              </div>
            )}
            <button onClick={onClose} className="w-full px-4 py-3 bg-electric text-navy-900 font-bold text-sm rounded-xl hover:bg-electric-dark mt-2">Done</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-navy-900 rounded-xl border border-navy-700">
              <Package className="w-4 h-4 text-electric" />
              <span className="text-sm text-white font-medium">{file.name}</span>
              <button onClick={() => { setFile(null); setPreview([]); }} className="ml-auto p-1 hover:text-danger"><X className="w-4 h-4" /></button>
            </div>
            {preview.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Preview (first 5 rows)</p>
                <div className="overflow-x-auto rounded-xl border border-navy-700">
                  <table className="w-full text-xs">
                    <thead className="bg-navy-900">
                      <tr>{preview[0]?.map((h, i) => <th key={i} className="px-3 py-2 text-left text-gray-400 font-semibold">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {preview.slice(1).map((row, i) => (
                        <tr key={i} className="border-t border-navy-700">
                          {row.map((cell, j) => <td key={j} className="px-3 py-2 text-gray-300">{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setFile(null); setPreview([]); }} className="flex-1 px-4 py-3 border border-navy-600 text-gray-400 hover:text-white rounded-xl text-sm font-semibold">Change File</button>
              <button onClick={handleUpload} disabled={loading}
                className="flex-1 px-4 py-3 bg-electric text-navy-900 font-bold text-sm rounded-xl hover:bg-electric-dark disabled:opacity-50">
                {loading ? 'Uploading...' : 'Confirm Upload'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ── Timeline Row ──────────────────────────────────────────────────────────────
const TimelineRow = ({ variantId }: { variantId: string }) => {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const skuId = variantId; // timeline is fetched by sku_id from the parent, but here we pass variant for context
    api.get(`/inventory/${variantId}/timeline`).then(r => {
      setEntries(r.data.slice(0, 10));
    }).finally(() => setLoading(false));
  }, [variantId]);

  if (loading) return <div className="py-4 text-center text-gray-500 text-sm animate-pulse">Loading timeline...</div>;

  return (
    <div className="p-4 bg-navy-900/50 space-y-2">
      {entries.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-2">No movement recorded.</p>
      ) : entries.map(e => (
        <div key={e.id} className="flex items-center gap-3 text-xs">
          <Clock className="w-3 h-3 text-gray-500 shrink-0" />
          <span className="text-gray-400">{new Date(e.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          <span className={`font-bold font-mono ${e.quantity_delta > 0 ? 'text-mint' : 'text-danger'}`}>{e.quantity_delta > 0 ? '+' : ''}{e.quantity_delta}</span>
          <span className="text-gray-400">{e.reason_code}</span>
          <span className="ml-auto text-gray-600">{e.colour} / {e.size}</span>
        </div>
      ))}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const Inventory: React.FC = () => {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAddSkuModal, setShowAddSkuModal] = useState(false);
  const [showAddVariantModal, setShowAddVariantModal] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'heatmap'>('table');
  const [flashingVariant, setFlashingVariant] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/inventory').then(r => setSkus(r.data)).catch(e => setError('Failed to load inventory data.')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  useSocket('stock_update', useCallback((payload: any) => {
    const { variant } = payload;
    setSkus(prevSkus => {
      let updated = false;
      const nextSkus = prevSkus.map(s => {
        const vi = s.variants.findIndex(v => v.id === variant.id);
        if (vi !== -1) {
          updated = true;
          const nv = [...s.variants];
          nv[vi] = { ...nv[vi], current_stock: variant.current_stock, last_updated: variant.last_updated };
          return { ...s, variants: nv };
        }
        return s;
      });
      if (updated) {
        setFlashingVariant(variant.id);
        setTimeout(() => setFlashingVariant(null), 1000);
      }
      return nextSkus;
    });
  }, []));

  // Flatten all variants for the table
  const allRows = skus.flatMap(s => s.variants.map(v => ({ ...v, skuName: s.name, season: s.season, skuId: s.id })));

  const filtered = allRows.filter(row => {
    const matchSearch = row.skuName.toLowerCase().includes(search.toLowerCase());
    const matchSeason = seasonFilter === 'All' || row.season === seasonFilter;
    const status = stockStatus(row.current_stock).label;
    const matchStatus = statusFilter === 'All' || status === statusFilter;
    return matchSearch && matchSeason && matchStatus;
  });

  const totalSkus = skus.length;
  const totalUnits = allRows.reduce((a, v) => a + v.current_stock, 0);
  const warning = allRows.filter(v => v.current_stock >= 20 && v.current_stock < 50).length;
  const critical = allRows.filter(v => v.current_stock < 20).length;

  if (error) return <PageWrapper title="Inventory"><ErrorCard message={error} onRetry={fetchInventory} /></PageWrapper>;
  if (loading && skus.length === 0) return <PageWrapper title="Inventory"><LoadingSpinner message="Fetching Inventory..." /></PageWrapper>;

  return (
    <PageWrapper title="Inventory">
      <div className="space-y-6">
      {/* Stat Cards */}
      <motion.div
        className="grid grid-cols-2 xl:grid-cols-4 gap-4"
        initial="hidden"
        animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
      >
        {[
          { icon: Package,       label: 'Total SKUs',         value: totalSkus,                          accentColor: '#00C2FF', accentBg: 'rgba(0,194,255,0.08)' },
          { icon: CheckCircle,   label: 'Total Stock Units',  value: totalUnits.toLocaleString('en-IN'), accentColor: '#00E5A0', accentBg: 'rgba(0,229,160,0.08)' },
          { icon: AlertTriangle, label: 'Low Stock (Warning)',value: warning,                            accentColor: '#FFB800', accentBg: 'rgba(255,184,0,0.08)' },
          { icon: XCircle,       label: 'Critical (< 20 units)',value: critical,                         accentColor: '#FF4757', accentBg: 'rgba(255,71,87,0.08)' },
        ].map((c, i) => (
          <motion.div key={i} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}>
            <StatCard {...c} />
          </motion.div>
        ))}
      </motion.div>

      {/* Filter Bar */}
      <div className="glass-card flex flex-wrap gap-3 items-center p-4" style={{ borderRadius: '1rem' }}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU name..."
            className="glass-input pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['All', 'SS25', 'FW25', 'Festival', 'Clearance'].map(s => (
            <button key={s} onClick={() => setSeasonFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${seasonFilter === s ? 'bg-electric text-navy-900' : 'text-gray-400 hover:text-white bg-navy-900 border border-navy-700'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {['All', 'Healthy', 'Low', 'Critical'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${statusFilter === s ? 'bg-violet text-white' : 'text-gray-400 hover:text-white bg-navy-900 border border-navy-700'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => setShowAddSkuModal(true)} className="btn-ghost text-xs">
            <Plus className="w-3.5 h-3.5" /> Add SKU
          </button>
          <button onClick={() => setShowAddVariantModal(true)} className="btn-ghost text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Variant
          </button>
          <button onClick={() => setShowBulkModal(true)} className="btn-ghost text-xs">
            <Upload className="w-3.5 h-3.5" /> Bulk Upload
          </button>
          <button onClick={() => setShowUpdateModal(true)} className="btn-primary text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Update Stock
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
              viewMode === 'table' ? 'bg-electric text-navy-900 border-electric' : 'border-navy-700 text-gray-400 hover:text-white'
            }`}>
            <TableProperties className="w-3.5 h-3.5" /> Table
          </button>
          <button onClick={() => setViewMode('heatmap')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
              viewMode === 'heatmap' ? 'bg-electric text-navy-900 border-electric' : 'border-navy-700 text-gray-400 hover:text-white'
            }`}>
            <LayoutGrid className="w-3.5 h-3.5" /> Velocity Heatmap
          </button>
        </div>
      </div>

      {/* Inventory Table or Heatmap */}
      {viewMode === 'heatmap' && (
        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6">
          <SizeColourHeatmap
            data={allRows.map(r => ({
              style_name: r.skuName,
              size: r.size,
              colour: r.colour,
              sell_through_rate: r.sell_through_rate,
              units_remaining: r.current_stock,
            }))}
          />
        </div>
      )}

      {viewMode === 'table' && /* Inventory Table */
      <div className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-navy-700 bg-navy-900/60">
              <tr>
                {['SKU Name', 'Season', 'Colour', 'Size', 'Stock Qty', 'Sell-Through 30d', 'Last Updated', ''].map(h => (
                  <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-navy-700 rounded w-full"></div></td>
                    ))}
                  </tr>
                ))
              ) : filtered.map(row => {
                const status = stockStatus(row.current_stock);
                const isExpanded = expandedVariant === row.id;
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => setExpandedVariant(isExpanded ? null : row.id)}
                      className={`cursor-pointer transition-all duration-300 ${flashingVariant === row.id ? 'bg-electric/20 shadow-[inset_0_0_10px_rgba(0,194,255,0.5)]' : 'hover:bg-navy-700/30'}`}
                    >
                      <td className="px-5 py-4 font-semibold text-white">{row.skuName}</td>
                      <td className="px-5 py-4">
                        <span className="glass-violet">{row.season}</span>
                      </td>
                      <td className="px-5 py-4 text-gray-300">{row.colour}</td>
                      <td className="px-5 py-4 text-gray-300 font-mono">{row.size}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="num text-base font-black text-white">{row.current_stock}</span>
                          <span className={status.cls}>{status.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-sm text-gray-300">
                        {(row.sell_through_rate * 100).toFixed(1)}%
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-xs">
                        {new Date(row.last_updated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-electric" /> : <ChevronDown className="w-4 h-4" />}
                      </td>
                    </tr>
                    <AnimatePresence>
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }} className="overflow-hidden"
                            >
                              <TimelineRow variantId={row.id} />
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <EmptyState icon={Package} title="No inventory found" description="Adjust your filters or upload stock to see your inventory." />
        )}
      </div>
      }

      {/* Modals */}
      <AnimatePresence>
        {showUpdateModal && <UpdateStockModal skus={skus} onClose={() => setShowUpdateModal(false)} onSuccess={fetchInventory} />}
        {showBulkModal && <BulkUploadModal onClose={() => setShowBulkModal(false)} onSuccess={fetchInventory} />}
        {showAddSkuModal && <AddSkuModal onClose={() => setShowAddSkuModal(false)} onSuccess={fetchInventory} />}
        {showAddVariantModal && <AddVariantModal skus={skus} onClose={() => setShowAddVariantModal(false)} onSuccess={fetchInventory} />}
      </AnimatePresence>
    </div>
    </PageWrapper>
  );
};
