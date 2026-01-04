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
    <div className="max-w-7xl mx-auto pb-20 text-black font-black">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4">
            <Briefcase className="text-blue-600" /> Work Hub
          </h1>
          <p className="text-slate-700 font-bold mt-2 uppercase text-[10px] tracking-[0.2em] opacity-50">Professional Productivity</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({entity:'', doc_number:'', type:'', status:'Pending', notes:''}); setIsModalOpen(true); }} className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
          <Plus size={16} /> New Submission
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 mb-10 border-b border-slate-200">
        <button onClick={() => setActiveTab('submissions')} className={`pb-4 px-2 text-sm transition-all relative ${activeTab === 'submissions' ? 'text-black' : 'text-slate-400'}`}>
            Submission Monitoring
            {activeTab === 'submissions' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 w-full h-1 bg-black" />}
        </button>
        <button onClick={() => setActiveTab('jobdesk')} className={`pb-4 px-2 text-sm transition-all relative ${activeTab === 'jobdesk' ? 'text-black' : 'text-slate-400'}`}>
            Jobdesk & KPIs
            {activeTab === 'jobdesk' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 w-full h-1 bg-black" />}
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 overflow-hidden text-black font-black">
              <h2 className="text-2xl font-black mb-8">{editingId ? 'Edit Submission' : 'New Submission'}</h2>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Entity / PT</label>
                  <input type="text" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none" value={formData.entity} onChange={(e) => setFormData({...formData, entity: e.target.value})} />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Document ID</label>
                  <input type="text" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none" value={formData.doc_number} onChange={(e) => setFormData({...formData, doc_number: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-black">
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Type</label>
                    <input type="text" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Status</label>
                    <select className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-black text-white font-black py-5 rounded-[1.5rem] shadow-lg hover:bg-slate-800 transition-all mt-4 uppercase tracking-widest text-xs">Save Submission</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeTab === 'submissions' ? (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 text-black">
                <StatCard label="Active Submissions" val={submissions.filter(s => s.status !== 'Done').length} icon={<Clock className="text-blue-600" />} />
                <StatCard label="Completed Today" val={submissions.filter(s => s.status === 'Done').length} icon={<CheckCircle2 className="text-emerald-600" />} />
                <StatCard label="Blocked / Issues" val={submissions.filter(s => s.status === 'Rejected').length} icon={<AlertCircle className="text-red-600" />} />
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                            <th className="px-10 py-6">Entity & Doc</th>
                            <th className="px-10 py-6">Type</th>
                            <th className="px-10 py-6 text-center">Status</th>
                            <th className="px-10 py-6 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-black">
                        {submissions.map((sub) => (
                            <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-10 py-8 font-black">
                                    <p className="text-base text-black tracking-tight">{sub.entity}</p>
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">ID: {sub.doc_number || 'N/A'}</p>
                                </td>
                                <td className="px-10 py-8 font-bold text-slate-600">{sub.type}</td>
                                <td className="px-10 py-8">
                                    <div className="flex justify-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(sub.status)}`}>
                                            {sub.status}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => openEditModal(sub)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl border border-transparent hover:border-blue-100"><Edit3 size={18} /></button>
                                        <button onClick={() => handleDelete(sub.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl border border-transparent hover:border-red-100"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      ) : (
        <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400 font-black uppercase tracking-widest text-xs">
            Jobdesk & KPI Integration Coming Soon.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, val, icon }: any) {
    return (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6">
            <div className="p-4 bg-slate-50 rounded-[1.5rem]">{icon}</div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-3xl font-black text-black">{val}</p>
            </div>
        </div>
    );
}
