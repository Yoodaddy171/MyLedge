'use client';

import { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { markAlertAsRead, markAllAlertsAsRead, deleteAlert } from '@/lib/budget-alert-processor';
import { toast } from 'sonner';

export default function NotificationCenter() {
  const { budgetAlerts, refreshData } = useGlobalData();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const unreadCount = budgetAlerts?.filter(alert => !alert.is_read).length || 0;

  const handleMarkAsRead = async (alertId: any) => {
    try {
      await markAlertAsRead(alertId);
      await refreshData();
    } catch (error) {
      console.error('Error marking alert as read:', error);
      // Silently fail if budget alerts feature is not available
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await (await import('@/lib/supabase')).supabase.auth.getUser();
      if (!user) return;

      await markAllAlertsAsRead(user.id);
      await refreshData();
      toast.success('All alerts marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      // Silently fail if budget alerts feature is not available
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (alertId: any) => {
    try {
      await deleteAlert(alertId);
      await refreshData();
      toast.success('Alert deleted');
    } catch (error) {
      console.error('Error deleting alert:', error);
      // Silently fail if budget alerts feature is not available
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                    Notifications
                  </h3>
                  {budgetAlerts && budgetAlerts.length > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      disabled={loading || unreadCount === 0}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* Alerts List */}
              <div className="max-h-[400px] overflow-y-auto">
                {!budgetAlerts || budgetAlerts.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500 font-bold">No notifications</p>
                    <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {budgetAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-4 hover:bg-slate-50 transition-colors ${
                          !alert.is_read ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div
                            className={`p-2 rounded-lg shrink-0 ${
                              alert.threshold_percent >= 100
                                ? 'bg-red-100 text-red-600'
                                : 'bg-amber-100 text-amber-600'
                            }`}
                          >
                            <AlertTriangle size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-bold text-slate-900">
                                {alert.threshold_percent >= 100 ? 'Budget Exceeded' : 'Budget Alert'}
                              </p>
                              <button
                                onClick={() => handleDelete(alert.id)}
                                className="text-slate-400 hover:text-slate-600 shrink-0"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{alert.message}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] text-slate-400 font-bold">
                                {formatDate(alert.triggered_at)}
                              </span>
                              {!alert.is_read && (
                                <button
                                  onClick={() => handleMarkAsRead(alert.id)}
                                  className="text-[9px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {budgetAlerts && budgetAlerts.length > 0 && (
                <div className="p-3 border-t border-slate-100 bg-slate-50">
                  <a
                    href="/budgets"
                    className="block text-center text-xs text-blue-600 hover:text-blue-700 font-bold uppercase tracking-widest"
                    onClick={() => setIsOpen(false)}
                  >
                    View All Budgets →
                  </a>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
