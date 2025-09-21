import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, AlertCircle, X, ExternalLink, RefreshCw } from 'lucide-react';
import '../styles/widget-effects.css';
import { format, isToday, isTomorrow, parseISO, differenceInMinutes } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  attendees?: string[];
  isAllDay?: boolean;
  color?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  originalData?: any;
}

export function CalendarWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch events function - moved outside useEffect for reusability
  const fetchEvents = async () => {
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8788' 
        : '';
      
      console.log('📅 Fetching calendar from:', `${apiUrl}/api/webhook/calendar`);
      const response = await fetch(`${apiUrl}/api/webhook/calendar`);
      const data = await response.json();
      console.log('📅 Calendar data received:', data);
      
      if (data.events && Array.isArray(data.events)) {
        // Map n8n format to our format if needed
        const mappedEvents = data.events.map((event: any) => ({
          id: event.id,
          title: event.title || event.summary || 'Untitled',
          start: event.start,
          end: event.end,
          location: event.location || '',
          description: event.description || '',
          attendees: event.attendees ? 
            (Array.isArray(event.attendees) ? 
              event.attendees.map((a: any) => 
                typeof a === 'string' ? a : 
                a.displayName || a.email || a.name
              ) : 
              []) : [],
          status: event.status || 'confirmed',
          isAllDay: event.allDay || event.isAllDay || false,
          // Keep original data for popup
          originalData: event
        }));
        
        // Sort events by start time
        const sortedEvents = mappedEvents.sort((a: CalendarEvent, b: CalendarEvent) => 
          new Date(a.start).getTime() - new Date(b.start).getTime()
        );
        setEvents(sortedEvents);
        setError(null);
        console.log('📅 Calendar events set:', sortedEvents.length, 'events');
      } else {
        setEvents([]);
        console.log('📅 No calendar events found');
      }
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
      setError('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const triggerCalendarRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 Triggering calendar refresh webhook...');
      const proxyUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? '/api/webhook/calendar'
        : 'http://localhost:3000/api/webhook/calendar';

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'sync', trigger: 'manual_refresh', days: 7 })
      });
      
      if (response.ok) {
        console.log('✅ Calendar refresh webhook triggered successfully');
        // Wait a moment for the webhook to process, then fetch updated data
        setTimeout(() => {
          fetchEvents();
        }, 2000);
      } else {
        console.error('❌ Calendar refresh webhook failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Calendar refresh webhook error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch calendar events on mount and every 30 seconds
  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const getEventTimeLabel = (event: CalendarEvent) => {
    if (!event.start) {
      return 'No time specified';
    }
    
    const startDate = parseISO(event.start);
    const endDate = event.end ? parseISO(event.end) : null;
    
    if (event.isAllDay) {
      return 'All Day';
    }
    
    const now = new Date();
    const minutesUntil = differenceInMinutes(startDate, now);
    
    if (minutesUntil > 0 && minutesUntil <= 15) {
      return `Starting in ${minutesUntil} min`;
    }
    
    if (isToday(startDate)) {
      if (endDate) {
        return `Today, ${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
      }
      return `Today, ${format(startDate, 'h:mm a')}`;
    }
    
    if (isTomorrow(startDate)) {
      return `Tomorrow, ${format(startDate, 'h:mm a')}`;
    }
    
    return format(startDate, 'MMM d, h:mm a');
  };

  const getEventBorderStyle = (event: CalendarEvent) => {
    if (event.status === 'cancelled') {
      return {
        borderLeftColor: 'var(--red-500)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)'
      };
    }
    if (event.status === 'tentative') {
      return {
        borderLeftColor: 'var(--amber-500)',
        backgroundColor: 'rgba(245, 158, 11, 0.05)'
      };
    }
    return {
      borderLeftColor: 'var(--accent-500)',
      backgroundColor: 'rgba(96, 165, 250, 0.05)'
    };
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Upcoming Events</h3>
        </div>
        <div className="text-muted-foreground text-sm">Loading calendar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Upcoming Events</h3>
        </div>
        <div className="text-muted-foreground text-sm">{error}</div>
      </div>
    );
  }

  // Get next event that's about to start
  const upcomingEvent = events.find(e => {
    if (!e.start) return false;
    try {
      const minutesUntil = differenceInMinutes(parseISO(e.start), new Date());
      return minutesUntil > 0 && minutesUntil <= 15;
    } catch {
      return false;
    }
  });

  return (
    <div className="widget-container" style={{ 
      borderRadius: '12px',
      fontFamily: 'Georgia, serif',
      background: 'var(--card-bg)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      overflow: 'hidden'
    }}>
      <div className="widget-header" style={{ 
        background: 'var(--panel-bg)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Calendar className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <h3 className="text-lg font-semibold text-cyan-400 truncate" style={{ fontFamily: 'Georgia, serif' }}>Upcoming Events</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={triggerCalendarRefresh}
            disabled={isRefreshing}
            className="w-12 h-12 flex items-center justify-center rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 disabled:opacity-50 transition-all"
            title="Refresh calendar"
          >
            <RefreshCw className={`w-5 h-5 text-cyan-400 ${
              isRefreshing ? 'animate-spin' : ''
            }`} />
          </button>
          <span className="text-sm px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            {events.length}
          </span>
        </div>
      </div>
      
      {upcomingEvent && (
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-amber-500/30" 
             style={{ padding: 'clamp(12px, 3vw, 16px)' }}>
          <div className="flex items-start gap-2 sm:gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 animate-pulse flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-amber-900 dark:text-amber-100 truncate" 
                    style={{ 
                      fontFamily: 'Georgia, serif',
                      fontSize: 'clamp(13px, 3vw, 14px)'
                    }}>
                {upcomingEvent.title}
              </div>
              <div className="text-amber-700 dark:text-amber-200 mt-1" style={{
                fontSize: 'clamp(11px, 2.5vw, 12px)'
              }}>
                Starting soon! • {getEventTimeLabel(upcomingEvent)}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="widget-content" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {events.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-base mb-2">No upcoming events</p>
            <p className="text-sm opacity-75">Events will appear here when your n8n workflow sends them</p>
          </div>
        ) : (
          <div className="space-y-1">
            {events.slice(0, 10).map((event, index) => (
              <div
                key={event.id}
                className={`widget-item ${
                  event.status === 'cancelled' ? 'opacity-60' : ''
                } ${
                  event.status === 'confirmed' ? 'border-l-4 border-l-green-400 bg-green-500/5' :
                  event.status === 'tentative' ? 'border-l-4 border-l-yellow-400 bg-yellow-500/5' :
                  event.status === 'cancelled' ? 'border-l-4 border-l-red-400 bg-red-500/5' : ''
                }`}
                onClick={() => setSelectedEvent(event)}
              >
                <div className="widget-item-content">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`font-semibold truncate ${
                        event.status === 'cancelled' 
                          ? 'line-through text-gray-400' 
                          : 'text-white'
                      }`} style={{ fontFamily: 'Georgia, serif' }}>
                        {event.title}
                      </span>
                    </div>
                    {event.status === 'tentative' && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full border border-yellow-500/30">
                        Tentative
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-gray-300 text-sm" style={{ fontFamily: 'Georgia, serif' }}>
                        {getEventTimeLabel(event)}
                      </span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300 text-sm truncate" style={{ fontFamily: 'Georgia, serif' }}>
                          {event.location.startsWith('http') ? 'Video Meeting' : event.location}
                        </span>
                      </div>
                    )}
                    
                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span className="text-gray-400 text-sm" style={{ fontFamily: 'Georgia, serif' }}>
                          {event.attendees.length === 1 ? '1 attendee' : `${event.attendees.length} attendees`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Calendar Event Popup Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="card-enhanced w-full max-w-3xl max-h-[95vh] sm:max-h-[85vh] overflow-hidden" style={{
            background: 'var(--card-bg)',
            border: '2px solid var(--accent-500)',
            borderRadius: 'var(--radius-card)',
            fontFamily: 'Georgia, serif',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            maxWidth: '95vw'
          }}>
            <div className="card-header" style={{
              background: 'var(--panel-bg)',
              borderBottom: '2px solid var(--accent-500/30)',
              padding: 'clamp(12px, 3vw, 20px)'
            }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-accent-500 flex-shrink-0" />
                  <h3 className="enhanced-text truncate" style={{ 
                    fontSize: 'clamp(16px, 4vw, 20px)', 
                    fontWeight: 600, 
                    color: 'var(--accent-500)',
                    fontFamily: 'Georgia, serif'
                  }}>Event Details</h3>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="touch-target flex items-center justify-center p-2 hover:bg-accent-500/20 rounded-lg transition-colors flex-shrink-0"
                  style={{ 
                    border: '1px solid var(--accent-500/30)',
                    minWidth: '44px',
                    minHeight: '44px'
                  }}
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-accent-500" />
                </button>
              </div>
            </div>
            
            <div className="card-content overflow-y-auto" style={{ 
              padding: 'clamp(12px, 3vw, 20px)',
              maxHeight: 'calc(95vh - 80px)'
            }}>
              {/* Event Header */}
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-text-muted" style={{ fontFamily: 'Georgia, serif' }}>Title</label>
                  <div className="font-semibold text-accent-400 mt-1 break-words" style={{ 
                    fontFamily: 'Georgia, serif',
                    fontSize: 'clamp(14px, 4vw, 18px)'
                  }}>
                    {selectedEvent.title}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div className="card-responsive" style={{ padding: 'clamp(10px, 2vw, 12px)' }}>
                    <label className="text-xs sm:text-sm font-medium text-text-muted flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}>
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      Start Time
                    </label>
                    <div className="font-medium text-text-primary mt-1" style={{ 
                      fontFamily: 'Georgia, serif',
                      fontSize: 'clamp(12px, 3vw, 14px)'
                    }}>
                      {getEventTimeLabel(selectedEvent)}
                    </div>
                  </div>
                  {selectedEvent.location && (
                    <div className="card-responsive" style={{ padding: 'clamp(10px, 2vw, 12px)' }}>
                      <label className="text-xs sm:text-sm font-medium text-text-muted flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}>
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        Location
                      </label>
                      <div className="font-medium text-text-primary mt-1 break-words" style={{ 
                        fontFamily: 'Georgia, serif',
                        fontSize: 'clamp(12px, 3vw, 14px)'
                      }}>
                        {selectedEvent.originalData?.htmlLink || selectedEvent.originalData?.videoLink ? (
                          <a 
                            href={selectedEvent.originalData.htmlLink || selectedEvent.originalData.videoLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            {selectedEvent.location.startsWith('http') ? 'Video Meeting' : selectedEvent.location}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        ) : (
                          selectedEvent.location
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {selectedEvent.status === 'tentative' && (
                    <div className="text-sm px-3 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full">
                      <span className="text-amber-700 dark:text-amber-300 font-medium" style={{ fontFamily: 'Georgia, serif' }}>Tentative</span>
                    </div>
                  )}
                  {selectedEvent.status === 'cancelled' && (
                    <div className="text-sm px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-full">
                      <span className="text-red-700 dark:text-red-300 font-medium" style={{ fontFamily: 'Georgia, serif' }}>Cancelled</span>
                    </div>
                  )}
                  <div className={`px-3 py-2 rounded-full border ${
                    selectedEvent.status === 'confirmed' 
                      ? 'bg-green-500/20 border-green-500/30 text-green-400' 
                      : 'bg-white/5 border-white/10 text-text-muted'
                  }`}>
                    <span className="text-sm font-medium" style={{ fontFamily: 'Georgia, serif' }}>
                      {selectedEvent.status || 'Confirmed'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Attendees */}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="border-t-2 border-accent-500/20 pt-4 mb-4">
                  <label className="text-sm font-medium text-text-muted mb-3 flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}>
                    <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    Attendees ({selectedEvent.attendees.length})
                  </label>
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedEvent.attendees.slice(0, 6).map((attendee, idx) => (
                        <div key={idx} className="card-responsive" style={{ 
                          padding: 'var(--space-3)',
                          background: 'var(--panel-bg)',
                          border: '1px solid var(--border-default)',
                          fontFamily: 'Georgia, serif',
                          fontSize: 'clamp(11px, 3vw, 12px)'
                        }}>
                          {attendee}
                        </div>
                      ))}
                    </div>
                    {selectedEvent.attendees.length > 6 && (
                      <div className="text-xs text-text-muted" style={{ fontFamily: 'Georgia, serif' }}>
                        +{selectedEvent.attendees.length - 6} more attendees
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Description */}
              {selectedEvent.description && (
                <div className="border-t-2 border-accent-500/20 pt-4">
                  <label className="text-sm font-medium text-text-muted mb-3 flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}>
                    Description
                  </label>
                  <div className="card-responsive mt-3" style={{ 
                    padding: 'var(--space-4)',
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--border-default)'
                  }}>
                    <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                      {selectedEvent.description}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Links */}
              {(selectedEvent.originalData?.htmlLink || selectedEvent.originalData?.videoLink || selectedEvent.location?.startsWith('http')) && (
                <div className="mt-4 border-t-2 border-accent-500/20 pt-4">
                  <label className="text-sm font-medium text-text-muted mb-3" style={{ fontFamily: 'Georgia, serif' }}>Actions</label>
                  <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {selectedEvent.originalData?.htmlLink && (
                      <a
                        href={selectedEvent.originalData.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="touch-target flex items-center justify-center gap-2 px-4 py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-lg transition-colors font-medium"
                        style={{ 
                          fontFamily: 'Georgia, serif',
                          fontSize: 'clamp(13px, 3vw, 14px)',
                          minHeight: '44px'
                        }}
                      >
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        View in Calendar
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      </a>
                    )}
                    {(selectedEvent.originalData?.videoLink || selectedEvent.location?.startsWith('http')) && (
                      <a
                        href={selectedEvent.originalData?.videoLink || selectedEvent.location}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="touch-target flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                        style={{ 
                          fontFamily: 'Georgia, serif',
                          fontSize: 'clamp(13px, 3vw, 14px)',
                          minHeight: '44px'
                        }}
                      >
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        Join Meeting
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
              )}
              
              {/* Additional Data */}
              {selectedEvent.originalData && (
                <div className="mt-4 border-t border-border pt-4">
                  <label className="text-sm font-medium text-muted-foreground" style={{ fontFamily: 'Georgia, serif' }}>Event Information</label>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs">
                    <div className="card-responsive" style={{ 
                      padding: 'var(--space-2)',
                      background: 'var(--panel-bg)',
                      border: '1px solid var(--border-default)',
                      fontFamily: 'Georgia, serif'
                    }}>
                      <span className="font-medium">ID:</span> {selectedEvent.originalData.id}
                    </div>
                    {selectedEvent.originalData.recurringEventId && (
                      <div className="card-responsive" style={{ 
                        padding: 'var(--space-2)',
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--border-default)',
                        fontFamily: 'Georgia, serif'
                      }}>
                        <span className="font-medium">Recurring Event:</span> Yes
                      </div>
                    )}
                    {selectedEvent.originalData.creator && (
                      <div className="card-responsive" style={{ 
                        padding: 'var(--space-2)',
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--border-default)',
                        fontFamily: 'Georgia, serif'
                      }}>
                        <span className="font-medium">Created by:</span> {selectedEvent.originalData.creator.displayName || selectedEvent.originalData.creator.email}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}