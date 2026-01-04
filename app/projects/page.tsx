'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  Target, 
  Plus, 
  Download, 
  X,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit3
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectItems, setProjectItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  
  const [projectForm, setProjectModalForm] = useState({ name: '', budget: '' });
  const [itemForm, setItemModalForm] = useState({ name: '', category: '', qty: '1', price: '', actual: '', notes: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
        fetchProjectItems(selectedProject.id);
        setSelectedIds([]);
    }
  }, [selectedProject]);

  const formatDisplayAmount = (val: string) => {
    if (!val) return "";
    const num = val.replace(/\D/g, "");
    return new Intl.NumberFormat('id-ID').format(Number(num));
  };

  async function fetchProjects() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setProjects(data || []);
      if (data && data.length > 0 && !selectedProject) setSelectedProject(data[0]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function fetchProjectItems(projectId: number) {
    const { data, error } = await supabase
      .from('project_items')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (!error) setProjectItems(data || []);
  }

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('projects').insert({
        user_id: user?.id,
        name: projectForm.name,
        total_budget: Number(projectForm.budget.replace(/\D/g, ""))
    }).select().single();

    if (error) alert(error.message);
    else {
        setIsProjectModalOpen(false);
        setProjectModalForm({ name: '', budget: '' });
        fetchProjects();
        setSelectedProject(data);
    }
  };

  const openEditItemModal = (item: any) => {
    setEditingItemId(item.id);
    setItemModalForm({
      name: item.item_name,
      category: item.category || '',
      qty: item.quantity.toString(),
      price: item.unit_price.toString(),
      actual: item.actual_cost.toString(),
      notes: item.notes || ''
    });
    setIsItemModalOpen(true);
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
        user_id: user?.id,
        project_id: selectedProject.id,
        item_name: itemForm.name,
        category: itemForm.category,
        quantity: Number(itemForm.qty),
        unit_price: Number(itemForm.price.toString().replace(/\D/g, "")),
        actual_cost: Number(itemForm.actual.toString().replace(/\D/g, "")),
        notes: itemForm.notes
    };

    let error;
    if (editingItemId) {
        const { error: err } = await supabase.from('project_items').update(payload).eq('id', editingItemId);
        error = err;
    } else {
        const { error: err } = await supabase.from('project_items').insert(payload);
        error = err;
    }

    if (error) alert(error.message);
    else {
        setIsItemModalOpen(false);
        setEditingItemId(null);
        setItemModalForm({ name: '', category: '', qty: '1', price: '', actual: '', notes: '' });
        fetchProjectItems(selectedProject.id);
    }
  };

  const handleDeleteItemSingle = async (id: number) => {
    if (!confirm("Delete this item?")) return;
    await supabase.from('project_items').delete().eq('id', id);
    fetchProjectItems(selectedProject.id);
  };

  const handleDeleteItemBulk = async () => {
    if (!confirm(`Delete ${selectedIds.length} selected items?`)) return;
    await supabase.from('project_items').delete().in('id', selectedIds);
    setSelectedIds([]);
    fetchProjectItems(selectedProject.id);
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    if (!confirm(`⚠️ DELETE PROJECT "${selectedProject.name}"?\n\nAll items in this project will be lost.`)) return;
    const { error } = await supabase.from('projects').delete().eq('id', selectedProject.id);
    if (!error) {
        const remaining = projects.filter(p => p.id !== selectedProject.id);
        setProjects(remaining);
        setSelectedProject(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const templateData = [
      { 'Item Name': 'Jasa Tukang', Category: 'Jasa', Quantity: 1, 'Unit Price': 15000000, 'Actual Cost': 15000000, Notes: 'Lunas' },
      { 'Item Name': 'Semen 50kg', Category: 'Material', Quantity: 20, 'Unit Price': 65000, 'Actual Cost': 0, Notes: 'Belum beli' }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(templateData), 'ProjectItems');
    XLSX.writeFile(wb, `MyLedger_project_template.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        const { data: { user } } = await supabase.auth.getUser();
        const payload = data.map(row => ({
            user_id: user?.id,
            project_id: selectedProject.id,
            item_name: row['Item Name'],
            category: row['Category'],
            quantity: Number(row['Quantity'] || 1),
            unit_price: Number(row['Unit Price'] || 0),
            actual_cost: Number(row['Actual Cost'] || 0),
            notes: row['Notes']
        })).filter(i => i.item_name);

        const { error } = await supabase.from('project_items').insert(payload);
        if (error) throw error;
        alert("Project data imported!");
        fetchProjectItems(selectedProject.id);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err: any) { 
        alert(err.message); 
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const totalActual = projectItems.reduce((acc, curr) => acc + (curr.actual_cost), 0);
  const sisaBudget = (selectedProject?.total_budget || 0) - totalActual;

  return (
    <div className="max-w-6xl mx-auto pb-20 text-black font-black">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter flex items-center gap-3">
            <Building2 className="text-blue-600" /> Goal Tracker
          </h1>
          <p className="text-slate-700 font-bold mt-2 tracking-tight uppercase text-[10px] tracking-[0.2em] opacity-50">Project Management</p>
        </div>
        {selectedProject && (
            <button onClick={handleDeleteProject} className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-2xl text-xs font-black hover:bg-red-100 transition-all uppercase tracking-widest">
                <Trash2 size={14} /> Remove Project
            </button>
        )}
      </header>

      <div className="flex gap-2 mb-10 bg-slate-100 p-2 rounded-[2rem] w-fit shadow-inner">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProject(p)}
            className={`px-8 py-3.5 rounded-[1.5rem] text-sm font-black transition-all ${selectedProject?.id === p.id ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {p.name}
          </button>
        ))}
        <button onClick={() => setIsProjectModalOpen(true)} className="px-5 py-2 text-slate-400 hover:text-blue-600 transition-all active:scale-90"><Plus size={24} /></button>
      </div>

      <AnimatePresence>
        {isProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProjectModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-10 overflow-hidden text-black font-black">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black">New Project</h2>
                <button onClick={() => setIsProjectModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-black" /></button>
              </div>
              <form onSubmit={handleProjectSubmit} className="space-y-6 text-black">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-2 block tracking-widest">Project Name</label>
                  <input type="text" placeholder="e.g. House Reno" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none shadow-sm" value={projectForm.name} onChange={(e) => setProjectModalForm({...projectForm, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-2 block tracking-widest">Total Budget</label>
                  <input type="text" placeholder="0" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none shadow-sm" value={formatDisplayAmount(projectForm.budget)} onChange={(e) => setProjectModalForm({...projectForm, budget: e.target.value.replace(/\D/g, "")})} />
                </div>
                <button type="submit" className="w-full bg-black text-white font-black py-5 rounded-[1.5rem] shadow-lg hover:bg-slate-800 transition-all mt-4 uppercase tracking-widest text-xs">Initialize Project</button>
              </form>
            </motion.div>
          </div>
        )}

        {isItemModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsItemModalOpen(false); setEditingItemId(null); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 overflow-hidden text-black font-black">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black">{editingItemId ? 'Update Item' : 'New Project Item'}</h2>
                <button onClick={() => { setIsItemModalOpen(false); setEditingItemId(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-black"><X size={20} /></button>
              </div>
              <form onSubmit={handleItemSubmit} className="space-y-5 text-black">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-2 block tracking-widest">Item Name</label>
                  <input type="text" placeholder="e.g. Wall Paint" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none" value={itemForm.name} onChange={(e) => setItemModalForm({...itemForm, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-2 block tracking-widest">Category</label>
                    <input type="text" placeholder="Material" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none" value={itemForm.category} onChange={(e) => setItemModalForm({...itemForm, category: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-2 block tracking-widest">Quantity</label>
                    <input type="number" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none" value={itemForm.qty} onChange={(e) => setItemModalForm({...itemForm, qty: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-2 block tracking-widest">Unit Price</label>
                    <input type="text" placeholder="0" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none" value={formatDisplayAmount(itemForm.price)} onChange={(e) => setItemModalForm({...itemForm, price: e.target.value.replace(/\D/g, "")})} />
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-2 block tracking-widest">Actual Spent</label>
                    <input type="text" placeholder="0" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none" value={formatDisplayAmount(itemForm.actual)} onChange={(e) => setItemModalForm({...itemForm, actual: e.target.value.replace(/\D/g, "")})} />
                  </div>
                </div>
                <button type="submit" className="w-full bg-black text-white font-black py-5 rounded-[1.5rem] shadow-lg hover:bg-slate-800 transition-all mt-4 uppercase tracking-widest text-xs">{editingItemId ? 'Update Record' : 'Add to Breakdown'}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-xl">
            <div className="text-sm font-black uppercase tracking-widest text-slate-400"><span className="text-white">{selectedIds.length}</span> selected</div>
            <button onClick={handleDeleteItemBulk} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-black text-sm uppercase tracking-tighter"><Trash2 size={18} /> Delete Items</button>
            <button onClick={() => setSelectedIds([])} className="text-xs font-bold text-slate-500 hover:text-white">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="py-24 text-center text-slate-400 font-black uppercase tracking-widest animate-pulse tracking-[0.3em]">Building Projects...</div>
      ) : selectedProject && (
        <div className="space-y-10 text-black">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <motion.div whileHover={{ y: -5 }} className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl shadow-slate-900/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity"><Building2 size={120} /></div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-4">Master Budget</p>
              <p className="text-4xl font-black tracking-tighter">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedProject.total_budget)}</p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm text-black">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Total Realization</p>
              <p className="text-4xl font-black text-black tracking-tighter">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalActual)}</p>
              <div className="w-full bg-slate-100 h-3.5 rounded-full mt-8 overflow-hidden shadow-inner">
                <div className={`h-full transition-all duration-1000 ${totalActual > selectedProject.total_budget ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((totalActual / selectedProject.total_budget) * 100, 100)}%` }} />
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm text-black">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Remaining Funds</p>
              <p className={`text-4xl font-black tracking-tighter ${sisaBudget >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(sisaBudget)}
              </p>
            </motion.div>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden text-black">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <h3 className="font-black text-black text-2xl tracking-tighter flex items-center gap-4"><Target size={28} className="text-blue-600" /> Project Breakdown</h3>
              <div className="flex gap-3">
                <button onClick={downloadTemplate} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-2 shadow-sm uppercase tracking-widest">Template</button>
                <button onClick={() => { setEditingItemId(null); setItemModalForm({name:'', category:'', qty:'1', price:'', actual:'', notes:''}); setIsItemModalOpen(true); }} className="px-6 py-3 bg-black text-white rounded-2xl text-xs font-black hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg uppercase tracking-widest">Add Item</button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-black">
                <thead>
                  <tr className="text-slate-400 font-black uppercase text-[10px] tracking-widest border-b border-slate-100">
                    <th className="px-10 py-6 w-10">
                        <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" checked={selectedIds.length === projectItems.length && projectItems.length > 0} onChange={() => setSelectedIds(selectedIds.length === projectItems.length ? [] : projectItems.map(i => i.id))} />
                    </th>
                    <th className="px-10 py-6">Description</th>
                    <th className="px-10 py-6 text-center">Category</th>
                    <th className="px-10 py-6 text-right">Estimate</th>
                    <th className="px-10 py-6 text-right">Actual Spent</th>
                    <th className="px-10 py-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-black">
                  {projectItems.map((item) => (
                    <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.includes(item.id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-10 py-8">
                        <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-blue-600" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds(selectedIds.includes(item.id) ? selectedIds.filter(i => i !== item.id) : [...selectedIds, item.id])} />
                      </td>
                      <td className="px-10 py-8 font-black text-black text-base uppercase tracking-tight">
                        <p>{item.item_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-70 font-black">{item.notes}</p>
                      </td>
                      <td className="px-10 py-8 text-center">
                        <span className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black uppercase border border-slate-200">{item.category}</span>
                      </td>
                      <td className="px-10 py-8 text-right font-black text-slate-500">{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(item.quantity * item.unit_price)}</td>
                      <td className="px-10 py-8 text-right font-black text-black text-lg tracking-tight">{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(item.actual_cost)}</td>
                      <td className="px-10 py-8">
                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => openEditItemModal(item)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all border border-transparent hover:border-blue-100 shadow-sm"><Edit3 size={18} /></button>
                            <button onClick={() => handleDeleteItemSingle(item.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100 shadow-sm"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {projectItems.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-32 text-slate-400 font-black uppercase tracking-widest text-xs tracking-[0.3em]">Empty Breakdown List.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}