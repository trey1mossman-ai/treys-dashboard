import React, { useState, useEffect } from 'react';
import { StickyNote, Plus, Archive, Trash2, MoreVertical } from 'lucide-react';
import { notesService } from '@/services/notes';
import { GlowCard } from '@/components/GlowCard';
import { IconButton } from '@/components/IconButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { NewNoteDialog } from './NewNoteDialog';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { NOTE_TAGS } from './types';
import type { Note } from './types';

export const NotesPanel: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteNote, setDeleteNote] = useState<Note | null>(null);
  const { toast } = useToast();

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await notesService.list('active');
      setNotes(data);
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

  const handleCreate = async (body: string, tag?: string) => {
    try {
      await notesService.create(body, tag);
      toast({
        title: 'Success',
        description: 'Note created successfully'
      });
      loadNotes();
      setCreateOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create note',
        variant: 'destructive'
      });
    }
  };

  const handleArchive = async (note: Note) => {
    try {
      await notesService.archive(note.id);
      toast({
        title: 'Success',
        description: 'Note archived'
      });
      loadNotes();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to archive note',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteNote) return;
    try {
      await notesService.delete(deleteNote.id);
      toast({
        title: 'Success',
        description: 'Note deleted'
      });
      loadNotes();
      setDeleteNote(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete note',
        variant: 'destructive'
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-primary" />
          Quick Notes
        </h2>
        <IconButton
          icon={<Plus className="h-4 w-4" />}
          label="New Note"
          onClick={() => setCreateOpen(true)}
          variant="default"
          size="sm"
          className="hover-glow"
        >
          New Note
        </IconButton>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <GlowCard key={i} className="h-32 animate-pulse bg-muted">
              <div />
            </GlowCard>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <GlowCard className="p-8 text-center text-muted-foreground">
          <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No notes yet</p>
          <p className="text-sm mt-2">Create your first note to get started</p>
        </GlowCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map(note => {
            const tagInfo = note.tag ? NOTE_TAGS[note.tag as keyof typeof NOTE_TAGS] : null;
            return (
              <GlowCard key={note.id} className="p-4 hover-glow group relative">
                <div className="flex items-start justify-between mb-2">
                  {tagInfo && (
                    <Badge className={`${tagInfo.color} text-xs`}>
                      {tagInfo.label}
                    </Badge>
                  )}
                  <div className="ml-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <IconButton
                          icon={<MoreVertical className="h-4 w-4" />}
                          label="Options"
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleArchive(note)}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteNote(note)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="text-sm mb-2 whitespace-pre-wrap line-clamp-4">
                  {note.body}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(note.created_at)}
                </p>
              </GlowCard>
            );
          })}
        </div>
      )}

      <NewNoteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      <ConfirmDialog
        open={!!deleteNote}
        onOpenChange={(open) => !open && setDeleteNote(null)}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
};