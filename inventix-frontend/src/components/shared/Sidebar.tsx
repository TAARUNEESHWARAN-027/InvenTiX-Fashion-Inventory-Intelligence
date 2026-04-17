import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, MapPin, BellRing, TrendingUp, RefreshCw,
  Activity, AlertTriangle, BarChart3, FileSearch, ShieldAlert, LogOut,
  Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';

const sellerLinks = [
  { name: 'Dashboard',  path: '/seller/dashboard',  icon: LayoutDashboard },
  { name: 'Inventory',  path: '/seller/inventory',  icon: Package },
  { name: 'Retailers',  path: '/seller/retailers',  icon: MapPin },
  { name: 'Alerts',     path: '/seller/alerts',     icon: BellRing },
  { name: 'Forecasts',  path: '/seller/forecasts',  icon: TrendingUp },
  { name: 'Simulation', path: '/seller/simulation', icon: RefreshCw },
];

const adminLinks = [
  { name: 'Activity Feed', path: '/admin/feed',      icon: Activity },
  { name: 'Anomalies',     path: '/admin/anomalies', icon: AlertTriangle },
  { name: 'Analytics',     path: '/admin/analytics', icon: BarChart3 },
  { name: 'Audit Log',     path: '/admin/audit',     icon: FileSearch },
  { name: 'Risk Scores',   path: '/admin/risk',      icon: ShieldAlert },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const [pendingAnomalies, setPendingAnomalies] = useState(0);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const fetch = () => api.get('/admin/anomalies').then(r => setPendingAnomalies(r.data.length)).catch(() => {});
    fetch();
    const iv = setInterval(fetch, 60000);
    return () => clearInterval(iv);
  }, [user]);

  if (!user) return null;

  const links       = user.role === 'admin' ? adminLinks : sellerLinks;
  const isAdmin     = user.role === 'admin';
  const accent      = isAdmin ? '#A855F7' : '#00C2FF';
  const accentFaint = isAdmin ? 'rgba(168,85,247,0.12)' : 'rgba(0,194,255,0.12)';
  const accentBorder= isAdmin ? 'rgba(168,85,247,0.25)' : 'rgba(0,194,255,0.25)';

  return (
    <>
      {/* ══ Desktop Sidebar ══ */}
      <div
        className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 z-40"
        style={{
          background: 'rgba(2, 7, 20, 0.92)',
          backdropFilter: 'blur(40px) saturate(200%)',
          borderRight: '1px solid rgba(255,255,255,0.04)',
          boxShadow: '4px 0 48px rgba(0,0,0,0.7), inset -1px 0 0 rgba(255,255,255,0.03)',
        }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center relative"
              style={{
                background: `linear-gradient(135deg, ${accent}22, ${accent}06)`,
                border: `1px solid ${accentBorder}`,
                boxShadow: `0 0 24px ${accent}18, inset 0 1px 0 rgba(255,255,255,0.08)`,
              }}
            >
              <Zap className="w-4 h-4" style={{ color: accent }} />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight leading-none">
                <span className="text-white">Inven</span>
                <span style={{ color: accent, textShadow: `0 0 24px ${accent}88` }}>TiX</span>
              </div>
              <div className="text-[9px] uppercase tracking-[0.18em] font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.22)' }}>
                Intelligence Platform
              </div>
            </div>
          </div>

          {/* Role pill */}
          <div
            className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: accentFaint, border: `1px solid ${accentBorder}`, color: accent }}
          >
            <span className="live-dot" style={{ background: accent, width: 6, height: 6, flexShrink: 0 }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
              {isAdmin ? 'Admin Dashboard' : 'Seller Workspace'}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 mb-3" style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />

        {/* Nav section label */}
        <div className="px-5 mb-2">
          <span className="section-label">Navigation</span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
          {links.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? (isAdmin ? 'active-admin' : 'active') : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-bar"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                      style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <link.icon
                    className="w-[16px] h-[16px] flex-shrink-0 transition-colors duration-200"
                    style={{ color: isActive ? accent : undefined }}
                  />
                  <span className="flex-1 text-sm font-medium">{link.name}</span>
                  {link.name === 'Anomalies' && pendingAnomalies > 0 && (
                    <span
                      className="text-[9px] font-black text-white rounded-full min-w-[16px] h-4 flex items-center justify-center px-1"
                      style={{ background: '#FF4757', boxShadow: '0 0 8px rgba(255,71,87,0.6)' }}
                    >
                      {pendingAnomalies > 9 ? '9+' : pendingAnomalies}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-5 mb-3" style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />

        {/* User footer */}
        <div className="p-3">
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}25` }}
            >
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-none">{user.email.split('@')[0]}</p>
              <p className="text-[10px] capitalize mt-0.5 leading-none" style={{ color: `${accent}80` }}>{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg transition-all duration-200 flex-shrink-0"
              style={{ color: 'rgba(255,255,255,0.18)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#FF4757'; e.currentTarget.style.background = 'rgba(255,71,87,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.18)'; e.currentTarget.style.background = 'transparent'; }}
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ══ Mobile Bottom Nav ══ */}
      <div
        className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 items-center justify-around px-1"
        style={{
          background: 'rgba(2, 7, 20, 0.95)',
          backdropFilter: 'blur(32px)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.5)',
        }}
      >
        {links.map((link) => (
          <NavLink
            key={link.name}
            to={link.path}
            className="flex flex-col items-center gap-1 flex-1 py-2 relative"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-glow"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: `${accent}08` }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <link.icon
                  className="w-5 h-5 relative z-10 transition-all duration-200"
                  style={{ color: isActive ? accent : 'rgba(255,255,255,0.28)', filter: isActive ? `drop-shadow(0 0 6px ${accent})` : 'none' }}
                />
                <span
                  className="text-[8px] font-semibold tracking-wider relative z-10 transition-colors duration-200"
                  style={{ color: isActive ? accent : 'rgba(255,255,255,0.2)' }}
                >
                  {link.name.split(' ')[0]}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </>
  );
};
