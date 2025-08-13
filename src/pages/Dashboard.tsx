import { useState, useEffect } from 'react';
import { MessageSquare, Mail, Phone } from 'lucide-react';
import { GlowCard } from '@/components/GlowCard';
import { QuickActionsGrid } from '@/features/actions/QuickActionsGrid';
import { NotesPanel } from '@/features/notes/NotesPanel';
import { Agenda } from '@/features/agenda/Agenda';
import { ScrollArea } from '@/components/ui/scroll-area';

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
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
        Agenda Dashboard
      </h1>

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