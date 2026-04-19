import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * MASTER PLAN API - Pure CRUD
 * 
 * This endpoint stores master training plans created by Claude Code.
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
 * POST - Store a master plan created by Claude Code
 * 
 * Expected body:
 * {
 *   goal: { type, description, baseline_value, target_value, metric_type, target_date },
 *   total_weeks: number,
 *   periodization_phases: [...],
 *   nutrition_phases: [...],
 *   weekly_structure: {...},
 *   progression_strategy: {...},
 *   deload_schedule: {...},
 *   adaptation_rules: {...},
 *   success_metrics: {...},
 *   reasoning: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.goal || !body.total_weeks || !body.periodization_phases) {
      return NextResponse.json({ 
        error: 'Missing required fields: goal, total_weeks, periodization_phases' 
      }, { status: 400 })
    }

    const startDate = new Date()
    const targetDate = body.goal.target_date 
      ? new Date(body.goal.target_date)
      : new Date(startDate.getTime() + body.total_weeks * 7 * 24 * 60 * 60 * 1000)

    // Build the claude_code_plan object
    const claudeCodePlan = {
      plan_summary: body.plan_summary || null,
      nutrition_phases: body.nutrition_phases || [],
      weekly_structure: body.weekly_structure || null,
      progression_strategy: body.progression_strategy || null,
      deload_schedule: body.deload_schedule || null,
      adaptation_rules: body.adaptation_rules || null,
      success_metrics: body.success_metrics || null,
      reasoning: body.reasoning || null,
      generated_by: 'claude-code',
      generated_at: new Date().toISOString()
    }

    // Deactivate any existing active plans
    await supabase
      .from('master_training_plans')
      .update({ status: 'archived' })
      .eq('user_id', userId)
      .eq('status', 'active')

    // Insert the new plan
    const { data: masterPlan, error: planError } = await supabase
      .from('master_training_plans')
      .insert({
        user_id: userId,
        goal_data: { primary_goal: body.goal },
        total_weeks: body.total_weeks,
        current_week: 1,
        start_date: startDate.toISOString().split('T')[0],
        target_completion_date: targetDate.toISOString().split('T')[0],
        projected_completion_date: targetDate.toISOString().split('T')[0],
        periodization_phases: body.periodization_phases,
        progress_velocity: 1.0,
        progress_status: 'on_track',
        status: 'active',
        claude_code_plan: claudeCodePlan
      })
      .select()
      .single()

    if (planError) {
      console.error('Error storing master plan:', planError)
      return NextResponse.json({ error: planError.message }, { status: 500 })
    }

    // Update nutrition targets if nutrition phases provided
    if (body.nutrition_phases?.[0]) {
      const firstPhase = body.nutrition_phases[0]
      
      // Get body weight for protein calculation
      const { data: bodyComp } = await supabase
        .from('body_composition')
        .select('body_weight_lbs')
        .eq('user_id', userId)
        .order('scan_date', { ascending: false })
        .limit(1)
        .single()
      
      const bodyWeight = bodyComp?.body_weight_lbs || 180
      const proteinTarget = Math.round(bodyWeight * (firstPhase.protein_target_per_lb || 1.0))

      await supabase
        .from('nutrition_targets')
        .upsert({
          user_id: userId,
          goal_type: body.goal.type,
          daily_protein: proteinTarget,
          claude_code_phase: firstPhase.phase_name,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
    }

    // Create trainer conversation message
    const phasesList = body.periodization_phases
      .map((phase: any, i: number) => 
        `${i + 1}. ${phase.phase_name} (Weeks ${phase.week_range[0]}-${phase.week_range[1]}): ${phase.focus}`
      )
      .join('\n')

    const message = `NeuralFit AI: Your ${body.total_weeks}-Week Master Plan

Goal: ${body.goal.description}
Timeline: ${startDate.toLocaleDateString()} - ${targetDate.toLocaleDateString()}

${body.plan_summary || ''}

Training Phases:
${phasesList}

Adaptation rules are built in. Let's begin.`

    await supabase.from('trainer_conversations').insert({
      user_id: userId,
      message_role: 'trainer',
      message_content: message,
      message_type: 'plan_creation',
      related_master_plan_id: masterPlan.id,
      is_read: false
    })

    console.log('Master plan stored successfully (Claude Code)')

    return NextResponse.json({
      success: true,
      masterPlanId: masterPlan.id,
      totalWeeks: body.total_weeks,
      phases: body.periodization_phases,
      nutritionPhases: body.nutrition_phases,
      message: 'Master plan stored successfully'
    })

  } catch (error) {
    console.error('Store master plan error:', error)
    return NextResponse.json({ error: 'Failed to store master plan' }, { status: 500 })
  }
}

/**
 * GET - Retrieve the current active master plan
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: masterPlan, error } = await supabase
      .from('master_training_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!masterPlan) {
      return NextResponse.json({ hasMasterPlan: false })
    }

    // Calculate current week
    const startDate = new Date(masterPlan.start_date)
    const today = new Date()
    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
    const calculatedWeek = Math.max(1, Math.floor(daysSinceStart / 7) + 1)
    const currentWeek = Math.min(calculatedWeek, masterPlan.total_weeks)

    // Find current phase
    const currentPhase = masterPlan.periodization_phases?.find((phase: any) =>
      currentWeek >= phase.week_range[0] && currentWeek <= phase.week_range[1]
    )

    // Find current nutrition phase
    const claudeCodePlan = masterPlan.claude_code_plan || {}
    const currentNutritionPhase = claudeCodePlan.nutrition_phases?.find((phase: any) =>
      currentWeek >= phase.week_range[0] && currentWeek <= phase.week_range[1]
    )

    return NextResponse.json({
      hasMasterPlan: true,
      masterPlan: {
        ...masterPlan,
        current_week: currentWeek,
        currentPhase,
        currentNutritionPhase,
        isClaudeCodePlan: !!claudeCodePlan.generated_by
      }
    })

  } catch (error) {
    console.error('Fetch master plan error:', error)
    return NextResponse.json({ error: 'Failed to fetch master plan' }, { status: 500 })
  }
}

/**
 * PATCH - Update master plan (for adaptations)
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
      .from('master_training_plans')
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

    return NextResponse.json({ success: true, masterPlan: data })

  } catch (error) {
    console.error('Update master plan error:', error)
    return NextResponse.json({ error: 'Failed to update master plan' }, { status: 500 })
  }
}
