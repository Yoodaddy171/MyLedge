'use client';

import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Loader2, BarChart3 } from 'lucide-react';

interface CashFlowChartProps {
  data: any[];
  wallets: any[];
  viewMode: 'weekly' | 'monthly' | 'yearly';
  onViewModeChange: (mode: 'weekly' | 'monthly' | 'yearly') => void;
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
  loading?: boolean;
}

export default function CashFlowChart({ 
  data, 
  wallets, 
  viewMode, 
  onViewModeChange,
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
  loading = false
}: CashFlowChartProps) {
  const [hiddenBanks, setHiddenBanks] = useState<string[]>([]);
  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

  const toggleBank = (name: string) => {
    if (hiddenBanks.includes(name)) setHiddenBanks(hiddenBanks.filter(h => h !== name));
    else setHiddenBanks([...hiddenBanks, name]);
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative">
      {loading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-base font-bold text-slate-900">Cash Flow Trends</h3>
          <p className="text-xs text-slate-500">Income activity over time</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {(['weekly', 'monthly', 'yearly'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={`px-3 py-1 text-[10px] font-bold rounded-md capitalize transition-all ${
                  viewMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Month Selector */}
          {viewMode === 'monthly' && (
            <select
              value={selectedMonth}
              onChange={(e) => onMonthChange(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-blue-400"
            >
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          )}

          {/* Year Selector */}
          {(viewMode === 'monthly' || viewMode === 'yearly') && (
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-blue-400"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="h-[280px]">
        {(!data || data.length === 0 || !wallets || wallets.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <BarChart3 size={28} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">No data available</p>
            <p className="text-xs text-slate-400 max-w-[200px]">
              {wallets.length === 0
                ? "Add a bank account to start tracking your cash flow"
                : "No transactions found for this period"}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -30, top: 10 }}>
              <defs>
                {wallets.map((w, i) => (
                  <linearGradient key={w.id} id={`color${w.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                dy={10}
              />
              <YAxis hide />
              <Tooltip
                formatter={(value: any) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(value || 0))}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 500 }}
              />
              <Legend
                onClick={(e) => e && e.value && toggleBank(e.value)}
                wrapperStyle={{ paddingTop: '20px', fontSize: '11px', color: '#64748b' }}
                iconType="circle"
              />
              {wallets.map((w, i) => (
                <Area
                  key={w.id}
                  type="monotone"
                  dataKey={w.name}
                  stroke={chartColors[i % chartColors.length]}
                  fillOpacity={1}
                  fill={`url(#color${w.id})`}
                  strokeWidth={2}
                  hide={hiddenBanks.includes(w.name)}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
