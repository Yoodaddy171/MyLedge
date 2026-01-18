'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDisplayAmount } from '@/lib/utils';
import { Plus, Download, Search, Filter, Trash2, X, Edit3, TrendingUp, TrendingDown, Landmark } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Pagination from '@/components/Pagination';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);

  const [projects, setProjects] = useState<any[]>([]);

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
    debt_id: ''
  });
  const [activeDebts, setActiveDebts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Filter States
  const [filterWallet, setFilterWallet] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(isModalOpen);

  useEffect(() => {
    fetchTransactions();
    fetchFormSupportData();
  }, []);

  // Refetch when filters change and reset pagination
  useEffect(() => {
    setCurrentPage(1);
    fetchTransactions();
  }, [filterWallet, filterCategory, filterDateStart, filterDateEnd, searchQuery]);

  async function fetchFormSupportData() {
    try {
      const { data: items, error: itemsError } = await supabase
        .from('transaction_items')
        .select('id, name, code, category_id, categories(id, name, type)');

      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('id, name')
        .eq('is_active', true);

      const { data: debts, error: debtsError } = await supabase
        .from('debts')
        .select('id, name, remaining_amount')
        .eq('is_paid', false)
        .gt('remaining_amount', 0);

      const { data: cats, error: catsError } = await supabase
        .from('categories')
        .select('id, name');

      const { data: projs, error: projsError } = await supabase
        .from('projects')
        .select('id, name')
        .neq('status', 'cancelled');

      if (itemsError) console.error('Items error:', itemsError);
      if (walletsError) console.error('Wallets error:', walletsError);
      if (debtsError) console.error('Debts error:', debtsError);
      if (catsError) console.error('Categories error:', catsError);
      if (projsError) console.error('Projects error:', projsError);

      setMasterItems(items || []);
      setWallets(wallets || []);
      setActiveDebts(debts || []);
      setCategories(cats || []);
      setProjects(projs || []);
    } catch (error) {
      console.error('Error fetching form support data:', error);
    }
  }

  // Computed: Filtered Transactions
  // Most filtering now done server-side, only category filter remains client-side
  // (because category is in nested relation transaction_items.categories)
  const filteredTransactions = transactions.filter(trx => {
    const matchesCategory = !filterCategory || trx.item?.categories?.id?.toString() === filterCategory;
    return matchesCategory;
  });

  // Computed: Filtered Summary
  const filteredSummary = filteredTransactions.reduce((acc, curr) => {
    if (curr.type === 'income') acc.income += Number(curr.amount);
    else if (curr.type === 'expense') acc.expense += Number(curr.amount);
    // Transfers are neutral in summary usually, or we can track them separately
    return acc;
  }, { income: 0, expense: 0 });

  const netBalance = filteredSummary.income - filteredSummary.expense;

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, amount: rawVal });
  };

  const resetFilters = () => {
    setFilterWallet('');
    setFilterCategory('');
    setFilterDateStart('');
    setFilterDateEnd('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  async function fetchTransactions() {
    try {
      setLoading(true);

      // Build query with server-side filtering
      let query = supabase
        .from('transactions')
        .select(`
          *,
          wallet:wallets!wallet_id(name),
          to_wallet:wallets!to_wallet_id(name),
          project:projects(name),
          item:transaction_items(
            name,
            code,
            categories (
                id,
                name
            )
          )
        `);

      // Apply filters on server
      if (filterWallet) {
        query = query.eq('wallet_id', filterWallet);
      }

      if (filterDateStart) {
        query = query.gte('date', filterDateStart);
      }

      if (filterDateEnd) {
        query = query.lte('date', filterDateEnd);
      }

      // Search query (using ilike for case-insensitive search)
      if (searchQuery) {
        query = query.or(`description.ilike.%${searchQuery}%`);
      }

      // Execute query with ordering and limit
      const { data, error } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500); // Reduced from 1000 since we filter server-side

      if (error) {
        console.error('Supabase error:', error);
        toast.error('Failed to load transactions: ' + (error.message || 'Unknown error'));
        throw error;
      }
      setTransactions(data || []);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteSingle = async (id: number) => {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      toast.success("Entry removed");
      fetchTransactions();
    } else {
      toast.error(error.message);
    }
  };

  const handleDeleteBulk = async () => {
    if (!confirm(`Remove ${selectedIds.length} selected entries?`)) return;
    const { error } = await supabase.from('transactions').delete().in('id', selectedIds);
    if (!error) {
      toast.success(`${selectedIds.length} entries removed`);
      setSelectedIds([]);
      fetchTransactions();
    } else {
      toast.error(error.message);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) setSelectedIds([]);
    else setSelectedIds(filteredTransactions.map(t => t.id));
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id));
    else setSelectedIds([...selectedIds, id]);
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
      debt_id: trx.debt_id || ''
    });
    setIsModalOpen(true);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (formData.type === 'transfer' && !formData.to_wallet_id) {
      toast.error("Please select a destination account for transfer.");
      return;
    }

    // VALIDATION: Prevent self-transfer
    if (formData.type === 'transfer' && formData.wallet_id === formData.to_wallet_id) {
      toast.error("Cannot transfer to the same account. Please select different source and destination.");
      return;
    }

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
      item_id: formData.item_id || null, // Optional for transfers
      project_id: formData.project_id || null,
      debt_id: formData.type === 'expense' ? (formData.debt_id || null) : null,
    };

    let error;
    if (editingId) {
      const { error: err } = await supabase.from('transactions').update(payload).eq('id', editingId);
      error = err;
    } else {
      const { error: err } = await supabase.from('transactions').insert(payload);
      error = err;
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingId ? "Entry updated" : "New entry added");
      setIsModalOpen(false);
      setEditingId(null);
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
        debt_id: '' 
      });
      fetchTransactions();
      fetchFormSupportData();
    }
  };

  const handleResetData = async () => {
    if (!confirm("⚠️ CAUTION!\n\nThis will permanently delete ALL entries. Proceed?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('transactions').delete().gt('id', 0);
      if (error) throw error;
      toast.success("History cleared.");
      fetchTransactions();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Get sample item codes from master items for the template
    const incomeItem = masterItems.find(i => (i.categories as any)?.type === 'income');
    const expenseItem = masterItems.find(i => (i.categories as any)?.type === 'expense');

    const trxData = [
      {
        'Date': new Date().toISOString().split('T')[0],
        'Item Code': incomeItem?.code || 'T1000',
        'Bank/Wallet': wallets[0]?.name || 'Main Checking',
        'Amount': 15000000,
        'Description': 'Monthly Salary',
        'Notes': 'Income example - use code from transaction items'
      },
      {
        'Date': new Date().toISOString().split('T')[0],
        'Item Code': expenseItem?.code || 'T1001',
        'Bank/Wallet': wallets[0]?.name || 'Cash',
        'Amount': -50000,
        'Description': 'Lunch',
        'Notes': 'Expense example - negative amount or use item code from expense category'
      }
    ];

    // Add instruction sheet
    const instructions = [
      { Field: 'Date', Format: 'YYYY-MM-DD', Required: 'Yes', Example: '2025-01-17', Notes: 'Transaction date' },
      { Field: 'Item Code', Format: 'Text', Required: 'Yes', Example: 'T1000', Notes: 'Code from transaction items - determines income/expense type' },
      { Field: 'Bank/Wallet', Format: 'Text', Required: 'Yes', Example: 'Main Checking', Notes: 'Wallet name (will be created if not exists)' },
      { Field: 'Amount', Format: 'Number', Required: 'Yes', Example: '15000000 or -50000', Notes: 'Positive for income, negative for expense, or use item code type' },
      { Field: 'Description', Format: 'Text', Required: 'No', Example: 'Monthly salary', Notes: 'Transaction description' },
      { Field: 'Notes', Format: 'Text', Required: 'No', Example: 'Additional info', Notes: 'Optional notes' }
    ];

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trxData), 'Transactions');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instructions), 'Instructions');
    XLSX.writeFile(wb, `MyLedger_Import_Template.xlsx`);
    toast.success('Template downloaded! Check the Instructions sheet for details.');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        if (!arrayBuffer) return;
        const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const wsname = wb.SheetNames.find(n => n.includes('MOVEMENT')) || wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { range: ws['A6'] ? 5 : 0 });
        if (data.length === 0) { toast.error("No data found in Excel."); return; }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const uniqueWallets = Array.from(new Set(data.map(r => r['Asal Dana'] || r['Bank/Wallet'] || r['Wallet']))).filter(Boolean);
        const { data: dbWallets } = await supabase.from('wallets').select('id, name');
        const walletMap = new Map(dbWallets?.map(w => [w.name, w.id]));
        for (const wName of uniqueWallets as string[]) {
          if (!walletMap.has(wName)) {
            // Schema V2: Add required fields for new wallets
            const { data: newW } = await supabase.from('wallets').insert({
              user_id: user.id,
              name: wName,
              type: 'bank', // Default type
              initial_balance: 0,
              current_balance: 0,
              currency: 'IDR',
              is_active: true,
              is_excluded_from_total: false
            }).select().single();
            if (newW) walletMap.set(wName, newW.id);
          }
        }

        const { data: items } = await supabase.from('transaction_items').select('id, code, categories(type)');
        const itemMap = new Map(items?.map(i => [i.code, i.id]));
        const itemTypeMap = new Map(items?.map(i => [i.code, (i.categories as any)?.type]));

        const payload = data.map(row => {
          let dateVal = row['Tanggal'] || row['Date'];
          if (dateVal instanceof Date) dateVal = dateVal.toISOString().split('T')[0];
          const itemCode = String(row['Kode Transaksi'] || row['Item Code'] || '').trim();
          const nominalIn = Number(row['Nominal IN'] || 0);
          const nominalOut = Number(row['Nominal OUT'] || 0);
          const templateAmount = Number(row['Amount'] || 0);
          let type = 'expense', amount = 0;
          if (nominalIn > 0) { type = 'income'; amount = nominalIn; }
          else if (nominalOut > 0) { type = 'expense'; amount = nominalOut; }
          else if (templateAmount !== 0) {
            amount = Math.abs(templateAmount);
            type = itemTypeMap.get(itemCode) || (templateAmount > 0 ? 'income' : 'expense');
          }
          return {
            user_id: user.id, date: dateVal, amount: amount, type: type,
            description: String(row['Keterangan'] || row['Description'] || row['Nama Transaksi'] || '').trim(),
            item_id: itemMap.get(itemCode) || null,
            wallet_id: walletMap.get(row['Asal Dana'] || row['Bank/Wallet'] || row['Wallet']) || null
          };
        }).filter(p => p.date && p.amount > 0);

        const { error } = await supabase.from('transactions').insert(payload);
        if (error) throw error;
        toast.success(`Success: ${payload.length} items imported.`);
        fetchTransactions();
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err: any) { toast.error("Import Error: " + err.message); if (fileInputRef.current) fileInputRef.current.value = ""; }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 text-black font-black uppercase">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-black">My Transactions</h1>
          <p className="text-slate-700 text-xs mt-1 font-bold tracking-tight">Daily cashflow history & logs.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={handleResetData} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-[9px] font-black text-red-600 hover:bg-red-100 transition-colors shadow-sm">
            <Trash2 size={14} /> Wipe History
          </button>
          <button onClick={() => { 
            setEditingId(null); 
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
              debt_id: '' 
            });  
            setIsModalOpen(true); 
          }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 rounded-xl text-[10px] font-black text-white hover:bg-blue-700 shadow-xl transition-all uppercase tracking-widest">
            <Plus size={14} /> New Entry
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-[1.5rem] border-2 border-slate-100 shadow-sm mb-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-black tracking-tight flex items-center gap-3">
            <Filter size={18} className="text-blue-600" /> Advanced Filters
          </h3>
          <button onClick={resetFilters} className="text-[9px] font-black text-slate-400 hover:text-red-500 transition-colors tracking-widest uppercase">Reset</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search items or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-12 py-3 text-[11px] font-bold text-black focus:border-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          <div>
            <select
              value={filterWallet}
              onChange={(e) => setFilterWallet(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-[9px] font-black uppercase shadow-sm outline-none focus:border-blue-500"
            >
              <option value="">All Accounts</option>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-[9px] font-black uppercase shadow-sm outline-none focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-3 text-[9px] font-black uppercase shadow-sm outline-none focus:border-blue-500"
            />
            <span className="text-slate-300 font-black">-</span>
            <input
              type="date"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-3 text-[9px] font-black uppercase shadow-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Filtered Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryCard
          title="Inbound"
          value={filteredSummary.income}
          icon={<TrendingUp className="text-emerald-600" size={18} />}
          color="text-emerald-600"
          sub="Filtered Income"
        />
        <SummaryCard
          title="Outbound"
          value={filteredSummary.expense}
          icon={<TrendingDown className="text-red-600" size={18} />}
          color="text-red-700"
          sub="Filtered Expenses"
        />
        <SummaryCard
          title="Net Movement"
          value={netBalance}
          icon={<Filter className="text-blue-600" size={18} />}
          color={netBalance >= 0 ? "text-blue-700" : "text-red-700"}
          sub="Balance"
        />
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-hidden pointer-events-none">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl text-black font-black max-h-[90vh] overflow-y-auto overscroll-contain p-10 pointer-events-auto" style={{WebkitOverflowScrolling: 'touch'}}>
              <div className="flex justify-between items-center pb-6 mb-6 border-b border-slate-100">
                <h2 className="text-2xl font-black uppercase tracking-tight">{editingId ? 'Edit Entry' : 'New Transaction'}</h2>
                <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">Transaction Type</label>
                  <div className="flex p-1 bg-slate-50 rounded-[1.2rem] border-2 border-slate-100">
                    {['income', 'expense', 'transfer'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: t })}
                        className={`flex-1 py-3 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                          formData.type === t
                            ? t === 'income' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                            : t === 'expense' ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                            : 'bg-blue-500 text-white shadow-lg shadow-blue-200'
                            : 'text-slate-400 hover:bg-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">Transaction Date</label>
                  <input type="date" required className="w-full bg-white border-2 border-slate-100 rounded-[1.2rem] px-6 py-5 text-sm font-bold text-black focus:border-blue-500 outline-none transition-all shadow-sm" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">From Account</label>
                    <select required className="w-full bg-white border-2 border-slate-100 rounded-[1.2rem] px-5 py-4 text-[10px] font-black uppercase shadow-sm outline-none focus:border-blue-500" value={formData.wallet_id} onChange={(e) => setFormData({ ...formData, wallet_id: e.target.value })}>
                      <option value="">Select...</option>
                      {wallets.map(w => (<option key={w.id} value={w.id}>{w.name}</option>))}
                    </select>
                  </div>
                  {formData.type === 'transfer' ? (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">To Account</label>
                      <select required className="w-full bg-white border-2 border-slate-100 rounded-[1.2rem] px-5 py-4 text-[10px] font-black uppercase shadow-sm outline-none focus:border-blue-500" value={formData.to_wallet_id} onChange={(e) => setFormData({ ...formData, to_wallet_id: e.target.value })}>
                        <option value="">Select...</option>
                        {wallets.filter(w => w.id.toString() !== formData.wallet_id).map(w => (<option key={w.id} value={w.id}>{w.name}</option>))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">Amount</label>
                      <input type="text" placeholder="0" required className="w-full bg-white border-2 border-slate-100 rounded-[1.2rem] px-5 py-4 text-sm font-black focus:border-blue-500 outline-none shadow-sm" value={formatDisplayAmount(formData.amount)} onChange={handleAmountChange} />
                    </div>
                  )}
                </div>

                {formData.type === 'transfer' && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">Transfer Amount</label>
                    <input type="text" placeholder="0" required className="w-full bg-white border-2 border-slate-100 rounded-[1.2rem] px-5 py-4 text-sm font-black focus:border-blue-500 outline-none shadow-sm" value={formatDisplayAmount(formData.amount)} onChange={handleAmountChange} />
                  </div>
                )}

                {formData.type !== 'transfer' && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">Category / Item</label>
                    <select required={formData.type !== 'transfer'} className="w-full bg-white border-2 border-slate-100 rounded-[1.2rem] px-6 py-5 text-xs font-black uppercase shadow-sm outline-none focus:border-blue-500" value={formData.item_id} onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}>
                      <option value="">Choose category...</option>
                      {masterItems.filter(item => {
                         const type = (item.categories as any)?.type;
                         return type === formData.type;
                      }).map(item => (<option key={item.id} value={item.id}>[{item.code}] {item.name}</option>))}
                    </select>
                  </div>
                )}

                {(formData.type === 'expense' || formData.type === 'income') && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">Project (Optional)</label>
                    <select className="w-full bg-white border-2 border-slate-100 rounded-[1.2rem] px-6 py-5 text-xs font-black uppercase shadow-sm outline-none focus:border-blue-500" value={formData.project_id} onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}>
                      <option value="">Link to Project...</option>
                      {projects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">Description</label>
                  <input type="text" placeholder="e.g. Lunch, Salary, etc." required className="w-full bg-white border-2 border-slate-100 rounded-[1.2rem] px-6 py-5 text-sm font-bold text-black focus:border-blue-500 outline-none transition-all shadow-sm" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">Additional Notes (Optional)</label>
                  <textarea placeholder="Any extra details..." className="w-full bg-white border-2 border-slate-100 rounded-[1.2rem] px-6 py-4 text-xs font-bold outline-none focus:border-blue-500 h-20 resize-none shadow-sm" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>

                {formData.type === 'expense' && activeDebts.length > 0 && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 bg-red-50 rounded-[2.5rem] border-2 border-red-100">
                    <label className="text-[10px] font-black uppercase tracking-widest text-red-800 mb-3 block">Link to Debt Payment</label>
                    <select className="w-full bg-white border-2 border-red-100 rounded-[1.2rem] px-5 py-4 text-[10px] font-black uppercase" value={formData.debt_id} onChange={(e) => setFormData({ ...formData, debt_id: e.target.value })}>
                      <option value="">Select debt record...</option>
                      {activeDebts.map(d => (<option key={d.id} value={d.id}>{d.name} (Rem: {new Intl.NumberFormat('id-ID').format(d.remaining_amount)})</option>))}
                    </select>
                    <p className="text-[8px] font-black text-red-400 mt-2 uppercase tracking-widest">Updates debt balance automatically.</p>
                  </motion.div>
                )}
                <button type="submit" className="w-full bg-black text-white font-black py-6 rounded-[1.5rem] shadow-xl hover:bg-slate-800 transition-all mt-4 tracking-widest text-[10px] uppercase">{editingId ? 'Update Entry' : 'Add History'}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[130] bg-black text-white px-10 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400"><span className="text-white">{selectedIds.length}</span> items selected</div>
            <button onClick={handleDeleteBulk} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-black text-xs uppercase tracking-widest transition-colors"><Trash2 size={18} /> Delete Selected</button>
            <button onClick={() => setSelectedIds([])} className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white p-6 rounded-[1.5rem] border-2 border-slate-50 shadow-xl mb-10 flex flex-col lg:flex-row items-center justify-between gap-6 group hover:border-blue-100 transition-all">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-md group-hover:scale-110 transition-transform"><Download size={20} /></div>
          <div>
            <h3 className="text-lg font-black text-black">Import Excel Logs</h3>
            <p className="text-xs text-slate-600 font-bold tracking-tight">Sync multiple transactions instantly.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <button onClick={downloadTemplate} className="flex-1 lg:flex-none px-6 py-3 bg-slate-50 text-slate-700 rounded-xl text-[9px] font-black hover:bg-slate-100 border border-slate-200 transition-all uppercase tracking-widest">Get Format</button>
          <button onClick={handleImportClick} className="flex-1 lg:flex-none px-8 py-3 bg-black text-white rounded-xl text-[9px] font-black hover:bg-slate-800 transition-all shadow-xl uppercase tracking-widest">Upload File</button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
        </div>
      </div>

      <div className="bg-white rounded-[1.5rem] border-2 border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="bg-slate-50/50 p-4 border-b-2 border-slate-100 flex justify-between items-center px-6">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Registry</p>
          <span className="text-[9px] font-black text-slate-400 uppercase">
            Total: {filteredTransactions.length} {filteredTransactions.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b-2 border-slate-100 text-slate-400 font-black uppercase text-[8px] tracking-widest">
              <tr>
                <th className="px-6 py-4 w-10 text-center">
                  <input type="checkbox" className="w-4 h-4 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" checked={selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0} onChange={toggleSelectAll} />
                </th>
                <th className="px-5 py-4 tracking-[0.2em]">Detail</th>
                <th className="px-4 py-4 tracking-[0.2em] hidden md:table-cell">Account</th>
                <th className="px-4 py-4 tracking-[0.2em] hidden lg:table-cell text-center">Category</th>
                <th className="px-6 py-4 tracking-[0.2em] text-right font-black">Movement</th>
                <th className="px-6 py-4 tracking-[0.2em] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {loading ? (<tr><td colSpan={6} className="text-center py-20 text-slate-400 font-black uppercase tracking-widest text-[10px] animate-pulse">Syncing Mission History...</td></tr>) :
                filteredTransactions.length === 0 ? (<tr><td colSpan={6} className="text-center py-24 text-slate-400 font-black uppercase tracking-widest text-[10px]">No entries match your filters.</td></tr>) : (
                  paginatedTransactions.map((trx) => (
                    <tr key={trx.id} className={`hover:bg-slate-50/50 transition-all group ${selectedIds.includes(trx.id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-6 py-3.5 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" checked={selectedIds.includes(trx.id)} onChange={() => toggleSelect(trx.id)} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-6 rounded-full ${
                            trx.type === 'income' ? 'bg-emerald-500' :
                            trx.type === 'transfer' ? 'bg-blue-500' :
                            'bg-red-500'
                          } opacity-20 group-hover:opacity-100 transition-all`} />
                          <div>
                            <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest block mb-0.5">{new Date(trx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                            <span className="font-black text-black text-sm uppercase tracking-tight">
                              {trx.type === 'transfer' ? 'Transfer' : trx.item?.name || 'Manual Entry'}
                            </span>
                            {trx.description && <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 block line-clamp-1">{trx.description}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {trx.type === 'transfer' && trx.to_wallet ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100">
                              <Landmark size={10} /> {trx.wallet?.name || 'Unknown'}
                            </span>
                            <span className="text-[7px] text-slate-400 font-black uppercase text-center">↓ to</span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <Landmark size={10} /> {trx.to_wallet?.name}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100">
                            <Landmark size={10} /> {trx.wallet?.name || 'Unknown'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell text-center">
                        <span className="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-100">
                          {(trx.item as any)?.categories?.name || 'General'}
                        </span>
                      </td>
                      <td className={`px-6 py-3.5 text-right`}>
                        <div className="flex flex-col items-end">
                          <div className={`flex items-center gap-1.5 font-black text-base tracking-tighter ${
                            trx.type === 'income' ? 'text-emerald-600' :
                            trx.type === 'transfer' ? 'text-blue-600' :
                            'text-black'
                          }`}>
                            {trx.type === 'income' ? <TrendingUp size={14} /> :
                             trx.type === 'transfer' ? <Landmark size={14} /> :
                             <TrendingDown size={14} />}
                            {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(trx.amount)}
                          </div>
                          <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                            {trx.type === 'income' ? 'In' : trx.type === 'transfer' ? 'Transfer' : 'Out'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => openEditModal(trx)} className="p-2 text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-blue-50 rounded-lg sm:opacity-0 group-hover:opacity-100"><Edit3 size={14} /></button>
                          <button onClick={() => handleDeleteSingle(trx.id)} className="p-2 text-slate-400 hover:text-red-600 transition-all border border-transparent hover:border-red-50 rounded-lg sm:opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && filteredTransactions.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(items) => { setItemsPerPage(items); setCurrentPage(1); }}
            totalItems={filteredTransactions.length}
            startIndex={startIndex}
            endIndex={endIndex}
          />
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color, sub }: any) {
  return (
    <motion.div whileHover={{ y: -5 }} className="bg-white p-5 rounded-[1.5rem] border-2 border-slate-50 shadow-xl relative overflow-hidden group transition-all hover:border-blue-100">
      <div className="flex items-center justify-between mb-6">
        <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-all shadow-sm">{icon}</div>
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{title}</p>
      </div>
      <p className={`text-xl font-black ${color} tracking-tighter`}>
        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)}
      </p>
      <p className="text-[9px] font-black text-slate-400 uppercase mt-2 tracking-widest opacity-80">{sub}</p>
    </motion.div>
  );
}
