'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Download, Search, Filter, Trash2, X, Edit3 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    item_id: '',
    wallet_id: '',
    amount: '',
    description: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTransactions();
    fetchFormSupportData();
  }, []);

  const formatDisplayAmount = (val: string) => {
    if (!val) return "";
    const num = val.replace(/\D/g, "");
    return new Intl.NumberFormat('id-ID').format(Number(num));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, amount: rawVal });
  };

  async function fetchFormSupportData() {
    const { data: items } = await supabase.from('transaction_items').select('id, name, code');
    const { data: wallets } = await supabase.from('wallets').select('id, name');
    setMasterItems(items || []);
    setWallets(wallets || []);
  }

  async function fetchTransactions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          wallet:wallets(name),
          item:transaction_items(
            name, 
            code,
            categories (
                name,
                code_prefix
            )
          )
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteSingle = async (id: number) => {
    if (!confirm("Delete this transaction?")) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
        toast.success("Transaction deleted successfully");
        fetchTransactions();
    } else {
        toast.error(error.message);
    }
  };

  const handleDeleteBulk = async () => {
    if (!confirm(`Delete ${selectedIds.length} selected transactions?`)) return;
    const { error } = await supabase.from('transactions').delete().in('id', selectedIds);
    if (!error) {
        toast.success(`${selectedIds.length} items deleted`);
        setSelectedIds([]);
        fetchTransactions();
    } else {
        toast.error(error.message);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === transactions.length) setSelectedIds([]);
    else setSelectedIds(transactions.map(t => t.id));
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const openEditModal = (trx: any) => {
    setEditingId(trx.id);
    setFormData({
      date: trx.date,
      item_id: trx.item_id || '',
      wallet_id: trx.wallet_id || '',
      amount: trx.amount.toString(),
      description: trx.description || ''
    });
    setIsModalOpen(true);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_id || !formData.amount || Number(formData.amount) <= 0) {
        toast.error("Please fill all required fields correctly.");
        return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: itemData } = await supabase.from('transaction_items').select('categories(type)').eq('id', formData.item_id).single();
    
    const payload = {
        user_id: user.id,
        date: formData.date,
        item_id: formData.item_id || null,
        wallet_id: formData.wallet_id || null,
        amount: Number(formData.amount),
        description: formData.description,
        type: (itemData?.categories as any)?.type || 'expense'
    };

    let error;
    if (editingId) {
        const { error: err } = await supabase.from('transactions').update(payload).eq('id', editingId);
        error = err;
    } else {
        const { error: err } = await supabase.from('transactions').insert(payload);
        error = err;
    }

    if (error) toast.error(error.message);
    else {
        toast.success(editingId ? "Entry updated" : "Entry created");
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ date: new Date().toISOString().split('T')[0], item_id: '', wallet_id: '', amount: '', description: '' });
        fetchTransactions();
    }
  };

  const handleResetData = async () => {
    if (!confirm("⚠️ ARE YOU SURE?\n\nThis will DELETE ALL TRANSACTIONS permanently.")) return;
    setLoading(true);
    try {
        const { error } = await supabase.from('transactions').delete().gt('id', 0);
        if (error) throw error;
        toast.success("All transactions have been wiped clean.");
        fetchTransactions();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const trxData = [
      { 'Date': new Date().toISOString().split('T')[0], 'Item Code': 'A0001ME-A', Wallet: 'Mandiri', Amount: 15000000, Description: 'Salary' },
      { 'Date': new Date().toISOString().split('T')[0], 'Item Code': 'C0001E-LC', Wallet: 'Cash', Amount: 50000, Description: 'Lunch' }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trxData), 'Transactions');
    XLSX.writeFile(wb, `MyLedger_transactions_template.xlsx`);
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

        const uniqueWallets = Array.from(new Set(data.map(r => r['Asal Dana'] || r['Wallet']))).filter(Boolean);
        const { data: dbWallets } = await supabase.from('wallets').select('id, name');
        const walletMap = new Map(dbWallets?.map(w => [w.name, w.id]));
        for (const wName of uniqueWallets as string[]) {
            if (!walletMap.has(wName)) {
                const { data: newW } = await supabase.from('wallets').insert({ name: wName, user_id: user.id }).select().single();
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
                wallet_id: walletMap.get(row['Asal Dana'] || row['Wallet']) || null
            };
        }).filter(p => p.date && p.amount > 0);

        const { error } = await supabase.from('transactions').insert(payload);
        if (error) throw error;
        toast.success(`Import Success: ${payload.length} transactions added.`);
        fetchTransactions();
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err: any) { toast.error("Import Error: " + err.message); if (fileInputRef.current) fileInputRef.current.value = ""; }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 text-black font-black">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-black">Transactions</h1>
          <p className="text-slate-700 text-sm mt-1 font-bold tracking-tight">Manage your daily cashflow.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={handleResetData} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600 hover:bg-red-100 transition-colors shadow-sm">
            <Trash2 size={16} /> Reset
          </button>
          <button onClick={() => { setEditingId(null); setFormData({ date: new Date().toISOString().split('T')[0], item_id: '', wallet_id: '', amount: '', description: '' }); setIsModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            <Plus size={16} /> New Entry
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 text-black font-black">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[2rem] md:rounded-[2.5rem] shadow-2xl p-6 md:p-10 overflow-hidden text-black font-black max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-black text-black tracking-tight">{editingId ? 'Edit Entry' : 'New Entry'}</h2>
                <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-black" /></button>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-5 md:space-y-6 text-black font-black">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Date</label>
                  <input type="date" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none shadow-sm" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Category / Item</label>
                  <select required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none shadow-sm" value={formData.item_id} onChange={(e) => setFormData({...formData, item_id: e.target.value})}>
                    <option value="">Select Item...</option>
                    {masterItems.map(item => (<option key={item.id} value={item.id}>[{item.code}] {item.name}</option>))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Wallet</label>
                    <select required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none shadow-sm" value={formData.wallet_id} onChange={(e) => setFormData({...formData, wallet_id: e.target.value})}>
                      <option value="">Wallet...</option>
                      {wallets.map(w => (<option key={w.id} value={w.id}>{w.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Amount</label>
                    <input type="text" placeholder="0" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none transition-all shadow-sm" value={formatDisplayAmount(formData.amount)} onChange={handleAmountChange} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Description</label>
                  <textarea placeholder="Optional details..." className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none h-24 resize-none shadow-sm" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-black text-white font-black py-5 rounded-[1.5rem] shadow-lg hover:bg-slate-800 transition-all mt-4 tracking-widest text-xs uppercase">{editingId ? 'Save Changes' : 'Create Entry'}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-6 md:bottom-10 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-[110] bg-black text-white px-6 md:px-8 py-4 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl flex flex-col sm:flex-row items-center gap-4 sm:gap-8 border border-white/10 backdrop-blur-xl">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400"><span className="text-white">{selectedIds.length}</span> selected</div>
            <div className="flex gap-6 items-center w-full sm:w-auto justify-between">
              <button onClick={handleDeleteBulk} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-black text-xs uppercase tracking-widest transition-colors"><Trash2 size={16} /> Delete</button>
              <button onClick={() => setSelectedIds([])} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm mb-8 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5 w-full">
          <div className="w-14 h-14 bg-green-50 rounded-[1.2rem] flex items-center justify-center text-green-600 shadow-inner"><Download size={24} /></div>
          <div>
            <h3 className="text-base font-black text-black">Bulk Transaction Sync</h3>
            <p className="text-xs text-slate-600 font-bold tracking-tight">Sync your daily logs from Excel.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <button onClick={downloadTemplate} className="flex-1 lg:flex-none px-6 py-3 bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black hover:bg-slate-100 border border-slate-200 transition-all uppercase tracking-widest">Template</button>
          <button onClick={handleImportClick} className="flex-1 lg:flex-none px-6 py-3 bg-black text-white rounded-2xl text-[10px] font-black hover:bg-slate-800 transition-all shadow-lg uppercase tracking-widest">Upload Logs</button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden font-black text-black">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-6 w-10">
                  <input type="checkbox" className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500" checked={selectedIds.length === transactions.length && transactions.length > 0} onChange={toggleSelectAll} />
                </th>
                <th className="px-4 py-6">Date</th>
                <th className="px-6 py-6">Description</th>
                <th className="px-6 py-6 text-center hidden sm:table-cell">Category</th>
                <th className="px-6 py-6 text-right font-black">Amount</th>
                <th className="px-6 py-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (<tr><td colSpan={6} className="text-center py-20 text-slate-400 font-black uppercase tracking-widest text-[10px] animate-pulse">Syncing...</td></tr>) : 
               transactions.length === 0 ? (<tr><td colSpan={6} className="text-center py-24 text-slate-400 font-bold uppercase tracking-widest text-[10px]">No history.</td></tr>) : (
                transactions.map((trx) => (
                  <tr key={trx.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.includes(trx.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-7">
                      <input type="checkbox" className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500" checked={selectedIds.includes(trx.id)} onChange={() => toggleSelect(trx.id)} />
                    </td>
                    <td className="px-4 py-7 text-slate-600 font-black text-[10px] whitespace-nowrap">{new Date(trx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</td>
                    <td className="px-6 py-7 font-black text-black text-sm uppercase tracking-tight min-w-[150px]">{trx.item?.name || trx.description}</td>
                    <td className="px-6 py-7 text-center hidden sm:table-cell">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-700 border border-slate-200">{(trx.item as any)?.categories?.name || 'General'}</span>
                    </td>
                    <td className={`px-6 py-7 text-right font-black text-sm ${trx.type === 'income' ? 'text-emerald-600' : 'text-black'}`}>
                        {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(trx.amount)}
                    </td>
                    <td className="px-6 py-7">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openEditModal(trx)} className="p-2.5 text-slate-400 hover:text-blue-600 transition-all sm:opacity-0 group-hover:opacity-100"><Edit3 size={16} /></button>
                        <button onClick={() => handleDeleteSingle(trx.id)} className="p-2.5 text-slate-400 hover:text-red-600 transition-all sm:opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}