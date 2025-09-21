export interface Contact {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  company?: string;
  avatar?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  deadline: Date;
  estimatedHours?: number;
  actualHours?: number;
  assignedContacts?: string[];
  dependencies?: string[];
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  tags?: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'in-progress' | 'review' | 'completed' | 'on-hold';
  deadline: Date;
  contacts: Contact[];
  tasks: Task[];
  color: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  progress?: number;
  budget?: number;
  tags?: string[];
}

export interface ProductivityMetrics {
  completionRate: number;
  averageTaskTime: number;
  overdueRate: number;
  productivityTrend: 'up' | 'down' | 'stable';
  bottlenecks: string[];
  chartData: any[];
}

export interface EmailStatusUpdate {
  taskId: string;
  projectId: string;
  recipients: string[];
  tone: 'professional_update' | 'casual_update' | 'urgent_update';
  template?: string;
}

export interface ProjectFilters {
  status?: Project['status'][];
  priority?: Project['priority'][];
  searchTerm?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface TaskFilters {
  status?: Task['status'][];
  projectId?: string;
  assignedTo?: string;
  overdue?: boolean;
  dueInDays?: number;
}