import React, { useState, useEffect } from 'react';
import { UnifiedTask } from '@/services/lifeOS-db';
import { timelineService } from '../services/timelineService';
import { projectService } from '@/modules/projects/services/projectService';

interface TimelineViewProps {
  tasks: UnifiedTask[];
  onTaskComplete: (taskId: string) => Promise<void>;
  onTaskSchedule: (taskId: string, date: Date) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function TimelineView({ tasks, onTaskComplete, onTaskSchedule, onRefresh }: TimelineViewProps) {
  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddPriority, setQuickAddPriority] = useState<'A' | 'B' | 'C'>('B');
  const [dayPlan, setDayPlan] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadDayPlan();
    loadStats();
  }, [tasks]);

  const loadDayPlan = async () => {
    const plan = await timelineService.generateDayPlan();
    setDayPlan(plan);
  };

  const loadStats = async () => {
    const productivityStats = await timelineService.getProductivityStats(7);
    setStats(productivityStats);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;

    let inboxProject = await projectService.getActiveProjects()
      .then(projects => projects.find(p => p.title === 'Inbox'));

    if (!inboxProject) {
      inboxProject = await projectService.createProject({
        title: 'Inbox',
        description: 'Quick tasks'
      });
    }

    await projectService.addTaskToProject(inboxProject.id, {
      title: quickAddTitle,
      priority: quickAddPriority,
      source: 'personal'
    });

    setQuickAddTitle('');
    setShowQuickAdd(false);
    await onRefresh();
  };

  const getPriorityColor = (priority: UnifiedTask['priority']) => {
    switch (priority) {
      case 'A': return 'bg-red-500 text-white';
      case 'B': return 'bg-yellow-500 text-white';
      case 'C': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSourceIcon = (source: UnifiedTask['source']) => {
    switch (source) {
      case 'project': return '🚀';
      case 'email': return '📧';
      case 'fitness': return '💪';
      case 'personal': return '👤';
      case 'ai': return '🤖';
      case 'finance': return '💰';
      default: return '📌';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const groupedTasks = {
    overdue: tasks.filter(t => t.dueAt && t.dueAt < Date.now() && t.status !== 'done'),
    today: tasks.filter(t => {
      if (t.status === 'done') return false;
      const isScheduledToday = t.scheduledFor &&
        new Date(t.scheduledFor).toDateString() === new Date().toDateString();
      const isDueToday = t.dueAt &&
        new Date(t.dueAt).toDateString() === new Date().toDateString();
      return isScheduledToday || isDueToday || (!t.scheduledFor && !t.dueAt && t.priority === 'A');
    }),
    upcoming: tasks.filter(t => {
      if (t.status === 'done') return false;
      const isScheduledFuture = t.scheduledFor &&
        new Date(t.scheduledFor) > new Date();
      return isScheduledFuture && !t.dueAt;
    })
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Today's Timeline</h2>
        <button
          onClick={() => setShowQuickAdd(true)}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <span>+</span>
          Quick Add Task
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">{stats.completionRate}%</div>
            <div className="text-sm text-white/70">Completion Rate</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-400">{stats.tasksCompleted}</div>
            <div className="text-sm text-white/70">Tasks Done (7d)</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-400">{stats.tasksCreated}</div>
            <div className="text-sm text-white/70">Tasks Created (7d)</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl font-bold text-purple-400">{stats.averageCompletionTime}h</div>
            <div className="text-sm text-white/70">Avg Completion</div>
          </div>
        </div>
      )}

      {showQuickAdd && (
        <div className="mb-6 bg-white/10 rounded-lg p-4">
          <form onSubmit={handleQuickAdd}>
            <div className="flex gap-2">
              <input
                type="text"
                value={quickAddTitle}
                onChange={(e) => setQuickAddTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="flex-1 px-4 py-2 bg-white/10 text-white placeholder-white/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              <select
                value={quickAddPriority}
                onChange={(e) => setQuickAddPriority(e.target.value as 'A' | 'B' | 'C')}
                className="px-4 py-2 bg-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="A">Priority A</option>
                <option value="B">Priority B</option>
                <option value="C">Priority C</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQuickAdd(false);
                  setQuickAddTitle('');
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {groupedTasks.overdue.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-red-400 mb-3">⚠️ Overdue</h3>
          <div className="space-y-2">
            {groupedTasks.overdue.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={() => onTaskComplete(task.id)}
                onSchedule={(date) => onTaskSchedule(task.id, date)}
                isOverdue
              />
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">📅 Today's Tasks</h3>
        <div className="space-y-2">
          {groupedTasks.today.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              <div className="text-3xl mb-2">✨</div>
              <p>No tasks scheduled for today</p>
            </div>
          ) : (
            groupedTasks.today.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={() => onTaskComplete(task.id)}
                onSchedule={(date) => onTaskSchedule(task.id, date)}
              />
            ))
          )}
        </div>
      </div>

      {groupedTasks.upcoming.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white/70 mb-3">🔮 Upcoming</h3>
          <div className="space-y-2 opacity-70">
            {groupedTasks.upcoming.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={() => onTaskComplete(task.id)}
                onSchedule={(date) => onTaskSchedule(task.id, date)}
              />
            ))}
          </div>
        </div>
      )}

      {dayPlan && (
        <div className="mt-6 p-4 bg-white/10 rounded-lg">
          <div className="flex justify-between items-center text-sm text-white/70">
            <span>Planned: {Math.round(dayPlan.totalPlannedMinutes / 60)}h</span>
            <span>Available: {Math.round(dayPlan.totalAvailableMinutes / 60)}h</span>
            <span>Utilization: {Math.round((dayPlan.totalPlannedMinutes / dayPlan.totalAvailableMinutes) * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface TaskItemProps {
  task: UnifiedTask;
  onComplete: () => void;
  onSchedule: (date: Date) => void;
  isOverdue?: boolean;
}

function TaskItem({ task, onComplete, onSchedule, isOverdue }: TaskItemProps) {
  const [showScheduler, setShowScheduler] = useState(false);

  const getPriorityColor = (priority: UnifiedTask['priority']) => {
    switch (priority) {
      case 'A': return 'bg-red-500';
      case 'B': return 'bg-yellow-500';
      case 'C': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSourceIcon = (source: UnifiedTask['source']) => {
    switch (source) {
      case 'project': return '🚀';
      case 'email': return '📧';
      case 'fitness': return '💪';
      case 'personal': return '👤';
      case 'ai': return '🤖';
      case 'finance': return '💰';
      default: return '📌';
    }
  };

  return (
    <div className={`bg-white/10 rounded-lg p-4 hover:bg-white/15 transition-all ${isOverdue ? 'border border-red-500' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={onComplete}
            className="w-6 h-6 rounded-full border-2 border-white/50 hover:border-green-400 hover:bg-green-400/20 transition-all"
          />
          <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
          <span className="text-xl">{getSourceIcon(task.source)}</span>
          <div className="flex-1">
            <h4 className="text-white font-medium">{task.title}</h4>
            {task.description && (
              <p className="text-white/60 text-sm mt-1">{task.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {task.effortMinutes && (
            <span className="text-white/50 text-sm">
              {task.effortMinutes < 60 ? `${task.effortMinutes}m` : `${Math.round(task.effortMinutes / 60)}h`}
            </span>
          )}
          {task.dueAt && (
            <span className={`text-sm ${isOverdue ? 'text-red-400' : 'text-white/50'}`}>
              Due: {new Date(task.dueAt).toLocaleDateString()}
            </span>
          )}
          <button
            onClick={() => setShowScheduler(!showScheduler)}
            className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded transition-colors text-sm"
          >
            📅
          </button>
        </div>
      </div>

      {showScheduler && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex gap-2">
            <button
              onClick={() => {
                onSchedule(new Date());
                setShowScheduler(false);
              }}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                onSchedule(tomorrow);
                setShowScheduler(false);
              }}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
            >
              Tomorrow
            </button>
            <button
              onClick={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                onSchedule(nextWeek);
                setShowScheduler(false);
              }}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
            >
              Next Week
            </button>
          </div>
        </div>
      )}
    </div>
  );
}