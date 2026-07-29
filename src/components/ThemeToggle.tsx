import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  isDarkMode: boolean;
  onChange: (isDark: boolean) => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDarkMode, onChange }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onChange(!isDarkMode)}
      className="p-2 px-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold transition-colors shrink-0"
      title="Chuyển đổi giao diện"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDarkMode ? "sun" : "moon"}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex items-center gap-1.5"
        >
          {isDarkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline whitespace-nowrap">Giao diện sáng</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline whitespace-nowrap">Giao diện tối</span>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
};
