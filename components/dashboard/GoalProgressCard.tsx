'use client';

import { Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface Goal {
  id: any;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
}

interface GoalProgressCardProps {
  goals: Goal[];
}

export default function GoalProgressCard({ goals }: GoalProgressCardProps) {
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

  const activeGoals = goals.slice(0, 3); // Show top 3 goals

  if (goals.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Financial Goals</h3>
          <Target size={16} className="text-slate-400" />
        </div>
        <div className="text-center py-8">
          <Target size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs text-slate-500 mb-4">No active goals yet</p>
          <Link
            href="/goals"
            className="inline-block px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold hover:bg-slate-800 uppercase tracking-widest"
          >
            Create Goal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Financial Goals</h3>
        <Link href="/goals" className="text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-widest">
          View All →
        </Link>
      </div>

      <div className="space-y-4">
        {activeGoals.map((goal) => {
          const progress = calculateProgress(goal.current_amount, goal.target_amount);
          const isNearComplete = progress >= 80;

          return (
            <div key={goal.id} className="border-b border-slate-50 last:border-0 pb-4 last:pb-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-900 truncate">{goal.name}</h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                    {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                  </p>
                </div>
                <span className={`text-xs font-bold ${isNearComplete ? 'text-emerald-600' : 'text-blue-600'}`}>
                  {progress.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isNearComplete ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {goals.length > 3 && (
        <div className="mt-4 pt-4 border-t border-slate-50">
          <Link
            href="/goals"
            className="text-xs text-slate-500 hover:text-slate-700 font-bold flex items-center gap-1"
          >
            <TrendingUp size={12} />
            +{goals.length - 3} more goals
          </Link>
        </div>
      )}
    </div>
  );
}
