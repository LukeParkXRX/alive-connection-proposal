/**
 * useDarkMode — 웹 다크모드 훅
 * localStorage 영속 + 시스템 설정 감지
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'alive-dark-mode';

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(STORAGE_KEY, String(isDark));
  }, [isDark]);

  const toggle = () => setIsDark((d) => !d);

  return { isDark, toggle, setIsDark };
}
