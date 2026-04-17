import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/seller/Dashboard';
import { Inventory } from './pages/seller/Inventory';
import { Retailers } from './pages/seller/Retailers';
import { Alerts } from './pages/seller/Alerts';
import { Forecasts } from './pages/seller/Forecasts';
import { Simulation } from './pages/seller/Simulation';
import { ActivityFeed } from './pages/admin/ActivityFeed';
import { Anomalies } from './pages/admin/Anomalies';
import { Analytics } from './pages/admin/Analytics';
import { Layout } from './components/shared/Layout';

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: 'seller' | 'admin' }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen bg-navy-900 flex items-center justify-center text-electric font-mono text-sm tracking-widest uppercase animate-pulse">Initializing InvenTiX...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole) {
    const isSeller = allowedRole === 'seller' && (user.role === 'seller' || user.role === 'manufacturer');
    const isAdmin = allowedRole === 'admin' && user.role === 'admin';
    if (!isSeller && !isAdmin) {
      const rolePath = user.role === 'manufacturer' ? 'seller' : user.role;
      return <Navigate to={`/${rolePath}/dashboard`} replace />;
    }
  }

  return <>{children}</>;
};

const RoleRedirect = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  const rolePath = user.role === 'manufacturer' ? 'seller' : user.role;
  return <Navigate to={`/${rolePath}/dashboard`} replace />;
};

const AppContent: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RoleRedirect />} />
      
      <Route path="/seller" element={<ProtectedRoute allowedRole="seller"><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="retailers" element={<Retailers />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="forecasts" element={<Forecasts />} />
        <Route path="simulation" element={<Simulation />} />
        <Route path="*" element={<div className="text-gray-400">404 - Module Not Found</div>} />
      </Route>
      
      <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><Layout /></ProtectedRoute>}>
        {/* Admin doesn't have a literal 'dashboard' view, Activity Feed is their main landing zone */}
        <Route path="dashboard" element={<Navigate to="/admin/feed" replace />} />
        <Route path="feed" element={<ActivityFeed />} />
        <Route path="anomalies" element={<Anomalies />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="audit" element={<div className="p-8 text-center text-gray-500 font-mono text-sm">Audit Log — Under Construction</div>} />
        <Route path="risk" element={<div className="p-8 text-center text-gray-500 font-mono text-sm">Risk Scores — Under Construction</div>} />
        <Route path="*" element={<div className="p-8 text-center text-danger font-bold text-xl uppercase tracking-widest animate-pulse">404 - Module Not Found</div>} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
