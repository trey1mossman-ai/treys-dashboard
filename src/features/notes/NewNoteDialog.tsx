import React, { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StickyNote } from 'lucide-react';
import { NOTE_TAGS } from './types';

interface NewNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: string, tag?: string) => void;
}

export const NewNoteDialog: React.FC<NewNoteDialogProps> = ({
  open,
  onOpenChange,
  onSubmit
}) => {
  const [body, setBody] = useState('');
  const [tag, setTag] = useState<string>('general');
  const [error, setError] = useState('');

  const reset = () => {
    setBody('');
    setTag('general');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!body.trim()) {
      setError('Note content is required');
      return;
    }

    onSubmit(body.trim(), tag);
    reset();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) reset();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[500px] border-glow" onKeyDown={handleKeyDown}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-primary" />
              New Note
            </DialogTitle>
            <DialogDescription>
              Quickly jot down a note or reminder
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="body">Note *</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setError('');
                }}
                placeholder="Enter your note..."
                rows={6}
                className={error ? 'border-destructive' : ''}
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tag">Tag (Optional)</Label>
              <Select value={tag} onValueChange={setTag}>
                <SelectTrigger id="tag">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTE_TAGS).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      <span className={`inline-flex items-center ${info.color}`}>
                        {info.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              Press Cmd/Ctrl + Enter to save
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="hover-glow">
              Save Note
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};