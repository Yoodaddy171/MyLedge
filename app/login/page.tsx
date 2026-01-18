'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Github, Chrome, Loader2, ShieldCheck, Zap, Globe } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/');
    });
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = isLogin
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (error) throw error;
      if (isLogin) router.push('/');
      else setMessage({ type: 'success', text: 'Check your email for confirmation!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col md:flex-row overflow-hidden relative">

      {/* LEFT SIDE: HERO BANNER (Visible on MD+) */}
      <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} className="hidden md:flex flex-1 relative overflow-hidden group">
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear group-hover:scale-110" style={{ backgroundImage: "url('/login_hero.png')" }} />
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />

        <div className="relative z-10 w-full h-full flex flex-col justify-between p-16">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 flex items-center justify-center p-2 shadow-2xl">
              <img src="/logo.png" alt="MyLedger Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold text-white tracking-tighter italic uppercase">MyLedger</span>
          </div>

          <div className="max-w-xl">
            <h2 className="text-5xl font-black text-white leading-tight tracking-tight mb-6 uppercase italic">Intelligence <br /><span className="text-blue-500">In Every</span> <br />Transaction.</h2>
            <p className="text-slate-400 text-lg font-bold leading-relaxed max-w-md opacity-80 uppercase tracking-tight">Elevate financial clarity with precision-engineered mastery.</p>
          </div>

          <div className="flex gap-10 border-t border-white/10 pt-10">
            {[
              { label: 'Secure', icon: <ShieldCheck size={16} /> },
              { label: 'Instant', icon: <Zap size={16} /> },
              { label: 'Global', icon: <Globe size={16} /> }
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">
                <span className="text-blue-500">{f.icon}</span> {f.label}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* RIGHT SIDE: AUTH FORM */}
      <div className="flex-1 lg:flex-[0.6] flex items-center justify-center p-6 md:p-16 relative z-10 bg-[#020617] md:bg-transparent">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[400px]">
          
          <div className="md:hidden flex flex-col items-center mb-10 text-center">
            <div className="w-14 h-14 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10 flex items-center justify-center p-3 mb-4 shadow-2xl shadow-blue-500/10">
              <img src="/logo.png" alt="MyLedger Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">MyLedger</h1>
            <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.3em] mt-1">Wealth Intelligence</p>
          </div>

          <div className="bg-white/5 md:bg-white/[0.02] backdrop-blur-3xl border border-white/[0.05] p-6 md:p-10 rounded-3xl shadow-2xl shadow-black/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-colors duration-700" />

            <div className="mb-8 relative z-10">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase italic">{isLogin ? 'Sign In' : 'Join Network'}</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">Secured Wealth Terminal</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4 relative z-10">
              <div className="space-y-3">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                  <input type="email" placeholder="TERM_ID@GATED.COM" required className="w-full bg-slate-900/50 border border-slate-800/50 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-700 text-xs font-bold uppercase tracking-widest outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                  <input type="password" placeholder="ENCRYPTED_KEY" required className="w-full bg-slate-900/50 border border-slate-800/50 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-700 text-xs font-bold uppercase tracking-widest outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {message.text && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`text-[10px] font-bold uppercase tracking-widest p-3 rounded-xl ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                    {message.text}
                  </motion.div>
                )}
              </AnimatePresence>

              <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-blue-600/20 text-xs uppercase tracking-[0.2em]">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>{isLogin ? 'Access Portal' : 'Establish Access'}<ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <div className="mt-8 relative z-10">
              <div className="relative flex items-center justify-center mb-6">
                <div className="border-t border-white/5 w-full" />
                <span className="bg-[#020617] md:bg-[#0a0f1e] px-4 text-[9px] font-bold text-slate-600 uppercase tracking-[0.3em] absolute">Secure Auth</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleSocialLogin('google')} className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"><Chrome className="w-3.5 h-3.5 text-blue-400" /> Google</button>
                <button onClick={() => handleSocialLogin('github')} className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"><Github className="w-3.5 h-3.5 text-slate-400" /> Github</button>
              </div>
            </div>

            <div className="mt-8 text-center relative z-10">
              <button onClick={() => setIsLogin(!isLogin)} className="text-[10px] font-bold text-slate-500 hover:text-blue-400 transition-all uppercase tracking-widest">
                {isLogin ? "Request New Access" : "Existing Terminal Account"}
              </button>
            </div>
          </div>

          <p className="mt-10 text-center text-[9px] font-bold text-slate-700 opacity-40 uppercase tracking-[0.2em]">
            &copy; 2026 MyLedger Intelligence // Gated Access
          </p>
        </motion.div>
      </div>
    </div>
  );
}
