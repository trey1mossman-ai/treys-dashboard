import { Calendar, Settings, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  onSettingsClick: () => void;
}

export function MobileHeader({ onSettingsClick }: MobileHeaderProps) {
  const isOnline = useOnlineStatus();
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <header className={cn(
      "sticky top-0 z-40",
      "bg-background/95 backdrop-blur-sm",
      "border-b border-border",
      "px-4 py-3"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Daily Dashboard
          </h1>
          {!isOnline && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30">
              <WifiOff className="w-3 h-3 text-yellow-500" />
              <span className="text-xs text-yellow-500 font-medium">Offline</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{dateString}</span>
          </div>
          <button
            onClick={onSettingsClick}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}