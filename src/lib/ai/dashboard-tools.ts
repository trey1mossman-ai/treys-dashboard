/**
 * AI Dashboard Tools - Comprehensive tool definitions for AI-controlled dashboard operations
 */

import type { AgendaItem, TodoItem, FoodItem, SupplementItem } from '@/types/daily';

// Tool categories for the AI dashboard control system
export interface AITool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// Base response interface for all AI tool executions
export interface AIToolResponse {
  success: boolean;
  message: string;
  data?: any;
  events?: string[];
}

// =============================================
// AGENDA MANAGEMENT TOOLS
// =============================================

export const agendaTools: AITool[] = [
  {
    name: 'create_agenda_item',
    description: 'Create a new agenda item with specific time slots and details',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The agenda item title' },
        startTime: { type: 'string', description: 'Start time in ISO format or HH:MM' },
        endTime: { type: 'string', description: 'End time in ISO format or HH:MM' },
        tag: { type: 'string', description: 'Category tag (meeting, personal, work, health, etc.)' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Priority level' },
        duration: { type: 'number', description: 'Duration in minutes (optional)' },
        notes: { type: 'string', description: 'Additional notes (optional)' }
      },
      required: ['title', 'startTime']
    }
  },
  {
    name: 'update_agenda_item',
    description: 'Update an existing agenda item by ID',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The agenda item ID' },
        updates: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            startTime: { type: 'string' },
            endTime: { type: 'string' },
            tag: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            duration: { type: 'number' },
            notes: { type: 'string' },
            completed: { type: 'boolean' }
          }
        }
      },
      required: ['id', 'updates']
    }
  },
  {
    name: 'delete_agenda_item',
    description: 'Delete an agenda item by ID',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The agenda item ID to delete' }
      },
      required: ['id']
    }
  },
  {
    name: 'toggle_agenda_completion',
    description: 'Toggle the completion status of an agenda item',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The agenda item ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'list_agenda_items',
    description: 'List all agenda items with optional filtering',
    parameters: {
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          properties: {
            completed: { type: 'boolean' },
            tag: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            dateRange: {
              type: 'object',
              properties: {
                start: { type: 'string' },
                end: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
];

// =============================================
// TODO MANAGEMENT TOOLS
// =============================================

export const todoTools: AITool[] = [
  {
    name: 'create_todo',
    description: 'Create a new todo item with priority',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The todo text/description' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Priority level' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags for categorization' }
      },
      required: ['text']
    }
  },
  {
    name: 'update_todo',
    description: 'Update an existing todo item',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The todo item ID' },
        updates: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            completed: { type: 'boolean' },
            tags: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      required: ['id', 'updates']
    }
  },
  {
    name: 'delete_todo',
    description: 'Delete a todo item by ID',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The todo item ID to delete' }
      },
      required: ['id']
    }
  },
  {
    name: 'toggle_todo_completion',
    description: 'Toggle the completion status of a todo item',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The todo item ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'reorder_todos',
    description: 'Reorder todo items by priority or custom order',
    parameters: {
      type: 'object',
      properties: {
        fromIndex: { type: 'number', description: 'Current position index' },
        toIndex: { type: 'number', description: 'New position index' },
        sortBy: { type: 'string', enum: ['priority', 'alphabetical', 'created', 'custom'], description: 'Sort method' }
      }
    }
  },
  {
    name: 'bulk_todo_actions',
    description: 'Perform bulk operations on multiple todos',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['complete_all', 'delete_completed', 'mark_high_priority'], description: 'Bulk action to perform' },
        filter: {
          type: 'object',
          properties: {
            completed: { type: 'boolean' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            tags: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      required: ['action']
    }
  }
];

// =============================================
// NUTRITION & FOOD TRACKING TOOLS
// =============================================

export const nutritionTools: AITool[] = [
  {
    name: 'log_food_item',
    description: 'Log a food item with detailed nutritional information',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Food item name' },
        calories: { type: 'number', description: 'Calories per serving' },
        protein: { type: 'number', description: 'Protein in grams' },
        carbs: { type: 'number', description: 'Carbohydrates in grams' },
        fat: { type: 'number', description: 'Fat in grams' },
        meal: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'], description: 'Meal category' },
        serving: { type: 'string', description: 'Serving size description' },
        timestamp: { type: 'string', description: 'When the food was consumed (ISO format)' }
      },
      required: ['name']
    }
  },
  {
    name: 'update_food_item',
    description: 'Update nutritional information for a logged food item',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Food item ID' },
        updates: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            calories: { type: 'number' },
            protein: { type: 'number' },
            carbs: { type: 'number' },
            fat: { type: 'number' },
            meal: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
            serving: { type: 'string' }
          }
        }
      },
      required: ['id', 'updates']
    }
  },
  {
    name: 'delete_food_item',
    description: 'Remove a food item from the log',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Food item ID to delete' }
      },
      required: ['id']
    }
  },
  {
    name: 'get_nutrition_summary',
    description: 'Get daily nutrition totals and analysis',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date for summary (YYYY-MM-DD format, defaults to today)' },
        includeGoals: { type: 'boolean', description: 'Include progress towards nutrition goals' }
      }
    }
  },
  {
    name: 'analyze_nutrition_trends',
    description: 'Analyze nutrition patterns over time',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['week', 'month', 'quarter'], description: 'Analysis period' },
        focus: { type: 'string', enum: ['calories', 'protein', 'macros', 'meals'], description: 'What to analyze' }
      }
    }
  }
];

// =============================================
// SUPPLEMENT MANAGEMENT TOOLS
// =============================================

export const supplementTools: AITool[] = [
  {
    name: 'add_supplement',
    description: 'Add a new supplement to the daily routine',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Supplement name' },
        dose: { type: 'string', description: 'Dosage amount and unit (e.g., "500mg", "1 tablet")' },
        time: { type: 'string', enum: ['AM', 'Pre', 'Post', 'PM'], description: 'When to take the supplement' },
        instructions: { type: 'string', description: 'Special instructions (optional)' },
        recurring: { type: 'boolean', description: 'If this is a daily recurring supplement' }
      },
      required: ['name', 'time']
    }
  },
  {
    name: 'update_supplement',
    description: 'Update supplement details',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Supplement ID' },
        updates: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            dose: { type: 'string' },
            time: { type: 'string', enum: ['AM', 'Pre', 'Post', 'PM'] },
            instructions: { type: 'string' },
            taken: { type: 'boolean' }
          }
        }
      },
      required: ['id', 'updates']
    }
  },
  {
    name: 'delete_supplement',
    description: 'Remove a supplement from the routine',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Supplement ID to delete' }
      },
      required: ['id']
    }
  },
  {
    name: 'mark_supplement_taken',
    description: 'Mark a supplement as taken or not taken',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Supplement ID' },
        taken: { type: 'boolean', description: 'Whether the supplement was taken' },
        timestamp: { type: 'string', description: 'When it was taken (optional)' }
      },
      required: ['id', 'taken']
    }
  },
  {
    name: 'get_supplement_schedule',
    description: 'Get supplement schedule for a specific time or day',
    parameters: {
      type: 'object',
      properties: {
        time: { type: 'string', enum: ['AM', 'Pre', 'Post', 'PM'], description: 'Specific time slot' },
        date: { type: 'string', description: 'Date for schedule (defaults to today)' }
      }
    }
  }
];

// =============================================
// NAVIGATION & UI CONTROL TOOLS
// =============================================

export const navigationTools: AITool[] = [
  {
    name: 'navigate_to_section',
    description: 'Navigate to a specific section of the dashboard',
    parameters: {
      type: 'object',
      properties: {
        section: { 
          type: 'string', 
          enum: ['dashboard', 'agenda', 'todos', 'food', 'supplements', 'settings', 'workflows', 'fitness'],
          description: 'Section to navigate to'
        },
        subsection: { type: 'string', description: 'Specific subsection if applicable' }
      },
      required: ['section']
    }
  },
  {
    name: 'toggle_focus_mode',
    description: 'Enable or disable focus mode for distraction-free work',
    parameters: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'Whether to enable or disable focus mode' },
        duration: { type: 'number', description: 'Focus session duration in minutes (optional)' },
        task: { type: 'string', description: 'Specific task to focus on (optional)' }
      },
      required: ['enabled']
    }
  },
  {
    name: 'open_modal',
    description: 'Open a specific modal or dialog',
    parameters: {
      type: 'object',
      properties: {
        modal: { 
          type: 'string', 
          enum: ['settings', 'ai-generate', 'quick-action', 'agenda-editor', 'food-logger'],
          description: 'Modal to open'
        },
        data: { type: 'object', description: 'Data to pass to the modal (optional)' }
      },
      required: ['modal']
    }
  },
  {
    name: 'toggle_sidebar',
    description: 'Show or hide the sidebar',
    parameters: {
      type: 'object',
      properties: {
        visible: { type: 'boolean', description: 'Whether sidebar should be visible' }
      }
    }
  }
];

// =============================================
// SETTINGS & CONFIGURATION TOOLS
// =============================================

export const settingsTools: AITool[] = [
  {
    name: 'update_app_settings',
    description: 'Update application settings and preferences',
    parameters: {
      type: 'object',
      properties: {
        theme: { type: 'string', enum: ['light', 'dark', 'auto'], description: 'UI theme preference' },
        notifications: { type: 'boolean', description: 'Enable/disable notifications' },
        autoSave: { type: 'boolean', description: 'Enable/disable auto-save' },
        defaultView: { type: 'string', enum: ['dashboard', 'agenda', 'todos'], description: 'Default landing view' }
      }
    }
  },
  {
    name: 'configure_ai_settings',
    description: 'Configure AI behavior and preferences',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['openai', 'claude'], description: 'AI provider' },
        model: { type: 'string', description: 'Specific model to use' },
        temperature: { type: 'number', minimum: 0, maximum: 1, description: 'AI creativity level' },
        maxTokens: { type: 'number', description: 'Maximum response length' }
      }
    }
  },
  {
    name: 'export_data',
    description: 'Export user data in various formats',
    parameters: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['json', 'csv', 'pdf'], description: 'Export format' },
        sections: { 
          type: 'array', 
          items: { type: 'string', enum: ['agenda', 'todos', 'food', 'supplements'] },
          description: 'Which sections to export'
        },
        dateRange: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' }
          }
        }
      },
      required: ['format']
    }
  }
];

// =============================================
// QUICK ACTIONS & AUTOMATION TOOLS
// =============================================

export const quickActionTools: AITool[] = [
  {
    name: 'create_quick_action',
    description: 'Create a new quick action for automation',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Action name' },
        description: { type: 'string', description: 'What the action does' },
        trigger: { type: 'string', enum: ['manual', 'scheduled', 'event'], description: 'How the action is triggered' },
        actions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              data: { type: 'object' }
            }
          },
          description: 'List of actions to perform'
        }
      },
      required: ['name', 'actions']
    }
  },
  {
    name: 'execute_quick_action',
    description: 'Execute an existing quick action by name or ID',
    parameters: {
      type: 'object',
      properties: {
        identifier: { type: 'string', description: 'Quick action name or ID' },
        parameters: { type: 'object', description: 'Parameters to pass to the action' }
      },
      required: ['identifier']
    }
  },
  {
    name: 'schedule_reminder',
    description: 'Schedule a reminder or notification',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Reminder message' },
        time: { type: 'string', description: 'When to show the reminder (ISO format)' },
        type: { type: 'string', enum: ['notification', 'popup', 'email'], description: 'Reminder type' },
        recurring: { type: 'boolean', description: 'If this is a recurring reminder' },
        interval: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'Recurrence interval' }
      },
      required: ['message', 'time']
    }
  }
];

// =============================================
// SEARCH & ANALYSIS TOOLS
// =============================================

export const searchTools: AITool[] = [
  {
    name: 'search_items',
    description: 'Search across all dashboard items with filters',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        sections: {
          type: 'array',
          items: { type: 'string', enum: ['agenda', 'todos', 'food', 'supplements'] },
          description: 'Which sections to search in'
        },
        filters: {
          type: 'object',
          properties: {
            completed: { type: 'boolean' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            dateRange: {
              type: 'object',
              properties: {
                start: { type: 'string' },
                end: { type: 'string' }
              }
            }
          }
        }
      },
      required: ['query']
    }
  },
  {
    name: 'analyze_patterns',
    description: 'Analyze patterns and provide insights',
    parameters: {
      type: 'object',
      properties: {
        type: { 
          type: 'string', 
          enum: ['productivity', 'nutrition', 'habits', 'time_usage'],
          description: 'Type of analysis to perform'
        },
        period: { type: 'string', enum: ['day', 'week', 'month'], description: 'Analysis time period' },
        includeRecommendations: { type: 'boolean', description: 'Include AI recommendations' }
      },
      required: ['type']
    }
  },
  {
    name: 'generate_report',
    description: 'Generate a comprehensive report on dashboard data',
    parameters: {
      type: 'object',
      properties: {
        reportType: { 
          type: 'string', 
          enum: ['daily_summary', 'weekly_review', 'monthly_insights', 'custom'],
          description: 'Type of report to generate'
        },
        sections: {
          type: 'array',
          items: { type: 'string', enum: ['agenda', 'todos', 'food', 'supplements', 'patterns'] },
          description: 'Sections to include in report'
        },
        format: { type: 'string', enum: ['text', 'json', 'html'], description: 'Report format' }
      },
      required: ['reportType']
    }
  }
];

// =============================================
// CONTENT GENERATION TOOLS
// =============================================

export const contentTools: AITool[] = [
  {
    name: 'generate_agenda_suggestions',
    description: 'Generate smart agenda suggestions based on patterns and context',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date to generate suggestions for' },
        timeSlots: {
          type: 'array',
          items: { type: 'string' },
          description: 'Available time slots to consider'
        },
        priorities: {
          type: 'array',
          items: { type: 'string' },
          description: 'Priority areas to focus on'
        },
        includeBreaks: { type: 'boolean', description: 'Whether to include break suggestions' }
      }
    }
  },
  {
    name: 'generate_todo_list',
    description: 'Generate a smart todo list based on goals and patterns',
    parameters: {
      type: 'object',
      properties: {
        context: { type: 'string', description: 'Context or theme for the todo list' },
        priority: { type: 'string', enum: ['work', 'personal', 'health', 'mixed'], description: 'Focus area' },
        maxItems: { type: 'number', description: 'Maximum number of items to generate' },
        timeFrame: { type: 'string', enum: ['today', 'week', 'month'], description: 'Time frame for completion' }
      }
    }
  },
  {
    name: 'suggest_meal_plan',
    description: 'Generate meal suggestions based on nutrition goals and preferences',
    parameters: {
      type: 'object',
      properties: {
        goals: {
          type: 'object',
          properties: {
            calories: { type: 'number' },
            protein: { type: 'number' },
            carbs: { type: 'number' },
            fat: { type: 'number' }
          }
        },
        preferences: {
          type: 'array',
          items: { type: 'string' },
          description: 'Dietary preferences or restrictions'
        },
        meals: {
          type: 'array',
          items: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          description: 'Which meals to plan'
        }
      }
    }
  }
];

// =============================================
// COMBINED TOOL REGISTRY
// =============================================

export const allDashboardTools: AITool[] = [
  ...agendaTools,
  ...todoTools,
  ...nutritionTools,
  ...supplementTools,
  ...navigationTools,
  ...settingsTools,
  ...quickActionTools,
  ...searchTools,
  ...contentTools
];

// Tool categories for easy access
export const toolCategories = {
  agenda: agendaTools,
  todos: todoTools,
  nutrition: nutritionTools,
  supplements: supplementTools,
  navigation: navigationTools,
  settings: settingsTools,
  quickActions: quickActionTools,
  search: searchTools,
  content: contentTools
} as const;

// Helper function to get tool by name
export function getToolByName(name: string): AITool | undefined {
  return allDashboardTools.find(tool => tool.name === name);
}

// Helper function to get tools by category
export function getToolsByCategory(category: keyof typeof toolCategories): AITool[] {
  return toolCategories[category] || [];
}

// Helper function to validate tool parameters
export function validateToolParameters(tool: AITool, parameters: any): boolean {
  if (!tool.parameters.required) return true;
  
  return tool.parameters.required.every(param => 
    parameters.hasOwnProperty(param) && parameters[param] !== undefined
  );
}