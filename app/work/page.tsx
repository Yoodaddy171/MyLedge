'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Briefcase,
  Plus,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Edit3,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';
import type { Submission } from '@/contexts/GlobalDataContext';

export default function WorkHubPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('submissions');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ entity: '', doc_number: '', type: '', status: 'Pending', notes: '' });

  useBodyScrollLock(isModalOpen);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      setLoading(true);
      // CRITICAL: Get user first and filter by user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSubmissions([]);
        setLoading(false);
        return;
      }
      const { data: sub } = await supabase.from('submissions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setSubmissions(sub || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { user_id: user.id, ...formData };
    if (editingId) await supabase.from('submissions').update(payload).eq('id', editingId);
    else await supabase.from('submissions').insert(payload);
    setIsModalOpen(false); setEditingId(null);
    setFormData({ entity: '', doc_number: '', type: '', status: 'Pending', notes: '' });
    fetchData();
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-blue-600 flex items-center gap-2">
            <Briefcase className="text-blue-600" size={24} /> Work Hub
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5 font-bold uppercase tracking-widest">Professional Logistics</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ entity: '', doc_number: '', type: '', status: 'Pending', notes: '' }); setIsModalOpen(true); }} className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest">
          <Plus size={16} /> New Entry
        </button>
      </header>

      <div className="flex gap-6 mb-8 border-b border-slate-100 overflow-x-auto no-scrollbar">
        <TabButton label="Submissions" active={activeTab === 'submissions'} onClick={() => setActiveTab('submissions')} />
        <TabButton label="Jobdesk & KPI" active={activeTab === 'jobdesk'} onClick={() => setActiveTab('jobdesk')} />
      </div>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-[10px] font-bold text-slate-400 uppercase tracking-widest">Syncing work hub...</div>
      ) : activeTab === 'submissions' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <MiniStat label="Active" val={submissions.filter(s => s.status !== 'Done').length} icon={<Clock className="text-blue-500" size={16} />} />
            <MiniStat label="Done" val={submissions.filter(s => s.status === 'Done').length} icon={<CheckCircle2 className="text-emerald-500" size={16} />} />
            <div className="col-span-2 md:col-span-1">
              <MiniStat label="Alerts" val={submissions.filter(s => s.status === 'Rejected').length} icon={<AlertCircle className="text-red-500" size={16} />} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-3">Entity & Document</th>
                    <th className="px-6 py-3">Reference Type</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{sub.entity}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {sub.doc_number || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-slate-300" />
                          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{sub.type || 'General'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold border uppercase tracking-tighter ${sub.status === 'Done' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingId(sub.id); setFormData({ entity: sub.entity, doc_number: sub.doc_number || '', type: sub.type || '', status: sub.status, notes: sub.notes || '' }); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"><Edit3 size={14} /></button>
                          <button onClick={() => { if (confirm('Delete?')) supabase.from('submissions').delete().eq('id', sub.id).then(fetchData); }} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {submissions.length === 0 && (
                    <tr><td colSpan={4} className="py-16 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No logistics recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          Performance metrics coming soon.
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl p-5 md:p-6 overflow-hidden text-black font-black">
              <h2 className="text-lg font-bold mb-6 text-slate-900">{editingId ? 'Edit Entry' : 'New Submission'}</h2>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Entity Name</label>
                  <input type="text" placeholder="e.g. PT Maju Bersama" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 transition-all" value={formData.entity} onChange={(e) => setFormData({ ...formData, entity: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Document Ref</label>
                  <input type="text" placeholder="e.g. TAX-2025-001" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 transition-all" value={formData.doc_number} onChange={(e) => setFormData({ ...formData, doc_number: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Category</label>
                    <input type="text" placeholder="Permit / Tax" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 transition-all" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Status</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                      <option value="Pending">Pending</option><option value="In Progress">In Progress</option><option value="Done">Done</option><option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors mt-2 uppercase tracking-widest active:scale-[0.98] shadow-lg">Save Logistic Record</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap px-1 ${active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
      {label}
      {active && <motion.div layoutId="work-tab" className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]" />}
    </button>
  );
}

function MiniStat({ label, val, icon }: any) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center md:items-center gap-3 md:gap-4 transition-all hover:border-blue-100 group">
      <div className="p-2 bg-slate-50 rounded-lg group-hover:scale-110 transition-transform">{icon}</div>
      <div className="text-center md:text-left min-w-0">
        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-sm md:text-xl font-bold text-slate-900 leading-none truncate">{val}</p>
      </div>
    </div>
  );
}
