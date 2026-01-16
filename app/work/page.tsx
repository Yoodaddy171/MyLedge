'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Briefcase, 
  FileText, 
  Plus, 
  Download, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Trash2,
  Edit3,
  Search,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function WorkHubPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('submissions'); // submissions, jobdesk
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    entity: '',
    doc_number: '',
    type: '',
    status: 'Pending',
    notes: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: sub } = await supabase.from('submissions').select('*').order('created_at', { ascending: false });
      const { data: job } = await supabase.from('job_kpis').select('*');
      setSubmissions(sub || []);
      setKpis(job || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
        user_id: user.id,
        ...formData
    };

    let error;
    if (editingId) {
        const { error: err } = await supabase.from('submissions').update(payload).eq('id', editingId);
        error = err;
    } else {
        const { error: err } = await supabase.from('submissions').insert(payload);
        error = err;
    }

    if (error) alert(error.message);
    else {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ entity: '', doc_number: '', type: '', status: 'Pending', notes: '' });
        fetchData();
    }
  };

  const openEditModal = (sub: any) => {
    setEditingId(sub.id);
    setFormData({
      entity: sub.entity,
      doc_number: sub.doc_number || '',
      type: sub.type || '',
      status: sub.status || 'Pending',
      notes: sub.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this submission record?")) return;
    await supabase.from('submissions').delete().eq('id', id);
    fetchData();
  };

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
        case 'done': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        case 'pending': return 'bg-amber-50 text-amber-600 border-amber-100';
        case 'rejected': return 'bg-red-50 text-red-600 border-red-100';
        default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-10 text-black font-black">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <Briefcase className="text-blue-600" size={28} /> Work Hub
          </h1>
          <p className="text-slate-700 font-bold mt-1 uppercase text-[9px] tracking-[0.2em] opacity-50">Professional Productivity</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({entity:'', doc_number:'', type:'', status:'Pending', notes:''}); setIsModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
          <Plus size={14} /> New Submission
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-slate-200">
        <button onClick={() => setActiveTab('submissions')} className={`pb-3 px-1 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'submissions' ? 'text-black' : 'text-slate-400'}`}>
            Submissions
            {activeTab === 'submissions' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 w-full h-0.5 bg-black" />}
        </button>
        <button onClick={() => setActiveTab('jobdesk')} className={`pb-3 px-1 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'jobdesk' ? 'text-black' : 'text-slate-400'}`}>
            Jobdesk & KPIs
            {activeTab === 'jobdesk' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 w-full h-0.5 bg-black" />}
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 overflow-hidden text-black font-black">
              <h2 className="text-xl font-black mb-8 uppercase tracking-tight">{editingId ? 'Edit Submission' : 'New Submission'}</h2>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Entity / PT</label>
                  <input type="text" placeholder="e.g. PT Maju Bersama" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-3.5 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={formData.entity} onChange={(e) => setFormData({...formData, entity: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Document ID</label>
                  <input type="text" placeholder="e.g. DOC-2024-001" className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-3.5 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={formData.doc_number} onChange={(e) => setFormData({...formData, doc_number: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Type</label>
                    <input type="text" placeholder="Tax / Permit" className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-3.5 text-xs font-black uppercase shadow-sm outline-none focus:border-blue-500" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Status</label>
                    <select className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-black uppercase shadow-sm" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-black text-white font-black py-4 rounded-xl shadow-xl hover:bg-slate-800 transition-all mt-4 uppercase tracking-widest text-[10px]">Save Details</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeTab === 'submissions' ? (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-black">
                <StatCard label="Active" val={submissions.filter(s => s.status !== 'Done').length} icon={<Clock className="text-blue-600" size={20} />} />
                <StatCard label="Completed" val={submissions.filter(s => s.status === 'Done').length} icon={<CheckCircle2 className="text-emerald-600" size={20} />} />
                <StatCard label="Issues" val={submissions.filter(s => s.status === 'Rejected').length} icon={<AlertCircle className="text-red-600" size={20} />} />
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-50 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                            <th className="px-8 py-5">Entity & Document Details</th>
                            <th className="px-8 py-5">Type</th>
                            <th className="px-8 py-5 text-center">Status</th>
                            <th className="px-8 py-5 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-slate-50 text-black">
                        {submissions.map((sub) => (
                            <tr key={sub.id} className="hover:bg-slate-50/50 transition-all group">
                                <td className="px-8 py-5">
                                    <p className="text-sm font-black text-black tracking-tight">{sub.entity}</p>
                                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-0.5">ID: {sub.doc_number || 'N/A'}</p>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{sub.type}</span>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex justify-center">
                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusColor(sub.status)}`}>
                                            {sub.status}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex justify-center gap-1.5 sm:opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => openEditModal(sub)} className="p-2 text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-blue-50 rounded-lg"><Edit3 size={16} /></button>
                                        <button onClick={() => handleDelete(sub.id)} className="p-2 text-slate-400 hover:text-red-600 transition-all border border-transparent hover:border-red-50 rounded-lg"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      ) : (
        <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100 text-slate-400 font-black uppercase tracking-widest text-[10px]">
            KPI Integration Coming Soon.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, val, icon }: any) {
    return (
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-50 shadow-sm flex items-center gap-5 transition-all hover:border-blue-50 group">
            <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-all">{icon}</div>
            <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-2xl font-black text-black tracking-tighter">{val}</p>
            </div>
        </div>
    );
}
