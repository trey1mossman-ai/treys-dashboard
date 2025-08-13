import { z } from 'zod'

export const EmailSchema = z.object({
  from: z.string().email(),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  html: z.string().optional()
})

export const SMSSchema = z.object({
  from: z.string().min(1),
  to: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  body: z.string().min(1).max(160)
})

export const WhatsAppSchema = z.object({
  from: z.string().min(1),
  to: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  body: z.string().min(1)
})

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1)
})

export const WorkoutSchema = z.object({
  id: z.string(),
  name: z.string(),
  exercises: z.array(z.object({
    name: z.string(),
    sets: z.number(),
    reps: z.string(),
    weight: z.string().optional(),
    notes: z.string().optional()
  })),
  duration: z.string(),
  completed: z.boolean().default(false)
})

export const NutritionSchema = z.object({
  id: z.string(),
  meals: z.array(z.object({
    time: z.string(),
    name: z.string(),
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
    completed: z.boolean().default(false)
  })),
  targetCalories: z.number(),
  targetProtein: z.number()
})