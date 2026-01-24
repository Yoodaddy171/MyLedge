'use client';

import React, { useState } from 'react';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit2, Trash2, PlayCircle, PauseCircle } from 'lucide-react';

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

      await refreshData();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving recurring transaction:', error);
      alert(error.message);
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
      await refreshData();
    } catch (error: any) {
      console.error('Error deleting recurring transaction:', error);
      alert(error.message);
    }
  };

  const handleToggleActive = async (id: any, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      await refreshData();
    } catch (error: any) {
      console.error('Error toggling status:', error);
      alert(error.message);
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

      alert(`Generated ${result.created} transaction(s)`);
      await refreshData();
    } catch (error: any) {
      console.error('Error generating transaction:', error);
      alert(error.message);
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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Recurring Transactions</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your recurring income and expenses</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl hover:bg-slate-800 transition-all text-sm font-semibold"
          >
            <Plus size={16} />
            New Recurring
          </button>
        </div>

        {/* Recurring Transactions List */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {recurringTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-slate-500">No recurring transactions yet</p>
              <button
                onClick={() => handleOpenModal()}
                className="mt-4 text-sm font-semibold text-slate-900 hover:text-slate-700"
              >
                Create your first one
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600">Type</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600">Frequency</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600">Next Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recurringTransactions.map((recurring) => (
                    <tr key={recurring.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900">{recurring.description}</p>
                        {recurring.notes && (
                          <p className="text-xs text-slate-500 mt-1">{recurring.notes}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(recurring.type)}`}>
                          {recurring.type.charAt(0).toUpperCase() + recurring.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-bold text-slate-900">
                          {formatCurrency(recurring.amount)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">{getFrequencyLabel(recurring.frequency)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">{recurring.next_occurrence}</p>
                        {recurring.last_generated_date && (
                          <p className="text-xs text-slate-400 mt-1">Last: {recurring.last_generated_date}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${recurring.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
                          <span className="text-xs text-slate-600">
                            {recurring.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleActive(recurring.id, recurring.is_active)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title={recurring.is_active ? 'Pause' : 'Activate'}
                          >
                            {recurring.is_active ? (
                              <PauseCircle size={16} className="text-slate-600" />
                            ) : (
                              <PlayCircle size={16} className="text-slate-600" />
                            )}
                          </button>
                          <button
                            onClick={() => handleGenerateNow(recurring.id)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-xs font-semibold text-blue-600"
                            title="Generate Now"
                          >
                            Generate
                          </button>
                          <button
                            onClick={() => handleOpenModal(recurring)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} className="text-slate-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(recurring.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} className="text-red-600" />
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
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                {wallets.filter(w => w.id !== formData.wallet_id).map((wallet) => (
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
