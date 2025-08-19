interface CostStats {
  daily: string;
  monthly: string;
  remaining: string;
  projection: string;
}

class CostController {
  private dailySpend = 0;
  private monthlySpend = 0;
  private lastReset = new Date();
  private storageKey = 'lifeos-cost-tracking';
  
  constructor(private monthlyBudget: number = Number(import.meta.env.VITE_MONTHLY_BUDGET || 100)) {
    this.loadFromStorage();
    this.checkDailyReset();
  }
  
  canSpend(estimatedCost: number): boolean {
    const dailyBudget = this.monthlyBudget / 30;
    const safetyMargin = 0.5; // 50% safety margin
    
    return (this.dailySpend + estimatedCost) < (dailyBudget * safetyMargin);
  }
  
  recordSpend(tokens: number, model: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo'): void {
    // Updated pricing as of 2024
    let cost = 0;
    
    switch (model) {
      case 'gpt-3.5-turbo':
        cost = (tokens / 1000) * 0.002; // $0.002 per 1K tokens
        break;
      case 'gpt-4':
        cost = (tokens / 1000) * 0.03; // $0.03 per 1K tokens
        break;
      case 'gpt-4-turbo':
        cost = (tokens / 1000) * 0.01; // $0.01 per 1K tokens
        break;
    }
    
    this.dailySpend += cost;
    this.monthlySpend += cost;
    this.saveToStorage();
    
    // Alert if approaching limits
    if (this.monthlySpend > this.monthlyBudget * 0.8) {
      console.warn(`Cost warning: $${this.monthlySpend.toFixed(2)}/$${this.monthlyBudget} monthly budget`);
    }
    
    if (this.dailySpend > (this.monthlyBudget / 30) * 0.8) {
      console.warn(`Daily budget warning: $${this.dailySpend.toFixed(2)}/$${(this.monthlyBudget / 30).toFixed(2)}`);
    }
  }
  
  getStats(): CostStats {
    return {
      daily: this.dailySpend.toFixed(2),
      monthly: this.monthlySpend.toFixed(2),
      remaining: (this.monthlyBudget - this.monthlySpend).toFixed(2),
      projection: (this.dailySpend * 30).toFixed(2)
    };
  }
  
  getWeeklyCost(): number {
    // Estimate based on daily spend
    return this.dailySpend * 7;
  }
  
  isApproachingLimit(): boolean {
    return this.monthlySpend > this.monthlyBudget * 0.9;
  }
  
  getDailyBudgetRemaining(): number {
    const dailyBudget = this.monthlyBudget / 30;
    return Math.max(0, dailyBudget - this.dailySpend);
  }
  
  private checkDailyReset(): void {
    const now = new Date();
    const lastResetDate = new Date(this.lastReset);
    
    // Reset daily spend if it's a new day
    if (now.getDate() !== lastResetDate.getDate() || 
        now.getMonth() !== lastResetDate.getMonth() ||
        now.getFullYear() !== lastResetDate.getFullYear()) {
      this.dailySpend = 0;
      this.lastReset = now;
      this.saveToStorage();
    }
    
    // Reset monthly spend if it's a new month
    if (now.getMonth() !== lastResetDate.getMonth() ||
        now.getFullYear() !== lastResetDate.getFullYear()) {
      this.monthlySpend = 0;
      this.saveToStorage();
    }
  }
  
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.dailySpend = data.dailySpend || 0;
        this.monthlySpend = data.monthlySpend || 0;
        this.lastReset = new Date(data.lastReset || Date.now());
      }
    } catch (error) {
      console.warn('Failed to load cost tracking data:', error);
    }
  }
  
  private saveToStorage(): void {
    try {
      const data = {
        dailySpend: this.dailySpend,
        monthlySpend: this.monthlySpend,
        lastReset: this.lastReset.toISOString()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cost tracking data:', error);
    }
  }
  
  reset(): void {
    this.dailySpend = 0;
    this.monthlySpend = 0;
    this.lastReset = new Date();
    this.saveToStorage();
  }
  
  // Generate daily report for monitoring
  generateDailyReport(): string {
    const stats = this.getStats();
    const dailyBudget = (this.monthlyBudget / 30).toFixed(2);
    
    return `Cost Report:
Daily: $${stats.daily} / $${dailyBudget} budget
Monthly: $${stats.monthly} / $${this.monthlyBudget} budget
Remaining: $${stats.remaining}
Projection: $${stats.projection}/month`;
  }
}

export const costController = new CostController();
export type { CostStats };