'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDisplayAmount } from '@/lib/utils';
import { Plus, Download, Search, Filter, Trash2, X, Edit3, TrendingUp, TrendingDown, Landmark, ChevronDown, ChevronUp, Activity, Briefcase, Target, PieChart } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import Pagination from '@/components/Pagination';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0); 
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Support Data
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeDebts, setActiveDebts] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    item_id: '',
    wallet_id: '',
    to_wallet_id: '',
    project_id: '',
    amount: '',
    description: '',
    notes: '',
    debt_id: '',
    asset_id: '',
    submission_id: '',
    goal_id: ''
  });

  const [filterWallet, setFilterWallet] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const fileInputRef = useRef<HTMLInputElement>(null);
  useBodyScrollLock(isModalOpen);

  useEffect(() => { fetchFormSupportData(); }, []);
  useEffect(() => { fetchTransactions(); }, [filterWallet, filterCategory, filterDateStart, filterDateEnd, searchQuery, currentPage, itemsPerPage]);

  async function fetchFormSupportData() {
    try {
      const [items, w, debts, cats, projs, asts, subs, g] = await Promise.all([
        supabase.from('transaction_items').select('id, name, code, category_id, categories(id, name, type)'),
        supabase.from('wallets').select('id, name').eq('is_active', true),
        supabase.from('debts').select('id, name, remaining_amount').eq('is_paid', false).gt('remaining_amount', 0),
        supabase.from('categories').select('id, name'),
        supabase.from('projects').select('id, name').neq('status', 'cancelled'),
        supabase.from('assets').select('id, name, symbol'),
        supabase.from('submissions').select('id, entity, doc_number'),
        supabase.from('financial_goals').select('id, name').eq('status', 'active')
      ]);
      
      setMasterItems(items.data || []);
      setWallets(w.data || []);
      setActiveDebts(debts.data || []);
      setCategories(cats.data || []);
      setProjects(projs.data || []);
      setAssets(asts.data || []);
      setSubmissions(subs.data || []);
      setGoals(g.data || []);
    } catch (error) { console.error('Error fetching support data:', error); }
  }

  const buildQuery = (baseQuery: any, categoryItemIds: number[] | null) => {
    let q = baseQuery;
    if (categoryItemIds !== null) q = q.in('item_id', categoryItemIds);
    if (filterWallet) q = q.eq('wallet_id', filterWallet);
    if (filterDateStart) q = q.gte('date', filterDateStart);
    if (filterDateEnd) q = q.lte('date', filterDateEnd);
    if (searchQuery) q = q.or(`description.ilike.%${searchQuery}%`);
    return q;
  };

  async function fetchTransactions() {
    try {
      setLoading(true);
      let categoryItemIds: number[] | null = null;
      if (filterCategory) {
         const { data: items } = await supabase.from('transaction_items').select('id').eq('category_id', filterCategory);
         if (!items || items.length === 0) { setTransactions([]); setTotalItems(0); setLoading(false); return; }
         categoryItemIds = items.map(i => i.id);
      }

      let query = supabase.from('transactions')
        .select(`
          *, 
          wallet:wallets!fk_transactions_wallet(name), 
          to_wallet:wallets!fk_transactions_to_wallet(name), 
          project:projects!fk_transactions_project(name), 
          asset:assets(name, symbol),
          submission:submissions(entity),
          goal:financial_goals(name),
          item:transaction_items!fk_transactions_item(name, code, categories!fk_transaction_items_category(id, name))
        `, { count: 'exact' });
      
      query = buildQuery(query, categoryItemIds);
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      const { data, error, count } = await query.order('date', { ascending: false }).order('created_at', { ascending: false }).range(from, to);

      if (error) throw error;
      setTransactions(data || []);
      setTotalItems(count || 0);
    } catch (error: any) { logger.handleApiError(error, 'Failed to load transactions', { component: 'TransactionsPage' }); } 
    finally { setLoading(false); }
  }

  const filteredSummary = transactions.reduce((acc, curr) => {
    if (curr.type === 'income') acc.income += Number(curr.amount);
    else if (curr.type === 'expense') acc.expense += Number(curr.amount);
    return acc;
  }, { income: 0, expense: 0 });
  const netBalance = filteredSummary.income - filteredSummary.expense;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) { toast.error("Please enter a valid amount."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload: any = {
      user_id: user.id,
      date: formData.date,
      type: formData.type,
      amount: Number(formData.amount),
      description: formData.description,
      notes: formData.notes,
      wallet_id: formData.wallet_id || null,
      to_wallet_id: formData.type === 'transfer' ? (formData.to_wallet_id || null) : null,
      item_id: formData.item_id || null,
      project_id: formData.project_id || null,
      debt_id: formData.type === 'expense' ? (formData.debt_id || null) : null,
      asset_id: formData.asset_id || null,
      submission_id: formData.submission_id || null,
      goal_id: formData.goal_id || null,
    };

    const { error } = editingId ? await supabase.from('transactions').update(payload).eq('id', editingId) : await supabase.from('transactions').insert(payload);
    
    if (error) toast.error(error.message);
    else {
      toast.success(editingId ? "Entry updated" : "Entry added");
      setIsModalOpen(false); 
      setEditingId(null);
      resetForm();
      fetchTransactions();
    }
  };

  const resetForm = () => {
    setFormData({ 
        date: new Date().toISOString().split('T')[0], 
        type: 'expense', 
        item_id: '', 
        wallet_id: '', 
        to_wallet_id: '', 
        project_id: '', 
        amount: '', 
        description: '', 
        notes: '', 
        debt_id: '',
        asset_id: '',
        submission_id: '',
        goal_id: ''
    });
  };

  const openEditModal = (trx: any) => {
    setEditingId(trx.id);
    setFormData({
      date: trx.date,
      type: trx.type || 'expense',
      item_id: trx.item_id || '',
      wallet_id: trx.wallet_id || '',
      to_wallet_id: trx.to_wallet_id || '',
      project_id: trx.project_id || '',
      amount: trx.amount.toString(),
      description: trx.description || '',
      notes: trx.notes || '',
      debt_id: trx.debt_id || '',
      asset_id: trx.asset_id || '',
      submission_id: trx.submission_id || '',
      goal_id: trx.goal_id || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteSingle = async (id: number) => {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) { toast.success("Entry removed"); fetchTransactions(); } 
    else { toast.error(error.message); }
  };

  const handleDeleteBulk = async () => {
    if (!confirm(`Delete ${selectedIds.length} entries?`)) return;
    const { error } = await supabase.from('transactions').delete().in('id', selectedIds);
    if (!error) { toast.success("Deleted"); setSelectedIds([]); fetchTransactions(); } else { toast.error(error.message); }
  };

  const resetFilters = () => {
    setFilterWallet('');
    setFilterCategory('');
    setFilterDateStart('');
    setFilterDateEnd('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === transactions.length) setSelectedIds([]);
    else setSelectedIds(transactions.map(t => t.id));
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, amount: rawVal });
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Transactions</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">Manage your financial records</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={() => { setEditingId(null); resetForm(); setIsModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-lg transition-all active:scale-95">
            <Plus size={16} /> New Entry
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6 overflow-hidden">
        <div className="p-4 md:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => setIsFiltersOpen(!isFiltersOpen)}>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Filter size={16} className="text-blue-600" /> Filters</h3>
            {(filterWallet || filterCategory || filterDateStart || filterDateEnd || searchQuery) && <span className="w-2 h-2 rounded-full bg-blue-500" />}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={(e) => { e.stopPropagation(); resetFilters(); }} className="text-[10px] font-bold text-slate-400 hover:text-red-600 transition-colors uppercase tracking-widest">Reset</button>
            {isFiltersOpen ? <ChevronUp size={16} className="text-slate-900" /> : <ChevronDown size={16} className="text-slate-900" />}
          </div>
        </div>
        
        <AnimatePresence>
          {isFiltersOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="p-4 md:p-5 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 border-t border-slate-50 mt-2">
                <div className="lg:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input type="text" placeholder="Search description..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-sm" />
                </div>
                <select value={filterWallet} onChange={(e) => setFilterWallet(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm">
                  <option value="">All Accounts</option>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm">
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-2.5 text-[10px] font-bold text-slate-900 outline-none focus:border-blue-400 shadow-sm" />
                  <span className="text-slate-400 font-bold">-</span>
                  <input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-2.5 text-[10px] font-bold text-slate-900 outline-none focus:border-blue-400 shadow-sm" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        <SummaryCard title="Income" value={filteredSummary.income} icon={<TrendingUp size={16} />} color="text-emerald-600" bg="bg-emerald-50" />
        <SummaryCard title="Expenses" value={filteredSummary.expense} icon={<TrendingDown size={16} />} color="text-red-600" bg="bg-red-50" />
        <div className="col-span-2 md:col-span-1">
            <SummaryCard title="Net Flow" value={netBalance} icon={<Activity size={16} />} color={netBalance >= 0 ? "text-blue-600" : "text-amber-600"} bg={netBalance >= 0 ? "bg-blue-50" : "bg-amber-50"} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex flex-wrap justify-between items-center px-4 md:px-6 gap-4">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registry</p>
            <span className="text-[10px] bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-full font-bold">{totalItems} records</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rows</span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-blue-400 transition-colors"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 w-10 text-center"><input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0" checked={selectedIds.length === transactions.length && transactions.length > 0} onChange={toggleSelectAll} /></th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Account</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell text-center">Category</th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (<tr><td colSpan={6} className="text-center py-12 text-xs text-slate-400 font-bold uppercase tracking-widest">Syncing Records...</td></tr>) :
                transactions.length === 0 ? (<tr><td colSpan={6} className="text-center py-12 text-xs text-slate-400 font-bold uppercase tracking-widest">No records found</td></tr>) : (
                  transactions.map((trx) => (
                    <tr key={trx.id} className={`group hover:bg-slate-50 transition-colors ${selectedIds.includes(trx.id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-6 py-3 text-center"><input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0" checked={selectedIds.includes(trx.id)} onChange={() => toggleSelect(trx.id)} /></td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-1 h-8 rounded-full ${trx.type === 'income' ? 'bg-emerald-400' : trx.type === 'transfer' ? 'bg-blue-400' : 'bg-red-400'} opacity-80`} />
                          <div>
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{trx.type === 'transfer' ? 'Transfer' : trx.item?.name || trx.description}</p>
                                {trx.project && <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-bold uppercase tracking-tighter flex items-center gap-1"><Target size={8}/>{trx.project.name}</span>}
                                {trx.asset && <span className="text-[8px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 font-bold uppercase tracking-tighter flex items-center gap-1"><PieChart size={8}/>{trx.asset.symbol}</span>}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold">{new Date(trx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs font-bold text-slate-600">
                        {trx.type === 'transfer' ? (
                          <div className="flex flex-col gap-0.5"><span className="text-slate-900">{trx.wallet?.name}</span><span className="text-[9px] text-slate-400 font-bold">to {trx.to_wallet?.name}</span></div>
                        ) : (trx.wallet?.name)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-center">
                        <span className="px-2.5 py-1 rounded-md text-[9px] font-bold bg-slate-50 text-slate-500 border border-slate-100 uppercase tracking-tighter">{(trx.item as any)?.categories?.name || 'General'}</span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`text-sm font-bold ${trx.type === 'income' ? 'text-emerald-600' : trx.type === 'transfer' ? 'text-blue-600' : 'text-slate-900'}`}>
                          {trx.type === 'expense' && '- '}
                          {new Intl.NumberFormat('id-ID').format(trx.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex justify-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(trx)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 size={14} /></button>
                          <button onClick={() => handleDeleteSingle(trx.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {!loading && totalItems > 0 && <div className="p-4 border-t border-slate-50"><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }} totalItems={totalItems} startIndex={(currentPage - 1) * itemsPerPage} endIndex={Math.min(currentPage * itemsPerPage, totalItems)} /></div>}
      </div>

      {/* Modal Integration Logic Remains Same */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl p-5 md:p-6 max-h-[90vh] overflow-y-auto overscroll-contain no-scrollbar">
               <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Entry' : 'New Entry'}</h2>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18}/></button>
               </div>
               
               <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Type</label>
                        <div className="flex gap-2 p-1 bg-slate-50 rounded-lg">
                        {['income', 'expense', 'transfer'].map(t => (
                            <button key={t} type="button" onClick={() => setFormData({...formData, type: t})} className={`flex-1 py-2 text-[10px] font-bold rounded-md capitalize transition-all ${formData.type === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t}</button>
                        ))}
                        </div>
                    </div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Date</label><input type="date" className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                  </div>

                  <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Amount</label><input type="text" className="w-full text-base p-3 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-900" placeholder="0" value={formatDisplayAmount(formData.amount)} onChange={handleAmountChange} /></div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">{formData.type === 'transfer' ? 'From Account' : 'Wallet'}</label><select className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.wallet_id} onChange={e => setFormData({...formData, wallet_id: e.target.value})}>
                        <option value="">Select...</option>
                        {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select></div>
                    {formData.type === 'transfer' ? (
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">To Account</label><select className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.to_wallet_id} onChange={e => setFormData({...formData, to_wallet_id: e.target.value})}>
                            <option value="">Select...</option>
                            {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select></div>
                    ) : (
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Category Item</label><select className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.item_id} onChange={e => setFormData({...formData, item_id: e.target.value})}>
                            <option value="">Select...</option>
                            {masterItems.filter(i => (i.categories as any)?.type === formData.type).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select></div>
                    )}
                  </div>

                  <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Description</label><input type="text" placeholder="Note..." className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>

                  <div className="pt-2 border-t border-slate-100 mt-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Optional Associations</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[9px] font-bold text-slate-500 mb-1 block uppercase">Project</label>
                            <select className="w-full text-[10px] p-2 bg-slate-50 rounded-lg outline-none text-slate-900 font-bold" value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})}>
                                <option value="">None</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-slate-500 mb-1 block uppercase">Asset</label>
                            <select className="w-full text-[10px] p-2 bg-slate-50 rounded-lg outline-none text-slate-900 font-bold" value={formData.asset_id} onChange={e => setFormData({...formData, asset_id: e.target.value})}>
                                <option value="">None</option>
                                {assets.map(a => <option key={a.id} value={a.id}>{a.symbol}</option>)}
                            </select>
                        </div>
                    </div>
                  </div>

                  <button type="submit" className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors mt-2 shadow-lg shadow-slate-200 uppercase tracking-widest active:scale-[0.98]">Save Transaction</button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedIds.length} selected</span>
            <button onClick={handleDeleteBulk} className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 uppercase tracking-widest"><Trash2 size={12} /> Delete</button>
            <button onClick={() => setSelectedIds([])} className="text-slate-500 hover:text-white"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({ title, value, icon, color, bg }: any) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-all">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className={`text-base md:text-xl font-bold ${color} tracking-tight`}>{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value)}</p>
      </div>
      <div className={`p-2.5 rounded-xl ${bg} ${color} shadow-sm group-hover:scale-110 transition-transform`}>{icon}</div>
    </div>
  );
}