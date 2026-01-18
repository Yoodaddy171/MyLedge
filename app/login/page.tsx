'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Github, Chrome, Loader2, Sparkles, ShieldCheck, Zap, Globe } from 'lucide-react';

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

      if (isLogin) {
        router.push('/');
      } else {
        setMessage({ type: 'success', text: 'Check your email for confirmation!' });
      }
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
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col md:flex-row overflow-hidden relative font-black">

      {/* LEFT SIDE: HERO BANNER (Visible on MD+) */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden md:flex flex-1 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear group-hover:scale-110" style={{ backgroundImage: "url('/login_hero.png')" }} />
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />

        <div className="relative z-10 w-full h-full flex flex-col justify-between p-16">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 flex items-center justify-center p-2 shadow-2xl">
              <img src="/logo.png" alt="MyLedger Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-black text-white tracking-tighter uppercase italic">MyLedger</span>
          </motion.div>

          <div className="max-w-xl">
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-6xl font-black text-white leading-tight tracking-tighter mb-6 uppercase"
            >
              Intelligence <br />
              <span className="text-blue-500">In Every</span> <br />
              Transaction.
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-slate-400 text-lg font-bold leading-relaxed max-w-md uppercase tracking-wide opacity-80"
            >
              Elevate your financial clarity with AI-driven insights and a precision-engineered dashboard for true wealth mastery.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="flex gap-10 border-t border-white/10 pt-10"
          >
            {[
              { label: 'Secure', icon: <ShieldCheck size={16} /> },
              { label: 'Instant', icon: <Zap size={16} /> },
              { label: 'Global', icon: <Globe size={16} /> }
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/50">
                <span className="text-blue-500">{f.icon}</span> {f.label}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Floating Decorative Elements */}
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-1/4 w-32 h-32 bg-blue-500/20 blur-[60px] rounded-full"
        />
        <motion.div
          animate={{ y: [0, 20, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-purple-500/20 blur-[80px] rounded-full"
        />
      </motion.div>

      {/* RIGHT SIDE: AUTH FORM */}
      <div className="flex-[0.8] lg:flex-[0.6] flex items-center justify-center p-8 md:p-16 relative z-10 bg-[#020617] md:bg-transparent">
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile Branding */}
          <div className="md:hidden flex flex-col items-center mb-12">
            <div className="w-20 h-20 bg-white/5 backdrop-blur-3xl rounded-[2rem] border border-white/10 flex items-center justify-center p-3 mb-6 shadow-2xl">
              <img src="/logo.png" alt="MyLedger Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">MyLedger</h1>
            <p className="text-slate-500 font-bold text-[10px] tracking-[0.2em] uppercase">Wealth Intelligence Platform</p>
          </div>

          <div className="bg-white/5 md:bg-white/[0.02] backdrop-blur-3xl border border-white/[0.05] p-10 rounded-[2.5rem] shadow-2xl shadow-black/50 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-colors" />

            <div className="text-left mb-10 relative z-10">
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase mb-1">
                {isLogin ? 'Welcome Back' : 'Create Access'}
              </h2>
              <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase opacity-70">
                {isLogin ? 'Enter your credentials to manage wealth' : 'Join the elite financial monitoring platform'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5 relative z-10">
              <div className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="email"
                    placeholder="EMAIL ADDRESS"
                    required
                    className="w-full bg-slate-900/50 border-2 border-slate-800/50 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 text-xs font-black outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all uppercase tracking-widest"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="password"
                    placeholder="SECURE PASSWORD"
                    required
                    className="w-full bg-slate-900/50 border-2 border-slate-800/50 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 text-xs font-black outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all uppercase tracking-widest"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {message.text && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`text-[9px] font-black uppercase tracking-widest p-4 rounded-xl ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}
                  >
                    {message.text}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-blue-600/20 uppercase tracking-[0.2em] text-[10px]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    {isLogin ? 'Authenticate' : 'Initiate Session'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 relative z-10">
              <div className="relative flex items-center justify-center mb-8">
                <div className="border-t border-white/5 w-full" />
                <span className="bg-slate-950 px-4 text-[8px] text-slate-600 uppercase tracking-[0.3em] absolute font-black">Secure Gateways</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleSocialLogin('google')}
                  className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 py-4 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border-b-2 border-b-blue-500/30"
                >
                  <Chrome className="w-4 h-4 text-blue-400" /> Google
                </button>
                <button
                  onClick={() => handleSocialLogin('github')}
                  className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 py-4 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border-b-2 border-b-slate-500/30"
                >
                  <Github className="w-4 h-4 text-slate-400" /> Github
                </button>
              </div>
            </div>

            <div className="mt-10 text-center relative z-10">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-[10px] font-black text-slate-500 hover:text-blue-400 transition-all uppercase tracking-widest"
              >
                {isLogin ? "No session? Request access" : "Existing user? Authenticate here"}
              </button>
            </div>
          </div>

          <p className="mt-12 text-center text-[8px] font-black text-slate-700 uppercase tracking-[0.4em] opacity-30">
            &copy; 2026 MyLedger Intelligence System. All Rights Reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
