// @ts-nocheck
/**
 * Timeline Utilities
 * Transforms workouts, meals, and supplements into a unified chronological timeline
 */

export interface TimelineSupplementItem {
  id: string
  name: string
  dosage: string
  taken: boolean
  scheduleId?: string
}

export interface TimelineSupplementGroup {
  type: 'supplement_group'
  id: string
  name: string
  time: string
  timestamp: number
  items: TimelineSupplementItem[]
  takenCount: number
  totalCount: number
  allTaken: boolean
  reason?: string
}

export interface TimelineMeal {
  type: 'meal'
  id: string
  name: string
  time: string
  timestamp: number
  calories: number
  protein: number
  carbs: number
  fat: number
  status: 'pending' | 'logged' | 'skipped'
  ingredients: Array<{
    item_name: string
    quantity: number
    unit: string
  }>
}

export interface TimelineExercise {
  name: string
  sets: number
  reps: number | string
  weight?: number
  notes?: string
  duration?: string
  block?: string
}

export interface TimelineWorkout {
  type: 'workout'
  id: string
  focus: string
  workoutType: string
  time: string
  timestamp: number
  duration: number
  status: 'scheduled' | 'in_progress' | 'completed'
  exercises: TimelineExercise[]
  blockName?: string
}

export type TimelineItem = TimelineSupplementGroup | TimelineMeal | TimelineWorkout

export interface TimelineBlock {
  time: string
  timestamp: number
  items: TimelineItem[]
  status: 'pending' | 'partial' | 'complete'
}

/**
 * Parse time string to minutes since midnight for sorting
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0

  // Handle "8:00 AM" format - FIXED regex with proper backslashes
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (!match) return 0

  let hours = parseInt(match[1])
  const minutes = parseInt(match[2])
  const period = match[3]?.toUpperCase()

  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0

  return hours * 60 + minutes
}

/**
 * Format minutes since midnight to display time
 */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
  return `${displayHour}:${String(mins).padStart(2, '0')} ${period}`
}

/**
 * Extract time from block name like "Morning Gentle Movement (9:00 AM)"
 */
function extractTimeFromBlock(block: string): { time: string; timestamp: number } | null {
  // FIXED regex with proper backslashes
  const match = block.match(/\((\d{1,2}:\d{2}\s*(?:AM|PM))\)/i)
  if (match) {
    const time = match[1]
    return { time, timestamp: parseTimeToMinutes(time) }
  }
  return null
}

/**
 * Get item completion status
 */
function getItemStatus(item: TimelineItem): 'pending' | 'partial' | 'complete' {
  switch (item.type) {
    case 'supplement_group':
      if (item.allTaken) return 'complete'
      if (item.takenCount > 0) return 'partial'
      return 'pending'
    case 'meal':
      return item.status === 'logged' ? 'complete' : 'pending'
    case 'workout':
      if (item.status === 'completed') return 'complete'
      if (item.status === 'in_progress') return 'partial'
      return 'pending'
  }
}

/**
 * Calculate block status from items
 */
function calculateBlockStatus(items: TimelineItem[]): 'pending' | 'partial' | 'complete' {
  const statuses = items.map(getItemStatus)
  if (statuses.every(s => s === 'complete')) return 'complete'
  if (statuses.some(s => s === 'complete' || s === 'partial')) return 'partial'
  return 'pending'
}

/**
 * Build unified timeline from workouts, meals, and supplements
 */
export function buildTimeline(
  workouts: Array<{
    id: string
    focus: string
    type: string
    scheduledAt: string
    localTime?: string
    duration: number
    status: string
    exercises: TimelineExercise[]
  }>,
  meals: Array<{
    id: string
    type: string
    name: string
    time: string
    calories: number
    protein: number
    carbs: number
    fat: number
    status: 'pending' | 'logged' | 'skipped'
    ingredients: Array<{ item_name: string; quantity: number; unit: string }>
  }>,
  supplementGroups: Array<{
    name: string
    time: string
    items: Array<{ id: string; name: string; dosage: string; taken: boolean; scheduleId?: string; reason?: string }>
    allTaken: boolean
  }>
): TimelineBlock[] {
  const items: TimelineItem[] = []

  // Transform supplement groups
  for (const group of supplementGroups) {
    const timestamp = parseTimeToMinutes(group.time)
    const takenCount = group.items.filter(i => i.taken).length

    items.push({
      type: 'supplement_group',
      id: `supp-${group.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: group.name,
      time: group.time,
      timestamp,
      items: group.items.map(i => ({
        id: i.id,
        name: i.name,
        dosage: i.dosage,
        taken: i.taken,
        scheduleId: i.scheduleId
      })),
      takenCount,
      totalCount: group.items.length,
      allTaken: group.allTaken,
      reason: group.items[0]?.reason
    })
  }

  // Transform meals
  for (const meal of meals) {
    const timestamp = parseTimeToMinutes(meal.time)

    items.push({
      type: 'meal',
      id: meal.id,
      name: meal.name,
      time: meal.time,
      timestamp,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      status: meal.status,
      ingredients: meal.ingredients
    })
  }

  // Deduplicate workouts by scheduled time (within 5 min window)
  // Keeps the workout with the most exercises when duplicates exist at same slot
  const deduplicatedWorkouts = [...workouts]
  const workoutsByTime = new Map<number, typeof workouts[0]>()
  const filteredWorkoutIds = new Set<string>()

  for (const workout of deduplicatedWorkouts) {
    const exercises = workout.exercises || []
    let timestamp: number
    if (workout.localTime) {
      timestamp = parseTimeToMinutes(workout.localTime)
    } else {
      const scheduledDate = new Date(workout.scheduledAt)
      timestamp = scheduledDate.getHours() * 60 + scheduledDate.getMinutes()
    }

    // Round to 5-minute bucket for dedup
    const bucket = Math.round(timestamp / 5) * 5
    const existing = workoutsByTime.get(bucket)

    if (!existing) {
      workoutsByTime.set(bucket, workout)
    } else {
      // Keep the one with more exercises
      const existingCount = (existing.exercises || []).length
      if (exercises.length > existingCount) {
        filteredWorkoutIds.add(existing.id)
        workoutsByTime.set(bucket, workout)
      } else {
        filteredWorkoutIds.add(workout.id)
      }
    }
  }

  const uniqueWorkouts = deduplicatedWorkouts.filter(w => !filteredWorkoutIds.has(w.id))

  // Transform workouts - SPLIT by exercise block if blocks have different times
  for (const workout of uniqueWorkouts) {
    const exercises = workout.exercises || []

    // Group exercises by their block (time slot)
    const blockGroups = new Map<string, TimelineExercise[]>()

    for (const ex of exercises) {
      const blockKey = ex.block || 'default'
      if (!blockGroups.has(blockKey)) {
        blockGroups.set(blockKey, [])
      }
      blockGroups.get(blockKey)!.push(ex)
    }

    // If all exercises are in one block or no blocks, treat as single workout
    if (blockGroups.size <= 1) {
      // Use server-provided localTime (timezone-correct) or fall back to browser parsing
      let time: string
      let timestamp: number
      if (workout.localTime) {
        time = workout.localTime
        timestamp = parseTimeToMinutes(time)
      } else {
        const scheduledDate = new Date(workout.scheduledAt)
        const hours = scheduledDate.getHours()
        const minutes = scheduledDate.getMinutes()
        const period = hours >= 12 ? 'PM' : 'AM'
        const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
        time = `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
        timestamp = hours * 60 + minutes
      }

      items.push({
        type: 'workout',
        id: workout.id,
        focus: workout.focus,
        workoutType: workout.type,
        time,
        timestamp,
        duration: workout.duration,
        status: workout.status as 'scheduled' | 'in_progress' | 'completed',
        exercises
      })
    } else {
      // Split into multiple timeline entries by block
      for (const [blockName, blockExercises] of blockGroups) {
        const timeInfo = extractTimeFromBlock(blockName)

        if (timeInfo) {
          // Extract block display name (without time) - FIXED regex
          const displayName = blockName.replace(/\s*\(\d{1,2}:\d{2}\s*(?:AM|PM)\)/i, '').trim()

          items.push({
            type: 'workout',
            id: `${workout.id}-${blockName.replace(/\s+/g, '-').toLowerCase()}`,
            focus: displayName || workout.focus,
            workoutType: workout.type,
            time: timeInfo.time,
            timestamp: timeInfo.timestamp,
            duration: Math.round(workout.duration / blockGroups.size),
            status: workout.status as 'scheduled' | 'in_progress' | 'completed',
            exercises: blockExercises,
            blockName
          })
        } else {
          // Fallback: use workout scheduled time if can't parse block time
          const scheduledDate = new Date(workout.scheduledAt)
          const hours = scheduledDate.getHours()
          const minutes = scheduledDate.getMinutes()
          const period = hours >= 12 ? 'PM' : 'AM'
          const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
          const time = `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
          const timestamp = hours * 60 + minutes

          items.push({
            type: 'workout',
            id: `${workout.id}-${blockName.replace(/\s+/g, '-').toLowerCase()}`,
            focus: blockName || workout.focus,
            workoutType: workout.type,
            time,
            timestamp,
            duration: Math.round(workout.duration / blockGroups.size),
            status: workout.status as 'scheduled' | 'in_progress' | 'completed',
            exercises: blockExercises,
            blockName
          })
        }
      }
    }
  }

  // Sort by timestamp
  items.sort((a, b) => a.timestamp - b.timestamp)

  // Group items by time (within 15 min window)
  const blocks: TimelineBlock[] = []
  let currentBlock: TimelineBlock | null = null

  for (const item of items) {
    if (!currentBlock || Math.abs(item.timestamp - currentBlock.timestamp) > 15) {
      currentBlock = {
        time: item.time,
        timestamp: item.timestamp,
        items: [item],
        status: 'pending'
      }
      blocks.push(currentBlock)
    } else {
      currentBlock.items.push(item)
    }
  }

  // Calculate block statuses
  for (const block of blocks) {
    block.status = calculateBlockStatus(block.items)
  }

  return blocks
}

/**
 * Get timeline statistics
 */
export function getTimelineStats(blocks: TimelineBlock[]): {
  totalItems: number
  completedItems: number
  pendingItems: number
} {
  let totalItems = 0
  let completedItems = 0

  for (const block of blocks) {
    for (const item of block.items) {
      if (item.type === 'supplement_group') {
        totalItems += item.totalCount
        completedItems += item.takenCount
      } else {
        totalItems++
        if (getItemStatus(item) === 'complete') completedItems++
      }
    }
  }

  return {
    totalItems,
    completedItems,
    pendingItems: totalItems - completedItems
  }
}

/**
 * Find current/next block based on current time
 */
export function findCurrentBlock(blocks: TimelineBlock[]): {
  currentIndex: number
  isCurrentTime: boolean
} {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const nextBlock = blocks[i + 1]

    if (!nextBlock && currentMinutes >= block.timestamp) {
      return { currentIndex: i, isCurrentTime: true }
    }

    if (currentMinutes >= block.timestamp && (!nextBlock || currentMinutes < nextBlock.timestamp)) {
      return { currentIndex: i, isCurrentTime: true }
    }

    if (currentMinutes < block.timestamp) {
      return { currentIndex: i, isCurrentTime: false }
    }
  }

  return { currentIndex: 0, isCurrentTime: false }
}
