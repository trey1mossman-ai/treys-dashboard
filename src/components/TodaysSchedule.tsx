import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Bot, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface ScheduleItem {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  type: 'calendar' | 'ai-scheduled' | 'task';
  source: 'google-calendar' | 'ai-assistant' | 'manual' | 'outlook';
  status?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  description?: string;
  location?: string;
  attendees?: string[];
  metadata?: {
    meetingUrl?: string;
    organizer?: string;
    sessionId?: string;
    aiGenerated?: boolean;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  location?: string;
  description?: string;
  attendees?: string[];
  meetingUrl?: string;
  organizer?: string;
}

interface AgendaItem {
  id: string;
  title: string;
  source: string;
  start_time: string;
  end_time?: string;
  status: string;
  metadata?: any;
  display_notes?: string;
}

interface TodaysScheduleProps {
  calendarEvents?: CalendarEvent[];
  className?: string;
}

export function TodaysSchedule({ calendarEvents = [], className }: TodaysScheduleProps) {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load today's agenda items from the API
  const loadAgendaItems = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/data/agenda?date=${today}`);
      
      if (!response.ok) {
        throw new Error('Failed to load agenda items');
      }
      
      const data = await response.json();
      
      // Convert agenda items to schedule format
      const agendaScheduleItems: ScheduleItem[] = data.items.map((item: AgendaItem) => ({
        id: item.id,
        title: item.title,
        startTime: item.start_time,
        endTime: item.end_time,
        type: item.source === 'ai-assistant' ? 'ai-scheduled' : 'task',
        source: item.source as any,
        status: item.status,
        description: item.display_notes,
        metadata: {
          ...item.metadata,
          aiGenerated: item.source === 'ai-assistant'
        }
      }));
      
      return agendaScheduleItems;
    } catch (err) {
      console.error('Failed to load agenda items:', err);
      return [];
    }
  };

  // Load schedule function
  const loadSchedule = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load agenda items
      const agendaItems = await loadAgendaItems();
      
      // Convert calendar events to schedule format
      const calendarScheduleItems: ScheduleItem[] = calendarEvents
        .filter(event => isToday(parseISO(event.startTime)))
        .map(event => ({
          id: event.id,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          type: 'calendar' as const,
          source: 'google-calendar' as const,
          status: event.status === 'confirmed' ? 'pending' as const : 
                  ['pending', 'in-progress', 'completed', 'cancelled'].includes(event.status) 
                    ? event.status as 'pending' | 'in-progress' | 'completed' | 'cancelled'
                    : 'pending' as const,
          description: event.description,
          location: event.location,
          attendees: event.attendees,
          metadata: {
            meetingUrl: event.meetingUrl,
            organizer: event.organizer
          }
        }));
      
      // Combine and sort by start time
      const allItems = [...agendaItems, ...calendarScheduleItems];
      allItems.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      setScheduleItems(allItems);
    } catch (err) {
      setError('Failed to load schedule');
      console.error('Schedule loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and refresh when calendar events change
  useEffect(() => {
    loadSchedule();
  }, [calendarEvents]);
  
  // Listen for schedule updates from AI assistant
  useEffect(() => {
    const handleScheduleUpdate = () => {
      console.log('Schedule updated, refreshing...');
      loadSchedule();
    };
    
    window.addEventListener('schedule-updated', handleScheduleUpdate);
    
    return () => {
      window.removeEventListener('schedule-updated', handleScheduleUpdate);
    };
  }, []);

  const getItemIcon = (item: ScheduleItem) => {
    if (item.type === 'calendar') return <Calendar className="w-4 h-4" />;
    if (item.type === 'ai-scheduled') return <Bot className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in-progress': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'cancelled': return <Circle className="w-4 h-4 text-red-500" />;
      default: return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSourceBadge = (source: string) => {
    const badges = {
      'ai-assistant': { label: 'AI', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
      'google-calendar': { label: 'Cal', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      'manual': { label: 'Manual', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
      'outlook': { label: 'Outlook', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' }
    };

    const badge = badges[source as keyof typeof badges] || badges.manual;
    
    return (
      <span className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        badge.color
      )}>
        {badge.label}
      </span>
    );
  };

  const formatTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'h:mm a');
    } catch {
      return dateString;
    }
  };

  const getTimeDisplay = (item: ScheduleItem) => {
    const start = formatTime(item.startTime);
    if (item.endTime) {
      const end = formatTime(item.endTime);
      return `${start} - ${end}`;
    }
    return start;
  };

  if (loading) {
    return (
      <div className={cn('bg-card rounded-lg p-6', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Today's Schedule</h2>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-4 h-4 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('bg-card rounded-lg p-6', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Today's Schedule</h2>
        </div>
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      </div>
    );
  }

  const now = new Date();
  const upcomingItems = scheduleItems.filter(item => 
    new Date(item.startTime) >= now || item.status === 'in-progress'
  );
  const todayItems = scheduleItems.filter(item => isToday(parseISO(item.startTime)));

  return (
    <div className={cn('bg-card rounded-lg p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Today's Schedule</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          {todayItems.length} items today
        </div>
      </div>

      {todayItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No events scheduled for today</p>
          <p className="text-xs mt-1">Your schedule is clear!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todayItems.map((item) => {
            const isUpcoming = upcomingItems.includes(item);
            const isPast = new Date(item.startTime) < now && item.status !== 'in-progress';
            
            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                  isUpcoming && item.status === 'in-progress' 
                    ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' 
                    : isPast 
                    ? 'bg-muted/30 opacity-60' 
                    : 'bg-muted/50 hover:bg-muted/70'
                )}
              >
                {/* Time & Status */}
                <div className="flex flex-col items-center min-w-[60px]">
                  <div className="text-xs font-medium text-muted-foreground">
                    {getTimeDisplay(item)}
                  </div>
                  <div className="mt-1">
                    {getStatusIcon(item.status)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <div className="mt-0.5 text-muted-foreground">
                      {getItemIcon(item)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        'font-medium text-sm leading-tight',
                        isPast && item.status !== 'completed' && 'line-through text-muted-foreground'
                      )}>
                        {item.title}
                      </h3>
                      
                      {/* Metadata */}
                      <div className="flex items-center gap-2 mt-1">
                        {getSourceBadge(item.source)}
                        {item.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{item.location}</span>
                          </div>
                        )}
                        {item.attendees && item.attendees.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>{item.attendees.length}</span>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick stats */}
      <div className="mt-4 pt-4 border-t border-border flex justify-between text-xs text-muted-foreground">
        <span>{upcomingItems.length} upcoming</span>
        <span>{todayItems.filter(i => i.status === 'completed').length} completed</span>
      </div>
    </div>
  );
}