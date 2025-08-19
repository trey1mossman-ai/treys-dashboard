import { localBrain, Pattern, LifeEvent } from '../database/local-brain';

interface Prediction {
  activity: string;
  confidence: number;
  reasoning?: string;
  suggestedTime?: Date;
}

interface ActivityFrequency {
  activity: string;
  frequency: number;
  count: number;
}

class PatternDetector {
  private patterns: Map<string, Pattern> = new Map();
  private learningEnabled = true;
  
  async detectDailyPatterns(events: LifeEvent[]): Promise<Pattern[]> {
    const detected: Pattern[] = [];
    
    try {
      // Time-based patterns
      const timePatterns = await this.findTimePatterns(events);
      detected.push(...timePatterns);
      
      // Task patterns
      const taskPatterns = await this.findTaskPatterns(events);
      detected.push(...taskPatterns);
      
      // Energy patterns
      const energyPatterns = await this.findEnergyPatterns(events);
      detected.push(...energyPatterns);
      
      // Sequence patterns (what usually follows what)
      const sequencePatterns = await this.findSequencePatterns(events);
      detected.push(...sequencePatterns);
      
      // Store detected patterns
      for (const pattern of detected) {
        await this.storePattern(pattern);
      }
      
      return detected;
      
    } catch (error) {
      console.error('Pattern detection error:', error);
      return [];
    }
  }
  
  private async findTimePatterns(events: LifeEvent[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    const hourlyActivity = new Map<number, string[]>();
    
    // Group activities by hour
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      if (!hourlyActivity.has(hour)) {
        hourlyActivity.set(hour, []);
      }
      hourlyActivity.get(hour)!.push(event.type);
    });
    
    // Find consistent patterns (70%+ consistency)
    hourlyActivity.forEach((activities, hour) => {
      const mostCommon = this.getMostFrequent(activities);
      if (mostCommon.frequency > 0.7) {
        patterns.push({
          type: 'time',
          subtype: `hour_${hour}`,
          description: `Usually ${mostCommon.activity} at ${hour}:00`,
          confidence: mostCommon.frequency,
          lastSeen: new Date(),
          metadata: { hour, activity: mostCommon.activity, count: mostCommon.count }
        });
      }
    });
    
    // Day of week patterns
    const weeklyActivity = new Map<number, string[]>();
    events.forEach(event => {
      const dayOfWeek = new Date(event.timestamp).getDay();
      if (!weeklyActivity.has(dayOfWeek)) {
        weeklyActivity.set(dayOfWeek, []);
      }
      weeklyActivity.get(dayOfWeek)!.push(event.type);
    });
    
    weeklyActivity.forEach((activities, dayOfWeek) => {
      const mostCommon = this.getMostFrequent(activities);
      if (mostCommon.frequency > 0.6) {
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
        patterns.push({
          type: 'weekly',
          subtype: `day_${dayOfWeek}`,
          description: `Usually ${mostCommon.activity} on ${dayName}`,
          confidence: mostCommon.frequency,
          lastSeen: new Date(),
          metadata: { dayOfWeek, dayName, activity: mostCommon.activity }
        });
      }
    });
    
    return patterns;
  }
  
  private async findTaskPatterns(events: LifeEvent[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    const taskEvents = events.filter(e => e.type.includes('task') || e.type.includes('todo'));
    
    // Find recurring task types
    const taskTypes = new Map<string, number>();
    taskEvents.forEach(event => {
      const taskType = this.categorizeTask(event.data?.title || event.type);
      taskTypes.set(taskType, (taskTypes.get(taskType) || 0) + 1);
    });
    
    // Identify highly recurring tasks
    const totalTasks = taskEvents.length;
    taskTypes.forEach((count, taskType) => {
      const frequency = count / totalTasks;
      if (frequency > 0.1 && count > 3) { // More than 10% of tasks and at least 3 occurrences
        patterns.push({
          type: 'task',
          subtype: taskType,
          description: `Frequently performs ${taskType} tasks`,
          confidence: Math.min(frequency * 2, 0.9), // Cap at 90%
          lastSeen: new Date(),
          metadata: { taskType, count, frequency }
        });
      }
    });
    
    return patterns;
  }
  
  private async findEnergyPatterns(events: LifeEvent[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    
    // Based on common productivity research and user behavior
    const energyMap = new Map<number, { high: number; medium: number; low: number }>();
    
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      if (!energyMap.has(hour)) {
        energyMap.set(hour, { high: 0, medium: 0, low: 0 });
      }
      
      const energy = energyMap.get(hour)!;
      
      // Categorize activities by typical energy requirement
      if (this.isHighEnergyActivity(event.type)) {
        energy.high++;
      } else if (this.isLowEnergyActivity(event.type)) {
        energy.low++;
      } else {
        energy.medium++;
      }
    });
    
    // Identify energy patterns
    energyMap.forEach((energy, hour) => {
      const total = energy.high + energy.medium + energy.low;
      if (total > 5) { // Enough data points
        const highRatio = energy.high / total;
        const lowRatio = energy.low / total;
        
        if (highRatio > 0.6) {
          patterns.push({
            type: 'energy',
            subtype: 'high',
            description: `High energy period around ${hour}:00`,
            confidence: highRatio,
            lastSeen: new Date(),
            metadata: { hour, energyLevel: 'high', ratio: highRatio }
          });
        } else if (lowRatio > 0.6) {
          patterns.push({
            type: 'energy',
            subtype: 'low',
            description: `Low energy period around ${hour}:00`,
            confidence: lowRatio,
            lastSeen: new Date(),
            metadata: { hour, energyLevel: 'low', ratio: lowRatio }
          });
        }
      }
    });
    
    return patterns;
  }
  
  private async findSequencePatterns(events: LifeEvent[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    const sequences = new Map<string, Map<string, number>>();
    
    // Look for activity sequences
    for (let i = 0; i < events.length - 1; i++) {
      const current = events[i].type;
      const next = events[i + 1].type;
      
      if (!sequences.has(current)) {
        sequences.set(current, new Map());
      }
      
      const nextMap = sequences.get(current)!;
      nextMap.set(next, (nextMap.get(next) || 0) + 1);
    }
    
    // Find strong sequence patterns
    sequences.forEach((nextMap, current) => {
      const total = Array.from(nextMap.values()).reduce((sum, count) => sum + count, 0);
      
      nextMap.forEach((count, next) => {
        const probability = count / total;
        if (probability > 0.7 && count > 3) {
          patterns.push({
            type: 'sequence',
            subtype: `${current}_to_${next}`,
            description: `Usually ${next} after ${current}`,
            confidence: probability,
            lastSeen: new Date(),
            metadata: { from: current, to: next, count, probability }
          });
        }
      });
    });
    
    return patterns;
  }
  
  async predictNext(_currentContext: any): Promise<Prediction> {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    try {
      // Load stored patterns
      await this.loadStoredPatterns();
      
      // Time-based predictions
      const timePattern = this.patterns.get(`time_hour_${hour}`);
      if (timePattern && timePattern.confidence > 0.7) {
        return {
          activity: timePattern.metadata?.activity || 'routine_tasks',
          confidence: timePattern.confidence,
          reasoning: `Based on your pattern of ${timePattern.description}`,
          suggestedTime: now
        };
      }
      
      // Day-based predictions
      const dayPattern = this.patterns.get(`weekly_day_${dayOfWeek}`);
      if (dayPattern && dayPattern.confidence > 0.6) {
        return {
          activity: dayPattern.metadata?.activity || 'routine_tasks',
          confidence: dayPattern.confidence,
          reasoning: `Based on your weekly pattern: ${dayPattern.description}`
        };
      }
      
      // Fallback to hardcoded productive patterns
      if (hour >= 9 && hour < 11) {
        return { activity: 'deep_work', confidence: 0.85, reasoning: 'Prime morning focus time' };
      }
      if (hour >= 14 && hour < 15) {
        return { activity: 'low_energy_tasks', confidence: 0.75, reasoning: 'Post-lunch energy dip' };
      }
      if (hour >= 15 && hour < 17) {
        return { activity: 'meetings_collaboration', confidence: 0.80, reasoning: 'Afternoon collaboration time' };
      }
      
      // Monday planning, workout patterns
      if (dayOfWeek === 1 && hour === 9) {
        return { activity: 'weekly_planning', confidence: 0.90, reasoning: 'Monday morning planning' };
      }
      if ([1, 3, 5].includes(dayOfWeek) && hour === 18) {
        return { activity: 'workout', confidence: 0.85, reasoning: 'Regular workout schedule' };
      }
      
      return { activity: 'routine_tasks', confidence: 0.60, reasoning: 'Default routine period' };
      
    } catch (error) {
      console.error('Prediction error:', error);
      return { activity: 'routine_tasks', confidence: 0.5, reasoning: 'Fallback prediction' };
    }
  }
  
  private getMostFrequent(activities: string[]): ActivityFrequency {
    const counts = new Map<string, number>();
    activities.forEach(activity => {
      counts.set(activity, (counts.get(activity) || 0) + 1);
    });
    
    let maxCount = 0;
    let mostCommon = '';
    counts.forEach((count, activity) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = activity;
      }
    });
    
    return {
      activity: mostCommon,
      frequency: activities.length > 0 ? maxCount / activities.length : 0,
      count: maxCount
    };
  }
  
  private categorizeTask(taskTitle: string): string {
    const title = taskTitle.toLowerCase();
    
    if (title.includes('email') || title.includes('respond') || title.includes('reply')) {
      return 'communication';
    }
    if (title.includes('meeting') || title.includes('call') || title.includes('discuss')) {
      return 'meetings';
    }
    if (title.includes('code') || title.includes('develop') || title.includes('implement')) {
      return 'development';
    }
    if (title.includes('plan') || title.includes('strategy') || title.includes('review')) {
      return 'planning';
    }
    if (title.includes('learn') || title.includes('research') || title.includes('study')) {
      return 'learning';
    }
    if (title.includes('admin') || title.includes('paperwork') || title.includes('file')) {
      return 'administrative';
    }
    
    return 'general';
  }
  
  private isHighEnergyActivity(activityType: string): boolean {
    const high = ['deep_work', 'development', 'creative', 'presentation', 'important_meeting'];
    return high.some(type => activityType.includes(type));
  }
  
  private isLowEnergyActivity(activityType: string): boolean {
    const low = ['email', 'admin', 'routine', 'filing', 'simple_task'];
    return low.some(type => activityType.includes(type));
  }
  
  private async storePattern(pattern: Pattern): Promise<void> {
    if (!this.learningEnabled) return;
    
    try {
      const key = `${pattern.type}_${pattern.subtype}`;
      
      // Check if pattern already exists
      const existing = await localBrain.patterns
        .where('type')
        .equals(pattern.type)
        .and(p => p.subtype === pattern.subtype)
        .first();
      
      if (existing) {
        // Update existing pattern
        await localBrain.patterns.update(existing.id!, {
          confidence: (existing.confidence + pattern.confidence) / 2, // Average confidence
          lastSeen: pattern.lastSeen,
          metadata: pattern.metadata
        });
      } else {
        // Add new pattern
        await localBrain.patterns.add(pattern);
      }
      
      // Update local cache
      this.patterns.set(key, pattern);
      
    } catch (error) {
      console.error('Failed to store pattern:', error);
    }
  }
  
  private async loadStoredPatterns(): Promise<void> {
    try {
      const storedPatterns = await localBrain.patterns.toArray();
      this.patterns.clear();
      
      storedPatterns.forEach(pattern => {
        const key = `${pattern.type}_${pattern.subtype}`;
        this.patterns.set(key, pattern);
      });
    } catch (error) {
      console.error('Failed to load patterns:', error);
    }
  }
  
  async getPatternSummary(): Promise<{ patterns: number; confidence: number; lastAnalysis: Date | null }> {
    await this.loadStoredPatterns();
    
    const patterns = Array.from(this.patterns.values());
    const avgConfidence = patterns.length > 0 
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length 
      : 0;
    
    const lastAnalysis = patterns.length > 0 
      ? new Date(Math.max(...patterns.map(p => p.lastSeen.getTime())))
      : null;
    
    return {
      patterns: patterns.length,
      confidence: avgConfidence,
      lastAnalysis
    };
  }
  
  enableLearning(enabled: boolean): void {
    this.learningEnabled = enabled;
  }
}

export const patternDetector = new PatternDetector();
export type { Prediction, ActivityFrequency };