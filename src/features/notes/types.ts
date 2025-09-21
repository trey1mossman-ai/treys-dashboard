export interface Note {
  id: string;
  body: string;
  tag?: string;
  status: 'active' | 'archived' | 'deleted';
  created_at?: string;
  updated_at?: string;
  /**
   * Some integrations provide `content` instead of `body`.
   * Keep it optional so event payloads can be normalized easily.
   */
  content?: string;
}

export type NoteTag = 'urgent' | 'idea' | 'reminder' | 'task' | 'general';

export const NOTE_TAGS: Record<NoteTag, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-500 bg-red-500/10' },
  idea: { label: 'Idea', color: 'text-yellow-500 bg-yellow-500/10' },
  reminder: { label: 'Reminder', color: 'text-blue-500 bg-blue-500/10' },
  task: { label: 'Task', color: 'text-green-500 bg-green-500/10' },
  general: { label: 'General', color: 'text-gray-500 bg-gray-500/10' }
};
