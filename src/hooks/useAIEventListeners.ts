import { useEffect } from 'react';
import { googleCalendar } from '@/lib/integrations/google-calendar';
import { useAgendaStore } from '@/features/agenda/useAgendaStore';
import { useNutritionStore } from '@/features/nutrition/useNutritionStore';
import { useUIStore } from '@/state/useUIStore';
import { dashboardController } from '@/lib/ai/dashboard-controller';
import { aiDashboardBridge } from '@/services/aiDashboardBridge';
import { toast } from 'sonner';

export function useAIEventListeners() {
  useEffect(() => {
    // =============================================
    // COMPREHENSIVE AI DASHBOARD EVENT HANDLERS
    // =============================================
    
    // Main AI Dashboard Command Handler
    const handleAIDashboardCommand = async (event: CustomEvent) => {
      try {
        const { command, context } = event.detail;
        console.log('Processing AI dashboard command:', command);
        
        const response = await aiDashboardBridge.processCommand({ command, context });
        
        if (response.success) {
          toast.success(response.message);
          
          // Show suggestions if available
          if (response.suggestions && response.suggestions.length > 0) {
            setTimeout(() => {
              toast.info(`Suggestions: ${response.suggestions?.join(', ')}`, {
                duration: 8000
              });
            }, 1000);
          }
        } else {
          toast.error(response.message);
          if (response.errors && response.errors.length > 0) {
            console.error('AI command errors:', response.errors);
          }
        }
      } catch (error) {
        console.error('Failed to process AI dashboard command:', error);
        toast.error('Failed to process AI command');
      }
    };
    
    // AI Tool Execution Handler
    const handleAIToolExecution = async (event: CustomEvent) => {
      try {
        const { tool, parameters } = event.detail;
        console.log('Executing AI tool:', tool, parameters);
        
        const result = await dashboardController.executeCommand(tool, parameters);
        
        if (result.success) {
          toast.success(result.message);
          
          // Dispatch tool completed event with result
          window.dispatchEvent(new CustomEvent('ai-tool-completed', {
            detail: { tool, parameters, result }
          }));
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        console.error('Failed to execute AI tool:', error);
        toast.error('Failed to execute AI tool');
      }
    };
    
    // Navigation Handler
    const handleAINavigation = (event: CustomEvent) => {
      try {
        const { section, subsection } = event.detail;
        console.log('AI navigation request:', section, subsection);
        
        // Get current page URL and navigate
        const currentPath = window.location.pathname;
        let targetPath = '';
        
        switch (section) {
          case 'dashboard':
            targetPath = '/';
            break;
          case 'agenda':
            targetPath = '/agenda';
            break;
          case 'todos':
            targetPath = '/todos';
            break;
          case 'food':
            targetPath = '/food';
            break;
          case 'supplements':
            targetPath = '/supplements';
            break;
          case 'settings':
            targetPath = '/settings';
            break;
          case 'workflows':
            targetPath = '/workflows';
            break;
          case 'fitness':
            targetPath = '/fitness';
            break;
          default:
            // Scroll to section if on dashboard
            const element = document.getElementById(section);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
              toast.success(`Navigated to ${section} section`);
              return;
            }
        }
        
        if (targetPath && targetPath !== currentPath) {
          // Use router navigation if available, otherwise fallback to location
          if (window.history?.pushState) {
            window.history.pushState({}, '', targetPath);
            window.dispatchEvent(new PopStateEvent('popstate'));
          } else {
            window.location.pathname = targetPath;
          }
          toast.success(`Navigated to ${section}`);
        }
      } catch (error) {
        console.error('Navigation error:', error);
        toast.error('Failed to navigate');
      }
    };
    
    // Focus Mode Handler
    const handleFocusModeToggle = (event: CustomEvent) => {
      try {
        const { enabled, duration, task } = event.detail;
        console.log('Focus mode toggle:', enabled, duration, task);
        
        // Dispatch to focus mode component
        window.dispatchEvent(new CustomEvent('focus-mode-change', {
          detail: { enabled, duration, task }
        }));
        
        const message = enabled 
          ? `Focus mode enabled${duration ? ` for ${duration} minutes` : ''}${task ? ` - ${task}` : ''}`
          : 'Focus mode disabled';
        
        toast.success(message);
      } catch (error) {
        console.error('Focus mode error:', error);
        toast.error('Failed to toggle focus mode');
      }
    };
    
    // Modal Handler
    const handleModalOpen = (event: CustomEvent) => {
      try {
        const { modal, data } = event.detail;
        console.log('Opening modal:', modal, data);
        
        // Dispatch specific modal events
        switch (modal) {
          case 'settings':
            window.dispatchEvent(new CustomEvent('open-settings-modal', { detail: data }));
            break;
          case 'ai-generate':
            window.dispatchEvent(new CustomEvent('open-ai-generate-modal', { detail: data }));
            break;
          case 'quick-action':
            window.dispatchEvent(new CustomEvent('open-quick-action-modal', { detail: data }));
            break;
          case 'agenda-editor':
            window.dispatchEvent(new CustomEvent('open-agenda-editor-modal', { detail: data }));
            break;
          case 'food-logger':
            window.dispatchEvent(new CustomEvent('open-food-logger-modal', { detail: data }));
            break;
          default:
            window.dispatchEvent(new CustomEvent(`open-${modal}-modal`, { detail: data }));
        }
        
        toast.success(`Opened ${modal} modal`);
      } catch (error) {
        console.error('Modal open error:', error);
        toast.error('Failed to open modal');
      }
    };
    
    // Sidebar Toggle Handler
    const handleSidebarToggle = (event: CustomEvent) => {
      try {
        const { visible } = event.detail;
        const { toggleSidebar, sidebarOpen } = useUIStore.getState();
        
        if (visible !== undefined) {
          // Set specific state
          if (visible && !sidebarOpen) {
            toggleSidebar();
          } else if (!visible && sidebarOpen) {
            toggleSidebar();
          }
        } else {
          // Toggle current state
          toggleSidebar();
        }
        
        const newState = useUIStore.getState().sidebarOpen;
        toast.success(`Sidebar ${newState ? 'opened' : 'closed'}`);
      } catch (error) {
        console.error('Sidebar toggle error:', error);
        toast.error('Failed to toggle sidebar');
      }
    };
    
    // Bulk Operations Handler
    const handleBulkOperation = async (event: CustomEvent) => {
      try {
        const { operation, section, filter } = event.detail;
        console.log('Bulk operation:', operation, section, filter);
        
        let result;
        switch (section) {
          case 'todos':
            result = await dashboardController.executeCommand('bulk_todo_actions', {
              action: operation,
              filter
            });
            break;
          case 'agenda':
            // Handle bulk agenda operations
            break;
          case 'supplements':
            // Handle bulk supplement operations
            break;
          default:
            throw new Error(`Bulk operations not supported for ${section}`);
        }
        
        if (result?.success) {
          toast.success(result.message);
        } else {
          toast.error(result?.message || 'Bulk operation failed');
        }
      } catch (error) {
        console.error('Bulk operation error:', error);
        toast.error('Failed to perform bulk operation');
      }
    };
    
    // Search Handler
    const handleAISearch = async (event: CustomEvent) => {
      try {
        const { query, sections, filters } = event.detail;
        console.log('AI search:', query, sections, filters);
        
        const result = await dashboardController.executeCommand('search_items', {
          query,
          sections,
          filters
        });
        
        if (result.success) {
          toast.success(result.message);
          
          // Dispatch search results event
          window.dispatchEvent(new CustomEvent('search-results', {
            detail: { query, results: result.data }
          }));
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        console.error('Search error:', error);
        toast.error('Search failed');
      }
    };
    
    // Content Generation Handler
    const handleContentGeneration = async (event: CustomEvent) => {
      try {
        const { type, parameters } = event.detail;
        console.log('Content generation:', type, parameters);
        
        let result;
        switch (type) {
          case 'agenda':
            result = await dashboardController.executeCommand('generate_agenda_suggestions', parameters);
            break;
          case 'todos':
            result = await dashboardController.executeCommand('generate_todo_list', parameters);
            break;
          case 'meal-plan':
            result = await dashboardController.executeCommand('suggest_meal_plan', parameters);
            break;
          default:
            throw new Error(`Content generation not supported for ${type}`);
        }
        
        if (result?.success) {
          toast.success(result.message);
          
          // Dispatch generated content event
          window.dispatchEvent(new CustomEvent('content-generated', {
            detail: { type, parameters, result: result.data }
          }));
        } else {
          toast.error(result?.message || 'Content generation failed');
        }
      } catch (error) {
        console.error('Content generation error:', error);
        toast.error('Failed to generate content');
      }
    };
    
    // Settings Update Handler
    const handleSettingsUpdate = async (event: CustomEvent) => {
      try {
        const { type, settings } = event.detail;
        console.log('Settings update:', type, settings);
        
        let result;
        switch (type) {
          case 'app':
            result = await dashboardController.executeCommand('update_app_settings', settings);
            break;
          case 'ai':
            result = await dashboardController.executeCommand('configure_ai_settings', settings);
            break;
          default:
            throw new Error(`Settings type ${type} not supported`);
        }
        
        if (result?.success) {
          toast.success(result.message);
        } else {
          toast.error(result?.message || 'Settings update failed');
        }
      } catch (error) {
        console.error('Settings update error:', error);
        toast.error('Failed to update settings');
      }
    };
    
    // Data Export Handler
    const handleDataExport = async (event: CustomEvent) => {
      try {
        const { format, sections, dateRange } = event.detail;
        console.log('Data export:', format, sections, dateRange);
        
        const result = await dashboardController.executeCommand('export_data', {
          format,
          sections,
          dateRange
        });
        
        if (result?.success) {
          toast.success(result.message);
        } else {
          toast.error(result?.message || 'Export failed');
        }
      } catch (error) {
        console.error('Export error:', error);
        toast.error('Failed to export data');
      }
    };
    
    // Quick Action Handler
    const handleQuickAction = async (event: CustomEvent) => {
      try {
        const { action, parameters } = event.detail;
        console.log('Quick action:', action, parameters);
        
        const result = await dashboardController.executeCommand('execute_quick_action', {
          identifier: action,
          parameters
        });
        
        if (result?.success) {
          toast.success(result.message);
        } else {
          toast.error(result?.message || 'Quick action failed');
        }
      } catch (error) {
        console.error('Quick action error:', error);
        toast.error('Failed to execute quick action');
      }
    };
    
    // =============================================
    // EXISTING EVENT HANDLERS (PRESERVED)
    // =============================================
    
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
    
    // NEW AI Dashboard Event Listeners
    window.addEventListener('ai-dashboard-command', handleAIDashboardCommand as any);
    window.addEventListener('ai-execute-tool', handleAIToolExecution as any);
    window.addEventListener('ai-navigate', handleAINavigation as any);
    window.addEventListener('toggle-focus-mode', handleFocusModeToggle as any);
    window.addEventListener('open-modal', handleModalOpen as any);
    window.addEventListener('toggle-sidebar', handleSidebarToggle as any);
    window.addEventListener('bulk-operation', handleBulkOperation as any);
    window.addEventListener('ai-search', handleAISearch as any);
    window.addEventListener('generate-content', handleContentGeneration as any);
    window.addEventListener('update-settings', handleSettingsUpdate as any);
    window.addEventListener('export-data', handleDataExport as any);
    window.addEventListener('execute-quick-action', handleQuickAction as any);
    
    // EXISTING Event Listeners (preserved for backwards compatibility)
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
      // Remove NEW AI Dashboard Event Listeners
      window.removeEventListener('ai-dashboard-command', handleAIDashboardCommand as any);
      window.removeEventListener('ai-execute-tool', handleAIToolExecution as any);
      window.removeEventListener('ai-navigate', handleAINavigation as any);
      window.removeEventListener('toggle-focus-mode', handleFocusModeToggle as any);
      window.removeEventListener('open-modal', handleModalOpen as any);
      window.removeEventListener('toggle-sidebar', handleSidebarToggle as any);
      window.removeEventListener('bulk-operation', handleBulkOperation as any);
      window.removeEventListener('ai-search', handleAISearch as any);
      window.removeEventListener('generate-content', handleContentGeneration as any);
      window.removeEventListener('update-settings', handleSettingsUpdate as any);
      window.removeEventListener('export-data', handleDataExport as any);
      window.removeEventListener('execute-quick-action', handleQuickAction as any);
      
      // Remove EXISTING Event Listeners
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