export interface Exercise {
  name: string
  sets: number
  reps: string
  weight?: string
  notes?: string
}

export interface Workout {
  id: string
  name: string
  exercises: Exercise[]
  duration: string
  completed: boolean
}

export interface Meal {
  time: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  completed: boolean
}

export interface NutritionPlan {
  id: string
  meals: Meal[]
  targetCalories: number
  targetProtein: number
}