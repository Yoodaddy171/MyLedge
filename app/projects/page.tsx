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
      const { data, error } = await supabase
        .from('project_summary_view')
        .select('*')
        .order('last_transaction_date', { ascending: false });
        
      if (error) throw error;
      setProjects(data || []);
      
      if (data && data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      } else if (selectedProject) {
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
        wallets!fk_transactions_wallet(name)
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
      type: 'expense',
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
      fetchProjects();
      toast.success("Expense recorded");
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    if (!confirm(`Delete project "${selectedProject.name}"? Linked transactions will be unlinked.`)) return;
    
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
    <div className="max-w-6xl mx-auto pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Projects</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">Budget tracking & analytics</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {selectedProject && (
            <>
              <button onClick={openEditProjectModal} className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-xl text-[10px] md:text-xs font-bold hover:bg-slate-50 border border-slate-200 shadow-sm shrink-0 uppercase tracking-widest">
                <Edit3 size={14} /> Edit
              </button>
              <button onClick={handleDeleteProject} className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] md:text-xs font-bold hover:bg-red-100 border border-red-100 shrink-0 uppercase tracking-widest">
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}
          <button onClick={() => { setEditingProjectId(null); setProjectForm({ name: '', description: '', budget: '', status: 'planning', deadline: '' }); setIsProjectModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] md:text-xs font-bold hover:bg-slate-800 shadow-lg shrink-0 uppercase tracking-widest active:scale-95 transition-all">
            <Plus size={16} /> New Project
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row items-center gap-4 mb-8 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative w-full max-w-sm">
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => {
              const p = projects.find(proj => proj.id.toString() === e.target.value);
              setSelectedProject(p);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-100 outline-none appearance-none cursor-pointer"
          >
            {projects.length === 0 ? <option value="">No Projects Found</option> : null}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.status.replace('_', ' ')})</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <ChevronDown size={16} />
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-slate-100" />
        <p className="text-[10px] md:text-xs text-slate-500 font-bold px-2 uppercase tracking-wide">
          {selectedProject?.description || 'Select a project to view details.'}
        </p>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">Syncing project data...</div>
      ) : selectedProject && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <MetricCard title="Budget" value={selectedProject.total_budget} icon={<Building2 size={16} />} sub="Total Allocation" dark />
            <MetricCard title="Spent" value={selectedProject.actual_spent} icon={<Activity size={16} />} sub="Realized" progress={selectedProject.budget_percentage_used} />
            <div className="col-span-2 md:col-span-1">
                <MetricCard title="Balance" value={selectedProject.remaining_budget} icon={<BarChart3 size={16} />} sub="Available Funds" color={selectedProject.remaining_budget >= 0 ? 'text-blue-600' : 'text-red-600'} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="p-4 md:p-5 border-b border-slate-50 flex flex-wrap justify-between items-center bg-slate-50/30 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-100 text-blue-600 shadow-sm"><Target size={16} /></div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Spending Log</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{projectTransactions.length} items</p>
                </div>
              </div>
              <button onClick={() => setIsTrxModalOpen(true)} className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-md active:scale-95">
                <Plus size={14} /> Record Expense
              </button>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Source</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {projectTransactions.map((trx) => (
                    <tr key={trx.id} className="group hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                         {new Date(trx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">{trx.description}</p>
                        {trx.notes && <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px] font-medium">{trx.notes}</p>}
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                            <Wallet size={12} className="text-slate-300" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{trx.wallets?.name || 'Unknown'}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-red-500 text-sm">
                          - {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(trx.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {projectTransactions.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-16 text-slate-400 text-[10px] font-bold uppercase tracking-widest">No spending recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals remain structurally same, added responsive padding and text-black */}
      <AnimatePresence>
        {isProjectModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProjectModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl p-5 md:p-6 overflow-hidden text-black font-black">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-900">{editingProjectId ? 'Update Project' : 'New Project'}</h2>
                <button onClick={() => setIsProjectModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleProjectSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Project Name</label>
                  <input type="text" placeholder="e.g. Office Renovation" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none text-slate-900" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Description</label>
                  <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-100 outline-none resize-none h-20 text-slate-900" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Budget</label>
                    <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none text-slate-900" value={formatDisplayAmount(projectForm.budget)} onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value.replace(/\D/g, "") })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Status</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-100 outline-none text-slate-900" value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value }) }>
                      <option value="planning">Planning</option><option value="in_progress">In Progress</option><option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Deadline</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none text-slate-900" value={projectForm.deadline} onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })} />
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all mt-2 uppercase tracking-widest active:scale-[0.98] shadow-lg">Save Project Record</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTrxModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTrxModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl p-5 md:p-6 overflow-hidden text-black font-black">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-900">Record Expense</h2>
                <button onClick={() => setIsTrxModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleTrxSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Description</label>
                  <input type="text" placeholder="Note..." required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none text-slate-900" value={trxForm.description} onChange={(e) => setTrxForm({ ...trxForm, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Date</label>
                     <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none text-slate-900" value={trxForm.date} onChange={(e) => setTrxForm({ ...trxForm, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Amount</label>
                    <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none text-slate-900" value={formatDisplayAmount(trxForm.amount)} onChange={(e) => setTrxForm({ ...trxForm, amount: e.target.value.replace(/\D/g, "") })} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Pay With</label>
                  <select required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-100 outline-none text-slate-900" value={trxForm.wallet_id} onChange={(e) => setTrxForm({ ...trxForm, wallet_id: e.target.value }) }>
                    <option value="">Select Wallet...</option>
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full bg-red-600 text-white py-3.5 rounded-xl text-xs font-bold hover:bg-red-700 transition-all mt-2 uppercase tracking-widest active:scale-[0.98] shadow-lg">Save Record</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({ title, value, icon, sub, color = "text-slate-900", dark = false, progress }: any) {
  return (
    <div className={`${dark ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-white border-slate-100 shadow-sm'} p-4 md:p-5 rounded-2xl border relative overflow-hidden group transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className={`p-1.5 md:p-2 ${dark ? 'bg-slate-800 text-blue-400' : 'bg-slate-50'} rounded-lg group-hover:scale-110 transition-transform`}>{icon}</div>
        <div className="text-right">
          <p className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{title}</p>
          <p className={`text-[9px] md:text-[10px] font-bold ${dark ? 'text-slate-600' : 'text-slate-400'}`}>{sub}</p>
        </div>
      </div>
      <div>
        <p className={`text-sm md:text-2xl font-bold ${dark ? 'text-white' : color} tracking-tight truncate`}>
          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)}
        </p>
        {progress !== undefined && (
          <div className="mt-3 md:mt-4 space-y-1">
            <div className="flex justify-between text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Used</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className={`w-full h-1 md:h-1.5 rounded-full overflow-hidden ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }} className={`h-full ${progress > 100 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
