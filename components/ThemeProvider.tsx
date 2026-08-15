'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'dark' | 'light';

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = 'safineh-theme';

/**
 * این تابع تم را روی تگ HTML اعمال می‌کند.
 * هم به صورت dataset (برای CSS معمولی) و هم به صورت class (برای Tailwind)
 */
function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  
  // ۱. اعمال به صورت دیتاست: [data-theme='dark']
  root.dataset.theme = theme;
  
  // ۲. اعمال به صورت کلاس: .dark یا .light
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // مقدار اولیه را از localStorage می‌گیریم یا سیستم کاربر
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // پیدا کردن تم ترجیحی هنگام لود شدن کامپوننت (Client-side)
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const preferredTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    
    const initialTheme = savedTheme || preferredTheme;
    
    setThemeState(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {/* 
        استفاده از mounted باعث می‌شود تا زمانی که تم دقیقاً شناسایی نشده، 
        محتوا با استایل اشتباه نمایش داده نشود (جلوگیری از پرش رنگ)
      */}
      <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
