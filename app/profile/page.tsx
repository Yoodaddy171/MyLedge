'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  User, Mail, Shield, Key, Bell, Smartphone,
  CheckCircle2, Trophy, Settings as SettingsIcon,
  LogOut, Camera, Save, Loader2, ArrowRight, X, Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ trxCount: 0, assetCount: 0, netWorth: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // States for Editable Fields
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
      setUser(authUser);
      setFullName(authUser?.user_metadata?.full_name || '');

      const { count: trxs } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
      const { data: assets } = await supabase.from('assets').select('*');
      const { data: debts } = await supabase.from('debts').select('*');

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
    if (!file) return;

    try {
      setUpdating(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Update Auth Metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      alert("Profile picture updated!");
      fetchProfileData();
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOutAll = async () => {
    if (!confirm("Are you sure? This will sign out all active sessions.")) return;
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) alert(error.message);
    else window.location.href = '/login';
  };

  const persona = stats.netWorth > 100000000 ? 'Wealth Master' : stats.netWorth > 10000000 ? 'Rising Investor' : 'Wealth Builder';

  return (
    <div className="max-w-4xl mx-auto pb-10 text-black">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-black">Account Center</h1>
          <p className="text-slate-700 font-bold mt-1 text-[10px] uppercase tracking-widest opacity-50">Personalize your MyLedger experience.</p>
        </div>
        {updating && (
          <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing...
          </div>
        )}
      </header>

      {loading ? (
        <div className="py-24 text-center animate-pulse font-black text-slate-400 tracking-widest text-xs">INITIALIZING SECURE SESSION...</div>
      ) : (
        <div className="space-y-8">

          {/* Header Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <div className="w-24 h-24 bg-slate-900 rounded-xl flex items-center justify-center text-white relative shadow-2xl overflow-hidden">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={32} />
                )}
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                >
                  <Camera size={20} />
                </button>
              </div>
              <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                {isEditingName ? (
                  <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    <input
                      type="text"
                      className="bg-transparent px-4 py-2 text-lg font-black outline-none w-full"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoFocus
                    />
                    <button onClick={handleUpdateName} className="p-2 bg-black text-white rounded-lg"><CheckCircle2 size={16} /></button>
                    <button onClick={() => setIsEditingName(false)} className="p-2 text-slate-400"><X size={16} /></button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-black tracking-tight text-black">{user?.user_metadata?.full_name || 'Set Name'}</h2>
                    <button onClick={() => setIsEditingName(true)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit3 size={14} /></button>
                  </>
                )}
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-blue-100">{persona}</span>
              </div>
              <p className="text-slate-500 font-bold flex items-center justify-center md:justify-start gap-2 mb-4 text-[10px] uppercase tracking-tight">
                <Mail size={12} /> {user?.email}
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <div className="px-5 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Net Worth</p>
                  <p className="text-sm font-black text-black">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.netWorth)}</p>
                </div>
                <div className="px-5 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Activities</p>
                  <p className="text-sm font-black text-black">{stats.trxCount} items</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-black">
            {/* Account Settings */}
            <div className="bg-white p-8 rounded-2xl border-2 border-slate-100 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-black mb-8 flex items-center gap-2">
                <SettingsIcon size={14} className="text-blue-600" /> Control Panel
              </h3>
              <div className="space-y-4">
                <ProfileMenuItem
                  icon={<Shield className="text-slate-400" />}
                  label="Security Status"
                  sub="Verified Account"
                  onClick={() => alert("Multi-factor authentication coming soon.")}
                />
                <ProfileMenuItem
                  icon={<Bell className="text-slate-400" />}
                  label="Smart Alerts"
                  sub="On"
                />
                <ProfileMenuItem
                  icon={<Smartphone className="text-slate-400" />}
                  label="Global Sign Out"
                  sub="All devices"
                  onClick={handleSignOutAll}
                />
              </div>
            </div>

            {/* Achievement / Progress */}
            <div className="bg-slate-900 p-8 rounded-2xl text-white shadow-xl shadow-slate-900/10 flex flex-col justify-center relative overflow-hidden group border border-slate-800">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700 pointer-events-none"><Trophy size={120} /></div>
              <h3 className="text-xl font-black mb-1 relative z-10 text-white uppercase tracking-tight">Financial Tier</h3>
              <p className="text-slate-400 text-[10px] font-bold leading-relaxed mb-8 relative z-10 uppercase tracking-wide">You are a <span className="text-blue-400 font-black">{persona}</span>. Record 10 more transactions to level up.</p>
              <div className="mt-auto relative z-10">
                <div className="flex justify-between text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
                  <span>Milestone Progress</span>
                  <span>{Math.min(100, (stats.trxCount / 50) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (stats.trxCount / 50) * 100)}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50/50 p-8 rounded-2xl border-2 border-red-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Privacy & Session</h3>
              <p className="text-[9px] text-slate-600 font-black uppercase tracking-tight max-w-sm leading-relaxed">Revoke access from all browsers and devices. Security first.</p>
            </div>
            <button
              onClick={handleSignOutAll}
              className="px-8 py-4 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-700 transition-all shadow-lg active:scale-95 shrink-0"
            >
              TERMINATE ALL SESSIONS
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

function ProfileMenuItem({ icon, label, sub, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 rounded-2xl border-2 border-transparent hover:border-blue-50 transition-all text-black group"
    >
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">{icon}</div>
        <div className="text-left">
          <p className="text-xs font-black text-black uppercase tracking-tight">{label}</p>
          {sub && <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{sub}</p>}
        </div>
      </div>
      <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
    </button>
  );
}