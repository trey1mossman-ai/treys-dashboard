import { useEffect } from 'react';
import { useMissionControlStore } from '@/stores/missionControlStore';
import type { AgendaItem, WorkoutItem } from '@/types/mission-control';
import { cn } from '@/lib/utils';
import { X, Clock, Activity, CheckCircle, PlayCircle } from 'lucide-react';

interface PreviewDrawerProps {
  item: AgendaItem | null;
  onClose: () => void;
  isMobile?: boolean;
}

export function PreviewDrawer({ item, onClose, isMobile = false }: PreviewDrawerProps) {
  const { markItemComplete } = useMissionControlStore();
  
  useEffect(() => {
    if (item && isMobile) {
      // Prevent body scroll on mobile when drawer is open
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [item, isMobile]);
  
  if (!item) return null;
  
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  const getDuration = () => {
    if (!item.end_time) return null;
    const start = new Date(item.start_time).getTime();
    const end = new Date(item.end_time).getTime();
    const minutes = Math.round((end - start) / 60000);
    
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };
  
  const handleMarkComplete = async (status: 'done' | 'skipped') => {
    await markItemComplete({
      agenda_item_id: item.id,
      status,
      completed_at: new Date().toISOString()
    });
    onClose();
  };
  
  const renderWorkoutDetails = () => {
    if (item.source !== 'workout' || !item.metadata.workout) return null;
    
    const workout = item.metadata.workout as WorkoutItem;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-mc-accent-cyan" />
          <span className="text-sm font-medium uppercase text-mc-text-secondary">
            {workout.intensity_flag} Intensity
          </span>
        </div>
        
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-mc-text-secondary">Workout Blocks</h4>
          {workout.blocks.map((block, idx) => (
            <div key={idx} className="mc-card p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{block.name}</span>
                <span className="text-sm text-mc-accent-cyan">
                  {block.target_sets} × {block.target_reps}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {workout.adjustments && (
          <div className="p-3 bg-mc-warning/10 border border-mc-warning/20 rounded-lg">
            <p className="text-sm text-mc-warning">
              <span className="font-medium">Adjustments: </span>
              {workout.adjustments}
            </p>
          </div>
        )}
      </div>
    );
  };
  
  const renderSupplementDetails = () => {
    if (item.source !== 'supplements' || !item.metadata.items) return null;
    
    const items = item.metadata.items as Array<{
      supplement_name: string;
      dose: number;
      unit: string;
      with_food: boolean;
    }>;
    
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-mc-text-secondary">Supplements</h4>
        {items.map((supp, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-mc-surface">
            <span className="text-sm">{supp.supplement_name}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-mc-accent-violet">
                {supp.dose}{supp.unit}
              </span>
              {supp.with_food && (
                <span className="text-xs px-2 py-0.5 bg-mc-warning/20 text-mc-warning rounded">
                  With Food
                </span>
              )}
            </div>
          </div>
        ))}
        
        {item.metadata.compliance_percent !== undefined && (
          <div className="mt-3 pt-3 border-t border-mc-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-mc-text-muted">7-Day Compliance</span>
              <span className={cn(
                "text-sm font-medium",
                item.metadata.compliance_percent >= 80 ? "text-mc-success" : "text-mc-warning"
              )}>
                {item.metadata.compliance_percent}%
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className={cn(
      "flex flex-col bg-mc-bg-secondary border-l border-mc-border",
      isMobile && "fixed inset-0 z-50"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-mc-border">
        <div className="flex items-center gap-2">
          <span className={cn("mc-badge", `mc-badge-${item.source}`)}>
            {item.source}
          </span>
          {item.status === 'done' && (
            <CheckCircle className="w-4 h-4 text-mc-success" />
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-mc-surface transition-colors"
          aria-label="Close preview"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
          
          <div className="flex items-center gap-4 text-sm text-mc-text-secondary">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>
                {formatTime(item.start_time)}
                {item.end_time && ` - ${formatTime(item.end_time)}`}
              </span>
            </div>
            {getDuration() && (
              <span className="text-mc-text-muted">({getDuration()})</span>
            )}
          </div>
          
          {item.metadata.display_notes && (
            <p className="mt-3 text-sm text-mc-text-secondary">
              {item.metadata.display_notes}
            </p>
          )}
        </div>
        
        {/* Source-specific details */}
        {renderWorkoutDetails()}
        {renderSupplementDetails()}
        
        {/* Custom metadata */}
        {Object.keys(item.metadata).length > 1 && (
          <details className="mt-4">
            <summary className="text-xs text-mc-text-muted cursor-pointer hover:text-mc-text-secondary">
              Additional Details
            </summary>
            <pre className="mt-2 p-2 bg-mc-surface rounded text-xs overflow-x-auto">
              {JSON.stringify(item.metadata, null, 2)}
            </pre>
          </details>
        )}
      </div>
      
      {/* Actions */}
      <div className="p-4 border-t border-mc-border space-y-2">
        {item.status !== 'done' && (
          <>
            <button
              onClick={() => handleMarkComplete('done')}
              className="mc-button mc-button-primary w-full flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Mark Complete
            </button>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // TODO: Implement "Do Now" functionality
                  console.log('Do now:', item.id);
                }}
                className="mc-button mc-button-secondary flex-1 flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-4 h-4" />
                Do Now
              </button>
              
              <button
                onClick={() => handleMarkComplete('skipped')}
                className="mc-button mc-button-secondary flex-1"
              >
                Skip
              </button>
            </div>
          </>
        )}
        
        {item.status === 'done' && (
          <button
            onClick={() => {
              // Mark as pending by toggling to skipped then back
              handleMarkComplete('skipped');
            }}
            className="mc-button mc-button-secondary w-full"
          >
            Mark Incomplete
          </button>
        )}
      </div>
    </div>
  );
}