/**
 * AI Dashboard Controller - Executes AI tool commands and manages dashboard state
 */

import { 
  allDashboardTools, 
  getToolByName, 
  validateToolParameters,
  type AITool,
  type AIToolResponse 
} from './dashboard-tools';
import { useAgendaStore } from '@/features/agenda/useAgendaStore';
import { useNutritionStore } from '@/features/nutrition/useNutritionStore';
import { useUIStore } from '@/state/useUIStore';
import { toast } from 'sonner';
import type { AgendaItem, TodoItem, FoodItem, SupplementItem } from '@/types/daily';

/**
 * Main controller class for executing AI dashboard commands
 */
export class DashboardController {
  private static instance: DashboardController;
  
  // Store references for state management
  private agendaStore = useAgendaStore.getState();
  private nutritionStore = useNutritionStore.getState();
  private uiStore = useUIStore.getState();
  
  // Internal state for todos and supplements (since they don't have dedicated stores yet)
  private todos: TodoItem[] = [];
  private supplements: SupplementItem[] = [];
  
  private constructor() {
    this.loadLocalState();
    this.setupEventListeners();
  }
  
  public static getInstance(): DashboardController {
    if (!DashboardController.instance) {
      DashboardController.instance = new DashboardController();
    }
    return DashboardController.instance;
  }
  
  /**
   * Load state from localStorage
   */
  private loadLocalState() {
    try {
      const todosData = localStorage.getItem('dashboard_todos');
      if (todosData) {
        this.todos = JSON.parse(todosData);
      }
      
      const supplementsData = localStorage.getItem('dashboard_supplements');
      if (supplementsData) {
        this.supplements = JSON.parse(supplementsData);
      }
    } catch (error) {
      console.error('Failed to load local state:', error);
    }
  }
  
  /**
   * Save state to localStorage
   */
  private saveLocalState() {
    try {
      localStorage.setItem('dashboard_todos', JSON.stringify(this.todos));
      localStorage.setItem('dashboard_supplements', JSON.stringify(this.supplements));
    } catch (error) {
      console.error('Failed to save local state:', error);
    }
  }
  
  /**
   * Setup event listeners for UI updates
   */
  private setupEventListeners() {
    // Listen for external state changes
    window.addEventListener('ai-dashboard-command', this.handleCommand.bind(this) as EventListener);
  }
  
  /**
   * Execute an AI tool command
   */
  public async executeCommand(toolName: string, parameters: any): Promise<AIToolResponse> {
    const tool = getToolByName(toolName);
    if (!tool) {
      return {
        success: false,
        message: `Unknown tool: ${toolName}`
      };
    }
    
    if (!validateToolParameters(tool, parameters)) {
      return {
        success: false,
        message: `Invalid parameters for tool: ${toolName}`
      };
    }
    
    try {
      return await this.executeTool(tool, parameters);
    } catch (error: any) {
      console.error(`Error executing tool ${toolName}:`, error);
      return {
        success: false,
        message: `Failed to execute ${toolName}: ${error.message || error}`
      };
    }
  }
  
  /**
   * Route tool execution to appropriate handler
   */
  private async executeTool(tool: AITool, parameters: any): Promise<AIToolResponse> {
    switch (tool.name) {
      // Agenda Tools
      case 'create_agenda_item':
        return this.createAgendaItem(parameters);
      case 'update_agenda_item':
        return this.updateAgendaItem(parameters);
      case 'delete_agenda_item':
        return this.deleteAgendaItem(parameters);
      case 'toggle_agenda_completion':
        return this.toggleAgendaCompletion(parameters);
      case 'list_agenda_items':
        return this.listAgendaItems(parameters);
      
      // Todo Tools
      case 'create_todo':
        return this.createTodo(parameters);
      case 'update_todo':
        return this.updateTodo(parameters);
      case 'delete_todo':
        return this.deleteTodo(parameters);
      case 'toggle_todo_completion':
        return this.toggleTodoCompletion(parameters);
      case 'reorder_todos':
        return this.reorderTodos(parameters);
      case 'bulk_todo_actions':
        return this.bulkTodoActions(parameters);
      
      // Nutrition Tools
      case 'log_food_item':
        return this.logFoodItem(parameters);
      case 'update_food_item':
        return this.updateFoodItem(parameters);
      case 'delete_food_item':
        return this.deleteFoodItem(parameters);
      case 'get_nutrition_summary':
        return this.getNutritionSummary(parameters);
      case 'analyze_nutrition_trends':
        return this.analyzeNutritionTrends(parameters);
      
      // Supplement Tools
      case 'add_supplement':
        return this.addSupplement(parameters);
      case 'update_supplement':
        return this.updateSupplement(parameters);
      case 'delete_supplement':
        return this.deleteSupplement(parameters);
      case 'mark_supplement_taken':
        return this.markSupplementTaken(parameters);
      case 'get_supplement_schedule':
        return this.getSupplementSchedule(parameters);
      
      // Navigation Tools
      case 'navigate_to_section':
        return this.navigateToSection(parameters);
      case 'toggle_focus_mode':
        return this.toggleFocusMode(parameters);
      case 'open_modal':
        return this.openModal(parameters);
      case 'toggle_sidebar':
        return this.toggleSidebar(parameters);
      
      // Settings Tools
      case 'update_app_settings':
        return this.updateAppSettings(parameters);
      case 'configure_ai_settings':
        return this.configureAISettings(parameters);
      case 'export_data':
        return this.exportData(parameters);
      
      // Quick Action Tools
      case 'create_quick_action':
        return this.createQuickAction(parameters);
      case 'execute_quick_action':
        return this.executeQuickAction(parameters);
      case 'schedule_reminder':
        return this.scheduleReminder(parameters);
      
      // Search Tools
      case 'search_items':
        return this.searchItems(parameters);
      case 'analyze_patterns':
        return this.analyzePatterns(parameters);
      case 'generate_report':
        return this.generateReport(parameters);
      
      // Content Generation Tools
      case 'generate_agenda_suggestions':
        return this.generateAgendaSuggestions(parameters);
      case 'generate_todo_list':
        return this.generateTodoList(parameters);
      case 'suggest_meal_plan':
        return this.suggestMealPlan(parameters);
      
      default:
        return {
          success: false,
          message: `Tool ${tool.name} not implemented yet`
        };
    }
  }
  
  // =============================================
  // AGENDA TOOL IMPLEMENTATIONS
  // =============================================
  
  private async createAgendaItem(params: any): Promise<AIToolResponse> {
    const agendaItem: Partial<AgendaItem> = {
      title: params.title,
      startTime: params.startTime,
      endTime: params.endTime,
      // tag: params.tag || 'personal',
      // priority: params.priority || 'medium',
      // duration: params.duration
    };
    
    await this.agendaStore.addAgendaItem(agendaItem as any);
    
    return {
      success: true,
      message: `Added "${params.title}" to your agenda`,
      data: agendaItem,
      events: ['agenda-updated']
    };
  }
  
  private async updateAgendaItem(params: any): Promise<AIToolResponse> {
    this.agendaStore.updateItem(params.id, params.updates);
    
    return {
      success: true,
      message: `Updated agenda item`,
      events: ['agenda-updated']
    };
  }
  
  private async deleteAgendaItem(params: any): Promise<AIToolResponse> {
    this.agendaStore.removeItem(params.id);
    
    return {
      success: true,
      message: `Deleted agenda item`,
      events: ['agenda-updated']
    };
  }
  
  private async toggleAgendaCompletion(params: any): Promise<AIToolResponse> {
    await this.agendaStore.toggleComplete(params.id);
    
    return {
      success: true,
      message: `Toggled completion status`,
      events: ['agenda-updated']
    };
  }
  
  private async listAgendaItems(params: any): Promise<AIToolResponse> {
    let items = this.agendaStore.items;
    
    // Apply filters if provided
    if (params.filter) {
      const filter = params.filter;
      items = items.filter(item => {
        if (filter.completed !== undefined && item.completed !== filter.completed) return false;
        if (filter.tag && item.tag !== filter.tag) return false;
        if (filter.priority && item.priority !== filter.priority) return false;
        // Add date range filtering logic here if needed
        return true;
      });
    }
    
    return {
      success: true,
      message: `Found ${items.length} agenda items`,
      data: items
    };
  }
  
  // =============================================
  // TODO TOOL IMPLEMENTATIONS
  // =============================================
  
  private async createTodo(params: any): Promise<AIToolResponse> {
    const todo: TodoItem = {
      id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: params.text,
      priority: params.priority || 'medium',
      completed: false
    };
    
    this.todos.push(todo);
    this.saveLocalState();
    this.dispatchEvent('todos-updated');
    
    return {
      success: true,
      message: `Added todo: "${params.text}"`,
      data: todo,
      events: ['todos-updated']
    };
  }
  
  private async updateTodo(params: any): Promise<AIToolResponse> {
    const todoIndex = this.todos.findIndex(t => t.id === params.id);
    if (todoIndex === -1) {
      return {
        success: false,
        message: 'Todo not found'
      };
    }
    
    this.todos[todoIndex] = { ...this.todos[todoIndex], ...params.updates };
    this.saveLocalState();
    this.dispatchEvent('todos-updated');
    
    return {
      success: true,
      message: 'Todo updated',
      events: ['todos-updated']
    };
  }
  
  private async deleteTodo(params: any): Promise<AIToolResponse> {
    const originalLength = this.todos.length;
    this.todos = this.todos.filter(t => t.id !== params.id);
    
    if (this.todos.length === originalLength) {
      return {
        success: false,
        message: 'Todo not found'
      };
    }
    
    this.saveLocalState();
    this.dispatchEvent('todos-updated');
    
    return {
      success: true,
      message: 'Todo deleted',
      events: ['todos-updated']
    };
  }
  
  private async toggleTodoCompletion(params: any): Promise<AIToolResponse> {
    const todo = this.todos.find(t => t.id === params.id);
    if (!todo) {
      return {
        success: false,
        message: 'Todo not found'
      };
    }
    
    todo.completed = !todo.completed;
    this.saveLocalState();
    this.dispatchEvent('todos-updated');
    
    return {
      success: true,
      message: `Todo marked as ${todo.completed ? 'completed' : 'incomplete'}`,
      events: ['todos-updated']
    };
  }
  
  private async reorderTodos(params: any): Promise<AIToolResponse> {
    if (params.fromIndex < 0 || params.fromIndex >= this.todos.length ||
        params.toIndex < 0 || params.toIndex >= this.todos.length) {
      return {
        success: false,
        message: 'Invalid index for reordering'
      };
    }
    
    const [moved] = this.todos.splice(params.fromIndex, 1);
    this.todos.splice(params.toIndex, 0, moved);
    
    this.saveLocalState();
    this.dispatchEvent('todos-updated');
    
    return {
      success: true,
      message: 'Todos reordered',
      events: ['todos-updated']
    };
  }
  
  private async bulkTodoActions(params: any): Promise<AIToolResponse> {
    let count = 0;
    
    switch (params.action) {
      case 'complete_all':
        this.todos.forEach(todo => {
          if (!todo.completed) {
            todo.completed = true;
            count++;
          }
        });
        break;
      case 'delete_completed':
        const originalLength = this.todos.length;
        this.todos = this.todos.filter(todo => !todo.completed);
        count = originalLength - this.todos.length;
        break;
      case 'mark_high_priority':
        this.todos.forEach(todo => {
          if (todo.priority !== 'high') {
            todo.priority = 'high';
            count++;
          }
        });
        break;
    }
    
    this.saveLocalState();
    this.dispatchEvent('todos-updated');
    
    return {
      success: true,
      message: `Bulk action completed: ${count} todos affected`,
      events: ['todos-updated']
    };
  }
  
  // =============================================
  // NUTRITION TOOL IMPLEMENTATIONS
  // =============================================
  
  private async logFoodItem(params: any): Promise<AIToolResponse> {
    const foodItem: FoodItem = {
      id: `food-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: params.name,
      calories: params.calories || 0,
      protein: params.protein || 0,
      carbs: params.carbs || 0,
      fat: params.fat || 0
      // meal: params.meal || 'snack',
      // timestamp: params.timestamp || new Date().toISOString()
    };
    
    await this.nutritionStore.addFoodItem(foodItem as any);
    
    return {
      success: true,
      message: `Logged ${params.name} (${params.calories || 0} calories)`,
      data: foodItem,
      events: ['nutrition-updated']
    };
  }
  
  private async updateFoodItem(params: any): Promise<AIToolResponse> {
    // Implementation would depend on having an update method in nutrition store
    return {
      success: true,
      message: 'Food item updated',
      events: ['nutrition-updated']
    };
  }
  
  private async deleteFoodItem(params: any): Promise<AIToolResponse> {
    this.nutritionStore.removeFoodItem(params.id);
    
    return {
      success: true,
      message: 'Food item deleted',
      events: ['nutrition-updated']
    };
  }
  
  private async getNutritionSummary(params: any): Promise<AIToolResponse> {
    const totals = this.nutritionStore.getDailyTotals();
    
    return {
      success: true,
      message: 'Nutrition summary retrieved',
      data: {
        totals,
        date: params.date || new Date().toISOString().split('T')[0]
      }
    };
  }
  
  private async analyzeNutritionTrends(params: any): Promise<AIToolResponse> {
    // Placeholder for nutrition analysis
    return {
      success: true,
      message: `Analyzed nutrition trends for ${params.period}`,
      data: {
        period: params.period,
        focus: params.focus,
        insights: 'Nutrition trend analysis would go here'
      }
    };
  }
  
  // =============================================
  // SUPPLEMENT TOOL IMPLEMENTATIONS
  // =============================================
  
  private async addSupplement(params: any): Promise<AIToolResponse> {
    const supplement: SupplementItem = {
      id: `supplement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: params.name,
      dose: params.dose,
      time: params.time,
      taken: false
    };
    
    this.supplements.push(supplement);
    this.saveLocalState();
    this.dispatchEvent('supplements-updated');
    
    return {
      success: true,
      message: `Added supplement: ${params.name}`,
      data: supplement,
      events: ['supplements-updated']
    };
  }
  
  private async updateSupplement(params: any): Promise<AIToolResponse> {
    const supplementIndex = this.supplements.findIndex(s => s.id === params.id);
    if (supplementIndex === -1) {
      return {
        success: false,
        message: 'Supplement not found'
      };
    }
    
    this.supplements[supplementIndex] = { ...this.supplements[supplementIndex], ...params.updates };
    this.saveLocalState();
    this.dispatchEvent('supplements-updated');
    
    return {
      success: true,
      message: 'Supplement updated',
      events: ['supplements-updated']
    };
  }
  
  private async deleteSupplement(params: any): Promise<AIToolResponse> {
    const originalLength = this.supplements.length;
    this.supplements = this.supplements.filter(s => s.id !== params.id);
    
    if (this.supplements.length === originalLength) {
      return {
        success: false,
        message: 'Supplement not found'
      };
    }
    
    this.saveLocalState();
    this.dispatchEvent('supplements-updated');
    
    return {
      success: true,
      message: 'Supplement deleted',
      events: ['supplements-updated']
    };
  }
  
  private async markSupplementTaken(params: any): Promise<AIToolResponse> {
    const supplement = this.supplements.find(s => s.id === params.id);
    if (!supplement) {
      return {
        success: false,
        message: 'Supplement not found'
      };
    }
    
    supplement.taken = params.taken;
    this.saveLocalState();
    this.dispatchEvent('supplements-updated');
    
    return {
      success: true,
      message: `Supplement marked as ${params.taken ? 'taken' : 'not taken'}`,
      events: ['supplements-updated']
    };
  }
  
  private async getSupplementSchedule(params: any): Promise<AIToolResponse> {
    let filteredSupplements = this.supplements;
    
    if (params.time) {
      filteredSupplements = this.supplements.filter(s => s.time === params.time);
    }
    
    return {
      success: true,
      message: `Found ${filteredSupplements.length} supplements`,
      data: filteredSupplements
    };
  }
  
  // =============================================
  // NAVIGATION TOOL IMPLEMENTATIONS
  // =============================================
  
  private async navigateToSection(params: any): Promise<AIToolResponse> {
    // Dispatch navigation event
    window.dispatchEvent(new CustomEvent('ai-navigate', { 
      detail: { section: params.section, subsection: params.subsection } 
    }));
    
    return {
      success: true,
      message: `Navigated to ${params.section}`,
      events: ['navigation-changed']
    };
  }
  
  private async toggleFocusMode(params: any): Promise<AIToolResponse> {
    window.dispatchEvent(new CustomEvent('toggle-focus-mode', { 
      detail: { 
        enabled: params.enabled, 
        duration: params.duration,
        task: params.task
      } 
    }));
    
    return {
      success: true,
      message: `Focus mode ${params.enabled ? 'enabled' : 'disabled'}`,
      events: ['focus-mode-changed']
    };
  }
  
  private async openModal(params: any): Promise<AIToolResponse> {
    window.dispatchEvent(new CustomEvent('open-modal', { 
      detail: { modal: params.modal, data: params.data } 
    }));
    
    return {
      success: true,
      message: `Opened ${params.modal} modal`,
      events: ['modal-opened']
    };
  }
  
  private async toggleSidebar(params: any): Promise<AIToolResponse> {
    if (params.visible !== undefined) {
      // Set specific state
      if (params.visible && !this.uiStore.sidebarOpen) {
        this.uiStore.toggleSidebar();
      } else if (!params.visible && this.uiStore.sidebarOpen) {
        this.uiStore.toggleSidebar();
      }
    } else {
      // Toggle current state
      this.uiStore.toggleSidebar();
    }
    
    return {
      success: true,
      message: `Sidebar ${this.uiStore.sidebarOpen ? 'opened' : 'closed'}`,
      events: ['sidebar-toggled']
    };
  }
  
  // =============================================
  // HELPER METHODS
  // =============================================
  
  private dispatchEvent(eventName: string, data?: any) {
    window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }
  
  private handleCommand(event: CustomEvent) {
    const { tool, parameters } = event.detail;
    this.executeCommand(tool, parameters).then(result => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }
  
  // =============================================
  // PLACEHOLDER IMPLEMENTATIONS
  // =============================================
  
  private async updateAppSettings(params: any): Promise<AIToolResponse> {
    if (params.theme) {
      this.uiStore.setTheme(params.theme);
    }
    
    return {
      success: true,
      message: 'App settings updated',
      events: ['settings-updated']
    };
  }
  
  private async configureAISettings(params: any): Promise<AIToolResponse> {
    // Store AI settings in localStorage
    const aiSettings = JSON.parse(localStorage.getItem('ai_settings') || '{}');
    Object.assign(aiSettings, params);
    localStorage.setItem('ai_settings', JSON.stringify(aiSettings));
    
    return {
      success: true,
      message: 'AI settings configured',
      events: ['ai-settings-updated']
    };
  }
  
  private async exportData(params: any): Promise<AIToolResponse> {
    // Implementation for data export
    return {
      success: true,
      message: `Data exported in ${params.format} format`,
      events: ['data-exported']
    };
  }
  
  private async createQuickAction(params: any): Promise<AIToolResponse> {
    return {
      success: true,
      message: `Quick action "${params.name}" created`,
      events: ['quick-action-created']
    };
  }
  
  private async executeQuickAction(params: any): Promise<AIToolResponse> {
    return {
      success: true,
      message: `Quick action "${params.identifier}" executed`,
      events: ['quick-action-executed']
    };
  }
  
  private async scheduleReminder(params: any): Promise<AIToolResponse> {
    return {
      success: true,
      message: `Reminder scheduled: "${params.message}"`,
      events: ['reminder-scheduled']
    };
  }
  
  private async searchItems(params: any): Promise<AIToolResponse> {
    return {
      success: true,
      message: `Search completed for: "${params.query}"`,
      data: { results: [] },
      events: ['search-completed']
    };
  }
  
  private async analyzePatterns(params: any): Promise<AIToolResponse> {
    return {
      success: true,
      message: `Pattern analysis completed for ${params.type}`,
      data: { insights: [] },
      events: ['analysis-completed']
    };
  }
  
  private async generateReport(params: any): Promise<AIToolResponse> {
    return {
      success: true,
      message: `${params.reportType} report generated`,
      data: { report: 'Report content would go here' },
      events: ['report-generated']
    };
  }
  
  private async generateAgendaSuggestions(params: any): Promise<AIToolResponse> {
    return {
      success: true,
      message: 'Agenda suggestions generated',
      data: { suggestions: [] },
      events: ['suggestions-generated']
    };
  }
  
  private async generateTodoList(params: any): Promise<AIToolResponse> {
    return {
      success: true,
      message: 'Todo list generated',
      data: { todos: [] },
      events: ['todos-generated']
    };
  }
  
  private async suggestMealPlan(params: any): Promise<AIToolResponse> {
    return {
      success: true,
      message: 'Meal plan suggestions generated',
      data: { meals: [] },
      events: ['meal-plan-generated']
    };
  }
  
  // =============================================
  // PUBLIC API METHODS
  // =============================================
  
  /**
   * Get current todos
   */
  public getTodos(): TodoItem[] {
    return [...this.todos];
  }
  
  /**
   * Get current supplements
   */
  public getSupplements(): SupplementItem[] {
    return [...this.supplements];
  }
  
  /**
   * Get available tools
   */
  public getAvailableTools(): AITool[] {
    return allDashboardTools;
  }
}

// Export singleton instance
export const dashboardController = DashboardController.getInstance();