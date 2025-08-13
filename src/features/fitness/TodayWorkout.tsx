import { useState, useEffect } from 'react'
import { Dumbbell } from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { fitnessService } from '@/services/fitnessService'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { STORAGE_KEYS } from '@/lib/constants'
import { getTodayDateString } from '@/lib/time'
import type { Workout } from './types'

export function TodayWorkout() {
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedExercises, setCompletedExercises] = useLocalStorage<Record<string, boolean>>(
    `${STORAGE_KEYS.FITNESS_DONE}_${getTodayDateString()}`,
    {}
  )
  
  useEffect(() => {
    loadWorkout()
  }, [])
  
  const loadWorkout = async () => {
    setLoading(true)
    try {
      const data = await fitnessService.getToday()
      setWorkout(data)
    } catch (error) {
      console.error('Failed to load workout:', error)
    }
    setLoading(false)
  }
  
  const toggleExercise = (exerciseName: string) => {
    setCompletedExercises(prev => ({
      ...prev,
      [exerciseName]: !prev[exerciseName]
    }))
  }
  
  const markAllComplete = () => {
    if (!workout) return
    const allComplete: Record<string, boolean> = {}
    workout.exercises.forEach(ex => {
      allComplete[ex.name] = true
    })
    setCompletedExercises(allComplete)
  }
  
  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-panel rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-panel rounded"></div>
            <div className="h-4 bg-panel rounded"></div>
            <div className="h-4 bg-panel rounded"></div>
          </div>
        </div>
      </Card>
    )
  }
  
  if (!workout) {
    return (
      <Card className="p-6">
        <p className="text-muted">No workout scheduled for today</p>
      </Card>
    )
  }
  
  const completedCount = Object.values(completedExercises).filter(Boolean).length
  const progress = (completedCount / workout.exercises.length) * 100
  
  return (
    <Card className="p-6" glow="accent3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-accent3" />
          <h3 className="font-semibold">{workout.name}</h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={markAllComplete}
        >
          Mark All Complete
        </Button>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm text-muted mb-1">
          <span>Progress</span>
          <span>{completedCount}/{workout.exercises.length} exercises</span>
        </div>
        <div className="w-full h-2 bg-panel rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-accent3 to-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-3">
        {workout.exercises.map((exercise, idx) => (
          <div 
            key={idx}
            className="flex items-center justify-between p-3 bg-panel rounded-lg"
          >
            <div className="flex-1">
              <p className={`font-medium ${completedExercises[exercise.name] ? 'line-through opacity-60' : ''}`}>
                {exercise.name}
              </p>
              <div className="flex gap-4 text-sm text-muted mt-1">
                <span>{exercise.sets} sets</span>
                <span>{exercise.reps} reps</span>
                {exercise.weight && <span>{exercise.weight}</span>}
              </div>
              {exercise.notes && (
                <p className="text-xs text-muted mt-1">{exercise.notes}</p>
              )}
            </div>
            <Switch
              checked={completedExercises[exercise.name] || false}
              onCheckedChange={() => toggleExercise(exercise.name)}
            />
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-sm text-muted">
          Duration: {workout.duration}
        </p>
      </div>
    </Card>
  )
}