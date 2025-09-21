// Timeline Service - Unified Task Management
// Team Lead: Claude - Core Infrastructure

import { lifeDB, UnifiedTask } from '@/services/lifeOS-db';
import { eventBus, LifeOSEvents } from '@/services/eventBus';

interface TimeBlock {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  tasks: UnifiedTask[];
  type: 'work' | 'personal' | 'fitness' | 'break';
}

interface DayPlan {
  date: Date;
  blocks: TimeBlock[];
  unscheduledTasks: UnifiedTask[];
  totalPlannedMinutes: number;
  totalAvailableMinutes: number;
}

class TimelineService {
  // ========== TASK RETRIEVAL ==========
  
  async getTodaysTasks(): Promise<UnifiedTask[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get scheduled tasks for today
    const scheduled = await lifeDB.tasks
      .where('scheduledFor')
      .between(today.getTime(), tomorrow.getTime())
      .toArray();
    
    // Get overdue tasks
    const overdue = await lifeDB.tasks
      .where('dueAt')
      .below(today.getTime())
      .and(task => task.status !== 'done')
      .toArray();
    
    // Get high priority unscheduled tasks
    const highPriority = await lifeDB.tasks
      .where('priority')
      .equals('A')
      .and(task => !task.scheduledFor && task.status !== 'done')
      .toArray();
    
    // Combine and deduplicate
    const allTasks = [...scheduled, ...overdue, ...highPriority];
    const uniqueTasks = Array.from(
      new Map(allTasks.map(task => [task.id, task])).values()
    );
    
    return this.sortByPriority(uniqueTasks);
  }
  
  async getWeekTasks(): Promise<Map<string, UnifiedTask[]>> {
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    
    const tasks = await lifeDB.tasks
      .where('scheduledFor')
      .between(startOfWeek.getTime(), endOfWeek.getTime())
      .toArray();
    
    // Group by day
    const tasksByDay = new Map<string, UnifiedTask[]>();
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      const dayKey = day.toISOString().split('T')[0];
      tasksByDay.set(dayKey, []);
    }
    
    tasks.forEach(task => {
      if (task.scheduledFor) {
        const dayKey = new Date(task.scheduledFor).toISOString().split('T')[0];
        const dayTasks = tasksByDay.get(dayKey) || [];
        dayTasks.push(task);
        tasksByDay.set(dayKey, dayTasks);
      }
    });
    
    return tasksByDay;
  }
  
  // ========== SCHEDULING ==========
  
  async scheduleTask(taskId: string, scheduledFor: Date): Promise<void> {
    await lifeDB.tasks.update(taskId, {
      scheduledFor: scheduledFor.getTime()
    });
    
    eventBus.emit(LifeOSEvents.TASK_SCHEDULED, {
      taskId,
      scheduledFor
    });
  }
  
  async rescheduleTask(taskId: string, newTime: Date): Promise<void> {
    const task = await lifeDB.tasks.get(taskId);
    if (!task) return;
    
    const oldTime = task.scheduledFor;
    await this.scheduleTask(taskId, newTime);
    
    eventBus.emit('task.rescheduled', {
      taskId,
      oldTime,
      newTime: newTime.getTime()
    });
  }
  
  async batchScheduleTasks(schedules: Array<{ taskId: string; time: Date }>): Promise<void> {
    for (const { taskId, time } of schedules) {
      await lifeDB.tasks.update(taskId, {
        scheduledFor: time.getTime()
      });
    }
    
    eventBus.emit(LifeOSEvents.TASKS_BATCH_UPDATE, {
      count: schedules.length,
      type: 'scheduled'
    });
  }
  
  // ========== TIME BLOCKING ==========
  
  async createTimeBlock(duration: number, startTime?: Date): Promise<TimeBlock> {
    const start = startTime || new Date();
    const end = new Date(start.getTime() + duration * 60 * 1000);
    
    // Get unscheduled tasks that fit
    const tasks = await this.findTasksForTimeBlock(duration);
    
    const block: TimeBlock = {
      id: crypto.randomUUID(),
      startTime: start,
      endTime: end,
      duration,
      tasks,
      type: this.determineBlockType(tasks)
    };
    
    // Schedule the tasks
    for (const task of tasks) {
      await this.scheduleTask(task.id, start);
    }
    
    return block;
  }
  
  private async findTasksForTimeBlock(durationMinutes: number): Promise<UnifiedTask[]> {
    const tasks = await this.getTodaysTasks();
    const unscheduled = tasks.filter(t => !t.scheduledFor && t.status !== 'done');
    
    const selectedTasks: UnifiedTask[] = [];
    let remainingMinutes = durationMinutes;
    
    // First, try to fit priority A tasks
    for (const task of unscheduled.filter(t => t.priority === 'A')) {
      const taskTime = task.effortMinutes || 30;
      if (taskTime <= remainingMinutes) {
        selectedTasks.push(task);
        remainingMinutes -= taskTime;
      }
    }
    
    // Then B priority
    for (const task of unscheduled.filter(t => t.priority === 'B')) {
      const taskTime = task.effortMinutes || 30;
      if (taskTime <= remainingMinutes) {
        selectedTasks.push(task);
        remainingMinutes -= taskTime;
      }
    }
    
    // Finally C priority if space remains
    for (const task of unscheduled.filter(t => t.priority === 'C')) {
      const taskTime = task.effortMinutes || 30;
      if (taskTime <= remainingMinutes) {
        selectedTasks.push(task);
        remainingMinutes -= taskTime;
      }
      
      if (remainingMinutes < 15) break; // Minimum task time
    }
    
    return selectedTasks;
  }
  
  private determineBlockType(tasks: UnifiedTask[]): TimeBlock['type'] {
    const sources = tasks.map(t => t.source);
    if (sources.includes('fitness')) return 'fitness';
    if (sources.includes('personal')) return 'personal';
    return 'work';
  }
  
  // ========== DAY PLANNING ==========
  
  async generateDayPlan(date?: Date): Promise<DayPlan> {
    const planDate = date || new Date();
    planDate.setHours(0, 0, 0, 0);
    
    const tasks = await this.getTodaysTasks();
    const scheduled = tasks.filter(t => t.scheduledFor);
    const unscheduled = tasks.filter(t => !t.scheduledFor);
    
    // Create time blocks for the day (9 AM to 6 PM default)
    const blocks: TimeBlock[] = [];
    const workStart = new Date(planDate);
    workStart.setHours(9, 0, 0, 0);
    
    const workEnd = new Date(planDate);
    workEnd.setHours(18, 0, 0, 0);
    
    // Morning block (9 AM - 12 PM)
    const morningBlock: TimeBlock = {
      id: crypto.randomUUID(),
      startTime: new Date(workStart),
      endTime: new Date(workStart.getTime() + 3 * 60 * 60 * 1000),
      duration: 180,
      tasks: scheduled.filter(t => {
        const taskTime = new Date(t.scheduledFor!);
        return taskTime >= workStart && taskTime < new Date(workStart.getTime() + 3 * 60 * 60 * 1000);
      }),
      type: 'work'
    };
    blocks.push(morningBlock);
    
    // Afternoon block (1 PM - 5 PM)
    const afternoonStart = new Date(planDate);
    afternoonStart.setHours(13, 0, 0, 0);
    
    const afternoonBlock: TimeBlock = {
      id: crypto.randomUUID(),
      startTime: afternoonStart,
      endTime: new Date(afternoonStart.getTime() + 4 * 60 * 60 * 1000),
      duration: 240,
      tasks: scheduled.filter(t => {
        const taskTime = new Date(t.scheduledFor!);
        return taskTime >= afternoonStart && taskTime < new Date(afternoonStart.getTime() + 4 * 60 * 60 * 1000);
      }),
      type: 'work'
    };
    blocks.push(afternoonBlock);
    
    // Calculate metrics
    const totalPlannedMinutes = scheduled.reduce((sum, task) => 
      sum + (task.effortMinutes || 30), 0
    );
    
    const totalAvailableMinutes = 9 * 60; // 9 hours
    
    return {
      date: planDate,
      blocks,
      unscheduledTasks: unscheduled,
      totalPlannedMinutes,
      totalAvailableMinutes
    };
  }
  
  // ========== TASK OPERATIONS ==========
  
  async completeTask(taskId: string, notifyStakeholders: boolean = false): Promise<void> {
    const task = await lifeDB.tasks.get(taskId);
    if (!task) return;
    
    await lifeDB.tasks.update(taskId, {
      status: 'done',
      completedAt: Date.now()
    });
    
    eventBus.emit(LifeOSEvents.TASK_COMPLETED, task);
    
    if (notifyStakeholders && task.projectId) {
      eventBus.emit('stakeholder.notify', {
        projectId: task.projectId,
        task,
        action: 'completed'
      });
    }
  }
  
  async updateTaskPriority(taskId: string, priority: 'A' | 'B' | 'C'): Promise<void> {
    await lifeDB.tasks.update(taskId, { priority });
    eventBus.emit(LifeOSEvents.TASK_UPDATED, { taskId, priority });
  }
  
  async updateTaskEffort(taskId: string, effortMinutes: number): Promise<void> {
    await lifeDB.tasks.update(taskId, { effortMinutes });
    eventBus.emit(LifeOSEvents.TASK_UPDATED, { taskId, effortMinutes });
  }
  
  // ========== HELPERS ==========
  
  private sortByPriority(tasks: UnifiedTask[]): UnifiedTask[] {
    const priorityOrder = { 'A': 0, 'B': 1, 'C': 2 };
    
    return tasks.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by due date
      if (a.dueAt && b.dueAt) {
        return a.dueAt - b.dueAt;
      }
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      
      // Then by scheduled time
      if (a.scheduledFor && b.scheduledFor) {
        return a.scheduledFor - b.scheduledFor;
      }
      if (a.scheduledFor) return -1;
      if (b.scheduledFor) return 1;
      
      return 0;
    });
  }
  
  // ========== STATISTICS ==========
  
  async getProductivityStats(days: number = 7): Promise<any> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const completedTasks = await lifeDB.tasks
      .where('completedAt')
      .above(since.getTime())
      .toArray();
    
    const totalTasks = await lifeDB.tasks
      .where('createdAt')
      .above(since.getTime())
      .toArray();
    
    return {
      completionRate: totalTasks.length > 0 
        ? Math.round((completedTasks.length / totalTasks.length) * 100)
        : 0,
      tasksCompleted: completedTasks.length,
      tasksCreated: totalTasks.length,
      averageCompletionTime: this.calculateAverageCompletionTime(completedTasks),
      tasksByPriority: this.groupTasksByPriority(completedTasks)
    };
  }
  
  private calculateAverageCompletionTime(tasks: UnifiedTask[]): number {
    const times = tasks
      .filter(t => t.completedAt && t.createdAt)
      .map(t => t.completedAt! - (t.createdAt || 0));
    
    if (times.length === 0) return 0;
    
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    return Math.round(average / (1000 * 60 * 60)); // Convert to hours
  }
  
  private groupTasksByPriority(tasks: UnifiedTask[]) {
    return {
      A: tasks.filter(t => t.priority === 'A').length,
      B: tasks.filter(t => t.priority === 'B').length,
      C: tasks.filter(t => t.priority === 'C').length
    };
  }
}

// Create and export singleton
export const timelineService = new TimelineService();

// Make available for debugging
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).timelineService = timelineService;
}
