'use client';

import React from 'react';
import { Receipt, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface RecentTransactionsProps {
  transactions: any[];
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Receipt size={16} /></div>
          <h3 className="text-base font-bold text-slate-900">Recent Activity</h3>
        </div>
        <Link href="/transactions" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
          View All <ArrowRight size={12} />
        </Link>
      </div>
      <div className="space-y-3">
        {transactions.map((trx) => (
          <div key={trx.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all group border border-transparent hover:border-slate-100">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${trx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                {trx.type === 'income' ? 'IN' : 'OUT'}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">{trx.item?.name || trx.description || 'Manual Entry'}</p>
                <p className="text-xs text-slate-500 mt-0.5">{new Date(trx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
              </div>
            </div>
            <p className={`font-semibold text-sm whitespace-nowrap ${trx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
              {trx.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(trx.amount)}
            </p>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">No recent transactions</div>
        )}
      </div>
    </div>
  );
}