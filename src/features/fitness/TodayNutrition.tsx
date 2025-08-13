import { useState, useEffect } from 'react'
import { Utensils } from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { nutritionService } from '@/services/nutritionService'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { STORAGE_KEYS } from '@/lib/constants'
import { getTodayDateString } from '@/lib/time'
import type { NutritionPlan } from './types'

export function TodayNutrition() {
  const [nutrition, setNutrition] = useState<NutritionPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedMeals, setCompletedMeals] = useLocalStorage<Record<string, boolean>>(
    `${STORAGE_KEYS.NUTRITION_DONE}_${getTodayDateString()}`,
    {}
  )
  
  useEffect(() => {
    loadNutrition()
  }, [])
  
  const loadNutrition = async () => {
    setLoading(true)
    try {
      const data = await nutritionService.getToday()
      setNutrition(data)
    } catch (error) {
      console.error('Failed to load nutrition:', error)
    }
    setLoading(false)
  }
  
  const toggleMeal = (mealName: string) => {
    setCompletedMeals(prev => ({
      ...prev,
      [mealName]: !prev[mealName]
    }))
  }
  
  const markAllComplete = () => {
    if (!nutrition) return
    const allComplete: Record<string, boolean> = {}
    nutrition.meals.forEach(meal => {
      allComplete[meal.name] = true
    })
    setCompletedMeals(allComplete)
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
  
  if (!nutrition) {
    return (
      <Card className="p-6">
        <p className="text-muted">No nutrition plan for today</p>
      </Card>
    )
  }
  
  const completedCount = Object.values(completedMeals).filter(Boolean).length
  const totalCalories = nutrition.meals
    .filter(meal => completedMeals[meal.name])
    .reduce((sum, meal) => sum + meal.calories, 0)
  const totalProtein = nutrition.meals
    .filter(meal => completedMeals[meal.name])
    .reduce((sum, meal) => sum + meal.protein, 0)
  
  return (
    <Card className="p-6" glow="accent2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Utensils className="w-5 h-5 text-accent2" />
          <h3 className="font-semibold">Today's Nutrition</h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={markAllComplete}
        >
          Mark All Complete
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-panel rounded-lg p-3">
          <p className="text-sm text-muted">Calories</p>
          <p className="text-xl font-bold">
            {totalCalories} <span className="text-sm font-normal text-muted">/ {nutrition.targetCalories}</span>
          </p>
          <div className="w-full h-1 bg-background rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full bg-accent2 transition-all duration-300"
              style={{ width: `${Math.min((totalCalories / nutrition.targetCalories) * 100, 100)}%` }}
            />
          </div>
        </div>
        
        <div className="bg-panel rounded-lg p-3">
          <p className="text-sm text-muted">Protein</p>
          <p className="text-xl font-bold">
            {totalProtein}g <span className="text-sm font-normal text-muted">/ {nutrition.targetProtein}g</span>
          </p>
          <div className="w-full h-1 bg-background rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${Math.min((totalProtein / nutrition.targetProtein) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        {nutrition.meals.map((meal, idx) => (
          <div 
            key={idx}
            className="flex items-center justify-between p-3 bg-panel rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{meal.time}</span>
                <p className={`font-medium ${completedMeals[meal.name] ? 'line-through opacity-60' : ''}`}>
                  {meal.name}
                </p>
              </div>
              <div className="flex gap-3 text-xs text-muted mt-1">
                <span>{meal.calories} cal</span>
                <span>{meal.protein}g protein</span>
                <span>{meal.carbs}g carbs</span>
                <span>{meal.fat}g fat</span>
              </div>
            </div>
            <Switch
              checked={completedMeals[meal.name] || false}
              onCheckedChange={() => toggleMeal(meal.name)}
            />
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-sm text-muted">
          Meals completed: {completedCount}/{nutrition.meals.length}
        </p>
      </div>
    </Card>
  )
}