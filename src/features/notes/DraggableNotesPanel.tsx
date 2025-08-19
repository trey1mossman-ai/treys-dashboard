import React, { useState, useEffect } from 'react';
import { StickyNote, Plus, X, Move } from 'lucide-react';
import { notesService } from '@/services/notes';
import { useDraggable } from '@/hooks/useDraggable';
import { IconButton } from '@/components/IconButton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { NOTE_TAGS } from './types';
import { cn } from '@/lib/utils';
import type { Note } from './types';

interface DraggableNoteProps {
  note: Note;
  onDelete: (id: string) => void;
  index: number;
}

function DraggableNote({ note, onDelete, index }: DraggableNoteProps) {
  const {
    position,
    isDragging,
    elementRef,
    handleMouseDown,
    handleTouchStart
  } = useDraggable({
    storageKey: `note-position-${note.id}`,
    defaultPosition: {
      x: 100 + (index % 3) * 220,
      y: 100 + Math.floor(index / 3) * 160
    },
    bounds: 'window'
  });

  const tagInfo = note.tag ? NOTE_TAGS[note.tag as keyof typeof NOTE_TAGS] : null;

  return (
    <div
      ref={elementRef}
      className={cn(
        "absolute w-52 bg-card border border-border rounded-lg shadow-lg elevation-medium",
        "transition-shadow duration-200",
        isDragging && "shadow-2xl elevation-high cursor-grabbing z-50",
        !isDragging && "hover:shadow-xl cursor-grab"
      )}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: isDragging ? 'none' : 'box-shadow 200ms'
      }}
    >
      <div
        className="flex items-center justify-between p-2 border-b border-border cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center gap-2">
          <Move className="w-3 h-3 text-muted-foreground" />
          {tagInfo && (
            <Badge className={`${tagInfo.color} text-xs`}>
              {tagInfo.label}
            </Badge>
          )}
        </div>
        <button
          onClick={() => onDelete(note.id)}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="p-3">
        <p className="text-sm whitespace-pre-wrap line-clamp-6">
          {note.body}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {new Date(note.created_at || '').toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

export const DraggableNotesPanel: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const { toast } = useToast();

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await notesService.list('active');
      setNotes(data.slice(0, 6)); // Limit to 6 notes for performance
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load notes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleCreate = async () => {
    if (!newNoteText.trim()) return;
    
    try {
      await notesService.create(newNoteText, 'todo');
      toast({
        title: 'Success',
        description: 'Note created successfully'
      });
      setNewNoteText('');
      loadNotes();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create note',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notesService.delete(id);
      toast({
        title: 'Success',
        description: 'Note deleted'
      });
      loadNotes();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete note',
        variant: 'destructive'
      });
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          "fixed top-20 right-6 z-40",
          "px-4 py-2 rounded-lg",
          "bg-card border border-border",
          "flex items-center gap-2",
          "shadow-md hover:shadow-lg",
          "transition-all duration-200",
          "hover:scale-105"
        )}
      >
        <StickyNote className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Notes ({notes.length})</span>
      </button>
    );
  }

  return (
    <>
      {/* Control Panel */}
      <div className={cn(
        "fixed top-20 right-6 z-40",
        "px-4 py-2 rounded-lg",
        "bg-card border border-border",
        "flex items-center gap-2",
        "shadow-md"
      )}>
        <StickyNote className="w-4 h-4 text-primary" />
        <input
          type="text"
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Quick note..."
          className={cn(
            "w-48 px-2 py-1 text-sm",
            "bg-muted/50 border border-border rounded",
            "focus:outline-none focus:ring-1 focus:ring-accent/50"
          )}
        />
        <IconButton
          icon={<Plus className="w-4 h-4" />}
          label="Add Note"
          onClick={handleCreate}
          size="sm"
          variant="ghost"
        />
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Draggable Notes */}
      {!loading && notes.map((note, index) => (
        <DraggableNote
          key={note.id}
          note={note}
          onDelete={handleDelete}
          index={index}
        />
      ))}
    </>
  );
};