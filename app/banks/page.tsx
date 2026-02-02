'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Landmark, Search, Wallet as WalletIcon, Plus, Edit3, Trash2, X, TrendingUp, TrendingDown, History, ChevronRight, ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';
import Pagination from '@/components/Pagination';
import type { WalletWithBalance, BankActivity } from '@/lib/types';

export default function BanksPage() {
  const [banks, setBanks] = useState<WalletWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'bank', initial_balance: '0', currency: 'IDR' });

  // Activity Modal State
  const [selectedBankForActivity, setSelectedBankForActivity] = useState<WalletWithBalance | null>(null);
  const [bankActivity, setBankActivity] = useState<BankActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const itemsPerPage = 15;

  useBodyScrollLock(isModalOpen || !!selectedBankForActivity);

  useEffect(() => { fetchBanks(); }, []);

  useEffect(() => {
    if (selectedBankForActivity) {
      fetchBankActivity(selectedBankForActivity.id);
    }
  }, [selectedBankForActivity, activityPage, activitySearch]);

  async function fetchBanks() {
    try {
      setLoading(true);
      // CRITICAL: Get user first and filter by user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('wallet_balances_view')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;

      const enrichedBanks = data?.map(w => ({
        ...w,
        balance: w.current_balance,
        income: w.total_income,
        expense: w.total_expense,
        trxCount: 0
      }));

      setBanks(enrichedBanks || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }

  async function fetchBankActivity(walletId: number) {
    try {
      setLoadingActivity(true);
      // CRITICAL: Get user first and filter by user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingActivity(false);
        return;
      }

      let query = supabase
        .from('transactions')
        .select(`
          *,
          item:transaction_items!fk_transactions_item(name, categories!fk_transaction_items_category(name))
        `, { count: 'exact' })
        .eq('user_id', user.id)
        .eq('wallet_id', walletId);

      if (activitySearch) {
        query = query.ilike('description', `%${activitySearch}%`);
      }

      const from = (activityPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setBankActivity(data || []);
      setActivityTotal(count || 0);
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
      name: formData.name.trim(),
      type: formData.type,
      initial_balance: parseFloat(formData.initial_balance) || 0,
      currency: formData.currency,
      current_balance: parseFloat(formData.initial_balance) || 0
    };

    try {
      if (editingId) {
        const { current_balance, ...updatePayload } = payload;
        await supabase.from('wallets').update(updatePayload).eq('id', editingId);
        toast.success("Account updated");
      } else {
        await supabase.from('wallets').insert(payload);
        toast.success("Account added");
      }
      setIsModalOpen(false); setEditingId(null); setFormData({ name: '', type: 'bank', initial_balance: '0', currency: 'IDR' }); fetchBanks();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this bank account?")) return;
    const { error } = await supabase.from('wallets').delete().eq('id', id);
    if (!error) { toast.success("Account removed"); fetchBanks(); }
    else toast.error(error.message);
  };

  const handleDeleteBulk = async () => {
    if (!confirm(`Delete ${selectedIds.length} accounts?`)) return;
    const { error } = await supabase.from('wallets').delete().in('id', selectedIds);
    if (!error) {
      toast.success(`${selectedIds.length} accounts deleted`);
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

  const openActivityModal = (bank: WalletWithBalance) => {
    setActivitySearch('');
    setActivityPage(1);
    setSelectedBankForActivity(bank);
  };

  const filtered = banks.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-blue-600">Accounts</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">Manage your wallets</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setFormData({ name: '', type: 'bank', initial_balance: '0', currency: 'IDR' }); setIsModalOpen(true); }}
          className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus size={16} /> Add Account
        </button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center gap-3 md:gap-4 group hover:border-blue-100 transition-all">
          <div className="bg-blue-50 text-blue-600 p-2 rounded-xl w-fit">
            <WalletIcon size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Cash</p>
            <p className="text-sm md:text-xl font-bold text-slate-900 leading-tight truncate">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(banks.reduce((acc, curr) => acc + (curr.balance || 0), 0))}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center gap-3 md:gap-4 group hover:border-emerald-100 transition-all">
          <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl w-fit">
            <TrendingUp size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">In (30d)</p>
            <p className="text-sm md:text-xl font-bold text-emerald-600 leading-tight truncate">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(banks.reduce((acc, curr) => acc + (curr.income || 0), 0))}
            </p>
          </div>
        </div>
        <div className="hidden md:flex bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex-col md:flex-row md:items-center gap-3 md:gap-4 group hover:border-purple-100 transition-all">
          <div className="bg-purple-50 text-purple-600 p-2 rounded-xl w-fit">
            <Landmark size={18} />
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Accounts</p>
            <p className="text-sm md:text-xl font-bold text-slate-900 leading-tight">{banks.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-sm"
            />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Showing {filtered.length} accounts</p>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-3 w-10 text-center">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
                </th>
                <th className="px-6 py-3">Account Name</th>
                <th className="px-6 py-3 text-right">Balance</th>
                <th className="px-6 py-3 text-center">Activity</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">Fetching wallets...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">No accounts found</td></tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className={`group hover:bg-slate-50 transition-colors ${selectedIds.includes(item.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-3 text-center">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs">
                          {item.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-sm text-slate-900 truncate max-w-[120px]">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className={`font-bold text-sm ${(item.balance ?? 0) >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.balance ?? 0)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-center gap-2 text-[10px] font-bold">
                        <span className="text-emerald-600 flex items-center gap-1"><TrendingUp size={12} /> {new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(item.income || 0)}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-red-600 flex items-center gap-1"><TrendingDown size={12} /> {new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(item.expense || 0)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openActivityModal(item)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"><Eye size={16} /></button>
                        <button onClick={() => { setEditingId(item.id); setFormData({ name: item.name, type: item.type || 'bank', initial_balance: (item.initial_balance || 0).toString(), currency: item.currency || 'IDR' }); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"><Edit3 size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={16} /></button>
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
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedIds.length} selected</span>
            <button onClick={handleDeleteBulk} className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 uppercase tracking-widest"><Trash2 size={12} /> Delete</button>
            <button onClick={() => setSelectedIds([])} className="text-slate-500 hover:text-white"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-2xl shadow-xl p-6 overflow-hidden">
              <h2 className="text-lg font-bold mb-6 text-slate-900">{editingId ? 'Edit Account' : 'New Account'}</h2>
              <form onSubmit={handleManualSubmit} className="space-y-4 text-black">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Account Name</label>
                  <input type="text" placeholder="e.g. BCA Priority" required className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Type</label>
                    <select required className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                      <option value="bank">Bank</option><option value="cash">Cash</option><option value="credit_card">Credit Card</option><option value="e_wallet">E-Wallet</option><option value="investment">Investment</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Currency</label>
                    <select required className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}>
                      <option value="IDR">IDR</option><option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Initial Balance</label>
                  <input type="number" placeholder="0" className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.initial_balance} onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })} />
                </div>
                <button type="submit" className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors mt-2 shadow-lg shadow-slate-200 uppercase tracking-widest">Save Account</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Activity Modal - Handled by Page Logic */}
        {selectedBankForActivity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedBankForActivity(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }} className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col h-[85vh] overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedBankForActivity.name}</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Transaction History</p>
                </div>
                <button onClick={() => setSelectedBankForActivity(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={18} className="text-slate-500" /></button>
              </div>

              <div className="px-6 py-4 border-b border-slate-50 bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search description..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                    value={activitySearch}
                    onChange={(e) => { setActivitySearch(e.target.value); setActivityPage(1); }}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar no-scrollbar text-black">
                {loadingActivity ? <div className="text-center py-12 text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing...</div> : bankActivity.length === 0 ? <div className="text-center py-12 text-[10px] font-bold text-slate-400 uppercase tracking-widest">No history found</div> : (
                  bankActivity.map((trx) => (
                    <div key={trx.id} className="p-4 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${trx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {trx.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{trx.item?.name || trx.description}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{new Date(trx.date).toLocaleDateString()} • {trx.item?.categories?.name || 'General'}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${trx.type === 'income' ? 'text-emerald-600' : trx.type === 'transfer' ? 'text-blue-600' : 'text-red-600'}`}>
                        {trx.type === 'income' ? '+' : trx.type === 'expense' ? '-' : ''} {new Intl.NumberFormat('id-ID').format(trx.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {activityTotal > itemsPerPage && (
                <div className="p-4 border-t border-slate-50 bg-slate-50/30">
                  <Pagination
                    currentPage={activityPage}
                    totalPages={Math.ceil(activityTotal / itemsPerPage)}
                    onPageChange={setActivityPage}
                    totalItems={activityTotal}
                    itemsPerPage={itemsPerPage}
                    startIndex={(activityPage - 1) * itemsPerPage}
                    endIndex={Math.min(activityPage * itemsPerPage, activityTotal)}
                  />
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}