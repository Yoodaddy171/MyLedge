'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function CashFlowForecastPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    calculateForecast();
  }, []);

  async function calculateForecast() {
    try {
      setLoading(true);
      
      const { data: wallets } = await supabase
        .from('wallet_balances_view')
        .select('current_balance')
        .eq('is_active', true)
        .eq('is_excluded_from_total', false);
        
      const initialBalance = wallets?.reduce((sum, w) => sum + Number(w.current_balance), 0) || 0;

      const { data: recurring } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('is_active', true);

      if (!recurring) {
        setData([]);
        return;
      }

      const forecast: any[] = [];
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6);

      let currentBalance = initialBalance;
      forecast.push({
        date: new Date().toISOString().split('T')[0],
        balance: currentBalance,
        event: 'Today'
      });

      const events: any[] = [];
      
      recurring.forEach(tx => {
        let nextDate = new Date(tx.next_occurrence);
        const amount = Number(tx.amount);
        const isIncome = tx.type === 'income';

        while (nextDate <= endDate) {
          events.push({
            date: nextDate,
            amount: isIncome ? amount : -amount,
            description: tx.description
          });

          if (tx.frequency === 'monthly') {
            nextDate = new Date(nextDate);
            nextDate.setMonth(nextDate.getMonth() + 1);
          } else if (tx.frequency === 'weekly') {
            nextDate = new Date(nextDate);
            nextDate.setDate(nextDate.getDate() + 7);
          } else if (tx.frequency === 'yearly') {
            nextDate = new Date(nextDate);
            nextDate.setFullYear(nextDate.getFullYear() + 1);
          } else {
             nextDate = new Date(nextDate); 
             nextDate.setMonth(nextDate.getMonth() + 1);
          }
        }
      });

      events.sort((a, b) => a.date.getTime() - b.date.getTime());

      events.forEach(e => {
        currentBalance += e.amount;
        forecast.push({
          date: e.date.toISOString().split('T')[0],
          balance: currentBalance,
          event: e.description
        });
      });

      setData(forecast);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm shrink-0">
            <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cash Flow Forecast</h1>
            <p className="text-slate-500 text-sm mt-0.5">6-month projection based on recurring items</p>
        </div>
      </header>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-slate-400 text-xs font-medium uppercase">Calculating Future...</div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11, fontWeight: 500, fill: '#94a3b8' }} 
                    tickFormatter={(val) => {
                        const d = new Date(val);
                        return `${d.getDate()}/${d.getMonth()+1}`;
                    }}
                    minTickGap={30}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fontWeight: 500, fill: '#94a3b8' }} 
                    tickFormatter={(val) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(val)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 500 }}
                    formatter={(val: any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val || 0))}
                  />
                  <Area 
                    type="stepAfter" 
                    dataKey="balance" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorBalance)" 
                  />
                </AreaChart>
             </ResponsiveContainer>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
             <h3 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">Projection Summary</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                    <p className="text-[10px] font-semibold text-slate-500 mb-1 uppercase">Start</p>
                    <p className="text-lg font-bold text-white">{new Intl.NumberFormat('id-ID', { notation: 'compact', style: 'currency', currency: 'IDR' }).format(data[0]?.balance || 0)}</p>
                </div>
                <div>
                    <p className="text-[10px] font-semibold text-slate-500 mb-1 uppercase">End</p>
                    <p className="text-lg font-bold text-emerald-400">{new Intl.NumberFormat('id-ID', { notation: 'compact', style: 'currency', currency: 'IDR' }).format(data[data.length-1]?.balance || 0)}</p>
                </div>
                <div>
                    <p className="text-[10px] font-semibold text-slate-500 mb-1 uppercase">Lowest</p>
                    <p className="text-lg font-bold text-red-400">{new Intl.NumberFormat('id-ID', { notation: 'compact', style: 'currency', currency: 'IDR' }).format(Math.min(...data.map(d => d.balance)) || 0)}</p>
                </div>
                <div>
                    <p className="text-[10px] font-semibold text-slate-500 mb-1 uppercase">Highest</p>
                    <p className="text-lg font-bold text-blue-400">{new Intl.NumberFormat('id-ID', { notation: 'compact', style: 'currency', currency: 'IDR' }).format(Math.max(...data.map(d => d.balance)) || 0)}</p>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}