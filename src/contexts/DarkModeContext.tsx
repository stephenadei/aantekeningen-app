"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { DarkModeContextType } from '@/lib/interfaces';

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage - default to light mode if not set
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const savedTheme = localStorage.getItem('theme');
    // Only use dark mode if explicitly set to 'dark'
    // Don't auto-detect system preference on initial load
    return savedTheme === 'dark';
  });

  // Sync HTML class with state whenever isDarkMode changes
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    // Sync with the script in layout.tsx on mount
    const savedTheme = localStorage.getItem('theme');
    const shouldBeDark = savedTheme === 'dark';
    
    setIsDarkMode(shouldBeDark);
    
    // Listen for storage changes (e.g., from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const newTheme = e.newValue;
        const shouldBeDark = newTheme === 'dark';
        setIsDarkMode(shouldBeDark);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    
    // Update state
    setIsDarkMode(newMode);
    
    // Update localStorage
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    
    // Update HTML class immediately
    const html = document.documentElement;
    if (newMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
}
