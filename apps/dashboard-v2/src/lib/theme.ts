import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('sinkroo-theme');
    return (saved as Theme) || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') root.classList.add('light');
    else root.classList.remove('light');
    localStorage.setItem('sinkroo-theme', theme);
  }, [theme]);

  const cycle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  return { theme, setTheme, cycle };
}
