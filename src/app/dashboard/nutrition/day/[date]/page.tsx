// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Check, ChefHat, Clock, Sparkles, X,
  Pill, Utensils, Coffee, Moon, Dumbbell, Play, MoreHorizontal,
  AlertTriangle, Timer, Flame, ChevronLeft, ChevronRight, Zap
} from 'lucide-react'
import { getTodayString } from '@/lib/date-utils'
import { DayMacroSummary } from '@/components/nutrition/DayMacroSummary'
import { MealCard } from '@/components/nutrition/MealCard'
import { MealEditModal } from '@/components/nutrition/MealEditModal'
import { SupplementItem } from '@/components/nutrition/SupplementItem'
import { SupplementStack } from '@/components/nutrition/SupplementStack'
import { PageTransition, AnimatedSection } from '@/components/ui/PageTransition'

// Unified supplement type covering both static and dynamic schedules
interface Supplement {
  id: string
  supplement_name: string
  dosage: string
  timing_rule: string
  scheduled_time?: string | null
  taken_today: boolean
  servings_remaining: number | null
  caffeine_mg?: number | null
  scheduleId?: string
  reason?: string
  grouping?: string
}

interface MealIngredient {
  inventory_id: string
  item_name: string
  quantity: number
  unit: string
  serving_size_qty?: number
  serving_size_unit?: string
  macros_per_unit: { calories: number; protein: number; carbs: number; fat: number }
}

// Unified PlannedMeal covering both execution and planning data shapes
interface PlannedMeal {
  id: string
  date: string
  meal_type: string
  // Execution fields (from /today normalizer)
  meal_name?: string
  scheduled_time?: string
  description?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  ingredients?: MealIngredient[] | string[]
  chef_notes?: string
  // Planning fields (from /day/[date])
  planned_time?: string
  meal_concept?: string
  estimated_calories?: number
  estimated_protein?: number
  estimated_carbs?: number
  estimated_fat?: number
  key_ingredients?: string[]
  prep_notes?: string
  confirmed_recipe?: {
    name: string
    description: string
    prepTime: number
    cookTime: number
    ingredients: any[]
    instructions: string[]
  }
  // Unified status enum
  status: 'empty' | 'planned' | 'suggested' | 'confirmed' | 'logged' | 'skipped' | 'substituted' | 'adjusted'
}

interface DailyPlan {
  id: string
  date: string
  day_type: string
  eating_window_start: string
  eating_window_end: string
  target_calories: number
  target_protein: number
  target_carbs: number
  target_fat: number
  workout_time: string | null
  notes: string
}

// Execution mode: individual supplement items
interface TimelineItem {
  id: string
  type: 'supplement' | 'meal' | 'eating_window'
  time: string
  sortTime: number
  label: string
  supplement?: Supplement
  meal?: PlannedMeal
  windowInfo?: { start: string; end: string }
}

// Planning mode: grouped supplement stacks
interface TimelineSection {
  id: string
  type: 'supplement_stack' | 'meal' | 'eating_window'
  timing: string
  time: string
  label: string
  supplements?: Supplement[]
  meal?: PlannedMeal
  windowInfo?: { start: string; end: string }
}

interface MealOption {
  name: string
  description: string
  prepTime: number
  cookTime: number
  difficulty: string
  ingredients: { name: string; amount: string; inInventory: boolean }[]
  instructions: string[]
  macros: { calories: number; protein: number; carbs: number; fat: number }
  tips: string
  pairingNotes: string
}

export default function DayPage() {
  const router = useRouter()
  const params = useParams()
  const dateParam = params.date as string

  // CRITICAL: Resolve "today" param to actual date string BEFORE any new Date() calls
  const resolvedDate = dateParam === 'today' ? getTodayString() : (dateParam || getTodayString())
  const isToday = resolvedDate === getTodayString()

  // Execution mode state (individual timeline items — used when isToday)
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([])
  // Planning mode state (grouped sections — used when !isToday)
  const [sections, setSections] = useState<TimelineSection[]>([])

  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [showMealOptions, setShowMealOptions] = useState<string | null>(null)
  const [usingDynamicSchedule, setUsingDynamicSchedule] = useState(false)

  // Day navigation state (preserved from /today)
  const [selectedDate, setSelectedDate] = useState(resolvedDate)

  // Meal editing state (execution mode only)
  const [editingMeal, setEditingMeal] = useState<PlannedMeal | null>(null)

  // Planning mode: suggestions modal
  const [suggestionsModal, setSuggestionsModal] = useState<{
    open: boolean
    mealId: string | null
    mealLabel: string
    options: MealOption[]
    loading: boolean
  }>({ open: false, mealId: null, mealLabel: '', options: [], loading: false })

  const timingDefaults: Record<string, string> = {
    'morning': '07:00', 'with_meal': '08:00', 'with-meal': '08:00',
    'pre_workout': '11:00', 'pre-workout': '11:00',
    'post_workout': '14:00', 'post-workout': '14:00',
    'afternoon': '15:00', 'evening': '19:00',
    'before_bed': '21:00', 'before-bed': '21:00', 'night': '21:00'
  }

  const isCurrentDateToday = selectedDate === getTodayString()

  useEffect(() => {
    if (isCurrentDateToday) {
      loadExecutionTimeline(selectedDate)
    } else {
      loadPlanningTimeline(selectedDate)
    }
  }, [selectedDate])

  // === EXECUTION MODE LOADER (from /today) ===
  async function loadExecutionTimeline(targetDate: string) {
    setLoading(true)
    try {
      // Check for dynamically programmed supplement schedule (Tiger #3 API)
      const dailyScheduleRes = await fetch(`/api/nutrition/supplements/daily-schedule?date=${targetDate}`)
      const dailyScheduleData = await dailyScheduleRes.json()

      const [suppsRes, weeklyPlanRes] = await Promise.all([
        fetch('/api/nutrition/supplements'),
        fetch('/api/nutrition/weekly-plan')
      ])
      const [suppsData, weeklyPlanData] = await Promise.all([suppsRes.json(), weeklyPlanRes.json()])
      const supplements: Supplement[] = suppsData.supplements || []
      let todaysPlan: DailyPlan | null = null
      let todaysMeals: PlannedMeal[] = []

      if (weeklyPlanData.exists) {
        todaysPlan = weeklyPlanData.dailyPlans?.find((d: DailyPlan) => d.date === targetDate) || null
        todaysMeals = (weeklyPlanData.plannedMeals || [])
          .filter((m: any) => m.date === targetDate)
          .map((m: any) => ({
            id: m.id, date: m.date, meal_type: m.meal_type,
            scheduled_time: m.scheduled_time || '',
            meal_name: m.meal_name || m.meal_concept || 'Meal',
            description: m.description,
            calories: m.calories || m.estimated_calories || 0,
            protein: m.protein || m.estimated_protein || 0,
            carbs: m.carbs || m.estimated_carbs || 0,
            fat: m.fat || m.estimated_fat || 0,
            ingredients: m.ingredients || [],
            status: m.status || 'suggested',
            chef_notes: m.chef_notes
          }))
        setDailyPlan(todaysPlan)
      }

      const items: TimelineItem[] = []

      if (todaysPlan?.eating_window_start) {
        items.push({
          id: 'eating-window', type: 'eating_window',
          time: `${formatTime(todaysPlan.eating_window_start)} - ${formatTime(todaysPlan.eating_window_end)}`,
          sortTime: parseTimeToMinutes(todaysPlan.eating_window_start),
          label: 'Eating Window',
          windowInfo: { start: todaysPlan.eating_window_start, end: todaysPlan.eating_window_end }
        })
      }

      // Use dynamic schedule if available, otherwise fall back to static
      if (dailyScheduleData.scheduled && dailyScheduleData.schedule?.length > 0) {
        setUsingDynamicSchedule(true)
        dailyScheduleData.schedule.forEach((item: any) => {
          const supp = item.supplement
          if (!supp) return
          items.push({
            id: `supp-${item.id}`, type: 'supplement',
            time: formatTime(item.scheduled_time),
            sortTime: parseTimeToMinutes(item.scheduled_time),
            label: supp.supplement_name,
            supplement: {
              id: supp.id, supplement_name: supp.supplement_name, dosage: supp.dosage,
              timing_rule: item.time_slot || supp.timing_rule,
              scheduled_time: item.scheduled_time,
              taken_today: item.taken || false,
              servings_remaining: supp.servings_remaining,
              caffeine_mg: supp.caffeine_mg,
              scheduleId: item.id,
              reason: item.reason,
              grouping: item.grouping
            }
          })
        })
      } else {
        setUsingDynamicSchedule(false)
        supplements.forEach((supp) => {
          let timeStr = supp.scheduled_time || timingDefaults[supp.timing_rule] || '08:00'
          if (todaysPlan?.workout_time) {
            if (supp.timing_rule.includes('pre')) timeStr = addMinutes(todaysPlan.workout_time, -30)
            else if (supp.timing_rule.includes('post')) timeStr = addMinutes(todaysPlan.workout_time, 60)
          }
          items.push({
            id: `supp-${supp.id}`, type: 'supplement',
            time: formatTime(timeStr), sortTime: parseTimeToMinutes(timeStr),
            label: supp.supplement_name, supplement: supp
          })
        })
      }

      const mealLabels: Record<string, string> = {
        'breakfast': 'Breakfast', 'first_meal': 'First Meal', 'post_workout': 'Post-Workout',
        'lunch': 'Lunch', 'snack': 'Snack', 'dinner': 'Dinner', 'pre_bed': 'Pre-Bed Snack'
      }

      todaysMeals.forEach((meal) => {
        if (meal.status !== 'skipped') {
          items.push({
            id: `meal-${meal.id}`, type: 'meal',
            time: formatTime(meal.scheduled_time || '12:00'),
            sortTime: parseTimeToMinutes(meal.scheduled_time || '12:00'),
            label: mealLabels[meal.meal_type] || meal.meal_type, meal
          })
        }
      })

      items.sort((a, b) => {
        if (a.type === 'eating_window') return -1
        if (b.type === 'eating_window') return 1
        return a.sortTime - b.sortTime
      })
      setTimelineItems(items)
    } catch (error) {
      console.error('Failed to load timeline:', error)
    } finally {
      setLoading(false)
    }
  }

  // === PLANNING MODE LOADER (from original /day/[date]) ===
  async function loadPlanningTimeline(targetDate: string) {
    setLoading(true)
    try {
      const [suppsRes, weeklyPlanRes] = await Promise.all([
        fetch('/api/nutrition/supplements'),
        fetch('/api/nutrition/weekly-plan')
      ])
      const [suppsData, weeklyPlanData] = await Promise.all([suppsRes.json(), weeklyPlanRes.json()])
      const supplements = suppsData.supplements || []
      let todaysPlan: DailyPlan | null = null
      let todaysMeals: PlannedMeal[] = []

      if (weeklyPlanData.exists) {
        todaysPlan = weeklyPlanData.dailyPlans?.find((d: DailyPlan) => d.date === targetDate) || null
        todaysMeals = weeklyPlanData.plannedMeals?.filter((m: PlannedMeal) => m.date === targetDate) || []
        setDailyPlan(todaysPlan)
      }

      const timelineSections: TimelineSection[] = []
      const suppsByTiming: Record<string, Supplement[]> = {}
      supplements.forEach((supp: Supplement) => {
        const timing = supp.timing_rule || 'morning'
        if (!suppsByTiming[timing]) suppsByTiming[timing] = []
        suppsByTiming[timing].push(supp)
      })

      if (todaysPlan?.eating_window_start) {
        timelineSections.push({
          id: 'eating-window', type: 'eating_window', timing: 'info',
          time: `${formatTime(todaysPlan.eating_window_start)} - ${formatTime(todaysPlan.eating_window_end)}`,
          label: 'Eating Window',
          windowInfo: { start: todaysPlan.eating_window_start, end: todaysPlan.eating_window_end }
        })
      }

      if (suppsByTiming['morning']?.length) {
        timelineSections.push({ id: 'stack-morning', type: 'supplement_stack', timing: 'morning', time: '7:00 AM', label: 'Morning Stack', supplements: suppsByTiming['morning'] })
      }
      if (suppsByTiming['pre-workout']?.length) {
        timelineSections.push({ id: 'stack-pre-workout', type: 'supplement_stack', timing: 'pre-workout', time: todaysPlan?.workout_time ? formatTime(addMinutes(todaysPlan.workout_time, -30)) : '11:30 AM', label: 'Pre-Workout', supplements: suppsByTiming['pre-workout'] })
      }

      const mealOrder = ['first_meal', 'post_workout', 'lunch', 'snack', 'dinner', 'pre_bed']
      const mealLabels: Record<string, string> = {
        'first_meal': 'First Meal', 'post_workout': 'Post-Workout', 'lunch': 'Lunch',
        'snack': 'Snack', 'dinner': 'Dinner', 'pre_bed': 'Pre-Bed Snack', 'breakfast': 'Breakfast'
      }

      todaysMeals.sort((a, b) => {
        if (a.planned_time && b.planned_time) return a.planned_time.localeCompare(b.planned_time)
        return mealOrder.indexOf(a.meal_type) - mealOrder.indexOf(b.meal_type)
      })

      todaysMeals.forEach((meal) => {
        if (meal.status !== 'skipped') {
          timelineSections.push({
            id: `meal-${meal.id}`, type: 'meal', timing: meal.meal_type,
            time: meal.planned_time ? formatTime(meal.planned_time) : '',
            label: mealLabels[meal.meal_type] || meal.meal_type, meal
          })
        }
      })

      if (suppsByTiming['post-workout']?.length) {
        timelineSections.push({ id: 'stack-post-workout', type: 'supplement_stack', timing: 'post-workout', time: todaysPlan?.workout_time ? formatTime(addMinutes(todaysPlan.workout_time, 60)) : '3:00 PM', label: 'Post-Workout', supplements: suppsByTiming['post-workout'] })
      }
      if (suppsByTiming['before-bed']?.length || suppsByTiming['night']?.length) {
        timelineSections.push({ id: 'stack-evening', type: 'supplement_stack', timing: 'evening', time: '9:00 PM', label: 'Evening Stack', supplements: [...(suppsByTiming['before-bed'] || []), ...(suppsByTiming['night'] || [])] })
      }
      if (suppsByTiming['with-meal']?.length) {
        timelineSections.push({ id: 'stack-with-meal', type: 'supplement_stack', timing: 'with-meal', time: 'With Meals', label: 'With Meals', supplements: suppsByTiming['with-meal'] })
      }

      timelineSections.sort((a, b) => {
        if (a.type === 'eating_window') return -1
        if (b.type === 'eating_window') return 1
        return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
      })

      setSections(timelineSections)
    } catch (error) {
      console.error('Failed to load timeline:', error)
    } finally {
      setLoading(false)
    }
  }

  // === SHARED UTILITY FUNCTIONS ===
  function formatTime(time: string): string {
    if (!time) return ''
    try {
      const parts = time.split(':')
      const h = parseInt(parts[0])
      const m = parts[1]?.substring(0, 2) || '00'
      const ampm = h >= 12 ? 'PM' : 'AM'
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
      return `${displayHour}:${m} ${ampm}`
    } catch { return time }
  }

  function addMinutes(time: string, mins: number): string {
    const [hours, minutes] = time.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + mins
    const newHours = Math.floor(totalMinutes / 60) % 24
    const newMins = totalMinutes % 60
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`
  }

  function parseTimeToMinutes(timeStr: string): number {
    if (!timeStr || timeStr === 'With Meals') return 999
    // Try HH:MM format first
    const parts = timeStr.split(':')
    if (parts.length >= 2) {
      const hours = parseInt(parts[0]), mins = parseInt(parts[1])
      if (!isNaN(hours) && !isNaN(mins) && hours < 24) return hours * 60 + mins
    }
    // Try h:mm AM/PM format
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (!match) return 500
    let hours = parseInt(match[1])
    const mins = parseInt(match[2])
    const ampm = match[3].toUpperCase()
    if (ampm === 'PM' && hours !== 12) hours += 12
    if (ampm === 'AM' && hours === 12) hours = 0
    return hours * 60 + mins
  }

  // === DAY NAVIGATION (preserved from /today) ===
  function goToPrevDay() {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  function goToNextDay() {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  function goToToday() {
    setSelectedDate(getTodayString())
  }

  // === SUPPLEMENT TOGGLE (handles both dynamic schedule and static) ===
  async function toggleSupplement(suppId: string, currentState: boolean, scheduleId?: string) {
    setUpdating(suppId)
    try {
      if (scheduleId) {
        await fetch('/api/nutrition/supplements/daily-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduleId, action: currentState ? 'reset' : 'take' })
        })
      } else {
        await fetch('/api/nutrition/supplements/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplement_id: suppId, taken: !currentState })
        })
      }

      if (isCurrentDateToday) {
        setTimelineItems(prev => prev.map(item => {
          if (item.supplement?.id === suppId || item.supplement?.scheduleId === scheduleId) {
            return { ...item, supplement: { ...item.supplement!, taken_today: !currentState } }
          }
          return item
        }))
      } else {
        setSections(prev => prev.map(section => {
          if (section.type === 'supplement_stack' && section.supplements) {
            return { ...section, supplements: section.supplements.map(s => s.id === suppId ? { ...s, taken_today: !currentState } : s) }
          }
          return section
        }))
      }
    } catch (error) {
      console.error('Failed to log supplement:', error)
    } finally {
      setUpdating(null)
    }
  }

  // === PLANNING MODE: BATCH SUPPLEMENT COMPLETE ===
  async function completeStack(supplements: Supplement[], stackId: string) {
    const uncompleted = supplements.filter(s => !s.taken_today)
    if (uncompleted.length === 0) return
    setUpdating(stackId)
    try {
      const res = await fetch('/api/nutrition/log/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplements: uncompleted.map(s => s.id) })
      })
      const data = await res.json()
      if (data.success) {
        setSections(prev => prev.map(section => {
          if (section.id === stackId && section.supplements) {
            return { ...section, supplements: section.supplements.map(s => uncompleted.find(u => u.id === s.id) ? { ...s, taken_today: true } : s) }
          }
          return section
        }))
      }
    } catch (error) {
      console.error('Failed to log supplements:', error)
    } finally {
      setUpdating(null)
    }
  }

  // === MEAL ACTIONS ===
  async function logMeal(meal: PlannedMeal) {
    setUpdating(meal.id)
    try {
      const res = await fetch('/api/nutrition/meal/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plannedMealId: meal.id })
      })
      const data = await res.json()

      if (isCurrentDateToday) {
        setTimelineItems(prev => prev.map(item => {
          if (item.meal?.id === meal.id) return { ...item, meal: { ...item.meal!, status: 'logged' as const } }
          return item
        }))
      } else {
        setSections(prev => prev.map(section => {
          if (section.meal?.id === meal.id) return { ...section, meal: { ...section.meal!, status: 'logged' as const } }
          return section
        }))
      }

      if (data.lowInventoryWarnings?.length > 0) {
        console.log('Low stock warnings:', data.lowInventoryWarnings)
      }
    } catch (error) {
      console.error('Failed to log meal:', error)
    } finally {
      setUpdating(null)
    }
  }

  async function skipMeal(mealId: string) {
    try {
      await fetch('/api/nutrition/weekly-plan/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Skip the meal with ID ${mealId}`, weeklyPlanId: dailyPlan?.id })
      })

      if (isCurrentDateToday) {
        setTimelineItems(prev => prev.filter(item => item.meal?.id !== mealId))
      } else {
        setSections(prev => prev.filter(section => section.meal?.id !== mealId))
      }
      setShowMealOptions(null)
    } catch (error) {
      console.error('Failed to skip meal:', error)
    }
  }

  function openChef(meal: PlannedMeal) {
    const cals = (meal.calories || meal.estimated_calories || 0).toString()
    const prot = (meal.protein || meal.estimated_protein || 0).toString()
    const concept = meal.meal_name || meal.meal_concept || ''
    const urlParams = new URLSearchParams({
      plannedMealId: meal.id, meal_type: meal.meal_type,
      target_calories: cals, target_protein: prot, concept
    })
    router.push(`/dashboard/nutrition/chef?${urlParams.toString()}`)
  }

  // === PLANNING MODE: AI SUGGESTIONS ===
  async function getMealSuggestions(mealId: string, mealLabel: string) {
    setSuggestionsModal({ open: true, mealId, mealLabel, options: [], loading: true })
    try {
      const res = await fetch('/api/nutrition/meal/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plannedMealId: mealId, optionsCount: 3 })
      })
      const data = await res.json()
      if (data.success && data.options) {
        setSuggestionsModal(prev => ({ ...prev, options: data.options, loading: false }))
      } else {
        throw new Error(data.error || 'Failed to get suggestions')
      }
    } catch (error) {
      console.error('Failed to get suggestions:', error)
      setSuggestionsModal(prev => ({ ...prev, loading: false }))
    }
  }

  async function confirmMealSelection(option: MealOption) {
    if (!suggestionsModal.mealId) return
    setUpdating(suggestionsModal.mealId)
    try {
      const res = await fetch('/api/nutrition/meal/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plannedMealId: suggestionsModal.mealId, selectedMeal: option })
      })
      const data = await res.json()
      if (data.success) {
        setSections(prev => prev.map(section => {
          if (section.meal?.id === suggestionsModal.mealId) {
            return { ...section, meal: { ...section.meal!, status: 'confirmed' as const, meal_concept: option.name, confirmed_recipe: { name: option.name, description: option.description, prepTime: option.prepTime, cookTime: option.cookTime, ingredients: option.ingredients, instructions: option.instructions }, estimated_calories: option.macros.calories, estimated_protein: option.macros.protein, estimated_carbs: option.macros.carbs, estimated_fat: option.macros.fat } }
          }
          return section
        }))
        setSuggestionsModal({ open: false, mealId: null, mealLabel: '', options: [], loading: false })
      }
    } catch (error) {
      console.error('Failed to confirm meal:', error)
    } finally {
      setUpdating(null)
    }
  }

  // === RENDER ===
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-plasma/20 border-t-plasma rounded-full animate-spin" />
      </div>
    )
  }

  const displayDate = new Date(resolvedDate + 'T12:00:00')
  const dateStr = displayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  // Compute stats based on current mode
  const mealItems = isCurrentDateToday
    ? timelineItems.filter(i => i.type === 'meal')
    : sections.filter(s => s.type === 'meal')
  const loggedMeals = mealItems.filter(i => (i as any).meal?.status === 'logged').length
  const totalMeals = mealItems.length

  const suppItems = isCurrentDateToday ? timelineItems.filter(i => i.type === 'supplement') : []
  const completedSupps = suppItems.filter(i => i.supplement?.taken_today).length
  const totalSupps = suppItems.length
  const totalCaffeine = suppItems.reduce((sum, item) => sum + (item.supplement?.caffeine_mg || 0), 0)

  const dailyTotals = isCurrentDateToday
    ? suppItems.length >= 0 // always true — just to use execution mode items
      ? timelineItems.filter(i => i.type === 'meal').reduce((acc, item) => {
          if (item.meal && item.meal.status === 'logged') {
            acc.calories += item.meal.calories || 0
            acc.protein += item.meal.protein || 0
            acc.carbs += item.meal.carbs || 0
            acc.fat += item.meal.fat || 0
          }
          return acc
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 })
      : { calories: 0, protein: 0, carbs: 0, fat: 0 }
    : { calories: 0, protein: 0, carbs: 0, fat: 0 }

  return (
    <div className="min-h-screen bg-bg-primary pb-24">
      <header className="sticky top-0 z-10 safe-area-top">
        <div className="absolute inset-0 bg-bg-primary/70 backdrop-blur-xl" />
        <div className="relative px-5 py-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="min-h-[44px] min-w-[44px] w-10 h-10 rounded-full bg-bg-secondary hover:bg-bg-secondary/80 flex items-center justify-center active:scale-[0.98] transition-all duration-200">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={goToPrevDay} className="min-h-[44px] min-w-[44px] w-8 h-8 rounded-full bg-bg-secondary hover:bg-bg-secondary/80 flex items-center justify-center active:scale-[0.98] transition-all duration-200">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={goToToday} className="text-center min-w-[140px] min-h-[44px]">
              <h1 className="text-lg font-semibold">{isCurrentDateToday ? "Today's Plan" : dateStr}</h1>
              {usingDynamicSchedule && isCurrentDateToday && (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Sparkles className="w-3 h-3 text-plasma" />
                  <span className="text-xs text-plasma font-medium">AI Planned</span>
                </div>
              )}
              {!isCurrentDateToday && (
                <span className="text-xs text-plasma">tap to go to today</span>
              )}
              {dailyPlan?.day_type && isCurrentDateToday && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  dailyPlan.day_type === 'training' ? 'bg-aurora/20 text-aurora' :
                  dailyPlan.day_type === 'rest' ? 'bg-plasma/20 text-plasma' :
                  'bg-solar/20 text-solar'
                }`}>
                  {dailyPlan.day_type.replace('_', ' ')}
                </span>
              )}
            </button>
            <button onClick={goToNextDay} className="min-h-[44px] min-w-[44px] w-8 h-8 rounded-full bg-bg-secondary hover:bg-bg-secondary/80 flex items-center justify-center active:scale-[0.98] transition-all duration-200">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="text-sm text-text-tertiary w-10">{isCurrentDateToday ? dateStr.split(',')[0] : ''}</div>
        </div>

        {/* Macro summary (execution mode with full detail, planning mode with simple progress) */}
        {dailyPlan && isCurrentDateToday && (
          <DayMacroSummary
            dailyTotals={dailyTotals}
            targets={{ calories: dailyPlan.target_calories || 2500, protein: dailyPlan.target_protein || 180, carbs: dailyPlan.target_carbs || 250, fat: dailyPlan.target_fat || 80 }}
            completedSupps={completedSupps}
            totalSupps={totalSupps}
            loggedMeals={loggedMeals}
            totalMeals={totalMeals}
            totalCaffeine={totalCaffeine}
          />
        )}
        {dailyPlan && !isCurrentDateToday && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
              <span>Daily Progress</span>
              <span>{loggedMeals}/{totalMeals} meals</span>
            </div>
            <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-aurora rounded-full transition-all duration-500" style={{ width: `${totalMeals > 0 ? (loggedMeals / totalMeals) * 100 : 0}%` }} />
            </div>
          </div>
        )}
        <div className="h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent" />
      </header>

      {/* Empty state */}
      {!dailyPlan && totalMeals === 0 && (
        <div className="mx-5 mt-5 p-6 bg-gradient-to-br from-plasma/10 to-aurora/10 border border-plasma/20 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-plasma/20 flex items-center justify-center">
              {isCurrentDateToday ? <ChefHat className="h-5 w-5 text-plasma" /> : <Sparkles className="h-5 w-5 text-plasma" />}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">No meal plan yet</h3>
              <p className="text-sm text-text-secondary mb-3">
                {isCurrentDateToday
                  ? 'Ask NeuralFit AI to create a personalized weekly plan based on your inventory and goals.'
                  : 'Generate a personalized weekly plan based on your training, sleep, and goals.'}
              </p>
              <button onClick={() => router.push('/dashboard/nutrition?planWeek=true')} className="px-4 py-2 min-h-[44px] bg-plasma text-bg-primary text-sm font-semibold rounded-xl flex items-center gap-2 active:scale-[0.98] transition-all duration-200">
                <Play className="h-4 w-4" />Plan My Week
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === EXECUTION MODE TIMELINE (isToday) === */}
      {isCurrentDateToday && (
        <PageTransition className="px-5 py-5 space-y-2">
          {(() => {
            let lastGrouping: string | null = null
            return timelineItems.map((item) => {
              const grouping = item.type === 'supplement' ? item.supplement?.grouping : null
              const showGroupHeader = item.type === 'supplement' && grouping && grouping !== lastGrouping
              if (item.type === 'supplement' && grouping) lastGrouping = grouping
              const formatGroupName = (name: string) => {
                const names: Record<string, string> = {
                  'morning': 'Morning Stack', 'with_meal': 'With Breakfast', 'pre_workout': 'Pre-Workout',
                  'post_workout': 'Post-Workout', 'afternoon': 'Afternoon', 'evening': 'Evening Stack',
                  'before_bed': 'Before Bed', 'night': 'Night Stack'
                }
                return names[name] || name?.replace(/_/g, ' ') || ''
              }
              return (
                <div key={item.id}>
                  {item.type === 'eating_window' ? (
                    <EatingWindowCard time={item.time} />
                  ) : item.type === 'supplement' && item.supplement ? (
                    <>
                      {showGroupHeader && (
                        <div className="flex items-center gap-2 mt-3 mb-1">
                          <div className="h-px flex-1 bg-border-subtle" />
                          <span className="text-xs font-medium text-text-tertiary px-2">{formatGroupName(grouping || '')}</span>
                          <div className="h-px flex-1 bg-border-subtle" />
                        </div>
                      )}
                      <SupplementItem supplement={item.supplement} time={item.time} onToggle={toggleSupplement} updating={updating} />
                    </>
                  ) : item.type === 'meal' && item.meal ? (
                    <MealCard
                      label={item.label} time={item.time} meal={item.meal} isExecutionMode={true}
                      onLog={() => logMeal(item.meal!)} onSkip={() => skipMeal(item.meal!.id)}
                      onEdit={() => setEditingMeal(item.meal!)} onWorkWithChef={() => openChef(item.meal!)}
                      updating={updating === item.meal.id} showOptions={showMealOptions === item.meal.id}
                      onToggleOptions={() => setShowMealOptions(showMealOptions === item.meal!.id ? null : item.meal!.id)}
                    />
                  ) : null}
                </div>
              )
            })
          })()}
        </PageTransition>
      )}

      {/* === PLANNING MODE TIMELINE (!isToday) === */}
      {!isCurrentDateToday && (
        <PageTransition className="px-5 py-5 space-y-5">
          {sections.map(section => (
            <div key={section.id}>
              {section.type === 'eating_window' ? (
                <EatingWindowCard time={section.time} />
              ) : section.type === 'supplement_stack' ? (
                <SupplementStack
                  label={section.label} time={section.time} supplements={section.supplements || []}
                  onToggle={(id, current) => toggleSupplement(id, current)}
                  onCompleteAll={() => completeStack(section.supplements || [], section.id)}
                  updating={updating}
                />
              ) : section.meal ? (
                <MealCard
                  label={section.label} time={section.time} meal={section.meal} isExecutionMode={false}
                  onLog={() => logMeal(section.meal!)} onSkip={() => skipMeal(section.meal!.id)}
                  onGetSuggestions={() => getMealSuggestions(section.meal!.id, section.label)}
                  onWorkWithChef={() => openChef(section.meal!)}
                  updating={updating === section.meal.id} showOptions={showMealOptions === section.meal.id}
                  onToggleOptions={() => setShowMealOptions(showMealOptions === section.meal!.id ? null : section.meal!.id)}
                />
              ) : null}
            </div>
          ))}
        </PageTransition>
      )}

      {/* Meal Edit Modal (execution mode) */}
      {editingMeal && (
        <MealEditModal
          meal={{ id: editingMeal.id, meal_name: editingMeal.meal_name || editingMeal.meal_concept || 'Meal', status: editingMeal.status, ingredients: editingMeal.ingredients || [] }}
          onClose={() => setEditingMeal(null)}
          onSaved={() => loadExecutionTimeline(selectedDate)}
        />
      )}

      {/* Suggestions Modal (planning mode) */}
      {suggestionsModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="bg-bg-primary w-full max-h-[85vh] rounded-t-3xl overflow-hidden animate-slide-up">
            <div className="sticky top-0 bg-bg-primary border-b border-border-default px-4 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Recipe Ideas</h2>
                <p className="text-sm text-text-tertiary">{suggestionsModal.mealLabel}</p>
              </div>
              <button onClick={() => setSuggestionsModal({ open: false, mealId: null, mealLabel: '', options: [], loading: false })} className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(85vh - 80px)' }}>
              {suggestionsModal.loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-3 border-plasma/20 border-t-plasma rounded-full animate-spin mb-4" />
                  <p className="text-text-secondary">Chef is cooking up ideas...</p>
                </div>
              ) : suggestionsModal.options.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-solar mx-auto mb-4" />
                  <p className="text-text-secondary">Couldn't generate suggestions. Try again or work with Chef directly.</p>
                </div>
              ) : (
                suggestionsModal.options.map((option, idx) => (
                  <RecipeOptionCard key={idx} option={option} onSelect={() => confirmMealSelection(option)} selecting={updating === suggestionsModal.mealId} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

function RecipeOptionCard({
  option,
  onSelect,
  selecting
}: {
  option: MealOption
  onSelect: () => void
  selecting: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const totalTime = option.prepTime + option.cookTime
  const missingIngredients = option.ingredients.filter(i => !i.inInventory)

  return (
    <div className="bg-bg-secondary border border-border-default rounded-2xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-medium">{option.name}</h3>
            <p className="text-sm text-text-tertiary mt-1">{option.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-text-tertiary mt-3">
          <span className="flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" />
            {totalTime} min
          </span>
          <span className="flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-aurora" />
            {option.macros.protein}g protein
          </span>
          <span>{option.macros.calories} cal</span>
        </div>

        {missingIngredients.length > 0 && (
          <div className="mt-3 p-2 bg-solar/10 border border-solar/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-solar shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="text-solar font-medium">Missing {missingIngredients.length} ingredient{missingIngredients.length > 1 ? 's' : ''}: </span>
                <span className="text-text-secondary">{missingIngredients.map(i => i.name).join(', ')}</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-plasma"
        >
          {expanded ? 'Hide details' : 'View ingredients & instructions'}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border-default pt-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Ingredients</h4>
            <ul className="space-y-1">
              {option.ingredients.map((ing, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <span className={`w-1.5 h-1.5 rounded-full ${ing.inInventory ? 'bg-aurora' : 'bg-solar'}`} />
                  <span className={ing.inInventory ? '' : 'text-text-tertiary'}>
                    {ing.amount} {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Instructions</h4>
            <ol className="space-y-2">
              {option.instructions.map((step, idx) => (
                <li key={idx} className="flex gap-3 text-sm">
                  <span className="text-plasma font-medium">{idx + 1}.</span>
                  <span className="text-text-secondary">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {option.tips && (
            <div className="p-3 bg-plasma/10 rounded-xl">
              <div className="flex items-start gap-2">
                <ChefHat className="h-4 w-4 text-plasma shrink-0 mt-0.5" />
                <p className="text-sm text-text-secondary">{option.tips}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-4 border-t border-border-default">
        <button
          onClick={onSelect}
          disabled={selecting}
          className="w-full py-3 min-h-[44px] bg-plasma text-bg-primary font-semibold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-200"
        >
          {selecting ? (
            <div className="w-5 h-5 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
          ) : (
            <>
              <Check className="h-4 w-4" />
              Select This Recipe
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function EatingWindowCard({ time }: { time: string; windowInfo: { start: string; end: string } }) {
  return (
    <div className="bg-gradient-to-r from-aurora/10 to-plasma/10 border border-aurora/20 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-aurora/20 flex items-center justify-center">
          <Clock className="h-5 w-5 text-aurora" />
        </div>
        <div>
          <div className="text-sm font-semibold">Eating Window</div>
          <div className="text-lg font-semibold text-aurora">{time}</div>
        </div>
      </div>
    </div>
  )
}

