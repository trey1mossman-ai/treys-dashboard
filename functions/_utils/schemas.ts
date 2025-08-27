// Strict schema validation for API payloads
// Rejects unknown fields and validates exact structure per spec

export interface AgendaItem {
  id: string;
  title: string;
  source: 'calendar' | 'supplements' | 'workout' | 'tasks' | 'meals';
  start_time: string; // ISO string
  end_time?: string; // ISO string
  status: 'pending' | 'done' | 'skipped';
  metadata?: object;
  display_notes?: string;
}

export interface WorkoutItem {
  plan_name: string;
  blocks: {
    name: string;
    sets: number;
    reps: string;
  }[];
  intensity_flag: 'low' | 'moderate' | 'high';
  adjustments?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_qty: number;
  min_qty: number;
  reorder_link?: string;
  last_updated: string; // ISO string
}

export interface StatusSnapshot {
  captured_at: string; // ISO string
  sleep_hours: number | null;
  recovery_proxy: number | null;
  training_load_today: 'low' | 'moderate' | 'high' | null;
  nutrition_compliance_7d: number | null;
  stress_flag: 'green' | 'yellow' | 'red' | null;
  reason?: string;
}

export interface Notification {
  id: string;
  type: 'error' | 'info' | 'schedule_change' | 'agent_result';
  severity: 'info' | 'warn' | 'critical';
  message: string;
  related_ids?: string[];
}

export interface TodayReadyPayload {
  run_at: string; // ISO string
  sources: string[];
}

export interface MarkCompleteCommand {
  id: string;
  source: 'calendar' | 'supplements' | 'workout' | 'task';
  status: 'done';
}

export interface QueueReorderCommand {
  id: string;
}

export interface TriggerBabyAgentCommand {
  intent: string;
  parameters: object;
}

// Schema validation functions
export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateString(value: unknown, field: string, required = true): string | undefined {
  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(field, `${field} is required`);
    }
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new ValidationError(field, `${field} must be a string`);
  }
  return value;
}

function validateNumber(value: unknown, field: string, required = true): number | undefined {
  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(field, `${field} is required`);
    }
    return undefined;
  }
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(field, `${field} must be a valid number`);
  }
  return value;
}

function validateEnum<T extends string>(value: unknown, field: string, allowedValues: T[], required = true): T | undefined {
  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(field, `${field} is required`);
    }
    return undefined;
  }
  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    throw new ValidationError(field, `${field} must be one of: ${allowedValues.join(', ')}`);
  }
  return value as T;
}

function validateISOString(value: unknown, field: string, required = true): string | undefined {
  const str = validateString(value, field, required);
  if (str && isNaN(new Date(str).getTime())) {
    throw new ValidationError(field, `${field} must be a valid ISO date string`);
  }
  return str;
}

function rejectUnknownFields(obj: any, allowedFields: string[], prefix = ''): void {
  if (typeof obj !== 'object' || obj === null) return;
  
  for (const key in obj) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    if (!allowedFields.includes(key)) {
      throw new ValidationError(fieldPath, `Unknown field: ${fieldPath}`);
    }
  }
}

export function validateAgendaItem(payload: unknown): AgendaItem {
  if (typeof payload !== 'object' || payload === null) {
    throw new ValidationError('', 'Payload must be an object');
  }
  
  const obj = payload as any;
  const allowedFields = ['id', 'title', 'source', 'start_time', 'end_time', 'status', 'metadata', 'display_notes'];
  rejectUnknownFields(obj, allowedFields);
  
  return {
    id: validateString(obj.id, 'id')!,
    title: validateString(obj.title, 'title')!,
    source: validateEnum(obj.source, 'source', ['calendar', 'supplements', 'workout', 'tasks', 'meals'])!,
    start_time: validateISOString(obj.start_time, 'start_time')!,
    end_time: validateISOString(obj.end_time, 'end_time', false),
    status: validateEnum(obj.status, 'status', ['pending', 'done', 'skipped'])!,
    metadata: obj.metadata,
    display_notes: validateString(obj.display_notes, 'display_notes', false)
  };
}

export function validateAgendaItems(payload: unknown): AgendaItem[] {
  if (!Array.isArray(payload)) {
    throw new ValidationError('', 'Payload must be an array');
  }
  return payload.map((item, i) => {
    try {
      return validateAgendaItem(item);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(`[${i}]${error.field ? '.' + error.field : ''}`, error.message);
      }
      throw error;
    }
  });
}

export function validateWorkoutItem(payload: unknown): WorkoutItem {
  if (typeof payload !== 'object' || payload === null) {
    throw new ValidationError('', 'Payload must be an object');
  }
  
  const obj = payload as any;
  const allowedFields = ['plan_name', 'blocks', 'intensity_flag', 'adjustments'];
  rejectUnknownFields(obj, allowedFields);
  
  if (!Array.isArray(obj.blocks)) {
    throw new ValidationError('blocks', 'blocks must be an array');
  }
  
  const blocks = obj.blocks.map((block: any, i: number) => {
    if (typeof block !== 'object' || block === null) {
      throw new ValidationError(`blocks[${i}]`, 'Block must be an object');
    }
    
    const blockFields = ['name', 'sets', 'reps'];
    rejectUnknownFields(block, blockFields, `blocks[${i}]`);
    
    return {
      name: validateString(block.name, `blocks[${i}].name`)!,
      sets: validateNumber(block.sets, `blocks[${i}].sets`)!,
      reps: validateString(block.reps, `blocks[${i}].reps`)!
    };
  });
  
  return {
    plan_name: validateString(obj.plan_name, 'plan_name')!,
    blocks,
    intensity_flag: validateEnum(obj.intensity_flag, 'intensity_flag', ['low', 'moderate', 'high'])!,
    adjustments: validateString(obj.adjustments, 'adjustments', false)
  };
}

export function validateInventoryItems(payload: unknown): InventoryItem[] {
  if (typeof payload !== 'object' || payload === null) {
    throw new ValidationError('', 'Payload must be an object');
  }
  
  const obj = payload as any;
  rejectUnknownFields(obj, ['items']);
  
  if (!Array.isArray(obj.items)) {
    throw new ValidationError('items', 'items must be an array');
  }
  
  return obj.items.map((item: any, i: number) => {
    if (typeof item !== 'object' || item === null) {
      throw new ValidationError(`items[${i}]`, 'Item must be an object');
    }
    
    const itemFields = ['id', 'name', 'category', 'unit', 'current_qty', 'min_qty', 'reorder_link', 'last_updated'];
    rejectUnknownFields(item, itemFields, `items[${i}]`);
    
    return {
      id: validateString(item.id, `items[${i}].id`)!,
      name: validateString(item.name, `items[${i}].name`)!,
      category: validateString(item.category, `items[${i}].category`)!,
      unit: validateString(item.unit, `items[${i}].unit`)!,
      current_qty: validateNumber(item.current_qty, `items[${i}].current_qty`)!,
      min_qty: validateNumber(item.min_qty, `items[${i}].min_qty`)!,
      reorder_link: validateString(item.reorder_link, `items[${i}].reorder_link`, false),
      last_updated: validateISOString(item.last_updated, `items[${i}].last_updated`)!
    };
  });
}

export function validateStatusSnapshot(payload: unknown): StatusSnapshot {
  if (typeof payload !== 'object' || payload === null) {
    throw new ValidationError('', 'Payload must be an object');
  }
  
  const obj = payload as any;
  const allowedFields = ['captured_at', 'sleep_hours', 'recovery_proxy', 'training_load_today', 'nutrition_compliance_7d', 'stress_flag', 'reason'];
  rejectUnknownFields(obj, allowedFields);
  
  return {
    captured_at: validateISOString(obj.captured_at, 'captured_at')!,
    sleep_hours: obj.sleep_hours === null ? null : validateNumber(obj.sleep_hours, 'sleep_hours'),
    recovery_proxy: obj.recovery_proxy === null ? null : validateNumber(obj.recovery_proxy, 'recovery_proxy'),
    training_load_today: obj.training_load_today === null ? null : validateEnum(obj.training_load_today, 'training_load_today', ['low', 'moderate', 'high'], false),
    nutrition_compliance_7d: obj.nutrition_compliance_7d === null ? null : validateNumber(obj.nutrition_compliance_7d, 'nutrition_compliance_7d'),
    stress_flag: obj.stress_flag === null ? null : validateEnum(obj.stress_flag, 'stress_flag', ['green', 'yellow', 'red'], false),
    reason: validateString(obj.reason, 'reason', false)
  };
}

export function validateNotifications(payload: unknown): Notification[] {
  if (Array.isArray(payload)) {
    return payload.map((item, i) => {
      try {
        return validateNotification(item);
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new ValidationError(`[${i}]${error.field ? '.' + error.field : ''}`, error.message);
        }
        throw error;
      }
    });
  } else {
    return [validateNotification(payload)];
  }
}

function validateNotification(payload: unknown): Notification {
  if (typeof payload !== 'object' || payload === null) {
    throw new ValidationError('', 'Payload must be an object');
  }
  
  const obj = payload as any;
  const allowedFields = ['id', 'type', 'severity', 'message', 'related_ids'];
  rejectUnknownFields(obj, allowedFields);
  
  let related_ids = undefined;
  if (obj.related_ids !== undefined) {
    if (!Array.isArray(obj.related_ids)) {
      throw new ValidationError('related_ids', 'related_ids must be an array');
    }
    related_ids = obj.related_ids.map((id: any, i: number) => 
      validateString(id, `related_ids[${i}]`)!
    );
  }
  
  return {
    id: validateString(obj.id, 'id')!,
    type: validateEnum(obj.type, 'type', ['error', 'info', 'schedule_change', 'agent_result'])!,
    severity: validateEnum(obj.severity, 'severity', ['info', 'warn', 'critical'])!,
    message: validateString(obj.message, 'message')!,
    related_ids
  };
}

export function validateTodayReady(payload: unknown): TodayReadyPayload {
  if (typeof payload !== 'object' || payload === null) {
    throw new ValidationError('', 'Payload must be an object');
  }
  
  const obj = payload as any;
  const allowedFields = ['run_at', 'sources'];
  rejectUnknownFields(obj, allowedFields);
  
  if (!Array.isArray(obj.sources)) {
    throw new ValidationError('sources', 'sources must be an array');
  }
  
  const sources = obj.sources.map((source: any, i: number) => 
    validateString(source, `sources[${i}]`)!
  );
  
  return {
    run_at: validateISOString(obj.run_at, 'run_at')!,
    sources
  };
}

export function validateMarkComplete(payload: unknown): MarkCompleteCommand {
  if (typeof payload !== 'object' || payload === null) {
    throw new ValidationError('', 'Payload must be an object');
  }
  
  const obj = payload as any;
  const allowedFields = ['id', 'source', 'status'];
  rejectUnknownFields(obj, allowedFields);
  
  if (obj.status !== 'done') {
    throw new ValidationError('status', 'status must be "done"');
  }
  
  return {
    id: validateString(obj.id, 'id')!,
    source: validateEnum(obj.source, 'source', ['calendar', 'supplements', 'workout', 'task'])!,
    status: 'done'
  };
}

export function validateQueueReorder(payload: unknown): QueueReorderCommand {
  if (typeof payload !== 'object' || payload === null) {
    throw new ValidationError('', 'Payload must be an object');
  }
  
  const obj = payload as any;
  const allowedFields = ['id'];
  rejectUnknownFields(obj, allowedFields);
  
  return {
    id: validateString(obj.id, 'id')!
  };
}

export function validateTriggerBabyAgent(payload: unknown): TriggerBabyAgentCommand {
  if (typeof payload !== 'object' || payload === null) {
    throw new ValidationError('', 'Payload must be an object');
  }
  
  const obj = payload as any;
  const allowedFields = ['intent', 'parameters'];
  rejectUnknownFields(obj, allowedFields);
  
  return {
    intent: validateString(obj.intent, 'intent')!,
    parameters: obj.parameters || {}
  };
}