'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function UrgentTaskNotification() {
    const [urgentTasks, setUrgentTasks] = useState<any[]>([]);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const fetchUrgentTasks = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('tasks')
                .select('id, title')
                .eq('priority', 'urgent')
                .neq('status', 'done')
                .eq('user_id', user.id);

            setUrgentTasks(data || []);
        };

        fetchUrgentTasks();

        // Set up a small interval to re-check every minute
        const interval = setInterval(fetchUrgentTasks, 60000);
        return () => clearInterval(interval);
    }, []);

    if (urgentTasks.length === 0 || !isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 100, opacity: 0, scale: 0.9 }}
                className="fixed bottom-6 right-6 z-[120] w-full max-w-sm"
            >
                <div className="bg-white/90 backdrop-blur-xl border-2 border-red-100 p-6 rounded-[2rem] shadow-2xl shadow-red-500/10 relative overflow-hidden group">
                    {/* Subtle background glow */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-all duration-500" />

                    <button
                        onClick={() => setIsVisible(false)}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    >
                        <X size={16} />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shrink-0">
                            <AlertCircle size={24} className="animate-pulse" />
                        </div>
                        <div className="flex-1 pr-6">
                            <h4 className="text-sm font-black text-black uppercase tracking-widest mb-1">Urgent Action Required</h4>
                            <p className="text-xs text-slate-600 font-bold leading-relaxed">
                                You have <span className="text-red-600">{urgentTasks.length}</span> high-priority tasks pending attention.
                            </p>

                            <div className="mt-4 space-y-2">
                                {urgentTasks.slice(0, 2).map((task) => (
                                    <div key={task.id} className="text-[10px] font-black text-black bg-slate-50 px-3 py-2 rounded-xl truncate border border-slate-100">
                                        • {task.title}
                                    </div>
                                ))}
                            </div>

                            <Link
                                href="/tasks"
                                className="mt-5 flex items-center justify-between w-full bg-red-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-red-600/20 active:scale-95 group/btn"
                            >
                                Go to Tasks
                                <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
