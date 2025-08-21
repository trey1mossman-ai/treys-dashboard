import { localBrain } from '../database/local-brain';

interface CalendarEvent {
  id?: string;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  description?: string;
  attendees?: string[];
  location?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  reminders?: { method: string; minutes: number }[];
}

class GoogleCalendarIntegration {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private syncInterval: number = 300000; // 5 minutes
  private syncTimer: NodeJS.Timeout | null = null;
  private clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  private calendarId = 'primary';
  
  async initialize() {
    console.log('📅 Initializing Google Calendar integration...');
    
    // Load stored tokens
    this.loadTokens();
    
    if (!this.accessToken) {
      console.log('No access token found. User needs to authenticate.');
      return false;
    }
    
    // Start sync loop
    this.startSync();
    return true;
  }
  
  private loadTokens() {
    const stored = localStorage.getItem('google_calendar_tokens');
    if (stored) {
      try {
        const tokens = JSON.parse(stored);
        this.accessToken = tokens.access;
        this.refreshToken = tokens.refresh;
      } catch (error) {
        console.error('Failed to load calendar tokens:', error);
      }
    }
  }
  
  private saveTokens() {
    if (this.accessToken) {
      localStorage.setItem('google_calendar_tokens', JSON.stringify({
        access: this.accessToken,
        refresh: this.refreshToken
      }));
    }
  }
  
  async authenticate() {
    // This would typically use OAuth2 flow
    // For now, we'll use a simplified version
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${this.clientId}` +
      `&redirect_uri=${window.location.origin}/auth/google` +
      `&response_type=code` +
      `&scope=https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events` +
      `&access_type=offline` +
      `&prompt=consent`;
    
    // Open auth window
    window.open(authUrl, 'google-auth', 'width=500,height=600');
    
    // Listen for auth completion
    return new Promise((resolve) => {
      window.addEventListener('message', (event) => {
        if (event.data.type === 'google-auth-success') {
          this.accessToken = event.data.accessToken;
          this.refreshToken = event.data.refreshToken;
          this.saveTokens();
          this.startSync();
          resolve(true);
        }
      });
    });
  }
  
  private startSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    // Initial sync
    this.syncCalendar();
    
    // Set up periodic sync
    this.syncTimer = setInterval(() => {
      this.syncCalendar();
    }, this.syncInterval);
    
    console.log('✅ Calendar sync started');
  }
  
  async syncCalendar(): Promise<any> {
    if (!this.accessToken) {
      console.log('Cannot sync - no access token');
      return;
    }
    
    try {
      // Get events for the next 7 days
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${this.calendarId}/events?` +
        `timeMin=${now.toISOString()}` +
        `&timeMax=${weekFromNow.toISOString()}` +
        `&singleEvents=true` +
        `&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      if (response.status === 401) {
        // Token expired, try to refresh
        await this.refreshAccessToken();
        return this.syncCalendar(); // Retry
      }
      
      if (!response.ok) {
        throw new Error(`Calendar sync failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      const events = data.items || [];
      
      // Store events in local database
      for (const event of events) {
        await this.storeEvent(event);
      }
      
      // Log sync
      await localBrain.logEvent('calendar_sync', {
        eventCount: events.length,
        timestamp: new Date()
      });
      
      console.log(`📅 Synced ${events.length} calendar events`);
      
    } catch (error) {
      console.error('Calendar sync error:', error);
      await localBrain.logEvent('calendar_sync_error', { error: String(error) });
    }
  }
  
  private async storeEvent(googleEvent: any) {
    const event: CalendarEvent = {
      id: googleEvent.id,
      title: googleEvent.summary || 'Untitled Event',
      startTime: googleEvent.start?.dateTime || googleEvent.start?.date,
      endTime: googleEvent.end?.dateTime || googleEvent.end?.date,
      description: googleEvent.description,
      location: googleEvent.location,
      attendees: googleEvent.attendees?.map((a: any) => a.email),
      status: googleEvent.status
    };
    
    // Store in local database
    await localBrain.events.add({
      timestamp: new Date(event.startTime).getTime(),
      type: 'calendar_event',
      data: event,
      processed: false
    });
  }
  
  async createEvent(event: CalendarEvent) {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Calendar');
    }
    
    // Always create as tentative initially (from research)
    const googleEvent = {
      summary: event.title,
      start: {
        dateTime: event.startTime instanceof Date 
          ? event.startTime.toISOString() 
          : new Date(event.startTime).toISOString(),
        timeZone: 'America/Denver'
      },
      end: {
        dateTime: event.endTime instanceof Date 
          ? event.endTime.toISOString() 
          : new Date(event.endTime).toISOString(),
        timeZone: 'America/Denver'
      },
      description: event.description,
      location: event.location,
      status: 'tentative', // Always tentative until confirmed
      attendees: event.attendees?.map(email => ({ email })),
      reminders: event.reminders || {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
          { method: 'email', minutes: 30 }
        ]
      }
    };
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${this.calendarId}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(googleEvent)
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        
        // Handle conflicts
        if (response.status === 409 || error.error?.message?.includes('conflict')) {
          return this.handleConflict(event);
        }
        
        throw new Error(`Failed to create event: ${error.error?.message || response.statusText}`);
      }
      
      const createdEvent = await response.json();
      
      // Store locally
      await this.storeEvent(createdEvent);
      
      // Log for audit trail
      await localBrain.logEvent('calendar_event_created', {
        eventId: createdEvent.id,
        title: event.title,
        status: 'tentative'
      });
      
      // Notify UI
      window.dispatchEvent(new CustomEvent('calendar-event-created', {
        detail: createdEvent
      }));
      
      return createdEvent;
      
    } catch (error) {
      console.error('Create event error:', error);
      await localBrain.logEvent('calendar_create_error', { 
        error: String(error),
        event: event.title 
      });
      throw error;
    }
  }
  
  private async handleConflict(event: CalendarEvent) {
    console.log('📅 Calendar conflict detected for:', event.title);
    
    // Find conflicting events
    const conflicts = await this.findConflicts(event);
    
    // Create resolution proposal
    const proposal = {
      originalEvent: event,
      conflicts,
      suggestions: await this.generateConflictSuggestions(event, conflicts)
    };
    
    // Request user confirmation
    window.dispatchEvent(new CustomEvent('calendar-conflict', {
      detail: proposal
    }));
    
    return { conflict: true, proposal };
  }
  
  async findConflicts(event: CalendarEvent): Promise<CalendarEvent[]> {
    if (!this.accessToken) return [];
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${this.calendarId}/events?` +
        `timeMin=${new Date(event.startTime).toISOString()}` +
        `&timeMax=${new Date(event.endTime).toISOString()}` +
        `&singleEvents=true`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to check conflicts');
      }
      
      const data = await response.json();
      const conflicts = data.items || [];
      
      return conflicts.map((item: any) => ({
        id: item.id,
        title: item.summary,
        startTime: item.start?.dateTime || item.start?.date,
        endTime: item.end?.dateTime || item.end?.date,
        status: item.status
      }));
      
    } catch (error) {
      console.error('Conflict check error:', error);
      return [];
    }
  }
  
  private async generateConflictSuggestions(event: CalendarEvent, _conflicts: CalendarEvent[]) {
    const suggestions = [];
    
    // Find next available slot
    const duration = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
    const nextSlot = await this.findNextAvailableSlot(duration);
    
    if (nextSlot) {
      suggestions.push({
        type: 'reschedule',
        description: `Move to ${new Date(nextSlot.start).toLocaleString()}`,
        slot: nextSlot
      });
    }
    
    // Suggest shortening if possible
    if (duration > 30 * 60 * 1000) { // If longer than 30 minutes
      suggestions.push({
        type: 'shorten',
        description: 'Shorten meeting to 30 minutes',
        newDuration: 30
      });
    }
    
    // Suggest making it optional for some attendees
    if (event.attendees && event.attendees.length > 2) {
      suggestions.push({
        type: 'optional',
        description: 'Make optional for some attendees'
      });
    }
    
    return suggestions;
  }
  
  async findNextAvailableSlot(duration: number): Promise<{ start: Date; end: Date } | null> {
    if (!this.accessToken) return null;
    
    try {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(18, 0, 0, 0); // 6 PM
      
      // Get busy times
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/freeBusy`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            timeMin: now.toISOString(),
            timeMax: endOfDay.toISOString(),
            items: [{ id: this.calendarId }]
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to find free time');
      }
      
      const data = await response.json();
      const busy = data.calendars[this.calendarId]?.busy || [];
      
      // Find gaps
      let currentTime = now.getTime();
      
      for (const busyPeriod of busy) {
        const busyStart = new Date(busyPeriod.start).getTime();
        
        // Check if gap is large enough
        if (busyStart - currentTime >= duration) {
          return {
            start: new Date(currentTime),
            end: new Date(currentTime + duration)
          };
        }
        
        currentTime = new Date(busyPeriod.end).getTime();
      }
      
      // Check if there's time before end of day
      if (endOfDay.getTime() - currentTime >= duration) {
        return {
          start: new Date(currentTime),
          end: new Date(currentTime + duration)
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('Find free slot error:', error);
      return null;
    }
  }
  
  async updateEvent(eventId: string, updates: Partial<CalendarEvent>) {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Calendar');
    }
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${this.calendarId}/events/${eventId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to update event: ${response.statusText}`);
      }
      
      const updatedEvent = await response.json();
      
      // Log update
      await localBrain.logEvent('calendar_event_updated', {
        eventId,
        updates
      });
      
      return updatedEvent;
      
    } catch (error) {
      console.error('Update event error:', error);
      throw error;
    }
  }
  
  async deleteEvent(eventId: string) {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Calendar');
    }
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${this.calendarId}/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete event: ${response.statusText}`);
      }
      
      // Log deletion
      await localBrain.logEvent('calendar_event_deleted', { eventId });
      
      return true;
      
    } catch (error) {
      console.error('Delete event error:', error);
      throw error;
    }
  }
  
  private async refreshAccessToken() {
    if (!this.refreshToken) {
      console.log('No refresh token available');
      return false;
    }
    
    // This would typically call your backend to refresh the token
    // For now, we'll trigger re-authentication
    console.log('Token expired, need to re-authenticate');
    window.dispatchEvent(new CustomEvent('calendar-auth-required'));
    
    return false;
  }
  
  async getTodayEvents(): Promise<CalendarEvent[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const events = await localBrain.events
      .where('type')
      .equals('calendar_event')
      .and(event => {
        const eventTime = event.data.startTime 
          ? new Date(event.data.startTime).getTime()
          : event.timestamp;
        return eventTime >= today.getTime() && eventTime < tomorrow.getTime();
      })
      .toArray();
    
    return events.map(e => e.data as CalendarEvent);
  }
  
  async getUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    const events = await localBrain.events
      .where('type')
      .equals('calendar_event')
      .and(event => {
        const eventTime = event.data.startTime 
          ? new Date(event.data.startTime).getTime()
          : event.timestamp;
        return eventTime >= now.getTime() && eventTime <= future.getTime();
      })
      .toArray();
    
    return events
      .map(e => e.data as CalendarEvent)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }
  
  disconnect() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('google_calendar_tokens');
    
    console.log('📅 Google Calendar disconnected');
  }
  
  isConnected(): boolean {
    return !!this.accessToken;
  }
}

export const googleCalendar = new GoogleCalendarIntegration();
export type { CalendarEvent };
