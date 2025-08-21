import { useEffect } from 'react';
import { googleCalendar } from '@/lib/integrations/google-calendar';
import { useAgendaStore } from '@/features/agenda/useAgendaStore';
import { useNutritionStore } from '@/features/nutrition/useNutritionStore';
import { toast } from 'sonner';

export function useAIEventListeners() {
  useEffect(() => {
    // AI Create Event listener
    const handleCreateEvent = async (event: CustomEvent) => {
      try {
        const eventData = event.detail;
        console.log('AI creating event:', eventData);
        
        // If Google Calendar is connected, create there too
        if (googleCalendar.isConnected()) {
          await googleCalendar.createEvent(eventData);
        }
        
        // Also add to local agenda
        const { addAgendaItem } = useAgendaStore.getState();
        addAgendaItem({
          title: eventData.title,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          tag: eventData.type || 'meeting',
          priority: eventData.priority || 'medium'
        });
        
        toast.success(`Event created: ${eventData.title}`);
      } catch (error) {
        console.error('Failed to create event:', error);
        toast.error('Failed to create event');
      }
    };
    
    // AI Add Agenda Item listener
    const handleAddAgenda = async (event: CustomEvent) => {
      try {
        const agendaData = event.detail;
        console.log('AI adding agenda item:', agendaData);
        
        const { addAgendaItem } = useAgendaStore.getState();
        addAgendaItem({
          title: agendaData.title,
          startTime: agendaData.startTime || new Date().toISOString(),
          tag: agendaData.tag || 'personal',
          priority: agendaData.priority || 'medium',
          duration: agendaData.duration || 30
        });
        
        toast.success(`Added to agenda: ${agendaData.title}`);
      } catch (error) {
        console.error('Failed to add agenda item:', error);
        toast.error('Failed to add agenda item');
      }
    };
    
    // AI Log Food listener
    const handleLogFood = async (event: CustomEvent) => {
      try {
        const foodData = event.detail;
        console.log('AI logging food:', foodData);
        
        const { addFoodItem } = useNutritionStore.getState();
        addFoodItem({
          name: foodData.name,
          calories: foodData.calories || 0,
          protein: foodData.protein || 0,
          carbs: foodData.carbs || 0,
          fat: foodData.fat || 0,
          meal: foodData.meal || 'snack',
          timestamp: foodData.timestamp || new Date().toISOString()
        });
        
        toast.success(`Food logged: ${foodData.name}`);
      } catch (error) {
        console.error('Failed to log food:', error);
        toast.error('Failed to log food');
      }
    };
    
    // AutoPilot Reminder listener
    const handleAutopilotReminder = (event: CustomEvent) => {
      const reminder = event.detail;
      console.log('AutoPilot reminder:', reminder);
      
      toast.info(reminder.message, {
        duration: 10000,
        action: reminder.action ? {
          label: reminder.actionLabel || 'OK',
          onClick: () => reminder.action()
        } : undefined
      });
    };
    
    // AutoPilot Conflict Resolution listener
    const handleConflictResolution = (event: CustomEvent) => {
      const conflict = event.detail;
      console.log('AutoPilot conflict detected:', conflict);
      
      toast.warning(`Schedule conflict: ${conflict.message}`, {
        duration: 15000,
        action: {
          label: 'Resolve',
          onClick: () => {
            // Open conflict resolution modal
            window.dispatchEvent(new CustomEvent('open-conflict-modal', { detail: conflict }));
          }
        }
      });
    };
    
    // AutoPilot Suggestion listener
    const handleAutopilotSuggestion = (event: CustomEvent) => {
      const suggestion = event.detail;
      console.log('AutoPilot suggestion:', suggestion);
      
      toast(suggestion.message, {
        duration: 8000,
        action: suggestion.action ? {
          label: suggestion.actionLabel || 'Apply',
          onClick: async () => {
            if (suggestion.action) {
              await suggestion.action();
            }
          }
        } : undefined
      });
    };
    
    // AutoPilot Briefing listener
    const handleAutopilotBriefing = (event: CustomEvent) => {
      const briefing = event.detail;
      console.log('AutoPilot briefing:', briefing);
      
      toast.message('Daily Briefing', {
        description: briefing.message,
        duration: 20000,
        action: {
          label: 'View Details',
          onClick: () => {
            window.dispatchEvent(new CustomEvent('open-briefing-modal', { detail: briefing }));
          }
        }
      });
    };
    
    // Life OS event listeners (from UniversalCommand)
    const handleTaskCreated = (event: CustomEvent) => {
      const task = event.detail;
      console.log('Task created via Life OS:', task);
      
      const { addAgendaItem } = useAgendaStore.getState();
      addAgendaItem({
        title: task.title,
        startTime: new Date().toISOString(),
        tag: 'task',
        priority: task.priority || 'medium'
      });
    };
    
    const handleEventCreated = (event: CustomEvent) => {
      const eventData = event.detail;
      console.log('Event created via Life OS:', eventData);
      
      const { addAgendaItem } = useAgendaStore.getState();
      addAgendaItem({
        title: eventData.title,
        startTime: eventData.startTime.toISOString ? eventData.startTime.toISOString() : eventData.startTime,
        endTime: eventData.endTime?.toISOString ? eventData.endTime.toISOString() : eventData.endTime,
        tag: eventData.type || 'event',
        priority: 'medium'
      });
    };
    
    const handleMealLogged = (event: CustomEvent) => {
      const meal = event.detail;
      console.log('Meal logged via Life OS:', meal);
      
      const { addFoodItem } = useNutritionStore.getState();
      // Parse meal info to extract nutrition data
      addFoodItem({
        name: meal.info,
        calories: 0, // Would need AI to parse this from meal.info
        protein: 0,
        carbs: 0,
        fat: 0,
        meal: 'snack',
        timestamp: new Date().toISOString()
      });
    };
    
    const handleReminderCreated = (event: CustomEvent) => {
      const reminder = event.detail;
      console.log('Reminder created via Life OS:', reminder);
      
      // Schedule a notification
      setTimeout(() => {
        toast.info(`Reminder: ${reminder.text}`, {
          duration: 10000
        });
      }, 60000); // Show after 1 minute for demo
    };
    
    const handleNotification = (event: CustomEvent) => {
      const { message, type } = event.detail;
      
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
        case 'info':
        default:
          toast.info(message);
          break;
      }
    };
    
    // Add all event listeners
    window.addEventListener('ai-create-event', handleCreateEvent as any);
    window.addEventListener('ai-add-agenda', handleAddAgenda as any);
    window.addEventListener('ai-log-food', handleLogFood as any);
    window.addEventListener('autopilot-reminder', handleAutopilotReminder as any);
    window.addEventListener('autopilot-conflict-resolution', handleConflictResolution as any);
    window.addEventListener('autopilot-suggestion', handleAutopilotSuggestion as any);
    window.addEventListener('autopilot-briefing', handleAutopilotBriefing as any);
    window.addEventListener('lifeos:task_created', handleTaskCreated as any);
    window.addEventListener('lifeos:event_created', handleEventCreated as any);
    window.addEventListener('lifeos:meal_logged', handleMealLogged as any);
    window.addEventListener('lifeos:reminder_created', handleReminderCreated as any);
    window.addEventListener('lifeos:notification', handleNotification as any);
    
    // Cleanup
    return () => {
      window.removeEventListener('ai-create-event', handleCreateEvent as any);
      window.removeEventListener('ai-add-agenda', handleAddAgenda as any);
      window.removeEventListener('ai-log-food', handleLogFood as any);
      window.removeEventListener('autopilot-reminder', handleAutopilotReminder as any);
      window.removeEventListener('autopilot-conflict-resolution', handleConflictResolution as any);
      window.removeEventListener('autopilot-suggestion', handleAutopilotSuggestion as any);
      window.removeEventListener('autopilot-briefing', handleAutopilotBriefing as any);
      window.removeEventListener('lifeos:task_created', handleTaskCreated as any);
      window.removeEventListener('lifeos:event_created', handleEventCreated as any);
      window.removeEventListener('lifeos:meal_logged', handleMealLogged as any);
      window.removeEventListener('lifeos:reminder_created', handleReminderCreated as any);
      window.removeEventListener('lifeos:notification', handleNotification as any);
    };
  }, []);
}