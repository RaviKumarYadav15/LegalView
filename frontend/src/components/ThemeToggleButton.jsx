import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggleButton({ isDark, setIsDark }) {
  return (
    <button 
      onClick={() => setIsDark(!isDark)}
      className="cursor-pointer flex items-center gap-3 bg-panel/60 backdrop-blur-md border border-line px-4 py-2 text-sm font-medium text-muted hover:text-ink hover:bg-panel-hover rounded-full transition-all shadow-md"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      {isDark ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
