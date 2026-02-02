'use client';

import React, { useState } from 'react';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDisplayAmount } from '@/lib/utils';
import { Plus, Edit2, Trash2, PlayCircle, PauseCircle, Repeat, Calendar, Zap } from 'lucide-react';
import { toast } from 'sonner';

type FormData = {
  type: 'income' | 'expense' | 'transfer';
  amount: string;
  description: string;
  wallet_id: string;
  to_wallet_id?: string;
  item_id?: string;
  project_id?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date?: string;
  is_active: boolean;
  auto_generate: boolean;
  notes?: string;
};

const initialFormData: FormData = {
  type: 'expense',
  amount: '',
  description: '',
  wallet_id: '',
  frequency: 'monthly',
  start_date: new Date().toISOString().split('T')[0],
  is_active: true,
  auto_generate: true
};

export default function RecurringTransactionsPage() {
  const { recurringTransactions, wallets, masterItems, projects, refreshData, loading } = useGlobalData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenModal = (recurring?: any) => {
    if (recurring) {
      setEditingId(recurring.id);
      setFormData({
        type: recurring.type,
        amount: recurring.amount.toString(),
        description: recurring.description,
        wallet_id: recurring.wallet_id,
        to_wallet_id: recurring.to_wallet_id || undefined,
        item_id: recurring.item_id || undefined,
        project_id: recurring.project_id || undefined,
        frequency: recurring.frequency,
        start_date: recurring.start_date,
        end_date: recurring.end_date || undefined,
        is_active: recurring.is_active,
        auto_generate: recurring.auto_generate,
        notes: recurring.notes || undefined
      });
    } else {
      setEditingId(null);
      setFormData(initialFormData);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        user_id: user.id,
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        wallet_id: formData.wallet_id,
        to_wallet_id: formData.to_wallet_id || null,
        item_id: formData.item_id || null,
        project_id: formData.project_id || null,
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        next_occurrence: formData.start_date,
        is_active: formData.is_active,
        auto_generate: formData.auto_generate,
        notes: formData.notes || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('recurring_transactions')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('recurring_transactions')
          .insert(payload);

        if (error) throw error;
      }

      toast.success(editingId ? 'Recurring updated' : 'Recurring created');
      await refreshData();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving recurring transaction:', error);
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm('Delete this recurring transaction?')) return;

    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Recurring transaction deleted');
      await refreshData();
    } catch (error: any) {
      console.error('Error deleting recurring transaction:', error);
      toast.error(error.message);
    }
  };

  const handleToggleActive = async (id: any, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentStatus ? 'Recurring paused' : 'Recurring activated');
      await refreshData();
    } catch (error: any) {
      console.error('Error toggling status:', error);
      toast.error(error.message);
    }
  };

  const handleGenerateNow = async (id: any) => {
    if (!confirm('Generate transaction from this recurring template now?')) return;

    try {
      const response = await fetch('/api/generate-recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recurringId: id })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      toast.success(`Generated ${result.created} transaction(s)`);
      await refreshData();
    } catch (error: any) {
      console.error('Error generating transaction:', error);
      toast.error(error.message);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'text-green-600 bg-green-50';
      case 'expense': return 'text-red-600 bg-red-50';
      case 'transfer': return 'text-blue-600 bg-blue-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading...</p>
      </div>
    );
  }

  // Calculate summary stats
  const activeCount = recurringTransactions.filter(r => r.is_active).length;
  const totalMonthlyIncome = recurringTransactions
    .filter(r => r.is_active && r.type === 'income' && r.frequency === 'monthly')
    .reduce((sum, r) => sum + r.amount, 0);
  const totalMonthlyExpense = recurringTransactions
    .filter(r => r.is_active && r.type === 'expense' && r.frequency === 'monthly')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-blue-600">Recurring</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">Manage your recurring income and expenses</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-lg transition-all active:scale-95"
        >
          <Plus size={16} />
          New Recurring
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Repeat size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active</p>
              <p className="text-lg font-bold text-slate-900">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Zap size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Income</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalMonthlyIncome)}</p>
            </div>
          </div>
        </div>
        <div className="col-span-2 md:col-span-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Calendar size={16} className="text-red-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Expense</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(totalMonthlyExpense)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recurring Transactions List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center px-4 md:px-6">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Templates</p>
            <span className="text-[10px] bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-full font-bold">{recurringTransactions.length} items</span>
          </div>
        </div>

        {recurringTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Repeat size={28} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">No recurring transactions yet</p>
            <p className="text-xs text-slate-400 mb-4">Create templates to automate your regular transactions</p>
            <button
              onClick={() => handleOpenModal()}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Create your first one →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</th>
                  <th className="px-4 md:px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                  <th className="px-4 md:px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                  <th className="px-4 md:px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:table-cell">Frequency</th>
                  <th className="px-4 md:px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden lg:table-cell">Next Date</th>
                  <th className="px-4 md:px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-4 md:px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recurringTransactions.map((recurring) => (
                  <tr key={recurring.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 md:px-6 py-4">
                      <p className="text-xs font-bold text-slate-900">{recurring.description}</p>
                      {recurring.notes && (
                        <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[150px]">{recurring.notes}</p>
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getTypeColor(recurring.type)}`}>
                        {recurring.type}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right">
                      <p className={`text-xs font-bold ${recurring.type === 'income' ? 'text-emerald-600' : recurring.type === 'expense' ? 'text-red-600' : 'text-blue-600'}`}>
                        {recurring.type === 'income' ? '+' : recurring.type === 'expense' ? '-' : ''}{formatCurrency(recurring.amount)}
                      </p>
                    </td>
                    <td className="px-4 md:px-6 py-4 hidden md:table-cell">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                        {getFrequencyLabel(recurring.frequency)}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 hidden lg:table-cell">
                      <p className="text-xs text-slate-600">{new Date(recurring.next_occurrence).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      {recurring.last_generated_date && (
                        <p className="text-[10px] text-slate-400 mt-0.5">Last: {new Date(recurring.last_generated_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${recurring.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className={`text-[10px] font-bold ${recurring.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {recurring.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleActive(recurring.id, recurring.is_active)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title={recurring.is_active ? 'Pause' : 'Activate'}
                        >
                          {recurring.is_active ? (
                            <PauseCircle size={14} className="text-slate-500" />
                          ) : (
                            <PlayCircle size={14} className="text-emerald-600" />
                          )}
                        </button>
                        <button
                          onClick={() => handleGenerateNow(recurring.id)}
                          className="px-2 py-1.5 hover:bg-blue-50 rounded-lg transition-colors text-[10px] font-bold text-blue-600"
                          title="Generate Now"
                        >
                          Generate
                        </button>
                        <button
                          onClick={() => handleOpenModal(recurring)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} className="text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(recurring.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? 'Edit Recurring Transaction' : 'New Recurring Transaction'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
              placeholder="e.g., Monthly Rent, Salary, etc."
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formData.amount ? formatDisplayAmount(formData.amount) : ''}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/\D/g, '');
                setFormData({ ...formData, amount: rawValue });
              }}
              className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
              placeholder="0"
            />
          </div>

          {/* Wallet */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block">
              Wallet <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.wallet_id}
              onChange={(e) => setFormData({ ...formData, wallet_id: e.target.value })}
              className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            >
              <option value="">Select Wallet</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </option>
              ))}
            </select>
          </div>

          {/* To Wallet (for transfers) */}
          {formData.type === 'transfer' && (
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-2 block">
                To Wallet <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.to_wallet_id || ''}
                onChange={(e) => setFormData({ ...formData, to_wallet_id: e.target.value })}
                className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required={formData.type === 'transfer'}
              >
                <option value="">Select Destination Wallet</option>
                {wallets.filter(w => w.id.toString() !== formData.wallet_id).map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category Item */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block">
              Category Item
            </label>
            <select
              value={formData.item_id || ''}
              onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
              className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Select Item (Optional)</option>
              {masterItems
                .filter(item => (item.categories as any)?.type === formData.type)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {(item.categories as any)?.name ? `(${(item.categories as any).name})` : ''}
                  </option>
                ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block">
              Project
            </label>
            <select
              value={formData.project_id || ''}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Select Project (Optional)</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block">
              Frequency <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
              className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly (Every 3 months)</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={formData.end_date || ''}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="text-xs text-slate-500 mt-2">Leave empty for no end date</p>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          {/* Toggles */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-slate-700">Active</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.auto_generate}
                onChange={(e) => setFormData({ ...formData, auto_generate: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-slate-700">Auto Generate Transactions</span>
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 bg-slate-100 text-slate-900 font-semibold py-3 rounded-xl hover:bg-slate-200 transition-all border border-slate-200 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-all shadow-lg text-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : (editingId ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
