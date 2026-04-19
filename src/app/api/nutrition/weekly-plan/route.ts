// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('lifeos_session')?.value
    if (!sessionCookie) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const session = JSON.parse(sessionCookie)
    const userId = session.user?.id || session.userId || session.user_id
    if (!userId) return NextResponse.json({ error: 'User ID not found' }, { status: 401 })

    // Use local date, not UTC (toISOString converts to UTC which causes wrong day in evening hours)
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`

    // Get the single active plan
    const { data: weeklyPlan } = await supabase
      .from('weekly_meal_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('week_start_date', { ascending: false })
      .limit(1)
      .single()

    if (!weeklyPlan) {
      // Even without a weekly plan, check for planned_meals directly by user_id
      const { data: directMeals } = await supabase
        .from('planned_meals')
        .select('*')
        .eq('user_id', userId)
        .gte('date', todayStr)
        .order('date', { ascending: true })
        .order('scheduled_time', { ascending: true })

      if (directMeals && directMeals.length > 0) {
        // Create a virtual daily plan from the meals
        const dailyPlans = [{
          id: 'virtual-today',
          date: todayStr,
          day_type: 'training',
          eating_window_start: '08:00',
          eating_window_end: '20:00',
          target_calories: 2800,
          target_protein: 200,
          target_carbs: 280,
          target_fat: 90
        }]

        return NextResponse.json({
          exists: true,
          weeklyPlan: { id: 'direct', status: 'active' },
          dailyPlans,
          plannedMeals: directMeals
        })
      }

      return NextResponse.json({ exists: false, weekStart: todayStr })
    }

    // Get daily plans for this specific weekly plan
    const { data: dailyPlans } = await supabase
      .from('daily_nutrition_timeline')
      .select('*')
      .eq('weekly_plan_id', weeklyPlan.id)
      .order('date', { ascending: true })

    // Get planned meals - try both via daily_timeline_id AND directly by user_id + date range
    const timelineIds = (dailyPlans || []).map(d => d.id)
    let plannedMeals: any[] = []

    // First try by timeline IDs
    if (timelineIds.length > 0) {
      const { data: meals } = await supabase
        .from('planned_meals')
        .select('*')
        .in('daily_timeline_id', timelineIds)
        .order('date', { ascending: true })

      plannedMeals = meals || []
    }

    // If no meals found via timeline, query directly by user_id
    if (plannedMeals.length === 0) {
      const weekStart = weeklyPlan.week_start_date
      const { data: directMeals } = await supabase
        .from('planned_meals')
        .select('*')
        .eq('user_id', userId)
        .gte('date', weekStart)
        .order('date', { ascending: true })
        .order('scheduled_time', { ascending: true })

      plannedMeals = directMeals || []
    }

    // If we have meals but no dailyPlans, create virtual daily plans
    let effectiveDailyPlans = dailyPlans || []
    if (plannedMeals.length > 0 && effectiveDailyPlans.length === 0) {
      const uniqueDates = [...new Set(plannedMeals.map(m => m.date))]
      effectiveDailyPlans = uniqueDates.map(date => ({
        id: `virtual-${date}`,
        date,
        day_type: 'training',
        eating_window_start: '08:00',
        eating_window_end: '20:00',
        target_calories: weeklyPlan.weekly_targets?.calories || 2800,
        target_protein: weeklyPlan.weekly_targets?.protein || 200,
        target_carbs: weeklyPlan.weekly_targets?.carbs || 280,
        target_fat: weeklyPlan.weekly_targets?.fat || 90
      }))
    }

    return NextResponse.json({
      exists: true,
      weeklyPlan,
      dailyPlans: effectiveDailyPlans,
      plannedMeals
    })
  } catch (error) {
    console.error('GET weekly-plan error:', error)
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: 'Meal plan generation has moved to NeuralFit AI. Ask NeuralFit AI to plan your meals for the week.',
    code: 'USE_NEURALFIT_AI'
  }, { status: 400 })
}
