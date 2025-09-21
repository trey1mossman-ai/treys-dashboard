/**
 * Smart Task List Component
 * Displays AI-prioritized tasks that need immediate attention
 */

import { useState, useEffect } from 'react';
import { 
  Brain, 
  Clock, 
  Zap, 
  AlertCircle, 
  Calendar,
  ChevronRight,
  TrendingUp,
  Target,
  CheckCircle,
  Loader
} from 'lucide-react';
import { formatDistanceToNow, differenceInDays, format } from 'date-fns';
import { useProjectStore } from '@/stores/projectStore';
import { taskPriorityEngine } from '@/lib/taskPriority';
import type { Task } from '@/types/projects.types';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface SmartTaskListProps {
  compact?: boolean;
  maxTasks?: number;
  showInsights?: boolean;
  className?: string;
}

export function SmartTaskList({ 
  compact = false, 
  maxTasks = 5,
  showInsights = true,
  className 
}: SmartTaskListProps) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [currentRecommendation, setCurrentRecommendation] = useState(0);
  
  const { 
    projects,
    completeTask,
    updateTask,
    getOverdueTasks,
    getTodaysTasks 
  } = useProjectStore();

  // Load smart tasks and recommendations
  useEffect(() => {
    const loadSmartData = () => {
      setLoading(true);
      
      // Get AI-prioritized tasks
      const smartTasks = taskPriorityEngine.getSmartTaskList(maxTasks);
      setTasks(smartTasks);
      
      // Get recommendations
      if (showInsights) {
        const recs = taskPriorityEngine.getRecommendations();
        setRecommendations(recs);
      }
      
      setLoading(false);
    };
    
    loadSmartData();
    
    // Refresh every minute
    const interval = setInterval(loadSmartData, 60000);
    
    return () => clearInterval(interval);
  }, [maxTasks, showInsights]);

  // Rotate recommendations
  useEffect(() => {
    if (recommendations.length > 1) {
      const interval = setInterval(() => {
        setCurrentRecommendation((prev) => (prev + 1) % recommendations.length);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [recommendations]);

  // Get priority color
  const getPriorityColor = (priority: number) => {
    if (priority >= 80) return 'text-red-500';
    if (priority >= 60) return 'text-orange-500';
    if (priority >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Get deadline text
  const getDeadlineText = (deadline: Date | string) => {
    const date = new Date(deadline);
    const days = differenceInDays(date, new Date());
    
    if (days < 0) return { text: 'Overdue', urgent: true };
    if (days === 0) return { text: 'Today', urgent: true };
    if (days === 1) return { text: 'Tomorrow', urgent: false };
    if (days <= 7) return { text: `${days} days`, urgent: false };
    return { text: format(date, 'MMM d'), urgent: false };
  };

  // Handle task completion
  const handleComplete = async (taskId: string) => {
    await completeTask(taskId);
    // Reload smart tasks
    const smartTasks = taskPriorityEngine.getSmartTaskList(maxTasks);
    setTasks(smartTasks);
  };

  // Handle quick update
  const handleQuickUpdate = async (taskId: string, status: Task['status']) => {
    await updateTask(taskId, { status });
    // Reload smart tasks
    const smartTasks = taskPriorityEngine.getSmartTaskList(maxTasks);
    setTasks(smartTasks);
  };

  // Navigate to projects page
  const goToProjects = () => {
    navigate('/projects');
  };

  // Get stats
  const overdueTasks = getOverdueTasks();
  const todaysTasks = getTodaysTasks();

  if (loading) {
    return (
      <div className={cn("p-4 rounded-xl bg-card border border-border", className)}>
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (compact) {
    // Compact view for dashboard
    return (
      <div className={cn(
        "p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20",
        className
      )}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Smart Tasks
          </h3>
          <button
            onClick={goToProjects}
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
          >
            View all
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            All caught up! No urgent tasks. 🎉
          </p>
        ) : (
          <div className="space-y-2">
            {tasks.slice(0, 3).map(task => {
              const project = projects.find(p => p.id === task.projectId);
              const priority = task.smartPriority || 0;
              const deadline = getDeadlineText(task.deadline);
              
              return (
                <div
                  key={task.id}
                  className="p-2 bg-background rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => goToProjects()}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-1">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-xs flex items-center gap-1", getPriorityColor(priority))}>
                          <Zap className="w-3 h-3" />
                          {priority}
                        </span>
                        <span className={cn(
                          "text-xs",
                          deadline.urgent ? "text-red-500 font-bold" : "text-muted-foreground"
                        )}>
                          {deadline.text}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Quick Stats */}
        <div className="mt-3 pt-3 border-t border-border flex justify-around">
          <div className="text-center">
            <p className="text-lg font-bold text-primary">{todaysTasks.length}</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-orange-500">{overdueTasks.length}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-green-500">{tasks[0]?.smartPriority || 0}</p>
            <p className="text-xs text-muted-foreground">Top Priority</p>
          </div>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI Task Priority
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Focus on what matters most
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{tasks.length}</p>
              <p className="text-xs text-muted-foreground">Priority Tasks</p>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        {showInsights && recommendations.length > 0 && (
          <div className="p-3 bg-background/50 rounded-lg">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-primary mb-1">AI Insight</p>
                <p className="text-xs text-muted-foreground">
                  {recommendations[currentRecommendation]}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl bg-card border border-border">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-1">You're all caught up!</h3>
            <p className="text-sm text-muted-foreground">
              No urgent tasks requiring attention right now.
            </p>
          </div>
        ) : (
          tasks.map(task => {
            const project = projects.find(p => p.id === task.projectId);
            const priority = task.smartPriority || 0;
            const deadline = getDeadlineText(task.deadline);
            
            return (
              <div
                key={task.id}
                className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all group"
              >
                <div className="flex items-start gap-3">
                  {/* Priority Indicator */}
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
                    priority >= 80 ? "bg-red-500/20 text-red-500" :
                    priority >= 60 ? "bg-orange-500/20 text-orange-500" :
                    priority >= 40 ? "bg-yellow-500/20 text-yellow-500" :
                    "bg-green-500/20 text-green-500"
                  )}>
                    {priority}
                  </div>

                  {/* Task Details */}
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{task.title}</h3>
                    
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {/* Project */}
                      {project && (
                        <span
                          className="px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: project.color + '20',
                            color: project.color
                          }}
                        >
                          {project.name}
                        </span>
                      )}

                      {/* Deadline */}
                      <span className={cn(
                        "flex items-center gap-1",
                        deadline.urgent ? "text-red-500 font-bold" : "text-muted-foreground"
                      )}>
                        <Calendar className="w-3 h-3" />
                        {deadline.text}
                      </span>

                      {/* Time Estimate */}
                      {task.estimatedHours && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {task.estimatedHours}h
                        </span>
                      )}

                      {/* Status */}
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs",
                        task.status === 'in-progress' ? "bg-blue-500/20 text-blue-500" :
                        task.status === 'blocked' ? "bg-red-500/20 text-red-500" :
                        task.status === 'review' ? "bg-yellow-500/20 text-yellow-500" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {task.status.replace('-', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {task.status !== 'in-progress' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickUpdate(task.id, 'in-progress');
                        }}
                        className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Start Task"
                      >
                        <Target className="w-4 h-4 text-blue-500" />
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleComplete(task.id);
                      }}
                      className="p-2 hover:bg-green-500/10 rounded-lg transition-colors"
                      title="Complete Task"
                    >
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                </div>

                {/* Warnings */}
                {task.blockedBy && task.blockedBy.length > 0 && (
                  <div className="mt-3 p-2 bg-red-500/10 text-red-500 rounded-lg flex items-center gap-2 text-xs">
                    <AlertCircle className="w-3 h-3" />
                    This task is blocked by dependencies
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* View All Button */}
      <button
        onClick={goToProjects}
        className="w-full py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors flex items-center justify-center gap-2"
      >
        View All Projects
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
