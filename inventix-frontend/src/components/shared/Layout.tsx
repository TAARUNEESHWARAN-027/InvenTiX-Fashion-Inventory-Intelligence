import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Bell, ChevronRight, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Toaster, toast } from 'sonner';
import { useSocket } from '../../lib/socket';

const PAGE_TITLES: Record<string, string> = {
  dashboard:  'Dashboard',
  inventory:  'Inventory Command Center',
  retailers:  'Retailer Network',
  alerts:     'Alerts & Intelligence',
  forecasts:  'Demand Forecasting',
  simulation: 'Scenario Simulation',
  feed:       'Activity Feed',
  anomalies:  'Anomaly Detection',
  analytics:  'Platform Analytics',
  audit:      'Audit Log',
  risk:       'Risk Scores',
};

export const Layout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Listen globally for real-time alerts
  useSocket('alert', React.useCallback((data: any) => {
    if (!user) return;
    // Only pop toast if it's meant for this user, or admin
    if (user.role === 'admin' || data.manufacturer_id === user.entity_id) {
      toast.error(`Urgent: ${(data.anomaly_type || '').replace(/_/g, ' ')}`, {
        description: data.notes || 'Anomaly flagged by ML service',
        icon: <AlertTriangle className="w-5 h-5 text-danger" />,
        style: { background: 'rgba(255, 71, 87, 0.1)', border: '1px solid rgba(255, 71, 87, 0.3)', color: '#fff', backdropFilter: 'blur(10px)' },
        duration: 6000,
      });
    }
  }, [user]));

  const pathParts = location.pathname.split('/').filter(Boolean);
  const role      = pathParts[0] || 'seller';
  const pageKey   = pathParts[pathParts.length - 1] || 'dashboard';
  const pageTitle = PAGE_TITLES[pageKey] || pageKey.replace(/-/g, ' ');

  const isAdmin     = user?.role === 'admin';
  const accentColor = isAdmin ? '#A855F7' : '#00C2FF';
  const accentGlow  = isAdmin ? 'rgba(168,85,247,0.15)' : 'rgba(0,194,255,0.15)';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#020914' }}>
      <Toaster theme="dark" position="top-right" />
      {/* Ambient background orbs — fixed, non-interactive */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute rounded-full blur-[120px] opacity-20"
          style={{ width: 700, height: 700, top: '-15%', left: '-5%',
                   background: 'radial-gradient(circle, rgba(0,80,200,0.6) 0%, transparent 70%)' }}
        />
        <div
          className="absolute rounded-full blur-[160px] opacity-10"
          style={{ width: 600, height: 600, top: '-10%', right: '-5%',
                   background: `radial-gradient(circle, ${accentColor}55 0%, transparent 70%)` }}
        />
        <div
          className="absolute rounded-full blur-[180px] opacity-10"
          style={{ width: 800, height: 800, bottom: '-20%', left: '30%',
                   background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)' }}
        />
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-grid opacity-100" />
      </div>

      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 pb-16 md:pb-0 relative z-10">
        {/* Top Header */}
        <header
          className="flex-shrink-0 h-14 px-6 flex items-center justify-between z-30"
          style={{
            background: 'rgba(2, 9, 20, 0.75)',
            backdropFilter: 'blur(32px) saturate(180%)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          {/* Left: breadcrumb + title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              <span className="font-medium capitalize">{role}</span>
              <ChevronRight className="w-3 h-3" />
            </div>
            <h1 className="text-sm font-semibold text-white capitalize">{pageTitle}</h1>

            {/* Live indicator */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.15)' }}
            >
              {/* Kinetic ripple dot */}
              <span className="live-dot" style={{ background: '#00E5A0', width: 6, height: 6 }} />
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#00E5A0' }}>Live</span>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-3">
            <button
              className="relative p-2 rounded-lg transition-all duration-200 group"
              style={{ color: 'rgba(255,255,255,0.25)', border: '1px solid transparent' }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.25)';
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <Bell className="w-4 h-4" />
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                style={{ background: '#FF4757',  boxShadow: '0 0 6px rgba(255,71,87,0.8)' }}
              />
            </button>

            <div className="h-5 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

            {/* User pill */}
            <div
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm"
              style={{
                background: `${accentColor}08`,
                border: `1px solid ${accentColor}18`,
              }}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black"
                style={{ background: `${accentColor}18`, color: accentColor }}
              >
                {user?.email[0].toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-white leading-none">{user?.email.split('@')[0]}</p>
                <p className="text-[9px] capitalize leading-none mt-0.5 font-medium" style={{ color: `${accentColor}70` }}>{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{ scrollbarGutter: 'stable' }}
        >
          <div className="max-w-[1600px] mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
