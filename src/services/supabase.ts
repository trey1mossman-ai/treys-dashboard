import { createClient } from '@supabase/supabase-js';
import { eventBus, LifeOSEvents } from './eventBus';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials - add to .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const supabaseSync = {
  async syncProjects() {
    eventBus.emit(LifeOSEvents.SYNC_STARTED);

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      eventBus.emit(LifeOSEvents.SYNC_COMPLETED, { projects: data });
      return data;
    } catch (error) {
      eventBus.emit(LifeOSEvents.SYNC_FAILED, error);
      throw error;
    }
  },

  async syncTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('priority', { ascending: true });

    if (error) throw error;
    return data;
  }
};
