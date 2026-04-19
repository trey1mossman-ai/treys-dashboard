import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getUserTimezone, getUserLocalDayBounds } from '@/lib/fitness/timezone';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function determineWorkoutIntensity(workoutType: string, workoutFocus: string): 'heavy' | 'moderate' | 'light' {
  const type = (workoutType || '').toLowerCase();
  const focus = (workoutFocus || '').toLowerCase();
  const combined = `${type} ${focus}`;

  if (combined.includes('lower body') || combined.includes('legs') || combined.includes('full body') ||
      combined.includes('deadlift') || combined.includes('squat')) {
    return 'heavy';
  }

  if (combined.includes('cardio') || combined.includes('recovery') || combined.includes('mobility') ||
      combined.includes('liss') || combined.includes('stretch')) {
    return 'light';
  }

  if (combined.includes('upper body') || combined.includes('upper') || combined.includes('push') ||
      combined.includes('pull') || combined.includes('bench') || combined.includes('arms') ||
      combined.includes('sprint') || combined.includes('hiit')) {
    return 'moderate';
  }

  return 'moderate';
}

function calculateCurrentWeek(startDate: string): number {
  const start = new Date(startDate);
  const today = new Date();
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(1, Math.floor(daysSinceStart / 7) + 1);
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('lifeos_session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const userId = session.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    const tz = await getUserTimezone(userId);
    const { start: dayStartUTC, end: dayEndUTC } = getUserLocalDayBounds(tz);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });

    // Get nutrition targets
    const { data: targets, error: targetsError } = await supabase
      .from('nutrition_targets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (targetsError || !targets) {
      return NextResponse.json(
        { error: 'Nutrition targets not found. Please set up your nutrition profile first.' },
        { status: 404 }
      );
    }

    // Check for Claude Code master plan with nutrition phases
    const { data: masterPlan } = await supabase
      .from('master_training_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let claudeCodeNutrition: any = null;
    let currentNutritionPhase: any = null;

    if (masterPlan?.claude_code_plan?.nutrition_phases) {
      const currentWeek = calculateCurrentWeek(masterPlan.start_date);
      currentNutritionPhase = masterPlan.claude_code_plan.nutrition_phases.find((phase: any) =>
        currentWeek >= phase.week_range[0] && currentWeek <= phase.week_range[1]
      );

      if (currentNutritionPhase) {
        claudeCodeNutrition = {
          phase_name: currentNutritionPhase.phase_name,
          calorie_adjustment: currentNutritionPhase.calorie_adjustment,
          protein_target_per_lb: currentNutritionPhase.protein_target_per_lb,
          carb_strategy: currentNutritionPhase.carb_strategy,
          fat_target_percent: currentNutritionPhase.fat_target_percent,
          rationale: currentNutritionPhase.rationale,
          matches_training_phase: currentNutritionPhase.matches_training_phase
        };
      }
    }

    // Get today's workout (timezone-aware UTC bounds)
    const { data: workout } = await supabase
      .from('workouts')
      .select('scheduled_at, type, focus, duration_minutes')
      .eq('user_id', userId)
      .gte('scheduled_at', dayStartUTC)
      .lte('scheduled_at', dayEndUTC)
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    // Get today's consumed macros (timezone-aware UTC bounds)
    const { data: mealLogs } = await supabase
      .from('meal_log')
      .select('total_calories, total_protein, total_carbs, total_fat')
      .eq('user_id', userId)
      .gte('timestamp', dayStartUTC)
      .lte('timestamp', dayEndUTC);

    const consumed = (mealLogs || []).reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.total_calories || 0),
        protein: acc.protein + (meal.total_protein || 0),
        carbs: acc.carbs + (meal.total_carbs || 0),
        fat: acc.fat + (meal.total_fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    let dayType: 'heavy' | 'moderate' | 'light' | 'rest';
    let adjustedTargets: { calories: number; protein: number; carbs: number; fat: number };

    if (workout) {
      const intensity = determineWorkoutIntensity(workout.type, workout.focus);
      dayType = intensity;

      const trainingAdj = targets.training_day_adjustments || {};
      const intensityTargets = trainingAdj[intensity];

      if (intensityTargets) {
        adjustedTargets = {
          calories: intensityTargets.calories || targets.daily_calories,
          protein: intensityTargets.protein || targets.daily_protein,
          carbs: intensityTargets.carbs || targets.daily_carbs,
          fat: intensityTargets.fat || targets.daily_fat,
        };
      } else {
        adjustedTargets = {
          calories: targets.daily_calories,
          protein: targets.daily_protein,
          carbs: targets.daily_carbs,
          fat: targets.daily_fat,
        };
      }
    } else {
      dayType = 'rest';
      const restAdj = targets.rest_day_adjustments || {};

      adjustedTargets = {
        calories: restAdj.calories || targets.daily_calories,
        protein: restAdj.protein || targets.daily_protein,
        carbs: restAdj.carbs || targets.daily_carbs,
        fat: restAdj.fat || targets.daily_fat,
      };
    }

    const remaining = {
      calories: Math.max(0, adjustedTargets.calories - consumed.calories),
      protein: Math.max(0, adjustedTargets.protein - consumed.protein),
      carbs: Math.max(0, adjustedTargets.carbs - consumed.carbs),
      fat: Math.max(0, adjustedTargets.fat - consumed.fat),
    };

    const percentComplete = {
      calories: adjustedTargets.calories > 0 ? Math.round((consumed.calories / adjustedTargets.calories) * 100) : 0,
      protein: adjustedTargets.protein > 0 ? Math.round((consumed.protein / adjustedTargets.protein) * 100) : 0,
      carbs: adjustedTargets.carbs > 0 ? Math.round((consumed.carbs / adjustedTargets.carbs) * 100) : 0,
      fat: adjustedTargets.fat > 0 ? Math.round((consumed.fat / adjustedTargets.fat) * 100) : 0,
    };

    return NextResponse.json({
      success: true,
      date: today,
      day_type: dayType,
      workout: workout ? {
        scheduled_at: workout.scheduled_at,
        type: workout.type,
        focus: workout.focus,
        duration_minutes: workout.duration_minutes,
      } : null,
      targets: {
        calories: Math.round(adjustedTargets.calories),
        protein: Math.round(adjustedTargets.protein),
        carbs: Math.round(adjustedTargets.carbs),
        fat: Math.round(adjustedTargets.fat),
      },
      consumed: {
        calories: Math.round(consumed.calories),
        protein: Math.round(consumed.protein),
        carbs: Math.round(consumed.carbs),
        fat: Math.round(consumed.fat),
      },
      remaining: {
        calories: Math.round(remaining.calories),
        protein: Math.round(remaining.protein),
        carbs: Math.round(remaining.carbs),
        fat: Math.round(remaining.fat),
      },
      percent_complete: percentComplete,
      goal_type: targets.goal_type || 'maintenance',
      claude_code_phase: targets.claude_code_phase || null,
      claude_code_nutrition: claudeCodeNutrition,
      is_claude_code_managed: !!claudeCodeNutrition
    });
  } catch (error) {
    console.error('Targets route error:', error);
    return NextResponse.json({ error: 'Failed to fetch nutrition targets' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('lifeos_session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const userId = session.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    const body = await request.json();
    const { daily_calories, daily_protein, daily_carbs, daily_fat, training_day_adjustments, rest_day_adjustments, goal_type } = body;

    const updates: any = { updated_at: new Date().toISOString() };

    if (daily_calories !== undefined) updates.daily_calories = daily_calories;
    if (daily_protein !== undefined) updates.daily_protein = daily_protein;
    if (daily_carbs !== undefined) updates.daily_carbs = daily_carbs;
    if (daily_fat !== undefined) updates.daily_fat = daily_fat;
    if (training_day_adjustments !== undefined) updates.training_day_adjustments = training_day_adjustments;
    if (rest_day_adjustments !== undefined) updates.rest_day_adjustments = rest_day_adjustments;
    if (goal_type !== undefined) updates.goal_type = goal_type;

    if (training_day_adjustments || rest_day_adjustments || daily_calories) {
      const { data: current } = await supabase.from('nutrition_targets').select('*').eq('user_id', userId).single();

      if (current) {
        const trainingAdj = training_day_adjustments || current.training_day_adjustments || {};
        const restAdj = rest_day_adjustments || current.rest_day_adjustments || {};

        const heavyDays = 2, moderateDays = 3, lightDays = 1, restDays = 1;

        const weeklyTotal =
          (trainingAdj.heavy?.calories || 0) * heavyDays +
          (trainingAdj.moderate?.calories || 0) * moderateDays +
          (trainingAdj.light?.calories || 0) * lightDays +
          (restAdj.calories || 0) * restDays;

        updates.weekly_calorie_target = weeklyTotal;

        const allCalories = [trainingAdj.heavy?.calories, trainingAdj.moderate?.calories, trainingAdj.light?.calories, restAdj.calories]
          .filter(c => c !== undefined && c !== null);

        if (allCalories.length > 0) {
          updates.daily_calorie_range = { min: Math.min(...allCalories), max: Math.max(...allCalories) };
        }
      }
    }

    const { data, error } = await supabase.from('nutrition_targets').update(updates).eq('user_id', userId).select().single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: 'Failed to update nutrition targets' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Targets PUT route error:', error);
    return NextResponse.json({ error: 'Failed to update nutrition targets' }, { status: 500 });
  }
}

/**
 * POST: Sync nutrition targets with current Claude Code fitness phase
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('lifeos_session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const userId = session.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    // Get active master plan
    const { data: masterPlan } = await supabase
      .from('master_training_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!masterPlan) {
      return NextResponse.json({ error: 'No active master plan found' }, { status: 404 });
    }

    const claudeCodePlan = masterPlan.claude_code_plan;
    if (!claudeCodePlan?.nutrition_phases) {
      return NextResponse.json({ error: 'Master plan does not have NeuralFit AI nutrition phases' }, { status: 400 });
    }

    const currentWeek = calculateCurrentWeek(masterPlan.start_date);
    const currentNutritionPhase = claudeCodePlan.nutrition_phases.find((phase: any) =>
      currentWeek >= phase.week_range[0] && currentWeek <= phase.week_range[1]
    );

    if (!currentNutritionPhase) {
      return NextResponse.json({ error: 'No nutrition phase found for current week' }, { status: 400 });
    }

    // Get current body weight for protein calculation
    const { data: bodyComp } = await supabase
      .from('body_composition')
      .select('body_weight_lbs')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    const { data: profile } = await supabase.from('user_fitness_profile').select('*').eq('user_id', userId).single();

    const currentWeight = bodyComp?.body_weight_lbs || profile?.current_weight || 180;
    const proteinPerLb = currentNutritionPhase.protein_target_per_lb || 1.0;
    const proteinTarget = Math.round(currentWeight * proteinPerLb);

    // Get current targets
    const { data: currentTargets } = await supabase.from('nutrition_targets').select('*').eq('user_id', userId).single();

    if (!currentTargets) {
      return NextResponse.json({ error: 'Nutrition targets not found' }, { status: 404 });
    }

    // Apply calorie adjustment
    let calorieAdjustment = 0;
    const adjStr = currentNutritionPhase.calorie_adjustment || '';
    const adjMatch = adjStr.match(/([+-]?)(\d+)/);
    if (adjMatch) {
      const sign = adjMatch[1] === '-' ? -1 : 1;
      calorieAdjustment = sign * parseInt(adjMatch[2]);
    }

    const newCalories = currentTargets.daily_calories + calorieAdjustment;

    // Update targets
    const updates = {
      daily_protein: proteinTarget,
      daily_calories: newCalories,
      claude_code_phase: currentNutritionPhase.phase_name,
      goal_type: masterPlan.goal_data?.primary_goal?.type || currentTargets.goal_type,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('nutrition_targets')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Sync error:', error);
      return NextResponse.json({ error: 'Failed to sync nutrition targets' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      synced: true,
      currentWeek,
      phase: currentNutritionPhase.phase_name,
      updates: {
        protein: proteinTarget,
        calories: newCalories,
        calorie_adjustment: calorieAdjustment
      },
      rationale: currentNutritionPhase.rationale,
      data
    });
  } catch (error) {
    console.error('Sync route error:', error);
    return NextResponse.json({ error: 'Failed to sync nutrition targets' }, { status: 500 });
  }
}
