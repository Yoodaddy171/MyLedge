'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Search, CheckCircle2, Clock, Calendar, Download, Trash2, X, Edit3
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const [formData, setFormData] = useState({ title: '', category: 'Work', priority: 'medium', deadline: '', notes: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchTasks(); }, []);

  async function fetchTasks() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('tasks').select('*').order('status', { ascending: true }).order('deadline', { ascending: true });
      if (error) throw error;
      setTasks(data || []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  }

  const handleDeleteSingle = async (id: number) => {
    if (!confirm("Delete task?")) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) { toast.success("Task removed"); fetchTasks(); }
    else toast.error(error.message);
  };

  const handleDeleteBulk = async () => {
    if (!confirm(`Delete ${selectedIds.length} tasks?`)) return;
    const { error } = await supabase.from('tasks').delete().in('id', selectedIds);
    if (!error) { toast.success("Tasks deleted"); setSelectedIds([]); fetchTasks(); }
    else toast.error(error.message);
  };

  const openEditModal = (task: any) => {
    setEditingId(task.id);
    setFormData({ title: task.title, category: task.category || 'Work', priority: task.priority, deadline: task.deadline ? task.deadline.split('T')[0] : '', notes: task.notes || '' });
    setIsModalOpen(true);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { user_id: user.id, title: formData.title, category: formData.category, priority: formData.priority, deadline: formData.deadline || null, notes: formData.notes, status: editingId ? undefined : 'todo' };
    const { error } = editingId ? await supabase.from('tasks').update(payload).eq('id', editingId) : await supabase.from('tasks').insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Task saved"); setIsModalOpen(false); setEditingId(null); setFormData({ title: '', category: 'Work', priority: 'medium', deadline: '', notes: '' }); fetchTasks(); }
  };

  const toggleStatus = async (task: any) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'todo') return t.status !== 'done';
    if (filter === 'done') return t.status === 'done';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto pb-20 text-black font-black">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 text-black">
        <div><h1 className="text-3xl md:text-4xl font-black text-black tracking-tighter text-black">Task Manager</h1><p className="text-slate-700 text-sm mt-1 font-bold text-black">Track productivity.</p></div>
        <button onClick={() => { setEditingId(null); setFormData({title:'', category:'Work', priority:'medium', deadline:'', notes:''}); setIsModalOpen(true); }} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 rounded-2xl text-xs font-black text-white hover:bg-blue-700 shadow-xl transition-all uppercase tracking-widest"><Plus size={18} /> New Task</button>
      </header>

      <AnimatePresence>{isModalOpen && (<div className="fixed inset-0 z-[110] flex items-center justify-center p-4 text-black"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" /><motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[2rem] md:rounded-[2.5rem] shadow-2xl p-6 md:p-10 overflow-hidden text-black font-black max-h-[90vh] overflow-y-auto text-black"><div className="flex justify-between items-center mb-8 text-black"><h2 className="text-xl md:text-2xl font-black text-black">{editingId ? 'Edit Task' : 'Create Task'}</h2><button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-black"><X size={20} /></button></div><form onSubmit={handleManualSubmit} className="space-y-6 text-black"><div><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 mb-2 block tracking-widest text-black">Title</label><input type="text" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 shadow-sm text-black" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} /></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-black"><div className="text-black"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 mb-2 block tracking-widest text-black">Priority</label><select className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 text-black" value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div><div className="text-black"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 mb-2 block tracking-widest text-black">Deadline</label><input type="date" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 shadow-sm text-black" value={formData.deadline} onChange={(e) => setFormData({...formData, deadline: e.target.value})} /></div></div><button type="submit" className="w-full bg-black text-white font-black py-5 rounded-[1.5rem] shadow-lg hover:bg-slate-800 transition-all mt-4 uppercase tracking-widest text-[10px]">Save Task</button></form></motion.div></div>)}</AnimatePresence>

      <AnimatePresence>{selectedIds.length > 0 && (<motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-6 md:bottom-10 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-[110] bg-black text-white px-6 md:px-8 py-4 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl flex flex-col sm:flex-row items-center gap-4 border border-white/10 backdrop-blur-xl"><div className="text-xs font-black uppercase tracking-widest text-slate-400 text-white"><span className="text-white">{selectedIds.length}</span> selected</div><div className="flex gap-6 items-center"><button onClick={handleDeleteBulk} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-black text-xs uppercase tracking-widest transition-colors"><Trash2 size={16} /> Delete</button><button onClick={() => setSelectedIds([])} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest">Cancel</button></div></motion.div>)}</AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8 text-black">
        <div className="md:col-span-1 flex flex-row md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 scrollbar-hide text-black font-black">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={tasks.length} />
          <FilterButton active={filter === 'todo'} onClick={() => setFilter('todo')} label="To Do" count={tasks.filter(t => t.status !== 'done').length} />
          <FilterButton active={filter === 'done'} onClick={() => setFilter('done')} label="Done" count={tasks.filter(t => t.status === 'done').length} />
        </div>
        <div className="md:col-span-3 space-y-4 text-black">
          {loading ? (<div className="py-20 text-center animate-pulse font-black text-[10px] uppercase text-slate-400">Syncing...</div>) : 
           filteredTasks.length === 0 ? (<div className="py-24 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 font-black uppercase text-[10px]">Empty.</div>) : (
            filteredTasks.map((task) => (
              <motion.div layout key={task.id} className={`group bg-white p-5 md:p-6 rounded-[2rem] border-2 transition-all flex items-start gap-4 md:gap-6 ${task.status === 'done' ? 'opacity-50 border-slate-50' : 'border-slate-100 hover:border-blue-100 hover:shadow-2xl'} text-black`}>
                <div className="flex items-center pt-1"><input type="checkbox" className="w-5 h-5 md:w-6 md:h-6 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 mr-2" checked={selectedIds.includes(task.id)} onChange={() => setSelectedIds(selectedIds.includes(task.id) ? selectedIds.filter(i => i !== task.id) : [...selectedIds, task.id])} /><button onClick={() => toggleStatus(task)} className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-transparent hover:border-blue-500'}`}><CheckCircle2 size={14} /></button></div>
                <div className="flex-1 min-w-0 text-black font-black">
                  <div className="flex justify-between items-start gap-4 text-black">
                    <h3 className={`font-black text-black text-base md:text-lg tracking-tight ${task.status === 'done' ? 'line-through opacity-50' : ''} truncate text-black font-black`}>{task.title}</h3>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => openEditModal(task)} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Edit3 size={16} /></button><button onClick={() => handleDeleteSingle(task.id)} className="p-2 text-slate-400 hover:text-red-600 transition-all"><Trash2 size={16} /></button></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-black">
                    <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-black"><Calendar size={12} className="text-black" /> {task.deadline ? new Date(task.deadline).toLocaleDateString('id-ID', {day:'numeric', month:'short'}) : 'No date'}</span>
                    <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded-lg text-[8px] font-black uppercase border border-slate-100 text-black">{task.category}</span>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${task.priority === 'urgent' ? 'text-red-500' : 'text-slate-400'}`}>{task.priority}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, label, count }: any) {
  return (
    <button onClick={onClick} className={`flex-1 md:w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-xs font-black transition-all uppercase tracking-widest whitespace-nowrap ${active ? 'bg-black text-white shadow-xl scale-[1.02]' : 'bg-white border border-slate-100 text-slate-500 hover:text-black'}`}>
      <span>{label}</span>
      <span className={`ml-2 text-[9px] px-2 py-0.5 rounded-lg ${active ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>
    </button>
  );
}
