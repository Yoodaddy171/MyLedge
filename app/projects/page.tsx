'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDisplayAmount } from '@/lib/utils';
import {
  Building2,
  Target,
  Plus,
  Download,
  X,
  Trash2,
  Edit3,
  ChevronDown,
  Activity,
  BarChart3,
  Calendar,
  Wallet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectTransactions, setProjectTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<any[]>([]);
  
  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTrxModalOpen, setIsTrxModalOpen] = useState(false);
  
  // Forms
  const [projectForm, setProjectForm] = useState({
    name: '', 
    description: '',
    budget: '', 
    status: 'planning', 
    deadline: '' 
  });
  
  const [trxForm, setTrxForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    wallet_id: '',
    notes: ''
  });

  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);

  useBodyScrollLock(isProjectModalOpen || isTrxModalOpen);

  useEffect(() => {
    fetchProjects();
    fetchWallets();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectTransactions(selectedProject.id);
    }
  }, [selectedProject]);


  async function fetchWallets() {
    const { data } = await supabase.from('wallets').select('id, name').eq('is_active', true);
    setWallets(data || []);
  }

  async function fetchProjects() {
    try {
      setLoading(true);
      // Use the view for summary stats
      const { data, error } = await supabase
        .from('project_summary_view')
        .select('*')
        .order('last_transaction_date', { ascending: false });
        
      if (error) throw error;
      setProjects(data || []);
      
      // Auto-select first project if none selected
      if (data && data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      } else if (selectedProject) {
        // Refresh selected project data
        const updated = data?.find(p => p.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
      }
    } catch (err) { 
      toast.error("Failed to load projects"); 
    } finally { 
      setLoading(false); 
    } 
  }

  async function fetchProjectTransactions(projectId: number) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        wallet:wallets(name)
      `)
      .eq('project_id', projectId)
      .eq('type', 'expense')
      .order('date', { ascending: false });
      
    if (!error) setProjectTransactions(data || []);
  }

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      name: projectForm.name.trim(),
      description: projectForm.description,
      total_budget: Number(projectForm.budget.replace(/\D/g, "")),
      status: projectForm.status,
      deadline: projectForm.deadline || null
    };

    let error;
    if (editingProjectId) {
      const { error: err } = await supabase.from('projects').update(payload).eq('id', editingProjectId);
      error = err;
    } else {
      const { error: err } = await supabase.from('projects').insert(payload);
      error = err;
    }

    if (error) toast.error(error.message);
    else {
      setIsProjectModalOpen(false);
      setEditingProjectId(null);
      setProjectForm({ name: '', description: '', budget: '', status: 'planning', deadline: '' });
      fetchProjects();
      toast.success(editingProjectId ? "Project updated" : "Project created");
    }
  };

  const handleTrxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !selectedProject) return;

    const payload = {
      user_id: user.id,
      project_id: selectedProject.id,
      type: 'expense', // Projects tracks expenses
      amount: Number(trxForm.amount.replace(/\D/g, "")),
      description: trxForm.description,
      date: trxForm.date,
      wallet_id: trxForm.wallet_id ? Number(trxForm.wallet_id) : null,
      notes: trxForm.notes
    };

    const { error } = await supabase.from('transactions').insert(payload);

    if (error) toast.error(error.message);
    else {
      setIsTrxModalOpen(false);
      setTrxForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0], wallet_id: '', notes: '' });
      fetchProjectTransactions(selectedProject.id);
      fetchProjects(); // Refresh summary
      toast.success("Expense recorded");
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    if (!confirm(`⚠️ DELETE PROJECT?\n\nThis will delete the project "${selectedProject.name}".\nLinked transactions will NOT be deleted, but will be unlinked.`)) return;
    
    const { error } = await supabase.from('projects').delete().eq('id', selectedProject.id);
    if (!error) {
      toast.success("Project deleted");
      setSelectedProject(null);
      fetchProjects();
    } else {
      toast.error(error.message);
    }
  };

  const openEditProjectModal = () => {
    if (!selectedProject) return;
    setEditingProjectId(selectedProject.id);
    setProjectForm({
      name: selectedProject.name,
      description: selectedProject.description || '',
      budget: selectedProject.total_budget.toString(),
      status: selectedProject.status || 'planning',
      deadline: selectedProject.deadline || ''
    });
    setIsProjectModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 text-black font-black uppercase">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tighter">My Projects</h1>
          <p className="text-slate-700 text-xs mt-1 font-bold tracking-tight">V2 Budget Tracking & Analytics</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          {selectedProject && (
            <>
              <button onClick={openEditProjectModal} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-slate-700 rounded-xl text-[10px] font-black hover:bg-slate-50 transition-all border border-slate-100 shadow-sm">
                <Edit3 size={14} /> Edit
              </button>
              <button onClick={handleDeleteProject} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black hover:bg-red-100 transition-all border border-red-100">
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}
          <button onClick={() => { setEditingProjectId(null); setProjectForm({ name: '', description: '', budget: '', status: 'planning', deadline: '' }); setIsProjectModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 rounded-xl text-[10px] font-black text-white hover:bg-blue-700 shadow-xl transition-all">
            <Plus size={14} /> New Project
          </button>
        </div>
      </header>

      {/* Project Selector */}
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
              <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
            ))}
          </select>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <ChevronDown size={18} />
          </div>
        </div>
        <div className="hidden md:block w-px h-12 bg-slate-100 mx-2" />
        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
          {selectedProject?.description || 'Select a project to view details.'}
        </p>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 font-black uppercase tracking-widest animate-pulse">Syncing V2 Data...</div>
      ) : selectedProject && (
        <div className="space-y-12">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Total Budget"
              value={selectedProject.total_budget}
              icon={<Building2 className="text-blue-600" />}
              sub="Allocation"
              dark
            />
            <MetricCard
              title="Actual Spent"
              value={selectedProject.actual_spent}
              icon={<Activity className="text-emerald-600" />}
              sub="Realized"
              progress={selectedProject.budget_percentage_used}
            />
            <MetricCard
              title="Remaining"
              value={selectedProject.remaining_budget}
              icon={<BarChart3 className={selectedProject.remaining_budget >= 0 ? 'text-blue-600' : 'text-red-600'} />}
              sub="Available Funds"
              color={selectedProject.remaining_budget >= 0 ? 'text-blue-600' : 'text-red-600'}
            />
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b-2 border-slate-50 flex flex-col md:flex-row justify-between items-center bg-slate-50/20 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="font-black text-black text-xl tracking-tighter">Spending Log</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {projectTransactions.length} Transactions
                  </p>
                </div>
              </div>
              <button onClick={() => setIsTrxModalOpen(true)} className="w-full md:w-auto px-6 py-3 bg-black text-white rounded-xl text-[10px] font-black hover:bg-slate-800 transition-all shadow-lg uppercase tracking-widest flex items-center justify-center gap-2">
                <Plus size={14} /> Record Expense
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-50 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                    <th className="px-6 py-4 tracking-widest">Date</th>
                    <th className="px-6 py-4 tracking-widest">Description</th>
                    <th className="px-6 py-4 tracking-widest">Source</th>
                    <th className="px-6 py-4 text-right tracking-widest">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-50">
                  {projectTransactions.map((trx) => (
                    <tr key={trx.id} className="group hover:bg-slate-50/30 transition-all">
                      <td className="px-6 py-4">
                         <span className="text-[10px] font-bold text-slate-500">
                           {new Date(trx.date).toLocaleDateString()}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-black text-black text-sm uppercase tracking-tight">{trx.description}</p>
                        {trx.notes && <p className="text-[9px] text-slate-400 font-bold uppercase line-clamp-1">{trx.notes}</p>}
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                            <Wallet size={12} className="text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase">{trx.wallet?.name || 'Unknown'}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-red-500 text-sm tracking-tight">
                          - {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(trx.amount)}
                        </p>
                      </td>
                    </tr>
                  ))}
                  {projectTransactions.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-20 text-slate-400 font-black uppercase tracking-widest text-xs">No spending recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Project Modal */}
      <AnimatePresence>
        {isProjectModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProjectModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 overflow-hidden text-black font-black">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black uppercase tracking-tight">{editingProjectId ? 'Update Project' : 'New Project'}</h2>
                <button onClick={() => setIsProjectModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleProjectSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Project Name</label>
                  <input type="text" placeholder="e.g. Office Renovation" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Description</label>
                  <textarea className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-xs font-bold shadow-sm outline-none focus:border-blue-500 resize-none h-20" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Budget</label>
                    <input type="text" placeholder="0" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={formatDisplayAmount(projectForm.budget)} onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value.replace(/\D/g, "") })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Status</label>
                    <select className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-xs font-black uppercase shadow-sm outline-none focus:border-blue-500" value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value }) }>
                      <option value="planning">Planning</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Deadline (Optional)</label>
                  <input type="date" className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={projectForm.deadline} onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })} />
                </div>
                <button type="submit" className="w-full bg-black text-white font-black py-4 rounded-xl shadow-xl hover:bg-slate-800 transition-all mt-4 uppercase tracking-widest text-[10px]">Save Project</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Modal */}
      <AnimatePresence>
        {isTrxModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTrxModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 overflow-hidden text-black font-black">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black uppercase tracking-tight">Record Expense</h2>
                <button onClick={() => setIsTrxModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleTrxSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Description</label>
                  <input type="text" placeholder="e.g. Buying Materials" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={trxForm.description} onChange={(e) => setTrxForm({ ...trxForm, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Date</label>
                     <input type="date" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={trxForm.date} onChange={(e) => setTrxForm({ ...trxForm, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Amount</label>
                    <input type="text" placeholder="0" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={formatDisplayAmount(trxForm.amount)} onChange={(e) => setTrxForm({ ...trxForm, amount: e.target.value.replace(/\D/g, "") })} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Pay With (Wallet)</label>
                  <select required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-xs font-black uppercase shadow-sm outline-none focus:border-blue-500" value={trxForm.wallet_id} onChange={(e) => setTrxForm({ ...trxForm, wallet_id: e.target.value }) }>
                    <option value="">Select Wallet...</option>
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Notes</label>
                  <textarea className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-xs font-bold shadow-sm outline-none focus:border-blue-500 resize-none h-20" value={trxForm.notes} onChange={(e) => setTrxForm({ ...trxForm, notes: e.target.value })} />
                </div>
                <button type="submit" className="w-full bg-red-600 text-white font-black py-4 rounded-xl shadow-xl hover:bg-red-700 transition-all mt-4 uppercase tracking-widest text-[10px]">Record Transaction</button>
              </form>
            </motion.div>
          </div>
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
