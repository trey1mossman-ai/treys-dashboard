/**
 * Project Management Type Definitions
 * Central type system for project and task management
 */

export interface Contact {
  id: string;
  name: string;
  email: string;
  role?: string;
  company?: string;
  avatar?: string;
  phone?: string;
  isPrimary?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'in-progress' | 'review' | 'completed' | 'on-hold';
  deadline: Date | string;
  startDate?: Date | string;
  contacts: Contact[];
  tasks?: Task[];
  color: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  budget?: number;
  spent?: number;
  progress?: number; // 0-100
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt?: Date | string;
  notes?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed' | 'blocked';
  deadline: Date | string;
  startDate?: Date | string;
  estimatedHours?: number;
  actualHours?: number;
  assignedContacts?: string[]; // Contact IDs
  dependencies?: string[]; // Task IDs this task depends on
  blockedBy?: string[]; // Task IDs blocking this task
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt?: Date | string;
  completedBy?: string;
  attachments?: Attachment[];
  comments?: Comment[];
  subtasks?: Subtask[];
  // AI-enhanced fields
  smartPriority?: number; // Calculated by AI
  riskScore?: number; // 0-100
  confidenceScore?: number; // 0-100 for time estimates
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Date | string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date | string;
  uploadedBy: string;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: Date | string;
  mentions?: string[];
}

export interface ProductivityMetrics {
  completionRate: number;
  averageTaskTime: number;
  overdueRate: number;
  productivityTrend: 'improving' | 'stable' | 'declining';
  tasksCompleted: number;
  tasksOverdue: number;
  tasksPending: number;
  projectsActive: number;
  projectsCompleted: number;
  timeSpentToday: number;
  timeSpentWeek: number;
  timeSpentMonth: number;
  bottlenecks: Bottleneck[];
  recommendations: string[];
}

export interface Bottleneck {
  type: 'task' | 'project' | 'resource';
  id: string;
  name: string;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface ProductivityInsights {
  summary: string;
  strengths: string[];
  improvements: string[];
  predictions: Prediction[];
  aiRecommendations: string;
}

export interface Prediction {
  type: 'deadline' | 'workload' | 'risk';
  message: string;
  confidence: number;
  suggestedAction?: string;
}

export interface EmailStatusUpdate {
  task: Task;
  project: Project;
  recipients: string[];
  subject?: string;
  message?: string;
  tone: 'formal' | 'casual' | 'professional_update' | 'celebration';
  includeNextSteps?: boolean;
  includeProjectStatus?: boolean;
  sendCopy?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  allDay?: boolean;
  resource?: {
    type: 'task' | 'project' | 'meeting';
    id: string;
    data: Task | Project;
  };
  color?: string;
  editable?: boolean;
  draggable?: boolean;
}

// Sorting and filtering types
export type TaskSortField = 'deadline' | 'priority' | 'created' | 'status' | 'smartPriority';
export type ProjectSortField = 'deadline' | 'priority' | 'created' | 'status' | 'progress';
export type SortDirection = 'asc' | 'desc';

export interface TaskFilter {
  status?: Task['status'][];
  projectId?: string[];
  assignedTo?: string[];
  priority?: Task['priority'][];
  deadlineRange?: { start: Date; end: Date };
  tags?: string[];
  search?: string;
}

export interface ProjectFilter {
  status?: Project['status'][];
  priority?: Project['priority'][];
  deadlineRange?: { start: Date; end: Date };
  contacts?: string[];
  tags?: string[];
  search?: string;
}
