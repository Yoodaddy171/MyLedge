'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Download, 
  PieChart as PieIcon
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DetailedReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { fetchReportData(); }, []);

  async function fetchReportData() {
    try {
      setLoading(true);
      const { data: trx } = await supabase.from('transactions').select('*, item:transaction_items(name, categories(name))');
      if (!trx) return;
      const grouped = trx.reduce((acc: any, curr: any) => {
        const catName = curr.item?.categories?.name || 'Uncategorized';
        if (!acc[catName]) acc[catName] = { name: catName, value: 0 };
        acc[catName].value += Number(curr.amount);
        return acc;
      }, {});
      setData(Object.values(grouped));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 text-black font-black">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10 md:mb-12">
        <div className="flex items-center gap-4 w-full sm:w-auto">
            <button onClick={() => router.back()} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm shrink-0">
                <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight truncate">Detailed Report</h1>
                <p className="text-slate-700 font-bold text-[10px] uppercase tracking-widest mt-1 opacity-50">Spending Analysis</p>
            </div>
        </div>
        <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-black text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
            <Download size={16} /> Export PDF
        </button>
      </header>

      {loading ? (<div className="py-20 text-center animate-pulse text-slate-400 font-black tracking-widest text-[10px]">PREPARING...</div>) : (
        <div className="space-y-6 md:space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col items-center">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 md:mb-10 flex items-center gap-2 w-full">
                        <PieIcon size={14} className="text-blue-600" /> Distribution
                    </h3>
                    <div className="h-[250px] md:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data} innerRadius="65%" outerRadius="90%" paddingAngle={5} dataKey="value">
                                    {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border border-slate-200 shadow-sm">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 md:mb-8">Legend & Totals</h3>
                    <div className="space-y-2 md:space-y-3">
                        {data.sort((a,b) => b.value - a.value).map((cat, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                    <span className="text-xs md:text-sm font-black text-black truncate">{cat.name}</span>
                                </div>
                                <span className="text-xs md:text-sm font-black text-slate-700 whitespace-nowrap ml-4">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(cat.value)}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            <div className="bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] text-white shadow-2xl overflow-hidden">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8 md:mb-10">Intensity Graph</h3>
                <div className="h-[250px] md:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ left: -20, right: 20 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#fff', fontWeight: 900, fontSize: 10 }} width={100} />
                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ borderRadius: '16px', border: 'none', color: '#000', fontWeight: 'bold' }} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={14} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}