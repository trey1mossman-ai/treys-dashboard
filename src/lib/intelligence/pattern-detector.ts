import { localBrain, Pattern, LifeEvent } from '../database/local-brain';

interface TimePattern {
  hour: number;
  activity: string;
  frequency: number;
  dayOfWeek?: number[];
}

interface Prediction {
  activity: string;
  confidence: number;
  reason?: string;
}

class PatternDetector {
  private patterns: Map<string, Pattern> = new Map();
  private timePatterns: TimePattern[] = [];
  
  constructor() {
    this.loadPatterns();
    this.initializeDefaultPatterns();
  }
  
  // Initialize with your research-based patterns
  private initializeDefaultPatterns() {
    // Your specific patterns from research
    this.timePatterns = [
      { hour: 7, activity: 'wake_up', frequency: 0.85 },
      { hour: 9, activity: 'deep_work_start', frequency: 0.80 },
      { hour: 10, activity: 'daily_standup', frequency: 0.95, dayOfWeek: [1,2,3,4,5] },
      { hour: 11, activity: 'deep_work_peak', frequency: 0.85 },
      { hour: 12, activity: 'lunch_break', frequency: 0.90 },
      { hour: 14, activity: 'low_energy_period', frequency: 0.75 },
      { hour: 15, activity: 'afternoon_focus', frequency: 0.80 },
      { hour: 16, activity: 'email_triage', frequency: 0.70 },
      { hour: 18, activity: 'workout', frequency: 0.85, dayOfWeek: [1,3,5] },
      { hour: 22, activity: 'wind_down', frequency: 0.80 }
    ];
  }
  
  private async loadPatterns() {
    const stored = await localBrain.patterns.toArray();
    stored.forEach(pattern => {
      this.patterns.set(`${pattern.type}:${pattern.subtype}`, pattern);
    });
  }
  
  async detectDailyPatterns(events: LifeEvent[]): Promise<Pattern[]> {
    const detected: Pattern[] = [];
    
    // Time-based patterns
    const timePatterns = this.findTimePatterns(events);
    detected.push(...timePatterns);
    
    // Task patterns (30-40 unique weekly, 50% templatable from research)
    const taskPatterns = this.findTaskPatterns(events);
    detected.push(...taskPatterns);
    
    // Energy patterns (post-lunch dip at 2-3pm from research)
    const energyPatterns = this.findEnergyPatterns(events);
    detected.push(...energyPatterns);
    
    // Productivity patterns
    const productivityPatterns = this.findProductivityPatterns(events);
    detected.push(...productivityPatterns);
    
    // Store detected patterns
    for (const pattern of detected) {
      await localBrain.patterns.add(pattern);
      this.patterns.set(`${pattern.type}:${pattern.subtype}`, pattern);
    }
    
    return detected;
  }
  
  private findTimePatterns(events: LifeEvent[]): Pattern[] {
    const patterns: Pattern[] = [];
    const hourlyActivity = new Map<number, Map<string, number>>();
    
    // Group activities by hour
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      if (!hourlyActivity.has(hour)) {
        hourlyActivity.set(hour, new Map());
      }
      
      const activities = hourlyActivity.get(hour)!;
      const count = activities.get(event.type) || 0;
      activities.set(event.type, count + 1);
    });
    
    // Identify consistent patterns (>70% consistency threshold from research)
    hourlyActivity.forEach((activities, hour) => {
      const total = Array.from(activities.values()).reduce((sum, count) => sum + count, 0);
      
      activities.forEach((count, activity) => {
        const frequency = count / total;
        
        if (frequency > 0.7) {
          patterns.push({
            type: 'time',
            subtype: `hour_${hour}`,
            description: `Usually ${activity} at ${hour}:00`,
            confidence: frequency,
            lastSeen: new Date()
          });
        }
      });
    });
    
    return patterns;
  }
  
  private findTaskPatterns(events: LifeEvent[]): Pattern[] {
    const patterns: Pattern[] = [];
    const taskFrequency = new Map<string, number>();
    
    // Count task occurrences
    events
      .filter(e => e.type === 'task' || e.type === 'task_completed')
      .forEach(event => {
        const taskName = event.data?.title || event.data?.name || '';
        const normalized = this.normalizeTaskName(taskName);
        taskFrequency.set(normalized, (taskFrequency.get(normalized) || 0) + 1);
      });
    
    // Identify recurring tasks (appear at least weekly)
    const totalWeeks = this.getTimeSpanInWeeks(events);
    
    taskFrequency.forEach((count, task) => {
      const weeklyFrequency = count / Math.max(1, totalWeeks);
      
      if (weeklyFrequency >= 1) {
        patterns.push({
          type: 'task',
          subtype: 'recurring',
          description: `Recurring task: ${task} (${weeklyFrequency.toFixed(1)}x/week)`,
          confidence: Math.min(0.95, weeklyFrequency / 2), // Cap confidence
          lastSeen: new Date(),
          metadata: { task, frequency: weeklyFrequency }
        });
      }
    });
    
    return patterns;
  }
  
  private findEnergyPatterns(events: LifeEvent[]): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Based on research: energy dips 2-3pm, peaks 10-11am and 4pm
    const energyProfile = {
      7: 0.6,   // Wake up - moderate
      8: 0.7,   // Morning routine
      9: 0.8,   // Rising energy
      10: 0.95, // Peak morning energy
      11: 0.9,  // Still high
      12: 0.7,  // Pre-lunch
      13: 0.5,  // Post-lunch
      14: 0.4,  // Energy dip (research confirmed)
      15: 0.6,  // Recovery
      16: 0.75, // Second peak
      17: 0.7,  // Good energy
      18: 0.6,  // Evening
      19: 0.5,  // Dinner time
      20: 0.4,  // Winding down
      21: 0.3,  // Low energy
      22: 0.2   // Bedtime approaching
    };
    
    Object.entries(energyProfile).forEach(([hour, level]) => {
      patterns.push({
        type: 'energy',
        subtype: `hour_${hour}`,
        description: `Energy level at ${hour}:00: ${(level * 100).toFixed(0)}%`,
        confidence: 0.85, // Based on research data
        lastSeen: new Date(),
        metadata: { hour: parseInt(hour), level }
      });
    });
    
    return patterns;
  }
  
  private findProductivityPatterns(events: LifeEvent[]): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Analyze completed tasks by time of day
    const completionsByHour = new Map<number, number>();
    const taskDurations = new Map<string, number[]>();
    
    events
      .filter(e => e.type === 'task_completed')
      .forEach(event => {
        const hour = new Date(event.timestamp).getHours();
        completionsByHour.set(hour, (completionsByHour.get(hour) || 0) + 1);
        
        // Track task duration if available
        if (event.data?.duration) {
          const taskType = event.data?.category || 'general';
          if (!taskDurations.has(taskType)) {
            taskDurations.set(taskType, []);
          }
          taskDurations.get(taskType)!.push(event.data.duration);
        }
      });
    
    // Find peak productivity hours
    const totalCompletions = Array.from(completionsByHour.values()).reduce((sum, c) => sum + c, 0);
    
    completionsByHour.forEach((count, hour) => {
      const percentage = (count / totalCompletions) * 100;
      
      if (percentage > 10) { // Significant productivity
        patterns.push({
          type: 'productivity',
          subtype: `peak_hour_${hour}`,
          description: `High productivity at ${hour}:00 (${percentage.toFixed(0)}% of tasks)`,
          confidence: Math.min(0.9, percentage / 20),
          lastSeen: new Date(),
          metadata: { hour, percentage }
        });
      }
    });
    
    // Average task durations by type
    taskDurations.forEach((durations, taskType) => {
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      
      patterns.push({
        type: 'task_duration',
        subtype: taskType,
        description: `${taskType} tasks typically take ${avgDuration} minutes`,
        confidence: Math.min(0.9, durations.length / 10), // More data = higher confidence
        lastSeen: new Date(),
        metadata: { taskType, avgDuration, sampleSize: durations.length }
      });
    });
    
    return patterns;
  }
  
  // Predict next activity based on current context
  predictNext(context: { time?: Date; recentEvents?: LifeEvent[] } = {}): Prediction {
    const now = context.time || new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const minute = now.getMinutes();
    
    // Check for specific time patterns
    for (const pattern of this.timePatterns) {
      if (pattern.hour === hour) {
        // Check day of week if specified
        if (pattern.dayOfWeek && !pattern.dayOfWeek.includes(dayOfWeek)) {
          continue;
        }
        
        // Adjust confidence based on how close to the hour we are
        const timingConfidence = minute < 15 ? 1.0 : minute < 30 ? 0.8 : 0.6;
        
        return {
          activity: pattern.activity,
          confidence: pattern.frequency * timingConfidence,
          reason: `Based on your usual pattern at ${hour}:00`
        };
      }
    }
    
    // Check stored patterns
    const timePattern = this.patterns.get(`time:hour_${hour}`);
    if (timePattern && timePattern.confidence > 0.7) {
      return {
        activity: timePattern.metadata?.activity || 'routine_task',
        confidence: timePattern.confidence,
        reason: timePattern.description
      };
    }
    
    // Energy-based prediction
    const energyPattern = this.patterns.get(`energy:hour_${hour}`);
    if (energyPattern) {
      const energyLevel = energyPattern.metadata?.level || 0.5;
      
      if (energyLevel > 0.8) {
        return {
          activity: 'deep_work',
          confidence: 0.75,
          reason: 'High energy period - good for complex tasks'
        };
      } else if (energyLevel < 0.4) {
        return {
          activity: 'low_effort_task',
          confidence: 0.70,
          reason: 'Low energy period - better for simple tasks'
        };
      }
    }
    
    // Default based on time of day
    if (hour >= 9 && hour < 12) {
      return { activity: 'focused_work', confidence: 0.65, reason: 'Morning work block' };
    } else if (hour >= 14 && hour < 17) {
      return { activity: 'meetings_or_calls', confidence: 0.60, reason: 'Afternoon collaboration time' };
    } else if (hour >= 17 && hour < 19) {
      return { activity: 'wrap_up', confidence: 0.65, reason: 'End of day tasks' };
    }
    
    return { activity: 'flexible_time', confidence: 0.50, reason: 'No strong pattern detected' };
  }
  
  // Get insights about patterns
  async getInsights(): Promise<string[]> {
    const insights: string[] = [];
    const patterns = await localBrain.patterns.toArray();
    
    // Find strongest patterns
    const strongPatterns = patterns.filter(p => p.confidence > 0.85);
    if (strongPatterns.length > 0) {
      insights.push(`You have ${strongPatterns.length} highly consistent patterns in your routine`);
    }
    
    // Energy insights
    const energyPatterns = patterns.filter(p => p.type === 'energy');
    const peakEnergy = energyPatterns.reduce((peak, p) => {
      return (p.metadata?.level > peak.metadata?.level) ? p : peak;
    }, energyPatterns[0]);
    
    if (peakEnergy) {
      insights.push(`Your peak energy is typically at ${peakEnergy.subtype?.replace('hour_', '')}:00`);
    }
    
    // Task insights
    const recurringTasks = patterns.filter(p => p.type === 'task' && p.subtype === 'recurring');
    if (recurringTasks.length > 0) {
      insights.push(`You have ${recurringTasks.length} recurring tasks that could be automated`);
    }
    
    // Productivity insights
    const productivityPatterns = patterns.filter(p => p.type === 'productivity');
    if (productivityPatterns.length > 0) {
      const bestHour = productivityPatterns.reduce((best, p) => {
        return (p.metadata?.percentage > best.metadata?.percentage) ? p : best;
      }, productivityPatterns[0]);
      
      insights.push(`You're most productive at ${bestHour.metadata?.hour}:00`);
    }
    
    return insights;
  }
  
  // Helper methods
  private normalizeTaskName(task: string): string {
    return task.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  private getTimeSpanInWeeks(events: LifeEvent[]): number {
    if (events.length === 0) return 0;
    
    const timestamps = events.map(e => e.timestamp);
    const earliest = Math.min(...timestamps);
    const latest = Math.max(...timestamps);
    const spanMs = latest - earliest;
    const spanWeeks = spanMs / (1000 * 60 * 60 * 24 * 7);
    
    return Math.max(1, spanWeeks);
  }
}

export const patternDetector = new PatternDetector();
export type { TimePattern, Prediction };
