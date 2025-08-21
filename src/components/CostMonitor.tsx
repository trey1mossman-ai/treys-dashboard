import { useState, useEffect } from 'react';
import { costController } from '@/lib/ai/cost-controller';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

export function CostMonitor() {
  const [stats, setStats] = useState(() => costController.getStats());
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    // Update stats every minute
    const interval = setInterval(() => {
      setStats(costController.getStats());
    }, 60000);
    
    // Also update when AI calls are made
    const handleAICall = () => {
      setTimeout(() => {
        setStats(costController.getStats());
      }, 100);
    };
    
    window.addEventListener('ai-call-made', handleAICall);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('ai-call-made', handleAICall);
    };
  }, []);
  
  const monthlyBudget = 100;
  const percentUsed = (stats.monthly / monthlyBudget) * 100;
  const isOverBudget = percentUsed > 100;
  const isNearLimit = percentUsed > 80;
  
  return (
    <div 
      className={`fixed bottom-20 right-4 bg-card border rounded-lg shadow-lg transition-all cursor-pointer ${
        isExpanded ? 'w-64' : 'w-32'
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">AI Costs</span>
          </div>
          {isOverBudget && <AlertCircle className="w-4 h-4 text-destructive" />}
          {!isOverBudget && isNearLimit && <AlertCircle className="w-4 h-4 text-warning" />}
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Today:</span>
            <span className="text-xs font-mono">${stats.daily.toFixed(3)}</span>
          </div>
          
          {isExpanded && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">This Month:</span>
                <span className={`text-xs font-mono ${
                  isOverBudget ? 'text-destructive' : isNearLimit ? 'text-warning' : ''
                }`}>
                  ${stats.monthly.toFixed(2)}
                </span>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground">Budget:</span>
                  <span className="text-xs font-mono">${monthlyBudget}</span>
                </div>
                
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      isOverBudget ? 'bg-destructive' : isNearLimit ? 'bg-warning' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  />
                </div>
                
                <div className="text-xs text-muted-foreground text-center mt-1">
                  {percentUsed.toFixed(1)}% used
                </div>
              </div>
              
              {stats.calls > 0 && (
                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">API Calls:</span>
                    <span className="text-xs font-mono">{stats.calls}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Avg Cost:</span>
                    <span className="text-xs font-mono">
                      ${(stats.monthly / stats.calls).toFixed(4)}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="pt-2 border-t">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  <span>Projected: ${(stats.daily * 30).toFixed(2)}/mo</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}