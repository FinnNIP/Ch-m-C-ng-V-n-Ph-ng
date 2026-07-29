import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

interface SyncProgressBarProps {
  isLoading: boolean;
  isSyncing?: boolean;
}

export default function SyncProgressBar({ isLoading, isSyncing = false }: SyncProgressBarProps) {
  const active = isLoading || isSyncing;

  return (
    <AnimatePresence>
      {active && (
        <React.Fragment>
          {/* Top Edge Infinite Gradient Loading Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-slate-200/20 dark:bg-slate-800/20 overflow-hidden pointer-events-none"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{
                repeat: Infinity,
                duration: 1.4,
                ease: "easeInOut"
              }}
              className="w-1/2 h-full bg-gradient-to-r from-indigo-500 via-sky-400 via-emerald-400 to-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]"
            />
          </motion.div>

          {/* Floating Subtle Top Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] px-4 py-1.5 bg-slate-900/90 dark:bg-slate-900/95 text-white text-[11px] font-extrabold rounded-full shadow-2xl border border-indigo-500/40 backdrop-blur-md flex items-center gap-2 pointer-events-none"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />
            <span className="bg-gradient-to-r from-white via-indigo-100 to-sky-200 bg-clip-text text-transparent">
              {isSyncing ? "Đang đồng bộ Google Sheets..." : "Đang tải dữ liệu Google Sheets..."}
            </span>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}
