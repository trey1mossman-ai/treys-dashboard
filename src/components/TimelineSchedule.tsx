import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Bot, AlertCircle, Video } from 'lucide-react';
import { format, isToday, parseISO, isBefore, isAfter } from 'date-fns';
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

interface TimelineScheduleProps {
  calendarEvents?: CalendarEvent[];
  scheduleItems?: any[];
  className?: string;
}

export function TimelineSchedule({ calendarEvents = [], scheduleItems: propScheduleItems = [], className }: TimelineScheduleProps) {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAgendaItems = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/data/agenda?date=${today}`);
      
      if (!response.ok) {
        throw new Error('Failed to load agenda items');
      }
      
      const data = await response.json();
      
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

  const loadSchedule = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const agendaItems = await loadAgendaItems();
      
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

  useEffect(() => {
    // Combine prop schedule items with loaded items
    if (propScheduleItems.length > 0) {
      const mappedScheduleItems = propScheduleItems.map(item => ({
        id: item.id,
        title: item.title,
        startTime: item.startTime,
        endTime: item.endTime,
        type: item.type || 'task' as const,
        source: 'manual' as const,
        status: item.status || 'pending',
        description: item.description,
        location: item.location
      }));
      setScheduleItems(prev => [...mappedScheduleItems, ...prev]);
    }
    loadSchedule();
  }, [calendarEvents, propScheduleItems]);
  
  useEffect(() => {
    const handleScheduleUpdate = () => {
      console.log('Schedule updated, refreshing timeline...');
      loadSchedule();
    };
    
    window.addEventListener('schedule-updated', handleScheduleUpdate);
    
    return () => {
      window.removeEventListener('schedule-updated', handleScheduleUpdate);
    };
  }, []);

  const getItemIcon = (item: ScheduleItem) => {
    if (item.type === 'calendar') return <Calendar className="w-3 h-3" />;
    if (item.type === 'ai-scheduled') return <Bot className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };

  const getItemStatus = (item: ScheduleItem) => {
    const now = new Date();
    const startTime = new Date(item.startTime);
    const endTime = item.endTime ? new Date(item.endTime) : null;

    if (item.status === 'completed') return 'completed';
    if (item.status === 'cancelled') return 'cancelled';
    if (item.status === 'in-progress') return 'active';
    
    if (endTime && isBefore(endTime, now)) return 'completed';
    if (isBefore(startTime, now) && (!endTime || isAfter(endTime, now))) return 'active';
    
    return 'pending';
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

  const getSourceColor = (source: string) => {
    const colors = {
      'ai-assistant': 'text-purple-600 dark:text-purple-400',
      'google-calendar': 'text-blue-600 dark:text-blue-400',
      'manual': 'text-gray-600 dark:text-gray-400',
      'outlook': 'text-orange-600 dark:text-orange-400'
    };
    return colors[source as keyof typeof colors] || colors.manual;
  };

  if (loading) {
    return (
      <div className={cn('mobile-card mobile-p', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Today's Timeline</h2>
        </div>
        <div className="timeline-mobile">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="timeline-item-mobile">
              <div className="timeline-dot-mobile mobile-skeleton" />
              <div className="mobile-skeleton h-4 w-3/4 mb-2 rounded" />
              <div className="mobile-skeleton h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('mobile-card mobile-p', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Today's Timeline</h2>
        </div>
        <div className="error-state">
          <AlertCircle className="w-4 h-4 inline-block mr-2" />
          {error}
        </div>
      </div>
    );
  }

  const todayItems = scheduleItems.filter(item => isToday(parseISO(item.startTime)));

  if (todayItems.length === 0) {
    return (
      <div className={cn('mobile-card mobile-p', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Today's Timeline</h2>
        </div>
        <div className="text-center mobile-py">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No scheduled items today</p>
          <p className="text-xs text-muted-foreground mt-1">Your day is completely free!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('mobile-card mobile-p', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Today's Timeline</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          {todayItems.length} {todayItems.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      <div className="timeline-mobile mobile-scroll swipeable" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {todayItems.map((item, index) => {
          const status = getItemStatus(item);
          const isLast = index === todayItems.length - 1;
          
          return (
            <div
              key={item.id}
              className={cn(
                'timeline-item-mobile touch-button',
                !isLast && 'mb-4',
                'hover:bg-muted/30 active:bg-muted/50 cursor-pointer transition-all duration-200'
              )}
              onClick={() => {
                // Handle timeline item click - could open details or join meeting
                if (item.metadata?.meetingUrl) {
                  window.open(item.metadata.meetingUrl, '_blank');
                }
              }}
              onTouchStart={() => {
                // Add haptic feedback for mobile
                if ('vibrate' in navigator) {
                  navigator.vibrate(50);
                }
              }}
            >
              {/* Timeline dot with status */}
              <div 
                className={cn(
                  'timeline-dot-mobile',
                  status === 'completed' && 'completed',
                  status === 'active' && 'active',
                  status === 'cancelled' && 'border-red-500 bg-red-500'
                )}
              />

              {/* Content */}
              <div className="min-w-0 flex-1">
                {/* Time badge */}
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground mb-2">
                  <Clock className="w-3 h-3" />
                  {getTimeDisplay(item)}
                </div>

                {/* Title and source */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className={cn(
                    'font-medium text-sm leading-tight flex-1 min-w-0',
                    status === 'completed' && 'line-through text-muted-foreground',
                    status === 'cancelled' && 'line-through text-red-500'
                  )}>
                    {item.title}
                  </h3>
                  
                  <div className={cn(
                    'flex items-center gap-1 text-xs shrink-0',
                    getSourceColor(item.source)
                  )}>
                    {getItemIcon(item)}
                  </div>
                </div>

                {/* Description */}
                {item.description && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {item.description}
                  </p>
                )}

                {/* Metadata row */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {item.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">{item.location}</span>
                    </div>
                  )}
                  
                  {item.attendees && item.attendees.length > 0 && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{item.attendees.length}</span>
                    </div>
                  )}
                  
                  {item.metadata?.meetingUrl && (
                    <div className="flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      <span>Meeting</span>
                    </div>
                  )}
                  
                  {status === 'active' && (
                    <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                      <AlertCircle className="w-3 h-3" />
                      <span>Now</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-4 border-t border-border flex justify-between text-xs text-muted-foreground">
        <span>
          {todayItems.filter(i => getItemStatus(i) === 'active').length} active
        </span>
        <span>
          {todayItems.filter(i => getItemStatus(i) === 'completed').length} completed
        </span>
        <span>
          {todayItems.filter(i => getItemStatus(i) === 'pending').length} upcoming
        </span>
      </div>
    </div>
  );
}