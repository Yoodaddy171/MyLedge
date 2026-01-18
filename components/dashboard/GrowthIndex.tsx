'use client';

import React from 'react';
import { Wallet, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface GrowthIndexProps {
  savingsRate: number;
}

export default function GrowthIndex({ savingsRate }: GrowthIndexProps) {
  return (
    <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden group">
      <div className="absolute -bottom-6 -right-6 opacity-5 group-hover:scale-110 transition-transform duration-1000">
        <Wallet size={120} />
      </div>
      
      <div className="flex items-center gap-2 mb-6">
        <div className="p-1.5 bg-slate-800 rounded-lg text-emerald-400"><TrendingUp size={16} /></div>
        <h3 className="text-sm font-bold text-slate-200">Capital Growth</h3>
      </div>

      <div className="flex items-baseline gap-1 mb-6">
        <p className="text-4xl font-bold tracking-tight text-emerald-400">{savingsRate.toFixed(0)}%</p>
        <span className="text-sm text-slate-500 font-medium">savings rate</span>
      </div>

      <div className="w-full bg-slate-800 h-1.5 rounded-full mb-4 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }} 
          animate={{ width: `${savingsRate}%` }} 
          transition={{ duration: 2 }} 
          className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
        />
      </div>
      
      <p className="text-xs text-slate-400">
        Health Status: <span className={`font-medium ${savingsRate >= 30 ? 'text-emerald-400' : 'text-blue-400'}`}>
          {savingsRate >= 30 ? 'Elite Growth' : 'Stable'}
        </span>
      </p>
    </div>
  );
}