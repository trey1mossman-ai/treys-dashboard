import { useState, useEffect } from 'react';
import { Palette, Sun, Moon, Sparkles } from 'lucide-react';

export type ThemeType = 'dark' | 'light' | 'exciting';

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeType>('dark');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load saved theme
    const saved = localStorage.getItem('app-theme') as ThemeType;
    if (saved) {
      setTheme(saved);
      applyTheme(saved);
    }
  }, []);

  const applyTheme = (newTheme: ThemeType) => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('theme-dark', 'theme-light', 'theme-exciting');
    
    // Add new theme class
    root.classList.add(`theme-${newTheme}`);
    
    // Save to localStorage
    localStorage.setItem('app-theme', newTheme);
    setTheme(newTheme);
  };

  const themes = [
    { 
      id: 'dark' as ThemeType, 
      name: 'Dark', 
      icon: Moon,
      description: 'Professional dark mode',
      colors: ['#0f172a', '#1e293b', '#00d4ff']
    },
    { 
      id: 'light' as ThemeType, 
      name: 'Light', 
      icon: Sun,
      description: 'Clean and bright',
      colors: ['#ffffff', '#f8fafc', '#0ea5e9']
    },
    { 
      id: 'exciting' as ThemeType, 
      name: 'Exciting', 
      icon: Sparkles,
      description: 'Vibrant and energetic',
      colors: ['#1a1625', '#7c3aed', '#f97316']
    }
  ];

  return (
    <div className="relative">
      {/* Theme Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-all"
        aria-label="Change theme"
      >
        <Palette className="w-5 h-5 text-gray-300" />
      </button>

      {/* Theme Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-gray-900 rounded-lg shadow-xl border border-gray-700 z-50">
            <div className="p-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase px-2 mb-2">
                Choose Theme
              </h3>
              
              {themes.map((t) => {
                const Icon = t.icon;
                const isActive = theme === t.id;
                
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      applyTheme(t.id);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full text-left p-3 rounded-lg transition-all
                      flex items-center gap-3 group
                      ${isActive 
                        ? 'bg-cyan-500/20 border border-cyan-500/30' 
                        : 'hover:bg-gray-800 border border-transparent'
                      }
                    `}
                  >
                    <Icon className={`
                      w-5 h-5 
                      ${isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-gray-300'}
                    `} />
                    
                    <div className="flex-1">
                      <div className={`font-medium ${isActive ? 'text-cyan-400' : 'text-gray-200'}`}>
                        {t.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t.description}
                      </div>
                    </div>
                    
                    {/* Color preview */}
                    <div className="flex gap-1">
                      {t.colors.map((color, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full border border-gray-600"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}