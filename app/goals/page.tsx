'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Target, Plus, Edit3, Trash2, X, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { formatDisplayAmount } from '@/lib/utils';

type GoalStatus = 'active' | 'completed' | 'cancelled';

interface Goal {
  id: any;
  user_id: any;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  status: GoalStatus;
  description?: string;
  created_at?: string;
}

export default function GoalsPage() {
  const { goals, refreshData } = useGlobalData();
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    deadline: '',
    description: '',
  });

  useBodyScrollLock(isModalOpen);

  useEffect(() => {
    fetchAllGoals();
  }, []);

  const fetchAllGoals = async () => {
    try {
      setLoading(true);
      // CRITICAL: Get user first and filter by user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllGoals(data || []);
    } catch (err) {
      console.error('Error fetching goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (goal: Goal) => {
    setEditingId(goal.id);
    setFormData({
      name: goal.name,
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      deadline: goal.deadline || '',
      description: goal.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      name: formData.name.trim(),
      target_amount: parseFloat(formData.target_amount),
      current_amount: parseFloat(formData.current_amount || '0'),
      deadline: formData.deadline || null,
      status: 'active' as GoalStatus,
      description: formData.description.trim() || null,
    };

    const { error } = editingId
      ? await supabase.from('financial_goals').update(payload).eq('id', editingId)
      : await supabase.from('financial_goals').insert(payload);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingId ? 'Goal updated' : 'Goal created');
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        name: '',
        target_amount: '',
        current_amount: '',
        deadline: '',
        description: '',
      });
      await fetchAllGoals();
      await refreshData();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this goal?')) return;

    const { error } = await supabase.from('financial_goals').delete().eq('id', id);

    if (!error) {
      toast.success('Goal deleted');
      await fetchAllGoals();
      await refreshData();
    } else {
      toast.error(error.message);
    }
  };

  const handleStatusChange = async (id: number, status: GoalStatus) => {
    const { error } = await supabase
      .from('financial_goals')
      .update({ status })
      .eq('id', id);

    if (!error) {
      toast.success(`Goal marked as ${status}`);
      await fetchAllGoals();
      await refreshData();
    } else {
      toast.error(error.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const activeGoals = allGoals.filter((g) => g.status === 'active');
  const completedGoals = allGoals.filter((g) => g.status === 'completed');

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-blue-600">Financial Goals</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">Track your savings and investment targets</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              target_amount: '',
              current_amount: '',
              deadline: '',
              description: '',
            });
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-lg flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest"
        >
          <Plus size={16} /> New Goal
        </button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
        <StatCard
          label="Active Goals"
          val={activeGoals.length}
          icon={<Target size={16} className="text-blue-500" />}
        />
        <StatCard
          label="Completed"
          val={completedGoals.length}
          icon={<CheckCircle size={16} className="text-emerald-500" />}
        />
        <StatCard
          label="Total Progress"
          val={`${Math.round(
            activeGoals.reduce((acc, g) => acc + calculateProgress(g.current_amount, g.target_amount), 0) /
            (activeGoals.length || 1)
          )}%`}
          icon={<TrendingUp size={16} className="text-violet-500" />}
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <div className="animate-pulse text-slate-400 text-sm font-bold">Loading goals...</div>
        </div>
      ) : activeGoals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Target size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No active goals yet</h3>
          <p className="text-sm text-slate-500 mb-6">Start by creating your first financial goal</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-lg"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {activeGoals.map((goal) => {
              const progress = calculateProgress(goal.current_amount, goal.target_amount);
              const isCompleted = progress >= 100;

              return (
                <div
                  key={goal.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{goal.name}</h3>
                      {goal.description && (
                        <p className="text-xs text-slate-500">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isCompleted && (
                        <button
                          onClick={() => handleStatusChange(goal.id, 'completed')}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Mark as completed"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(goal)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-bold">
                        {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                      </span>
                      <span className="font-bold text-slate-900">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {goal.deadline && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                      <Clock size={12} />
                      <span>Target: {new Date(goal.deadline).toLocaleDateString('id-ID')}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {completedGoals.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Completed Goals</h2>
              <div className="space-y-3">
                {completedGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-bold text-slate-900">{goal.name}</h3>
                      <p className="text-xs text-slate-500">{formatCurrency(goal.target_amount)}</p>
                    </div>
                    <CheckCircle size={20} className="text-emerald-500" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-xl p-5 md:p-6 text-black max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
              <h2 className="text-lg font-bold mb-6 text-slate-900">
                {editingId ? 'Edit Goal' : 'Create New Goal'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Emergency Fund, Down Payment"
                    required
                    className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Target Amount
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="100.000.000"
                    required
                    className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold"
                    value={formatDisplayAmount(formData.target_amount)}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, target_amount: rawValue });
                    }}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Current Amount
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold"
                    value={formatDisplayAmount(formData.current_amount)}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, current_amount: rawValue });
                    }}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Target Date (Optional)
                  </label>
                  <input
                    type="date"
                    className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Description (Optional)
                  </label>
                  <textarea
                    placeholder="Why is this goal important to you?"
                    rows={3}
                    className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors mt-2 uppercase tracking-widest active:scale-[0.98] shadow-lg"
                >
                  {editingId ? 'Update Goal' : 'Create Goal'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, val, icon }: any) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center md:items-center gap-3 md:gap-4 transition-all hover:border-blue-100 group">
      <div className="p-2 bg-slate-50 rounded-lg group-hover:scale-110 transition-transform">{icon}</div>
      <div className="text-center md:text-left">
        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
          {label}
        </p>
        <p className="text-base md:text-xl font-bold text-slate-900 leading-none">{val}</p>
      </div>
    </div>
  );
}
