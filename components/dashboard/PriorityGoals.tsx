'use client';

import React from 'react';
import { Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface PriorityGoalsProps {
  tasks: any[];
}

export default function PriorityGoals({ tasks }: PriorityGoalsProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-slate-400" /> Priority Goals
        </h3>
        <Link href="/tasks" className="text-xs font-medium text-slate-500 hover:text-black transition-colors">
          View All
        </Link>
      </div>
      <div className="space-y-4">
        {tasks.length > 0 ? tasks.map(t => (
          <div key={t.id} className="flex items-start gap-3 group/item">
            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${t.priority === 'urgent' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-700 group-hover/item:text-blue-600 transition-colors truncate">{t.title}</p>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Calendar size={10} /> 
                {t.deadline ? new Date(t.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'No Deadline'}
              </p>
            </div>
          </div>
        )) : <p className="text-slate-400 text-xs text-center py-4">No pending goals</p>}
      </div>
    </div>
  );
}