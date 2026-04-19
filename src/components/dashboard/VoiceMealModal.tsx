'use client'

import { useState, useCallback, useEffect } from 'react'
import { Mic, MicOff, X, Send, Loader2, Check, Camera } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { HealthDisclaimer } from '@/components/ui/HealthDisclaimer'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PhotoMealCapture } from '@/components/nutrition/PhotoMealCapture'
import { PhotoMealResults } from '@/components/nutrition/PhotoMealResults'

interface VoiceMealModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMealLogged?: () => void
}

type ModalState = 'idle' | 'listening' | 'processing' | 'results' | 'confirmed' | 'error'
type ActiveTab = 'voice' | 'camera'

interface PhotoFoodItem {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence: number
  from_inventory: boolean
}

interface ParsedFood {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface MealResult {
  foods: ParsedFood[]
  macros: {
    current: { calories: number; protein: number; carbs: number; fat: number }
    target: { calories: number; protein: number; carbs: number; fat: number }
  }
  response: string
}

export function VoiceMealModal({ open, onOpenChange, onMealLogged }: VoiceMealModalProps) {
  const {
    isSupported,
    isListening,
    isStarting,
    transcript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition()

  const [modalState, setModalState] = useState<ModalState>('idle')
  const [textInput, setTextInput] = useState('')
  const [result, setResult] = useState<MealResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('voice')
  const [photoFoods, setPhotoFoods] = useState<PhotoFoodItem[] | null>(null)
  const [isSavingPhoto, setIsSavingPhoto] = useState(false)

  // Fetch userId on mount — cookie is httpOnly, must read server-side
  useEffect(() => {
    if (!open) return
    fetch('/api/nutrition/profile')
      .then(res => res.json())
      .then(data => {
        if (data.userId) setUserId(data.userId)
      })
      .catch(() => {})
  }, [open])

  const handleClose = useCallback(() => {
    if (isListening) stopListening()
    setModalState('idle')
    setTextInput('')
    setResult(null)
    setErrorMessage(null)
    resetTranscript()
    setActiveTab('voice')
    setPhotoFoods(null)
    setIsSavingPhoto(false)
    onOpenChange(false)
  }, [isListening, stopListening, resetTranscript, onOpenChange])

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      startListening()
      setModalState('listening')
    }
  }, [isListening, startListening, stopListening, resetTranscript])

  const submitMeal = useCallback(async (text: string) => {
    if (!text.trim()) {
      setErrorMessage("I didn't catch that. Try again or type what you ate.")
      setModalState('error')
      return
    }

    setModalState('processing')
    setErrorMessage(null)

    try {
      if (!userId) {
        setErrorMessage('Not logged in. Please refresh and try again.')
        setModalState('error')
        return
      }

      const res = await fetch('/api/ai/nutritionist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: text }],
          mode: 'meal_log',
          userId,
        }),
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)

      const data = await res.json()

      if (!data.success) {
        setErrorMessage(data.error || 'Failed to process meal')
        setModalState('error')
        return
      }

      setResult({
        foods: data.extractedData?.foods || [],
        macros: data.macros || {
          current: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          target: { calories: 2500, protein: 200, carbs: 300, fat: 80 },
        },
        response: data.response || '',
      })
      setModalState('results')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error. Please try again.')
      setModalState('error')
    }
  }, [userId])

  const handleConfirm = useCallback(async () => {
    if (!userId || !result) return

    // Guard: prevent saving phantom meals with no foods
    if (!result.foods.length) {
      setErrorMessage('No foods detected. Try describing your meal again.')
      setModalState('error')
      return
    }

    setModalState('processing')

    try {
      const today = new Date().toISOString().split('T')[0]
      // Sum per-food macros from AI extraction
      const totalMacros = result.foods.reduce(
        (acc: any, food: any) => ({
          calories: acc.calories + (Number(food.calories) || 0),
          protein: acc.protein + (Number(food.protein) || 0),
          carbs: acc.carbs + (Number(food.carbs) || 0),
          fat: acc.fat + (Number(food.fat) || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      )
      const mealName = result.foods.map((f: any) => f.name).join(', ')
      const ingredients = result.foods.map((f: any) => ({
        item_name: f.name,
        quantity: f.quantity || 1,
        unit: f.unit || 'serving',
      }))

      const res = await fetch('/api/nutrition/analyze-photo/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          date: today,
          mealName,
          ...totalMacros,
          ingredients,
        }),
      })

      if (!res.ok) throw new Error('Failed to save meal')

      setModalState('confirmed')
      setTimeout(() => {
        onMealLogged?.()
        handleClose()
      }, 800)
    } catch {
      setErrorMessage('Failed to save meal. Please try again.')
      setModalState('error')
    }
  }, [userId, result, onMealLogged, handleClose])

  const handleSubmitText = useCallback(() => {
    submitMeal(textInput)
  }, [textInput, submitMeal])

  const handleSubmitVoice = useCallback(() => {
    if (isListening) stopListening()
    // Small delay to let final transcript settle
    setTimeout(() => {
      submitMeal(transcript || textInput)
    }, 200)
  }, [isListening, stopListening, transcript, textInput, submitMeal])

  const handlePhotoConfirm = useCallback(async (foods: PhotoFoodItem[]) => {
    if (!userId) return
    setIsSavingPhoto(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const totalMacros = foods.reduce(
        (acc, f) => ({
          calories: acc.calories + f.calories,
          protein: acc.protein + f.protein,
          carbs: acc.carbs + f.carbs,
          fat: acc.fat + f.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      )
      const mealName = foods.map(f => f.name).join(', ')
      const ingredients = foods.map(f => ({
        item_name: f.name,
        quantity: 1,
        unit: 'serving',
      }))

      const res = await fetch('/api/nutrition/analyze-photo/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          date: today,
          mealName,
          ...totalMacros,
          ingredients,
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      setModalState('confirmed')
      setTimeout(() => {
        onMealLogged?.()
        handleClose()
      }, 800)
    } catch {
      setErrorMessage('Failed to save meal. Please try again.')
      setModalState('error')
    } finally {
      setIsSavingPhoto(false)
    }
  }, [userId, onMealLogged, handleClose])

  if (!open) return null

  const displayTranscript = transcript || ''
  const displayInterim = interimTranscript || ''

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/80 z-[60] animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Bottom Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed bottom-0 left-0 right-0 z-[60] bg-bg-elevated backdrop-blur-2xl rounded-t-[2rem] p-6 pb-20 animate-slide-up max-h-[85vh] overflow-y-auto safe-area-bottom"
      >
        {/* Drag Handle */}
        <div className="w-12 h-1 bg-border-default rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-text-primary">Log a Meal</h2>
          <button onClick={handleClose} className="p-2 -m-2">
            <X className="w-5 h-5 text-text-tertiary" />
          </button>
        </div>

        {/* Tab Bar */}
        {modalState !== 'processing' && modalState !== 'results' && modalState !== 'confirmed' && !photoFoods && (
          <div className="flex gap-1 p-1 bg-bg-secondary rounded-xl mb-5">
            <button
              onClick={() => setActiveTab('voice')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'voice' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-tertiary'
              }`}
            >
              <Mic className="w-4 h-4" />
              Voice / Text
            </button>
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'camera' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-tertiary'
              }`}
            >
              <Camera className="w-4 h-4" />
              Photo
            </button>
          </div>
        )}

        {/* Camera Tab Content */}
        {activeTab === 'camera' && modalState !== 'confirmed' && (
          <>
            {photoFoods ? (
              <PhotoMealResults
                foods={photoFoods}
                onConfirm={handlePhotoConfirm}
                onCancel={() => setPhotoFoods(null)}
              />
            ) : modalState !== 'processing' && (
              <PhotoMealCapture
                onPhotoAnalyzed={(foods) => setPhotoFoods(foods)}
                mealType="meal"
              />
            )}
          </>
        )}

        {/* Voice/Text Tab Content */}
        {activeTab === 'voice' && (
          <>

        {/* Mic Button — hidden if voice not supported */}
        {isSupported && modalState !== 'processing' && modalState !== 'results' && modalState !== 'confirmed' && (
          <div className="flex flex-col items-center mb-5">
            <button
              onClick={handleMicToggle}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-[0.95] ${
                isListening
                  ? 'bg-nova/20 border-2 border-nova animate-pulse-slow'
                  : 'bg-aurora/10 border-2 border-aurora/30 hover:border-aurora/50'
              }`}
            >
              {isListening ? (
                <MicOff className="w-7 h-7 text-nova" />
              ) : isStarting ? (
                <Loader2 className="w-7 h-7 text-aurora animate-spin" />
              ) : (
                <Mic className="w-7 h-7 text-aurora" />
              )}
            </button>
            <span className="text-xs text-text-tertiary mt-2">
              {isListening ? 'Tap to stop' : isStarting ? 'Starting...' : 'Tap to speak'}
            </span>
          </div>
        )}

        {/* Voice not supported message */}
        {!isSupported && modalState === 'idle' && (
          <p className="text-xs text-text-tertiary text-center mb-3">
            Voice not available — type what you ate below.
          </p>
        )}

        {/* Voice error */}
        {voiceError && (
          <p className="text-xs text-nova text-center mb-3">{voiceError}</p>
        )}

        {/* Live Transcript */}
        {(displayTranscript || displayInterim) && modalState !== 'results' && modalState !== 'confirmed' && (
          <div className="bg-bg-secondary rounded-xl p-3 mb-4 min-h-[48px]">
            {displayTranscript && (
              <p className="text-sm text-text-primary">{displayTranscript}</p>
            )}
            {displayInterim && (
              <p className="text-sm text-text-tertiary italic">{displayInterim}</p>
            )}
          </div>
        )}

        {/* Nutrition Disclaimer */}
        {(modalState === 'idle' || modalState === 'listening') && (
          <HealthDisclaimer
            text="Nutritional estimates are AI-generated and may not be exact. Not a substitute for professional dietary advice."
            className="mb-4"
          />
        )}

        {/* Text Input (always visible in idle/listening, fallback) */}
        {(modalState === 'idle' || modalState === 'listening' || modalState === 'error') && (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type what you ate..."
              className="flex-1 min-h-[44px] px-4 py-3 rounded-xl border border-border-default bg-bg-secondary text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-plasma focus:border-plasma"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && textInput.trim()) handleSubmitText()
              }}
            />
            <button
              onClick={transcript ? handleSubmitVoice : handleSubmitText}
              disabled={!transcript && !textInput.trim()}
              className="min-h-[44px] px-4 rounded-xl bg-plasma text-text-inverse font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Processing State */}
        {modalState === 'processing' && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-8 h-8 text-plasma animate-spin mb-3" />
            <p className="text-sm text-text-secondary">Analyzing your meal...</p>
          </div>
        )}

        {/* Results */}
        {modalState === 'results' && result && (
          <div className="space-y-4">
            {/* AI Response */}
            {result.response && (
              <div className="text-sm text-text-secondary">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                    li: ({ children }) => <li className="mb-0.5">{children}</li>,
                    table: ({ children }) => <div className="overflow-x-auto my-2"><table className="w-full text-sm border-collapse">{children}</table></div>,
                    thead: ({ children }) => <thead className="border-b border-border-default">{children}</thead>,
                    th: ({ children }) => <th className="text-left px-2 py-1 text-text-secondary font-medium text-xs">{children}</th>,
                    td: ({ children }) => <td className="px-2 py-1 text-text-primary border-t border-border-subtle">{children}</td>,
                  }}
                >
                  {result.response}
                </ReactMarkdown>
              </div>
            )}

            {/* Parsed Foods */}
            {result.foods.length > 0 && (
              <div className="space-y-2">
                {result.foods.map((food, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                    <span className="text-sm text-text-primary">{food.name}</span>
                    <div className="flex items-center gap-3 text-xs text-text-secondary">
                      <span>{food.calories} cal</span>
                      <span className="text-aurora">{food.protein}g P</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Daily Progress */}
            {result.macros && (
              <div className="bg-bg-secondary rounded-xl p-3 space-y-2">
                <p className="text-xs text-text-tertiary font-medium">Daily Progress</p>
                <MacroProgressRow label="Calories" current={result.macros.current.calories} target={result.macros.target.calories} color="bg-text-tertiary" />
                <MacroProgressRow label="Protein" current={result.macros.current.protein} target={result.macros.target.protein} color="bg-aurora" unit="g" />
                <MacroProgressRow label="Carbs" current={result.macros.current.carbs} target={result.macros.target.carbs} color="bg-plasma" unit="g" />
                <MacroProgressRow label="Fat" current={result.macros.current.fat} target={result.macros.target.fat} color="bg-solar" unit="g" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 min-h-[44px] rounded-xl border border-border-default text-text-secondary text-sm font-medium transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 min-h-[44px] rounded-xl bg-aurora text-text-inverse text-sm font-medium transition-all active:scale-[0.98]"
              >
                Confirm & Log
              </button>
            </div>
          </div>
        )}

        {/* End Voice/Text Tab */}
          </>
        )}

        {/* Confirmed State */}
        {modalState === 'confirmed' && (
          <div className="flex flex-col items-center py-8">
            <div className="w-12 h-12 rounded-full bg-aurora/20 flex items-center justify-center mb-3">
              <Check className="w-6 h-6 text-aurora" />
            </div>
            <p className="text-sm text-text-primary font-medium">Meal logged!</p>
          </div>
        )}

        {/* Error State */}
        {modalState === 'error' && errorMessage && (
          <div className="bg-nova/10 rounded-xl p-3 mb-4">
            <p className="text-sm text-nova">{errorMessage}</p>
            <button
              onClick={() => { setModalState('idle'); setErrorMessage(null) }}
              className="text-xs text-nova/70 underline mt-1"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function MacroProgressRow({ label, current, target, color, unit = '' }: {
  label: string; current: number; target: number; color: string; unit?: string
}) {
  const pct = Math.min((current / (target || 1)) * 100, 100)
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-tertiary w-14">{label}</span>
      <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-text-secondary tabular-nums w-16 text-right">
        {current}/{target}{unit}
      </span>
    </div>
  )
}
