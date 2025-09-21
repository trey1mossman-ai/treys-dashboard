import React, { useState, useEffect, useMemo } from 'react';
import { ProjectList } from '@/modules/projects/components/ProjectList';
import { TimelineView } from '@/modules/timeline/components/TimelineView';
import { projectService } from '@/modules/projects/services/projectService';
import { timelineService } from '@/modules/timeline/services/timelineService';
import { Project, UnifiedTask } from '@/services/lifeOS-db';
import { SimpleDashboard } from '@/pages/SimpleDashboard';
import { webhookService } from '@/services/webhookService';
import { RefreshCw, Mail, Calendar, Bot } from 'lucide-react';

interface TabConfig {
  id: string;
  label: string;
  icon: string;
}

const tabs: TabConfig[] = [
  { id: 'timeline', label: 'Timeline', icon: '📅' },
  { id: 'projects', label: 'Projects', icon: '🚀' },
  { id: 'inbox', label: 'Inbox', icon: '📬' },
  { id: 'fitness', label: 'Fitness', icon: '💪' },
  { id: 'knowledge', label: 'Knowledge', icon: '🧠' },
];

export function LifeOS() {
  const [activeTab, setActiveTab] = useState('timeline');
  const [projects, setProjects] = useState<Project[]>([]);
  const [todayTasks, setTodayTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [webhookStates, setWebhookStates] = useState<Record<keyof typeof WEBHOOK_URLS, {
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
    timestamp?: number;
  }>>({
    email: { status: 'idle' },
    calendar: { status: 'idle' },
    agent: { status: 'idle' }
  });

  useEffect(() => {
    let isMounted = true;

    loadData();
    projectService.startEmailScanner();

    const initializeWebhooks = async () => {
      const keys = Object.keys(WEBHOOK_URLS) as Array<keyof typeof WEBHOOK_URLS>;
      for (const key of keys) {
        try {
          await webhookService.ping(key);
          if (!isMounted) return;
          setWebhookStates(prev => ({
            ...prev,
            [key]: {
              status: 'success',
              message: 'Connected',
              timestamp: Date.now()
            }
          }));
        } catch (error) {
          if (!isMounted) return;
          setWebhookStates(prev => ({
            ...prev,
            [key]: {
              status: 'error',
              message: error instanceof Error ? error.message : 'Unable to reach webhook'
            }
          }));
        }
      }
    };

    initializeWebhooks();

    return () => {
      isMounted = false;
      projectService.stopEmailScanner();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsData, tasksData] = await Promise.all([
        projectService.getActiveProjects(),
        timelineService.getTodaysTasks()
      ]);
      setProjects(projectsData);
      setTodayTasks(tasksData);
    } catch (error) {
      console.error('Error loading Life OS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreate = async (title: string, description?: string) => {
    await projectService.createProject({ title, description });
    await loadData();
  };

  const handleTaskComplete = async (taskId: string) => {
    await timelineService.completeTask(taskId, true);
    await loadData();
  };

const handleTaskSchedule = async (taskId: string, date: Date) => {
  await timelineService.scheduleTask(taskId, date);
  await loadData();
};

const triggerWebhook = async (type: keyof typeof WEBHOOK_URLS) => {
    setWebhookStates(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        status: 'loading',
        message: undefined
      }
    }));

    try {
      let message = 'Webhook executed';

      if (type === 'email') {
        const payload = await webhookService.fetchEmails();
        const count = Array.isArray(payload?.emails) ? payload.emails.length : Array.isArray(payload) ? payload.length : 0;
        message = `Fetched ${count} emails`;
      } else if (type === 'calendar') {
        const payload = await webhookService.fetchCalendar();
        const count = Array.isArray(payload?.events) ? payload.events.length : Array.isArray(payload) ? payload.length : 0;
        message = `Fetched ${count} events`;
      } else if (type === 'agent') {
        const response = await webhookService.sendToAgent('Life OS connectivity check');
        message = typeof response === 'string'
          ? response
          : response?.status || response?.message || 'Agent ping sent';
      }

      setWebhookStates(prev => ({
        ...prev,
        [type]: {
          status: 'success',
          message,
          timestamp: Date.now()
        }
      }));
    } catch (error) {
      setWebhookStates(prev => ({
        ...prev,
        [type]: {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
  };

  const webhookCards = useMemo(() => ([
    {
      id: 'email' as const,
      title: 'Email Webhook',
      description: 'Refreshes the n8n email inbox and syncs new actions into Life OS.',
      actionLabel: 'Fetch Emails'
    },
    {
      id: 'calendar' as const,
      title: 'Calendar Webhook',
      description: 'Pulls the latest Google Calendar events for scheduling decisions.',
      actionLabel: 'Fetch Events'
    },
    {
      id: 'agent' as const,
      title: 'AI Agent',
      description: 'Reconnects the n8n automation agent for task routing and responses.',
      actionLabel: 'Ping Agent'
    }
  ]), []);

  const refreshAllWebhooks = () => webhookCards.forEach(card => triggerWebhook(card.id));

  const getIndicatorClass = (state: (typeof webhookStates)[keyof typeof WEBHOOK_URLS]) => {
    switch (state.status) {
      case 'success':
        return 'bg-green-400';
      case 'error':
        return 'bg-red-400';
      case 'loading':
        return 'bg-yellow-400';
      default:
        return 'bg-white/40';
    }
  };

  const renderWebhookPanel = () => (
    <div className="mt-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Automation Webhooks</h3>
            <p className="text-sm text-white/70">Manually reconnect email, calendar, and agent workflows.</p>
          </div>
          <button
            onClick={refreshAllWebhooks}
            className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            Refresh All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {webhookCards.map((card) => {
            const state = webhookStates[card.id];
            const isLoading = state.status === 'loading';
            const timestamp = state.timestamp ? new Date(state.timestamp).toLocaleTimeString() : null;

            return (
              <div key={card.id} className="bg-black/30 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                <div>
                  <h4 className="text-white font-semibold">{card.title}</h4>
                  <p className="text-sm text-white/60 mt-1">{card.description}</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={`px-2 py-1 rounded-full ${
                      state.status === 'success' ? 'bg-green-500/20 text-green-300' :
                      state.status === 'error' ? 'bg-red-500/20 text-red-300' :
                      state.status === 'loading' ? 'bg-yellow-500/20 text-yellow-200' :
                      'bg-white/10 text-white/70'
                    }`}
                  >
                    {state.status === 'idle' && 'Idle'}
                    {state.status === 'loading' && 'Refreshing...'}
                    {state.status === 'success' && 'Connected'}
                    {state.status === 'error' && 'Failed'}
                  </span>
                  {timestamp && (
                    <span className="text-white/50">{timestamp}</span>
                  )}
                </div>
                {state.message && (
                  <p className="text-xs text-white/60">{state.message}</p>
                )}
                <div className="mt-auto">
                  <button
                    onClick={() => triggerWebhook(card.id)}
                    disabled={isLoading}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isLoading ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {isLoading ? 'Working...' : card.actionLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'timeline':
        return (
          <TimelineView
            tasks={todayTasks}
            onTaskComplete={handleTaskComplete}
            onTaskSchedule={handleTaskSchedule}
            onRefresh={loadData}
          />
        );

      case 'projects':
        return (
          <ProjectList
            projects={projects}
            onProjectCreate={handleProjectCreate}
            onRefresh={loadData}
          />
        );

      case 'inbox':
        return <SimpleDashboard />;

      case 'fitness':
        return (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-4">💪</div>
            <h3 className="text-xl font-semibold mb-2">Fitness Module</h3>
            <p>Coming soon: Training cycles, nutrition tracking, recovery optimization</p>
          </div>
        );

      case 'knowledge':
        return (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-xl font-semibold mb-2">Knowledge Hub</h3>
            <p>Coming soon: Quick capture, AI summaries, project linking</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-3xl">🧬</span>
              Life OS
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${getIndicatorClass(webhookStates.email)}`} />
                <Mail className="w-4 h-4 text-white/70" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${getIndicatorClass(webhookStates.calendar)}`} />
                <Calendar className="w-4 h-4 text-white/70" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${getIndicatorClass(webhookStates.agent)}`} />
                <Bot className="w-4 h-4 text-white/70" />
              </div>
              <button
                onClick={refreshAllWebhooks}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all flex items-center gap-2 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <div className="text-sm text-white/70">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="border-b border-white/10 bg-black/10 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-6 py-3 font-medium transition-all duration-200
                  ${activeTab === tab.id
                    ? 'text-white border-b-2 border-blue-400 bg-white/10'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg shadow-2xl">
          {renderContent()}
        </div>
        {renderWebhookPanel()}
      </main>

      <footer className="mt-8 pb-4 text-center text-white/50 text-sm">
        Life OS v1.0 • Backend Services Active • Email Scanner Running
      </footer>
    </div>
  );
}
