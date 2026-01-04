'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Github, Chrome, Loader2, Sparkles } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const router = useRouter();

  // Cek jika sudah login
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
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] z-10"
      >
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20"
            >
              <Sparkles className="text-white w-8 h-8" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white tracking-tight">MyLedger</h1>
            <p className="text-slate-400 text-sm mt-1">
              {isLogin ? 'Selamat datang kembali!' : 'Mulai kelola keuanganmu sekarang'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="email" 
                placeholder="Email Address" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="password" 
                placeholder="Password" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <AnimatePresence mode="wait">
              {message.text && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`text-xs p-3 rounded-lg ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}
                >
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative flex items-center justify-center mb-6">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#1a2235] px-3 text-xs text-slate-500 uppercase tracking-widest absolute font-bold">Or continue with</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleSocialLogin('google')}
                className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 py-2.5 rounded-xl text-white text-sm transition-all active:scale-95 font-bold"
              >
                <Chrome className="w-4 h-4" /> Google
              </button>
              <button 
                onClick={() => handleSocialLogin('github')}
                className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 py-2.5 rounded-xl text-white text-sm transition-all active:scale-95 font-bold"
              >
                <Github className="w-4 h-4" /> Github
              </button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
