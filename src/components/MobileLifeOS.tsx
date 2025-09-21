import React, { useState, useEffect } from 'react';
import { Home, FolderOpen, Plus, Calendar, Settings, Mail, Bot, RefreshCw } from 'lucide-react';

// Mobile-first Life OS Dashboard - Actually Working Version
export function MobileLifeOS() {
  const [activeTab, setActiveTab] = useState('home');
  const [emails, setEmails] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  // Test webhooks and get real data
  const testWebhooks = async () => {
    setLoading(true);
    setError(null);
    
    const results = {
      emails: { working: false, data: [] },
      calendar: { working: false, data: [] },
      agent: { working: false, response: null }
    };

    // Test Email Webhook
    try {
      const emailResponse = await fetch('https://ailifeassistanttm.com/api/webhook/emails', {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (emailResponse.ok) {
        const data = await emailResponse.json();
        results.emails.working = true;
        results.emails.data = data.emails || data || [];
        setEmails(results.emails.data);
      }
    } catch (err) {
      console.error('Email webhook failed:', err);
    }

    // Test Calendar Webhook
    try {
      const calendarResponse = await fetch('https://ailifeassistanttm.com/api/webhook/calendar', {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (calendarResponse.ok) {
        const data = await calendarResponse.json();
        results.calendar.working = true;
        results.calendar.data = data.events || data || [];
        setEvents(results.calendar.data);
      }
    } catch (err) {
      console.error('Calendar webhook failed:', err);
    }

    // Test AI Agent
    try {
      const agentResponse = await fetch('https://n8n.treys.cc/webhook/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'mobile-test-' + Date.now(),
          action: 'sendMessage',
          chatInput: 'Test from mobile Life OS'
        })
      });
      
      if (agentResponse.ok) {
        const data = await agentResponse.json();
        results.agent.working = true;
        results.agent.response = data;
      }
    } catch (err) {
      console.error('AI Agent webhook failed:', err);
    }

    setLoading(false);
    setLastSync(new Date());
    
    // Save results for inspection
    window.webhookResults = results;
    console.log('Webhook Test Results:', results);
    
    if (!results.emails.working && !results.calendar.working) {
      setError('Webhooks not responding. Using mock data.');
      loadMockData();
    }
    
    return results;
  };

  // Load mock data if webhooks fail
  const loadMockData = () => {
    setEmails([
      {
        id: '1',
        from: 'team@example.com',
        subject: 'Project Update Required',
        preview: 'Please update the status of the Life OS project...',
        date: new Date().toISOString(),
        isRead: false
      },
      {
        id: '2',
        from: 'client@example.com',
        subject: 'Meeting Tomorrow at 2pm',
        preview: 'Confirming our meeting for tomorrow...',
        date: new Date(Date.now() - 3600000).toISOString(),
        isRead: true
      }
    ]);
    
    setEvents([
      {
        id: '1',
        title: 'Team Standup',
        start: new Date(Date.now() + 3600000).toISOString(),
        end: new Date(Date.now() + 5400000).toISOString(),
        location: 'Zoom'
      },
      {
        id: '2',
        title: 'Client Review',
        start: new Date(Date.now() + 86400000).toISOString(),
        end: new Date(Date.now() + 90000000).toISOString(),
        location: 'Office'
      }
    ]);
  };

  // Test on mount
  useEffect(() => {
    testWebhooks();
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  // Mobile-optimized styles
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0a0e1a',
      color: '#f0f4ff',
      paddingBottom: '80px', // Space for bottom nav
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    },
    header: {
      padding: '20px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    content: {
      padding: '20px',
      paddingBottom: '100px'
    },
    card: {
      backgroundColor: 'rgba(15, 23, 41, 0.6)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px'
    },
    bottomNav: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '80px',
      backgroundColor: 'rgba(15, 23, 41, 0.95)',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingBottom: '20px', // Safe area for iPhone
      backdropFilter: 'blur(10px)'
    },
    navItem: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px',
      minWidth: '60px',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    navItemActive: {
      color: '#00d4ff'
    },
    fab: {
      position: 'absolute',
      bottom: '100px',
      right: '20px',
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      backgroundColor: '#00d4ff',
      color: '#0a0e1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0, 212, 255, 0.4)',
      cursor: 'pointer'
    },
    emailItem: {
      padding: '12px',
      borderLeft: '3px solid transparent',
      marginBottom: '8px',
      borderRadius: '8px',
      backgroundColor: 'rgba(0, 0, 0, 0.2)'
    },
    emailItemUnread: {
      borderLeftColor: '#00d4ff',
      backgroundColor: 'rgba(0, 212, 255, 0.05)'
    },
    eventItem: {
      padding: '12px',
      marginBottom: '8px',
      borderRadius: '8px',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      borderLeft: '3px solid #06b6d4'
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      backgroundColor: 'rgba(0, 212, 255, 0.2)',
      color: '#00d4ff'
    },
    errorBadge: {
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      color: '#ef4444'
    },
    successBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      color: '#10b981'
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Dashboard</h2>
            
            {/* Status Card */}
            <div style={styles.card}>
              <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#00d4ff' }}>
                System Status
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={emails.length > 0 ? styles.successBadge : styles.errorBadge}>
                  <Mail size={14} />
                  Emails: {emails.length > 0 ? `${emails.length} loaded` : 'No data'}
                </div>
                <div style={events.length > 0 ? styles.successBadge : styles.errorBadge}>
                  <Calendar size={14} />
                  Events: {events.length > 0 ? `${events.length} loaded` : 'No data'}
                </div>
                <div style={styles.statusBadge}>
                  <Bot size={14} />
                  AI Agent: Testing...
                </div>
              </div>
              {lastSync && (
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '12px' }}>
                  Last sync: {formatDate(lastSync)}
                </p>
              )}
            </div>

            {/* Quick Stats */}
            <div style={styles.card}>
              <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#00d4ff' }}>
                Today's Overview
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {emails.filter(e => !e.isRead).length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Unread Emails</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {events.length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Events Today</div>
                </div>
              </div>
            </div>

            {/* Test Webhooks Button */}
            <button
              onClick={testWebhooks}
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: loading ? 'rgba(0, 212, 255, 0.3)' : '#00d4ff',
                color: '#0a0e1a',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw size={18} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
              {loading ? 'Testing Webhooks...' : 'Refresh Data'}
            </button>

            {error && (
              <div style={{ ...styles.card, ...styles.errorBadge, marginTop: '12px' }}>
                {error}
              </div>
            )}
          </div>
        );

      case 'emails':
        return (
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Emails</h2>
            {emails.length === 0 ? (
              <div style={styles.card}>
                <p style={{ textAlign: 'center', color: '#94a3b8' }}>
                  No emails loaded. Try refreshing.
                </p>
              </div>
            ) : (
              emails.map(email => (
                <div
                  key={email.id}
                  style={{
                    ...styles.emailItem,
                    ...(email.isRead ? {} : styles.emailItemUnread)
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{email.from}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{formatDate(email.date)}</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    {email.subject}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {email.preview}
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'calendar':
        return (
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Calendar</h2>
            {events.length === 0 ? (
              <div style={styles.card}>
                <p style={{ textAlign: 'center', color: '#94a3b8' }}>
                  No events loaded. Try refreshing.
                </p>
              </div>
            ) : (
              events.map(event => (
                <div key={event.id} style={styles.eventItem}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    {event.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '2px' }}>
                    {new Date(event.start).toLocaleTimeString()} - {new Date(event.end).toLocaleTimeString()}
                  </div>
                  {event.location && (
                    <div style={{ fontSize: '12px', color: '#06b6d4' }}>
                      📍 {event.location}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        );

      case 'projects':
        return (
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Projects</h2>
            <div style={styles.card}>
              <p style={{ textAlign: 'center', color: '#94a3b8' }}>
                Project management coming soon...
              </p>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Settings</h2>
            <div style={styles.card}>
              <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Debug Info</h3>
              <pre style={{ fontSize: '10px', color: '#64748b', overflow: 'auto' }}>
                {JSON.stringify(window.webhookResults || {}, null, 2)}
              </pre>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={{ fontSize: '20px', margin: 0 }}>Life OS</h1>
        <div style={styles.statusBadge}>
          {loading ? 'Syncing...' : 'Mobile Mode'}
        </div>
      </header>

      {/* Content */}
      <main style={styles.content}>
        {renderContent()}
      </main>

      {/* FAB */}
      <div style={styles.fab}>
        <Plus size={24} />
      </div>

      {/* Bottom Navigation */}
      <nav style={styles.bottomNav}>
        <div
          style={{
            ...styles.navItem,
            ...(activeTab === 'home' ? styles.navItemActive : {})
          }}
          onClick={() => setActiveTab('home')}
        >
          <Home size={20} />
          <span style={{ fontSize: '11px', marginTop: '4px' }}>Home</span>
        </div>
        
        <div
          style={{
            ...styles.navItem,
            ...(activeTab === 'emails' ? styles.navItemActive : {})
          }}
          onClick={() => setActiveTab('emails')}
        >
          <Mail size={20} />
          <span style={{ fontSize: '11px', marginTop: '4px' }}>Emails</span>
        </div>
        
        <div
          style={{
            ...styles.navItem,
            ...(activeTab === 'projects' ? styles.navItemActive : {})
          }}
          onClick={() => setActiveTab('projects')}
        >
          <FolderOpen size={20} />
          <span style={{ fontSize: '11px', marginTop: '4px' }}>Projects</span>
        </div>
        
        <div
          style={{
            ...styles.navItem,
            ...(activeTab === 'calendar' ? styles.navItemActive : {})
          }}
          onClick={() => setActiveTab('calendar')}
        >
          <Calendar size={20} />
          <span style={{ fontSize: '11px', marginTop: '4px' }}>Calendar</span>
        </div>
        
        <div
          style={{
            ...styles.navItem,
            ...(activeTab === 'settings' ? styles.navItemActive : {})
          }}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={20} />
          <span style={{ fontSize: '11px', marginTop: '4px' }}>Settings</span>
        </div>
      </nav>

      {/* Hidden style for animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default MobileLifeOS;
