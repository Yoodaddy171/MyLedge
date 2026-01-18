'use client';

import React from 'react';
import { Landmark, Eye, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

interface BankAccountsProps {
  wallets: any[];
  onViewHistory?: (wallet: any) => void;
}

export default function BankAccounts({ wallets, onViewHistory }: BankAccountsProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Landmark size={16} className="text-slate-400" /> Accounts
        </h3>
        <Link href="/banks" className="text-xs font-medium text-slate-500 hover:text-black transition-colors">
          Manage
        </Link>
      </div>
      <div className="space-y-4">
        {wallets.length > 0 ? wallets.map(w => (
          <div key={w.id} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                {w.name.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-black transition-colors">{w.name}</span>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => onViewHistory?.(w)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="View History"
                >
                    <Eye size={14} />
                </button>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md font-medium border border-emerald-100/50">
                    <LinkIcon size={10} /> Connected
                </div>
            </div>
          </div>
        )) : <p className="text-slate-400 text-xs text-center py-4">No accounts added</p>}
      </div>
    </div>
  );
}
