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
    // Smooth scroll to section
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-40",
      "bg-background/95 backdrop-blur-sm",
      "border-t border-border",
      "px-2 py-2"
    )}>
      <div className="flex items-center justify-around">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={cn(
              "flex flex-col items-center gap-1",
              "min-w-[64px] py-2 px-3 rounded-lg",
              "transition-all duration-200",
              "hover:bg-muted/50",
              activeSection === item.id && "bg-muted"
            )}
            aria-label={item.label}
          >
            <div className={cn(
              "transition-colors",
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