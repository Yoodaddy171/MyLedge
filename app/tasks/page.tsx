'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Plus, Clock, Calendar, CheckCircle2, Target, Activity, Zap, Edit3, Trash2, X, Briefcase, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';
import type { Task, TaskCategory, ProjectOption, SubmissionOption } from '@/lib/types';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionOption[]>([]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('Semua');

  const [formData, setFormData] = useState({
    title: '',
    category: 'Kegiatan Pribadi',
    priority: 'Sedang',
    status: 'todo',
    deadline: '',
    notes: '',
    project_id: '',
    submission_id: ''
  });

  useBodyScrollLock(isModalOpen || isCategoryModalOpen);

  useEffect(() => {
    fetchTasks();
    fetchSupportData();
  }, []);

  async function fetchSupportData() {
    try {
      // CRITICAL: Get user first and filter all queries by user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [cats, projs, subs] = await Promise.all([
        supabase.from('task_categories').select('*').eq('user_id', user.id).order('name', { ascending: true }),
        supabase.from('projects').select('id, name').eq('user_id', user.id).neq('status', 'completed'),
        supabase.from('submissions').select('id, entity, doc_number').eq('user_id', user.id).neq('status', 'Done')
      ]);

      setTaskCategories(cats.data || []);
      setProjects(projs.data || []);
      setSubmissions(subs.data || []);
    } catch (error) { console.error("Error fetching support data:", error); }
  }

  async function fetchTasks() {
    try {
      setLoading(true);
      // CRITICAL: Get user first and filter by user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          category:task_categories!fk_tasks_category(name),
          project:projects(name),
          submission:submissions(entity, doc_number)
        `)
        .eq('user_id', user.id)
        .order('status', { ascending: true })
        .order('deadline', { ascending: true });

      if (error) throw error;

      const mappedTasks = (data || []).map(t => ({
        ...t,
        category: (t.category as any)?.name || 'Uncategorized',
        projectName: (t.project as any)?.name,
        submissionName: (t.submission as any)?.entity,
        priority: t.priority === 'urgent' ? 'Urgent' : t.priority === 'high' ? 'High' : t.priority === 'medium' ? 'Medium' : 'Low'
      }));
      setTasks(mappedTasks);
    } catch (error) { toast.error("Failed to load tasks"); }
    finally { setLoading(false); }
  }

  const handleDeleteSingle = async (id: number) => {
    if (!confirm("Delete task?")) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) { toast.success("Deleted"); fetchTasks(); }
  };

  const handleDeleteBulk = async () => {
    if (!confirm(`Delete ${selectedIds.length} tasks?`)) return;
    const { error } = await supabase.from('tasks').delete().in('id', selectedIds);
    if (!error) { toast.success("Deleted"); setSelectedIds([]); fetchTasks(); }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const categoryId = taskCategories.find(c => c.name === formData.category)?.id;
    const payload = {
      user_id: user.id,
      title: formData.title.trim(),
      category_id: categoryId,
      priority: formData.priority.toLowerCase(),
      deadline: formData.deadline || null,
      notes: formData.notes.trim(),
      status: formData.status,
      project_id: formData.project_id ? Number(formData.project_id) : null,
      submission_id: formData.submission_id ? Number(formData.submission_id) : null
    };

    const { error } = editingId ? await supabase.from('tasks').update(payload).eq('id', editingId) : await supabase.from('tasks').insert(payload);

    if (error) toast.error(error.message);
    else {
      toast.success(editingId ? "Updated" : "Created");
      setIsModalOpen(false);
      setEditingId(null);
      fetchTasks();
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = { name: newCategoryName.trim(), user_id: user.id };
    const { error } = editingCategoryId
      ? await supabase.from('task_categories').update({ name: newCategoryName.trim() }).eq('id', editingCategoryId)
      : await supabase.from('task_categories').insert(payload);

    if (error) toast.error(error.message);
    else {
      toast.success(editingCategoryId ? "Updated" : "Created");
      setIsCategoryModalOpen(false); setEditingCategoryId(null); setNewCategoryName('');
      fetchSupportData();
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Delete category?")) return;
    const { error } = await supabase.from('task_categories').delete().eq('id', id);
    if (!error) {
      toast.success("Category deleted");
      if (selectedCategoryTab === taskCategories.find(c => c.id === id)?.name) setSelectedCategoryTab('Semua');
      fetchSupportData();
    } else { toast.error(error.message); }
  };

  const toggleStatus = async (task: Task) => {
    let newStatus: Task['status'] = 'todo';
    if (task.status === 'todo') newStatus = 'in_progress';
    else if (task.status === 'in_progress') newStatus = 'done';

    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
  };

  const filteredTasks = tasks.filter(t => {
    const matchesStatus = filter === 'all' ? true : t.status === filter;
    const matchesCategory = selectedCategoryTab === 'Semua' ? true : t.category === selectedCategoryTab;
    return matchesStatus && matchesCategory;
  });

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    urgent: tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-blue-600">Tasks & Goals</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5 md:mt-1 font-bold">Track your roadmap</p>
        </div>
        <button onClick={() => {
          setEditingId(null);
          setFormData({ title: '', category: taskCategories[0]?.name || 'Kegiatan Pribadi', priority: 'Sedang', status: 'todo', deadline: '', notes: '', project_id: '', submission_id: '' });
          setIsModalOpen(true);
        }} className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95">
          <Plus size={16} /> New Task
        </button>
      </header>

      {/* Metrics Row */}
      <div className="grid grid-cols-5 gap-2 md:gap-3 mb-8">
        <MiniMetric title="Pending" value={stats.todo} icon={<Clock size={14} />} color="text-slate-600" />
        <MiniMetric title="Active" value={stats.inProgress} icon={<Activity size={14} />} color="text-blue-600" />
        <MiniMetric title="Done" value={stats.done} icon={<CheckCircle2 size={14} />} color="text-emerald-600" />
        <MiniMetric title="Urgent" value={stats.urgent} icon={<Zap size={14} />} color="text-red-600" />
        <MiniMetric title="Total" value={stats.total} icon={<Target size={14} />} color="text-slate-900" />
      </div>

      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto no-scrollbar">
          <TabButton active={selectedCategoryTab === 'Semua'} onClick={() => setSelectedCategoryTab('Semua')} label="All" />
          {taskCategories.map(cat => (
            <TabButton
              key={cat.id}
              active={selectedCategoryTab === cat.name}
              onClick={() => setSelectedCategoryTab(cat.name)}
              label={cat.name}
              onEdit={() => {
                setEditingCategoryId(cat.id);
                setNewCategoryName(cat.name);
                setIsCategoryModalOpen(true);
              }}
              onDelete={() => handleDeleteCategory(cat.id)}
            />
          ))}
          <button onClick={() => { setEditingCategoryId(null); setNewCategoryName(''); setIsCategoryModalOpen(true); }} className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors shrink-0"><Plus size={14} /></button>
        </div>
        <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-xl w-fit shadow-sm">
          {['all', 'todo', 'in_progress', 'done'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${filter === f ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>{f.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-widest">No tasks found</div>
        ) : (
          filteredTasks.map((task) => (
            <motion.div layout key={task.id} className={`group bg-white p-4 rounded-2xl border transition-all flex items-center gap-3 md:gap-4 ${task.status === 'done' ? 'opacity-60 border-slate-100 bg-slate-50/30' : 'border-slate-100 hover:border-blue-200 hover:shadow-sm'} ${selectedIds.includes(task.id) ? 'border-blue-200 ring-1 ring-blue-100' : ''}`}>
              <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0" checked={selectedIds.includes(task.id)} onChange={() => setSelectedIds(selectedIds.includes(task.id) ? selectedIds.filter(i => i !== task.id) : [...selectedIds, task.id])} />

              <button onClick={() => toggleStatus(task)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 hover:border-blue-400'}`}>
                {task.status === 'done' && <CheckCircle2 size={14} />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter ${task.priority === 'urgent' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{task.priority}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{task.category}</span>
                  {task.projectName && (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
                      <Building2 size={10} /> {task.projectName}
                    </span>
                  )}
                </div>
                <h3 className={`font-bold text-sm text-slate-900 truncate ${task.status === 'done' ? 'line-through text-slate-500' : ''}`}>{task.title}</h3>
                {task.deadline && (
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 font-bold uppercase tracking-widest">
                    <Calendar size={12} className="text-slate-300" /> {new Date(task.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </p>
                )}
              </div>

              <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => {
                  setEditingId(task.id);
                  setFormData({
                    title: task.title,
                    category: task.category || '',
                    priority: task.priority,
                    status: task.status,
                    deadline: task.deadline ? task.deadline.split('T')[0] : '',
                    notes: task.notes || '',
                    project_id: task.project_id?.toString() || '',
                    submission_id: task.submission_id?.toString() || ''
                  });
                  setIsModalOpen(true);
                }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 size={14} /></button>
                <button onClick={() => handleDeleteSingle(task.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modals remain structurally same but with mobile-optimized p-5 instead of p-6 */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-2xl shadow-xl p-5 md:p-6 max-h-[90vh] overflow-y-auto no-scrollbar overscroll-contain">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Task' : 'New Task'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-4 text-black">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Title</label>
                  <input type="text" placeholder="What needs to be done?" className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Category</label>
                    <select className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      {taskCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Priority</label>
                    <select className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                      <option value="Urgent">Urgent</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Project</label>
                    <select className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.project_id} onChange={e => setFormData({ ...formData, project_id: e.target.value })}>
                      <option value="">None</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Work Hub</label>
                    <select className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.submission_id} onChange={e => setFormData({ ...formData, submission_id: e.target.value })}>
                      <option value="">None</option>
                      {submissions.map(s => <option key={s.id} value={s.id}>{s.entity}</option>)}
                    </select>
                  </div>
                </div>

                <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Deadline</label><input type="date" className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} /></div>
                <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Notes</label><textarea placeholder="Add details..." className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold h-20 resize-none" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} /></div>
                <button type="submit" className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors mt-2 shadow-lg shadow-slate-200 uppercase tracking-widest active:scale-[0.98]">Save Task Record</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-black">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCategoryModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl p-6">
              <h2 className="text-lg font-bold mb-6 text-slate-900">{editingCategoryId ? 'Edit Category' : 'New Category'}</h2>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Name</label><input type="text" className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} required /></div>
                <button type="submit" className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors mt-2 uppercase tracking-widest">Save Category</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedIds.length} selected</span>
            <button onClick={handleDeleteBulk} className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 uppercase tracking-widest"><Trash2 size={12} /> Delete</button>
            <button onClick={() => setSelectedIds([])} className="text-slate-500 hover:text-white"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniMetric({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-1.5 group hover:border-blue-100 transition-all">
      <div className={`p-1.5 rounded-lg bg-slate-50 ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-sm md:text-lg font-bold text-slate-900 leading-none mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, onEdit, onDelete }: any) {
  return (
    <div className="relative group/tab shrink-0">
      <button onClick={onClick} className={`px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>{label}</button>
      {(onEdit || onDelete) && (
        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover/tab:opacity-100 transition-opacity bg-white shadow-sm rounded-full p-0.5 border border-slate-100 z-10">
          {onEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 text-blue-500 hover:bg-blue-50 rounded-full"><Edit3 size={10} /></button>}
          {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-red-500 hover:bg-red-50 rounded-full"><X size={10} /></button>}
        </div>
      )}
    </div>
  );
}
