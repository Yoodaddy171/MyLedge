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
  Tag,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Wallet,
  ListTodo,
  Building2,
  Flag
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import UrgentTaskNotification from "@/components/UrgentTaskNotification";
import SmoothScroll from "@/components/SmoothScroll";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalDataProvider } from "@/contexts/GlobalDataContext";
import NotificationCenter from "@/components/NotificationCenter";
import type { AppUser } from '@/lib/types';

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Menu configuration
const menuConfig = {
  core: {
    label: 'Core',
    icon: <Wallet size={16} />,
    items: [
      { href: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
      { href: '/analytics', icon: <BarChart3 size={18} />, label: 'Analytics' },
      { href: '/transactions', icon: <Receipt size={18} />, label: 'Transactions' },
      { href: '/recurring', icon: <Repeat size={18} />, label: 'Recurring' },
      { href: '/budgets', icon: <Target size={18} />, label: 'Budgets' },
      { href: '/goals', icon: <Flag size={18} />, label: 'Goals' },
      { href: '/debts', icon: <TrendingDown size={18} />, label: 'Debts' },
      { href: '/investments', icon: <PieChart size={18} />, label: 'Investments' },
      { href: '/projects', icon: <TrendingUp size={18} />, label: 'Projects' },
    ]
  },
  productivity: {
    label: 'Productivity',
    icon: <ListTodo size={16} />,
    items: [
      { href: '/schedule', icon: <Calendar size={18} />, label: 'Schedule' },
      { href: '/tasks', icon: <CheckSquare size={16} />, label: 'Tasks' },
      { href: '/work', icon: <Briefcase size={18} />, label: 'Work Hub' },
    ]
  },
  management: {
    label: 'Management',
    icon: <Building2 size={16} />,
    items: [
      { href: '/banks', icon: <Landmark size={18} />, label: 'Banks' },
      { href: '/tags', icon: <Tag size={18} />, label: 'Tags' },
      { href: '/master', icon: <Settings size={18} />, label: 'Master Data' },
    ]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    core: true,
    productivity: true,
    management: true
  });
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === '/login';

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar_collapsed');
    const savedSections = localStorage.getItem('sidebar_sections');

    if (savedCollapsed !== null) {
      setIsSidebarCollapsed(savedCollapsed === 'true');
    }
    if (savedSections) {
      try {
        setExpandedSections(JSON.parse(savedSections));
      } catch (e) {
        // ignore parse error
      }
    }
  }, []);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('sidebar_sections', JSON.stringify(expandedSections));
  }, [expandedSections]);

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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isPathInSection = (section: keyof typeof menuConfig) => {
    return menuConfig[section].items.some(item => item.href === pathname);
  };

  const NavContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <>
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-3 mb-8 ${collapsed ? 'px-0' : 'px-2'}`}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 flex items-center justify-center p-1.5 shadow-2xl">
              <img src="/logo.png" alt="MyLedger" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">MyLedger</h1>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 flex items-center justify-center p-1.5 shadow-2xl">
            <img src="/logo.png" alt="MyLedger" className="w-full h-full object-contain" />
          </div>
        )}
        {!collapsed && <NotificationCenter />}
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto pr-1 no-scrollbar">
        {/* Core Section */}
        <NavSection
          sectionKey="core"
          config={menuConfig.core}
          expanded={expandedSections.core}
          onToggle={() => toggleSection('core')}
          pathname={pathname}
          collapsed={collapsed}
          hasActiveItem={isPathInSection('core')}
        />

        {/* Productivity Section */}
        <NavSection
          sectionKey="productivity"
          config={menuConfig.productivity}
          expanded={expandedSections.productivity}
          onToggle={() => toggleSection('productivity')}
          pathname={pathname}
          collapsed={collapsed}
          hasActiveItem={isPathInSection('productivity')}
        />

        {/* Management Section */}
        <NavSection
          sectionKey="management"
          config={menuConfig.management}
          expanded={expandedSections.management}
          onToggle={() => toggleSection('management')}
          pathname={pathname}
          collapsed={collapsed}
          hasActiveItem={isPathInSection('management')}
        />
      </nav>

      <div className={`mt-auto pt-6 border-t border-white/5 ${collapsed ? 'px-1' : ''}`}>
        {!collapsed ? (
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
        ) : (
          <a
            href="/profile"
            className="flex items-center justify-center p-2 bg-white/5 rounded-xl mb-3 border border-white/5 hover:bg-white/10 transition-all group"
            title="Profile"
          >
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden border border-white/10">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={16} className="text-slate-300" />
              )}
            </div>
          </a>
        )}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-xs font-medium transition-all group`}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
          {!collapsed && 'Sign Out'}
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
                          <NavContent collapsed={false} />
                        </motion.aside>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* DESKTOP SIDEBAR */}
                  <motion.aside
                    initial={false}
                    animate={{ width: isSidebarCollapsed ? 72 : 240 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="bg-[#0f172a] text-white p-4 hidden md:flex flex-col shrink-0 sticky top-0 h-screen relative"
                  >
                    <NavContent collapsed={isSidebarCollapsed} />

                    {/* Collapse Toggle Button */}
                    <button
                      onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                      className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center shadow-lg border border-slate-600 transition-colors z-10"
                      title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                      {isSidebarCollapsed ? (
                        <ChevronRight size={14} className="text-white" />
                      ) : (
                        <ChevronLeft size={14} className="text-white" />
                      )}
                    </button>
                  </motion.aside>
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

// NavSection Component with dropdown functionality
function NavSection({
  sectionKey,
  config,
  expanded,
  onToggle,
  pathname,
  collapsed,
  hasActiveItem
}: {
  sectionKey: string;
  config: { label: string; icon: React.ReactNode; items: { href: string; icon: React.ReactNode; label: string }[] };
  expanded: boolean;
  onToggle: () => void;
  pathname: string;
  collapsed: boolean;
  hasActiveItem: boolean;
}) {
  if (collapsed) {
    // Collapsed mode: show only icons with tooltip
    return (
      <div className="space-y-1 py-2">
        {config.items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`flex items-center justify-center p-2.5 rounded-lg transition-all ${
              pathname === item.href
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
            title={item.label}
          >
            {item.icon}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-2">
      {/* Section Header - Clickable Dropdown */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
          hasActiveItem && !expanded
            ? 'bg-white/5 text-white'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2">
          {config.icon}
          <span className="text-[10px] font-bold uppercase tracking-[0.15em]">{config.label}</span>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} />
        </motion.div>
      </button>

      {/* Section Items */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pl-2 pt-1 space-y-0.5">
              {config.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={pathname === item.href}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
