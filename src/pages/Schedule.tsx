import { useState, useEffect, useRef } from 'react';
import { Clock, Calendar, Plus, Edit3, AlertCircle, MessageCircle, Send, X } from 'lucide-react';
import { format } from 'date-fns';

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
  category: 'work' | 'personal' | 'health' | 'break';
  status: 'upcoming' | 'current' | 'completed';
  type?: 'schedule' | 'calendar';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  
  // Quick add state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddStartTime, setQuickAddStartTime] = useState('09:00');
  const [quickAddEndTime, setQuickAddEndTime] = useState('10:00');
  const [quickAddDescription, setQuickAddDescription] = useState('');
  
  // AI Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Load schedule from localStorage and dashboard
  useEffect(() => {
    // Load saved schedule items filtered by selected date
    const savedSchedule = localStorage.getItem('dashboard_schedule');
    if (savedSchedule) {
      try {
        const parsed = JSON.parse(savedSchedule);
        // Filter by selected date
        const filteredSchedule = parsed.filter((item: any) => {
          if (!item.startTime) return false;
          const itemDate = new Date(item.startTime).toISOString().split('T')[0];
          return itemDate === selectedDate;
        });
        
        // Convert to TimeBlock format
        const scheduleBlocks: TimeBlock[] = filteredSchedule.map((item: any) => ({
          id: item.id,
          title: item.title,
          startTime: item.startTime ? new Date(item.startTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }) : '09:00',
          endTime: item.endTime ? new Date(item.endTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }) : '10:00',
          description: item.description,
          category: 'personal',
          status: item.status || 'upcoming',
          type: 'schedule'
        }));
        
        setTimeBlocks(scheduleBlocks);
      } catch (e) {
        console.error('Failed to parse saved schedule');
      }
    }
    
    // Also load calendar events filtered by selected date
    const savedEvents = localStorage.getItem('dashboard_events');
    if (savedEvents) {
      try {
        const events = JSON.parse(savedEvents);
        // Filter calendar events by selected date
        const filteredEvents = events.filter((event: any) => {
          if (!event.startTime) return false;
          const eventDate = new Date(event.startTime).toISOString().split('T')[0];
          return eventDate === selectedDate;
        });
        
        const calendarBlocks: TimeBlock[] = filteredEvents.map((event: any) => ({
          id: event.id,
          title: event.title,
          startTime: event.startTime ? new Date(event.startTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }) : '09:00',
          endTime: event.endTime ? new Date(event.endTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }) : '10:00',
          description: event.description || event.location,
          category: 'work',
          status: 'upcoming',
          type: 'calendar'
        }));
        
        setTimeBlocks(prev => {
          const scheduleOnly = prev.filter(b => b.type !== 'calendar');
          return [...scheduleOnly, ...calendarBlocks].sort((a, b) => 
            a.startTime.localeCompare(b.startTime)
          );
        });
      } catch (e) {
        console.error('Failed to parse calendar events');
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const getCurrentTimeSlot = () => {
    const now = currentTime;
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes() < 30 ? '00' : '30';
    return `${currentHour}:${currentMinute}`;
  };

  const isCurrentTimeSlot = (timeSlot: string) => {
    return timeSlot === getCurrentTimeSlot();
  };

  const getBlockForTimeSlot = (timeSlot: string) => {
    return timeBlocks.find(block => {
      const blockStart = block.startTime;
      const blockEnd = block.endTime;
      return timeSlot >= blockStart && timeSlot < blockEnd;
    });
  };

  const handleQuickAdd = () => {
    if (!quickAddTitle.trim()) return;
    
    const [startHour, startMin] = quickAddStartTime.split(':');
    const [endHour, endMin] = quickAddEndTime.split(':');
    
    const startDateTime = new Date(selectedDate);
    startDateTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
    
    const endDateTime = new Date(selectedDate);
    endDateTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);
    
    const newBlock: TimeBlock = {
      id: Date.now().toString(),
      title: quickAddTitle,
      startTime: quickAddStartTime,
      endTime: quickAddEndTime,
      description: quickAddDescription,
      category: 'personal',
      status: 'upcoming',
      type: 'schedule'
    };
    
    const updatedBlocks = [...timeBlocks, newBlock].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
    
    setTimeBlocks(updatedBlocks);
    
    // Save to localStorage for dashboard
    const scheduleForDashboard = {
      id: newBlock.id,
      title: newBlock.title,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      type: 'schedule',
      description: newBlock.description,
      location: null,
      status: newBlock.status
    };
    
    let existingSchedule = [];
    const saved = localStorage.getItem('dashboard_schedule');
    if (saved) {
      try {
        existingSchedule = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved schedule');
      }
    }
    
    const updatedSchedule = [...existingSchedule, scheduleForDashboard];
    localStorage.setItem('dashboard_schedule', JSON.stringify(updatedSchedule));
    
    // If this is for today, trigger dashboard refresh
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduleDate = new Date(selectedDate);
    scheduleDate.setHours(0, 0, 0, 0);
    
    if (today.getTime() === scheduleDate.getTime()) {
      window.dispatchEvent(new CustomEvent('scheduleUpdated', { 
        detail: { scheduleItem: scheduleForDashboard } 
      }));
    }
    
    // Reset form
    setQuickAddTitle('');
    setQuickAddDescription('');
    setQuickAddStartTime('09:00');
    setQuickAddEndTime('10:00');
    setShowQuickAdd(false);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'work': return 'var(--accent-500)';
      case 'health': return 'var(--success-500)';
      case 'personal': return 'var(--warn-500)';
      case 'break': return 'var(--text-muted)';
      default: return 'var(--accent-500)';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'var(--success-500)';
      case 'current': return 'var(--accent-500)';
      case 'upcoming': return 'var(--text-muted)';
      default: return 'var(--text-muted)';
    }
  };

  // AI Chat handler
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8788' 
        : 'https://ailifeassistanttm.com';
      
      // Get user's timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const response = await fetch(`${apiUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: chatInput,
          context: 'schedule_management',
          scheduleItems: timeBlocks,
          timezone: userTimezone
        })
      });
      
      const data = await response.json();
      
      // Helper function to create and save a schedule item
      const createAndSaveScheduleItem = (scheduleData: any) => {
        // Ensure we have proper datetime
        let startDateTime, endDateTime;
        
        if (scheduleData.startTime && scheduleData.startTime.includes('T')) {
          // Already has full datetime
          startDateTime = new Date(scheduleData.startTime);
          endDateTime = new Date(scheduleData.endTime);
        } else {
          // Only has time, combine with selected date
          const [startHour, startMin] = (scheduleData.startTime || '09:00').split(':');
          const [endHour, endMin] = (scheduleData.endTime || '10:00').split(':');
          
          startDateTime = new Date(selectedDate);
          startDateTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
          
          endDateTime = new Date(selectedDate);
          endDateTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);
        }
        
        const newBlock: TimeBlock = {
          id: `${Date.now()}-${Math.random()}`,
          title: scheduleData.title,
          startTime: startDateTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
          endTime: endDateTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
          description: scheduleData.description || '',
          category: 'personal',
          status: 'upcoming',
          type: 'schedule'
        };
        
        // Return both the block and the dashboard format
        return {
          block: newBlock,
          dashboardItem: {
            id: newBlock.id,
            title: newBlock.title,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            type: 'schedule',
            description: newBlock.description,
            location: null,
            status: newBlock.status
          },
          startDateTime,
          endDateTime
        };
      };
      
      // Handle single or multiple schedule creation
      const itemsToAdd = [];
      const dashboardItems = [];
      
      if (data.action === 'create_schedule' && data.scheduleData) {
        // Single item
        const result = createAndSaveScheduleItem(data.scheduleData);
        itemsToAdd.push(result.block);
        dashboardItems.push(result.dashboardItem);
      } else if (data.action === 'create_multiple_schedules' && data.scheduleItems) {
        // Multiple items
        for (const item of data.scheduleItems) {
          const result = createAndSaveScheduleItem(item);
          itemsToAdd.push(result.block);
          dashboardItems.push(result.dashboardItem);
        }
      }
      
      // Update UI if we have items to add
      if (itemsToAdd.length > 0) {
        const updatedBlocks = [...timeBlocks, ...itemsToAdd].sort((a, b) => {
          return a.startTime.localeCompare(b.startTime);
        });
        setTimeBlocks(updatedBlocks);
        
        // Save all to localStorage
        let existingSchedule = [];
        const saved = localStorage.getItem('dashboard_schedule');
        if (saved) {
          try {
            existingSchedule = JSON.parse(saved);
          } catch (e) {
            console.error('Failed to parse saved schedule');
          }
        }
        
        const updatedSchedule = [...existingSchedule, ...dashboardItems];
        localStorage.setItem('dashboard_schedule', JSON.stringify(updatedSchedule));
        
        console.log('Saved schedule items to localStorage:', dashboardItems);
        
        // Trigger refresh if any items are for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduleDate = new Date(selectedDate);
        scheduleDate.setHours(0, 0, 0, 0);
        
        if (today.getTime() === scheduleDate.getTime()) {
          window.dispatchEvent(new CustomEvent('scheduleUpdated', { 
            detail: { scheduleItems: dashboardItems } 
          }));
        }
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || data.message || 'Schedule item created successfully!',
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I can help you manage your schedule! Try saying things like "Add meeting at 2pm" or "Schedule workout at 6am tomorrow".',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="schedule-container" style={{
      fontFamily: 'Georgia, serif',
      padding: 'clamp(1rem, 3vw, 2rem)',
      maxWidth: '1600px',
      margin: '0 auto',
      background: 'var(--bg-gradient)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div className="schedule-header card-enhanced" style={{
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
        borderRadius: 'var(--radius-card)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Calendar className="w-8 h-8" style={{ color: 'var(--accent-500)' }} />
            <div>
              <h1 style={{
                fontSize: 'var(--font-h1)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0
              }}>
                Daily Schedule
              </h1>
              <p style={{
                fontSize: 'var(--font-body)',
                color: 'var(--text-secondary)',
                margin: '0.5rem 0 0 0'
              }}>
                AI-powered schedule management
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-enhanced"
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-button)'
              }}
            />
            <button 
              onClick={() => setShowQuickAdd(true)}
              className="button-high-contrast" 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
                border: 'none',
                color: 'white'
              }}
            >
              <Plus className="w-4 h-4" />
              Quick Add
            </button>
            <button 
              onClick={() => setChatOpen(true)}
              className="button-high-contrast" 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                border: 'none',
                color: 'white'
              }}
            >
              <MessageCircle className="w-4 h-4" />
              AI Assistant
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 'var(--space-4)'
      }}>
        {/* Time Slots Column */}
        <div className="card-enhanced" style={{
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-card)',
          height: 'fit-content'
        }}>
          <h2 style={{
            fontSize: 'var(--font-h3)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)'
          }}>
            <Clock className="w-5 h-5" style={{ color: 'var(--accent-500)' }} />
            Time Slots
          </h2>

          <div style={{
            maxHeight: '70vh',
            overflowY: 'auto',
            scrollbarWidth: 'thin'
          }}>
            {timeSlots.map((timeSlot) => {
              const block = getBlockForTimeSlot(timeSlot);
              const isCurrent = isCurrentTimeSlot(timeSlot);

              return (
                <div
                  key={timeSlot}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 'var(--space-2)',
                    marginBottom: '2px',
                    borderRadius: 'var(--radius-small)',
                    background: isCurrent 
                      ? 'rgba(96, 165, 250, 0.2)' 
                      : block 
                        ? block.type === 'calendar' 
                          ? 'rgba(6, 182, 212, 0.1)'
                          : `rgba(${getCategoryColor(block.category).replace('var(', '').replace(')', '')}, 0.1)`
                        : 'transparent',
                    border: isCurrent ? '2px solid var(--accent-500)' : '1px solid var(--border-default)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{
                    minWidth: '60px',
                    fontSize: 'var(--font-small)',
                    fontFamily: 'Georgia, monospace',
                    color: isCurrent ? 'var(--accent-400)' : 'var(--text-secondary)',
                    fontWeight: isCurrent ? 600 : 400
                  }}>
                    {timeSlot}
                  </div>

                  {block ? (
                    <div style={{
                      flex: 1,
                      marginLeft: 'var(--space-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{
                          fontSize: 'var(--font-small)',
                          fontWeight: 600,
                          color: 'var(--text-primary)'
                        }}>
                          {block.type === 'calendar' ? '🗓️' : '📅'} {block.title}
                        </div>
                        {block.description && (
                          <div style={{
                            fontSize: 'var(--font-small)',
                            color: 'var(--text-muted)',
                            marginTop: '0.25rem'
                          }}>
                            {block.description}
                          </div>
                        )}
                      </div>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: block.type === 'calendar' ? '#06b6d4' : getStatusColor(block.status)
                      }} />
                    </div>
                  ) : (
                    <div style={{
                      flex: 1,
                      marginLeft: 'var(--space-2)',
                      color: 'var(--text-muted)',
                      fontSize: 'var(--font-small)',
                      fontStyle: 'italic'
                    }}>
                      {isCurrent ? 'Free time - current' : 'Free time'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule Blocks Column */}
        <div className="card-enhanced" style={{
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-card)',
          height: 'fit-content'
        }}>
          <h2 style={{
            fontSize: 'var(--font-h3)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)'
          }}>
            <Edit3 className="w-5 h-5" style={{ color: 'var(--accent-500)' }} />
            Schedule Blocks
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {timeBlocks.length === 0 ? (
              <div style={{
                padding: 'var(--space-4)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 'var(--font-body)',
                fontStyle: 'italic'
              }}>
                No schedule items yet. Use the AI Assistant to add items!
              </div>
            ) : (
              timeBlocks.map((block) => (
                <div
                  key={block.id}
                  className="list-item-interactive"
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-medium)',
                    border: `2px solid ${block.type === 'calendar' ? '#06b6d4' : getCategoryColor(block.category)}`,
                    background: block.type === 'calendar' 
                      ? 'rgba(6, 182, 212, 0.1)'
                      : `rgba(${getCategoryColor(block.category).replace('var(', '').replace(')', '')}, 0.1)`,
                    position: 'relative'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-2)'
                  }}>
                    <div style={{
                      fontSize: 'var(--font-body)',
                      fontWeight: 600,
                      color: 'var(--text-primary)'
                    }}>
                      {block.type === 'calendar' ? '🗓️' : '📅'} {block.title}
                    </div>
                    <div style={{
                      fontSize: 'var(--font-small)',
                      fontFamily: 'Georgia, monospace',
                      color: 'var(--text-secondary)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 'var(--radius-small)'
                    }}>
                      {block.startTime} - {block.endTime}
                    </div>
                  </div>

                  {block.description && (
                    <div style={{
                      fontSize: 'var(--font-small)',
                      color: 'var(--text-secondary)',
                      marginBottom: 'var(--space-2)'
                    }}>
                      {block.description}
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)'
                    }}>
                      <span style={{
                        fontSize: 'var(--font-small)',
                        color: block.type === 'calendar' ? '#06b6d4' : 'var(--text-muted)',
                        textTransform: 'capitalize'
                      }}>
                        {block.type === 'calendar' ? 'Calendar Event' : block.category}
                      </span>
                    </div>

                    {block.type !== 'calendar' && (
                      <button 
                        className="button-responsive" 
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: 'var(--font-small)'
                        }}
                        onClick={() => {
                          const updatedBlocks = timeBlocks.filter(b => b.id !== block.id);
                          setTimeBlocks(updatedBlocks);
                          const scheduleOnly = updatedBlocks.filter(b => b.type === 'schedule');
                          localStorage.setItem('dashboard_schedule', JSON.stringify(scheduleOnly));
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      {showQuickAdd && (
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
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            width: '400px',
            maxWidth: '90vw',
            background: '#0f1729',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#06b6d4' }}>
                Quick Add Schedule Item
              </h3>
              <button
                onClick={() => setShowQuickAdd(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '13px' }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  placeholder="e.g., Team Meeting"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: '8px',
                    color: '#f0f4ff',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '13px' }}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={quickAddStartTime}
                    onChange={(e) => setQuickAddStartTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      borderRadius: '8px',
                      color: '#f0f4ff',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '13px' }}>
                    End Time
                  </label>
                  <input
                    type="time"
                    value={quickAddEndTime}
                    onChange={(e) => setQuickAddEndTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      borderRadius: '8px',
                      color: '#f0f4ff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '13px' }}>
                  Description (optional)
                </label>
                <textarea
                  value={quickAddDescription}
                  onChange={(e) => setQuickAddDescription(e.target.value)}
                  placeholder="Add notes or details..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: '8px',
                    color: '#f0f4ff',
                    fontSize: '14px',
                    resize: 'none'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setShowQuickAdd(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickAdd}
                  disabled={!quickAddTitle.trim()}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: quickAddTitle.trim() 
                      ? 'linear-gradient(135deg, #06b6d4, #0ea5e9)' 
                      : 'rgba(6, 182, 212, 0.3)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: quickAddTitle.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  Add to Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Interface */}
      {chatOpen && (
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
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            width: '500px',
            maxWidth: '90vw',
            height: '600px',
            maxHeight: '80vh',
            background: '#0f1729',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Chat Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#a78bfa' }}>AI Schedule Assistant</h3>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                  Tell me what you want to schedule
                </p>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* Chat Messages */}
            <div 
              ref={chatScrollRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {chatMessages.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '13px',
                  padding: '20px'
                }}>
                  <p>👋 Hi! I can help you manage your schedule.</p>
                  <p style={{ marginTop: '8px' }}>Try saying:</p>
                  <div style={{ 
                    marginTop: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <p style={{ 
                      fontStyle: 'italic',
                      color: '#94a3b8',
                      padding: '8px',
                      background: 'rgba(139, 92, 246, 0.1)',
                      borderRadius: '8px'
                    }}>
                      "Add team meeting at 2pm tomorrow"
                    </p>
                    <p style={{ 
                      fontStyle: 'italic',
                      color: '#94a3b8',
                      padding: '8px',
                      background: 'rgba(139, 92, 246, 0.1)',
                      borderRadius: '8px'
                    }}>
                      "Schedule workout at 6am for 1 hour"
                    </p>
                    <p style={{ 
                      fontStyle: 'italic',
                      color: '#94a3b8',
                      padding: '8px',
                      background: 'rgba(139, 92, 246, 0.1)',
                      borderRadius: '8px'
                    }}>
                      "Block time for deep work from 9 to 11am"
                    </p>
                  </div>
                </div>
              )}
              
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%'
                  }}
                >
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: msg.role === 'user' 
                      ? 'linear-gradient(135deg, #667eea, #764ba2)'
                      : 'rgba(30, 41, 59, 0.8)',
                    border: msg.role === 'assistant' ? '1px solid rgba(139, 92, 246, 0.2)' : 'none',
                    color: '#f0f4ff'
                  }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '13px',
                      lineHeight: '1.4',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.content}
                    </p>
                    <span style={{
                      fontSize: '10px',
                      color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : '#64748b',
                      marginTop: '4px',
                      display: 'block'
                    }}>
                      {format(msg.timestamp, 'HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
              
              {chatLoading && (
                <div style={{
                  alignSelf: 'flex-start',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    gap: '4px',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#a78bfa',
                      animation: 'bounce 1.4s infinite'
                    }}></span>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#a78bfa',
                      animation: 'bounce 1.4s infinite 0.2s'
                    }}></span>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#a78bfa',
                      animation: 'bounce 1.4s infinite 0.4s'
                    }}></span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form 
              onSubmit={handleChatSubmit}
              style={{
                padding: '12px',
                borderTop: '1px solid rgba(139, 92, 246, 0.2)',
                display: 'flex',
                gap: '8px'
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Tell me what to schedule..."
                disabled={chatLoading}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  color: '#f0f4ff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  padding: '10px 14px',
                  background: chatLoading || !chatInput.trim() 
                    ? 'rgba(139, 92, 246, 0.3)'
                    : 'linear-gradient(135deg, #667eea, #764ba2)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Send style={{ width: '16px', height: '16px', color: 'white' }} />
              </button>
            </form>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes bounce {
            0%, 60%, 100% {
              transform: translateY(0);
            }
            30% {
              transform: translateY(-10px);
            }
          }
        `}
      </style>
    </div>
  );
}