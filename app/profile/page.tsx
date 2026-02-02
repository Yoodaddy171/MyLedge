'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  User, Mail, Shield, Smartphone,
  CheckCircle2, Trophy, Settings as SettingsIcon,
  Camera, Loader2, ArrowRight, X, Edit3, Landmark, Receipt
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { AppUser } from '@/lib/types';

export default function ProfilePage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [stats, setStats] = useState({ trxCount: 0, assetCount: 0, netWorth: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [fullName, setFullName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  async function fetchProfileData() {
    try {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }
      setUser(authUser);
      setFullName(authUser?.user_metadata?.full_name || '');

      // CRITICAL: Filter all queries by user_id
      const { count: trxs } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id);
      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', authUser.id);
      const { data: debts } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', authUser.id);

      const totalAssets = assets?.reduce((acc, c) => acc + (c.quantity * c.current_price), 0) || 0;
      const totalDebts = debts?.reduce((acc, c) => acc + Number(c.remaining_amount), 0) || 0;

      setStats({
        trxCount: trxs || 0,
        assetCount: assets?.length || 0,
        netWorth: totalAssets - totalDebts
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const handleUpdateName = async () => {
    setUpdating(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    });
    if (error) alert(error.message);
    else {
      setIsEditingName(false);
      fetchProfileData();
    }
    setUpdating(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUpdating(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      if (updateError) throw updateError;

      fetchProfileData();
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOutAll = async () => {
    if (!confirm("Sign out from all devices?")) return;
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) alert(error.message);
    else window.location.href = '/login';
  };

  const persona = stats.netWorth > 100000000 ? 'Wealth Master' : stats.netWorth > 10000000 ? 'Rising Investor' : 'Wealth Builder';

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-blue-600">Account Settings</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">Manage your identity and security</p>
        </div>
        {updating && (
          <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-widest animate-pulse bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing Changes
          </div>
        )}
      </header>

      {loading ? (
        <div className="py-24 text-center animate-pulse text-slate-400 text-[10px] font-bold uppercase tracking-widest">Initializing Session...</div>
      ) : (
        <div className="space-y-6">

          {/* Header Profile Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 md:p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-900 rounded-3xl flex items-center justify-center text-white relative overflow-hidden shadow-2xl border-4 border-white">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={32} />
                )}
                <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera size={20} />
                </button>
              </div>
              <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
            </div>

            <div className="flex-1 text-center md:text-left min-w-0">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                {isEditingName ? (
                  <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 w-full max-w-sm mx-auto md:mx-0">
                    <input type="text" className="bg-transparent px-3 py-1.5 text-sm md:text-base font-bold outline-none w-full text-slate-900" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
                    <button onClick={handleUpdateName} className="p-2 bg-slate-900 text-white rounded-lg shadow-md active:scale-95"><CheckCircle2 size={14} /></button>
                    <button onClick={() => setIsEditingName(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 truncate">{user?.user_metadata?.full_name || 'Set Your Name'}</h2>
                    <button onClick={() => setIsEditingName(true)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit3 size={16} /></button>
                  </div>
                )}
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold uppercase tracking-widest border border-blue-100 w-fit mx-auto md:mx-0">{persona}</span>
              </div>
              <p className="text-slate-500 font-bold flex items-center justify-center md:justify-start gap-2 mb-6 text-[10px] md:text-xs uppercase tracking-wider">
                <Mail size={12} className="text-slate-400" /> {user?.email}
              </p>

              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 shadow-sm">
                  <Landmark size={14} className="text-slate-400" />
                  <span className="text-[10px] md:text-xs font-bold text-slate-900">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.netWorth)}</span>
                </div>
                <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 shadow-sm">
                  <Receipt size={14} className="text-slate-400" />
                  <span className="text-[10px] md:text-xs font-bold text-slate-900">{stats.trxCount} records</span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
                <SettingsIcon size={16} className="text-slate-400" /> Preferences
              </h3>
              <div className="space-y-1">
                <ProfileMenuItem icon={<Shield size={16} className="text-slate-400" />} label="Security Status" sub="Account verified" />
                <ProfileMenuItem icon={<Smartphone size={16} className="text-slate-400" />} label="Sessions" sub="Active on 1 device" onClick={handleSignOutAll} />
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group border border-slate-800 flex flex-col justify-center min-h-[180px]">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700"><Trophy size={100} /></div>
              <h3 className="text-base md:text-lg font-bold text-slate-100 mb-1">Elite Milestone</h3>
              <p className="text-[10px] text-slate-400 mb-6 font-bold uppercase tracking-widest">Rank: <span className="text-blue-400 font-black">{persona}</span></p>

              <div className="mt-auto">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
                  <span>Engagement</span>
                  <span>{Math.min(100, (stats.trxCount / 50) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (stats.trxCount / 50) * 100)}%` }} transition={{ duration: 1.5 }} className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-50/30 p-5 md:p-6 rounded-2xl border border-red-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-red-600 mb-1 uppercase tracking-tight">Security Protocol</h3>
              <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wide max-w-sm">Emergency logout from all active sessions.</p>
            </div>
            <button onClick={handleSignOutAll} className="w-full md:w-auto px-5 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95">
              Sign Out All
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

function ProfileMenuItem({ icon, label, sub, onClick }: any) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-xl transition-all group border border-transparent hover:border-slate-100">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">{icon}</div>
        <div className="text-left">
          <p className="text-sm font-bold text-slate-900">{label}</p>
          {sub && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{sub}</p>}
        </div>
      </div>
      <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
    </button>
  );
}