import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/vitals/checkin
 * Records daily recovery check-in data and triggers readiness recalculation
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('lifeos_session')
    let userId = 'anonymous'

    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie.value)
        userId = session.user?.id || session.userId || 'anonymous'
      } catch (e) {
        console.log('Session parse error:', e)
      }
    }

    if (userId === 'anonymous') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { soreness, energy, stress, motivation, notes } = body
    const today = new Date().toISOString().split('T')[0]

    // Calculate recovery score (inverse soreness + energy + motivation - stress)
    // Scale: each component 0-25, sum = 0-100
    const sorenessScore = soreness ? (10 - soreness) * 2.5 : 0 // Inverse - low soreness is good
    const energyScore = energy ? energy * 2.5 : 0
    const motivationScore = motivation ? motivation * 2.5 : 0
    const stressScore = stress ? (10 - stress) * 2.5 : 0 // Inverse - low stress is good
    const recoveryScore = Math.round(sorenessScore + energyScore + motivationScore + stressScore)

    // Upsert recovery log for today
    const { data: recoveryLog, error: recoveryError } = await supabase
      .from('recovery_logs')
      .upsert({
        user_id: userId,
        log_date: today,
        soreness,
        energy,
        stress,
        motivation,
        recovery_score: Math.round(recoveryScore),
        recommendation: getRecommendation(recoveryScore, soreness, energy, stress),
        notes
      }, {
        onConflict: 'user_id,log_date'
      })
      .select()
      .single()

    if (recoveryError) {
      console.error('Recovery log error:', recoveryError)
      return NextResponse.json({ error: recoveryError.message }, { status: 500 })
    }

    // Update readiness score with subjective data
    const { data: existingReadiness } = await supabase
      .from('readiness_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (existingReadiness) {
      // Update existing with subjective scores
      await supabase
        .from('readiness_scores')
        .update({
          soreness,
          energy_level: energy,
          stress_level: stress,
          motivation,
          context_notes: notes,
          subjective_updated_at: new Date().toISOString()
        })
        .eq('id', existingReadiness.id)
    } else {
      // Create new readiness score based on subjective data alone
      const subjectiveScore = Math.round(recoveryScore)
      await supabase
        .from('readiness_scores')
        .insert({
          user_id: userId,
          date: today,
          total_score: subjectiveScore,
          level: getReadinessLevel(subjectiveScore),
          soreness,
          energy_level: energy,
          stress_level: stress,
          motivation,
          context_notes: notes,
          subjective_updated_at: new Date().toISOString()
        })
    }

    return NextResponse.json({
      success: true,
      data: {
        recoveryScore: Math.round(recoveryScore),
        recommendation: getRecommendation(recoveryScore, soreness, energy, stress),
        logged: { soreness, energy, stress, motivation }
      }
    })

  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json(
      { error: 'Failed to save check-in' },
      { status: 500 }
    )
  }
}

function getRecommendation(score: number, soreness: number, energy: number, stress: number): string {
  if (score >= 80) return 'Optimal state - good for high intensity training'
  if (score >= 60) {
    if (soreness >= 7) return 'Manage soreness - focus on mobility and lighter loads'
    if (energy <= 4) return 'Lower energy - consider moderate intensity or extra rest'
    if (stress >= 7) return 'High stress - training can help but keep it enjoyable'
    return 'Good state - proceed with planned training'
  }
  if (score >= 40) return 'Moderate recovery - consider lighter training or active recovery'
  return 'Low recovery - prioritize rest and recovery activities'
}

function getReadinessLevel(score: number): string {
  if (score >= 85) return 'Peak'
  if (score >= 70) return 'Ready'
  if (score >= 55) return 'Moderate'
  if (score >= 40) return 'Low'
  return 'Rest'
}

/**
 * GET /api/vitals/checkin
 * Gets today's check-in status
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('lifeos_session')
    let userId = 'anonymous'

    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie.value)
        userId = session.user?.id || session.userId || 'anonymous'
      } catch (e) {
        console.log('Session parse error:', e)
      }
    }

    if (userId === 'anonymous') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]

    const { data: todayCheckin } = await supabase
      .from('recovery_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', today)
      .single()

    return NextResponse.json({
      success: true,
      checkedIn: !!todayCheckin,
      data: todayCheckin
    })

  } catch (error) {
    console.error('Check-in status error:', error)
    return NextResponse.json(
      { error: 'Failed to get check-in status' },
      { status: 500 }
    )
  }
}
