import { Calendar, CheckSquare, Utensils, Pill } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface BottomNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const navItems: NavItem[] = [
  { id: 'agenda', label: 'Agenda', icon: <Calendar className="w-5 h-5" />, color: 'text-violet-500' },
  { id: 'todos', label: 'To-Do', icon: <CheckSquare className="w-5 h-5" />, color: 'text-amber-500' },
  { id: 'food', label: 'Food', icon: <Utensils className="w-5 h-5" />, color: 'text-emerald-500' },
  { id: 'supplements', label: 'Supps', icon: <Pill className="w-5 h-5" />, color: 'text-sky-500' }
];

export function BottomNav({ activeSection, onSectionChange }: BottomNavProps) {
  const handleNavClick = (sectionId: string) => {
    onSectionChange(sectionId);
    // Smooth scroll to section with offset for sticky header
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -80; // Account for sticky header
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-40",
      "bg-background/95 backdrop-blur-sm",
      "border-t border-border",
      "px-2",
      "pb-[env(safe-area-inset-bottom)]" // iOS safe area
    )}>
      <div className="flex items-center justify-around py-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={cn(
              "flex flex-col items-center gap-1",
              "min-w-[68px] min-h-[44px] py-2 px-3 rounded-lg", // 44px min tap target
              "transition-all duration-200",
              "hover:bg-muted/50 active:scale-95",
              activeSection === item.id && "bg-muted"
            )}
            aria-label={item.label}
          >
            <div className={cn(
              "transition-colors text-lg", // Larger icons
              activeSection === item.id ? item.color : "text-muted-foreground"
            )}>
              {item.icon}
            </div>
            <span className={cn(
              "text-xs font-medium",
              activeSection === item.id ? item.color : "text-muted-foreground"
            )}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}