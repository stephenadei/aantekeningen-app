"use client";

import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '@/contexts/DarkModeContext';

export default function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        <Sun className="h-5 w-5 text-yellow-500" />
      ) : (
        <Moon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
      )}
    </button>
  );
}
