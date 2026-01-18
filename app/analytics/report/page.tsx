'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Download, 
  PieChart as PieIcon,
  BarChart3
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
} from 'recharts';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DetailedReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { fetchReportData(); }, []);

  async function fetchReportData() {
    try {
      setLoading(true);
      const { data: trx } = await supabase.from('transactions').select('*, item:transaction_items!fk_transactions_item(name, categories!fk_transaction_items_category(name))');
      if (!trx) return;
      const grouped = trx.reduce((acc: any, curr: any) => {
        const item: any = Array.isArray(curr.item) ? curr.item[0] : curr.item;
        const catName = item?.categories?.name || 'Uncategorized';
        if (!acc[catName]) acc[catName] = { name: catName, value: 0 };
        acc[catName].value += Number(curr.amount);
        return acc;
      }, {});
      setData(Object.values(grouped));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const handleExport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("MyLedger Financial Report", 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text("Spending Analysis by Category", 14, 36);

    const tableBody = data
      .sort((a, b) => b.value - a.value)
      .map((item) => [
        item.name,
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.value)
      ]);
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    tableBody.push(['TOTAL', new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(total)]);

    autoTable(doc, {
      head: [['Category', 'Amount']],
      body: tableBody,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', fontStyle: 'bold' } },
    });

    doc.save(`MyLedger_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4 w-full sm:w-auto">
            <button onClick={() => router.back()} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm shrink-0">
                <ArrowLeft size={18} className="text-slate-600" />
            </button>
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Detailed Report</h1>
                <p className="text-slate-500 text-sm mt-0.5 font-medium">Spending Analysis</p>
            </div>
        </div>
        <button 
            onClick={handleExport}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
        >
            <Download size={16} /> Export PDF
        </button>
      </header>

      {loading ? (<div className="py-20 text-center animate-pulse text-slate-400 font-medium text-xs">PREPARING REPORT...</div>) : (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                    <div className="flex items-center gap-2 w-full mb-6">
                        <PieIcon size={16} className="text-blue-500" />
                        <h3 className="text-sm font-bold text-slate-900">Distribution</h3>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data} innerRadius="65%" outerRadius="90%" paddingAngle={5} dataKey="value">
                                    {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />))}
                                </Pie>
                                <Tooltip 
                                    formatter={(value: any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 500 }} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <h3 className="text-sm font-bold text-slate-900 mb-6">Summary by Category</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {[...data].sort((a,b) => b.value - a.value).map((cat, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 transition-hover hover:border-blue-100">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                    <span className="text-sm font-medium text-slate-700 truncate">{cat.name}</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900 ml-4">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(cat.value)}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl overflow-hidden border border-slate-800">
                <div className="flex items-center gap-2 mb-8">
                    <BarChart3 size={16} className="text-blue-400" />
                    <h3 className="text-sm font-bold text-slate-100">Intensity Graph</h3>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ left: -20, right: 20 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 500, fontSize: 11 }} width={100} />
                            <Tooltip 
                                formatter={(value: any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                                contentStyle={{ borderRadius: '12px', border: 'none', color: '#000', fontWeight: 600 }} 
                            />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}