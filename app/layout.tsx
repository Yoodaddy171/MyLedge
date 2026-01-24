'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  CheckSquare,
  Settings,
  LogOut,
  User,
  Sparkles,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Menu,
  X,
  Target,
  Landmark,
  Calendar,
  Briefcase,
  Repeat,
  Tag
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import UrgentTaskNotification from "@/components/UrgentTaskNotification";
import SmoothScroll from "@/components/SmoothScroll";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalDataProvider } from "@/contexts/GlobalDataContext";
import NotificationCenter from "@/components/NotificationCenter";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === '/login';

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const NavContent = () => (
    <>
      <div className="flex items-center justify-between gap-3 mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 flex items-center justify-center p-1.5 shadow-2xl">
            <img src="/logo.png" alt="MyLedger" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">MyLedger</h1>
        </div>
        <NotificationCenter />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto pr-2 no-scrollbar">
        <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 text-white opacity-50">Core</p>
        <NavItem href="/" icon={<LayoutDashboard size={18} />} label="Dashboard" active={pathname === '/'} />
        <NavItem href="/analytics" icon={<BarChart3 size={18} />} label="Analytics" active={pathname === '/analytics'} />
        <NavItem href="/transactions" icon={<Receipt size={18} />} label="Transactions" active={pathname === '/transactions'} />
        <NavItem href="/recurring" icon={<Repeat size={18} />} label="Recurring" active={pathname === '/recurring'} />
        <NavItem href="/budgets" icon={<Target size={18} />} label="Budgets" active={pathname === '/budgets'} />
        <NavItem href="/goals" icon={<Target size={18} />} label="Goals" active={pathname === '/goals'} />
        <NavItem href="/debts" icon={<TrendingDown size={18} />} label="Debts" active={pathname === '/debts'} />
        <NavItem href="/investments" icon={<PieChart size={18} />} label="Investments" active={pathname === '/investments'} />
        <NavItem href="/projects" icon={<TrendingUp size={18} />} label="Projects" active={pathname === '/projects'} />

        <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 mt-8 text-white opacity-50">Productivity</p>
        <NavItem href="/schedule" icon={<Calendar size={18} />} label="Schedule" active={pathname === '/schedule'} />
        <NavItem href="/tasks" icon={<CheckSquare size={16} />} label="Tasks" active={pathname === '/tasks'} />
        <NavItem href="/work" icon={<Briefcase size={18} />} label="Work Hub" active={pathname === '/work'} />

        <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 mt-8 text-white opacity-50">Management</p>
        <NavItem href="/banks" icon={<Landmark size={18} />} label="Banks" active={pathname === '/banks'} />
        <NavItem href="/tags" icon={<Tag size={18} />} label="Tags" active={pathname === '/tags'} />
        <NavItem href="/master" icon={<Settings size={18} />} label="Master Data" active={pathname === '/master'} />
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5">
        <a
          href="/profile"
          className="flex items-center gap-3 p-2 bg-white/5 rounded-xl mb-3 border border-white/5 hover:bg-white/10 transition-all group"
        >
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden border border-white/10">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={16} className="text-slate-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate text-white">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'My Account'}
            </p>
            <p className="text-[9px] text-slate-500 truncate font-bold uppercase tracking-tighter">View Profile</p>
          </div>
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-xs font-medium transition-all group"
        >
          <LogOut size={16} className="group-hover:translate-x-1 transition-transform" /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#f8fafc] text-black`}>
        <GlobalDataProvider>
          <SmoothScroll>
            <Toaster position="top-center" richColors />
            <UrgentTaskNotification />
            <div className="flex flex-col md:flex-row min-h-screen">
              {!isAuthPage && (
                <>
                  {/* MOBILE HEADER */}
                  <header className="md:hidden flex items-center justify-between p-4 bg-[#0f172a] text-white sticky top-0 z-50 shadow-lg border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center p-1">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                      </div>
                      <span className="font-black text-lg tracking-tighter uppercase italic">MyLedger</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                      <Menu size={24} />
                    </button>
                  </header>

                  {/* MOBILE DRAWER */}
                  <AnimatePresence>
                    {isMobileMenuOpen && (
                      <div className="fixed inset-0 z-[100] md:hidden text-white">
                        <motion.div
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.aside
                          initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                          className="absolute left-0 top-0 bottom-0 w-64 bg-[#0f172a] p-6 flex flex-col shadow-2xl"
                        >
                          <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white transition-colors">
                            <X size={24} />
                          </button>
                          <NavContent />
                        </motion.aside>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* DESKTOP SIDEBAR */}
                  <aside className="w-60 bg-[#0f172a] text-white p-6 hidden md:flex flex-col shrink-0 sticky top-0 h-screen">
                    <NavContent />
                  </aside>
                </>
              )}

              <main className={`flex-1 ${!isAuthPage ? 'px-4 py-6 md:px-10 md:py-10' : ''}`}>
                <ErrorBoundary>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={pathname}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      {children}
                    </motion.div>
                  </AnimatePresence>
                </ErrorBoundary>
              </main>
            </div>
          </SmoothScroll>
        </GlobalDataProvider>
      </body>
    </html>
  );
}

function NavItem({ href, icon, label, active }: { href: string, icon: React.ReactNode, label: string, active: boolean }) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${active
        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
        : "text-slate-400 hover:bg-white/5 hover:text-white"
        }`}
    >
      {icon} {label}
    </a>
  );
}
