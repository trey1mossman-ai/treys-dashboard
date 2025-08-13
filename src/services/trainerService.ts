import { apiClient } from './apiClient'

export interface WorkoutPlan {
  date: string
  title: string
  blocks: Array<{
    name: string
    notes?: string
    exercises: Array<{
      name: string
      sets: number
      reps: string
      load?: string
      rest?: number
    }>
  }>
}

export interface WorkoutLog {
  date: string
  entries: Array<{
    exercise: string
    set: number
    reps: number
    load?: number
    rpe?: number
  }>
}

export const trainerService = {
  async uploadWorkout(plan: WorkoutPlan) {
    return apiClient.post('/trainer/upload', plan)
  },
  
  async getTodayWorkout(date?: string) {
    const today = date || new Date().toISOString().split('T')[0]
    return apiClient.get<WorkoutPlan>(`/trainer/today?date=${today}`)
  },
  
  async logWorkout(log: WorkoutLog) {
    return apiClient.post('/trainer/log', log)
  },
  
  async exportCSV(date: string) {
    const response = await apiClient.get<{ csv: string }>(`/trainer/export?date=${date}`)
    const csv = response.csv || ''
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workout-log-${date}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    return { success: true }
  }
}