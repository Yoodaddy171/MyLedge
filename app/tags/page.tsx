'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Tag, Plus, Edit3, Trash2, X, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';
import { useGlobalData } from '@/context/GlobalDataContext';
import TagBadge from '@/components/TagBadge';

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

const PRESET_ICONS = ['🏷️', '⭐', '🔥', '💼', '🎯', '📌', '🚀', '💡', '🎨', '📊', '🔔', '✅'];

export default function TagsPage() {
  const { tags, refreshData } = useGlobalData();
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', color: PRESET_COLORS[0], icon: '' });

  useBodyScrollLock(isModalOpen);

  const openEditModal = (tag: any) => {
    setEditingId(tag.id);
    setFormData({ name: tag.name, color: tag.color, icon: tag.icon || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      name: formData.name.trim(),
      color: formData.color,
      icon: formData.icon || null,
    };

    const { error } = editingId
      ? await supabase.from('transaction_tags').update(payload).eq('id', editingId)
      : await supabase.from('transaction_tags').insert(payload);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingId ? 'Tag updated' : 'Tag created');
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name: '', color: PRESET_COLORS[0], icon: '' });
      await refreshData();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this tag? It will be removed from all transactions.')) return;

    // First, delete all tag assignments
    await supabase.from('transaction_tag_assignments').delete().eq('tag_id', id);

    // Then delete the tag
    const { error } = await supabase.from('transaction_tags').delete().eq('id', id);

    if (!error) {
      toast.success('Tag deleted');
      await refreshData();
    } else {
      toast.error(error.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Transaction Tags</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">Organize transactions with custom labels</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', color: PRESET_COLORS[0], icon: '' });
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-lg flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest"
        >
          <Plus size={16} /> New Tag
        </button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center md:items-center gap-3 md:gap-4">
          <div className="p-2 bg-slate-50 rounded-lg">
            <Tag size={16} className="text-blue-500" />
          </div>
          <div className="text-center md:text-left">
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Tags</p>
            <p className="text-base md:text-xl font-bold text-slate-900 leading-none">{tags.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 bg-slate-50/30">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">All Tags</p>
        </div>

        <div className="p-6">
          {tags.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No tags yet. Create your first tag to start organizing transactions.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="group p-4 border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all flex items-center justify-between"
                >
                  <TagBadge tag={tag} size="md" />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(tag)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
              className="relative bg-white w-full max-w-md rounded-2xl shadow-xl p-5 md:p-6 text-black"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
              <h2 className="text-lg font-bold mb-6 text-slate-900">
                {editingId ? 'Edit Tag' : 'Create New Tag'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Tag Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Important, Business, Personal"
                    required
                    className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                    <Palette size={12} className="inline mr-1" />
                    Color
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-full aspect-square rounded-lg transition-all ${
                          formData.color === color
                            ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Icon (Optional)
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`p-2 text-lg rounded-lg border transition-all ${
                          formData.icon === icon
                            ? 'border-slate-400 bg-slate-100 scale-110'
                            : 'border-slate-200 hover:border-slate-300 hover:scale-105'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  {formData.icon && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: '' })}
                      className="mt-2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      Clear icon
                    </button>
                  )}
                </div>

                <div className="pt-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Preview</p>
                  <TagBadge tag={formData as any} size="md" />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors mt-2 uppercase tracking-widest active:scale-[0.98] shadow-lg"
                >
                  {editingId ? 'Update Tag' : 'Create Tag'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
