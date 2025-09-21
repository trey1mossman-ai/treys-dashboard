// Data types for the dashboard
export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: number;
  dueDate?: number;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
}

export interface Event {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  attendees?: string[];
  status: 'pending' | 'confirmed' | 'cancelled';
}

export interface AgendaItem {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  location?: string;
  attendees?: string[];
  status: 'pending' | 'synced' | 'error';
  calendarId?: string;
  createdAt: number;
  updatedAt: number;
}
