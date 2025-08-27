import { useEffect } from 'react';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { cn } from '@/lib/utils';
import { Info, AlertTriangle, AlertCircle, CheckCircle, X } from 'lucide-react';

export function NotificationToasts() {
  const { notifications, removeNotification } = useMissionControlStore();
  
  useEffect(() => {
    // Auto-dismiss info notifications after 4 seconds
    const timers: NodeJS.Timeout[] = [];
    
    notifications.forEach(notification => {
      if (notification.severity === 'info' && notification.auto_dismiss !== false) {
        const timer = setTimeout(() => {
          removeNotification(notification.id);
        }, 4000);
        timers.push(timer);
      }
    });
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, removeNotification]);
  
  const getIcon = (severity: string) => {
    switch (severity) {
      case 'info':
        return <Info className="w-4 h-4" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4" />;
      case 'critical':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };
  
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'border-mc-info/30 text-mc-info';
      case 'warn':
        return 'border-mc-warning/30 text-mc-warning';
      case 'critical':
        return 'border-mc-danger/30 text-mc-danger';
      default:
        return 'border-mc-border text-mc-text-secondary';
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'low_stock':
        return 'Inventory';
      case 'schedule_change':
        return 'Schedule';
      case 'agent_result':
        return 'Agent';
      default:
        return 'System';
    }
  };
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {notifications.slice(0, 5).map((notification, index) => (
        <div
          key={notification.id}
          className={cn(
            "mc-toast pointer-events-auto",
            "flex items-start gap-3",
            "max-w-md",
            "animate-slide-in",
            getSeverityStyles(notification.severity)
          )}
          style={{
            animationDelay: `${index * 50}ms`
          }}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(notification.severity)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium uppercase opacity-75">
                {getTypeLabel(notification.type)}
              </span>
              {notification.severity === 'critical' && (
                <span className="text-xs px-1.5 py-0.5 bg-mc-danger/20 text-mc-danger rounded">
                  URGENT
                </span>
              )}
            </div>
            <p className="text-sm">{notification.message}</p>
          </div>
          
          <button
            onClick={() => removeNotification(notification.id)}
            className="flex-shrink-0 p-1 rounded hover:bg-mc-surface transition-colors pointer-events-auto"
            aria-label="Dismiss notification"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      
      {notifications.length > 5 && (
        <div className="mc-toast pointer-events-auto text-center">
          <p className="text-xs text-mc-text-muted">
            +{notifications.length - 5} more notifications
          </p>
        </div>
      )}
    </div>
  );
}