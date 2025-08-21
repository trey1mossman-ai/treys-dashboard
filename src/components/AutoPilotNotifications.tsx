import { useEffect } from 'react';
import { toast } from 'sonner';

export function AutoPilotNotifications() {
  useEffect(() => {
    // AutoPilot Reminder handler
    const handleReminder = (event: CustomEvent) => {
      const { message, priority = 'normal' } = event.detail;
      
      const toastOptions = {
        duration: priority === 'high' ? 15000 : 8000,
        position: 'top-right' as const,
      };
      
      if (priority === 'high') {
        toast.error(message, toastOptions);
      } else {
        toast.info(message, toastOptions);
      }
    };
    
    // AutoPilot Suggestion handler
    const handleSuggestion = (event: CustomEvent) => {
      const { message, confidence, action } = event.detail;
      
      toast.message(`💡 AI Suggestion (${Math.round(confidence * 100)}% confidence)`, {
        description: message,
        duration: 10000,
        action: action ? {
          label: 'Apply',
          onClick: () => {
            if (typeof action === 'function') {
              action();
            }
          }
        } : undefined
      });
    };
    
    // AutoPilot Briefing handler
    const handleBriefing = (event: CustomEvent) => {
      const { 
        summary, 
        keyTasks, 
        focusBlocks, 
        energyOptimal,
        weatherAlert 
      } = event.detail;
      
      let briefingMessage = summary;
      
      if (keyTasks && keyTasks.length > 0) {
        briefingMessage += `\n\n📋 Key Tasks: ${keyTasks.slice(0, 3).join(', ')}`;
      }
      
      if (focusBlocks && focusBlocks.length > 0) {
        briefingMessage += `\n\n🎯 Focus Blocks: ${focusBlocks.join(', ')}`;
      }
      
      if (energyOptimal) {
        briefingMessage += `\n\n⚡ Peak energy: ${energyOptimal}`;
      }
      
      if (weatherAlert) {
        briefingMessage += `\n\n🌤️ ${weatherAlert}`;
      }
      
      toast.message('🌅 Daily Briefing', {
        description: briefingMessage,
        duration: 20000,
        position: 'top-center',
        action: {
          label: 'Dismiss',
          onClick: () => {}
        }
      });
    };
    
    // AutoPilot Alert handler
    const handleAlert = (event: CustomEvent) => {
      const { message, type = 'info' } = event.detail;
      
      switch(type) {
        case 'success':
          toast.success(message);
          break;
        case 'error':
          toast.error(message);
          break;
        case 'warning':
          toast.warning(message);
          break;
        default:
          toast.info(message);
      }
    };
    
    // AutoPilot Conflict handler
    const handleConflict = (event: CustomEvent) => {
      const { conflictA, conflictB, suggestedResolution } = event.detail;
      
      toast.warning('⚠️ Schedule Conflict Detected', {
        description: `${conflictA} overlaps with ${conflictB}. Suggested: ${suggestedResolution}`,
        duration: 15000,
        action: {
          label: 'Resolve',
          onClick: () => {
            // Trigger conflict resolution modal
            window.dispatchEvent(new CustomEvent('open-conflict-modal', { 
              detail: { conflictA, conflictB, suggestedResolution }
            }));
          }
        }
      });
    };
    
    // AutoPilot Progress handler
    const handleProgress = (event: CustomEvent) => {
      const { taskName, progress, milestone } = event.detail;
      
      if (milestone) {
        toast.success(`🎉 Milestone reached: ${milestone}`, {
          duration: 5000
        });
      } else {
        toast.info(`Progress: ${taskName} - ${progress}%`, {
          duration: 3000
        });
      }
    };
    
    // Add event listeners
    window.addEventListener('autopilot-reminder', handleReminder as EventListener);
    window.addEventListener('autopilot-suggestion', handleSuggestion as EventListener);
    window.addEventListener('autopilot-briefing', handleBriefing as EventListener);
    window.addEventListener('autopilot-alert', handleAlert as EventListener);
    window.addEventListener('autopilot-conflict', handleConflict as EventListener);
    window.addEventListener('autopilot-progress', handleProgress as EventListener);
    
    // Initial notification after mount
    setTimeout(() => {
      toast.success('🤖 AutoPilot is now active', {
        description: 'I\'ll monitor your schedule and provide intelligent suggestions',
        duration: 5000
      });
    }, 1000);
    
    // Cleanup
    return () => {
      window.removeEventListener('autopilot-reminder', handleReminder as EventListener);
      window.removeEventListener('autopilot-suggestion', handleSuggestion as EventListener);
      window.removeEventListener('autopilot-briefing', handleBriefing as EventListener);
      window.removeEventListener('autopilot-alert', handleAlert as EventListener);
      window.removeEventListener('autopilot-conflict', handleConflict as EventListener);
      window.removeEventListener('autopilot-progress', handleProgress as EventListener);
    };
  }, []);
  
  // This component doesn't render anything visible - it just handles notifications
  return null;
}