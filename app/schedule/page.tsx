'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Briefcase,
  TrendingDown,
  Repeat,
  ArrowRight,
  Activity,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type EventType = 'task' | 'debt' | 'project' | 'recurring';

interface CalendarEvent {
  id: any;
  date: string;
  title: string;
  amount?: number;
  type: EventType;
  status: string;
  meta?: any;
}

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<string>(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ task: true, debt: true, project: true, recurring: true });

  useEffect(() => { fetchEvents(); }, [currentDate]);

  async function fetchEvents() {
    try {
      setLoading(true);
      // CRITICAL: Get user first and filter all queries by user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [{ data: tasks }, { data: debts }, { data: projects }, { data: recurring }] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('status', 'todo'),
        supabase.from('debts').select('*').eq('user_id', user.id).gt('remaining_amount', 0),
        supabase.from('projects').select('*').eq('user_id', user.id).neq('status', 'completed'),
        supabase.from('recurring_transactions').select('*').eq('user_id', user.id).eq('is_active', true)
      ]);

      const mappedEvents: CalendarEvent[] = [];
      tasks?.forEach(t => t.deadline && mappedEvents.push({ id: `task-${t.id}`, date: t.deadline, title: t.title, type: 'task', status: t.status }));
      debts?.forEach(d => d.due_date && mappedEvents.push({ id: `debt-${d.id}`, date: d.due_date, title: `Pay ${d.name}`, amount: d.remaining_amount, type: 'debt', status: 'Due' }));
      projects?.forEach(p => p.deadline && mappedEvents.push({ id: `proj-${p.id}`, date: p.deadline, title: `Finish ${p.name}`, type: 'project', status: p.status }));
      recurring?.forEach(r => r.next_occurrence && mappedEvents.push({ id: `rec-${r.id}`, date: r.next_occurrence, title: r.description, amount: r.amount, type: 'recurring', status: 'Upcoming' }));
      setEvents(mappedEvents);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const getEventsForDay = (date: Date) => {
    if (!date) return [];
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr && filters[e.type]);
  };

  const days = getDaysInMonth(currentDate);
  const selectedDayEvents = events.filter(e => e.date === selectedDate && filters[e.type]);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Schedule</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5 font-bold uppercase tracking-widest">Deadlines & Roadmap</p>
        </div>
        <div className="flex gap-1 p-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar max-w-full shrink-0">
           <FilterButton label="Tasks" active={filters.task} onClick={() => setFilters(f => ({...f, task: !f.task}))} color="bg-blue-500" />
           <FilterButton label="Debts" active={filters.debt} onClick={() => setFilters(f => ({...f, debt: !f.debt}))} color="bg-red-500" />
           <FilterButton label="Projs" active={filters.project} onClick={() => setFilters(f => ({...f, project: !f.project}))} color="bg-purple-500" />
           <FilterButton label="Auto" active={filters.recurring} onClick={() => setFilters(f => ({...f, recurring: !f.recurring}))} color="bg-amber-500" />
        </div>
      </header>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
           <div className="p-4 md:p-6 flex justify-between items-center border-b border-slate-50">
             <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth()-1); setCurrentDate(d); }} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"><ChevronLeft size={20} /></button>
             <h2 className="text-sm md:text-base font-bold text-slate-900 uppercase tracking-widest">{monthName}</h2>
             <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth()+1); setCurrentDate(d); }} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"><ChevronRight size={20} /></button>
           </div>
           
           <div className="grid grid-cols-7 border-b border-slate-50 bg-slate-50/30">
             {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
               <div key={day} className="py-2 text-center text-[9px] md:text-[10px] font-bold uppercase text-slate-400 tracking-wider">{day}</div>
             ))}
           </div>

           <div className="grid grid-cols-7 auto-rows-[60px] md:auto-rows-[100px]">
             {days.map((day, idx) => {
               if (!day) return <div key={`empty-${idx}`} className="bg-slate-50/5 border-b border-r border-slate-50" />;
               
               const dayEvents = getEventsForDay(day);
               const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
               const isSelected = selectedDate === dateStr;
               const isToday = new Date().toISOString().split('T')[0] === dateStr;

               return (
                 <div key={idx} onClick={() => setSelectedDate(dateStr)} className={`relative p-1 md:p-2 border-b border-r border-slate-50 transition-all cursor-pointer group hover:bg-blue-50/20 ${isSelected ? 'bg-blue-50/40' : ''}`}>
                    <span className={`text-[10px] md:text-xs font-bold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-lg ${isToday ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600'}`}>
                      {day.getDate()}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-0.5 md:gap-1 max-w-full">
                      {dayEvents.slice(0, 4).map((ev, i) => (
                         <div key={i} className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${ev.type === 'task' ? 'bg-blue-500' : ev.type === 'debt' ? 'bg-red-500' : ev.type === 'project' ? 'bg-purple-500' : 'bg-amber-500'} shadow-sm`} />
                      ))}
                      {dayEvents.length > 4 && <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-slate-300" />}
                    </div>
                 </div>
               );
             })}
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-2xl relative overflow-hidden border border-slate-800">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full" />
              <div className="relative z-10">
                <p className="text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-[0.2em]">Selected Agenda</p>
                <h3 className="text-lg font-bold tracking-tight mb-6">{new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
                   {selectedDayEvents.length === 0 ? (
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest py-8 text-center italic">Free Horizon</p>
                   ) : (
                      selectedDayEvents.map(ev => (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} key={ev.id} className="bg-white/5 p-3 rounded-2xl border border-white/[0.05] hover:bg-white/[0.08] transition-all group">
                           <div className="flex justify-between items-start gap-3">
                             <div className="flex gap-3 items-center min-w-0">
                                <div className={`p-2 rounded-xl shrink-0 shadow-sm ${
                                    ev.type === 'task' ? 'bg-blue-500/20 text-blue-400' :
                                    ev.type === 'debt' ? 'bg-red-500/20 text-red-400' :
                                    ev.type === 'project' ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                   {ev.type === 'task' && <CheckCircle2 size={14} />}
                                   {ev.type === 'debt' && <TrendingDown size={14} />}
                                   {ev.type === 'project' && <Briefcase size={14} />}
                                   {ev.type === 'recurring' && <Repeat size={14} />}
                                </div>
                                <div className="min-w-0">
                                   <p className="text-xs font-bold truncate text-slate-100 uppercase tracking-tight">{ev.title}</p>
                                   <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{ev.type} • {ev.status}</p>
                                </div>
                             </div>
                             {ev.amount && (
                                <p className="text-[10px] font-bold text-emerald-400 whitespace-nowrap bg-emerald-400/10 px-2 py-1 rounded-lg">
                                   {new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(ev.amount)}
                                </p>
                             )}
                           </div>
                        </motion.div>
                      ))
                   )}
                </div>
              </div>
           </div>

           <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hidden md:block">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Immediate Timeline</h3>
              <div className="space-y-4">
                 {events.filter(e => e.date >= selectedDate).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4).map(ev => (
                    <div key={`quick-${ev.id}`} className="flex items-center gap-3 group">
                       <div className={`w-1 h-6 rounded-full shrink-0 ${ev.type === 'task' ? 'bg-blue-500' : ev.type === 'debt' ? 'bg-red-500' : ev.type === 'project' ? 'bg-purple-500' : 'bg-amber-500'}`} />
                       <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate uppercase tracking-tighter">{ev.title}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(ev.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function FilterButton({ label, active, onClick, color }: any) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-[9px] md:text-[10px] font-bold transition-all uppercase tracking-widest shrink-0 ${active ? `${color} text-white shadow-md` : 'text-slate-400 hover:bg-slate-50'}`}>
      {label}
    </button>
  );
}
