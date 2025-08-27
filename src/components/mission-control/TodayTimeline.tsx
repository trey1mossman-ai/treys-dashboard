import { useState, useEffect } from 'react';
import { useMissionControlStore } from '@/stores/missionControlStore';
import type { AgendaItem } from '@/types/mission-control';
import { cn } from '@/lib/utils';

interface TodayTimelineProps {
  onItemClick: (item: AgendaItem) => void;
}

export function TodayTimeline({ onItemClick }: TodayTimelineProps) {
  const { agenda, markItemComplete, settings } = useMissionControlStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Group items by section
  const sections = {
    supplements: agenda.filter(item => item.source === 'supplements' && settings.display.show_supplements),
    workout: agenda.filter(item => item.source === 'workout' && settings.display.show_workout),
    tasks: agenda.filter(item => item.source === 'task' && settings.display.show_tasks),
    calendar: agenda.filter(item => item.source === 'calendar' && settings.display.show_calendar)
  };
  
  const handleToggleComplete = async (e: React.MouseEvent, item: AgendaItem) => {
    e.stopPropagation();
    
    const newStatus: 'done' | 'skipped' = item.status === 'done' ? 'skipped' : 'done';
    
    await markItemComplete({
      agenda_item_id: item.id,
      status: newStatus,
      completed_at: new Date().toISOString()
    });
  };
  
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  const isNow = (item: AgendaItem) => {
    const now = currentTime.getTime();
    const start = new Date(item.start_time).getTime();
    const end = item.end_time ? new Date(item.end_time).getTime() : start + 3600000; // Default 1 hour
    return now >= start && now <= end;
  };
  
  const isPast = (item: AgendaItem) => {
    const now = currentTime.getTime();
    const end = item.end_time ? new Date(item.end_time).getTime() : new Date(item.start_time).getTime() + 3600000;
    return now > end;
  };
  
  const renderSection = (title: string, items: AgendaItem[]) => {
    if (items.length === 0) return null;
    
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-mc-text-secondary uppercase tracking-wider">
          {title}
        </h3>
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              onClick={() => onItemClick(item)}
              className={cn(
                "mc-card p-3 cursor-pointer transition-all",
                "flex items-center gap-3",
                isNow(item) && "glow-live border-mc-accent-cyan",
                isPast(item) && !item.status.includes('done') && "opacity-60",
                item.status === 'done' && "opacity-40"
              )}
            >
              <button
                onClick={(e) => handleToggleComplete(e, item)}
                className={cn(
                  "mc-toggle",
                  item.status === 'done' && "checked"
                )}
                aria-label={item.status === 'done' ? 'Mark incomplete' : 'Mark complete'}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("mc-badge", `mc-badge-${item.source}`)}>
                    {item.source}
                  </span>
                  <span className="text-xs text-mc-text-muted">
                    {formatTime(item.start_time)}
                    {item.end_time && ` - ${formatTime(item.end_time)}`}
                  </span>
                </div>
                <p className={cn(
                  "text-sm font-medium mt-1",
                  item.status === 'done' && "line-through"
                )}>
                  {item.title}
                </p>
                {item.metadata.display_notes && (
                  <p className="text-xs text-mc-text-muted mt-1 truncate">
                    {item.metadata.display_notes}
                  </p>
                )}
              </div>
              
              {isNow(item) && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-mc-accent-cyan font-medium">NOW</span>
                  <div className="w-2 h-2 bg-mc-accent-cyan rounded-full animate-pulse" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const completionRate = Math.round(
    (agenda.filter(item => item.status === 'done').length / Math.max(agenda.length, 1)) * 100
  );
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-mc-border">
        <h2 className="text-xl font-semibold">Today</h2>
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-mc-text-secondary">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-mc-text-secondary">
              {completionRate}% complete
            </span>
            <div className="w-24 h-2 bg-mc-surface rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  completionRate === 100 ? "bg-mc-success glow-celebration" : "bg-mc-accent-cyan"
                )}
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {agenda.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-mc-text-muted">No items scheduled for today</p>
            <p className="text-sm text-mc-text-muted mt-2">
              Your agents haven't posted today's plan yet
            </p>
          </div>
        ) : (
          <>
            {renderSection('Supplements', sections.supplements)}
            {renderSection('Workout', sections.workout)}
            {renderSection('Top Tasks', sections.tasks)}
            {renderSection('Calendar', sections.calendar)}
          </>
        )}
      </div>
    </div>
  );
}