/* Mission Control Data Models - Exact contract implementation */

export type AgendaSource = 'supplements' | 'workout' | 'task' | 'calendar';
export type AgendaStatus = 'pending' | 'done' | 'skipped';
export type IntensityFlag = 'low' | 'moderate' | 'high';
export type StressFlag = 'green' | 'yellow' | 'red';
export type NotificationType = 'low_stock' | 'schedule_change' | 'agent_result';
export type NotificationSeverity = 'info' | 'warn' | 'critical';
export type InventoryCategory = 'food' | 'supplement' | 'other';

export interface AgendaItem {
  id: string;
  title: string;
  source: AgendaSource;
  start_time: string; // ISO string, local
  end_time?: string; // ISO string, optional
  status: AgendaStatus;
  metadata: {
    display_notes: string; // Required human-readable notes
    [key: string]: any; // Additional source-specific fields
  };
}

export interface WorkoutBlock {
  name: string;
  target_sets: number;
  target_reps: string; // e.g., "8-12" or "AMRAP"
}

export interface WorkoutItem {
  plan_name: string;
  blocks: WorkoutBlock[];
  intensity_flag: IntensityFlag;
  adjustments?: string;
}

export interface SupplementItem {
  supplement_name: string;
  dose: number;
  unit: string;
  with_food: boolean;
}

export interface SupplementRoutine {
  name: string;
  schedule: string[]; // Array of times in local format
  items: SupplementItem[];
  compliance_percent: number; // 0-100, last 7 days
}

export interface StatusSnapshot {
  captured_at: string; // ISO string
  sleep_hours: number;
  recovery_proxy: number | null; // 0-100, allow null
  training_load_today: IntensityFlag;
  nutrition_compliance_7d: number; // 0-100
  stress_flag: {
    level: StressFlag;
    reason: string;
  };
}

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  unit: string; // e.g., "capsules", "g"
  current_qty: number;
  min_qty: number;
  reorder_link?: string;
  last_updated: string; // ISO string
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  severity: NotificationSeverity;
  related_ids: string[];
  created_at: string; // ISO string
  auto_dismiss?: boolean;
}

/* Command Interfaces */
export interface MarkCompleteCommand {
  agenda_item_id: string;
  status: 'done' | 'skipped';
  completed_at: string; // ISO string
}

export interface BabyAgentCommand {
  intent: string;
  parameters: Record<string, any>;
  correlation_id?: string;
}

export interface QueueReorderCommand {
  inventory_item_id: string;
  vendor_hint?: string;
  correlation_id?: string;
}

/* Webhook Payloads */
export interface CalendarFeedPayload {
  events: Array<{
    id: string;
    title: string;
    start_time: string;
    end_time?: string;
    description?: string;
  }>;
  idempotency_key: string;
}

export interface SupplementsFeedPayload {
  routines: SupplementRoutine[];
  date: string; // YYYY-MM-DD
  idempotency_key: string;
}

export interface WorkoutFeedPayload {
  workout: WorkoutItem;
  scheduled_time: string;
  duration_minutes: number;
  idempotency_key: string;
}

export interface InventoryFeedPayload {
  items: InventoryItem[];
  idempotency_key: string;
}

/* UI State */
export interface MissionControlState {
  agenda: AgendaItem[];
  status: StatusSnapshot | null;
  inventory: InventoryItem[];
  notifications: Notification[];
  selectedItemId: string | null;
  loading: {
    agenda: boolean;
    status: boolean;
    inventory: boolean;
  };
  lastUpdated: {
    agenda: string | null;
    status: string | null;
    inventory: string | null;
  };
}

/* Settings */
export interface MissionControlSettings {
  webhook_urls: {
    calendar?: string;
    supplements?: string;
    workout?: string;
    inventory?: string;
  };
  outbound_urls: {
    mark_complete?: string;
    baby_agent?: string;
    queue_reorder?: string;
  };
  hmac_secret: string;
  timezone: string; // Default: America/Denver
  daily_build_time: string; // Default: 05:30
  refresh_window: {
    enabled: boolean;
    start: string; // Default: 08:00
    end: string; // Default: 18:00
  };
  display: {
    reduce_motion: boolean;
    show_supplements: boolean;
    show_workout: boolean;
    show_tasks: boolean;
    show_calendar: boolean;
    show_telemetry: boolean;
    show_inventory: boolean;
  };
  thresholds: {
    low_inventory_percent: number; // Default: 20
    reorder_days_buffer: number; // Default: 7
  };
}