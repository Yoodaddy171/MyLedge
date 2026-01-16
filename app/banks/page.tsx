'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Landmark, Search, Wallet, Plus, Edit3, Trash2, X, TrendingUp, TrendingDown, History, ChevronRight, ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function BanksPage() {
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '' });

  // Activity Modal State
  const [selectedBankForActivity, setSelectedBankForActivity] = useState<any>(null);
  const [bankActivity, setBankActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => { fetchBanks(); }, []);

  async function fetchBanks() {
    try {
      setLoading(true);
      const { data: walletsData, error: wError } = await supabase.from('wallets').select('*').order('name', { ascending: true });
      if (wError) throw wError;

      const { data: transactions, error: tError } = await supabase.from('transactions').select('wallet_id, amount, type');
      if (tError) throw tError;

      const enrichedBanks = walletsData?.map(w => {
        const walletTrx = transactions?.filter(t => t.wallet_id === w.id) || [];
        const income = walletTrx.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
        const expense = walletTrx.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
        return {
          ...w,
          balance: income - expense,
          income,
          expense,
          trxCount: walletTrx.length
        };
      });

      setBanks(enrichedBanks || []);
    } catch (err: any) { toast.error("Failed to load accounts"); }
    finally { setLoading(false); }
  }

  async function fetchBankActivity(walletId: number) {
    try {
      setLoadingActivity(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          item:transaction_items(name, category:categories(name))
        `)
        .eq('wallet_id', walletId)
        .order('date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setBankActivity(data || []);
    } catch (err: any) {
      toast.error("Could not load activity history");
    } finally {
      setLoadingActivity(false);
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      name: formData.name.trim()
    };

    try {
      if (editingId) {
        await supabase.from('wallets').update(payload).eq('id', editingId);
        toast.success("Account updated");
      } else {
        await supabase.from('wallets').insert(payload);
        toast.success("Account added");
      }
      setIsModalOpen(false); setEditingId(null); setFormData({ name: '' }); fetchBanks();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this bank account? All linked transactions will remain but lose their connection.")) return;
    const { error } = await supabase.from('wallets').delete().eq('id', id);
    if (!error) { toast.success("Account removed"); fetchBanks(); }
    else toast.error(error.message);
  };

  const handleDeleteBulk = async () => {
    if (!confirm(`Hapus ${selectedIds.length} akun bank? Semua data saldo akan hilang.`)) return;
    const { error } = await supabase.from('wallets').delete().in('id', selectedIds);
    if (!error) {
      toast.success(`${selectedIds.length} akun dihapus`);
      setSelectedIds([]);
      fetchBanks();
    } else {
      toast.error(error.message);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(b => b.id));
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const openActivityModal = (bank: any) => {
    setSelectedBankForActivity(bank);
    fetchBankActivity(bank.id);
  };

  const filtered = banks.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto pb-20 text-black font-black uppercase">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-tighter">My Bank Accounts</h1>
          <p className="text-slate-700 text-xs mt-1 font-bold tracking-tight">Active accounts & current balances.</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setFormData({ name: '' }); setIsModalOpen(true); }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 rounded-xl text-[10px] font-black text-white hover:bg-blue-700 shadow-xl transition-all uppercase tracking-widest"
        >
          <Plus size={14} /> New Bank
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-[1.5rem] border-2 border-slate-50 shadow-xl flex items-center gap-5 group hover:border-blue-100 transition-all">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-lg">
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 tracking-[0.2em]">Total Cash</p>
            <p className="text-2xl font-black text-black tracking-tighter">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(banks.reduce((acc, curr) => acc + (curr.balance || 0), 0))}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[1.5rem] border-2 border-slate-50 shadow-xl flex items-center gap-5 group hover:border-emerald-100 transition-all">
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-lg">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 tracking-[0.2em]">Total Income</p>
            <p className="text-2xl font-black text-emerald-600 tracking-tighter">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(banks.reduce((acc, curr) => acc + (curr.income || 0), 0))}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[1.5rem] border-2 border-slate-50 shadow-xl flex items-center gap-5 group hover:border-purple-100 transition-all">
          <div className="bg-purple-50 text-purple-600 p-3 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-all duration-500 shadow-lg">
            <Landmark size={20} />
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 tracking-[0.2em]">Total Accounts</p>
            <p className="text-2xl font-black text-black tracking-tighter">{banks.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[1.5rem] border-2 border-slate-100 overflow-hidden shadow-sm">
        <div className="p-6 bg-slate-50 border-b-2 border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search your banks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 rounded-xl px-12 py-2.5 text-xs font-bold text-black focus:border-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Active Accounts: {filtered.length}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 uppercase font-black text-slate-400 text-[10px]">
                <th className="px-10 py-5 w-10 text-center">
                  <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
                </th>
                <th className="px-8 py-5 tracking-[0.2em]">Bank Detail</th>
                <th className="px-8 py-5 tracking-[0.2em] text-right">Current Balance</th>
                <th className="px-8 py-5 tracking-[0.2em] text-center">Activity Summary</th>
                <th className="px-8 py-5 tracking-[0.2em] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center animate-pulse font-black text-[10px] uppercase text-slate-400 tracking-widest">Syncing Data...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center text-slate-400 font-black uppercase text-[10px] tracking-widest">No accounts found.</td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className={`last:border-none group hover:bg-slate-50/50 transition-all ${selectedIds.includes(item.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-10 py-4 text-center">
                      <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-blue-500 shadow-sm border border-slate-100">
                          <History size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-black uppercase tracking-tight text-sm">
                            {item.name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <p className={`font-black text-sm ${item.balance >= 0 ? 'text-black' : 'text-red-600'}`}>
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.balance || 0)}
                      </p>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1 tracking-tight">
                            <TrendingUp size={12} /> {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(item.income || 0)}
                          </span>
                          <span className="text-slate-200">|</span>
                          <span className="text-[10px] font-black text-red-600 flex items-center gap-1 tracking-tight">
                            <TrendingDown size={12} /> {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(item.expense || 0)}
                          </span>
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{(item.trxCount || 0)} Transactions</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex justify-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => openActivityModal(item)}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100 rounded-lg"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => { setEditingId(item.id); setFormData({ name: item.name }); setIsModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100 rounded-lg"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-all border border-transparent hover:border-red-100 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[130] bg-black text-white px-10 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400"><span className="text-white">{selectedIds.length}</span> accounts selected</div>
            <button onClick={handleDeleteBulk} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-black text-xs uppercase tracking-widest transition-colors"><Trash2 size={18} /> Delete Selected</button>
            <button onClick={() => setSelectedIds([])} className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 overflow-hidden text-black font-black">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black uppercase tracking-tight">{editingId ? 'Edit Account' : 'New Account'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. BCA, Wallet, Cash"
                    required
                    className="w-full bg-white border-2 border-slate-100 rounded-[1.2rem] px-6 py-5 text-sm font-bold text-black focus:border-blue-500 outline-none transition-all shadow-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                  />
                </div>
                <button type="submit" className="w-full bg-black text-white font-black py-6 rounded-[1.5rem] shadow-xl hover:bg-slate-800 transition-all mt-4 uppercase tracking-widest text-[10px]">Verify & Save</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Bank Activity Modal */}
        {selectedBankForActivity && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedBankForActivity(null)} className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" />
            <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }} className="relative bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden text-black font-black h-[90vh] flex flex-col">
              <div className="p-10 pb-6 border-b-2 border-slate-50 bg-slate-50/50">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">{selectedBankForActivity.name}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Activity History</p>
                  </div>
                  <button onClick={() => setSelectedBankForActivity(null)} className="p-3 bg-white hover:bg-slate-100 rounded-2xl shadow-sm border border-slate-100 transition-colors"><X size={20} /></button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total In</p>
                    <p className="text-lg font-black text-emerald-600 tracking-tight">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedBankForActivity.income)}</p>
                  </div>
                  <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Out</p>
                    <p className="text-lg font-black text-red-600 tracking-tight">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedBankForActivity.expense)}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 pt-6 space-y-4">
                {loadingActivity ? (
                  <div className="py-20 text-center animate-pulse font-black text-[10px] uppercase text-slate-400 tracking-widest">Scanning History...</div>
                ) : bankActivity.length === 0 ? (
                  <div className="py-24 text-center text-slate-400 font-black uppercase text-[10px] tracking-widest">No history recorded yet.</div>
                ) : (
                  bankActivity.map((trx) => (
                    <div key={trx.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 flex items-center justify-between group hover:border-slate-300 transition-all shadow-sm">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-[1.3rem] flex items-center justify-center font-black text-white shadow-lg ${trx.type === 'income' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-red-500 shadow-red-200'}`}>
                          {trx.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                        </div>
                        <div>
                          <p className="font-black text-black text-sm tracking-tight uppercase line-clamp-1">{trx.item?.name || trx.description || 'Generic Transfer'}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><CalendarIcon size={10} className="text-blue-500" /> {new Date(trx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                            <span className="text-[8px] font-black text-slate-300 uppercase">|</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{trx.item?.category?.name || 'Uncategorized'}</span>
                          </div>
                        </div>
                      </div>
                      <p className={`font-black text-base tracking-tighter ${trx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {trx.type === 'income' ? '+' : '-'}{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(trx.amount)}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="p-8 bg-slate-50 border-t-2 border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Showing last 20 movements</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
