import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Activity, ShieldCheck, Store, Eye, EyeOff, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const QUICK_LOGINS = [
  {
    role: 'Seller',
    email: 'demo@inventix.com',
    password: 'password123',
    icon: Store,
    desc: 'Surat Kurti House',
    color: '#00C2FF',
    gradient: 'from-[#00C2FF]/20 to-[#0080ff]/10',
    border: 'border-[#00C2FF]/30 hover:border-[#00C2FF]/70',
  },
  {
    role: 'Admin',
    email: 'admin@inventix.com',
    password: 'admin123',
    icon: ShieldCheck,
    desc: 'Platform Administrator',
    color: '#A855F7',
    gradient: 'from-[#A855F7]/20 to-[#7C3AED]/10',
    border: 'border-[#A855F7]/30 hover:border-[#A855F7]/70',
  },
];

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const doLogin = async (e_mail: string, pw: string) => {
    setLoading(true);
    setError('');
    try {
      await login(e_mail, pw);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 20% 50%, #0d1b40 0%, #050d1f 60%, #000510 100%)' }}>
      
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]" style={{ background: 'radial-gradient(circle, #00C2FF, transparent)' }} />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full opacity-15 blur-[100px]" style={{ background: 'radial-gradient(circle, #A855F7, transparent)' }} />
        <div className="absolute top-[40%] right-[30%] w-[200px] h-[200px] rounded-full opacity-10 blur-[80px]" style={{ background: 'radial-gradient(circle, #00E5A0, transparent)' }} />
        {/* Grid Lines */}
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(0,194,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,194,255,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md px-4"
      >
        {/* Glass Card */}
        <div className="rounded-3xl overflow-hidden border border-white/[0.08]" style={{ background: 'rgba(10,20,50,0.7)', backdropFilter: 'blur(40px)', boxShadow: '0 0 80px rgba(0,194,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
          
          {/* Header */}
          <div className="px-8 pt-10 pb-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5"
              style={{ background: 'linear-gradient(135deg, rgba(0,194,255,0.2), rgba(0,194,255,0.05))', border: '1px solid rgba(0,194,255,0.3)', boxShadow: '0 0 40px rgba(0,194,255,0.2)' }}
            >
              <Activity className="w-10 h-10" style={{ color: '#00C2FF' }} />
            </motion.div>
            <h1 className="text-4xl font-black tracking-tight mb-1">
              <span className="text-white">Inven</span>
              <span style={{ color: '#00C2FF', textShadow: '0 0 30px rgba(0,194,255,0.5)' }}>TiX</span>
            </h1>
            <p className="text-sm font-medium tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Smart Inventory Intelligence</p>
          </div>

          {/* Quick Access Buttons */}
          <div className="px-8 pb-4">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>Quick Access</p>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_LOGINS.map(({ role, email: e, password: pw, icon: Icon, desc, color, gradient, border }) => (
                <motion.button
                  key={role}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => doLogin(e, pw)}
                  disabled={loading}
                  className={`relative rounded-2xl p-4 border text-left transition-all duration-200 bg-gradient-to-br ${gradient} ${border} overflow-hidden group`}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `radial-gradient(circle at 50% 0%, ${color}15, transparent 70%)` }} />
                  <Icon className="w-5 h-5 mb-2" style={{ color }} />
                  <p className="text-sm font-bold text-white">{role}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Zap className="w-3 h-3" style={{ color }} />
                    <span className="text-xs font-semibold" style={{ color }}>Instant Access</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 px-8 py-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.2)' }}>or sign in manually</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Form */}
          <div className="px-8 pb-10">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl text-sm font-medium text-center"
                  style={{ background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.25)', color: '#FF4757' }}
                >
                  {error}
                </motion.div>
              )}
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'none' }}
                  onFocus={e => { e.target.style.border = '1px solid rgba(0,194,255,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,194,255,0.08)'; }}
                  onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  placeholder="you@inventix.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 pr-12 text-white text-sm placeholder-white/20 focus:outline-none transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onFocus={e => { e.target.style.border = '1px solid rgba(0,194,255,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,194,255,0.08)'; }}
                    onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-200 mt-2 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #00C2FF, #0080ff)', color: '#050d1f', boxShadow: '0 0 30px rgba(0,194,255,0.3)', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-navy-900/40 border-t-navy-900 rounded-full animate-spin" />Authenticating...</span> : 'Secure Login'}
              </motion.button>
            </form>

            {/* Hardcoded credentials hint */}
            <div className="mt-5 rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Seller: <span style={{ color: 'rgba(0,194,255,0.6)' }}>demo@inventix.com</span> · Admin: <span style={{ color: 'rgba(168,85,247,0.6)' }}>admin@inventix.com</span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
