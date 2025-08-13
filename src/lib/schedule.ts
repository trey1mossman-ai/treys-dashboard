import { z } from 'zod'

export const AgendaItemSchema = z.object({
  id: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  title: z.string(),
  tag: z.enum(['Deep', 'Move', 'Gym', 'Break', 'Meeting', 'Personal']).optional(),
  completed: z.boolean().default(false),
  notes: z.string().optional()
})

export type AgendaItem = z.infer<typeof AgendaItemSchema>

export function buildTodaySchedule(): AgendaItem[] {
  // Return empty array - no placeholder items
  return []
}

export function buildScheduleForDate(_date: Date): AgendaItem[] {
  // Return empty array - no placeholder items
  return []
}

export function mergeScheduleWithSaved(
  _defaultSchedule: AgendaItem[],
  savedItems: AgendaItem[]
): AgendaItem[] {
  // Just return saved items, ignore any default schedule
  return savedItems
}