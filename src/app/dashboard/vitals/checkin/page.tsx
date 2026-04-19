'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Frown, Meh, Smile, Zap, Brain, Heart, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { PageTransition, AnimatedSection } from '@/components/ui/PageTransition'

export default function DailyCheckinPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
  const [soreness, setSoreness] = useState<number>(5)
  const [energy, setEnergy] = useState<number>(5)
  const [stress, setStress] = useState<number>(5)
  const [motivation, setMotivation] = useState<number>(5)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    checkStatus()
  }, [])

  async function checkStatus() {
    try {
      const response = await fetch('/api/vitals/checkin')
      const data = await response.json()
      if (data.checkedIn) {
        setAlreadyCheckedIn(true)
        setSoreness(data.data.soreness || 5)
        setEnergy(data.data.energy || 5)
        setStress(data.data.stress || 5)
        setMotivation(data.data.motivation || 5)
        setNotes(data.data.notes || '')
      }
    } catch (error) {
      console.error('Failed to check status:', error)
    }
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      const response = await fetch('/api/vitals/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soreness, energy, stress, motivation, notes })
      })
      
      const data = await response.json()
      if (data.success) {
        toast.success(`Check-in saved! Recovery score: ${data.data.recoveryScore}`)
        router.push('/dashboard/vitals')
      } else {
        toast.error(data.error || 'Failed to save')
      }
    } catch (error) {
      toast.error('Failed to save check-in')
    } finally {
      setLoading(false)
    }
  }

  function SliderInput({ 
    label, 
    value, 
    onChange, 
    icon: Icon, 
    color,
    lowLabel,
    highLabel,
    inverted = false
  }: { 
    label: string
    value: number
    onChange: (v: number) => void
    icon: any
    color: string
    lowLabel: string
    highLabel: string
    inverted?: boolean
  }) {
    const displayColor = inverted 
      ? (value <= 3 ? 'text-aurora' : value >= 7 ? 'text-nova' : 'text-solar')
      : (value >= 7 ? 'text-aurora' : value <= 3 ? 'text-nova' : 'text-solar')

    return (
      <div className="bg-bg-secondary border border-border-subtle rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-sm font-medium">{label}</span>
          </div>
          <span className={`text-xl font-semibold ${displayColor}`}>{value}</span>
        </div>
        
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 bg-bg-tertiary rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-plasma
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-lg"
        />
        
        <div className="flex justify-between mt-1 text-[10px] text-text-tertiary">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10">
        <div className="absolute inset-0 bg-bg-primary/70 backdrop-blur-xl" />
        <div className="relative px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/vitals')}
            className="p-1 -ml-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-text-secondary hover:text-text-primary active:scale-[0.98] transition-all duration-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Daily Check-in</h1>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent" />
      </div>

      <PageTransition className="px-5 py-5 space-y-5">
        <AnimatedSection>
        {alreadyCheckedIn && (
          <div className="bg-aurora/10 border border-aurora/20 rounded-xl p-3 flex items-center gap-2">
            <Check className="h-4 w-4 text-aurora" />
            <span className="text-sm text-aurora">Already checked in today - updating values</span>
          </div>
        )}

        <p className="text-sm text-text-secondary">
          Rate how you're feeling right now. This helps calculate your readiness and personalize your training.
        </p>
        </AnimatedSection>

        <AnimatedSection>
        <SliderInput
          label="Muscle Soreness"
          value={soreness}
          onChange={setSoreness}
          icon={Activity}
          color="text-nova"
          lowLabel="None"
          highLabel="Very Sore"
          inverted={true}
        />

        <SliderInput
          label="Energy Level"
          value={energy}
          onChange={setEnergy}
          icon={Zap}
          color="text-solar"
          lowLabel="Exhausted"
          highLabel="Energized"
        />

        <SliderInput
          label="Stress Level"
          value={stress}
          onChange={setStress}
          icon={Brain}
          color="text-nebula"
          lowLabel="Calm"
          highLabel="Very Stressed"
          inverted={true}
        />

        <SliderInput
          label="Motivation"
          value={motivation}
          onChange={setMotivation}
          icon={Heart}
          color="text-plasma"
          lowLabel="Not Motivated"
          highLabel="Highly Motivated"
        />
        </AnimatedSection>

        {/* Notes */}
        <AnimatedSection>
        <div className="bg-bg-secondary border border-border-subtle rounded-xl p-4">
          <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything affecting your recovery? Sleep issues, travel, illness..."
            className="w-full bg-bg-tertiary border border-border-subtle rounded-lg p-3 text-sm resize-none h-20
              focus:outline-none focus:ring-1 focus:ring-plasma"
          />
        </div>
        </AnimatedSection>

        {/* Preview Score */}
        <AnimatedSection>
        <div className="bg-gradient-to-br from-plasma/10 to-nebula/10 border border-plasma/20 rounded-xl p-4">
          <div className="text-center">
            <span className="text-xs text-text-tertiary">Estimated Recovery Score</span>
            <div className="text-3xl font-semibold mt-1">
              {Math.round((10 - soreness) * 2.5 + energy * 2.5 + (10 - stress) * 2.5 + motivation * 2.5)}
            </div>
            <span className="text-xs text-text-secondary">
              {(() => {
                const score = (10 - soreness) * 2.5 + energy * 2.5 + (10 - stress) * 2.5 + motivation * 2.5
                if (score >= 80) return 'Optimal - Ready for intensity'
                if (score >= 60) return 'Good - Proceed with plan'
                if (score >= 40) return 'Moderate - Consider lighter work'
                return 'Low - Prioritize recovery'
              })()}
            </span>
          </div>
        </div>
        </AnimatedSection>

        {/* Submit */}
        <AnimatedSection>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-plasma text-bg-primary py-4 min-h-[44px] rounded-xl font-medium
            disabled:opacity-50 disabled:cursor-not-allowed
            active:scale-[0.98] transition-all duration-200"
        >
          {loading ? 'Saving...' : alreadyCheckedIn ? 'Update Check-in' : 'Save Check-in'}
        </button>
        </AnimatedSection>
      </PageTransition>
    </div>
  )
}
