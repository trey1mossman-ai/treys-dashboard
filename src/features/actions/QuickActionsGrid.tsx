import React, { useState, useEffect } from 'react';
import { Play, Edit2, Trash2, Plus, Zap, Send } from 'lucide-react';
import { quickActionsService } from '@/services/quickActions';
import { GlowCard } from '@/components/GlowCard';
import { IconButton } from '@/components/IconButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CreateActionDialog } from './CreateActionDialog';
import { EditActionDialog } from './EditActionDialog';
import { RunPayloadDialog } from './RunPayloadDialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { QuickAction } from './types';

export const QuickActionsGrid: React.FC = () => {
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAction, setEditAction] = useState<QuickAction | null>(null);
  const [runAction, setRunAction] = useState<QuickAction | null>(null);
  const [deleteAction, setDeleteAction] = useState<QuickAction | null>(null);
  const { toast } = useToast();

  const loadActions = async () => {
    try {
      setLoading(true);
      const data = await quickActionsService.list();
      setActions(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load quick actions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, []);

  const handleCreate = async (action: Omit<QuickAction, 'id' | 'created_at'>) => {
    try {
      await quickActionsService.create(action);
      toast({
        title: 'Success',
        description: 'Quick action created successfully'
      });
      loadActions();
      setCreateOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create quick action',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = async (action: QuickAction) => {
    try {
      await quickActionsService.update(action);
      toast({
        title: 'Success',
        description: 'Quick action updated successfully'
      });
      loadActions();
      setEditAction(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update quick action',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteAction) return;
    try {
      await quickActionsService.delete(deleteAction.id);
      toast({
        title: 'Success',
        description: 'Quick action deleted successfully'
      });
      loadActions();
      setDeleteAction(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete quick action',
        variant: 'destructive'
      });
    }
  };

  const handleRun = async (payload?: any) => {
    if (!runAction) return;
    try {
      const result = await quickActionsService.execute(runAction.id, payload);
      if (result.ok) {
        toast({
          title: 'Success',
          description: `Action executed successfully (Status: ${result.status || 200})`
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Action execution failed',
          variant: 'destructive'
        });
      }
      setRunAction(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to execute action',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Quick Actions
        </h2>
        <IconButton
          icon={<Plus className="h-4 w-4" />}
          label="Create Automation"
          onClick={() => setCreateOpen(true)}
          variant="default"
          size="sm"
          className="hover-glow"
        >
          Create Automation
        </IconButton>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <GlowCard key={i} className="h-32 animate-pulse bg-muted">
              <div />
            </GlowCard>
          ))}
        </div>
      ) : actions.length === 0 ? (
        <GlowCard className="p-8 text-center text-muted-foreground">
          <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No quick actions yet</p>
          <p className="text-sm mt-2">Create your first automation to get started</p>
        </GlowCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map(action => (
            <GlowCard 
              key={action.id} 
              className="p-4 hover-glow cursor-pointer group"
              onClick={() => setRunAction(action)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-base">{action.name}</h3>
                  <Badge variant="outline" className="mt-1">
                    {action.method}
                  </Badge>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconButton
                    icon={<Play className="h-3 w-3" />}
                    label="Run"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRunAction(action);
                    }}
                  />
                  <IconButton
                    icon={<Edit2 className="h-3 w-3" />}
                    label="Edit"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditAction(action);
                    }}
                  />
                  <IconButton
                    icon={<Trash2 className="h-3 w-3" />}
                    label="Delete"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteAction(action);
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {action.webhook_url}
              </p>
              {action.default_payload && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Send className="h-3 w-3" />
                  Has default payload
                </div>
              )}
            </GlowCard>
          ))}
        </div>
      )}

      <CreateActionDialog 
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      {editAction && (
        <EditActionDialog
          open={!!editAction}
          onOpenChange={(open) => !open && setEditAction(null)}
          action={editAction}
          onSubmit={handleEdit}
        />
      )}

      {runAction && (
        <RunPayloadDialog
          open={!!runAction}
          onOpenChange={(open) => !open && setRunAction(null)}
          action={runAction}
          onRun={handleRun}
        />
      )}

      <ConfirmDialog
        open={!!deleteAction}
        onOpenChange={(open) => !open && setDeleteAction(null)}
        title="Delete Quick Action"
        description={`Are you sure you want to delete "${deleteAction?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
};