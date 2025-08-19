import { patternDetector } from '../intelligence/pattern-detector';
import { modelRouter } from '../ai/model-router';
import { localBrain } from '../database/local-brain';

interface AutomationRule {
  id: string;
  trigger: {
    type: 'time' | 'event' | 'pattern' | 'context';
    value: string;
    days?: number[];
    condition?: any;
  };
  action: {
    type: 'create_event' | 'create_task' | 'send_notification' | 'execute_function';
    data: any;
    confirmation?: boolean;
  };
  enabled: boolean;
  confidence: number;
}

interface ConflictResolution {
  type: 'reschedule' | 'shorten' | 'cancel' | 'merge';
  original: any;
  suggested: any;
  reasoning: string;
}

interface CalendarEvent {
  id?: string;
  title: string;
  startTime: Date;
  endTime: Date;
  type?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'tentative' | 'confirmed' | 'cancelled';
}

class AutoPilot {
  private rules: AutomationRule[] = [];
  private running = false;
  private intervalId?: NodeJS.Timeout;
  private listeners: Map<string, Function[]> = new Map();
  
  async initialize() {
    await this.loadAutomationRules();
    await this.setupDefaultRules();
    this.start();
  }
  
  private async setupDefaultRules(): Promise<void> {
    const defaultRules: AutomationRule[] = [
      // Daily standup at 10am weekdays
      {
        id: 'daily_standup',
        trigger: { type: 'time', value: '10:00', days: [1,2,3,4,5] },
        action: { 
          type: 'create_task', 
          data: { title: 'Daily Standup', duration: 15, type: 'meeting' },
          confirmation: false
        },
        enabled: true,
        confidence: 0.9
      },
      
      // Workout blocks Mon/Wed/Fri 6pm
      {
        id: 'workout_schedule',
        trigger: { type: 'time', value: '18:00', days: [1,3,5] },
        action: { 
          type: 'create_event', 
          data: { title: 'Workout', duration: 60, type: 'health' },
          confirmation: false
        },
        enabled: true,
        confidence: 0.85
      },
      
      // Email triage morning and afternoon
      {
        id: 'email_triage_morning',
        trigger: { type: 'time', value: '09:00' },
        action: { 
          type: 'create_task', 
          data: { title: 'Email Triage', priority: 'medium', duration: 15 },
          confirmation: false
        },
        enabled: true,
        confidence: 0.8
      },
      
      {
        id: 'email_triage_afternoon',
        trigger: { type: 'time', value: '16:00' },
        action: { 
          type: 'create_task', 
          data: { title: 'Email Triage', priority: 'medium', duration: 15 },
          confirmation: false
        },
        enabled: true,
        confidence: 0.8
      },
      
      // Deep work blocks based on energy patterns
      {
        id: 'morning_deep_work',
        trigger: { type: 'time', value: '09:30', days: [1,2,3,4,5] },
        action: { 
          type: 'create_event', 
          data: { title: 'Deep Work Block', duration: 90, type: 'focus' },
          confirmation: false
        },
        enabled: true,
        confidence: 0.85
      },
      
      {
        id: 'afternoon_deep_work',
        trigger: { type: 'time', value: '15:00', days: [1,2,3,4,5] },
        action: { 
          type: 'create_event', 
          data: { title: 'Deep Work Block', duration: 90, type: 'focus' },
          confirmation: false
        },
        enabled: true,
        confidence: 0.80
      },
      
      // Weekly planning Monday morning
      {
        id: 'weekly_planning',
        trigger: { type: 'time', value: '09:00', days: [1] },
        action: { 
          type: 'create_task', 
          data: { title: 'Weekly Planning & Review', duration: 30, priority: 'high' },
          confirmation: false
        },
        enabled: true,
        confidence: 0.9
      }
    ];
    
    // Add rules that don't already exist
    for (const rule of defaultRules) {
      const exists = this.rules.find(r => r.id === rule.id);
      if (!exists) {
        this.rules.push(rule);
      }
    }
    
    await this.saveAutomationRules();
  }
  
  async start(): Promise<void> {
    if (this.running) return;
    
    this.running = true;
    console.log('AutoPilot started');
    
    // Main automation loop - check every minute
    this.intervalId = setInterval(async () => {
      try {
        await this.executeAutomationCycle();
      } catch (error) {
        console.error('AutoPilot cycle error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await localBrain.logEvent('autopilot_error', { error: errorMessage });
      }
    }, 60000);
    
    // Initial execution
    await this.executeAutomationCycle();
  }
  
  stop(): void {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    console.log('AutoPilot stopped');
  }
  
  private async executeAutomationCycle(): Promise<void> {
    if (!this.running) return;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = now.getDay();
    
    // Execute time-based rules
    for (const rule of this.rules.filter(r => r.enabled)) {
      if (rule.trigger.type === 'time' && rule.trigger.value === currentTime) {
        if (!rule.trigger.days || rule.trigger.days.includes(currentDay)) {
          await this.executeRule(rule);
        }
      }
    }
    
    // Check for conflicts and auto-resolve
    await this.resolveScheduleConflicts();
    
    // Predictive actions based on patterns
    await this.predictiveScheduling();
    
    // Pattern-triggered rules
    await this.executePatternBasedRules();
  }
  
  private async executeRule(rule: AutomationRule): Promise<void> {
    try {
      console.log(`Executing rule: ${rule.id}`);
      
      if (rule.action.confirmation) {
        // Emit event for UI to handle confirmation
        this.emit('rule_confirmation_required', { rule });
        return;
      }
      
      const result = await this.executeAction(rule.action);
      
      // Log successful execution
      await localBrain.logDecision(
        `autopilot_${rule.id}`,
        rule.trigger,
        result,
        'success'
      );
      
      await localBrain.logEvent('rule_executed', {
        ruleId: rule.id,
        actionType: rule.action.type,
        result: result
      });
      
    } catch (error) {
      console.error(`Rule execution failed: ${rule.id}`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await localBrain.logDecision(
        `autopilot_${rule.id}`,
        rule.trigger,
        { error: errorMessage },
        'failure'
      );
    }
  }
  
  private async executeAction(action: any): Promise<any> {
    switch (action.type) {
      case 'create_event':
        return this.createEvent(action.data);
      
      case 'create_task':
        return this.createTask(action.data);
      
      case 'send_notification':
        return this.sendNotification(action.data);
      
      case 'execute_function':
        if (typeof action.data.function === 'function') {
          return action.data.function(action.data.params);
        }
        break;
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }
  
  private async createEvent(eventData: any): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      title: eventData.title,
      startTime: eventData.startTime || new Date(),
      endTime: eventData.endTime || new Date(Date.now() + (eventData.duration || 60) * 60000),
      type: eventData.type || 'general',
      priority: eventData.priority || 'medium',
      status: 'tentative' // Always start as tentative
    };
    
    // Check for conflicts before creating
    const conflicts = await this.findConflicts([event]);
    if (conflicts.length > 0) {
      const resolution = await this.proposeResolution(conflicts[0]);
      if (resolution.type === 'reschedule') {
        event.startTime = resolution.suggested.startTime;
        event.endTime = resolution.suggested.endTime;
      }
    }
    
    // Emit event for UI to handle calendar creation
    this.emit('event_created', event);
    
    return event;
  }
  
  private async createTask(taskData: any): Promise<any> {
    const task = {
      id: `auto_${Date.now()}`,
      title: taskData.title,
      priority: taskData.priority || 'medium',
      duration: taskData.duration || 30,
      createdAt: new Date(),
      automated: true
    };
    
    // Emit event for UI to handle task creation
    this.emit('task_created', task);
    
    return task;
  }
  
  private async sendNotification(notificationData: any): Promise<void> {
    // Emit event for UI to handle notification
    this.emit('notification_sent', notificationData);
  }
  
  private async resolveScheduleConflicts(): Promise<void> {
    try {
      const events = await this.getTodayEvents();
      const conflicts = this.findConflicts(events);
      
      for (const conflict of conflicts) {
        const resolution = await this.proposeResolution(conflict);
        
        // Important: require confirmation for meeting changes
        if (resolution.type === 'reschedule' && conflict.type === 'meeting') {
          this.emit('conflict_resolution_required', { conflict, resolution });
        } else {
          await this.executeResolution(resolution);
        }
      }
    } catch (error) {
      console.error('Conflict resolution error:', error);
    }
  }
  
  private async predictiveScheduling(): Promise<void> {
    try {
      const context = await this.gatherContext();
      const prediction = await patternDetector.predictNext(context);
      
      if (prediction.confidence > 0.8) {
        // High confidence - schedule automatically
        await this.scheduleActivity(prediction.activity, prediction.suggestedTime);
      } else if (prediction.confidence > 0.6) {
        // Medium confidence - suggest to user
        this.emit('activity_suggested', prediction);
      }
    } catch (error) {
      console.error('Predictive scheduling error:', error);
    }
  }
  
  private async executePatternBasedRules(): Promise<void> {
    // Look for patterns that should trigger rules
    const recentEvents = await this.getRecentEvents();
    const patterns = await patternDetector.detectDailyPatterns(recentEvents);
    
    for (const pattern of patterns) {
      if (pattern.confidence > 0.8) {
        // High confidence pattern - might trigger automation
        await this.handlePatternTrigger(pattern);
      }
    }
  }
  
  private async handlePatternTrigger(pattern: any): Promise<void> {
    // Example: if user consistently does email at this time, suggest it
    if (pattern.type === 'time' && pattern.metadata?.activity === 'email') {
      this.emit('pattern_suggestion', {
        suggestion: 'Schedule email time',
        pattern: pattern,
        confidence: pattern.confidence
      });
    }
  }
  
  private findConflicts(events: CalendarEvent[]): any[] {
    const conflicts = [];
    
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];
        
        if (this.eventsOverlap(event1, event2)) {
          conflicts.push({
            event1,
            event2,
            type: 'time_overlap'
          });
        }
      }
    }
    
    return conflicts;
  }
  
  private eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
    return event1.startTime < event2.endTime && event2.startTime < event1.endTime;
  }
  
  private async proposeResolution(conflict: any): Promise<ConflictResolution> {
    // Use AI to propose smart resolution
    const prompt = `Resolve calendar conflict: "${conflict.event1.title}" overlaps with "${conflict.event2.title}". 
    Event 1: ${conflict.event1.startTime} - ${conflict.event1.endTime}
    Event 2: ${conflict.event2.startTime} - ${conflict.event2.endTime}
    
    Suggest resolution considering priorities and typical scheduling preferences.`;
    
    const suggestion = await modelRouter.query(prompt, { type: 'scheduling' });
    
    // Default to rescheduling lower priority event
    const priority1 = this.getPriorityScore(conflict.event1);
    const priority2 = this.getPriorityScore(conflict.event2);
    
    if (priority1 > priority2) {
      return {
        type: 'reschedule',
        original: conflict.event2,
        suggested: this.findNextAvailableSlot(conflict.event2),
        reasoning: suggestion || 'Rescheduled lower priority event'
      };
    } else {
      return {
        type: 'reschedule',
        original: conflict.event1,
        suggested: this.findNextAvailableSlot(conflict.event1),
        reasoning: suggestion || 'Rescheduled lower priority event'
      };
    }
  }
  
  private getPriorityScore(event: CalendarEvent): number {
    let score = 5; // Base score
    
    if (event.priority === 'high') score += 3;
    if (event.priority === 'low') score -= 2;
    if (event.type === 'meeting') score += 2;
    if (event.title.toLowerCase().includes('important')) score += 2;
    
    return score;
  }
  
  private findNextAvailableSlot(event: CalendarEvent): any {
    // Simple implementation - add 1 hour
    return {
      ...event,
      startTime: new Date(event.startTime.getTime() + 3600000),
      endTime: new Date(event.endTime.getTime() + 3600000)
    };
  }
  
  private async executeResolution(resolution: ConflictResolution): Promise<void> {
    // Emit event for UI to handle resolution
    this.emit('conflict_resolved', resolution);
  }
  
  private async scheduleActivity(activity: string, time?: Date): Promise<void> {
    const activityMap: Record<string, { title: string; duration: number; type: string }> = {
      'deep_work': { title: 'Deep Work Session', duration: 90, type: 'focus' },
      'email_triage': { title: 'Email Triage', duration: 15, type: 'communication' },
      'workout': { title: 'Workout', duration: 60, type: 'health' },
      'planning': { title: 'Planning Session', duration: 30, type: 'planning' },
      'meetings_collaboration': { title: 'Collaboration Time', duration: 60, type: 'collaboration' }
    };
    
    const config = activityMap[activity] || { title: activity, duration: 30, type: 'general' };
    
    await this.createEvent({
      ...config,
      startTime: time || new Date()
    });
  }
  
  private async gatherContext(): Promise<any> {
    return {
      time: new Date(),
      recentEvents: await this.getRecentEvents(),
      patterns: await patternDetector.getPatternSummary()
    };
  }
  
  private async getTodayEvents(): Promise<CalendarEvent[]> {
    // This would integrate with your calendar system
    // For now, return empty array
    return [];
  }
  
  private async getRecentEvents(): Promise<any[]> {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return localBrain.events
      .where('timestamp')
      .above(oneDayAgo)
      .toArray();
  }
  
  private emit(event: string, data?: any): void {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Event listener error for ${event}:`, error);
      }
    });
  }
  
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }
  
  off(event: string, listener: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  addRule(rule: AutomationRule): void {
    this.rules.push(rule);
    this.saveAutomationRules();
  }
  
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    this.saveAutomationRules();
  }
  
  updateRule(ruleId: string, updates: Partial<AutomationRule>): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.saveAutomationRules();
    }
  }
  
  getRules(): AutomationRule[] {
    return [...this.rules];
  }
  
  private async loadAutomationRules(): Promise<void> {
    try {
      const stored = localStorage.getItem('lifeos_automation_rules');
      if (stored) {
        this.rules = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load automation rules:', error);
    }
  }
  
  private async saveAutomationRules(): Promise<void> {
    try {
      localStorage.setItem('lifeos_automation_rules', JSON.stringify(this.rules));
    } catch (error) {
      console.error('Failed to save automation rules:', error);
    }
  }
  
  getStatus(): { running: boolean; rules: number; lastCycle: Date } {
    return {
      running: this.running,
      rules: this.rules.filter(r => r.enabled).length,
      lastCycle: new Date()
    };
  }
}

export const autoPilot = new AutoPilot();
export type { AutomationRule, ConflictResolution, CalendarEvent };