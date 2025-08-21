import { useState, useEffect } from 'react';
import { patternDetector } from '@/lib/intelligence/pattern-detector';
import { autoPilot } from '@/lib/automation/autopilot';
import { modelRouter } from '@/lib/ai/model-router';
import { localBrain } from '@/lib/database/local-brain';

interface Suggestion {
  id: string;
  text: string;
  action: () => Promise<void>;
  confidence: number;
  type: 'pattern' | 'time' | 'context' | 'anomaly';
  dismissible: boolean;
}

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'suggestion';
  persistent: boolean;
}

export function ProactiveAssistant() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLearning, setIsLearning] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  
  useEffect(() => {
    // Initialize autopilot listeners
    setupAutoPilotListeners();
    
    // Start proactive monitoring
    startProactiveMonitoring();
    
    // Listen for custom events from other components
    setupEventListeners();
    
    return () => {
      // Cleanup
    };
  }, []);
  
  const setupAutoPilotListeners = () => {
    // Listen to autopilot events
    autoPilot.on('activity_suggested', (prediction: any) => {
      addSuggestion({
        id: `activity_${Date.now()}`,
        text: `Time for ${prediction.activity}?`,
        action: async () => executeActivity(prediction.activity),
        confidence: prediction.confidence,
        type: 'pattern',
        dismissible: true
      });
    });
    
    autoPilot.on('conflict_resolution_required', (data: any) => {
      addNotification({
        id: `conflict_${Date.now()}`,
        message: `Calendar conflict detected: ${data.conflict.event1.title} overlaps with ${data.conflict.event2.title}`,
        type: 'warning',
        persistent: true
      });
    });
    
    autoPilot.on('pattern_suggestion', (data: any) => {
      addSuggestion({
        id: `pattern_${Date.now()}`,
        text: data.suggestion,
        action: async () => await handlePatternSuggestion(data),
        confidence: data.confidence,
        type: 'pattern',
        dismissible: true
      });
    });
  };
  
  const setupEventListeners = () => {
    // Listen for notifications from other components
    window.addEventListener('lifeos:notification', (event: any) => {
      const { message, type } = event.detail;
      addNotification({
        id: `notification_${Date.now()}`,
        message,
        type: type || 'info',
        persistent: false
      });
    });
    
    // Listen for learning events
    window.addEventListener('lifeos:learning_update', (event: any) => {
      setIsLearning(event.detail.isLearning);
    });
  };
  
  const startProactiveMonitoring = () => {
    // Check every 5 minutes for proactive suggestions
    const interval = setInterval(async () => {
      await performProactiveCheck();
    }, 5 * 60 * 1000);
    
    // Initial check
    performProactiveCheck();
    
    return () => clearInterval(interval);
  };
  
  const performProactiveCheck = async () => {
    try {
      setLastCheck(new Date());
      
      // Gather current context
      const context = await gatherContext();
      
      // Get prediction from pattern detector
      const prediction = await patternDetector.predictNext(context);
      
      if (prediction.confidence > 0.7) {
        // High confidence - suggest action
        addSuggestion({
          id: `prediction_${Date.now()}`,
          text: `Based on your patterns: ${prediction.activity}`,
          action: async () => await executeActivity(prediction.activity),
          confidence: prediction.confidence,
          type: 'pattern',
          dismissible: true
        });
      }
      
      // Check for anomalies
      const anomaly = await detectAnomaly(context);
      if (anomaly) {
        addNotification({
          id: `anomaly_${Date.now()}`,
          message: `Unusual pattern detected: ${anomaly.description}`,
          type: 'info',
          persistent: false
        });
      }
      
      // Check for time-sensitive suggestions
      await checkTimeSensitiveSuggestions();
      
      // Check system health
      await checkSystemHealth();
      
    } catch (error) {
      console.error('Proactive check error:', error);
    }
  };
  
  const gatherContext = async () => {
    const now = new Date();
    const recentEvents = await localBrain.events
      .where('timestamp')
      .above(Date.now() - 24 * 60 * 60 * 1000)
      .toArray();
    
    return {
      time: now,
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
      recentEvents,
      patterns: await patternDetector.getPatternSummary()
    };
  };
  
  const detectAnomaly = async (context: any) => {
    const hour = context.hour;
    const dayOfWeek = context.dayOfWeek;
    
    // Check if current activity is unusual for this time
    const recentActivity = context.recentEvents.slice(-5);
    
    // Example anomaly detection
    if (hour < 7 && recentActivity.length > 0) {
      return {
        description: 'Unusual early activity detected',
        severity: 'low'
      };
    }
    
    if (hour > 23 && recentActivity.length > 2) {
      return {
        description: 'Late night activity - consider rest',
        severity: 'medium'
      };
    }
    
    // Weekend work detection
    if ([0, 6].includes(dayOfWeek) && recentActivity.some((e: any) => e.type.includes('work'))) {
      return {
        description: 'Work activity on weekend - consider work-life balance',
        severity: 'low'
      };
    }
    
    return null;
  };
  
  const checkTimeSensitiveSuggestions = async () => {
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    
    // Morning routine suggestions
    if (hour === 8 && minute < 30) {
      addSuggestion({
        id: 'morning_routine',
        text: '🌅 Start your morning routine?',
        action: async () => await createMorningRoutine(),
        confidence: 0.8,
        type: 'time',
        dismissible: true
      });
    }
    
    // Lunch reminder
    if (hour === 12 && minute < 15) {
      addSuggestion({
        id: 'lunch_break',
        text: '🍽️ Time for lunch break?',
        action: async () => await scheduleLunchBreak(),
        confidence: 0.85,
        type: 'time',
        dismissible: true
      });
    }
    
    // End of day wind-down
    if (hour === 17 && minute < 30) {
      addSuggestion({
        id: 'end_of_day',
        text: '📝 Review today and plan tomorrow?',
        action: async () => await startEndOfDayRoutine(),
        confidence: 0.9,
        type: 'time',
        dismissible: true
      });
    }
    
    // Hydration reminders (every 2 hours during work)
    if (hour >= 9 && hour <= 17 && minute === 0 && hour % 2 === 0) {
      addSuggestion({
        id: `hydration_${hour}`,
        text: '💧 Hydration reminder',
        action: async () => await logHydration(),
        confidence: 0.7,
        type: 'time',
        dismissible: true
      });
    }
  };
  
  const checkSystemHealth = async () => {
    try {
      const stats = await modelRouter.getUsageStats();
      
      // Check cache performance
      if (stats.cache.hitRate < 0.6) {
        addNotification({
          id: 'cache_performance',
          message: `Cache hit rate low (${(stats.cache.hitRate * 100).toFixed(1)}%). System learning...`,
          type: 'info',
          persistent: false
        });
      }
      
      // Check daily cost
      const dailyCost = stats.cost.daily;
      if (dailyCost > 2.5) { // 75% of $3.33 daily budget
        addNotification({
          id: 'cost_warning',
          message: `Daily AI cost approaching limit: $${dailyCost}`,
          type: 'warning',
          persistent: true
        });
      }
      
    } catch (error) {
      console.error('System health check error:', error);
    }
  };
  
  const executeActivity = async (activity: string) => {
    const activityMap: Record<string, () => Promise<void>> = {
      'deep_work': () => createTimeBlock('Deep Work Session', 90),
      'email_triage': () => createTask('Email Triage'),
      'workout': () => createTimeBlock('Workout', 60),
      'planning': () => createTimeBlock('Planning Session', 30),
      'meetings_collaboration': () => createTimeBlock('Collaboration Time', 60),
      'low_energy_tasks': () => createTask('Administrative Tasks'),
      'weekly_planning': () => createTimeBlock('Weekly Planning', 45)
    };
    
    const action = activityMap[activity];
    if (action) {
      await action();
      showSuccess(`Scheduled: ${activity.replace('_', ' ')}`);
    } else {
      await createTask(activity);
      showSuccess(`Created task: ${activity}`);
    }
  };
  
  const createTimeBlock = async (title: string, duration: number = 60) => {
    const event = {
      id: `block_${Date.now()}`,
      title,
      startTime: new Date(),
      endTime: new Date(Date.now() + duration * 60000),
      type: 'focus'
    };
    
    window.dispatchEvent(new CustomEvent('lifeos:event_created', { detail: event }));
    await localBrain.logEvent('time_block_created', event);
  };
  
  const createTask = async (title: string) => {
    const task = {
      id: `task_${Date.now()}`,
      title,
      createdAt: new Date(),
      priority: 'medium'
    };
    
    window.dispatchEvent(new CustomEvent('lifeos:task_created', { detail: task }));
    await localBrain.logEvent('task_created', task);
  };
  
  const createMorningRoutine = async () => {
    const tasks = [
      'Review daily agenda',
      'Check priorities',
      'Review emails'
    ];
    
    for (const task of tasks) {
      await createTask(task);
    }
    showSuccess('Morning routine created');
  };
  
  const scheduleLunchBreak = async () => {
    await createTimeBlock('Lunch Break', 60);
    showSuccess('Lunch break scheduled');
  };
  
  const startEndOfDayRoutine = async () => {
    const tasks = [
      'Review completed tasks',
      'Plan tomorrow priorities',
      'Clear desk/workspace'
    ];
    
    for (const task of tasks) {
      await createTask(task);
    }
    showSuccess('End of day routine started');
  };
  
  const logHydration = async () => {
    await localBrain.logEvent('hydration', { timestamp: Date.now() });
    showSuccess('Hydration logged');
  };
  
  const handlePatternSuggestion = async (data: any) => {
    // Handle pattern-based suggestions
    await createTask(data.suggestion);
    showSuccess('Pattern suggestion applied');
  };
  
  const addSuggestion = (suggestion: Suggestion) => {
    setSuggestions(prev => {
      // Remove duplicates and limit to 3 suggestions
      const filtered = prev.filter(s => s.id !== suggestion.id);
      return [suggestion, ...filtered].slice(0, 3);
    });
    
    // Auto-dismiss after 10 minutes if dismissible
    if (suggestion.dismissible) {
      setTimeout(() => {
        dismissSuggestion(suggestion.id);
      }, 10 * 60 * 1000);
    }
  };
  
  const addNotification = (notification: Notification) => {
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== notification.id);
      return [notification, ...filtered].slice(0, 2);
    });
    
    // Auto-dismiss non-persistent notifications after 5 seconds
    if (!notification.persistent) {
      setTimeout(() => {
        dismissNotification(notification.id);
      }, 5000);
    }
  };
  
  const dismissSuggestion = (id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };
  
  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  const showSuccess = (message: string) => {
    addNotification({
      id: `success_${Date.now()}`,
      message,
      type: 'success',
      persistent: false
    });
  };
  
  if (suggestions.length === 0 && notifications.length === 0) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-40 space-y-2 max-w-sm">
      {/* Learning indicator */}
      {isLearning && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 flex items-center gap-2 text-sm">
          <div className="animate-pulse w-2 h-2 bg-primary rounded-full"></div>
          <span>Learning from your patterns...</span>
        </div>
      )}
      
      {/* Notifications */}
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={`p-3 rounded-lg border animate-slide-up ${getNotificationStyles(notification.type)}`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm flex-1">{notification.message}</p>
            <button 
              onClick={() => dismissNotification(notification.id)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      ))}
      
      {/* Suggestions */}
      {suggestions.map(suggestion => (
        <div 
          key={suggestion.id}
          className="bg-card border rounded-lg p-3 animate-slide-up shadow-lg"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-sm flex-1">{suggestion.text}</p>
            {suggestion.dismissible && (
              <button 
                onClick={() => dismissSuggestion(suggestion.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ×
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <button 
                onClick={suggestion.action}
                className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                Yes, do it
              </button>
              <button 
                onClick={() => dismissSuggestion(suggestion.id)}
                className="text-xs px-3 py-1 bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors"
              >
                Not now
              </button>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{(suggestion.confidence * 100).toFixed(0)}%</span>
              <span className={`w-2 h-2 rounded-full ${getConfidenceColor(suggestion.confidence)}`}></span>
            </div>
          </div>
        </div>
      ))}
      
      {/* Status indicator */}
      <div className="text-xs text-muted-foreground text-center">
        Last check: {lastCheck.toLocaleTimeString()}
      </div>
    </div>
  );
}

const getNotificationStyles = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-50 border-green-200 text-green-800';
    case 'warning':
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    case 'info':
      return 'bg-blue-50 border-blue-200 text-blue-800';
    default:
      return 'bg-card';
  }
};

const getConfidenceColor = (confidence: number) => {
  if (confidence > 0.8) return 'bg-green-500';
  if (confidence > 0.6) return 'bg-yellow-500';
  return 'bg-red-500';
};