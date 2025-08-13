import { apiClient } from './apiClient'

export interface AgendaItem {
  id: string
  date: string              // YYYY-MM-DD
  title: string
  tag?: 'Deep' | 'Move' | 'Break' | 'Gym' | 'Web' | 'Meeting' | 'Personal'
  start_ts: number          // epoch seconds
  end_ts: number
  status?: 'pending' | 'in_progress' | 'done' | 'snoozed'
  notes?: string
}

export interface AICreatePayload {
  date: string
  title: string
  start_ts: number
  end_ts: number
  tag?: string
  notes?: string
}

export const dbService = {
  agenda: {
    async list(date: string): Promise<AgendaItem[]> {
      const response = await apiClient.get<{ ok: boolean; items: AgendaItem[] }>(
        `/agenda/list?date=${date}`
      )
      return response.items || []
    },

    async get(id: string): Promise<AgendaItem | null> {
      try {
        const response = await apiClient.get<{ ok: boolean; item: AgendaItem }>(
          `/agenda/get?id=${id}`
        )
        return response.item
      } catch {
        return null
      }
    },

    async upsert(item: Partial<AgendaItem> & { date: string; title: string; start_ts: number; end_ts: number }) {
      const response = await apiClient.post<{ ok: boolean; id: string; action: string }>(
        '/agenda/upsert',
        item
      )
      return response
    },

    async delete(id: string) {
      const response = await apiClient.post<{ ok: boolean; deleted: boolean }>(
        '/agenda/delete',
        { id }
      )
      return response
    },

    async aiCreate(payload: AICreatePayload) {
      const response = await apiClient.post<{ ok: boolean; id: string; message: string }>(
        '/agenda/ai-create',
        payload
      )
      return response
    }
  }
}