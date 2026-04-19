import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import {
  getUserTimezone,
  createScheduledAtForDay,
  calculateCurrentWeek,
  getUserLocalWeekBounds,
  getUserLocalNow
} from '@/lib/fitness/timezone'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * WEEKLY PLAN API - Pure CRUD
 * 
 * This endpoint stores weekly workout plans created by Claude Code.
 * It does NOT generate plans - Claude Code (in conversation) creates
 * the plan and writes it here via POST.
 * 
 * See: CLAUDE-CODE-BUILD-PLAN.md
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getUserId(): string | null {
  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('lifeos_session')
    if (!sessionCookie) return null
    const session = JSON.parse(sessionCookie.value)
    return session.user?.id || session.userId || null
  } catch {
    return null
  }
}

/**
 * POST - Store a weekly plan created by Claude Code
 * 
 * Expected body:
 * {
 *   week_number: number,
 *   phase_name: string,
 *   workouts: [
 *     {
 *       dayOfWeek: 1-7,
 *       focus: "Push" | "Pull" | "Legs" | etc,
 *       estimatedDuration: number,
 *       exercises: [
 *         { name, sets, reps, weight, notes }
 *       ]
 *     }
 *   ],
 *   adaptations_applied: string[],    // optional
 *   progression_notes: string,         // optional
 *   coaching_notes: string            // optional
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const forceRegenerate = body.force_regenerate || false

    // Validate required fields
    if (!body.workouts || !Array.isArray(body.workouts)) {
      return NextResponse.json({ 
        error: 'Missing required field: workouts (array)' 
      }, { status: 400 })
    }

    const timezone = await getUserTimezone(userId)
    const localNow = getUserLocalNow(timezone)

    // Get active master plan
    const { data: masterPlan } = await supabase
      .from('master_training_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!masterPlan) {
      return NextResponse.json({ error: 'No active master plan found.' }, { status: 404 })
    }

    // Calculate current week if not provided
    const currentWeek = body.week_number || calculateCurrentWeek(masterPlan.start_date, timezone)

    // Get user profile for workout duration default
    const { data: profile } = await supabase
      .from('user_fitness_profile')
      .select('preferred_workout_duration')
      .eq('user_id', userId)
      .single()

    // Check for existing plan
    const { data: existingWeeklyPlan } = await supabase
      .from('weekly_training_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('master_plan_id', masterPlan.id)
      .eq('week_number', currentWeek)
      .eq('status', 'active')
      .single()

    if (existingWeeklyPlan && !forceRegenerate) {
      return NextResponse.json({
        success: false,
        error: 'Weekly plan already exists. Set force_regenerate: true to replace.',
        existingPlan: { id: existingWeeklyPlan.id, weekNumber: existingWeeklyPlan.week_number }
      }, { status: 409 })
    }

    // Archive existing plan if force regenerating
    if (existingWeeklyPlan && forceRegenerate) {
      await supabase
        .from('weekly_training_plans')
        .update({ status: 'archived' })
        .eq('id', existingWeeklyPlan.id)
      
      await supabase
        .from('workouts')
        .delete()
        .eq('weekly_plan_id', existingWeeklyPlan.id)
        .eq('status', 'scheduled')
    }

    // Build plan_data object
    const planData = {
      weekNumber: currentWeek,
      phaseInfo: {
        name: body.phase_name || 'Training',
        focus: body.phase_focus || null
      },
      workouts: body.workouts,
      progressionNotes: body.progression_notes || null,
      coachingNotes: body.coaching_notes || null,
      adaptationsApplied: body.adaptations_applied || []
    }

    // Insert weekly plan
    const endDate = new Date(localNow.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    const { data: weeklyPlan, error: planError } = await supabase
      .from('weekly_training_plans')
      .insert({
        user_id: userId,
        master_plan_id: masterPlan.id,
        week_number: currentWeek,
        phase_name: body.phase_name || 'Training',
        start_date: localNow.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        plan_data: planData,
        status: 'active',
        ...(body.adaptations_applied?.length > 0 && { 
          claude_code_adaptations: body.adaptations_applied 
        })
      })
      .select()
      .single()

    if (planError) {
      console.error('Error storing weekly plan:', planError)
      return NextResponse.json({ error: planError.message }, { status: 500 })
    }

    // Create scheduled workouts
    const workoutsToCreate = body.workouts.map((workout: any) => {
      const scheduledAt = createScheduledAtForDay(workout.dayOfWeek, timezone, workout.scheduledHour || 9)
      return {
        user_id: userId,
        weekly_plan_id: weeklyPlan.id,
        scheduled_at: scheduledAt,
        type: workout.focus,
        focus: workout.focus,
        duration_minutes: workout.estimatedDuration || profile?.preferred_workout_duration || 60,
        planned_exercises: { exercises: workout.exercises },
        status: 'scheduled'
      }
    })

    if (workoutsToCreate.length > 0) {
      const { error: workoutsError } = await supabase.from('workouts').insert(workoutsToCreate)
      if (workoutsError) {
        console.error('Error creating workouts:', workoutsError)
      }
    }

    // If adaptations were applied, create trainer notification
    if (body.adaptations_applied?.length > 0) {
      const adaptMsg = `NeuralFit AI: Week ${currentWeek} Adjustments\n\n${body.adaptations_applied.map((a: string) => `• ${a}`).join('\n')}\n\nThese adjustments are based on your recent performance data.`

      await supabase.from('trainer_conversations').insert({
        user_id: userId,
        message_role: 'trainer',
        message_content: adaptMsg,
        message_type: 'adaptation_notice',
        related_master_plan_id: masterPlan.id,
        is_read: false
      })
    }

    console.log(`Weekly plan stored: Week ${currentWeek}, ${body.workouts.length} workouts`)

    return NextResponse.json({
      success: true,
      weeklyPlanId: weeklyPlan.id,
      weekNumber: currentWeek,
      workoutCount: body.workouts.length,
      adaptationsApplied: body.adaptations_applied || [],
      message: 'Weekly plan stored successfully'
    })

  } catch (error) {
    console.error('Store weekly plan error:', error)
    return NextResponse.json({ error: 'Failed to store weekly plan' }, { status: 500 })
  }
}

/**
 * GET - Retrieve the current week's plan
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const timezone = await getUserTimezone(userId)
    const { start: weekStartUtc } = getUserLocalWeekBounds(timezone)
    const weekStartDate = weekStartUtc.split('T')[0]

    const { data: weeklyPlan, error } = await supabase
      .from('weekly_training_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('start_date', weekStartDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!weeklyPlan) {
      return NextResponse.json({ hasWeeklyPlan: false })
    }

    // Get associated workouts
    const { data: workouts } = await supabase
      .from('workouts')
      .select('*')
      .eq('weekly_plan_id', weeklyPlan.id)
      .order('scheduled_at', { ascending: true })

    return NextResponse.json({
      hasWeeklyPlan: true,
      weeklyPlan: {
        ...weeklyPlan,
        workouts: workouts || [],
        isClaudeCodePlan: !!weeklyPlan.claude_code_adaptations
      }
    })

  } catch (error) {
    console.error('Fetch weekly plan error:', error)
    return NextResponse.json({ error: 'Failed to fetch weekly plan' }, { status: 500 })
  }
}

/**
 * PATCH - Update weekly plan (for mid-week adjustments)
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { plan_id, updates } = body

    if (!plan_id || !updates) {
      return NextResponse.json({ error: 'Missing plan_id or updates' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('weekly_training_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', plan_id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, weeklyPlan: data })

  } catch (error) {
    console.error('Update weekly plan error:', error)
    return NextResponse.json({ error: 'Failed to update weekly plan' }, { status: 500 })
  }
}
