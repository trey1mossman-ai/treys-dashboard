import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Play, Zap } from 'lucide-react';
import type { QuickAction } from './types';

interface RunPayloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: QuickAction;
  onRun: (payload?: any) => void;
}

export const RunPayloadDialog: React.FC<RunPayloadDialogProps> = ({
  open,
  onOpenChange,
  action,
  onRun
}) => {
  const [payload, setPayload] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (action?.default_payload) {
      setPayload(JSON.stringify(action.default_payload, null, 2));
    } else {
      setPayload('');
    }
    setError('');
  }, [action]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (payload) {
      try {
        const parsedPayload = JSON.parse(payload);
        onRun(parsedPayload);
        setPayload('');
        setError('');
      } catch {
        setError('Invalid JSON format');
        return;
      }
    } else {
      onRun(undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-glow" onKeyDown={handleKeyDown}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Run: {action?.name}
            </DialogTitle>
            <DialogDescription>
              {action?.method === 'POST' 
                ? 'Optionally provide a payload to send with the webhook'
                : 'This will execute the GET request to the configured webhook'}
            </DialogDescription>
          </DialogHeader>

          {action?.method === 'POST' && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="payload">
                  Run Payload (Optional)
                  {action.default_payload && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Using default payload)
                    </span>
                  )}
                </Label>
                <Textarea
                  id="payload"
                  value={payload}
                  onChange={(e) => {
                    setPayload(e.target.value);
                    setError('');
                  }}
                  placeholder={action.default_payload ? 'Override the default payload...' : '{"key": "value"}'}
                  rows={8}
                  className={error ? 'border-destructive font-mono text-sm' : 'font-mono text-sm'}
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Press Cmd/Ctrl + Enter to run
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="hover-glow">
              <Play className="h-4 w-4 mr-2" />
              Run Action
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};