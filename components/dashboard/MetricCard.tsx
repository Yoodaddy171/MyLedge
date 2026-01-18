'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  sub: string;
}

export default function MetricCard({ title, value, icon, color, sub }: MetricCardProps) {
  return (
    <motion.div whileHover={{ y: -2 }} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group transition-all hover:border-blue-100 hover:shadow-md">
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-1.5 md:p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors duration-300">
            {React.cloneElement(icon as React.ReactElement, { size: 16 })}
          </div>
          <p className="text-[10px] md:text-xs font-medium text-slate-500">{title}</p>
        </div>
      </div>
      <p className={`text-base md:text-2xl font-bold ${color} tracking-tight truncate`}>
        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)}
      </p>
      <p className="text-[9px] md:text-xs text-slate-400 mt-0.5 md:mt-1 truncate">{sub}</p>
    </motion.div>
  );
}
