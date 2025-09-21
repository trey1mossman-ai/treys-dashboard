/**
 * Project Board - Main Project Management Interface
 * Kanban-style board with drag & drop, task management, and AI features
 */

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import {
  Plus,
  MoreVertical,
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  Circle,
  Loader,
  Filter,
  Search,
  Brain,
  TrendingUp,
  ArrowRight,
  Zap,
  Target,
  BarChart3
} from 'lucide-react';
import { formatDistanceToNow, format, isAfter, isBefore, differenceInDays } from 'date-fns';
import { EmailStatusModal } from '@/components/projects/EmailStatusModal';
import { useProjectStore } from '@/stores/projectStore';
import type { Task, Project } from '@/types/projects.types';
import { cn } from '@/lib/utils';

// Column definitions for the kanban board
const COLUMNS = [
  { id: 'todo', title: '📝 To Do', color: 'bg-slate-500' },
  { id: 'in-progress', title: '🚀 In Progress', color: 'bg-blue-500' },
  { id: 'review', title: '👀 Review', color: 'bg-yellow-500' },
  { id: 'completed', title: '✅ Completed', color: 'bg-green-500' },
  { id: 'blocked', title: '🚫 Blocked', color: 'bg-red-500' }
];

export default function ProjectBoard() {
  // Store hooks
  const {
    projects,
    tasks,
    createProject,
    createTask,
    updateTask,
    completeTask,
    moveTask,
    getTasksByStatus,
    getSmartTaskList,
    getOverallStats,
    calculateTaskPriority
  } = useProjectStore();

  // Local state
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState<{
    show: boolean;
    task?: Task;
    project?: Project;
  }>({ show: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState<string | null>(null);
  const [smartTasks, setSmartTasks] = useState<Task[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Filter tasks by selected project and search
  const filteredTasks = tasks.filter(task => {
    if (selectedProject && task.projectId !== selectedProject) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return task.title.toLowerCase().includes(query) ||
             task.description?.toLowerCase().includes(query);
    }
    return true;
  });

  // Load smart tasks on mount and when tasks change
  useEffect(() => {
    const loadSmartTasks = () => {
      const smart = getSmartTaskList();
      setSmartTasks(smart);
    };
    
    loadSmartTasks();
    const interval = setInterval(loadSmartTasks, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [tasks]);

  // Listen for task completion events
  useEffect(() => {
    const handleTaskCompleted = (event: CustomEvent) => {
      const { task, project } = event.detail;
      setShowEmailModal({ show: true, task, project });
    };

    window.addEventListener('task-completed', handleTaskCompleted as EventListener);
    return () => {
      window.removeEventListener('task-completed', handleTaskCompleted as EventListener);
    };
  }, []);

  // Handle drag end
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, source, destination } = result;
    
    if (source.droppableId === destination.droppableId) {
      // Same column - just reorder
      return;
    }

    // Move to different column - update status
    const newStatus = destination.droppableId as Task['status'];
    
    // If moving to completed, trigger completion flow
    if (newStatus === 'completed') {
      await completeTask(draggableId);
    } else {
      await moveTask(draggableId, newStatus);
    }
  };

  // Create a new project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    await createProject({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      deadline: formData.get('deadline') as string,
      priority: formData.get('priority') as Project['priority'],
      status: 'planning',
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      contacts: []
    });
    
    setShowCreateProject(false);
    form.reset();
  };

  // Create a new task
  const handleCreateTask = async (status: string, e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    if (!selectedProject) {
      alert('Please select a project first');
      return;
    }
    
    await createTask({
      projectId: selectedProject,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      deadline: formData.get('deadline') as string,
      estimatedHours: parseFloat(formData.get('estimatedHours') as string) || undefined,
      priority: formData.get('priority') as Task['priority'],
      status: status as Task['status']
    });
    
    setShowCreateTask(null);
    form.reset();
  };

  // Get task priority color
  const getPriorityColor = (task: Task) => {
    const priority = calculateTaskPriority(task.id);
    if (priority >= 70) return 'text-red-500';
    if (priority >= 50) return 'text-orange-500';
    if (priority >= 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Get deadline status
  const getDeadlineStatus = (deadline: string | Date) => {
    const date = new Date(deadline);
    const now = new Date();
    const days = differenceInDays(date, now);
    
    if (days < 0) return { text: 'Overdue', color: 'text-red-500 font-bold' };
    if (days === 0) return { text: 'Today', color: 'text-orange-500 font-bold' };
    if (days === 1) return { text: 'Tomorrow', color: 'text-yellow-500' };
    if (days <= 7) return { text: `${days} days`, color: 'text-blue-500' };
    return { text: format(date, 'MMM dd'), color: 'text-muted-foreground' };
  };

  // Get overall stats
  const stats = getOverallStats();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Target className="w-8 h-8 text-primary" />
              Project Board
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your projects and tasks with AI-powered insights
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-muted">
              <div className="text-sm">
                <span className="text-muted-foreground">Active:</span>
                <span className="ml-1 font-bold text-primary">{stats.activeProjects}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Tasks:</span>
                <span className="ml-1 font-bold">{stats.totalTasks}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Complete:</span>
                <span className="ml-1 font-bold text-green-500">{stats.completionRate}%</span>
              </div>
            </div>
            
            <button
              onClick={() => setShowCreateProject(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          {/* Project Selector */}
          <div className="flex-1 max-w-xs">
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value || null)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Search */}
          <div className="flex-1 max-w-xs relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 h-full min-w-max">
              {COLUMNS.map(column => {
                const columnTasks = filteredTasks.filter(t => t.status === column.id);
                
                return (
                  <div key={column.id} className="w-80 flex flex-col">
                    {/* Column Header */}
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <span>{column.title}</span>
                        <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {columnTasks.length}
                        </span>
                      </h3>
                      <button
                        onClick={() => setShowCreateTask(column.id)}
                        className="p-1 hover:bg-muted rounded transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Column Content */}
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "flex-1 space-y-2 p-2 rounded-lg transition-colors overflow-y-auto",
                            snapshot.isDraggingOver ? "bg-muted" : "bg-muted/30"
                          )}
                        >
                          {columnTasks.map((task, index) => {
                            const project = projects.find(p => p.id === task.projectId);
                            const deadlineStatus = getDeadlineStatus(task.deadline);
                            
                            return (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={cn(
                                      "p-3 bg-background border border-border rounded-lg transition-all",
                                      snapshot.isDragging && "shadow-lg rotate-2",
                                      "hover:border-primary/50"
                                    )}
                                  >
                                    {/* Task Header */}
                                    <div className="flex items-start justify-between mb-2">
                                      <h4 className="font-medium text-sm flex-1 mr-2">
                                        {task.title}
                                      </h4>
                                      <button className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="w-3 h-3" />
                                      </button>
                                    </div>

                                    {/* Task Description */}
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}

                                    {/* Task Meta */}
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      {/* Priority Indicator */}
                                      <span className={cn("flex items-center gap-1", getPriorityColor(task))}>
                                        <Zap className="w-3 h-3" />
                                        {calculateTaskPriority(task.id)}
                                      </span>

                                      {/* Project Badge */}
                                      {project && (
                                        <span
                                          className="px-2 py-0.5 rounded-full text-xs"
                                          style={{
                                            backgroundColor: project.color + '20',
                                            color: project.color
                                          }}
                                        >
                                          {project.name}
                                        </span>
                                      )}

                                      {/* Deadline */}
                                      <span className={cn("flex items-center gap-1", deadlineStatus.color)}>
                                        <Calendar className="w-3 h-3" />
                                        {deadlineStatus.text}
                                      </span>

                                      {/* Time Estimate */}
                                      {task.estimatedHours && (
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                          <Clock className="w-3 h-3" />
                                          {task.estimatedHours}h
                                        </span>
                                      )}
                                    </div>

                                    {/* Dependencies/Blockers */}
                                    {task.blockedBy && task.blockedBy.length > 0 && (
                                      <div className="mt-2 p-1 bg-red-500/10 text-red-500 text-xs rounded flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Blocked
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}

                          {/* Create Task Form */}
                          {showCreateTask === column.id && (
                            <form
                              onSubmit={(e) => handleCreateTask(column.id, e)}
                              className="p-3 bg-background border-2 border-primary rounded-lg"
                            >
                              <input
                                name="title"
                                placeholder="Task title..."
                                required
                                autoFocus
                                className="w-full mb-2 px-2 py-1 text-sm bg-transparent border-b border-border focus:outline-none"
                              />
                              <textarea
                                name="description"
                                placeholder="Description (optional)"
                                className="w-full mb-2 px-2 py-1 text-sm bg-transparent border-b border-border focus:outline-none resize-none"
                                rows={2}
                              />
                              <input
                                name="deadline"
                                type="datetime-local"
                                required
                                className="w-full mb-2 px-2 py-1 text-sm bg-transparent border-b border-border focus:outline-none"
                              />
                              <input
                                name="estimatedHours"
                                type="number"
                                step="0.5"
                                placeholder="Est. hours"
                                className="w-full mb-2 px-2 py-1 text-sm bg-transparent border-b border-border focus:outline-none"
                              />
                              <select
                                name="priority"
                                className="w-full mb-2 px-2 py-1 text-sm bg-transparent border-b border-border focus:outline-none"
                              >
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High Priority</option>
                                <option value="critical">Critical</option>
                              </select>
                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  className="flex-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                                >
                                  Create
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowCreateTask(null)}
                                  className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </div>

        {/* Smart Tasks Sidebar */}
        <div className="w-80 border-l border-border pl-6 space-y-6 overflow-y-auto">
          {/* AI Insights */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              AI Priority Tasks
            </h3>
            <div className="space-y-2">
              {smartTasks.slice(0, 5).map(task => {
                const project = projects.find(p => p.id === task.projectId);
                const priority = calculateTaskPriority(task.id);
                
                return (
                  <div
                    key={task.id}
                    className="p-2 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => {
                      // Scroll to task in board
                      document.getElementById(task.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-sm font-medium flex-1">{task.title}</h4>
                      <span className={cn("text-xs font-bold", getPriorityColor(task))}>
                        {priority}
                      </span>
                    </div>
                    {project && (
                      <p className="text-xs text-muted-foreground">
                        {project.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDeadlineStatus(task.deadline).text}
                    </p>
                  </div>
                );
              })}
            </div>
            
            {smartTasks.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No urgent tasks. Great job staying on top of things!
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Quick Stats
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-2xl font-bold text-green-500">{stats.completedTasks}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-2xl font-bold text-blue-500">{stats.totalTasks - stats.completedTasks}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-2xl font-bold text-red-500">{stats.overdueTasks}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-2xl font-bold text-primary">{stats.completionRate}%</p>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Upcoming Deadlines
            </h3>
            
            <div className="space-y-2">
              {tasks
                .filter(t => t.status !== 'completed')
                .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
                .slice(0, 5)
                .map(task => {
                  const deadlineStatus = getDeadlineStatus(task.deadline);
                  
                  return (
                    <div key={task.id} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1 mr-2">{task.title}</span>
                      <span className={cn("text-xs", deadlineStatus.color)}>
                        {deadlineStatus.text}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <form
            onSubmit={handleCreateProject}
            className="w-full max-w-md p-6 bg-background border border-border rounded-2xl shadow-xl"
          >
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
            
            <input
              name="name"
              placeholder="Project Name"
              required
              autoFocus
              className="w-full mb-3 px-3 py-2 rounded-lg border border-border bg-background focus:border-primary focus:outline-none"
            />
            
            <textarea
              name="description"
              placeholder="Project Description"
              required
              className="w-full mb-3 px-3 py-2 rounded-lg border border-border bg-background focus:border-primary focus:outline-none resize-none"
              rows={3}
            />
            
            <input
              name="deadline"
              type="date"
              required
              className="w-full mb-3 px-3 py-2 rounded-lg border border-border bg-background focus:border-primary focus:outline-none"
            />
            
            <select
              name="priority"
              className="w-full mb-4 px-3 py-2 rounded-lg border border-border bg-background focus:border-primary focus:outline-none"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical</option>
            </select>
            
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Create Project
              </button>
              <button
                type="button"
                onClick={() => setShowCreateProject(false)}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Email Status Modal */}
      <EmailStatusModal
        isOpen={showEmailModal.show}
        task={showEmailModal.task}
        project={showEmailModal.project}
        onClose={() => setShowEmailModal({ show: false })}
      />
    </div>
  );
}
