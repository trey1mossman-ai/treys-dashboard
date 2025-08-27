import { useState, useEffect } from 'react';
import { RefreshCw, Mail, Calendar, Star, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Email {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  preview?: string;
  isRead?: boolean;
  isImportant?: boolean;
  originalData?: any;
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  status: string;
  description?: string;
  location?: string;
  originalData?: any;
}

export function MobileOnlyDashboard() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [emailLoading, setEmailLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const fetchEmails = async () => {
    try {
      setEmailLoading(true);
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8788' 
        : '';
      
      const response = await fetch(`${apiUrl}/api/webhook/emails`);
      const data = await response.json();
      
      if (data.emails && Array.isArray(data.emails)) {
        const mappedEmails = data.emails.map((email: any) => ({
          id: email.id || Math.random().toString(),
          subject: email.subject || '(No Subject)',
          from: email.from || email.fromEmail || email.fromName || 'Unknown Sender',
          to: email.to || '',
          date: email.sentDate || email.timestamp || email.date,
          preview: email.preview || email.snippet || '',
          isRead: email.isRead !== undefined ? email.isRead : true,
          isImportant: email.isImportant || email.isStarred || false,
          originalData: email
        }));
        setEmails(mappedEmails);
      }
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    } finally {
      setEmailLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setEventLoading(true);
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8788' 
        : '';
      
      const response = await fetch(`${apiUrl}/api/webhook/calendar`);
      const data = await response.json();
      
      if (data.events && Array.isArray(data.events)) {
        const mappedEvents = data.events.map((event: any) => ({
          id: event.id || Math.random().toString(),
          title: event.summary || event.title || 'Untitled Event',
          startTime: event.startTime || event.start?.dateTime || event.start?.date || '',
          endTime: event.endTime || event.end?.dateTime || event.end?.date || '',
          date: event.date || event.start?.date || new Date().toISOString().split('T')[0],
          status: event.status || 'confirmed',
          description: event.description || '',
          location: event.location || '',
          originalData: event
        }));
        setEvents(mappedEvents);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setEventLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
    fetchEvents();
    const interval = setInterval(() => {
      fetchEmails();
      fetchEvents();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <div style={{
      fontFamily: 'Georgia, serif',
      backgroundColor: '#0a0e1a',
      color: '#f0f4ff',
      minHeight: '100vh',
      width: '100vw',
      maxWidth: '100vw',
      overflow: 'hidden',
      margin: 0,
      padding: 0,
      boxSizing: 'border-box'
    }}>
      {/* Mobile Header */}
      <header style={{
        width: '100%',
        padding: '12px 16px',
        background: 'rgba(15, 23, 41, 0.9)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%'
        }}>
          <h1 style={{
            fontSize: '18px',
            fontWeight: 700,
            margin: 0,
            color: '#00d4ff'
          }}>Agenda</h1>
          <span style={{
            fontSize: '12px',
            color: '#94a3b8'
          }}>{today}</span>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        padding: '16px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Emails Section */}
        <section style={{
          marginBottom: '24px',
          background: 'rgba(15, 23, 41, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail style={{ width: '16px', height: '16px', color: '#00d4ff' }} />
              <h2 style={{ 
                fontSize: '16px', 
                margin: 0, 
                fontWeight: 600,
                color: '#00d4ff'
              }}>Emails</h2>
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
                  opacity: emailLoading ? 0.5 : 1
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
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '12px',
                color: '#00d4ff'
              }}>
                {emails.length}
              </span>
            </div>
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {emailLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                Loading emails...
              </div>
            ) : emails.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                No emails found
              </div>
            ) : (
              emails.slice(0, 10).map((email) => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    background: email.isRead ? 'transparent' : 'rgba(0, 212, 255, 0.03)',
                    borderLeft: email.isRead ? 'none' : '3px solid #00d4ff',
                    transition: 'all 0.2s ease'
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.3)';
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.background = email.isRead ? 'transparent' : 'rgba(0, 212, 255, 0.03)';
                    e.currentTarget.style.boxShadow = 'none';
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
                        color: email.isRead ? '#94a3b8' : '#f0f4ff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
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
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {email.subject || 'No Subject'}
                  </div>
                  {email.preview && (
                    <div style={{
                      fontSize: '11px',
                      color: '#64748b',
                      lineHeight: '1.3',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {email.preview}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Calendar Section */}
        <section style={{
          background: 'rgba(15, 23, 41, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar style={{ width: '16px', height: '16px', color: '#06b6d4' }} />
              <h2 style={{ 
                fontSize: '16px', 
                margin: 0, 
                fontWeight: 600,
                color: '#06b6d4'
              }}>Calendar</h2>
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
                  opacity: eventLoading ? 0.5 : 1
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
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '12px',
                color: '#06b6d4'
              }}>
                {events.length}
              </span>
            </div>
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {eventLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                Loading events...
              </div>
            ) : events.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                No events found
              </div>
            ) : (
              events.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    borderLeft: `3px solid ${
                      event.status === 'confirmed' ? '#10b981' : 
                      event.status === 'tentative' ? '#f59e0b' : '#ef4444'
                    }`,
                    transition: 'all 0.2s ease'
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.3)';
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#f0f4ff',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {event.title}
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    color: '#64748b'
                  }}>
                    <span>{event.startTime} - {event.endTime}</span>
                    <span>{event.status}</span>
                  </div>
                  {event.location && (
                    <div style={{
                      fontSize: '11px',
                      color: '#94a3b8',
                      marginTop: '4px'
                    }}>
                      📍 {event.location}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Email Modal */}
      {selectedEmail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'rgba(15, 23, 41, 0.95)',
            border: '2px solid #00d4ff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '100%',
            maxHeight: '90vh',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid rgba(0, 212, 255, 0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '16px', margin: 0, color: '#00d4ff' }}>Email Details</h3>
              <button
                onClick={() => setSelectedEmail(null)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: '6px',
                  padding: '6px',
                  color: '#00d4ff',
                  cursor: 'pointer'
                }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
            
            <div style={{ padding: '16px', overflowY: 'auto', maxHeight: 'calc(90vh - 100px)' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>Subject</label>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f0f4ff' }}>
                  {selectedEmail.subject}
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>From</label>
                <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                  {selectedEmail.from}
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>Date</label>
                <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                  {selectedEmail.date ? formatDistanceToNow(new Date(selectedEmail.date), { addSuffix: true }) : 'No date'}
                </div>
              </div>
              
              {selectedEmail.preview && (
                <div style={{ marginTop: '16px' }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Content</label>
                  <div style={{
                    fontSize: '13px',
                    color: '#cbd5e1',
                    lineHeight: '1.4',
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    {selectedEmail.preview}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {selectedEvent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'rgba(15, 23, 41, 0.95)',
            border: '2px solid #06b6d4',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '100%',
            maxHeight: '90vh',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid rgba(6, 182, 212, 0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '16px', margin: 0, color: '#06b6d4' }}>Event Details</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: '6px',
                  padding: '6px',
                  color: '#06b6d4',
                  cursor: 'pointer'
                }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
            
            <div style={{ padding: '16px', overflowY: 'auto', maxHeight: 'calc(90vh - 100px)' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>Title</label>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f0f4ff' }}>
                  {selectedEvent.title}
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>Time</label>
                <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                  {selectedEvent.startTime} - {selectedEvent.endTime}
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>Status</label>
                <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                  {selectedEvent.status}
                </div>
              </div>
              
              {selectedEvent.location && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>Location</label>
                  <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                    {selectedEvent.location}
                  </div>
                </div>
              )}
              
              {selectedEvent.description && (
                <div style={{ marginTop: '16px' }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Description</label>
                  <div style={{
                    fontSize: '13px',
                    color: '#cbd5e1',
                    lineHeight: '1.4',
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    {selectedEvent.description}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}