import { patternDetector } from '../intelligence/pattern-detector';
import { localBrain } from '../database/local-brain';
import { openAIClient } from '../ai/openai-client';
import { costController } from '../ai/cost-controller';

interface AutomationRule {
  id: string;
  trigger: {
    type: 'time' | 'event' | 'condition';
    value: any;
    days?: number[];
  };
  action: {
    type: string;
    data: any;
  };
  confidence: number;
  enabled: boolean;
}

interface ConflictResolution {
  type: 'reschedule' | 'cancel' | 'merge';
  target: any;
  proposal: any;
  requiresConfirmation: boolean;
}

class AutoPilot {
  private rules: AutomationRule[] = [];
  private running = false;
  private checkInterval: NodeJS.Timeout | null = null;
  
  async initialize() {
    console.log('🚀 AutoPilot initializing...');
    
    // Load your specific automation rules based on research
    this.rules = [
      // Daily standup at 10am (from research)
      {
        id: 'daily-standup',
        trigger: { type: 'time', value: '09:55', days: [1,2,3,4,5] },
        action: { 
          type: 'reminder', 
          data: { 
            title: 'Daily Standup in 5 minutes',
            priority: 'high'
          }
        },
        confidence: 0.95,
        enabled: true
      },
      // Morning deep work block (9-11am from research)
      {
        id: 'morning-focus',
        trigger: { type: 'time', value: '09:00', days: [1,2,3,4,5] },
        action: {
          type: 'focus_mode',
          data: {
            duration: 120,
            description: 'Morning deep work block'
          }
        },
        confidence: 0.85,
        enabled: true
      },
      // Afternoon energy dip management (2-3pm from research)
      {
        id: 'afternoon-dip',
        trigger: { type: 'time', value: '14:00' },
        action: {
          type: 'suggest_light_tasks',
          data: {
            message: 'Low energy period - switching to light tasks',
            duration: 60
          }
        },
        confidence: 0.75,
        enabled: true
      },
      // Workout reminder (Mon/Wed/Fri 6pm from research)
      {
        id: 'workout-reminder',
        trigger: { type: 'time', value: '17:45', days: [1,3,5] },
        action: {
          type: 'reminder',
          data: {
            title: 'Workout in 15 minutes',
            priority: 'medium'
          }
        },
        confidence: 0.85,
        enabled: true
      },
      // Email triage (morning and afternoon from research)
      {
        id: 'morning-email',
        trigger: { type: 'time', value: '09:00' },
        action: {
          type: 'task',
          data: {
            title: 'Email Triage',
            priority: 'medium',
            duration: 15
          }
        },
        confidence: 0.70,
        enabled: true
      },
      {
        id: 'afternoon-email',
        trigger: { type: 'time', value: '16:00' },
        action: {
          type: 'task',
          data: {
            title: 'Email Triage & Wrap-up',
            priority: 'medium',
            duration: 20
          }
        },
        confidence: 0.70,
        enabled: true
      },
      // Weekly planning (Monday morning from research)
      {
        id: 'weekly-planning',
        trigger: { type: 'time', value: '09:00', days: [1] },
        action: {
          type: 'create_event',
          data: {
            title: 'Weekly Planning Session',
            duration: 30,
            priority: 'high'
          }
        },
        confidence: 0.90,
        enabled: true
      }
    ];
    
    // Load learned rules from database
    const learnedRules = await this.loadLearnedRules();
    this.rules.push(...learnedRules);
    
    this.start();
  }
  
  private async loadLearnedRules(): Promise<AutomationRule[]> {
    const patterns = await localBrain.patterns
      .where('confidence')
      .above(0.8)
      .toArray();
    
    const rules: AutomationRule[] = [];
    
    patterns.forEach(pattern => {
      if (pattern.type === 'time' && pattern.metadata?.activity) {
        const hour = parseInt(pattern.subtype?.replace('hour_', '') || '0');
        
        rules.push({
          id: `learned-${pattern.id}`,
          trigger: {
            type: 'time',
            value: `${hour.toString().padStart(2, '0')}:00`
          },
          action: {
            type: 'suggest_activity',
            data: {
              activity: pattern.metadata.activity,
              confidence: pattern.confidence
            }
          },
          confidence: pattern.confidence,
          enabled: pattern.confidence > 0.85 // Only auto-enable high confidence
        });
      }
    });
    
    return rules;
  }
  
  async start() {
    if (this.running) return;
    
    this.running = true;
    console.log('✅ AutoPilot started');
    
    // Main automation loop - check every minute
    this.checkInterval = setInterval(async () => {
      if (!this.running) return;
      
      try {
        await this.runAutomationCycle();
      } catch (error) {
        console.error('AutoPilot cycle error:', error);
        await localBrain.logEvent('autopilot_error', { error: String(error) });
      }
    }, 60000); // Every minute
    
    // Run immediately
    this.runAutomationCycle();
  }
  
  async stop() {
    this.running = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('⏹️ AutoPilot stopped');
  }
  
  private async runAutomationCycle() {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = now.getDay();
    
    // Check time-based rules
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      
      if (rule.trigger.type === 'time' && rule.trigger.value === currentTime) {
        // Check day restriction if present
        if (rule.trigger.days && !rule.trigger.days.includes(currentDay)) {
          continue;
        }
        
        // Execute action
        await this.executeAction(rule.action, rule.confidence);
        
        // Log execution
        await localBrain.logEvent('automation_executed', {
          ruleId: rule.id,
          action: rule.action.type,
          confidence: rule.confidence
        });
      }
    }
    
    // Check for conflicts and auto-resolve
    await this.resolveScheduleConflicts();
    
    // Predictive actions based on patterns
    await this.predictiveScheduling();
    
    // Check if any proactive assistance is needed
    await this.proactiveAssistance();
  }
  
  private async executeAction(action: { type: string; data: any }, confidence: number) {
    console.log(`🤖 Executing action: ${action.type} (confidence: ${confidence})`);
    
    switch (action.type) {
      case 'reminder':
        this.showReminder(action.data);
        break;
        
      case 'task':
        window.dispatchEvent(new CustomEvent('autopilot-add-task', { detail: action.data }));
        break;
        
      case 'create_event':
        window.dispatchEvent(new CustomEvent('autopilot-create-event', { detail: action.data }));
        break;
        
      case 'focus_mode':
        window.dispatchEvent(new CustomEvent('autopilot-focus-mode', { detail: action.data }));
        break;
        
      case 'suggest_activity':
        if (confidence > 0.7) {
          window.dispatchEvent(new CustomEvent('autopilot-suggestion', { detail: action.data }));
        }
        break;
        
      case 'suggest_light_tasks':
        window.dispatchEvent(new CustomEvent('autopilot-energy-adjustment', { detail: action.data }));
        break;
        
      default:
        console.log(`Unknown action type: ${action.type}`);
    }
  }
  
  private showReminder(data: any) {
    // Check if browser notifications are available and permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Life OS Reminder', {
        body: data.title,
        icon: '/icon-192x192.png',
        tag: 'lifeos-reminder',
        requireInteraction: data.priority === 'high'
      });
    }
    
    // Also dispatch event for in-app notification
    window.dispatchEvent(new CustomEvent('autopilot-reminder', { detail: data }));
  }
  
  private async resolveScheduleConflicts() {
    // Get today's events
    const events = await this.getTodayEvents();
    const conflicts = this.findConflicts(events);
    
    for (const conflict of conflicts) {
      const resolution = await this.proposeResolution(conflict);
      
      if (resolution.requiresConfirmation) {
        // Request user confirmation
        window.dispatchEvent(new CustomEvent('autopilot-conflict-resolution', { 
          detail: { conflict, resolution }
        }));
      } else {
        // Auto-resolve low-impact conflicts
        await this.executeResolution(resolution);
      }
    }
  }
  
  private async getTodayEvents(): Promise<any[]> {
    // Get from your calendar integration
    const today = new Date().toDateString();
    const events = await localBrain.events
      .where('type')
      .equals('calendar_event')
      .and(event => new Date(event.timestamp).toDateString() === today)
      .toArray();
    
    return events;
  }
  
  private findConflicts(events: any[]): any[] {
    const conflicts = [];
    
    for (let i = 0; i < events.length - 1; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];
        
        // Check for time overlap
        if (this.eventsOverlap(event1, event2)) {
          conflicts.push({ event1, event2 });
        }
      }
    }
    
    return conflicts;
  }
  
  private eventsOverlap(event1: any, event2: any): boolean {
    const start1 = new Date(event1.data.startTime).getTime();
    const end1 = new Date(event1.data.endTime).getTime();
    const start2 = new Date(event2.data.startTime).getTime();
    const end2 = new Date(event2.data.endTime).getTime();
    
    return (start1 < end2 && end1 > start2);
  }
  
  private async proposeResolution(conflict: any): Promise<ConflictResolution> {
    // Use AI to propose resolution if budget allows
    if (costController.canSpend(0.01)) {
      const prompt = `Two events conflict: 
        1. ${conflict.event1.data.title} at ${conflict.event1.data.startTime}
        2. ${conflict.event2.data.title} at ${conflict.event2.data.startTime}
        Suggest the best resolution (reschedule, cancel, or merge).`;
      
      const response = await openAIClient.chat(prompt, { 
        forceModel: 'gpt-3.5-turbo',
        temperature: 0.3
      });
      
      // Parse AI response and return resolution
      return {
        type: 'reschedule',
        target: conflict.event2,
        proposal: response.content,
        requiresConfirmation: true
      };
    }
    
    // Fallback: simple priority-based resolution
    const priority1 = conflict.event1.data.priority || 'medium';
    const priority2 = conflict.event2.data.priority || 'medium';
    
    return {
      type: 'reschedule',
      target: priority1 > priority2 ? conflict.event2 : conflict.event1,
      proposal: 'Move lower priority event to next available slot',
      requiresConfirmation: true
    };
  }
  
  private async executeResolution(resolution: ConflictResolution) {
    console.log('Executing resolution:', resolution);
    
    switch (resolution.type) {
      case 'reschedule':
        window.dispatchEvent(new CustomEvent('autopilot-reschedule', { 
          detail: resolution 
        }));
        break;
        
      case 'cancel':
        window.dispatchEvent(new CustomEvent('autopilot-cancel-event', { 
          detail: resolution.target 
        }));
        break;
        
      case 'merge':
        window.dispatchEvent(new CustomEvent('autopilot-merge-events', { 
          detail: resolution 
        }));
        break;
    }
    
    // Log resolution
    await localBrain.logEvent('conflict_resolved', {
      type: resolution.type,
      confidence: 0.7
    });
  }
  
  private async predictiveScheduling() {
    const prediction = patternDetector.predictNext({
      time: new Date(),
      recentEvents: await this.getRecentEvents()
    });
    
    if (prediction.confidence > 0.8) {
      // High confidence - execute automatically
      await this.scheduleActivity(prediction.activity);
      
      await localBrain.logEvent('predictive_action', {
        activity: prediction.activity,
        confidence: prediction.confidence,
        executed: true
      });
    } else if (prediction.confidence > 0.6) {
      // Medium confidence - suggest to user
      window.dispatchEvent(new CustomEvent('autopilot-suggestion', {
        detail: {
          activity: prediction.activity,
          confidence: prediction.confidence,
          reason: prediction.reason
        }
      }));
    }
  }
  
  private async getRecentEvents(): Promise<any[]> {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    return await localBrain.events
      .where('timestamp')
      .above(oneHourAgo)
      .toArray();
  }
  
  private async scheduleActivity(activity: string) {
    const activityMap: Record<string, any> = {
      'deep_work': {
        type: 'focus_mode',
        duration: 90,
        title: 'Deep Work Session'
      },
      'daily_standup': {
        type: 'meeting',
        duration: 15,
        title: 'Daily Standup'
      },
      'workout': {
        type: 'personal',
        duration: 60,
        title: 'Workout Session'
      },
      'email_triage': {
        type: 'task',
        duration: 20,
        title: 'Email Management'
      },
      'low_effort_task': {
        type: 'task',
        duration: 30,
        title: 'Administrative Tasks'
      }
    };
    
    const activityData = activityMap[activity];
    if (activityData) {
      window.dispatchEvent(new CustomEvent('autopilot-schedule-activity', {
        detail: activityData
      }));
    }
  }
  
  private async proactiveAssistance() {
    const hour = new Date().getHours();
    
    // Morning briefing
    if (hour === 8 && new Date().getMinutes() === 0) {
      await this.generateMorningBriefing();
    }
    
    // End of day summary
    if (hour === 17 && new Date().getMinutes() === 30) {
      await this.generateEODSummary();
    }
    
    // Check for stale tasks
    await this.checkStaleTasks();
  }
  
  private async generateMorningBriefing() {
    const insights = await patternDetector.getInsights();
    const events = await this.getTodayEvents();
    
    const briefing = {
      type: 'morning_briefing',
      insights,
      eventCount: events.length,
      firstEvent: events[0]?.data.title || 'No events scheduled',
      recommendation: 'Start with your highest priority task during peak energy (10-11am)'
    };
    
    window.dispatchEvent(new CustomEvent('autopilot-briefing', { detail: briefing }));
  }
  
  private async generateEODSummary() {
    const completed = await localBrain.events
      .where('type')
      .equals('task_completed')
      .and(event => new Date(event.timestamp).toDateString() === new Date().toDateString())
      .count();
    
    const summary = {
      type: 'eod_summary',
      tasksCompleted: completed,
      costToday: costController.getStats().daily,
      recommendation: 'Review tomorrow\'s agenda and prepare for morning standup'
    };
    
    window.dispatchEvent(new CustomEvent('autopilot-summary', { detail: summary }));
  }
  
  private async checkStaleTasks() {
    const staleTasks = await localBrain.events
      .where('type')
      .equals('task')
      .and(event => {
        const daysOld = (Date.now() - event.timestamp) / (1000 * 60 * 60 * 24);
        return daysOld > 3 && !event.data?.completed;
      })
      .toArray();
    
    if (staleTasks.length > 0) {
      window.dispatchEvent(new CustomEvent('autopilot-stale-tasks', {
        detail: {
          count: staleTasks.length,
          tasks: staleTasks.slice(0, 5) // Show max 5
        }
      }));
    }
  }
  
  // Public methods for manual control
  async addRule(rule: AutomationRule) {
    this.rules.push(rule);
    await localBrain.logEvent('rule_added', { rule });
  }
  
  async removeRule(ruleId: string) {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    await localBrain.logEvent('rule_removed', { ruleId });
  }
  
  getRules(): AutomationRule[] {
    return this.rules;
  }
  
  async getStatus() {
    return {
      running: this.running,
      rulesCount: this.rules.length,
      enabledRules: this.rules.filter(r => r.enabled).length,
      costToday: costController.getStats().daily,
      lastRun: new Date()
    };
  }
}

export const autoPilot = new AutoPilot();
export type { AutomationRule, ConflictResolution };
