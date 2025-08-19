import { useState, useEffect, useMemo } from 'react';
import { MessageSquare, Mail, Phone, CheckCircle2, Activity, Brain } from 'lucide-react';
import { GlowCard } from '@/components/GlowCard';
import { QuickActionsGrid } from '@/features/actions/QuickActionsGrid';
import { NotesPanel } from '@/features/notes/NotesPanel';
import { Agenda } from '@/features/agenda/Agenda';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAgenda } from '@/features/agenda/useAgenda';
import { cn } from '@/lib/utils';

interface Communication {
  id: string;
  type: 'email' | 'sms' | 'whatsapp';
  from: string;
  subject?: string;
  preview: string;
  time: string;
}

export function Dashboard() {
  const [recentComms] = useState<Communication[]>([]);  // No placeholder data - start empty
  const { items } = useAgenda();

  // Calculate completion metrics
  const completionMetrics = useMemo(() => {
    const workItems = items.filter(item => item.tag === 'work');
    const gymItems = items.filter(item => item.tag === 'fitness');
    const nutritionItems = items.filter(item => item.tag === 'nutrition');
    
    const workCompleted = workItems.filter(item => item.completed).length;
    const gymCompleted = gymItems.filter(item => item.completed).length;
    const nutritionCompleted = nutritionItems.filter(item => item.completed).length;
    
    const totalCompleted = items.filter(item => item.completed).length;
    const totalItems = items.length;
    
    return {
      work: { completed: workCompleted, total: workItems.length },
      gym: { completed: gymCompleted, total: gymItems.length },
      nutrition: { completed: nutritionCompleted, total: nutritionItems.length },
      overall: { completed: totalCompleted, total: totalItems },
      percentage: totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0
    };
  }, [items]);

  const getCommIcon = (type: Communication['type']) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <Phone className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1100);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1100);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Agenda Dashboard
        </h1>
        
        {/* Day Completion Bar */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <CompletionIndicator
              icon={<Brain className="w-4 h-4" />}
              label="Work"
              completed={completionMetrics.work.completed}
              total={completionMetrics.work.total}
              color="violet"
            />
            <CompletionIndicator
              icon={<Activity className="w-4 h-4" />}
              label="Gym"
              completed={completionMetrics.gym.completed}
              total={completionMetrics.gym.total}
              color="cyan"
            />
            <CompletionIndicator
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="Nutrition"
              completed={completionMetrics.nutrition.completed}
              total={completionMetrics.nutrition.total}
              color="green"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">
              Day Progress
            </div>
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${completionMetrics.percentage}%` }}
              />
            </div>
            <div className="text-sm font-mono text-muted-foreground">
              {completionMetrics.percentage}%
            </div>
          </div>
        </div>
      </div>

      <div className={`grid gap-6 ${isLargeScreen ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* Left Column */}
        <div className="space-y-6">
          {/* Agenda Section */}
          <div className="card-glow rounded-lg">
            <Agenda />
          </div>

          {/* Quick Actions */}
          <QuickActionsGrid />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Recent Communications */}
          <GlowCard className="p-6" hover>
            <h2 className="text-xl font-semibold mb-4">Recent Communications</h2>
            <ScrollArea className="h-[250px]">
              <div className="space-y-3">
                {recentComms.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No recent messages</p>
                    <p className="text-sm mt-1">Connect your email/SMS in Settings</p>
                  </div>
                ) : (
                  recentComms.map(comm => (
                    <div 
                      key={comm.id} 
                      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer hover-glow"
                    >
                      <div className="mt-1">{getCommIcon(comm.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{comm.from}</span>
                          <span className="text-xs text-muted-foreground">{comm.time}</span>
                        </div>
                        {comm.subject && (
                          <p className="text-sm font-medium mb-1">{comm.subject}</p>
                        )}
                        <p className="text-sm text-muted-foreground truncate">{comm.preview}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </GlowCard>

          {/* Quick Notes */}
          <NotesPanel />
        </div>
      </div>
    </div>
  );
}

// Completion Indicator Component
interface CompletionIndicatorProps {
  icon: React.ReactNode;
  label: string;
  completed: number;
  total: number;
  color: 'violet' | 'cyan' | 'green';
}

function CompletionIndicator({ icon, label, completed, total, color }: CompletionIndicatorProps) {
  const isComplete = completed === total && total > 0;
  
  const colorClasses = {
    violet: 'text-primary border-primary',
    cyan: 'text-accent border-accent',
    green: 'text-green-500 border-green-500'
  };
  
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
      isComplete ? colorClasses[color] : 'border-muted text-muted-foreground',
      isComplete && color === 'violet' && 'glow-primary',
      isComplete && color === 'cyan' && 'glow-success',
      "transition-all duration-300"
    )}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs font-mono">
        {completed}/{total}
      </span>
    </div>
  );
}