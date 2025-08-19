import { localBrain } from '../database/local-brain';

interface PerformanceMetrics {
  apiCalls: number;
  cacheHits: number;
  cacheMisses: number;
  totalTokens: number;
  totalCost: number;
  timeSaved: number;
  automationSuccess: number;
  automationFailure: number;
  sessionStart: Date;
  lastReset: Date;
}

interface DailyReport {
  summary: string;
  cost: string;
  performance: string;
  automation: string;
  projection: string;
  efficiency: string;
  recommendations: string[];
}

interface Target {
  cacheHitRate: number;
  dailyCost: number;
  apiResponseTime: number;
  automationSuccess: number;
  timeSavingsGoal: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private targets: Target;
  private timers: Map<string, number> = new Map();
  
  constructor() {
    this.targets = {
      cacheHitRate: 0.8,      // 80% cache hits
      dailyCost: 3.33,        // $100/month = $3.33/day
      apiResponseTime: 1000,   // 1 second
      automationSuccess: 0.9,  // 90% success rate
      timeSavingsGoal: 120     // 2 hours saved per day
    };
    
    this.metrics = this.loadMetrics();
    this.checkDailyReset();
  }
  
  trackAPICall(model: string, tokens: number, cached: boolean, responseTime?: number): void {
    if (cached) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
      this.metrics.apiCalls++;
      this.metrics.totalTokens += tokens;
      
      // Calculate cost based on model
      const cost = this.calculateCost(model, tokens);
      this.metrics.totalCost += cost;
    }
    
    // Track response time
    if (responseTime) {
      this.checkResponseTime(responseTime);
    }
    
    this.saveMetrics();
    this.checkTargets();
  }
  
  private calculateCost(model: string, tokens: number): number {
    switch (model) {
      case 'gpt-4':
        return tokens * 0.00003; // $0.03 per 1K tokens
      case 'gpt-4-turbo':
        return tokens * 0.00001; // $0.01 per 1K tokens
      case 'gpt-3.5-turbo':
        return tokens * 0.000002; // $0.002 per 1K tokens
      default:
        return tokens * 0.000002; // Default to cheapest
    }
  }
  
  trackTimeSaved(minutes: number, activity: string): void {
    this.metrics.timeSaved += minutes;
    this.saveMetrics();
    
    // Log the time saving event
    localBrain.logEvent('time_saved', {
      minutes,
      activity,
      totalSaved: this.metrics.timeSaved
    });
    
    console.log(`Time saved: ${minutes} minutes on ${activity}. Total today: ${this.metrics.timeSaved} minutes`);
  }
  
  trackAutomationResult(success: boolean, operation: string, details?: any): void {
    if (success) {
      this.metrics.automationSuccess++;
    } else {
      this.metrics.automationFailure++;
    }
    
    this.saveMetrics();
    
    // Log automation result
    localBrain.logDecision(
      `automation_${operation}`,
      details || {},
      { success },
      success ? 'success' : 'failure'
    );
  }
  
  startTimer(operation: string): void {
    this.timers.set(operation, Date.now());
  }
  
  endTimer(operation: string): number {
    const startTime = this.timers.get(operation);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.timers.delete(operation);
      return duration;
    }
    return 0;
  }
  
  private checkResponseTime(responseTime: number): void {
    if (responseTime > this.targets.apiResponseTime) {
      console.warn(`Slow API response: ${responseTime}ms (target: ${this.targets.apiResponseTime}ms)`);
      
      // Log slow response
      localBrain.logEvent('slow_api_response', {
        responseTime,
        target: this.targets.apiResponseTime
      });
    }
  }
  
  private checkTargets(): void {
    const currentCacheRate = this.getCurrentCacheHitRate();
    
    // Cache hit rate check
    if (currentCacheRate < this.targets.cacheHitRate) {
      console.warn(`Cache hit rate low: ${(currentCacheRate * 100).toFixed(1)}% (target: ${(this.targets.cacheHitRate * 100)}%)`);
    }
    
    // Daily cost check
    if (this.metrics.totalCost > this.targets.dailyCost) {
      console.warn(`Daily cost exceeded: $${this.metrics.totalCost.toFixed(2)} (target: $${this.targets.dailyCost})`);
      
      // Emit event to trigger cost control measures
      window.dispatchEvent(new CustomEvent('lifeos:cost_limit_exceeded', {
        detail: { current: this.metrics.totalCost, target: this.targets.dailyCost }
      }));
    }
    
    // Automation success rate check
    const totalAutomations = this.metrics.automationSuccess + this.metrics.automationFailure;
    if (totalAutomations > 10) { // Only check after sufficient data
      const successRate = this.metrics.automationSuccess / totalAutomations;
      if (successRate < this.targets.automationSuccess) {
        console.warn(`Automation success rate low: ${(successRate * 100).toFixed(1)}% (target: ${(this.targets.automationSuccess * 100)}%)`);
      }
    }
  }
  
  getCurrentCacheHitRate(): number {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total > 0 ? this.metrics.cacheHits / total : 0;
  }
  
  getDailyReport(): DailyReport {
    const cacheRate = this.getCurrentCacheHitRate();
    const totalAutomations = this.metrics.automationSuccess + this.metrics.automationFailure;
    const automationSuccessRate = totalAutomations > 0 
      ? (this.metrics.automationSuccess / totalAutomations) 
      : 0;
    
    const recommendations = this.generateRecommendations();
    
    return {
      summary: `Saved ${this.metrics.timeSaved} minutes today through automation and AI assistance`,
      cost: `$${this.metrics.totalCost.toFixed(2)} of $${this.targets.dailyCost.toFixed(2)} daily budget (${((this.metrics.totalCost / this.targets.dailyCost) * 100).toFixed(1)}%)`,
      performance: `${(cacheRate * 100).toFixed(1)}% cache hit rate (target: ${(this.targets.cacheHitRate * 100)}%)`,
      automation: `${this.metrics.automationSuccess} successful, ${this.metrics.automationFailure} failed (${(automationSuccessRate * 100).toFixed(1)}% success rate)`,
      projection: `Monthly cost projection: $${(this.metrics.totalCost * 30).toFixed(2)}`,
      efficiency: this.calculateEfficiencyScore(),
      recommendations
    };
  }
  
  private generateRecommendations(): string[] {
    const recommendations = [];
    const cacheRate = this.getCurrentCacheHitRate();
    
    if (cacheRate < this.targets.cacheHitRate) {
      recommendations.push('Improve caching by using more structured queries');
    }
    
    if (this.metrics.totalCost > this.targets.dailyCost * 0.8) {
      recommendations.push('Consider using more local intelligence to reduce API calls');
    }
    
    if (this.metrics.timeSaved < this.targets.timeSavingsGoal * 0.7) {
      recommendations.push('Increase automation rules to save more time');
    }
    
    const totalAutomations = this.metrics.automationSuccess + this.metrics.automationFailure;
    if (totalAutomations > 5) {
      const successRate = this.metrics.automationSuccess / totalAutomations;
      if (successRate < this.targets.automationSuccess) {
        recommendations.push('Review and improve automation rules for higher success rate');
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System performing well - continue current usage patterns');
    }
    
    return recommendations;
  }
  
  private calculateEfficiencyScore(): string {
    let score = 0;
    let maxScore = 4;
    
    // Cache hit rate score (25%)
    const cacheRate = this.getCurrentCacheHitRate();
    if (cacheRate >= this.targets.cacheHitRate) score++;
    
    // Cost efficiency score (25%)
    if (this.metrics.totalCost <= this.targets.dailyCost) score++;
    
    // Time savings score (25%)
    if (this.metrics.timeSaved >= this.targets.timeSavingsGoal * 0.8) score++;
    
    // Automation success score (25%)
    const totalAutomations = this.metrics.automationSuccess + this.metrics.automationFailure;
    if (totalAutomations > 0) {
      const successRate = this.metrics.automationSuccess / totalAutomations;
      if (successRate >= this.targets.automationSuccess) score++;
    } else {
      maxScore--; // Don't count automation if no data
    }
    
    const percentage = (score / maxScore) * 100;
    return `${percentage.toFixed(0)}% efficiency (${score}/${maxScore} targets met)`;
  }
  
  getWeeklyTimeSaved(): number {
    // For now, estimate based on daily * 7
    // In a full implementation, this would track weekly data
    return this.metrics.timeSaved * 7;
  }
  
  getWeeklyCost(): number {
    return this.metrics.totalCost * 7;
  }
  
  async getAdvancedMetrics(): Promise<any> {
    try {
      // Get cache statistics from database
      const cacheStats = await localBrain.getCacheStats();
      
      // Get recent automation events
      const recentAutomations = await localBrain.decisions
        .where('type')
        .startsWith('automation_')
        .and(decision => decision.timestamp > Date.now() - 24 * 60 * 60 * 1000)
        .toArray();
      
      // Calculate API call distribution
      const apiEvents = await localBrain.events
        .where('type')
        .equals('api_call')
        .and(event => event.timestamp > Date.now() - 24 * 60 * 60 * 1000)
        .toArray();
      
      const modelUsage = apiEvents.reduce((acc: Record<string, number>, event) => {
        const model = event.data?.model || 'unknown';
        acc[model] = (acc[model] || 0) + 1;
        return acc;
      }, {});
      
      return {
        cache: cacheStats,
        automation: {
          total: recentAutomations.length,
          success: recentAutomations.filter(a => a.feedback === 'success').length,
          failure: recentAutomations.filter(a => a.feedback === 'failure').length
        },
        api: {
          totalCalls: apiEvents.length,
          modelDistribution: modelUsage,
          averageTokens: apiEvents.length > 0 
            ? apiEvents.reduce((sum, e) => sum + (e.data?.tokens || 0), 0) / apiEvents.length 
            : 0
        },
        efficiency: this.calculateEfficiencyScore()
      };
      
    } catch (error) {
      console.error('Failed to get advanced metrics:', error);
      return null;
    }
  }
  
  private checkDailyReset(): void {
    const today = new Date().toDateString();
    const lastResetDate = this.metrics.lastReset.toDateString();
    
    if (today !== lastResetDate) {
      // Reset daily metrics
      this.metrics.apiCalls = 0;
      this.metrics.cacheHits = 0;
      this.metrics.cacheMisses = 0;
      this.metrics.totalTokens = 0;
      this.metrics.totalCost = 0;
      this.metrics.timeSaved = 0;
      this.metrics.automationSuccess = 0;
      this.metrics.automationFailure = 0;
      this.metrics.lastReset = new Date();
      
      this.saveMetrics();
    }
  }
  
  private loadMetrics(): PerformanceMetrics {
    try {
      const stored = localStorage.getItem('lifeos_performance_metrics');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          sessionStart: new Date(parsed.sessionStart),
          lastReset: new Date(parsed.lastReset)
        };
      }
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    }
    
    // Default metrics
    return {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalTokens: 0,
      totalCost: 0,
      timeSaved: 0,
      automationSuccess: 0,
      automationFailure: 0,
      sessionStart: new Date(),
      lastReset: new Date()
    };
  }
  
  private saveMetrics(): void {
    try {
      localStorage.setItem('lifeos_performance_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Failed to save performance metrics:', error);
    }
  }
  
  reset(): void {
    this.metrics = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalTokens: 0,
      totalCost: 0,
      timeSaved: 0,
      automationSuccess: 0,
      automationFailure: 0,
      sessionStart: new Date(),
      lastReset: new Date()
    };
    this.saveMetrics();
  }
  
  updateTargets(newTargets: Partial<Target>): void {
    this.targets = { ...this.targets, ...newTargets };
  }
  
  getTargets(): Target {
    return { ...this.targets };
  }
}

export const performanceMonitor = new PerformanceMonitor();
export type { PerformanceMetrics, DailyReport, Target };