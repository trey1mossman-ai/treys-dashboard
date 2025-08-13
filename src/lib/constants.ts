export const DEFAULT_DAY_START_HOUR = 6
export const DEFAULT_DAY_END_HOUR = 22
export const UPDATE_INTERVAL_MS = 30000

export const TAG_COLORS = {
  Deep: 'bg-primary/20 text-primary border-primary/50',
  Move: 'bg-accent/20 text-accent border-accent/50',
  Gym: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
  Break: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
  Meeting: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
  Personal: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
} as const

export const PROVIDERS = {
  EMAIL: ['gmail', 'outlook', 'custom'] as const,
  SMS: ['twilio', 'custom'] as const,
  WHATSAPP: ['twilio', 'custom'] as const
} as const

export const STORAGE_KEYS = {
  AGENDA_ITEMS: 'agenda_items',
  AGENDA_DONE: 'agenda_done',
  THEME: 'theme',
  SETTINGS: 'user_settings',
  FITNESS_DONE: 'fitness_done',
  NUTRITION_DONE: 'nutrition_done'
} as const