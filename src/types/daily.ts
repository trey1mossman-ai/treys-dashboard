// Per-day data model types
export interface AgendaItem {
  id: string;
  title: string;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  completed: boolean;
}

export interface TodoItem {
  id: string;
  text: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
}

export interface FoodItem {
  id: string;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface SupplementItem {
  id: string;
  name: string;
  dose?: string;
  time: 'AM' | 'Pre' | 'Post' | 'PM';
  taken: boolean;
}

export interface DayData {
  date: string; // YYYY-MM-DD format
  agenda: AgendaItem[];
  todos: TodoItem[];
  food: FoodItem[];
  supplements: SupplementItem[];
}

// AI webhook contracts
export interface AIRequest {
  section: 'agenda' | 'todos' | 'food' | 'supplements';
  date: string;
  context?: Record<string, any>;
}

export interface AIAgendaResponse {
  items: Array<{
    title: string;
    start: string;
    end: string;
  }>;
}

export interface AITodoResponse {
  items: Array<{
    text: string;
    priority?: 1 | 2 | 3;
  }>;
}

export interface AIFoodResponse {
  items: Array<{
    name: string;
    cals?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }>;
}

export interface AISupplementResponse {
  items: Array<{
    name: string;
    dose?: string;
    time?: 'AM' | 'Pre' | 'Post' | 'PM';
  }>;
}