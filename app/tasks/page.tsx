'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Plus, Search, CheckCircle2, Clock, Calendar, Download, Trash2, X, Edit3, Target, Activity, Zap
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
  const [taskCategories, setTaskCategories] = useState<any[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('Semua');

  const [formData, setFormData] = useState({ title: '', category: 'Kegiatan Pribadi', priority: 'Sedang', deadline: '', notes: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTasks();
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const { data, error } = await supabase.from('task_categories').select('*').order('name', { ascending: true });
      if (error) throw error;

      // Seed defaults if empty
      if (!data || data.length === 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const defaults = ['Kegiatan Pribadi', 'Kegiatan Kantor', 'Kegiatan Kuliah', 'Kegiatan Lainnya'];
          const payload = defaults.map(name => ({ user_id: user.id, name }));
          await supabase.from('task_categories').insert(payload);
          const { data: refreshed } = await supabase.from('task_categories').select('*').order('name', { ascending: true });
          setTaskCategories(refreshed || []);
        }
      } else {
        setTaskCategories(data);
      }
    } catch (error) { console.error("Error fetching categories:", error); }
  }

  async function fetchTasks() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('tasks').select('*').order('status', { ascending: true }).order('deadline', { ascending: true });
      if (error) throw error;

      // Map DB priority (english) to UI priority (indonesian)
      const mappedTasks = (data || []).map(t => ({
        ...t,
        priority: t.priority === 'urgent' ? 'Urgent' :
          t.priority === 'high' ? 'Tinggi' :
            t.priority === 'medium' ? 'Sedang' :
              t.priority === 'low' ? 'Rendah' : t.priority
      }));
      setTasks(mappedTasks);
    } catch (error) { toast.error("Failed to load tasks"); }
    finally { setLoading(false); }
  }

  const handleDeleteSingle = async (id: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) { toast.success("Task deleted"); fetchTasks(); }
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
    setFormData({ title: task.title, category: task.category || 'Kegiatan Pribadi', priority: task.priority || 'Sedang', deadline: task.deadline ? task.deadline.split('T')[0] : '', notes: task.notes || '' });
    setIsModalOpen(true);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      user_id: user.id,
      title: formData.title.trim(),
      category: formData.category,
      priority: formData.priority === 'Urgent' ? 'urgent' :
        formData.priority === 'Tinggi' ? 'high' :
          formData.priority === 'Sedang' ? 'medium' :
            formData.priority === 'Rendah' ? 'low' : formData.priority.toLowerCase(),
      deadline: formData.deadline || null,
      notes: formData.notes.trim(),
      status: editingId ? undefined : 'todo'
    };
    const { error } = editingId ? await supabase.from('tasks').update(payload).eq('id', editingId) : await supabase.from('tasks').insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success(editingId ? "Task updated" : "New task added");
      setIsModalOpen(false); setEditingId(null);
      setFormData({ title: '', category: 'Kegiatan Pribadi', priority: 'Sedang', deadline: '', notes: '' });
      fetchTasks();
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let error;
      if (editingCategoryId) {
        const { error: err } = await supabase.from('task_categories').update({ name: newCategoryName.trim() }).eq('id', editingCategoryId);
        error = err;
      } else {
        const { error: err } = await supabase.from('task_categories').insert({ user_id: user.id, name: newCategoryName.trim() });
        error = err;
      }

      if (error) throw error;
      toast.success(editingCategoryId ? "Kategori diperbarui" : "Kategori ditambahkan");
      setNewCategoryName('');
      setEditingCategoryId(null);
      setIsCategoryModalOpen(false);
      fetchCategories();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Hapus kategori ini? Tugas yang menggunakan kategori ini akan tetap ada.")) return;
    try {
      const { error } = await supabase.from('task_categories').delete().eq('id', id);
      if (error) throw error;
      toast.success("Kategori dihapus");
      if (selectedCategoryTab !== 'Semua') setSelectedCategoryTab('Semua');
      fetchCategories();
    } catch (err: any) { toast.error(err.message); }
  };

  const openRenameCategoryModal = (cat: any) => {
    setEditingCategoryId(cat.id);
    setNewCategoryName(cat.name);
    setIsCategoryModalOpen(true);
  };

  const toggleStatus = async (task: any) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    toast.success(newStatus === 'done' ? "Task completed!" : "Task set to pending");
  };

  const filteredTasks = tasks.filter(t => {
    const matchesStatus = filter === 'all' ? true : (filter === 'todo' ? t.status !== 'done' : t.status === 'done');
    const matchesCategory = selectedCategoryTab === 'Semua' ? true : t.category === selectedCategoryTab;
    return matchesStatus && matchesCategory;
  });

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status !== 'done').length,
    done: tasks.filter(t => t.status === 'done').length,
    urgent: tasks.filter(t => t.priority === 'Urgent' && t.status !== 'done').length
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 text-black font-black uppercase">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-black uppercase">My Tasks</h1>
          <p className="text-slate-700 text-xs mt-1 font-bold tracking-tight uppercase">Managing my daily goals & to-dos.</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ title: '', category: taskCategories[0]?.name || 'Kegiatan Pribadi', priority: 'Sedang', deadline: '', notes: '' }); setIsModalOpen(true); }} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 rounded-xl text-[10px] font-black text-white hover:bg-blue-700 shadow-xl transition-all uppercase tracking-widest">
          <Plus size={16} /> Tambahkan Misi
        </button>
      </header>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <MiniMetric title="Pending" value={stats.todo} icon={<Activity size={16} />} color="text-blue-600" />
        <MiniMetric title="Completed" value={stats.done} icon={<CheckCircle2 size={16} />} color="text-emerald-600" />
        <MiniMetric title="Penting" value={stats.urgent} icon={<Zap size={16} />} color="text-red-600" />
        <MiniMetric title="Total" value={stats.total} icon={<Target size={16} />} color="text-slate-600" />
      </div>

      <div className="flex flex-col gap-6 mb-10">
        <div className="flex items-center justify-between pt-4 pb-4 border-b-2 border-slate-50 overflow-x-auto scrollbar-hide px-2">
          <div className="flex items-center gap-3">
            <TabButton active={selectedCategoryTab === 'Semua'} onClick={() => setSelectedCategoryTab('Semua')} label="Semua" />
            {taskCategories.map(cat => (
              <TabButton
                key={cat.id}
                active={selectedCategoryTab === cat.name}
                onClick={() => setSelectedCategoryTab(cat.name)}
                label={cat.name}
                onDelete={() => handleDeleteCategory(cat.id)}
                onEdit={() => openRenameCategoryModal(cat)}
              />
            ))}
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all border border-slate-100 shadow-sm"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 ml-8">
            <FilterButtonLite active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
            <FilterButtonLite active={filter === 'todo'} onClick={() => setFilter('todo')} label="Todo" />
            <FilterButtonLite active={filter === 'done'} onClick={() => setFilter('done')} label="Done" />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="py-20 text-center animate-pulse font-black text-[10px] uppercase text-slate-400">Syncing Tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400 font-black uppercase text-[10px]">No tasks found for this filter.</div>
        ) : (
          filteredTasks.map((task) => (
            <motion.div
              layout
              key={task.id}
              className={`group bg-white p-5 rounded-[1.5rem] border-2 transition-all flex items-center gap-6 ${task.status === 'done' ? 'opacity-50 border-slate-50' : 'border-slate-100 hover:border-blue-100'}`}
            >
              <div className="flex items-center gap-6 flex-1">
                <div className="flex items-center">
                  <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 mr-4" checked={selectedIds.includes(task.id)} onChange={() => setSelectedIds(selectedIds.includes(task.id) ? selectedIds.filter(i => i !== task.id) : [...selectedIds, task.id])} />
                  <button
                    onClick={() => toggleStatus(task)}
                    className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-50 border-slate-100 text-transparent hover:border-blue-500 hover:bg-white'}`}
                  >
                    <CheckCircle2 size={20} />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className={`font-black text-black text-sm md:text-base tracking-tight ${task.status === 'done' ? 'line-through text-slate-400' : ''} truncate`}>{task.title}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400 tracking-widest"><Calendar size={12} className="text-blue-500" /> {task.deadline ? new Date(task.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Deadline'}</span>
                        <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[8px] font-black uppercase border border-slate-100">{task.category}</span>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${task.priority === 'Urgent' ? 'bg-red-500 animate-pulse' : task.priority === 'Tinggi' ? 'bg-amber-500' : task.priority === 'Sedang' ? 'bg-blue-400' : 'bg-slate-300'}`} />
                          <span className={`text-[8px] font-black uppercase tracking-widest ${task.priority === 'Urgent' ? 'text-red-500' : 'text-slate-400'}`}>{task.priority}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 sm:opacity-0 group-hover:opacity-100 transition-all border-l border-slate-50 pl-4 h-10 items-center">
                <button onClick={() => openEditModal(task)} className="p-2 text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-blue-50 rounded-lg"><Edit3 size={16} /></button>
                <button onClick={() => handleDeleteSingle(task.id)} className="p-2 text-slate-400 hover:text-red-600 transition-all border border-transparent hover:border-red-50 rounded-lg"><Trash2 size={16} /></button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Task Creation/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 overflow-hidden text-black font-black max-h-[95vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black uppercase tracking-tight">{editingId ? 'Edit Task' : 'New Goal'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">Task Title</label>
                  <input type="text" required placeholder="e.g. Check monthly budget" className="w-full bg-white border-2 border-slate-100 rounded-[1.2rem] px-6 py-5 text-sm font-black shadow-sm outline-none focus:border-blue-500 transition-all" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">Category</label>
                    <select className="w-full bg-white border-2 border-slate-100 rounded-[1.2rem] px-5 py-4 text-xs font-black uppercase shadow-sm outline-none focus:border-blue-500" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                      {taskCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">Priority</label>
                    <select className="w-full bg-white border-2 border-slate-100 rounded-[1.2rem] px-5 py-4 text-xs font-black uppercase shadow-sm outline-none focus:border-blue-500" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                      <option value="Urgent">Urgent</option>
                      <option value="Tinggi">Tinggi</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Rendah">Rendah</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">Deadline</label>
                  <input type="date" className="w-full bg-white border-2 border-slate-100 rounded-[1.2rem] px-6 py-5 text-sm font-black shadow-sm outline-none focus:border-blue-500 transition-all" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">Notes</label>
                  <textarea placeholder="Any additional details..." className="w-full bg-white border-2 border-slate-100 rounded-[1.2rem] px-6 py-4 text-xs font-bold shadow-sm outline-none focus:border-blue-500 min-h-[100px] resize-none" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>
                <button type="submit" className="w-full bg-black text-white font-black py-6 rounded-[1.5rem] shadow-xl hover:bg-slate-800 transition-all mt-4 uppercase tracking-widest text-[10px]">Save Task</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[130] bg-black text-white px-10 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400"><span className="text-white">{selectedIds.length}</span> tasks selected</div>
            <button onClick={() => setSelectedIds([])} className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Management Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCategoryModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-10 text-black font-black">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black uppercase tracking-tight">Kategori Baru</h2>
                <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleCategorySubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">Nama Kategori</label>
                  <input type="text" required placeholder="e.g. Hobi" className="w-full bg-white border-2 border-slate-100 rounded-[1.2rem] px-6 py-5 text-sm font-black shadow-sm outline-none focus:border-blue-500 transition-all" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white font-black py-5 rounded-[1.5rem] shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]">{editingCategoryId ? 'Simpan Perubahan' : 'Tambahkan'}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniMetric({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-5 rounded-[1.5rem] border-2 border-slate-50 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-all">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-slate-50 ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
        <div>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
          <p className={`text-xl font-black ${color} tracking-tighter`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, onEdit, onDelete }: any) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`px-5 py-2.5 rounded-xl text-[9px] font-black transition-all uppercase tracking-widest whitespace-nowrap border-2 ${active ? 'bg-black text-white border-black shadow-xl scale-[1.02]' : 'bg-white border-slate-50 text-slate-400 hover:text-black hover:border-slate-100'}`}
      >
        {label}
      </button>
      {label !== 'Semua' && (
        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-blue-600 transition-colors"
            >
              <Edit3 size={10} strokeWidth={3} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-red-600 transition-colors"
            >
              <X size={12} strokeWidth={3} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FilterButtonLite({ active, onClick, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
    >
      {label}
    </button>
  );
}
