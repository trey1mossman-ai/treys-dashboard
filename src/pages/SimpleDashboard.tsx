import { useState, useEffect } from 'react';
import { RefreshCw, Mail, Calendar, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { TimelineSchedule } from '@/components/TimelineSchedule';

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  preview?: string;
  isRead?: boolean;
  isImportant?: boolean;
  to?: string;
  cc?: string;
  attachments?: string[];
  labels?: string[];
  body?: string;
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
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
      label?: string;
    }>;
  };
  organizer?: string;
  isAllDay?: boolean;
}

interface ScheduleItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: 'schedule' | 'calendar';
  description?: string;
  location?: string;
  status?: string;
}

export default function SimpleDashboard() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [emailLoading, setEmailLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<string>('');
  const [replyModal, setReplyModal] = useState<{ show: boolean; email: Email | null }>({ show: false, email: null });
  const [replyText, setReplyText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  
  // Data persistence state
  const [lastEmailLoad, setLastEmailLoad] = useState<string | null>(null);
  const [lastEventLoad, setLastEventLoad] = useState<string | null>(null);

  // Helper function to extract meeting URLs from various fields
  const extractMeetingUrl = (event: any): string => {
    // Check for Zoom, Teams, Meet links in various fields
    const searchFields = [
      event.location,
      event.description, 
      event.conferenceData?.entryPoints?.[0]?.uri,
      event.hangoutLink
    ];
    
    for (const field of searchFields) {
      if (!field) continue;
      
      // Common meeting URL patterns
      const patterns = [
        /https?:\/\/[^\s]*zoom\.us\/[^\s]*/gi,
        /https?:\/\/[^\s]*teams\.microsoft\.com\/[^\s]*/gi,
        /https?:\/\/[^\s]*meet\.google\.com\/[^\s]*/gi,
        /https?:\/\/[^\s]*webex\.com\/[^\s]*/gi,
        /https?:\/\/[^\s]*gotomeeting\.com\/[^\s]*/gi
      ];
      
      for (const pattern of patterns) {
        const match = field.match(pattern);
        if (match) return match[0];
      }
    }
    
    return '';
  };

  const fetchEmails = async () => {
    try {
      setEmailLoading(true);
      setWebhookStatus('🔄 Triggering email refresh...');
      
      // Use our server-side trigger endpoint (no CORS issues)
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8788' 
        : 'https://ailifeassistanttm.com';
      
      console.log('Triggering email workflow via:', `${apiUrl}/api/trigger/emails`);
      
      const triggerResponse = await fetch(`${apiUrl}/api/trigger/emails`);
      const triggerResult = await triggerResponse.json();
      
      if (triggerResult.success) {
        console.log('✅ Email workflow triggered successfully:', triggerResult);
        setWebhookStatus(`✅ Workflow started! ${triggerResult.webhook?.message || ''}`);
      } else {
        console.error('❌ Failed to trigger workflow:', triggerResult);
        setWebhookStatus('❌ Failed to trigger workflow');
        setEmailLoading(false);
        return; // Stop if trigger failed
      }
      
      // Wait longer for the n8n workflow to complete and post data
      console.log('Waiting for workflow to complete...');
      setWebhookStatus('⏳ Waiting for data update...');
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      // Fetch with cache-busting to ensure fresh data
      const timestamp = Date.now();
      const emailUrl = `${apiUrl}/api/webhook/emails?t=${timestamp}`;
      console.log('Fetching fresh emails from:', emailUrl);
      
      const response = await fetch(emailUrl, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      console.log('📧 Email data received:', {
        timestamp: data.timestamp,
        emailCount: data.emails?.length,
        source: data.source
      });
      
      if (data.emails && Array.isArray(data.emails) && data.emails.length > 0) {
        console.log('Processing emails:', data.emails.map((e: any) => ({
          subject: e.subject,
          from: e.from
        })));
        
        const mappedEmails = data.emails.slice(0, 15).map((email: any) => ({
          id: email.id || Math.random().toString(),
          subject: email.subject || '(No Subject)',
          from: typeof email.from === 'string' ? email.from : 
            (email.from?.email || email.from?.name || email.fromEmail || email.fromName || 'Unknown Sender'),
          date: email.sentDate || email.timestamp || email.date,
          preview: email.preview || email.snippet || '',
          isRead: email.isRead !== undefined ? email.isRead : true,
          isImportant: email.isImportant || email.isStarred || false,
          to: typeof email.to === 'string' ? email.to : 
            (email.to?.email || email.to?.name || email.toEmail || ''),
          cc: typeof email.cc === 'string' ? email.cc : 
            (email.cc?.email || email.cc?.name || ''),
          attachments: Array.isArray(email.attachments) ? 
            email.attachments.map((a: any) => typeof a === 'string' ? a : (a.name || a.filename || a.id || 'Attachment')) : [],
          labels: Array.isArray(email.labels || email.labelIds) ? 
            (email.labels || email.labelIds).map((l: any) => typeof l === 'string' ? l : (l.name || l.id || 'Label')) : [],
          body: email.body || email.textPlain || email.textHtml || ''
        }));
        // Force refresh by clearing then setting
        console.log(`✅ Setting ${mappedEmails.length} emails to state`);
        setEmails([]);
        setTimeout(() => {
          setEmails(mappedEmails);
          // Save to localStorage
          const timestamp = new Date().toISOString();
          localStorage.setItem('dashboard_emails', JSON.stringify(mappedEmails));
          localStorage.setItem('dashboard_emails_timestamp', timestamp);
          setLastEmailLoad(timestamp);
          setWebhookStatus(`✅ ${mappedEmails.length} emails loaded!`);
          setTimeout(() => setWebhookStatus(''), 3000);
        }, 100);
      } else {
        console.warn('⚠️ No emails in response or empty array');
        setEmails([]); // Ensure empty if no data
        setWebhookStatus('⚠️ No emails found');
        setTimeout(() => setWebhookStatus(''), 3000);
      }
    } catch (err) {
      console.error('Failed to fetch emails:', err);
      setWebhookStatus('❌ Failed to fetch emails');
      setTimeout(() => setWebhookStatus(''), 3000);
    } finally {
      setEmailLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setEventLoading(true);
      setWebhookStatus('🔄 Triggering calendar refresh...');
      
      // Use our server-side trigger endpoint (no CORS issues)
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8788' 
        : 'https://ailifeassistanttm.com';
      
      console.log('Triggering calendar workflow via:', `${apiUrl}/api/trigger/calendar`);
      
      const triggerResponse = await fetch(`${apiUrl}/api/trigger/calendar`);
      const triggerResult = await triggerResponse.json();
      
      if (triggerResult.success) {
        console.log('Calendar workflow triggered:', triggerResult);
        setWebhookStatus('✅ Calendar workflow started!');
      } else {
        console.error('Failed to trigger workflow:', triggerResult);
        setWebhookStatus('❌ Failed to trigger workflow');
      }
      
      // Wait longer for the n8n workflow to complete and post data
      console.log('Waiting for workflow to complete...');
      setWebhookStatus('⏳ Waiting for data update...');
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      // Fetch with cache-busting to ensure fresh data
      const timestamp = Date.now();
      const calendarUrl = `${apiUrl}/api/webhook/calendar?t=${timestamp}`;
      console.log('Fetching fresh calendar from:', calendarUrl);
      
      const response = await fetch(calendarUrl, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      console.log('Calendar data received:', data);
      
      if (data.events && Array.isArray(data.events)) {
        const mappedEvents = data.events.slice(0, 10).map((event: any) => ({
          id: event.id || Math.random().toString(),
          title: event.summary || event.title || 'Untitled Event',
          startTime: event.start || event.startTime || event.start?.dateTime || event.start?.date || '',
          endTime: event.end || event.endTime || event.end?.dateTime || event.end?.date || '',
          status: event.status || 'confirmed',
          location: event.location || '',
          description: event.description || '',
          attendees: Array.isArray(event.attendees) ? 
            event.attendees.map((a: any) => typeof a === 'string' ? a : (a.email || a.displayName || 'Unknown')) : [],
          organizer: typeof event.organizer === 'string' ? event.organizer : 
            (event.organizer?.email || event.organizer?.displayName || event.creator || ''),
          meetingUrl: extractMeetingUrl(event),
          conferenceData: event.conferenceData || null,
          isAllDay: event.isAllDay || false
        }));
        // Force refresh by clearing then setting
        setEvents([]);
        setTimeout(() => {
          setEvents(mappedEvents);
          // Save to localStorage
          const timestamp = new Date().toISOString();
          localStorage.setItem('dashboard_events', JSON.stringify(mappedEvents));
          localStorage.setItem('dashboard_events_timestamp', timestamp);
          setLastEventLoad(timestamp);
          // Update combined schedule
          updateScheduleItems(mappedEvents);
          setWebhookStatus('✅ Calendar updated!');
          setTimeout(() => setWebhookStatus(''), 2000);
        }, 100);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setWebhookStatus('❌ Failed to fetch calendar');
      setTimeout(() => setWebhookStatus(''), 3000);
    } finally {
      setEventLoading(false);
    }
  };

  // Helper function to check if a date is today
  const isToday = (dateString: string | undefined | null) => {
    if (!dateString) return false;
    try {
      const date = new Date(dateString);
      const today = new Date();
      
      // Compare year, month, and day
      return date.getFullYear() === today.getFullYear() &&
             date.getMonth() === today.getMonth() &&
             date.getDate() === today.getDate();
    } catch (e) {
      console.error('Error parsing date:', dateString, e);
      return false;
    }
  };
  
  // Helper function to check if a date is in the past (before today)
  const isPastEvent = (dateString: string | undefined | null) => {
    if (!dateString) return false;
    try {
      const date = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      
      return date < today;
    } catch (e) {
      return false;
    }
  };
  
  // Helper function to check if event should be shown (today or future)
  const shouldShowEvent = (dateString: string | undefined | null) => {
    if (!dateString) return false;
    return isToday(dateString) || !isPastEvent(dateString);
  };

  // Helper function to update combined schedule items (only today's items)
  const updateScheduleItems = (calendarEvents: CalendarEvent[], preserveSchedule = false) => {
    // Filter for today's calendar events only
    const todaysCalendarEvents = calendarEvents.filter(event => 
      isToday(event.startTime)
    );
    
    const calendarItems: ScheduleItem[] = todaysCalendarEvents.map(event => ({
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      type: 'calendar' as const,
      description: event.description,
      location: event.location,
      status: event.status
    }));
    
    // Get saved schedule items from localStorage
    let savedScheduleItems: ScheduleItem[] = [];
    const savedSchedule = localStorage.getItem('dashboard_schedule');
    if (savedSchedule) {
      try {
        savedScheduleItems = JSON.parse(savedSchedule).filter((item: ScheduleItem) => 
          item.type === 'schedule' && isToday(item.startTime)
        );
      } catch (e) {
        console.error('Failed to parse saved schedule');
      }
    }
    
    // Get existing schedule items (not calendar) that are for today
    const existingSchedule = preserveSchedule ? 
      scheduleItems.filter(item => item.type === 'schedule' && isToday(item.startTime)) :
      savedScheduleItems;
    
    // Combine and sort by start time
    const combined = [...existingSchedule, ...calendarItems].sort((a, b) => {
      const dateA = new Date(a.startTime).getTime();
      const dateB = new Date(b.startTime).getTime();
      return dateA - dateB;
    });
    
    setScheduleItems(combined);
    // Save only schedule items (not calendar items) to localStorage
    if (existingSchedule.length > 0) {
      localStorage.setItem('dashboard_schedule', JSON.stringify(existingSchedule));
    }
  };

  // Load data from localStorage on mount
  useEffect(() => {
    // Load emails from localStorage
    const savedEmails = localStorage.getItem('dashboard_emails');
    const emailTimestamp = localStorage.getItem('dashboard_emails_timestamp');
    if (savedEmails) {
      try {
        setEmails(JSON.parse(savedEmails));
        setLastEmailLoad(emailTimestamp);
      } catch (e) {
        console.error('Failed to parse saved emails');
      }
    }
    
    // Load events from localStorage
    const savedEvents = localStorage.getItem('dashboard_events');
    const eventTimestamp = localStorage.getItem('dashboard_events_timestamp');
    if (savedEvents) {
      try {
        const parsedEvents = JSON.parse(savedEvents);
        setEvents(parsedEvents);
        setLastEventLoad(eventTimestamp);
        updateScheduleItems(parsedEvents);
      } catch (e) {
        console.error('Failed to parse saved events');
      }
    }
    
    // Load and clean up schedule items from localStorage
    const savedSchedule = localStorage.getItem('dashboard_schedule');
    if (savedSchedule) {
      try {
        const allScheduleItems = JSON.parse(savedSchedule);
        console.log('All schedule items from localStorage:', allScheduleItems);
        
        // Clean up past events (keep today and future)
        const activeScheduleItems = allScheduleItems.filter((item: ScheduleItem) => {
          const isPast = isPastEvent(item.startTime);
          if (isPast) {
            console.log(`Removing past event: "${item.title}" from ${item.startTime}`);
            return false;
          }
          return true;
        });
        
        // Save cleaned up list back to localStorage
        if (activeScheduleItems.length !== allScheduleItems.length) {
          localStorage.setItem('dashboard_schedule', JSON.stringify(activeScheduleItems));
          console.log('Cleaned up past events from schedule');
        }
        
        // Show only today's items in the timeline
        const parsedSchedule = activeScheduleItems.filter((item: ScheduleItem) => {
          const todayCheck = isToday(item.startTime);
          console.log(`Schedule item "${item.title}" at ${item.startTime} is today: ${todayCheck}`);
          return todayCheck;
        });
        
        console.log('Today\'s schedule items:', parsedSchedule);
        
        // Combine with today's calendar events if any exist
        const calendarItems = savedEvents ? JSON.parse(savedEvents)
          .filter((event: any) => isToday(event.startTime) || isToday(event.endTime))
          .map((event: any) => ({
            id: event.id,
            title: event.title,
            startTime: event.startTime,
            endTime: event.endTime,
            type: 'calendar' as const,
            description: event.description,
            location: event.location,
            status: event.status
          })) : [];
        
        setScheduleItems([...parsedSchedule, ...calendarItems].sort((a, b) => {
          const dateA = new Date(a.startTime).getTime();
          const dateB = new Date(b.startTime).getTime();
          return dateA - dateB;
        }));
      } catch (e) {
        console.error('Failed to parse saved schedule');
      }
    }
    
    setEmailLoading(false);
    setEventLoading(false);
    console.log('Dashboard initialized with cached data');
  }, []);

  // Listen for schedule updates from Schedule page
  useEffect(() => {
    const handleScheduleUpdate = (event: any) => {
      console.log('📅 Schedule update event received:', event.detail);
      
      // Reload schedule items when they're updated
      const savedSchedule = localStorage.getItem('dashboard_schedule');
      const savedEvents = localStorage.getItem('dashboard_events');
      
      console.log('📅 Loading schedule from localStorage:', savedSchedule);
      
      if (savedSchedule) {
        try {
          const allScheduleItems = JSON.parse(savedSchedule);
          console.log('📅 All schedule items:', allScheduleItems);
          
          // Clean up past events but keep today and future
          const activeScheduleItems = allScheduleItems.filter((item: ScheduleItem) => {
            return !isPastEvent(item.startTime);
          });
          
          // Save cleaned list if needed
          if (activeScheduleItems.length !== allScheduleItems.length) {
            localStorage.setItem('dashboard_schedule', JSON.stringify(activeScheduleItems));
          }
          
          // Show only today's items
          const parsedSchedule = activeScheduleItems.filter((item: ScheduleItem) => {
            const todayCheck = isToday(item.startTime);
            console.log(`📅 Item "${item.title}" at ${item.startTime} is today: ${todayCheck}`);
            return todayCheck;
          });
          
          console.log('📅 Today\'s active schedule items:', parsedSchedule);
          
          // Combine with today's calendar events if any exist
          const calendarItems = savedEvents ? JSON.parse(savedEvents)
            .filter((event: any) => isToday(event.startTime) || isToday(event.endTime))
            .map((event: any) => ({
              id: event.id,
              title: event.title,
              startTime: event.startTime,
              endTime: event.endTime,
              type: 'calendar' as const,
              description: event.description,
              location: event.location,
              status: event.status
            })) : [];
          
          const combinedItems = [...parsedSchedule, ...calendarItems].sort((a, b) => {
            const dateA = new Date(a.startTime).getTime();
            const dateB = new Date(b.startTime).getTime();
            return dateA - dateB;
          });
          
          console.log('📅 Setting combined schedule items:', combinedItems);
          setScheduleItems(combinedItems);
        } catch (e) {
          console.error('Failed to parse saved schedule:', e);
        }
      }
    };
    
    window.addEventListener('scheduleUpdated', handleScheduleUpdate);
    
    return () => {
      window.removeEventListener('scheduleUpdated', handleScheduleUpdate);
    };
  }, []);

  // Mobile-first styles - simplified for better performance
  const containerStyle: React.CSSProperties = {
    backgroundColor: '#0a0e1a',
    color: '#f0f4ff',
    minHeight: '100vh',
    width: '100%',
    padding: '12px',
    boxSizing: 'border-box'
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '24px',
    background: 'rgba(15, 23, 41, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    overflow: 'hidden',
    width: '100%',
    boxSizing: 'border-box'
  };

  const headerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const itemStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '44px'
  };


  return (
    <div className="mobile-container mobile-safe-area mobile-scroll" style={containerStyle}>
      {/* Header */}
      <header className="mobile-mb text-center border-b border-border pb-4">
        <h1 className="text-2xl font-bold mb-2 text-primary">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </header>

      {/* Webhook Status */}
      {webhookStatus && (
        <div className="success-state text-center mobile-my animate-in fade-in duration-300">
          {webhookStatus}
        </div>
      )}

      {/* Today's Timeline - Enhanced Mobile-First Schedule */}
      <TimelineSchedule 
        calendarEvents={events}
        scheduleItems={scheduleItems}
        className="mb-6"
      />

      {/* Emails Section */}
      <section style={sectionStyle}>
        <div style={headerStyle}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail style={{ width: '16px', height: '16px', color: '#00d4ff' }} />
              <h2 style={{ fontSize: '16px', margin: 0, color: '#00d4ff' }}>Recent Emails</h2>
            </div>
            {lastEmailLoad && (
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                Last loaded: {formatDistanceToNow(new Date(lastEmailLoad), { addSuffix: true })}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={fetchEmails}
              disabled={emailLoading}
              style={{
                background: 'rgba(0, 212, 255, 0.2)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '6px',
                padding: '6px',
                color: '#00d4ff',
                cursor: emailLoading ? 'not-allowed' : 'pointer',
                minWidth: '32px',
                minHeight: '32px'
              }}
            >
              <RefreshCw style={{ 
                width: '14px', 
                height: '14px',
                animation: emailLoading ? 'spin 1s linear infinite' : 'none'
              }} />
            </button>
            <span style={{
              fontSize: '12px',
              padding: '4px 8px',
              background: 'rgba(0, 212, 255, 0.2)',
              borderRadius: '12px',
              color: '#00d4ff'
            }}>
              {emails.length}
            </span>
          </div>
        </div>
        
        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          position: 'relative'
        }}>
          {emailLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
              Loading emails...
            </div>
          ) : emails.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
              <div>No emails loaded</div>
              <div style={{ fontSize: '12px', marginTop: '8px', color: '#64748b' }}>
                Click refresh button to fetch live data
              </div>
            </div>
          ) : (
            emails.map((email) => (
              <div
                key={email.id}
                className="email-item"
                style={{
                  ...itemStyle,
                  ...(email.isRead ? {} : { borderLeft: '3px solid #00d4ff', background: 'rgba(0, 212, 255, 0.03)' }),
                  pointerEvents: 'auto',
                  position: 'relative'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Email clicked:', email);
                  setSelectedEmail(email);
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                    {email.isImportant && (
                      <Star style={{ 
                        width: '12px', 
                        height: '12px', 
                        color: '#f59e0b', 
                        fill: '#f59e0b' 
                      }} />
                    )}
                    <span style={{
                      fontSize: '13px',
                      fontWeight: email.isRead ? 400 : 600,
                      color: email.isRead ? '#94a3b8' : '#f0f4ff'
                    }}>
                      {email.from}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    color: '#64748b'
                  }}>
                    {email.date ? formatDistanceToNow(new Date(email.date), { addSuffix: true }) : ''}
                  </span>
                </div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: email.isRead ? 400 : 600,
                  color: email.isRead ? '#cbd5e1' : '#f0f4ff',
                  marginBottom: '4px'
                }}>
                  {email.subject || 'No Subject'}
                </div>
                {email.preview && (
                  <div style={{
                    fontSize: '11px',
                    color: '#64748b',
                    lineHeight: '1.3'
                  }}>
                    {email.preview.substring(0, 100)}...
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Calendar Section */}
      <section style={sectionStyle}>
        <div style={headerStyle}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar style={{ width: '16px', height: '16px', color: '#06b6d4' }} />
              <h2 style={{ fontSize: '16px', margin: 0, color: '#06b6d4' }}>Upcoming Events</h2>
            </div>
            {lastEventLoad && (
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                Last loaded: {formatDistanceToNow(new Date(lastEventLoad), { addSuffix: true })}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={fetchEvents}
              disabled={eventLoading}
              style={{
                background: 'rgba(6, 182, 212, 0.2)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '6px',
                padding: '6px',
                color: '#06b6d4',
                cursor: eventLoading ? 'not-allowed' : 'pointer',
                minWidth: '32px',
                minHeight: '32px'
              }}
            >
              <RefreshCw style={{ 
                width: '14px', 
                height: '14px',
                animation: eventLoading ? 'spin 1s linear infinite' : 'none'
              }} />
            </button>
            <span style={{
              fontSize: '12px',
              padding: '4px 8px',
              background: 'rgba(6, 182, 212, 0.2)',
              borderRadius: '12px',
              color: '#06b6d4'
            }}>
              {events.length}
            </span>
          </div>
        </div>
        
        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          position: 'relative'
        }}>
          {eventLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
              Loading events...
            </div>
          ) : events.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
              No events found
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="calendar-item"
                style={{
                  ...itemStyle,
                  borderLeft: `3px solid ${
                    event.status === 'confirmed' ? '#10b981' : 
                    event.status === 'tentative' ? '#f59e0b' : '#ef4444'
                  }`,
                  pointerEvents: 'auto',
                  position: 'relative'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Event clicked:', event);
                  setSelectedEvent(event);
                }}
              >
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#f0f4ff',
                  marginBottom: '4px'
                }}>
                  {event.title}
                </div>
                {event.location && (
                  <div style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    marginBottom: '4px'
                  }}>
                    📍 {event.location}
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  color: '#64748b'
                }}>
                  <span>
                    {(() => {
                      try {
                        if (event.startTime && event.endTime) {
                          const start = new Date(event.startTime);
                          const end = new Date(event.endTime);
                          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                            return `${start.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })} - ${end.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}`;
                          }
                        } else if (event.startTime) {
                          const start = new Date(event.startTime);
                          if (!isNaN(start.getTime())) {
                            return start.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            });
                          }
                        }
                        return 'Time TBD';
                      } catch {
                        return 'Time TBD';
                      }
                    })()}
                  </span>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    background: event.status === 'confirmed' ? 'rgba(16, 185, 129, 0.2)' : 
                               event.status === 'tentative' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: event.status === 'confirmed' ? '#10b981' : 
                           event.status === 'tentative' ? '#f59e0b' : '#ef4444'
                  }}>
                    {event.status || 'confirmed'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Email Popup Modal */}
      {selectedEmail ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 55,
          padding: '16px',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }} onClick={() => setSelectedEmail(null)}>
          <div style={{
            background: '#0f1729',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            position: 'relative',
            margin: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start',
              marginBottom: '16px'
            }}>
              <h3 style={{ color: '#00d4ff', margin: 0, fontSize: '18px' }}>Email Details</h3>
              <button 
                onClick={() => setSelectedEmail(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#f0f4ff' }}>From:</strong> 
              <span style={{ color: '#94a3b8', marginLeft: '8px' }}>{selectedEmail.from}</span>
            </div>
            
            {selectedEmail.to && (
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#f0f4ff' }}>To:</strong>
                <span style={{ color: '#94a3b8', marginLeft: '8px' }}>{selectedEmail.to}</span>
              </div>
            )}
            
            {selectedEmail.cc && (
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#f0f4ff' }}>CC:</strong>
                <span style={{ color: '#94a3b8', marginLeft: '8px' }}>{selectedEmail.cc}</span>
              </div>
            )}
            
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#f0f4ff' }}>Subject:</strong>
              <div style={{ color: '#cbd5e1', marginTop: '4px', fontSize: '14px', fontWeight: 500 }}>
                {selectedEmail.subject || 'No Subject'}
              </div>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#f0f4ff' }}>Date:</strong>
              <span style={{ color: '#94a3b8', marginLeft: '8px' }}>
                {selectedEmail.date ? new Date(selectedEmail.date).toLocaleString() : 'Unknown'}
              </span>
            </div>
            
            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#f0f4ff' }}>Attachments ({selectedEmail.attachments.length}):</strong>
                <div style={{ 
                  marginTop: '8px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}>
                  {selectedEmail.attachments.map((attachment: string, index: number) => (
                    <span key={index} style={{
                      padding: '4px 8px',
                      background: 'rgba(0, 212, 255, 0.1)',
                      border: '1px solid rgba(0, 212, 255, 0.3)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#00d4ff'
                    }}>
                      📎 {attachment}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {selectedEmail.labels && selectedEmail.labels.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#f0f4ff' }}>Labels:</strong>
                <div style={{ 
                  marginTop: '8px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}>
                  {selectedEmail.labels.map((label: string, index: number) => (
                    <span key={index} style={{
                      padding: '3px 8px',
                      background: 'rgba(139, 92, 246, 0.2)',
                      color: '#a78bfa',
                      borderRadius: '12px',
                      fontSize: '11px'
                    }}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {(selectedEmail.body || selectedEmail.preview) && (
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#f0f4ff' }}>Content:</strong>
                <div style={{ 
                  color: '#cbd5e1', 
                  marginTop: '8px', 
                  fontSize: '13px',
                  lineHeight: '1.6',
                  padding: '12px',
                  background: 'rgba(0, 212, 255, 0.05)',
                  borderRadius: '8px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedEmail.body || selectedEmail.preview}
                </div>
              </div>
            )}
            
            <div style={{ 
              display: 'flex', 
              gap: '8px',
              marginTop: '16px',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedEmail.isImportant && (
                  <span style={{
                    padding: '4px 8px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#f59e0b',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}>
                    ⭐ Important
                  </span>
                )}
                <span style={{
                  padding: '4px 8px',
                  background: selectedEmail.isRead ? 'rgba(94, 234, 212, 0.2)' : 'rgba(0, 212, 255, 0.2)',
                  color: selectedEmail.isRead ? '#5eead4' : '#00d4ff',
                  borderRadius: '4px',
                  fontSize: '11px'
                }}>
                  {selectedEmail.isRead ? 'Read' : 'Unread'}
                </span>
              </div>
              <button
                onClick={() => {
                  // Open the reply modal
                  setReplyModal({ show: true, email: selectedEmail });
                  setReplyText('');
                  // Close the email popup
                  setSelectedEmail(null);
                }}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #00d4ff, #06b6d4)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#0a0e1a',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                📧 Reply with AI
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Calendar Event Popup Modal */}
      {selectedEvent ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 55,
          padding: '16px',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }} onClick={() => setSelectedEvent(null)}>
          <div style={{
            background: '#0f1729',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            position: 'relative',
            margin: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start',
              marginBottom: '16px'
            }}>
              <h3 style={{ color: '#06b6d4', margin: 0, fontSize: '18px' }}>Event Details</h3>
              <button 
                onClick={() => setSelectedEvent(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#f0f4ff' }}>Title:</strong>
              <div style={{ color: '#cbd5e1', marginTop: '4px', fontSize: '16px', fontWeight: 500 }}>
                {selectedEvent.title}
              </div>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#f0f4ff' }}>Time:</strong>
              <div style={{ color: '#94a3b8', marginTop: '4px' }}>
                {selectedEvent.startTime && selectedEvent.endTime ? (
                  <>
                    <div>Start: {new Date(selectedEvent.startTime).toLocaleString()}</div>
                    <div>End: {new Date(selectedEvent.endTime).toLocaleString()}</div>
                    {selectedEvent.isAllDay && <div style={{ color: '#06b6d4' }}>🌅 All Day Event</div>}
                  </>
                ) : (
                  'Time TBD'
                )}
              </div>
            </div>
            
            {selectedEvent.location && (
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#f0f4ff' }}>Location:</strong>
                <div style={{ color: '#94a3b8', marginTop: '4px' }}>
                  📍 {selectedEvent.location}
                </div>
              </div>
            )}
            
            {selectedEvent.meetingUrl && (
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#f0f4ff' }}>Meeting Link:</strong>
                <div style={{ marginTop: '8px' }}>
                  <a 
                    href={selectedEvent.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                      color: '#ffffff',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: 500,
                      fontSize: '14px',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.5)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(6, 182, 212, 0.3)';
                    }}
                  >
                    🎥 Join Meeting
                  </a>
                </div>
              </div>
            )}
            
            {selectedEvent.organizer && (
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#f0f4ff' }}>Organizer:</strong>
                <div style={{ color: '#94a3b8', marginTop: '4px' }}>
                  {selectedEvent.organizer}
                </div>
              </div>
            )}
            
            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#f0f4ff' }}>Attendees ({selectedEvent.attendees.length}):</strong>
                <div style={{ 
                  marginTop: '8px',
                  maxHeight: '100px',
                  overflowY: 'auto',
                  padding: '8px',
                  background: 'rgba(6, 182, 212, 0.05)',
                  borderRadius: '6px'
                }}>
                  {selectedEvent.attendees.map((attendee: string, index: number) => (
                    <div key={index} style={{ color: '#94a3b8', fontSize: '12px', padding: '2px 0' }}>
                      • {attendee}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {selectedEvent.description && (
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#f0f4ff' }}>Description:</strong>
                <div style={{ 
                  color: '#cbd5e1', 
                  marginTop: '8px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  padding: '12px',
                  background: 'rgba(6, 182, 212, 0.05)',
                  borderRadius: '8px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedEvent.description}
                </div>
              </div>
            )}
            
            <div style={{ 
              display: 'flex', 
              gap: '8px',
              marginTop: '16px'
            }}>
              <span style={{
                padding: '4px 12px',
                background: selectedEvent.status === 'confirmed' ? 'rgba(16, 185, 129, 0.2)' : 
                           selectedEvent.status === 'tentative' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: selectedEvent.status === 'confirmed' ? '#10b981' : 
                       selectedEvent.status === 'tentative' ? '#f59e0b' : '#ef4444',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500
              }}>
                {selectedEvent.status || 'confirmed'}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          * {
            box-sizing: border-box !important;
            -webkit-tap-highlight-color: transparent;
          }
          
          html {
            height: 100%;
            overflow: hidden;
          }
          
          body {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
            position: fixed;
            width: 100%;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: none;
          }
          
          /* Main app container should handle all scrolling */
          #root {
            height: 100%;
            width: 100%;
            position: fixed;
            top: 0;
            left: 0;
            overflow: hidden;
          }
          
          /* This div handles the actual scrolling */
          #root > div:first-child {
            height: 100%;
            overflow-x: hidden;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-y: contain;
            scroll-behavior: smooth;
          }
          
          /* Touch handling for mobile */
          button, a {
            touch-action: manipulation;
            cursor: pointer;
          }
          
          /* Laser hover effects for individual items */
          .email-item {
            position: relative;
            transition: all 0.2s ease;
            border-radius: 8px;
            cursor: pointer;
          }

          .email-item:hover,
          .email-item:active {
            border-color: rgba(0, 212, 255, 0.8) !important;
            box-shadow: 
              0 0 15px rgba(0, 212, 255, 0.4),
              0 0 30px rgba(0, 212, 255, 0.2) !important;
            background-color: rgba(0, 212, 255, 0.1) !important;
            transform: translateY(-1px);
          }

          .calendar-item {
            position: relative;
            transition: all 0.2s ease;
            border-radius: 8px;
            cursor: pointer;
          }

          .calendar-item:hover,
          .calendar-item:active {
            border-color: rgba(6, 182, 212, 0.8) !important;
            box-shadow: 
              0 0 15px rgba(6, 182, 212, 0.4),
              0 0 30px rgba(6, 182, 212, 0.2) !important;
            background-color: rgba(6, 182, 212, 0.1) !important;
            transform: translateY(-1px);
          }

          /* Ensure mobile-first layout */
          @media (max-width: 767px) {
            * {
              font-size: 14px !important;
            }
            
            h1 {
              font-size: 20px !important;
            }
            
            h2 {
              font-size: 16px !important;
            }
          }
        `}
      </style>

      {/* Reply Modal */}
      {replyModal.show && replyModal.email && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: '16px',
          '@media (max-width: 768px)': {
            alignItems: 'flex-end',
            padding: '0'
          }
        }} onClick={() => {
          setReplyModal({ show: false, email: null });
          setReplyText('');
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0f1729, #1a2332)',
            border: '2px solid #00d4ff',
            borderRadius: window.innerWidth <= 768 ? '20px 20px 0 0' : '12px',
            padding: window.innerWidth <= 768 ? '20px 16px 32px' : '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: window.innerWidth <= 768 ? '90vh' : '85vh',
            height: 'auto',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: window.innerWidth <= 768 ? '0 -10px 40px rgba(0, 212, 255, 0.3)' : '0 10px 40px rgba(0, 212, 255, 0.3)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{
              marginBottom: '20px',
              borderBottom: '1px solid rgba(0, 212, 255, 0.3)',
              paddingBottom: '16px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                marginBottom: '12px'
              }}>
                <h2 style={{
                  margin: 0,
                  color: '#00d4ff',
                  fontSize: window.innerWidth <= 768 ? '20px' : '18px',
                  fontWeight: 600
                }}>
                  📧 Reply with AI
                </h2>
                <button
                  onClick={() => {
                    setReplyModal({ show: false, email: null });
                    setReplyText('');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: window.innerWidth <= 768 ? '28px' : '24px',
                    cursor: 'pointer',
                    padding: window.innerWidth <= 768 ? '8px' : '4px',
                    lineHeight: '1',
                    minHeight: window.innerWidth <= 768 ? '44px' : 'auto',
                    minWidth: window.innerWidth <= 768 ? '44px' : 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                <div style={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap' 
                }}>
                  <strong>To:</strong> {replyModal.email.from}
                </div>
                <div style={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap' 
                }}>
                  <strong>Re:</strong> {replyModal.email?.subject || ''}
                </div>
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  background: 'rgba(0, 212, 255, 0.1)',
                  borderRadius: '6px',
                  border: '1px solid rgba(0, 212, 255, 0.2)'
                }}>
                  <strong style={{ color: '#00d4ff', fontSize: '11px' }}>ID:</strong> <span style={{ fontSize: '11px' }}>{replyModal.email?.id || ''}</span>
                </div>
              </div>
            </div>
            
            {/* Reply Text Area */}
            <div style={{ flex: 1, marginBottom: '12px', minHeight: '150px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#f0f4ff',
                fontSize: window.innerWidth <= 768 ? '16px' : '13px',
                fontWeight: 500
              }}>
                Your Reply:
              </label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your message (AI will polish grammar & make it professional)..."
                style={{
                  width: '100%',
                  minHeight: window.innerWidth <= 768 ? '140px' : '120px',
                  maxHeight: '300px',
                  padding: window.innerWidth <= 768 ? '16px' : '12px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#f0f4ff',
                  fontSize: window.innerWidth <= 768 ? '16px' : '14px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  resize: 'vertical',
                  outline: 'none',
                  WebkitAppearance: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#00d4ff';
                  e.target.style.boxShadow = '0 0 10px rgba(0, 212, 255, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0, 212, 255, 0.3)';
                  e.target.style.boxShadow = 'none';
                }}
                autoFocus
              />
            </div>
            
            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: window.innerWidth <= 768 ? '12px' : '8px',
              justifyContent: 'stretch',
              marginTop: window.innerWidth <= 768 ? '16px' : '8px',
              flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
            }}>
              <button
                onClick={() => {
                  if (!isSending) {
                    setReplyModal({ show: false, email: null });
                    setReplyText('');
                    setIsSending(false);
                  }
                }}
                disabled={isSending}
                style={{
                  flex: 1,
                  padding: window.innerWidth <= 768 ? '16px 20px' : '12px 16px',
                  background: 'transparent',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  fontSize: window.innerWidth <= 768 ? '16px' : '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minHeight: window.innerWidth <= 768 ? '52px' : '44px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#94a3b8';
                  e.currentTarget.style.color = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={async (e) => {
                  // Prevent double clicks
                  if (isSending) {
                    console.log('Already sending, ignoring click');
                    return;
                  }
                  
                  if (!replyText.trim()) {
                    alert('Please enter a reply message');
                    return;
                  }
                  
                  // Disable button immediately
                  setIsSending(true);
                  const button = e.currentTarget;
                  button.disabled = true;
                  button.style.opacity = '0.6';
                  button.style.cursor = 'not-allowed';
                  
                  setWebhookStatus('🤖 Sending to AI Agent...');
                  
                  try {
                    // Use our server-side trigger endpoint to avoid CORS
                    const apiUrl = window.location.hostname === 'localhost' 
                      ? 'http://localhost:8788' 
                      : 'https://ailifeassistanttm.com';
                    
                    // Create the message with email context and user's reply
                    const fullMessage = `Here is the reply for email ID ${replyModal.email?.id || 'unknown'}. Please edit this for grammar and professionalism:\n\n"${replyText}"`;
                    
                    // n8n webhook expects these specific fields
                    const payload = {
                      sessionId: replyModal.email?.id || '335abf822064461597b5afe89d2deed9',
                      action: 'sendMessage',
                      chatInput: fullMessage
                    };
                    
                    console.log('Sending reply to webhook:', {
                      emailId: payload.emailId,
                      replyLength: replyText.length
                    });
                    
                    // Send through our server-side proxy
                    const response = await fetch(`${apiUrl}/api/trigger/reply`, {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json' 
                      },
                      body: JSON.stringify(payload),
                      signal: AbortSignal.timeout(10000) // 10 second timeout
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                      console.log('Successfully sent to n8n:', result);
                      setWebhookStatus('✅ Reply sent to AI Agent!');
                    } else {
                      console.error('Failed to send to n8n:', result);
                      setWebhookStatus('⚠️ Reply sent but may need retry');
                    }
                    
                    setTimeout(() => setWebhookStatus(null), 3000);
                    
                    // Wait a moment before closing to show success
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Close the modal and reset
                    setReplyModal({ show: false, email: null });
                    setReplyText('');
                    
                  } catch (error) {
                    console.error('Error sending reply:', error);
                    setWebhookStatus('❌ Failed to send reply');
                    setTimeout(() => setWebhookStatus(null), 3000);
                  } finally {
                    // Always re-enable the button
                    setIsSending(false);
                    if (button) {
                      button.disabled = false;
                      button.style.opacity = '1';
                      button.style.cursor = 'pointer';
                    }
                  }
                }}
                disabled={isSending}
                style={{
                  flex: window.innerWidth <= 768 ? '1' : '1.5',
                  padding: window.innerWidth <= 768 ? '16px 24px' : '12px 20px',
                  background: 'linear-gradient(135deg, #00d4ff, #06b6d4)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#0a0e1a',
                  fontSize: window.innerWidth <= 768 ? '16px' : '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minHeight: window.innerWidth <= 768 ? '52px' : '44px'
                }}
                onMouseEnter={(e) => {
                  if (!isSending) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSending) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {isSending ? '⏳ Sending...' : '🚀 Send to AI Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
