import { z } from 'zod'
import { AgendaItemSchema } from '@/lib/schedule'

export type AgendaItem = z.infer<typeof AgendaItemSchema>

export interface AgendaState {
  items: AgendaItem[]
  selectedItem: AgendaItem | null
  isEditing: boolean
}