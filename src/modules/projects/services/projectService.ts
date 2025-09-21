// Project Service - Core Project Management Logic
// Team Lead: Claude - Module Services

import { lifeDB, Project, UnifiedTask, Contact } from '@/services/lifeOS-db';
import { eventBus, LifeOSEvents, CRUDEventEmitter } from '@/services/eventBus';

interface EmailMessage {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  date: Date;
}

interface TaskExtractionResult {
  confidence: number;
  task: Partial<UnifiedTask>;
  reasoning?: string;
}

class ProjectService {
  private emailScanInterval?: NodeJS.Timeout;
  private projectEvents = new CRUDEventEmitter('project');
  private taskEvents = new CRUDEventEmitter('task');
  
  // ========== PROJECT OPERATIONS ==========
  
  async createProject(data: Partial<Project>): Promise<Project> {
    const project: Project = {
      id: crypto.randomUUID(),
      title: data.title || 'New Project',
      description: data.description,
      status: data.status || 'active',
      contacts: data.contacts || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completionPercent: 0,
      priority: data.priority || 'medium',
      revenue: data.revenue,
      cost: data.cost,
      tags: data.tags || []
    };
    
    await lifeDB.projects.add(project);
    this.projectEvents.created(project);
    
    return project;
  }
  
  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    await lifeDB.projects.update(id, {
      ...updates,
      updatedAt: Date.now()
    });
    
    const project = await lifeDB.projects.get(id);
    if (project) {
      this.projectEvents.updated(project);
    }
  }
  
  async getProjectWithStats(projectId: string) {
    const project = await lifeDB.projects.get(projectId);
    if (!project) return null;
    
    const tasks = await lifeDB.tasks
      .where('projectId')
      .equals(projectId)
      .toArray();
    
    const stats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'done').length,
      overdueTasks: tasks.filter(t => 
        t.dueAt && t.dueAt < Date.now() && t.status !== 'done'
      ).length,
      upcomingTasks: tasks.filter(t =>
        t.dueAt && t.dueAt > Date.now() && t.dueAt < Date.now() + 7 * 24 * 60 * 60 * 1000
      ).length
    };
    
    return { ...project, stats };
  }
  
  // ========== TASK OPERATIONS ==========
  
  async addTaskToProject(
    projectId: string,
    taskData: Partial<UnifiedTask> & {
      dueAt?: UnifiedTask['dueAt'] | string | Date;
      scheduledFor?: UnifiedTask['scheduledFor'] | string | Date;
    }
  ): Promise<UnifiedTask> {
    // Fix date handling to prevent validation errors when strings are passed from forms
    const normalizeTimestamp = (value: UnifiedTask['dueAt'] | Date | string | undefined) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === 'number') {
        return Number.isNaN(value) ? undefined : value;
      }

      const parsed = new Date(value).getTime();
      return Number.isNaN(parsed) ? undefined : parsed;
    };

    const dueAt = normalizeTimestamp(taskData.dueAt as any);
    const scheduledFor = normalizeTimestamp(taskData.scheduledFor as any);

    const tags = taskData.tags ?? [];

    const task: UnifiedTask = {
      id: crypto.randomUUID(),
      title: taskData.title || '',
      description: taskData.description,
      projectId,
      source: taskData.source || 'project',
      status: 'todo',
      priority: taskData.priority || 'B',
      effortMinutes: taskData.effortMinutes,
      ...taskData,
      // Override dates with validated versions
      dueAt,
      scheduledFor,
      tags
    };
    
    await lifeDB.tasks.add(task);
    this.taskEvents.created(task);
    
    await this.updateProjectCompletion(projectId);
    
    return task;
  }
  
  async completeTask(taskId: string, notify: boolean = false): Promise<void> {
    const task = await lifeDB.tasks.get(taskId);
    if (!task) return;
    
    await lifeDB.tasks.update(taskId, {
      status: 'done',
      completedAt: Date.now()
    });
    
    this.taskEvents.updated({ ...task, status: 'done' });
    
    if (task.projectId) {
      await this.updateProjectCompletion(task.projectId);
      
      if (notify) {
        await this.notifyStakeholders(task.projectId, task, 'completed');
      }
    }
  }
  
  private async updateProjectCompletion(projectId: string): Promise<void> {
    const tasks = await lifeDB.tasks
      .where('projectId')
      .equals(projectId)
      .toArray();
    
    const completed = tasks.filter(t => t.status === 'done').length;
    const total = tasks.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    await lifeDB.projects.update(projectId, {
      completionPercent: percent,
      updatedAt: Date.now()
    });
    
    eventBus.emit(LifeOSEvents.PROJECT_UPDATED, { projectId, completionPercent: percent });
  }
  
  // ========== EMAIL SCANNING ==========
  
  async startEmailScanner(): Promise<void> {
    await this.scanEmailsForTasks();
    
    this.emailScanInterval = setInterval(async () => {
      const hour = new Date().getHours();
      if (hour >= 8 && hour <= 18) {
        await this.scanEmailsForTasks();
      }
    }, 3 * 60 * 60 * 1000);
    
    console.log('Email scanner started');
  }
  
  stopEmailScanner(): void {
    if (this.emailScanInterval) {
      clearInterval(this.emailScanInterval);
      this.emailScanInterval = undefined;
    }
  }
  
  async scanEmailsForTasks(): Promise<void> {
    eventBus.emit(LifeOSEvents.EMAIL_SCANNED, { timestamp: Date.now() });
    
    // Mock implementation for now - will be replaced with Gmail API
    const emails = await this.fetchRecentEmails();
    
    for (const email of emails) {
      const extraction = this.extractTaskFromEmail(email);
      
      if (extraction.confidence > 0.8) {
        await this.createTaskFromEmail(email, extraction);
      } else if (extraction.confidence > 0.5) {
        eventBus.emit('task.review_needed', {
          email,
          extraction,
          confidence: extraction.confidence
        });
      }
    }
  }
  
  private async fetchRecentEmails(): Promise<EmailMessage[]> {
    // Mock implementation
    return [
      {
        id: '1',
        from: 'client@example.com',
        to: ['me@example.com'],
        subject: 'Please send the proposal by Friday',
        body: 'Hi, could you send the updated proposal with pricing by end of day Friday?',
        date: new Date()
      }
    ];
  }
  
  private extractTaskFromEmail(email: EmailMessage): TaskExtractionResult {
    const actionKeywords = [
      'please', 'send', 'review', 'update', 'fix', 'complete',
      'by', 'before', 'deadline', 'urgent', 'asap', 'tomorrow',
      'deliver', 'submit', 'prepare', 'schedule', 'call', 'meet'
    ];
    
    const subjectLower = email.subject.toLowerCase();
    const bodyLower = email.body.toLowerCase();
    const combinedText = `${subjectLower} ${bodyLower}`;
    
    const matches = actionKeywords.filter(keyword => 
      combinedText.includes(keyword)
    );
    
    const confidence = Math.min(matches.length / 5, 1);
    const dueDate = this.extractDueDate(combinedText);
    const priority = combinedText.includes('urgent') || combinedText.includes('asap') ? 'A' : 'B';
    
    return {
      confidence,
      task: {
        title: email.subject,
        description: email.body,
        source: 'email',
        priority,
        dueAt: dueDate?.getTime(),
        sourceRef: email.id
      },
      reasoning: `Found ${matches.length} action keywords`
    };
  }
  
  private extractDueDate(text: string): Date | null {
    const now = new Date();
    
    if (text.includes('tomorrow')) {
      const date = new Date(now);
      date.setDate(date.getDate() + 1);
      return date;
    }
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (let i = 0; i < days.length; i++) {
      if (text.includes(days[i])) {
        const date = new Date(now);
        const currentDay = date.getDay();
        const targetDay = i === 6 ? 0 : i + 1;
        const daysAhead = (targetDay - currentDay + 7) % 7 || 7;
        date.setDate(date.getDate() + daysAhead);
        return date;
      }
    }
    
    if (text.includes('end of week') || text.includes('eow')) {
      const date = new Date(now);
      const friday = 5;
      const daysUntilFriday = (friday - date.getDay() + 7) % 7 || 7;
      date.setDate(date.getDate() + daysUntilFriday);
      return date;
    }
    
    return null;
  }
  
  private async createTaskFromEmail(
    email: EmailMessage,
    extraction: TaskExtractionResult
  ): Promise<void> {
    let inboxProject = await lifeDB.projects
      .where('title')
      .equals('Inbox')
      .first();
    
    if (!inboxProject) {
      inboxProject = await this.createProject({
        title: 'Inbox',
        description: 'Tasks extracted from email',
        priority: 'high'
      });
    }
    
    await this.addTaskToProject(inboxProject.id, extraction.task);
    
    eventBus.emit(LifeOSEvents.TASK_EXTRACTED, {
      emailId: email.id,
      task: extraction.task,
      confidence: extraction.confidence
    });
  }
  
  // ========== NOTIFICATIONS ==========
  
  async notifyStakeholders(
    projectId: string,
    task: UnifiedTask,
    action: 'completed' | 'created' | 'updated'
  ): Promise<void> {
    const project = await lifeDB.projects.get(projectId);
    if (!project || project.contacts.length === 0) return;
    
    const contacts = await lifeDB.contacts
      .where('id')
      .anyOf(project.contacts)
      .toArray();
    
    const emailData = {
      to: contacts.map(c => c.email).filter(Boolean),
      subject: `Task ${action}: ${task.title}`,
      body: this.generateTaskUpdateEmail(project, task, action),
      projectId,
      taskId: task.id
    };
    
    eventBus.emit(LifeOSEvents.EMAIL_SEND, emailData);
  }
  
  private generateTaskUpdateEmail(
    project: Project,
    task: UnifiedTask,
    action: string
  ): string {
    return `
Hello,

This is an update from project "${project.title}".

Task ${action}: ${task.title}

${task.description ? `Description: ${task.description}` : ''}

Project Progress: ${project.completionPercent}% complete

Best regards,
Life OS
    `.trim();
  }
  
  async getActiveProjects(): Promise<Project[]> {
    return lifeDB.getActiveProjects();
  }
  
  async getProjectTasks(projectId: string): Promise<UnifiedTask[]> {
    return lifeDB.tasks
      .where('projectId')
      .equals(projectId)
      .toArray();
  }
}

export const projectService = new ProjectService();

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).projectService = projectService;
}
