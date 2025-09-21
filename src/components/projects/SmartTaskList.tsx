import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Clock,
  AlertTriangle,
  Calendar,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Zap
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import type { Task, Project } from '@/types/projects.types';

interface SmartTaskWithContext extends Omit<Task, 'priority'> {
  project: Project;
  priority: number;
  reasoning: string;
  daysUntilDeadline: number;
  isOverdue: boolean;
}

export function SmartTaskList() {
  const {
    tasks,
    projects,
    getSmartTaskList,
    calculateTaskPriority,
    completeTask,
    getProject
  } = useProjectStore();

  const [smartTasks, setSmartTasks] = useState<SmartTaskWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  // Refresh smart task list
  const refreshSmartList = () => {
    setLoading(true);

    const rawSmartTasks = getSmartTaskList();

    const enhancedTasks: SmartTaskWithContext[] = rawSmartTasks.map(task => {
      const project = getProject(task.projectId);
      const priority = calculateTaskPriority(task.id);
      const daysUntilDeadline = Math.ceil(
        (new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      let reasoning = '';
      if (daysUntilDeadline < 0) {
        reasoning = `Overdue by ${Math.abs(daysUntilDeadline)} days`;
      } else if (daysUntilDeadline === 0) {
        reasoning = 'Due today';
      } else if (daysUntilDeadline <= 3) {
        reasoning = 'Due within 3 days';
      } else if (task.status === 'in-progress') {
        reasoning = 'Already in progress';
      } else if (project?.priority === 'critical') {
        reasoning = 'Critical project';
      } else {
        reasoning = 'High priority';
      }

      return {
        ...task,
        project: project!,
        priority,
        reasoning,
        daysUntilDeadline,
        isOverdue: daysUntilDeadline < 0
      };
    }).filter(t => t.project); // Filter out tasks without projects

    setSmartTasks(enhancedTasks);
    setLoading(false);
  };

  useEffect(() => {
    refreshSmartList();
  }, [tasks, projects]);

  const handleCompleteTask = async (taskId: string) => {
    setCompleting(taskId);
    try {
      await completeTask(taskId);
      // Remove from smart list
      setSmartTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setCompleting(null);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 40) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (priority >= 25) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    if (priority >= 15) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  };

  const getStatusIcon = (task: SmartTaskWithContext) => {
    if (task.isOverdue) {
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
    if (task.daysUntilDeadline === 0) {
      return <Clock className="w-4 h-4 text-orange-500" />;
    }
    if (task.status === 'in-progress') {
      return <TrendingUp className="w-4 h-4 text-blue-500" />;
    }
    return <Target className="w-4 h-4 text-slate-400" />;
  };

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Zap className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Smart Focus</h3>
            <p className="text-sm text-slate-400">AI-prioritized tasks</p>
          </div>
        </div>

        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Zap className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Smart Focus</h3>
            <p className="text-sm text-slate-400">
              {smartTasks.length} AI-prioritized tasks
            </p>
          </div>
        </div>

        <button
          onClick={refreshSmartList}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          title="Refresh smart list"
        >
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Task List */}
      {smartTasks.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">All caught up!</p>
          <p className="text-sm text-slate-400 mt-1">
            No high-priority tasks requiring immediate attention
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {smartTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -300 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  relative group p-4 rounded-lg border transition-all duration-200
                  ${getPriorityColor(task.priority)}
                  hover:scale-[1.02] cursor-pointer
                `}
                onClick={() => window.location.href = '/projects'}
              >
                {/* Priority Badge */}
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {index + 1}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className="mt-1">
                    {getStatusIcon(task)}
                  </div>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-white truncate">
                        {task.title}
                      </h4>
                      <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-full">
                        {task.project.name}
                      </span>
                    </div>

                    <p className="text-sm text-slate-400 mb-2 line-clamp-1">
                      {task.reasoning}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {task.isOverdue
                            ? `${Math.abs(task.daysUntilDeadline)}d overdue`
                            : task.daysUntilDeadline === 0
                            ? 'Due today'
                            : `${task.daysUntilDeadline}d left`
                          }
                        </span>
                      </div>

                      {task.estimatedHours && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{task.estimatedHours}h</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        <span>Priority {task.priority}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompleteTask(task.id);
                      }}
                      disabled={completing === task.id}
                      className={`
                        p-2 rounded-lg transition-all
                        ${completing === task.id
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-700 hover:bg-green-600 text-slate-300 hover:text-white'
                        }
                      `}
                      title="Mark as complete"
                    >
                      {completing === task.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </button>

                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Footer */}
      {smartTasks.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-700">
          <button
            onClick={() => window.location.href = '/projects'}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            View All Projects
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}