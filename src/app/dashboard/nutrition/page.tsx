'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check, ChevronDown, ChevronRight, Clock, Zap,
  Utensils, Pill, Flame, ShoppingCart, Package,
  CalendarDays, AlertTriangle, Drumstick
} from 'lucide-react'
import { PageTransition, AnimatedSection } from '@/components/ui/PageTransition'

interface TimelineItem {
  time: string
  type: 'meal' | 'supplement' | 'workout'
  name: string
  macros?: { calories: number; protein: number; carbs: number; fat: number }
  supplements?: string[]
  completed: boolean
  completed_at?: string
}

interface TimelineData {
  timeline: TimelineItem[]
  targets: { calories: number; protein: number; carbs: number; fat: number }
  consumed: { calories: number; protein: number; carbs: number; fat: number }
  remaining: { calories: number; protein: number; carbs: number; fat: number }
  workout: { time: string; type: string } | null
}

interface AlertData {
  lowStockItems: number
  lowStockSupps: number
  shoppingPending: number
}

export default function NutritionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [timeline, setTimeline] = useState<TimelineData | null>(null)
  const [alerts, setAlerts] = useState<AlertData>({ lowStockItems: 0, lowStockSupps: 0, shoppingPending: 0 })
  const [hasSupplements, setHasSupplements] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['upcoming']))
  const [completingItem, setCompletingItem] = useState<number | null>(null)

  useEffect(() => {
    loadAllData()
    const interval = setInterval(() => setTimeline(t => t ? {...t} : null), 60000)
    return () => clearInterval(interval)
  }, [])

  async function loadAllData() {
    try {
      const [timelineRes, inventoryRes, suppsRes, shoppingRes] = await Promise.all([
        fetch('/api/nutrition/timeline'),
        fetch('/api/nutrition/inventory'),
        fetch('/api/nutrition/supplements'),
        fetch('/api/nutrition/shopping')
      ])

      const [timelineData, inventoryData, suppsData, shoppingData] = await Promise.all([
        timelineRes.json(),
        inventoryRes.json(),
        suppsRes.json(),
        shoppingRes.json()
      ])

      if (timelineData.success) {
        setTimeline(timelineData)
      }

      const items = inventoryData.inventory?.items || inventoryData.items || []
      const lowStockItems = items.filter((i: any) =>
        i.servings_remaining !== null && i.servings_remaining <= 2
      ).length

      const supps = suppsData.supplements || []
      setHasSupplements(supps.length > 0)
      const lowStockSupps = supps.filter((s: any) =>
        s.servings_remaining !== null && s.servings_remaining <= s.reorder_threshold
      ).length

      const shoppingItems = shoppingData.items || []
      const shoppingPending = shoppingItems.filter((i: any) => !i.purchased).length

      setAlerts({ lowStockItems, lowStockSupps, shoppingPending })
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function completeItem(index: number) {
    if (!timeline || completingItem !== null) return
    setCompletingItem(index)

    try {
      const res = await fetch('/api/nutrition/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_index: index, completed: true })
      })
      const data = await res.json()
      if (data.success) {
        setTimeline(prev => prev ? {
          ...prev,
          timeline: data.timeline,
          consumed: data.consumed,
          remaining: data.remaining
        } : null)
      }
    } catch (error) {
      console.error('Failed to complete item:', error)
    } finally {
      setCompletingItem(null)
    }
  }

  const upNext = useMemo(() => {
    if (!timeline?.timeline) return null
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    return timeline.timeline.find((item) => {
      if (item.completed || item.type === 'workout') return false
      const [h, m] = item.time.split(':').map(Number)
      const itemMinutes = h * 60 + m
      return itemMinutes >= currentMinutes - 30
    })
  }, [timeline])

  const upNextIndex = useMemo(() => {
    if (!timeline?.timeline || !upNext) return -1
    return timeline.timeline.findIndex(item =>
      item.time === upNext.time && item.name === upNext.name && !item.completed
    )
  }, [timeline, upNext])

  const groupedTimeline = useMemo(() => {
    if (!timeline?.timeline) return { completed: [], upcoming: [] }

    const nutritionItems = timeline.timeline.filter(item => item.type !== 'workout')

    const completed = nutritionItems
      .map((item) => ({ ...item, originalIndex: timeline.timeline.indexOf(item) }))
      .filter(item => item.completed)

    const upcoming = nutritionItems
      .map((item) => ({ ...item, originalIndex: timeline.timeline.indexOf(item) }))
      .filter(item => !item.completed)

    return { completed, upcoming }
  }, [timeline])

  const progressPercent = useMemo(() => {
    if (!timeline?.timeline) return 0
    const nutritionItems = timeline.timeline.filter(i => i.type !== 'workout')
    const total = nutritionItems.length
    if (total === 0) return 0
    const done = nutritionItems.filter(i => i.completed).length
    return Math.round((done / total) * 100)
  }, [timeline])

  const caloriePercent = useMemo(() => {
    if (!timeline?.targets?.calories) return 0
    return Math.min(100, Math.round((timeline.consumed.calories / timeline.targets.calories) * 100))
  }, [timeline])

  const proteinPercent = useMemo(() => {
    if (!timeline?.targets?.protein) return 0
    return Math.min(100, Math.round((timeline.consumed.protein / timeline.targets.protein) * 100))
  }, [timeline])

  function toggleSection(section: string) {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  function formatTime(time: string) {
    const [h, m] = time.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`
  }

  function getItemIcon(type: string) {
    switch (type) {
      case 'meal': return Utensils
      case 'supplement': return Pill
      default: return Clock
    }
  }

  const hasAlerts = alerts.lowStockItems > 0 || alerts.lowStockSupps > 0 || alerts.shoppingPending > 0

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-plasma/20 border-t-plasma rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-24">
      {/* Glass Header */}
      <header className="sticky top-0 z-20 safe-area-top">
        <div className="absolute inset-0 bg-bg-primary/70 backdrop-blur-xl" />
        <div className="relative px-5 py-4 flex items-end justify-between">
          <h1 className="text-2xl font-semibold text-text-primary">Nutrition</h1>
          <div className="flex items-center gap-3">
            {hasAlerts && (
              <button
                onClick={() => router.push('/dashboard/nutrition/shopping')}
                className="flex items-center gap-1.5 px-2 py-1 min-h-[44px] min-w-[44px] bg-solar/10 rounded-lg active:scale-[0.98] transition-all duration-200"
              >
                <AlertTriangle className="h-4 w-4 text-solar" />
                <span className="text-xs font-semibold text-solar">
                  {alerts.lowStockItems + alerts.lowStockSupps + alerts.shoppingPending}
                </span>
              </button>
            )}
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-glass-border-dark to-transparent" />
      </header>

      <PageTransition className="px-5 py-5 space-y-5">
      {/* Progress Bar */}
      <AnimatedSection>
        <div>
          <div className="flex items-center justify-between text-xs text-text-tertiary mb-1.5">
            <span>Day Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-aurora to-plasma transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </AnimatedSection>

      {/* Up Next - Hero Section */}
      {upNext && (
        <AnimatedSection>
          <div className="bg-gradient-to-br from-aurora/10 to-plasma/5 border border-aurora/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-aurora text-xs font-semibold mb-2">
              <Zap className="h-3.5 w-3.5" />
              UP NEXT
            </div>

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {upNext.type === 'meal' && <Utensils className="h-4 w-4 text-aurora" />}
                  {upNext.type === 'supplement' && <Pill className="h-4 w-4 text-solar" />}
                  <span className="text-lg font-semibold">{upNext.name}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(upNext.time)}
                  </span>
                  {upNext.macros && (
                    <span>{upNext.macros.calories} cal | {upNext.macros.protein}g protein</span>
                  )}
                  {upNext.supplements && upNext.supplements.length > 0 && (
                    <span>{upNext.supplements.length} supplements</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => upNextIndex >= 0 && completeItem(upNextIndex)}
                disabled={completingItem === upNextIndex}
                className="min-h-[44px] min-w-[44px] w-12 h-12 rounded-xl bg-aurora text-white flex items-center justify-center active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
              >
                {completingItem === upNextIndex ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* Macro Stats */}
      {timeline && (
        <AnimatedSection>
          <div className="bg-bg-secondary border border-border-subtle rounded-xl p-4 space-y-3">
            {/* Calories */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Flame className="h-3.5 w-3.5 text-solar" />
                  Calories
                </span>
                <span className="text-text-tertiary">
                  {timeline.consumed.calories} / {timeline.targets.calories}
                </span>
              </div>
              <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-solar transition-all duration-500"
                  style={{ width: `${caloriePercent}%` }}
                />
              </div>
            </div>

            {/* Protein */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Drumstick className="h-3.5 w-3.5 text-aurora" />
                  Protein
                </span>
                <span className="text-text-tertiary">
                  {timeline.consumed.protein}g / {timeline.targets.protein}g
                </span>
              </div>
              <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-aurora transition-all duration-500"
                  style={{ width: `${proteinPercent}%` }}
                />
              </div>
            </div>

            {/* Other macros row */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border-subtle">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-tertiary">Carbs</span>
                <span className="text-sm font-semibold">{timeline.consumed.carbs}g <span className="text-text-tertiary font-normal">/ {timeline.targets.carbs}g</span></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-tertiary">Fat</span>
                <span className="text-sm font-semibold">{timeline.consumed.fat}g <span className="text-text-tertiary font-normal">/ {timeline.targets.fat}g</span></span>
              </div>
            </div>
          </div>

          <div className="text-xs text-text-tertiary text-center mt-2">
            {timeline.remaining.calories} cal | {timeline.remaining.protein}g protein remaining
          </div>
        </AnimatedSection>
      )}

      {/* Upcoming Section */}
      {groupedTimeline.upcoming.length > 0 && (
        <AnimatedSection>
          <button
            onClick={() => toggleSection('upcoming')}
            className="w-full flex items-center justify-between py-2 min-h-[44px]"
          >
            <span className="text-sm font-semibold text-text-secondary">
              Upcoming ({groupedTimeline.upcoming.length})
            </span>
            <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform ${
              expandedSections.has('upcoming') ? 'rotate-180' : ''
            }`} />
          </button>

          {expandedSections.has('upcoming') && (
            <div className="space-y-2">
              {groupedTimeline.upcoming.map((item) => {
                const Icon = getItemIcon(item.type)
                const isNext = upNext && item.time === upNext.time && item.name === upNext.name

                return (
                  <div
                    key={`${item.time}-${item.name}-${item.originalIndex}`}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isNext
                        ? 'bg-aurora/5 border border-aurora/20'
                        : 'bg-bg-secondary border border-border-subtle'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      item.type === 'meal' ? 'bg-aurora/10 text-aurora' : 'bg-solar/10 text-solar'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.name}</div>
                      <div className="text-xs text-text-tertiary">
                        {formatTime(item.time)}
                        {item.macros && ` | ${item.macros.calories} cal`}
                        {item.supplements && item.supplements.length > 0 && ` | ${item.supplements.length} supps`}
                      </div>
                    </div>

                    <button
                      onClick={() => completeItem(item.originalIndex)}
                      disabled={completingItem === item.originalIndex}
                      className="min-h-[44px] min-w-[44px] w-8 h-8 rounded-lg border border-border-subtle flex items-center justify-center hover:bg-bg-tertiary active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                    >
                      {completingItem === item.originalIndex ? (
                        <div className="w-4 h-4 border-2 border-text-tertiary/30 border-t-text-tertiary rounded-full animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 text-text-tertiary" />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </AnimatedSection>
      )}

      {/* Completed Section */}
      {groupedTimeline.completed.length > 0 && (
        <AnimatedSection>
          <button
            onClick={() => toggleSection('completed')}
            className="w-full flex items-center justify-between py-2 min-h-[44px]"
          >
            <span className="text-sm font-semibold text-text-secondary">
              Completed ({groupedTimeline.completed.length})
            </span>
            <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform ${
              expandedSections.has('completed') ? 'rotate-180' : ''
            }`} />
          </button>

          {expandedSections.has('completed') && (
            <div className="space-y-2">
              {groupedTimeline.completed.map((item) => (
                <div
                  key={`${item.time}-${item.name}-${item.originalIndex}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-bg-secondary/50 border border-border-subtle opacity-60"
                >
                  <div className="w-8 h-8 rounded-lg bg-aurora/10 flex items-center justify-center">
                    <Check className="h-4 w-4 text-aurora" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate line-through">{item.name}</div>
                    <div className="text-xs text-text-tertiary">{formatTime(item.time)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimatedSection>
      )}

      {/* No Plan State */}
      {(!timeline || groupedTimeline.upcoming.length === 0) && groupedTimeline.completed.length === 0 && (
        <AnimatedSection>
          <div className="bg-gradient-to-br from-aurora/10 to-plasma/10 border border-aurora/20 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-aurora/20 flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="h-6 w-6 text-aurora" />
            </div>
            <h3 className="font-semibold mb-1">No meals planned for today</h3>
            {hasSupplements ? (
              <p className="text-sm text-text-secondary">
                Supplements are scheduled in{' '}
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-aurora font-medium underline underline-offset-2"
                >
                  Today's Plan
                </button>
                .
              </p>
            ) : (
              <p className="text-sm text-text-secondary">Create a weekly plan to see your meals and supplements here.</p>
            )}
          </div>
        </AnimatedSection>
      )}

      {/* Quick Links */}
      <AnimatedSection>
        <div className="bg-bg-secondary border border-border-subtle rounded-xl divide-y divide-border-subtle">
          <button
            onClick={() => router.push('/dashboard/nutrition/shopping')}
            className="w-full flex items-center justify-between p-4 min-h-[44px] active:scale-[0.98] transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-aurora/10 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-aurora" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Shopping List</span>
                {alerts.shoppingPending > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-aurora/10 text-aurora rounded-full">
                    {alerts.shoppingPending}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-text-tertiary" />
          </button>

          <button
            onClick={() => router.push('/dashboard/nutrition/inventory')}
            className="w-full flex items-center justify-between p-4 min-h-[44px] active:scale-[0.98] transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-solar/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-solar" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Pantry</span>
                {alerts.lowStockItems > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-solar/10 text-solar rounded-full">
                    {alerts.lowStockItems} low
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-text-tertiary" />
          </button>

          <button
            onClick={() => router.push('/dashboard/nutrition/supplements')}
            className="w-full flex items-center justify-between p-4 min-h-[44px] active:scale-[0.98] transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Pill className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Supplements</span>
                {alerts.lowStockSupps > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-solar/10 text-solar rounded-full">
                    {alerts.lowStockSupps} to reorder
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-text-tertiary" />
          </button>

        </div>
      </AnimatedSection>
      </PageTransition>
    </div>
  )
}
