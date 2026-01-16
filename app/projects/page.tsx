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
  Edit3,
  ChevronDown,
  Activity,
  BarChart3
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectItems, setProjectItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
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
    const num = val.toString().replace(/\D/g, "");
    return new Intl.NumberFormat('id-ID').format(Number(num));
  };

  async function fetchProjects() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setProjects(data || []);
      if (data && data.length > 0 && !selectedProject) setSelectedProject(data[0]);
    } catch (err) { toast.error("Failed to load projects"); }
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
    if (!user) return;

    const payload = {
      user_id: user.id,
      name: projectForm.name.trim(),
      total_budget: Number(projectForm.budget.replace(/\D/g, ""))
    };

    let resultData, error;
    if (editingProjectId) {
      const { data, error: err } = await supabase.from('projects').update(payload).eq('id', editingProjectId).select().single();
      resultData = data;
      error = err;
    } else {
      const { data, error: err } = await supabase.from('projects').insert(payload).select().single();
      resultData = data;
      error = err;
    }

    if (error) toast.error(error.message);
    else {
      setIsProjectModalOpen(false);
      setEditingProjectId(null);
      setProjectModalForm({ name: '', budget: '' });
      fetchProjects();
      setSelectedProject(resultData);
      toast.success(editingProjectId ? "Project updated" : "Project added successfully");
    }
  };

  const openEditProjectModal = () => {
    if (!selectedProject) return;
    setEditingProjectId(selectedProject.id);
    setProjectModalForm({
      name: selectedProject.name,
      budget: selectedProject.total_budget.toString()
    });
    setIsProjectModalOpen(true);
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
    if (!user) return;

    const payload = {
      user_id: user.id,
      project_id: selectedProject.id,
      item_name: itemForm.name.trim(),
      category: itemForm.category.trim(),
      quantity: Number(itemForm.qty),
      unit_price: Number(itemForm.price.toString().replace(/\D/g, "")),
      actual_cost: Number(itemForm.actual.toString().replace(/\D/g, "")),
      notes: itemForm.notes.trim()
    };

    let error;
    if (editingItemId) {
      const { error: err } = await supabase.from('project_items').update(payload).eq('id', editingItemId);
      error = err;
    } else {
      const { error: err } = await supabase.from('project_items').insert(payload);
      error = err;
    }

    if (error) toast.error(error.message);
    else {
      setIsItemModalOpen(false);
      setEditingItemId(null);
      setItemModalForm({ name: '', category: '', qty: '1', price: '', actual: '', notes: '' });
      fetchProjectItems(selectedProject.id);
      toast.success(editingItemId ? "Details updated" : "New entry added to project");
    }
  };

  const handleDeleteItemSingle = async (id: number) => {
    if (!confirm("Remove this entry?")) return;
    await supabase.from('project_items').delete().eq('id', id);
    fetchProjectItems(selectedProject.id);
    toast.success("Entry removed");
  };

  const handleDeleteItemBulk = async () => {
    if (!confirm(`Delete ${selectedIds.length} selected items?`)) return;
    await supabase.from('project_items').delete().in('id', selectedIds);
    setSelectedIds([]);
    fetchProjectItems(selectedProject.id);
    toast.success("Selected items deleted");
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    if (!confirm(`⚠️ ARE YOU SURE?\n\nThis will permanently delete the project "${selectedProject.name}" and all its records.`)) return;
    const { error } = await supabase.from('projects').delete().eq('id', selectedProject.id);
    if (!error) {
      const remaining = projects.filter(p => p.id !== selectedProject.id);
      setProjects(remaining);
      setSelectedProject(remaining.length > 0 ? remaining[0] : null);
      toast.success("Project deleted");
    }
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const templateData = [
      { 'Item Name': 'Sample Item', Category: 'Material', Quantity: 10, 'Unit Price': 50000, 'Actual Cost': 45000, Notes: 'Vendor: ABC' }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(templateData), 'ProjectDetails');
    XLSX.writeFile(wb, `Project_Template.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        if (!arrayBuffer) return;
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const payload = data.map(row => ({
          user_id: user.id,
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
        toast.success("Project data imported successfully!");
        fetchProjectItems(selectedProject.id);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err: any) {
        toast.error(err.message);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const totalActual = projectItems.reduce((acc, curr) => acc + (curr.actual_cost), 0);
  const totalEstimate = projectItems.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
  const sisaBudget = (selectedProject?.total_budget || 0) - totalActual;

  return (
    <div className="max-w-6xl mx-auto pb-20 text-black font-black uppercase">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tighter">My Projects</h1>
          <p className="text-slate-700 text-xs mt-1 font-bold tracking-tight">Project Budgeting & Expense Tracking</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          {selectedProject && (
            <>
              <button onClick={openEditProjectModal} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-slate-700 rounded-xl text-[10px] font-black hover:bg-slate-50 transition-all border border-slate-100 shadow-sm">
                <Edit3 size={14} /> Edit Project
              </button>
              <button onClick={handleDeleteProject} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black hover:bg-red-100 transition-all border border-red-100">
                <Trash2 size={14} /> Delete Project
              </button>
            </>
          )}
          <button onClick={() => { setEditingProjectId(null); setProjectModalForm({ name: '', budget: '' }); setIsProjectModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 rounded-xl text-[10px] font-black text-white hover:bg-blue-700 shadow-xl transition-all">
            <Plus size={14} /> New Project
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
        <div className="relative w-full max-w-sm">
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => {
              const p = projects.find(proj => proj.id.toString() === e.target.value);
              setSelectedProject(p);
            }}
            className="w-full bg-white border-2 border-slate-100 rounded-xl px-6 py-4 text-sm font-black text-black focus:border-blue-500 outline-none shadow-sm appearance-none cursor-pointer"
          >
            {projects.length === 0 ? <option value="">No Projects Found</option> : null}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <ChevronDown size={18} />
          </div>
        </div>
        <div className="hidden md:block w-px h-12 bg-slate-100 mx-2" />
        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Select a project to view detailed budgeting.</p>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 font-black uppercase tracking-widest animate-pulse">Syncing Project Data...</div>
      ) : selectedProject && (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Project Budget"
              value={selectedProject.total_budget}
              icon={<Building2 className="text-blue-600" />}
              sub="Initial Allotment"
              dark
            />
            <MetricCard
              title="Total Spent"
              value={totalActual}
              icon={<Activity className="text-emerald-600" />}
              sub="Realized Costs"
              progress={(totalActual / selectedProject.total_budget) * 100}
            />
            <MetricCard
              title="Funds Remaining"
              value={sisaBudget}
              icon={<BarChart3 className={sisaBudget >= 0 ? 'text-blue-600' : 'text-red-600'} />}
              sub="Buffer Left"
              color={sisaBudget >= 0 ? 'text-blue-600' : 'text-red-600'}
            />
          </div>

          <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm mb-8 flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-inner">
                <Download size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-black">Import Project Items</h3>
                <p className="text-[10px] text-slate-600 font-bold tracking-tight uppercase">Upload resource list from Excel.</p>
              </div>
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
              <button onClick={downloadTemplate} className="flex-1 lg:flex-none px-5 py-2.5 bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black hover:bg-slate-100 border border-slate-200 uppercase tracking-widest transition-all">Get Template</button>
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 lg:flex-none px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black hover:bg-slate-800 transition-all shadow-lg uppercase tracking-widest">Upload File</button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b-2 border-slate-50 flex flex-col md:flex-row justify-between items-center bg-slate-50/20 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                  <Target size={20} />
                </div>
                <h3 className="font-black text-black text-xl tracking-tighter">Detailed Breakdown</h3>
              </div>
              <button onClick={() => { setEditingItemId(null); setItemModalForm({ name: '', category: '', qty: '1', price: '', actual: '', notes: '' }); setIsItemModalOpen(true); }} className="w-full md:w-auto px-6 py-3 bg-black text-white rounded-xl text-[10px] font-black hover:bg-slate-800 transition-all shadow-lg uppercase tracking-widest flex items-center justify-center gap-2">
                <Plus size={14} /> Add Entry
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-50 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                    <th className="px-6 py-4 w-10 text-center">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" checked={selectedIds.length === projectItems.length && projectItems.length > 0} onChange={() => setSelectedIds(selectedIds.length === projectItems.length ? [] : projectItems.map(i => i.id))} />
                    </th>
                    <th className="px-6 py-4 tracking-widest">Item Details</th>
                    <th className="px-6 py-4 text-center tracking-widest">Category</th>
                    <th className="px-6 py-4 text-right tracking-widest">Estimate</th>
                    <th className="px-6 py-4 text-right tracking-widest">Actual</th>
                    <th className="px-6 py-4 text-center tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-50">
                  {projectItems.map((item) => (
                    <tr key={item.id} className={`group hover:bg-slate-50/30 transition-all ${selectedIds.includes(item.id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-6 py-4 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds(selectedIds.includes(item.id) ? selectedIds.filter(i => i !== item.id) : [...selectedIds, item.id])} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 rounded-full bg-blue-500 opacity-20 group-hover:opacity-100 transition-all" />
                          <div>
                            <p className="font-black text-black text-sm uppercase tracking-tight">{item.item_name}</p>
                            {item.notes && <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 line-clamp-1">{item.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[8px] font-black uppercase border border-slate-100 group-hover:bg-white">{item.category}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-slate-400 text-xs">{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(item.quantity * item.unit_price)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-black text-sm tracking-tight">{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(item.actual_cost)}</p>
                        <p className={`text-[8px] font-black uppercase tracking-tighter ${item.actual_cost > (item.quantity * item.unit_price) ? 'text-red-500' : 'text-emerald-500'}`}>
                          {item.actual_cost > (item.quantity * item.unit_price) ? 'Over' : 'Safe'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-1.5 sm:opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => openEditItemModal(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-blue-50 rounded-lg"><Edit3 size={16} /></button>
                          <button onClick={() => handleDeleteItemSingle(item.id)} className="p-2 text-slate-400 hover:text-red-600 transition-all border border-transparent hover:border-red-50 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {projectItems.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-32 text-slate-400 font-black uppercase tracking-widest text-xs">No project details available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isProjectModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProjectModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 overflow-hidden text-black font-black">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black uppercase tracking-tight">{editingProjectId ? 'Update Project' : 'Create Project'}</h2>
                <button onClick={() => { setIsProjectModalOpen(false); setEditingProjectId(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleProjectSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Project Name</label>
                  <input type="text" placeholder="e.g. Home Renovation" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={projectForm.name} onChange={(e) => setProjectModalForm({ ...projectForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Budget Limit</label>
                  <input type="text" placeholder="0" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={formatDisplayAmount(projectForm.budget)} onChange={(e) => setProjectModalForm({ ...projectForm, budget: e.target.value.replace(/\D/g, "") })} />
                </div>
                <button type="submit" className="w-full bg-black text-white font-black py-4 rounded-xl shadow-xl hover:bg-slate-800 transition-all mt-4 uppercase tracking-widest text-[10px]">Verify & Launch</button>
              </form>
            </motion.div>
          </div>
        )}

        {isItemModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsItemModalOpen(false); setEditingItemId(null); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 overflow-hidden text-black font-black max-h-[95vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black uppercase tracking-tight">{editingItemId ? 'Edit Details' : 'Add Detail'}</h2>
                <button onClick={() => { setIsItemModalOpen(false); setEditingItemId(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleItemSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Item Name</label>
                  <input type="text" placeholder="e.g. New Couch" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={itemForm.name} onChange={(e) => setItemModalForm({ ...itemForm, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Category</label>
                    <input type="text" placeholder="Furniture" className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-3.5 text-xs font-black uppercase shadow-sm outline-none focus:border-blue-500" value={itemForm.category} onChange={(e) => setItemModalForm({ ...itemForm, category: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Quantity</label>
                    <input type="number" required min="1" className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-3.5 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={itemForm.qty} onChange={(e) => setItemModalForm({ ...itemForm, qty: Math.max(1, parseInt(e.target.value) || 1).toString() })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Estimate</label>
                    <input type="text" placeholder="0" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-3.5 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={formatDisplayAmount(itemForm.price)} onChange={(e) => setItemModalForm({ ...itemForm, price: e.target.value.replace(/\D/g, "") })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Actual Cost</label>
                    <input type="text" placeholder="0" className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-3.5 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={formatDisplayAmount(itemForm.actual)} onChange={(e) => setItemModalForm({ ...itemForm, actual: e.target.value.replace(/\D/g, "") })} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Notes</label>
                  <textarea placeholder="e.g. Bought from IKEA..." className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-3 text-xs font-bold shadow-sm outline-none focus:border-blue-500 min-h-[80px]" value={itemForm.notes} onChange={(e) => setItemModalForm({ ...itemForm, notes: e.target.value })} />
                </div>
                <button type="submit" className="w-full bg-black text-white font-black py-4 rounded-xl shadow-xl hover:bg-slate-800 transition-all mt-4 uppercase tracking-widest text-[10px]">Save Details</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[130] bg-black text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-6 border border-white/10 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-black"><span className="text-white">{selectedIds.length}</span> selected</div>
            <button onClick={handleDeleteItemBulk} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-black text-[10px] uppercase tracking-widest transition-colors"><Trash2 size={16} /> Delete</button>
            <button onClick={() => setSelectedIds([])} className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({ title, value, icon, sub, color = "text-black", dark = false, progress }: any) {
  return (
    <motion.div whileHover={{ y: -5 }} className={`${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-50'} p-6 rounded-2xl border-2 shadow-xl relative overflow-hidden group transition-all duration-500`}>
      <div className="flex items-center justify-between mb-8">
        <div className={`p-3 ${dark ? 'bg-slate-800 text-blue-400' : 'bg-slate-50'} rounded-xl group-hover:scale-110 transition-all duration-500`}>{icon}</div>
        <div className="text-right">
          <p className={`text-[9px] font-black uppercase tracking-widest ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{title}</p>
          <p className={`text-[8px] font-black uppercase tracking-widest ${dark ? 'text-slate-600' : 'text-slate-300'}`}>{sub}</p>
        </div>
      </div>
      <div>
        <p className={`text-2xl md:text-3xl font-black ${dark ? 'text-white' : color} tracking-tighter`}>
          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)}
        </p>
        {progress !== undefined && (
          <div className="mt-8 space-y-2">
            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
              <span>Used</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                className={`h-full ${progress > 100 ? 'bg-red-500' : 'bg-emerald-500'}`}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}