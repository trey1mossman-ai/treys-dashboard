/**
 * Zustand Store for Project Management
 * Handles all project and task state with persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { differenceInDays, addDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import type { 
  Project, 
  Task, 
  Contact, 
  TaskFilter,
  ProjectFilter,
  ProductivityMetrics,
  ProductivityInsights,
  TaskSortField,
  SortDirection 
} from '@/types/projects.types';

interface ProjectStore {
  // State
  projects: Project[];
  tasks: Task[];
  contacts: Contact[];
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  
  // Project Actions
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  getProject: (id: string) => Project | undefined;
  
  // Task Actions
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  moveTask: (taskId: string, newStatus: Task['status']) => Promise<void>;
  getTask: (id: string) => Task | undefined;
  
  // Contact Actions
  addContact: (contact: Omit<Contact, 'id'>) => Contact;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  
  // Query Methods
  getTasksByProject: (projectId: string) => Task[];
  getTasksByStatus: (status: Task['status']) => Task[];
  getUpcomingTasks: (days?: number) => Task[];
  getOverdueTasks: () => Task[];
  getTodaysTasks: () => Task[];
  getTasksThisWeek: () => Task[];
  getBlockedTasks: () => Task[];
  getTaskDependencies: (taskId: string) => Task[];
  
  // Smart Features
  getSmartTaskList: () => Task[];
  calculateTaskPriority: (taskId: string) => number;
  suggestNextTasks: () => Promise<Task[]>;
  analyzeProductivity: () => Promise<ProductivityMetrics>;
  getProductivityInsights: () => Promise<ProductivityInsights>;
  
  // Filtering and Sorting
  filterTasks: (filter: TaskFilter) => Task[];
  filterProjects: (filter: ProjectFilter) => Project[];
  sortTasks: (tasks: Task[], field: TaskSortField, direction?: SortDirection) => Task[];
  
  // Bulk Operations
  bulkUpdateTasks: (taskIds: string[], updates: Partial<Task>) => Promise<void>;
  bulkDeleteTasks: (taskIds: string[]) => Promise<void>;
  archiveCompletedTasks: () => Promise<void>;
  
  // Statistics
  getProjectStats: (projectId: string) => {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    progress: number;
    estimatedHours: number;
    actualHours: number;
  };
  
  getOverallStats: () => {
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    completionRate: number;
  };
  
  // Utility
  clearAll: () => void;
  exportData: () => { projects: Project[]; tasks: Task[]; contacts: Contact[] };
  importData: (data: { projects?: Project[]; tasks?: Task[]; contacts?: Contact[] }) => void;
}

// Helper function to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function to sync with backend
const syncToBackend = async (action: string, data: any) => {
  try {
    // Send to WebSocket for real-time sync
    const ws = (window as any).wsService;
    if (ws?.isConnected()) {
      ws.send({
        type: `project.${action}`,
        data,
        timestamp: new Date().toISOString()
      });
    }
    
    // Also persist to API
    const apiUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:8788' 
      : 'https://ailifeassistanttm.com';
      
    await fetch(`${apiUrl}/api/projects/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.error(`Failed to sync ${action}:`, error);
  }
};

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      // Initial state
      projects: [],
      tasks: [],
      contacts: [],
      selectedProjectId: null,
      selectedTaskId: null,
      
      // Project Actions
      createProject: async (projectData) => {
        const newProject: Project = {
          ...projectData,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          progress: 0,
          tasks: []
        };
        
        set(state => ({
          projects: [...state.projects, newProject]
        }));
        
        await syncToBackend('create', newProject);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('project-created', {
          detail: newProject
        }));
        
        return newProject;
      },
      
      updateProject: async (id, updates) => {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          )
        }));
        
        await syncToBackend('update', { id, updates });
      },
      
      deleteProject: async (id) => {
        // Delete all tasks associated with the project
        const tasksToDelete = get().tasks.filter(t => t.projectId === id);
        
        set(state => ({
          projects: state.projects.filter(p => p.id !== id),
          tasks: state.tasks.filter(t => t.projectId !== id)
        }));
        
        await syncToBackend('delete', { id, deletedTasks: tasksToDelete.map(t => t.id) });
      },
      
      getProject: (id) => get().projects.find(p => p.id === id),
      
      // Task Actions
      createTask: async (taskData) => {
        const newTask: Task = {
          ...taskData,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: taskData.status || 'todo'
        };
        
        set(state => ({
          tasks: [...state.tasks, newTask]
        }));
        
        // Update project progress
        const project = get().getProject(newTask.projectId);
        if (project) {
          const projectTasks = [...get().getTasksByProject(project.id), newTask];
          const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
          const progress = Math.round((completedTasks / projectTasks.length) * 100);
          
          await get().updateProject(project.id, { progress });
        }
        
        await syncToBackend('task.create', newTask);
        
        return newTask;
      },
      
      updateTask: async (id, updates) => {
        const oldTask = get().getTask(id);
        
        set(state => ({
          tasks: state.tasks.map(t =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          )
        }));
        
        // Update project progress if status changed
        if (oldTask && updates.status && oldTask.status !== updates.status) {
          const project = get().getProject(oldTask.projectId);
          if (project) {
            const projectTasks = get().getTasksByProject(project.id);
            const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
            const progress = Math.round((completedTasks / projectTasks.length) * 100);
            
            await get().updateProject(project.id, { progress });
          }
        }
        
        await syncToBackend('task.update', { id, updates });
      },
      
      deleteTask: async (id) => {
        const task = get().getTask(id);
        
        set(state => ({
          tasks: state.tasks.filter(t => t.id !== id)
        }));
        
        // Update project progress
        if (task) {
          const project = get().getProject(task.projectId);
          if (project) {
            const projectTasks = get().getTasksByProject(project.id);
            if (projectTasks.length > 0) {
              const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
              const progress = Math.round((completedTasks / projectTasks.length) * 100);
              await get().updateProject(project.id, { progress });
            } else {
              await get().updateProject(project.id, { progress: 0 });
            }
          }
        }
        
        await syncToBackend('task.delete', { id });
      },
      
      completeTask: async (id) => {
        const task = get().getTask(id);
        if (!task) return;
        
        await get().updateTask(id, {
          status: 'completed',
          completedAt: new Date().toISOString(),
          actualHours: task.actualHours || task.estimatedHours
        });
        
        // Trigger completion event for email modal
        const project = get().getProject(task.projectId);
        window.dispatchEvent(new CustomEvent('task-completed', {
          detail: { task, project }
        }));
      },
      
      moveTask: async (taskId, newStatus) => {
        await get().updateTask(taskId, { status: newStatus });
      },
      
      getTask: (id) => get().tasks.find(t => t.id === id),
      
      // Contact Actions
      addContact: (contactData) => {
        const newContact: Contact = {
          ...contactData,
          id: generateId()
        };
        
        set(state => ({
          contacts: [...state.contacts, newContact]
        }));
        
        return newContact;
      },
      
      updateContact: (id, updates) => {
        set(state => ({
          contacts: state.contacts.map(c =>
            c.id === id ? { ...c, ...updates } : c
          )
        }));
      },
      
      deleteContact: (id) => {
        set(state => ({
          contacts: state.contacts.filter(c => c.id !== id)
        }));
      },
      
      // Query Methods
      getTasksByProject: (projectId) => {
        return get().tasks.filter(t => t.projectId === projectId);
      },
      
      getTasksByStatus: (status) => {
        return get().tasks.filter(t => t.status === status);
      },
      
      getUpcomingTasks: (days = 7) => {
        const now = new Date();
        const future = addDays(now, days);
        
        return get().tasks
          .filter(task => {
            if (task.status === 'completed') return false;
            const deadline = new Date(task.deadline);
            return isAfter(deadline, now) && isBefore(deadline, future);
          })
          .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      },
      
      getOverdueTasks: () => {
        const now = new Date();
        
        return get().tasks
          .filter(task => {
            if (task.status === 'completed') return false;
            const deadline = new Date(task.deadline);
            return isBefore(deadline, now);
          })
          .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());
      },
      
      getTodaysTasks: () => {
        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);
        
        return get().tasks
          .filter(task => {
            const deadline = new Date(task.deadline);
            return isAfter(deadline, todayStart) && isBefore(deadline, todayEnd);
          })
          .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      },
      
      getTasksThisWeek: () => {
        return get().getUpcomingTasks(7);
      },
      
      getBlockedTasks: () => {
        return get().tasks.filter(t => t.status === 'blocked' || t.blockedBy?.length > 0);
      },
      
      getTaskDependencies: (taskId) => {
        const task = get().getTask(taskId);
        if (!task?.dependencies) return [];
        
        return get().tasks.filter(t => task.dependencies.includes(t.id));
      },
      
      // Smart Features
      getSmartTaskList: () => {
        const tasks = get().tasks.filter(t => t.status !== 'completed');
        const projects = get().projects;
        
        // Calculate smart priority for each task
        const tasksWithPriority = tasks.map(task => {
          const project = projects.find(p => p.id === task.projectId);
          const priority = get().calculateTaskPriority(task.id);
          
          return {
            ...task,
            smartPriority: priority
          };
        });
        
        // Sort by smart priority and return top 10
        return tasksWithPriority
          .sort((a, b) => (b.smartPriority || 0) - (a.smartPriority || 0))
          .slice(0, 10);
      },
      
      calculateTaskPriority: (taskId) => {
        const task = get().getTask(taskId);
        if (!task) return 0;
        
        const project = get().getProject(task.projectId);
        if (!project) return 0;
        
        let score = 0;
        
        // Deadline urgency (0-40 points)
        const daysUntilDeadline = differenceInDays(new Date(task.deadline), new Date());
        if (daysUntilDeadline <= 0) score += 50; // Overdue
        else if (daysUntilDeadline <= 1) score += 40;
        else if (daysUntilDeadline <= 3) score += 30;
        else if (daysUntilDeadline <= 7) score += 20;
        else if (daysUntilDeadline <= 14) score += 10;
        
        // Project priority (0-30 points)
        const projectPriorityMap = { 
          critical: 30, 
          high: 20, 
          medium: 10, 
          low: 5 
        };
        score += projectPriorityMap[project.priority] || 0;
        
        // Task priority (0-20 points)
        const taskPriorityMap = { 
          critical: 20, 
          high: 15, 
          medium: 10, 
          low: 5 
        };
        score += taskPriorityMap[task.priority || 'medium'] || 0;
        
        // Dependencies (0-10 points)
        const blockedTasks = get().tasks.filter(t => 
          t.dependencies?.includes(task.id) && t.status !== 'completed'
        );
        score += Math.min(blockedTasks.length * 2, 10);
        
        return score;
      },
      
      suggestNextTasks: async () => {
        // This would typically call an AI service
        // For now, return smart task list
        return get().getSmartTaskList();
      },
      
      analyzeProductivity: async () => {
        const tasks = get().tasks;
        const projects = get().projects;
        const now = new Date();
        const thirtyDaysAgo = addDays(now, -30);
        
        const recentTasks = tasks.filter(t => 
          new Date(t.createdAt) > thirtyDaysAgo
        );
        
        const completedTasks = recentTasks.filter(t => t.status === 'completed');
        const overdueTasks = get().getOverdueTasks();
        
        const metrics: ProductivityMetrics = {
          completionRate: recentTasks.length > 0 
            ? Math.round((completedTasks.length / recentTasks.length) * 100)
            : 0,
          averageTaskTime: completedTasks.length > 0
            ? completedTasks.reduce((acc, t) => acc + (t.actualHours || 0), 0) / completedTasks.length
            : 0,
          overdueRate: tasks.length > 0
            ? Math.round((overdueTasks.length / tasks.length) * 100)
            : 0,
          productivityTrend: 'stable', // Would need historical data to calculate
          tasksCompleted: completedTasks.length,
          tasksOverdue: overdueTasks.length,
          tasksPending: tasks.filter(t => t.status !== 'completed').length,
          projectsActive: projects.filter(p => p.status === 'in-progress').length,
          projectsCompleted: projects.filter(p => p.status === 'completed').length,
          timeSpentToday: 0, // Would need time tracking
          timeSpentWeek: 0,
          timeSpentMonth: 0,
          bottlenecks: [],
          recommendations: []
        };
        
        return metrics;
      },
      
      getProductivityInsights: async () => {
        const metrics = await get().analyzeProductivity();
        
        // This would typically call an AI service for insights
        // For now, return basic insights
        const insights: ProductivityInsights = {
          summary: `You have a ${metrics.completionRate}% completion rate with ${metrics.tasksOverdue} overdue tasks.`,
          strengths: [
            metrics.completionRate > 70 ? 'High completion rate' : '',
            metrics.averageTaskTime < 4 ? 'Efficient task completion' : ''
          ].filter(Boolean),
          improvements: [
            metrics.overdueRate > 20 ? 'Reduce overdue tasks' : '',
            metrics.completionRate < 50 ? 'Focus on task completion' : ''
          ].filter(Boolean),
          predictions: [],
          aiRecommendations: 'Focus on high-priority tasks and clear blockers.'
        };
        
        return insights;
      },
      
      // Filtering and Sorting
      filterTasks: (filter) => {
        let filtered = [...get().tasks];
        
        if (filter.status?.length) {
          filtered = filtered.filter(t => filter.status!.includes(t.status));
        }
        
        if (filter.projectId?.length) {
          filtered = filtered.filter(t => filter.projectId!.includes(t.projectId));
        }
        
        if (filter.priority?.length) {
          filtered = filtered.filter(t => filter.priority!.includes(t.priority || 'medium'));
        }
        
        if (filter.search) {
          const searchLower = filter.search.toLowerCase();
          filtered = filtered.filter(t => 
            t.title.toLowerCase().includes(searchLower) ||
            t.description?.toLowerCase().includes(searchLower)
          );
        }
        
        return filtered;
      },
      
      filterProjects: (filter) => {
        let filtered = [...get().projects];
        
        if (filter.status?.length) {
          filtered = filtered.filter(p => filter.status!.includes(p.status));
        }
        
        if (filter.priority?.length) {
          filtered = filtered.filter(p => filter.priority!.includes(p.priority));
        }
        
        if (filter.search) {
          const searchLower = filter.search.toLowerCase();
          filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchLower) ||
            p.description.toLowerCase().includes(searchLower)
          );
        }
        
        return filtered;
      },
      
      sortTasks: (tasks, field, direction = 'asc') => {
        const sorted = [...tasks];
        
        sorted.sort((a, b) => {
          let aVal: any, bVal: any;
          
          switch (field) {
            case 'deadline':
              aVal = new Date(a.deadline).getTime();
              bVal = new Date(b.deadline).getTime();
              break;
            case 'priority':
              const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
              aVal = priorityOrder[a.priority || 'medium'];
              bVal = priorityOrder[b.priority || 'medium'];
              break;
            case 'created':
              aVal = new Date(a.createdAt).getTime();
              bVal = new Date(b.createdAt).getTime();
              break;
            case 'status':
              const statusOrder = { todo: 1, 'in-progress': 2, review: 3, blocked: 4, completed: 5 };
              aVal = statusOrder[a.status];
              bVal = statusOrder[b.status];
              break;
            case 'smartPriority':
              aVal = a.smartPriority || 0;
              bVal = b.smartPriority || 0;
              break;
            default:
              return 0;
          }
          
          return direction === 'asc' ? aVal - bVal : bVal - aVal;
        });
        
        return sorted;
      },
      
      // Bulk Operations
      bulkUpdateTasks: async (taskIds, updates) => {
        set(state => ({
          tasks: state.tasks.map(t =>
            taskIds.includes(t.id)
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          )
        }));
        
        await syncToBackend('task.bulkUpdate', { taskIds, updates });
      },
      
      bulkDeleteTasks: async (taskIds) => {
        set(state => ({
          tasks: state.tasks.filter(t => !taskIds.includes(t.id))
        }));
        
        await syncToBackend('task.bulkDelete', { taskIds });
      },
      
      archiveCompletedTasks: async () => {
        const completedTasks = get().tasks.filter(t => t.status === 'completed');
        const completedTaskIds = completedTasks.map(t => t.id);
        
        // In a real app, you'd move these to an archive
        // For now, we'll just delete them
        await get().bulkDeleteTasks(completedTaskIds);
      },
      
      // Statistics
      getProjectStats: (projectId) => {
        const tasks = get().getTasksByProject(projectId);
        const completedTasks = tasks.filter(t => t.status === 'completed');
        const overdueTasks = tasks.filter(t => {
          if (t.status === 'completed') return false;
          return isBefore(new Date(t.deadline), new Date());
        });
        
        const estimatedHours = tasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
        const actualHours = completedTasks.reduce((acc, t) => acc + (t.actualHours || 0), 0);
        
        return {
          totalTasks: tasks.length,
          completedTasks: completedTasks.length,
          overdueTasks: overdueTasks.length,
          progress: tasks.length > 0 
            ? Math.round((completedTasks.length / tasks.length) * 100)
            : 0,
          estimatedHours,
          actualHours
        };
      },
      
      getOverallStats: () => {
        const projects = get().projects;
        const tasks = get().tasks;
        const completedTasks = tasks.filter(t => t.status === 'completed');
        const overdueTasks = get().getOverdueTasks();
        
        return {
          totalProjects: projects.length,
          activeProjects: projects.filter(p => p.status === 'in-progress').length,
          totalTasks: tasks.length,
          completedTasks: completedTasks.length,
          overdueTasks: overdueTasks.length,
          completionRate: tasks.length > 0
            ? Math.round((completedTasks.length / tasks.length) * 100)
            : 0
        };
      },
      
      // Utility
      clearAll: () => {
        set({
          projects: [],
          tasks: [],
          contacts: [],
          selectedProjectId: null,
          selectedTaskId: null
        });
      },
      
      exportData: () => {
        const { projects, tasks, contacts } = get();
        return { projects, tasks, contacts };
      },
      
      importData: (data) => {
        set(state => ({
          projects: data.projects || state.projects,
          tasks: data.tasks || state.tasks,
          contacts: data.contacts || state.contacts
        }));
      }
    }),
    {
      name: 'project-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projects: state.projects,
        tasks: state.tasks,
        contacts: state.contacts
      })
    }
  )
);

// Export helper hooks
export const useProjects = () => useProjectStore(state => state.projects);
export const useTasks = () => useProjectStore(state => state.tasks);
export const useContacts = () => useProjectStore(state => state.contacts);
export const useProjectActions = () => useProjectStore(state => ({
  createProject: state.createProject,
  updateProject: state.updateProject,
  deleteProject: state.deleteProject
}));
export const useTaskActions = () => useProjectStore(state => ({
  createTask: state.createTask,
  updateTask: state.updateTask,
  deleteTask: state.deleteTask,
  completeTask: state.completeTask,
  moveTask: state.moveTask
}));
