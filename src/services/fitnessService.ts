import { apiClient } from './apiClient'
import type { Workout } from '@/features/fitness/types'

const mockWorkout: Workout = {
  id: '1',
  name: 'Upper Body Power',
  duration: '90 minutes',
  completed: false,
  exercises: [
    {
      name: 'Bench Press',
      sets: 4,
      reps: '6-8',
      weight: '225 lbs',
      notes: 'Focus on explosive movement'
    },
    {
      name: 'Pull-ups',
      sets: 4,
      reps: '8-10',
      weight: 'Bodyweight + 25 lbs',
    },
    {
      name: 'Overhead Press',
      sets: 3,
      reps: '8-10',
      weight: '135 lbs',
    },
    {
      name: 'Barbell Rows',
      sets: 4,
      reps: '8-10',
      weight: '185 lbs',
    },
    {
      name: 'Dumbbell Curls',
      sets: 3,
      reps: '12-15',
      weight: '40 lbs',
    },
    {
      name: 'Tricep Dips',
      sets: 3,
      reps: '12-15',
      weight: 'Bodyweight',
    }
  ]
}

export const fitnessService = {
  async getToday(): Promise<Workout> {
    try {
      const response = await apiClient.get<Workout>('/fitness/today')
      return response
    } catch (error) {
      console.log('Using mock workout data')
      const workout: Workout = {
        id: mockWorkout.id,
        name: mockWorkout.name,
        exercises: mockWorkout.exercises,
        duration: mockWorkout.duration,
        completed: false
      }
      return workout
    }
  },
  
  async getWeekPlan() {
    try {
      return await apiClient.get('/fitness/week')
    } catch (error) {
      return Array(7).fill(null).map((_, i): Workout => ({
        ...mockWorkout,
        id: String(i),
        name: `Day ${i + 1} Workout`,
        completed: false
      }))
    }
  },
  
  async updateProgress(workoutId: string, exerciseIndex: number, completed: boolean) {
    return apiClient.put(`/fitness/progress/${workoutId}`, {
      exerciseIndex,
      completed
    })
  }
}