/**
 * Task Priority Engine
 * AI-enhanced task prioritization and smart recommendations
 */

import { differenceInDays, differenceInHours, isAfter, isBefore, startOfDay, endOfDay, addDays } from 'date-fns';
import type { Task, Project, Prediction, Bottleneck } from '@/types/projects.types';
import { useProjectStore } from '@/stores/projectStore';

export class TaskPriorityEngine {
  /**
   * Calculate priority score for a task (0-100)
   * Higher scores indicate higher priority
   */
  calculatePriority(task: Task, project: Project | undefined): number {
    if (!project) return 0;
    
    let score = 0;
    const now = new Date();
    const deadline = new Date(task.deadline);
    
    // 1. Deadline urgency (0-40 points)
    const daysUntilDeadline = differenceInDays(deadline, now);
    const hoursUntilDeadline = differenceInHours(deadline, now);
    
    if (daysUntilDeadline < 0) {
      // Overdue - maximum urgency
      const daysOverdue = Math.abs(daysUntilDeadline);
      score += Math.min(40 + (daysOverdue * 2), 50);
    } else if (hoursUntilDeadline <= 24) {
      score += 40;
    } else if (daysUntilDeadline <= 3) {
      score += 35;
    } else if (daysUntilDeadline <= 7) {
      score += 25;
    } else if (daysUntilDeadline <= 14) {
      score += 15;
    } else if (daysUntilDeadline <= 30) {
      score += 10;
    } else {
      score += 5;
    }
    
    // 2. Project priority (0-25 points)
    const projectPriorityMap = { 
      critical: 25, 
      high: 18, 
      medium: 10, 
      low: 5 
    };
    score += projectPriorityMap[project.priority] || 0;
    
    // 3. Task priority (0-20 points)
    const taskPriorityMap = { 
      critical: 20, 
      high: 15, 
      medium: 8, 
      low: 3 
    };
    score += taskPriorityMap[task.priority || 'medium'] || 0;
    
    // 4. Dependencies and blockers (0-10 points)
    if (task.dependencies && task.dependencies.length > 0) {
      // Tasks with dependencies get higher priority if they're blocking others
      const store = useProjectStore.getState();
      const blockedTasks = store.tasks.filter(t => 
        t.dependencies?.includes(task.id) && t.status !== 'completed'
      );
      score += Math.min(blockedTasks.length * 3, 10);
    }
    
    // 5. Task status adjustments (0-5 points)
    if (task.status === 'in-progress') {
      score += 5; // Prioritize tasks already in progress
    } else if (task.status === 'blocked') {
      score -= 10; // Deprioritize blocked tasks
    } else if (task.status === 'review') {
      score += 3; // Tasks in review need attention
    }
    
    // 6. Time estimate vs actual (risk factor)
    if (task.estimatedHours && task.actualHours) {
      const overrun = task.actualHours / task.estimatedHours;
      if (overrun > 1.5) {
        score += 5; // Task is taking longer than expected - needs attention
      }
    }
    
    // 7. Project deadline proximity (bonus points)
    if (project.deadline) {
      const projectDeadline = new Date(project.deadline);
      const daysToProjectDeadline = differenceInDays(projectDeadline, now);
      
      if (daysToProjectDeadline <= 7 && daysToProjectDeadline >= 0) {
        score += 5; // Project deadline is near
      }
    }
    
    return Math.min(Math.max(score, 0), 100); // Clamp between 0-100
  }
  
  /**
   * Get smart task recommendations based on multiple factors
   */
  getSmartTaskList(limit: number = 10): Task[] {
    const store = useProjectStore.getState();
    const tasks = store.tasks.filter(t => t.status !== 'completed');
    const projects = store.projects;
    
    // Calculate priority for each task
    const tasksWithPriority = tasks.map(task => {
      const project = projects.find(p => p.id === task.projectId);
      const priority = this.calculatePriority(task, project);
      
      return {
        ...task,
        smartPriority: priority,
        project
      };
    });
    
    // Sort by priority and return top N
    return tasksWithPriority
      .sort((a, b) => (b.smartPriority || 0) - (a.smartPriority || 0))
      .slice(0, limit)
      .map(({ project, ...task }) => task);
  }
  
  /**
   * Identify bottlenecks in the project flow
   */
  identifyBottlenecks(): Bottleneck[] {
    const store = useProjectStore.getState();
    const bottlenecks: Bottleneck[] = [];
    
    // 1. Check for blocked tasks
    const blockedTasks = store.tasks.filter(t => t.status === 'blocked' || t.blockedBy?.length > 0);
    if (blockedTasks.length > 0) {
      blockedTasks.forEach(task => {
        bottlenecks.push({
          type: 'task',
          id: task.id,
          name: task.title,
          impact: 'high',
          suggestion: `Unblock "${task.title}" to enable progress on dependent tasks`
        });
      });
    }
    
    // 2. Check for overloaded days
    const tasksByDay = new Map<string, Task[]>();
    store.tasks
      .filter(t => t.status !== 'completed')
      .forEach(task => {
        const day = startOfDay(new Date(task.deadline)).toISOString();
        if (!tasksByDay.has(day)) {
          tasksByDay.set(day, []);
        }
        tasksByDay.get(day)!.push(task);
      });
    
    tasksByDay.forEach((tasks, day) => {
      const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 2), 0);
      if (totalHours > 8) {
        bottlenecks.push({
          type: 'resource',
          id: day,
          name: `Overloaded day: ${new Date(day).toLocaleDateString()}`,
          impact: 'high',
          suggestion: `Redistribute ${totalHours - 8} hours of work from this day`
        });
      }
    });
    
    // 3. Check for projects with too many incomplete tasks
    store.projects.forEach(project => {
      const projectTasks = store.getTasksByProject(project.id);
      const incompleteTasks = projectTasks.filter(t => t.status !== 'completed');
      
      if (incompleteTasks.length > 10) {
        bottlenecks.push({
          type: 'project',
          id: project.id,
          name: project.name,
          impact: 'medium',
          suggestion: `Project has ${incompleteTasks.length} incomplete tasks. Consider breaking down or delegating.`
        });
      }
    });
    
    return bottlenecks;
  }
  
  /**
   * Generate predictions about future workload and risks
   */
  generatePredictions(): Prediction[] {
    const store = useProjectStore.getState();
    const predictions: Prediction[] = [];
    const now = new Date();
    
    // 1. Predict deadline risks
    const upcomingTasks = store.getUpcomingTasks(7);
    const totalEstimatedHours = upcomingTasks.reduce((sum, t) => sum + (t.estimatedHours || 2), 0);
    
    if (totalEstimatedHours > 40) {
      predictions.push({
        type: 'workload',
        message: `Heavy workload ahead: ${totalEstimatedHours} hours of work in the next 7 days`,
        confidence: 0.85,
        suggestedAction: 'Consider rescheduling lower priority tasks or delegating work'
      });
    }
    
    // 2. Predict potential delays
    const overdueTasks = store.getOverdueTasks();
    if (overdueTasks.length > 0) {
      const avgDaysOverdue = overdueTasks.reduce((sum, t) => {
        return sum + Math.abs(differenceInDays(new Date(t.deadline), now));
      }, 0) / overdueTasks.length;
      
      predictions.push({
        type: 'deadline',
        message: `${overdueTasks.length} overdue tasks averaging ${avgDaysOverdue.toFixed(1)} days late`,
        confidence: 1.0,
        suggestedAction: 'Focus on clearing overdue tasks to prevent cascade delays'
      });
    }
    
    // 3. Predict project completion
    store.projects
      .filter(p => p.status === 'in-progress')
      .forEach(project => {
        const tasks = store.getTasksByProject(project.id);
        const completedTasks = tasks.filter(t => t.status === 'completed');
        const completionRate = tasks.length > 0 ? completedTasks.length / tasks.length : 0;
        
        if (project.deadline) {
          const daysToDeadline = differenceInDays(new Date(project.deadline), now);
          const remainingTasks = tasks.length - completedTasks.length;
          
          if (daysToDeadline > 0 && remainingTasks > 0) {
            const requiredDailyRate = remainingTasks / daysToDeadline;
            
            if (requiredDailyRate > 2) {
              predictions.push({
                type: 'risk',
                message: `Project "${project.name}" at risk: need to complete ${requiredDailyRate.toFixed(1)} tasks/day to meet deadline`,
                confidence: 0.75,
                suggestedAction: 'Increase focus on this project or adjust deadline expectations'
              });
            }
          }
        }
      });
    
    return predictions;
  }
  
  /**
   * Get personalized recommendations based on patterns
   */
  getRecommendations(): string[] {
    const store = useProjectStore.getState();
    const recommendations: string[] = [];
    const now = new Date();
    
    // 1. Time of day recommendations
    const hour = now.getHours();
    if (hour >= 9 && hour <= 11) {
      recommendations.push('🧠 Peak focus time: Work on your most challenging tasks now');
    } else if (hour >= 14 && hour <= 15) {
      recommendations.push('☕ Energy dip detected: Consider easier tasks or take a short break');
    } else if (hour >= 16 && hour <= 17) {
      recommendations.push('📧 Good time for communication tasks and planning tomorrow');
    }
    
    // 2. Workload balance
    const todaysTasks = store.getTodaysTasks();
    const tomorrowsTasks = store.tasks.filter(t => {
      const deadline = new Date(t.deadline);
      return differenceInDays(deadline, now) === 1 && t.status !== 'completed';
    });
    
    if (todaysTasks.length === 0 && tomorrowsTasks.length > 3) {
      recommendations.push('📅 Consider starting some of tomorrow\'s tasks today to balance workload');
    }
    
    // 3. Focus recommendations
    const inProgressTasks = store.tasks.filter(t => t.status === 'in-progress');
    if (inProgressTasks.length > 3) {
      recommendations.push('🎯 Too many tasks in progress. Focus on completing 1-2 before starting new ones');
    }
    
    // 4. Review reminders
    const reviewTasks = store.tasks.filter(t => t.status === 'review');
    if (reviewTasks.length > 0) {
      recommendations.push(`👀 ${reviewTasks.length} task(s) awaiting review`);
    }
    
    // 5. Planning recommendations
    const projectsWithoutTasks = store.projects.filter(p => 
      p.status === 'planning' && store.getTasksByProject(p.id).length === 0
    );
    
    if (projectsWithoutTasks.length > 0) {
      recommendations.push(`📝 ${projectsWithoutTasks.length} project(s) need task breakdown`);
    }
    
    return recommendations;
  }
  
  /**
   * Calculate optimal task schedule for the day
   */
  getOptimalSchedule(): Task[] {
    const store = useProjectStore.getState();
    const todaysTasks = store.getTodaysTasks().filter(t => t.status !== 'completed');
    const upcomingUrgent = store.getUpcomingTasks(3)
      .filter(t => this.calculatePriority(t, store.projects.find(p => p.id === t.projectId)) > 70);
    
    // Combine today's tasks with urgent upcoming tasks
    const candidateTasks = [...todaysTasks, ...upcomingUrgent];
    
    // Remove duplicates
    const uniqueTasks = Array.from(
      new Map(candidateTasks.map(t => [t.id, t])).values()
    );
    
    // Sort by smart priority
    return uniqueTasks
      .map(task => ({
        ...task,
        smartPriority: this.calculatePriority(
          task,
          store.projects.find(p => p.id === task.projectId)
        )
      }))
      .sort((a, b) => (b.smartPriority || 0) - (a.smartPriority || 0))
      .slice(0, 8); // Maximum 8 tasks for a sustainable day
  }
  
  /**
   * Analyze productivity patterns
   */
  analyzeProductivityPatterns(): {
    bestDays: string[];
    worstDays: string[];
    averageCompletionTime: number;
    recommendedTasksPerDay: number;
  } {
    const store = useProjectStore.getState();
    const completedTasks = store.tasks.filter(t => t.status === 'completed' && t.completedAt);
    
    // Analyze completion patterns by day
    const completionsByDay = new Map<number, number>();
    completedTasks.forEach(task => {
      if (task.completedAt) {
        const day = new Date(task.completedAt).getDay();
        completionsByDay.set(day, (completionsByDay.get(day) || 0) + 1);
      }
    });
    
    // Find best and worst days
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const sortedDays = Array.from(completionsByDay.entries())
      .sort((a, b) => b[1] - a[1]);
    
    const bestDays = sortedDays.slice(0, 2).map(([day]) => dayNames[day]);
    const worstDays = sortedDays.slice(-2).map(([day]) => dayNames[day]);
    
    // Calculate average completion time
    const completionTimes = completedTasks
      .filter(t => t.actualHours)
      .map(t => t.actualHours!);
    
    const averageCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
      : 2;
    
    // Recommend sustainable tasks per day
    const recommendedTasksPerDay = Math.floor(8 / averageCompletionTime);
    
    return {
      bestDays,
      worstDays,
      averageCompletionTime,
      recommendedTasksPerDay
    };
  }
}

// Export singleton instance
export const taskPriorityEngine = new TaskPriorityEngine();
