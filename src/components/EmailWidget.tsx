import { useState, useEffect } from 'react';
import { Mail, Inbox, Star, Clock, X, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import '../styles/widget-effects.css';

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

export function EmailWidget() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch emails function - moved outside useEffect for reusability
  const fetchEmails = async () => {
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8788' 
        : '';
      
      console.log('📧 Fetching emails from:', `${apiUrl}/api/webhook/emails`);
      const response = await fetch(`${apiUrl}/api/webhook/emails`);
      const data = await response.json();
      console.log('📧 Email data received:', data);
      
      if (data.emails && Array.isArray(data.emails)) {
        const mappedEmails = data.emails.map((email: any) => ({
          id: email.id || email.messageId,
          subject: email.subject || 'No Subject',
          from: email.from || 'Unknown',
          to: email.to || '',
          date: email.date || new Date().toISOString(),
          preview: email.snippet || email.preview || '',
          isRead: email.isRead !== undefined ? email.isRead : false,
          isImportant: email.isImportant || false,
          originalData: email
        }));
        
        const sortedEmails = mappedEmails.sort((a: Email, b: Email) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        setEmails(sortedEmails.slice(0, 20));
        setError(null);
        console.log('📧 Emails set:', sortedEmails.length, 'emails');
      } else {
        setEmails([]);
        console.log('📧 No emails found');
      }
    } catch (err) {
      console.error('Failed to fetch emails:', err);
      setError('Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const triggerEmailRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 Triggering email refresh webhook...');
      const response = await fetch('https://flow.voxemarketing.com/webhook/c14a535e-80bf-4bd9-9b3d-1001e6917d85?trigger=manual_refresh', {
        method: 'GET'
      });
      
      if (response.ok) {
        console.log('✅ Email refresh webhook triggered successfully');
        // Wait a moment for the webhook to process, then fetch updated data
        setTimeout(() => {
          fetchEmails();
        }, 2000);
      } else {
        console.error('❌ Email refresh webhook failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Email refresh webhook error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch emails on mount and every 30 seconds
  useEffect(() => {
    fetchEmails();
    const interval = setInterval(fetchEmails, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Recent Emails</h3>
        </div>
        <div className="text-muted-foreground text-sm">Loading emails...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Recent Emails</h3>
        </div>
        <div className="text-muted-foreground text-sm">{error}</div>
      </div>
    );
  }

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
          <Mail className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <h3 className="text-lg font-semibold text-cyan-400 truncate" style={{ fontFamily: 'Georgia, serif' }}>Recent Emails</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={triggerEmailRefresh}
            disabled={isRefreshing}
            className="w-12 h-12 flex items-center justify-center rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 disabled:opacity-50 transition-all"
            title="Refresh emails"
          >
            <RefreshCw className={`w-5 h-5 text-cyan-400 ${
              isRefreshing ? 'animate-spin' : ''
            }`} />
          </button>
          <span className="text-sm px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            {emails.length}
          </span>
        </div>
      </div>
      
      <div className="widget-content" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {emails.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Inbox className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-base mb-2">No recent emails</p>
            <p className="text-sm opacity-75">Emails will appear here when your n8n workflow sends them</p>
          </div>
        ) : (
          <div className="space-y-1">
            {emails.slice(0, 10).map((email, index) => (
              <div
                key={email.id}
                className={`widget-item ${
                  !email.isRead ? 'border-l-4 border-l-cyan-400 bg-cyan-500/5' : ''
                }`}
                onClick={() => setSelectedEmail(email)}
              >
                <div className="widget-item-content">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {email.isImportant && (
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                      )}
                      <span className={`font-medium truncate ${
                        !email.isRead ? 'text-white' : 'text-gray-300'
                      }`} style={{ fontFamily: 'Georgia, serif' }}>
                        {email.from}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!email.isRead && (
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                      )}
                      <span className="text-gray-400 text-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {email.date ? formatDistanceToNow(new Date(email.date), { addSuffix: true }) : 'No date'}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`font-medium mb-1 ${
                    !email.isRead ? 'text-white' : 'text-gray-200'
                  }`} style={{ fontFamily: 'Georgia, serif' }}>
                    {email.subject || 'No Subject'}
                  </div>
                  
                  {email.preview && (
                    <div className="text-gray-400 text-sm leading-relaxed line-clamp-2" style={{ fontFamily: 'Georgia, serif' }}>
                      {email.preview}
                    </div>
                  )}
                </div>
                
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Email Popup Modal */}
      {selectedEmail && (
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
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-accent-500 flex-shrink-0" />
                  <h3 className="enhanced-text truncate" style={{ 
                    fontSize: 'clamp(16px, 4vw, 20px)', 
                    fontWeight: 600, 
                    color: 'var(--accent-500)',
                    fontFamily: 'Georgia, serif'
                  }}>Email Details</h3>
                </div>
                <button
                  onClick={() => setSelectedEmail(null)}
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
              {/* Email Header */}
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-text-muted" style={{ fontFamily: 'Georgia, serif' }}>Subject</label>
                  <div className="font-semibold text-accent-400 mt-1 break-words" style={{ 
                    fontFamily: 'Georgia, serif',
                    fontSize: 'clamp(14px, 4vw, 18px)'
                  }}>
                    {selectedEmail.subject}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div className="card-responsive" style={{ padding: 'clamp(10px, 2vw, 12px)' }}>
                    <label className="text-xs sm:text-sm font-medium text-text-muted flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}>
                      <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      From
                    </label>
                    <div className="font-medium text-text-primary mt-1 break-words" style={{ 
                      fontFamily: 'Georgia, serif',
                      fontSize: 'clamp(12px, 3vw, 14px)'
                    }}>
                      {selectedEmail.originalData?.fromName || selectedEmail.originalData?.fromEmail || selectedEmail.from}
                    </div>
                  </div>
                  <div className="card-responsive" style={{ padding: 'clamp(10px, 2vw, 12px)' }}>
                    <label className="text-xs sm:text-sm font-medium text-text-muted flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}>
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      Date
                    </label>
                    <div className="font-medium text-text-primary mt-1" style={{ 
                      fontFamily: 'Georgia, serif',
                      fontSize: 'clamp(12px, 3vw, 14px)'
                    }}>
                      {formatDistanceToNow(new Date(selectedEmail.date), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {selectedEmail.isImportant && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300" style={{ fontFamily: 'Georgia, serif' }}>Important</span>
                    </div>
                  )}
                  <div className={`px-3 py-2 rounded-full border ${
                    !selectedEmail.isRead 
                      ? 'bg-accent-500/20 border-accent-500/30 text-accent-400' 
                      : 'bg-white/5 border-white/10 text-text-muted'
                  }`}>
                    <span className="text-sm font-medium" style={{ fontFamily: 'Georgia, serif' }}>
                      {selectedEmail.isRead ? 'Read' : 'Unread'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Email Body */}
              <div className="border-t-2 border-accent-500/20 pt-4">
                <label className="text-sm font-medium text-text-muted mb-3 flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}>
                  Message Content
                </label>
                <div className="card-responsive mt-3" style={{ 
                  padding: 'var(--space-4)',
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--border-default)'
                }}>
                  <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                    {selectedEmail.preview || 'No content available'}
                  </div>
                </div>
              </div>
              
              {/* Additional Data */}
              {selectedEmail.originalData && (
                <div className="mt-4 border-t border-border pt-4">
                  <label className="text-sm font-medium text-muted-foreground">Additional Information</label>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div><span className="font-medium">ID:</span> {selectedEmail.originalData.id}</div>
                    <div><span className="font-medium">Thread:</span> {selectedEmail.originalData.threadId}</div>
                    {selectedEmail.originalData.labels?.length > 0 && (
                      <div className="col-span-2"><span className="font-medium">Labels:</span> {selectedEmail.originalData.labels.join(', ')}</div>
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