'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  TrendingDown,
  Repeat,
  Filter,
  ArrowRight,
  Plus,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
type EventType = 'task' | 'debt' | 'project' | 'recurring';

interface CalendarEvent {
  id: any;
  date: string; // YYYY-MM-DD
  title: string;
  amount?: number;
  type: EventType;
  status: string;
  meta?: any;
}

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    task: true,
    debt: true,
    project: true,
    recurring: true
  });

  useEffect(() => {
    fetchEvents();
  }, [currentDate]); // Refetch when month changes if we want to optimize, or just fetch all at once

  async function fetchEvents() {
    try {
      setLoading(true);
      
      // Date range for the current view (plus minus a bit for smooth transitions)
      // For simplicity, let's fetch 'active' items regardless of date for now, or last 3 months + future
      // Actually, V2 schema is efficient. Let's fetch open items.
      
      const [
        { data: tasks },
        { data: debts },
        { data: projects },
        { data: recurring }
      ] = await Promise.all([
        supabase.from('tasks').select('*').eq('status', 'todo'),
        supabase.from('debts').select('*').gt('remaining_amount', 0),
        supabase.from('projects').select('*').neq('status', 'completed').neq('status', 'cancelled'),
        supabase.from('recurring_transactions').select('*').eq('is_active', true)
      ]);

      const mappedEvents: CalendarEvent[] = [];

      // Map Tasks
      tasks?.forEach(t => {
        if (t.deadline) {
          mappedEvents.push({
            id: `task-${t.id}`,
            date: t.deadline,
            title: t.title,
            type: 'task',
            status: t.status, // Use actual status
            meta: t
          });
        }
      });

      // ... Map Debts remains same
      debts?.forEach(d => {
        if (d.due_date) {
          mappedEvents.push({
            id: `debt-${d.id}`,
            date: d.due_date,
            title: `Pay ${d.name}`,
            amount: d.remaining_amount,
            type: 'debt',
            status: 'Due',
            meta: d
          });
        }
      });

      // Map Projects
      projects?.forEach(p => {
        if (p.deadline) {
          mappedEvents.push({
            id: `proj-${p.id}`,
            date: p.deadline,
            title: `Finish ${p.name}`,
            type: 'project',
            status: p.status,
            meta: p
          });
        }
      });

      // Map Recurring (Next Occurrence)
      recurring?.forEach(r => {
        if (r.next_occurrence) {
          mappedEvents.push({
            id: `rec-${r.id}`,
            date: r.next_occurrence,
            title: `${r.description} (Auto)`,
            amount: r.amount,
            type: 'recurring',
            status: 'Upcoming',
            meta: r
          });
        }
      });

      setEvents(mappedEvents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Calendar Logic
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
    
    const days = [];
    // Previous month filler
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Current days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const isSameDay = (d1: Date, d2String: string) => {
    return d1.toISOString().split('T')[0] === d2String;
  };

  const getEventsForDay = (date: Date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateStr && filters[e.type]);
  };

  const toggleFilter = (type: EventType) => {
    setFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const days = getDaysInMonth(currentDate);
  const selectedDayEvents = events.filter(e => e.date === selectedDate && filters[e.type]);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto pb-20 text-black font-black uppercase">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-black flex items-center gap-3">
            <CalendarIcon className="text-blue-600" /> Schedule
          </h1>
          <p className="text-slate-700 text-xs mt-1 font-bold tracking-tight uppercase opacity-50">Timeline & Deadlines</p>
        </div>
        
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
           <FilterButton label="Tasks" active={filters.task} onClick={() => toggleFilter('task')} color="bg-blue-500" />
           <FilterButton label="Debts" active={filters.debt} onClick={() => toggleFilter('debt')} color="bg-red-500" />
           <FilterButton label="Projects" active={filters.project} onClick={() => toggleFilter('project')} color="bg-purple-500" />
           <FilterButton label="Auto" active={filters.recurring} onClick={() => toggleFilter('recurring')} color="bg-amber-500" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CALENDAR SECTION */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl overflow-hidden">
           {/* Calendar Header */}
           <div className="p-8 flex justify-between items-center border-b-2 border-slate-50">
             <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft /></button>
             <h2 className="text-xl font-black uppercase tracking-widest">{monthName}</h2>
             <button onClick={() => changeMonth(1)} className="p-3 hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight /></button>
           </div>
           
           {/* Days Header */}
           <div className="grid grid-cols-7 border-b-2 border-slate-50 bg-slate-50/50">
             {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
               <div key={day} className="py-4 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">{day}</div>
             ))}
           </div>

           {/* Calendar Grid */}
           <div className="grid grid-cols-7 auto-rows-[100px] md:auto-rows-[120px]">
             {days.map((day, idx) => {
               if (!day) return <div key={`empty-${idx}`} className="bg-slate-50/30 border-b border-r border-slate-50" />;
               
               const dayEvents = getEventsForDay(day);
               const isSelected = isSameDay(day, selectedDate);
               const isToday = isSameDay(day, new Date().toISOString().split('T')[0]);
               const dateStr = day.toISOString().split('T')[0];

               return (
                 <div 
                    key={idx} 
                    onClick={() => setSelectedDate(dateStr)}
                    className={`relative p-2 md:p-4 border-b border-r border-slate-50 transition-all cursor-pointer group hover:bg-blue-50/20 ${isSelected ? 'bg-blue-50/50 ring-2 ring-inset ring-blue-500/20' : ''}`}
                 >
                    <span className={`text-sm font-black ${isToday ? 'bg-black text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg' : 'text-slate-700'}`}>
                      {day.getDate()}
                    </span>
                    
                    {/* Dots Indicator */}
                    <div className="mt-2 flex flex-wrap gap-1 content-start">
                      {dayEvents.slice(0, 4).map((ev, i) => (
                         <div key={i} className={`w-2 h-2 rounded-full ${
                            ev.type === 'task' ? 'bg-blue-500' :
                            ev.type === 'debt' ? 'bg-red-500' :
                            ev.type === 'project' ? 'bg-purple-500' : 'bg-amber-500'
                         }`} />
                      ))}
                      {dayEvents.length > 4 && <div className="w-2 h-2 rounded-full bg-slate-300" />}
                    </div>
                 </div>
               );
             })}
           </div>
        </div>

        {/* DETAILS SECTION */}
        <div className="space-y-6">
           <div className="bg-black text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Selected Date</p>
                <h3 className="text-3xl font-black tracking-tighter mb-6">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                   {selectedDayEvents.length === 0 ? (
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest py-4">No events scheduled.</p>
                   ) : (
                      selectedDayEvents.map(ev => (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={ev.id} className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                           <div className="flex justify-between items-start">
                             <div className="flex gap-3 items-center">
                                <div className={`p-2 rounded-lg ${
                                    ev.type === 'task' ? 'bg-blue-500/20 text-blue-400' :
                                    ev.type === 'debt' ? 'bg-red-500/20 text-red-400' :
                                    ev.type === 'project' ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                   {ev.type === 'task' && <CheckCircle2 size={16} />}
                                   {ev.type === 'debt' && <TrendingDown size={16} />}
                                   {ev.type === 'project' && <Briefcase size={16} />}
                                   {ev.type === 'recurring' && <Repeat size={16} />}
                                </div>
                                <div>
                                   <p className="text-sm font-black truncate max-w-[150px]">{ev.title}</p>
                                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{ev.type} • {ev.status.replace('_', ' ')}</p>
                                </div>
                             </div>
                             {ev.amount && (
                                <p className="text-sm font-black text-emerald-400">
                                   {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(ev.amount)}
                                </p>
                             )}
                           </div>
                        </motion.div>
                      ))
                   )}
                </div>
              </div>
           </div>

           {/* Quick Upcoming List */}
           <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Upcoming Events</h3>
              <div className="space-y-3">
                 {events
                    .filter(e => {
                       const today = new Date().toISOString().split('T')[0];
                       // Show all future events, sorted by date, limit 5
                       return e.date >= today && filters[e.type];
                    })
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(0, 5)
                    .map(ev => (
                       <div key={`upcoming-${ev.id}`} className="flex items-center gap-4 py-2 border-b border-slate-50 last:border-0">
                          <div className={`w-1.5 h-8 rounded-full ${
                             ev.type === 'task' ? 'bg-blue-500' :
                             ev.type === 'debt' ? 'bg-red-500' :
                             ev.type === 'project' ? 'bg-purple-500' : 'bg-amber-500'
                          }`} />
                          <div className="flex-1">
                             <p className="text-xs font-black truncate">{ev.title}</p>
                             <p className="text-[8px] text-slate-400 font-bold uppercase">{new Date(ev.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
                          </div>
                       </div>
                    ))}
                 {events.filter(e => e.date >= new Date().toISOString().split('T')[0]).length === 0 && <p className="text-center text-[9px] font-black text-slate-300 uppercase py-4">No upcoming events.</p>}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function FilterButton({ label, active, onClick, color }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
         active ? `${color} text-white shadow-lg` : 'text-slate-400 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}
