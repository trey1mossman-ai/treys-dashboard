import { useMissionControlStore } from '@/stores/missionControlStore';
import { cn } from '@/lib/utils';
import { Moon, Activity, Brain, Apple, AlertTriangle } from 'lucide-react';

export function TelemetryPanel() {
  const { status } = useMissionControlStore();
  
  if (!status) {
    return (
      <div className="mc-card p-6">
        <div className="text-center py-8">
          <p className="text-mc-text-muted">No status data available</p>
          <p className="text-sm text-mc-text-muted mt-2">
            Waiting for status snapshot from agents
          </p>
        </div>
      </div>
    );
  }
  
  const getStressColor = (level: string) => {
    switch (level) {
      case 'green': return 'text-mc-success';
      case 'yellow': return 'text-mc-warning';
      case 'red': return 'text-mc-danger';
      default: return 'text-mc-text-secondary';
    }
  };
  
  const getLoadColor = (load: string) => {
    switch (load) {
      case 'low': return 'bg-mc-success/20 text-mc-success';
      case 'moderate': return 'bg-mc-warning/20 text-mc-warning';
      case 'high': return 'bg-mc-danger/20 text-mc-danger';
      default: return 'bg-mc-surface text-mc-text-secondary';
    }
  };
  
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="mc-card p-4">        
        <div className="space-y-4">
          {/* Sleep */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-mc-accent-violet" />
              <span className="text-sm text-mc-text-secondary">Sleep</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-semibold">{status.sleep_hours}</span>
              <span className="text-sm text-mc-text-muted ml-1">hours</span>
            </div>
          </div>
          
          {/* Recovery */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-mc-accent-cyan" />
              <span className="text-sm text-mc-text-secondary">Recovery</span>
            </div>
            <div className="flex items-center gap-2">
              {status.recovery_proxy !== null ? (
                <>
                  <span className="text-lg font-semibold">{status.recovery_proxy}%</span>
                  <div className="w-16 h-1 bg-mc-surface rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500",
                        status.recovery_proxy >= 80 ? "bg-mc-success" :
                        status.recovery_proxy >= 60 ? "bg-mc-warning" : "bg-mc-danger"
                      )}
                      style={{ width: `${status.recovery_proxy}%` }}
                    />
                  </div>
                </>
              ) : (
                <span className="text-sm text-mc-text-muted">N/A</span>
              )}
            </div>
          </div>
          
          {/* Training Load */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-mc-success" />
              <span className="text-sm text-mc-text-secondary">Training Load</span>
            </div>
            <span className={cn(
              "px-2 py-0.5 rounded text-xs font-medium uppercase",
              getLoadColor(status.training_load_today)
            )}>
              {status.training_load_today}
            </span>
          </div>
          
          {/* Nutrition Compliance */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Apple className="w-4 h-4 text-mc-accent-amber" />
              <span className="text-sm text-mc-text-secondary">Nutrition (7d)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-lg font-semibold",
                status.nutrition_compliance_7d >= 80 ? "text-mc-success" :
                status.nutrition_compliance_7d >= 60 ? "text-mc-warning" : "text-mc-danger"
              )}>
                {status.nutrition_compliance_7d}%
              </span>
            </div>
          </div>
          
          {/* Stress Flag */}
          <div className="pt-2 border-t border-mc-border">
            <div className="flex items-start gap-2">
              <AlertTriangle className={cn(
                "w-4 h-4 mt-0.5",
                getStressColor(status.stress_flag.level)
              )} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-mc-text-secondary">Stress</span>
                  <span className={cn(
                    "text-xs font-medium uppercase",
                    getStressColor(status.stress_flag.level)
                  )}>
                    {status.stress_flag.level}
                  </span>
                </div>
                {status.stress_flag.reason && (
                  <p className="text-xs text-mc-text-muted mt-1">
                    {status.stress_flag.reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-mc-border">
          <p className="text-xs text-mc-text-muted">
            Last updated: {formatTime(status.captured_at)}
          </p>
        </div>
      </div>
      
      {/* Visual Summary */}
      <div className="mc-card p-4">
        <h4 className="text-sm font-medium text-mc-text-secondary mb-3">System Status</h4>
        
        <div className="grid grid-cols-2 gap-3">
          <div className={cn(
            "p-3 rounded-lg text-center",
            status.sleep_hours >= 7 ? "bg-mc-success/10" : "bg-mc-warning/10"
          )}>
            <Moon className={cn(
              "w-6 h-6 mx-auto mb-1",
              status.sleep_hours >= 7 ? "text-mc-success" : "text-mc-warning"
            )} />
            <span className="text-xs">Sleep</span>
          </div>
          
          <div className={cn(
            "p-3 rounded-lg text-center",
            status.recovery_proxy && status.recovery_proxy >= 70 ? "bg-mc-success/10" : "bg-mc-warning/10"
          )}>
            <Brain className={cn(
              "w-6 h-6 mx-auto mb-1",
              status.recovery_proxy && status.recovery_proxy >= 70 ? "text-mc-success" : "text-mc-warning"
            )} />
            <span className="text-xs">Recovery</span>
          </div>
          
          <div className={cn(
            "p-3 rounded-lg text-center",
            status.nutrition_compliance_7d >= 80 ? "bg-mc-success/10" : "bg-mc-warning/10"
          )}>
            <Apple className={cn(
              "w-6 h-6 mx-auto mb-1",
              status.nutrition_compliance_7d >= 80 ? "text-mc-success" : "text-mc-warning"
            )} />
            <span className="text-xs">Nutrition</span>
          </div>
          
          <div className={cn(
            "p-3 rounded-lg text-center",
            status.stress_flag.level === 'green' ? "bg-mc-success/10" : 
            status.stress_flag.level === 'yellow' ? "bg-mc-warning/10" : "bg-mc-danger/10"
          )}>
            <AlertTriangle className={cn(
              "w-6 h-6 mx-auto mb-1",
              getStressColor(status.stress_flag.level)
            )} />
            <span className="text-xs">Stress</span>
          </div>
        </div>
      </div>
    </div>
  );
}