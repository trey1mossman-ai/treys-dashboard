import { apiClient } from './apiClient'
import type { NutritionPlan } from '@/features/fitness/types'

const mockNutrition: NutritionPlan = {
  id: '1',
  targetCalories: 2800,
  targetProtein: 180,
  meals: [
    {
      time: '7:00 AM',
      name: 'Breakfast - Protein Oats',
      calories: 450,
      protein: 35,
      carbs: 55,
      fat: 12,
      completed: false
    },
    {
      time: '10:00 AM',
      name: 'Snack - Greek Yogurt & Berries',
      calories: 250,
      protein: 20,
      carbs: 30,
      fat: 6,
      completed: false
    },
    {
      time: '1:00 PM',
      name: 'Lunch - Chicken & Rice Bowl',
      calories: 650,
      protein: 45,
      carbs: 70,
      fat: 15,
      completed: false
    },
    {
      time: '3:30 PM',
      name: 'Pre-Workout - Banana & Almond Butter',
      calories: 300,
      protein: 8,
      carbs: 40,
      fat: 14,
      completed: false
    },
    {
      time: '6:00 PM',
      name: 'Post-Workout - Protein Shake',
      calories: 350,
      protein: 40,
      carbs: 35,
      fat: 5,
      completed: false
    },
    {
      time: '7:30 PM',
      name: 'Dinner - Salmon & Sweet Potato',
      calories: 600,
      protein: 38,
      carbs: 45,
      fat: 22,
      completed: false
    },
    {
      time: '9:30 PM',
      name: 'Evening - Casein & Nuts',
      calories: 200,
      protein: 24,
      carbs: 8,
      fat: 10,
      completed: false
    }
  ]
}

export const nutritionService = {
  async getToday(): Promise<NutritionPlan> {
    try {
      const response = await apiClient.get<NutritionPlan>('/nutrition/today')
      return response
    } catch (error) {
      console.log('Using mock nutrition data')
      const nutritionPlan: NutritionPlan = {
        id: mockNutrition.id,
        targetCalories: mockNutrition.targetCalories,
        targetProtein: mockNutrition.targetProtein,
        meals: mockNutrition.meals.map(meal => ({
          time: meal.time,
          name: meal.name,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          completed: false
        }))
      }
      return nutritionPlan
    }
  },
  
  async getWeekPlan() {
    try {
      return await apiClient.get('/nutrition/week')
    } catch (error) {
      return Array(7).fill(null).map((_, i): NutritionPlan => ({
        ...mockNutrition,
        id: String(i),
        meals: mockNutrition.meals.map(meal => ({ ...meal, completed: false }))
      }))
    }
  },
  
  async updateMealStatus(planId: string, mealIndex: number, completed: boolean) {
    return apiClient.put(`/nutrition/progress/${planId}`, {
      mealIndex,
      completed
    })
  },
  
  async getMacroTargets() {
    return apiClient.get('/nutrition/macros')
  }
}