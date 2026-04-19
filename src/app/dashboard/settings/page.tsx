'use client'

import { useState, useEffect } from 'react'
import { Check, LogOut, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { NeuralFitLogo } from '@/components/brand/NeuralFitLogo'
import { clearKeychain } from '@/lib/auth/keychain'
import { HealthDisclaimer } from '@/components/ui/HealthDisclaimer'
import { DeleteAccountModal } from '@/components/settings/DeleteAccountModal'
import { PageTransition, AnimatedSection } from '@/components/ui/PageTransition'
import { IOSToggle } from '@/components/ui/IOSToggle'

const READABLE_FIELDS = ['description', 'summary', 'category', 'value', 'note'] as const

function PreferenceValue({ value }: { value: any }) {
  if (value == null) return null

  // Primitive values: render directly
  if (typeof value === 'string') return <p className="text-xs text-text-secondary">{value}</p>
  if (typeof value === 'number' || typeof value === 'boolean') return <p className="text-xs text-text-secondary">{String(value)}</p>

  // Object: extract human-readable fields only
  if (typeof value === 'object' && !Array.isArray(value)) {
    const readable = READABLE_FIELDS
      .filter(key => value[key] != null && value[key] !== '')
      .map(key => ({ key, text: String(value[key]) }))

    if (readable.length > 0) {
      return (
        <div className="space-y-0.5">
          {readable.map(({ key, text }) => (
            <p key={key} className="text-xs text-text-secondary">
              <span className="text-text-tertiary capitalize">{key}:</span> {text}
            </p>
          ))}
        </div>
      )
    }

    // Fallback: if no readable fields found, show a single-line summary
    const fallbackText = value.detail || value.details || value.name || value.label
    if (typeof fallbackText === 'string') {
      return <p className="text-xs text-text-secondary">{fallbackText}</p>
    }

    // Last resort: skip rendering rather than showing raw JSON
    return null
  }

  // Array: join items
  if (Array.isArray(value)) {
    const items = value.map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(', ')
    return <p className="text-xs text-text-secondary">{items}</p>
  }

  return null
}

export default function SettingsPage() {
  const router = useRouter()

  // User Profile
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [timezone, setTimezone] = useState('')

  // Kitchen & Dietary
  const [kitchenEquipment, setKitchenEquipment] = useState<Record<string, boolean>>({
    oven: true, stovetop_gas: false, stovetop_electric: false, stovetop_induction: false,
    grill_charcoal: false, grill_gas: false, grill_pellet: false,
    smoker: false, air_fryer: false, sous_vide: false, instant_pot: false,
    cast_iron: false, wok: false,
  })
  const [kitchenEnvironment, setKitchenEnvironment] = useState({ elevation_ft: 0, climate: '' })
  const [cookingPreferences, setCookingPreferences] = useState({
    preferred_methods: [] as string[],
    complexity: 'medium' as 'quick' | 'medium' | 'elaborate',
    batch_cooking: false,
  })
  const [dietary, setDietary] = useState({
    allergies: [] as string[],
    restrictions: [] as string[],
    dislikes: [] as string[],
    loves: [] as string[],
  })

  // Fitness & Equipment
  const [fitnessEquipment, setFitnessEquipment] = useState<string[]>([])
  const [gymType, setGymType] = useState('')
  const [sessionsPerWeek, setSessionsPerWeek] = useState(4)
  const [sessionLength, setSessionLength] = useState(60)

  // AI Preferences
  const [aiPreferences, setAiPreferences] = useState<Array<{
    id: string;
    preference_key: string;
    preference_value: any;
    reason: string;
    confidence: number;
  }>>([])

  // Notification Settings
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [notifWorkout, setNotifWorkout] = useState(true)
  const [notifMeals, setNotifMeals] = useState(true)
  const [notifSupplements, setNotifSupplements] = useState(true)
  const [notifWeekly, setNotifWeekly] = useState(true)
  const [quietStart, setQuietStart] = useState('22:00')
  const [quietEnd, setQuietEnd] = useState('07:00')

  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccessfully, setSavedSuccessfully] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      // Load user profile settings
      const profileResponse = await fetch('/api/settings')
      const profileData = await profileResponse.json()

      if (profileResponse.ok && profileData.settings) {
        setName(profileData.settings.name || '')
        setDescription(profileData.settings.description || '')
        setTimezone(profileData.settings.timezone || '')
      }

      // Load notification preferences
      try {
        const notifResponse = await fetch('/api/notifications/preferences')
        if (notifResponse.ok) {
          const notifData = await notifResponse.json()
          setNotifEnabled(notifData.enabled ?? true)
          setNotifWorkout(notifData.workout_reminders ?? true)
          setNotifMeals(notifData.meal_reminders ?? true)
          setNotifSupplements(notifData.supplement_reminders ?? true)
          setNotifWeekly(notifData.weekly_summary ?? true)
          setQuietStart(notifData.quiet_start || '22:00')
          setQuietEnd(notifData.quiet_end || '07:00')
        }
      } catch (e) {
        console.error('Failed to load notifications:', e)
      }

      // Load chef/kitchen profile
      try {
        const chefRes = await fetch('/api/nutrition/chef/profile')
        if (chefRes.ok) {
          const chefData = await chefRes.json()
          if (chefData.profile) {
            if (chefData.profile.equipment) setKitchenEquipment(prev => ({ ...prev, ...chefData.profile.equipment }))
            if (chefData.profile.environment) setKitchenEnvironment(chefData.profile.environment)
            if (chefData.profile.patterns) setCookingPreferences(prev => ({ ...prev, ...chefData.profile.patterns }))
            if (chefData.profile.dietary) setDietary(prev => ({ ...prev, ...chefData.profile.dietary }))
          }
        }
      } catch (e) {
        console.error('Failed to load kitchen profile:', e)
      }

      // Load fitness profile
      try {
        const fitnessRes = await fetch('/api/fitness/profile')
        if (fitnessRes.ok) {
          const fitnessData = await fitnessRes.json()
          if (fitnessData.profile) {
            setFitnessEquipment(fitnessData.profile.available_equipment || [])
            setGymType(fitnessData.profile.gym_type || '')
            setSessionsPerWeek(fitnessData.profile.training_frequency_per_week || 4)
            setSessionLength(fitnessData.profile.preferred_workout_duration || 60)
          }
        }
      } catch (e) {
        console.error('Failed to load fitness profile:', e)
      }

      // Load AI-learned preferences
      try {
        const prefsRes = await fetch('/api/fitness/preferences')
        if (prefsRes.ok) {
          const prefsData = await prefsRes.json()
          setAiPreferences(prefsData.preferences || [])
        }
      } catch (e) {
        console.error('Failed to load AI preferences:', e)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePreference = async (id: string) => {
    const res = await fetch(`/api/fitness/preferences?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setAiPreferences(prev => prev.filter(p => p.id !== id))
      toast.success('Preference removed')
    }
  }

  async function handleSave() {
    setIsSaving(true)

    try {
      // Save user profile settings
      const profileResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          timezone: timezone.trim()
        })
      })

      if (!profileResponse.ok) {
        const profileError = await profileResponse.json()
        toast.error(`Failed to save profile: ${profileError.error || 'Unknown error'}`)
        setIsSaving(false)
        return
      }

      // Save notification preferences
      await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: notifEnabled,
          workout_reminders: notifWorkout,
          meal_reminders: notifMeals,
          supplement_reminders: notifSupplements,
          weekly_summary: notifWeekly,
          quiet_start: quietStart,
          quiet_end: quietEnd,
        })
      })

      // Save kitchen profile
      try {
        await fetch('/api/nutrition/chef/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            equipment: kitchenEquipment,
            environment: kitchenEnvironment,
            patterns: cookingPreferences,
            dietary,
          }),
        })
      } catch (e) {
        console.error('Failed to save kitchen profile:', e)
      }

      // Save fitness profile
      try {
        await fetch('/api/fitness/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            available_equipment: fitnessEquipment,
            gym_type: gymType,
            training_frequency_per_week: sessionsPerWeek,
            preferred_workout_duration: sessionLength,
          }),
        })
      } catch (e) {
        console.error('Failed to save fitness profile:', e)
      }

      toast.success('Settings saved!')
      setSavedSuccessfully(true)
      setTimeout(() => setSavedSuccessfully(false), 3000)
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Something went wrong'}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <NeuralFitLogo animated size="lg" />
      </div>
    )
  }

  return (
    <PageTransition className="max-w-5xl mx-auto px-5 py-5 space-y-5 safe-area-inset">
      {/* Profile */}
      <AnimatedSection>
      <div className="space-y-4">
        <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider px-4">Profile</h2>

        <div>
          <label htmlFor="name" className="sr-only">Your name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 bg-bg-secondary border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-plasma placeholder:text-text-tertiary min-h-[48px]"
          />
        </div>

        <div>
          <label htmlFor="description" className="sr-only">Tell the AI about yourself</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell the AI about yourself"
            rows={4}
            className="w-full px-4 py-3 bg-bg-secondary border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-plasma placeholder:text-text-tertiary resize-none min-h-[100px]"
          />
        </div>

        <div>
          <label htmlFor="timezone" className="sr-only">Select timezone</label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-4 py-3 bg-bg-secondary border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-plasma min-h-[48px]"
          >
            <option value="">Select timezone</option>
            <option value="America/New_York">Eastern (ET)</option>
            <option value="America/Chicago">Central (CT)</option>
            <option value="America/Denver">Mountain (MT)</option>
            <option value="America/Los_Angeles">Pacific (PT)</option>
            <option value="America/Phoenix">Arizona (MST)</option>
            <option value="America/Anchorage">Alaska (AKT)</option>
            <option value="Pacific/Honolulu">Hawaii (HST)</option>
            <option value="UTC">UTC</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Asia/Shanghai">Shanghai (CST)</option>
            <option value="Australia/Sydney">Sydney (AEDT)</option>
          </select>
        </div>
      </div>
      </AnimatedSection>

      {/* Kitchen & Dietary */}
      <AnimatedSection>
      <div className="space-y-4">
        <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider px-4">Kitchen & Dietary</h2>

        {/* Cooking Equipment */}
        <div className="rounded-xl border border-glass-border-dark bg-bg-tertiary/50 p-4">
          <h3 className="text-xs font-medium text-text-tertiary mb-3">Cooking Equipment</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(kitchenEquipment).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between min-h-[44px]">
                <span className="text-sm text-text-primary">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                <IOSToggle
                  checked={value}
                  onChange={() => setKitchenEquipment(prev => ({ ...prev, [key]: !prev[key] }))}
                  size="small"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Kitchen Environment */}
        <div className="rounded-xl border border-glass-border-dark bg-bg-tertiary/50 p-4">
          <h3 className="text-xs font-medium text-text-tertiary mb-3">Kitchen Environment</h3>
          <div>
            <label className="text-xs text-text-tertiary">Elevation (ft)</label>
            <input
              type="number"
              value={kitchenEnvironment.elevation_ft || ''}
              onChange={e => setKitchenEnvironment(prev => ({ ...prev, elevation_ft: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 bg-bg-secondary border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-plasma placeholder:text-text-tertiary min-h-[48px]"
              placeholder="e.g., 5280"
            />
          </div>
        </div>

        {/* Cooking Preferences */}
        <div className="rounded-xl border border-glass-border-dark bg-bg-tertiary/50 p-4">
          <h3 className="text-xs font-medium text-text-tertiary mb-3">Cooking Preferences</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-tertiary">Complexity</label>
              <select
                value={cookingPreferences.complexity}
                onChange={e => setCookingPreferences(prev => ({ ...prev, complexity: e.target.value as any }))}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-plasma min-h-[48px]"
              >
                <option value="quick">Quick & Easy</option>
                <option value="medium">Medium Effort</option>
                <option value="elaborate">Elaborate</option>
              </select>
            </div>
            <label className="flex items-center justify-between min-h-[44px]">
              <span className="text-sm text-text-primary">Batch Cooking</span>
              <IOSToggle
                checked={cookingPreferences.batch_cooking}
                onChange={() => setCookingPreferences(prev => ({ ...prev, batch_cooking: !prev.batch_cooking }))}
                size="small"
              />
            </label>
          </div>
        </div>

        {/* Dietary */}
        <div className="rounded-xl border border-glass-border-dark bg-bg-tertiary/50 p-4">
          <h3 className="text-xs font-medium text-text-tertiary mb-3">Dietary</h3>
          <div className="space-y-3">
            {(['allergies', 'restrictions', 'dislikes', 'loves'] as const).map(field => (
              <div key={field}>
                <label className="text-xs text-text-tertiary capitalize">{field}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {dietary[field].map((item, i) => (
                    <span key={i} className="bg-bg-secondary rounded-full px-3 py-1 text-sm flex items-center gap-1">
                      {item}
                      <button
                        type="button"
                        onClick={() => setDietary(prev => ({
                          ...prev,
                          [field]: prev[field].filter((_, j) => j !== i)
                        }))}
                        className="text-text-tertiary hover:text-nova ml-1"
                      >×</button>
                    </span>
                  ))}
                  <input
                    placeholder={`Add ${field}...`}
                    className="bg-transparent text-sm outline-none min-w-[100px] min-h-[36px]"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                        const val = (e.target as HTMLInputElement).value.trim()
                        setDietary(prev => ({ ...prev, [field]: [...prev[field], val] }))
                        ;(e.target as HTMLInputElement).value = ''
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </AnimatedSection>

      {/* Fitness & Equipment */}
      <AnimatedSection>
      <div className="space-y-4">
        <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider px-4">Fitness & Equipment</h2>

        {/* Equipment Available */}
        <div className="rounded-xl border border-glass-border-dark bg-bg-tertiary/50 p-4">
          <h3 className="text-xs font-medium text-text-tertiary mb-3">Equipment Available</h3>
          <div className="flex flex-wrap gap-2">
            {['barbell', 'dumbbells', 'pull-up bar', 'cables', 'machines', 'kettlebells', 'bands', 'squat rack', 'bench', 'smith machine', 'leg press', 'dip station'].map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setFitnessEquipment(prev =>
                  prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
                )}
                className={`px-3 py-1.5 rounded-full text-sm min-h-[36px] transition-colors ${
                  fitnessEquipment.includes(item)
                    ? 'bg-plasma text-white'
                    : 'bg-bg-secondary text-text-secondary'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Gym Type */}
        <div className="rounded-xl border border-glass-border-dark bg-bg-tertiary/50 p-4">
          <h3 className="text-xs font-medium text-text-tertiary mb-3">Gym Type</h3>
          <div className="flex flex-wrap gap-2">
            {['home gym', 'commercial gym', 'both', 'outdoor/park'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setGymType(type)}
                className={`px-4 py-2 rounded-full text-sm min-h-[44px] transition-colors ${
                  gymType === type ? 'bg-plasma text-white' : 'bg-bg-secondary text-text-secondary'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div className="rounded-xl border border-glass-border-dark bg-bg-tertiary/50 p-4">
          <h3 className="text-xs font-medium text-text-tertiary mb-3">Schedule</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-text-tertiary">Sessions per week: {sessionsPerWeek}</label>
              <input
                type="range"
                min={1} max={7}
                value={sessionsPerWeek}
                onChange={e => setSessionsPerWeek(parseInt(e.target.value))}
                className="w-full accent-plasma"
              />
            </div>
            <div>
              <label className="text-xs text-text-tertiary">Session length</label>
              <select
                value={sessionLength}
                onChange={e => setSessionLength(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-plasma min-h-[48px]"
              >
                {[30, 45, 60, 75, 90].map(min => (
                  <option key={min} value={min}>{min} minutes</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      </AnimatedSection>

      {/* AI Preferences */}
      <AnimatedSection>
      <div className="space-y-4">
        <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider px-4">AI Preferences</h2>
        <p className="text-xs text-text-tertiary">Things the AI has learned about your training preferences. Delete any that are incorrect.</p>
        <div className="rounded-xl border border-glass-border-dark bg-bg-tertiary/50 p-4">
          {aiPreferences.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-4">No AI-learned preferences yet. The AI will learn your preferences over time.</p>
          ) : (
            <div className="space-y-3">
              {aiPreferences.map(pref => (
                <div key={pref.id} className="flex items-start justify-between gap-3 py-2 border-b border-border-default last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{pref.preference_key}</p>
                    <PreferenceValue value={pref.preference_value} />
                    {pref.reason && <p className="text-xs text-text-tertiary mt-0.5">{pref.reason}</p>}
                    <p className="text-xs text-text-tertiary mt-0.5">Confidence: {Math.round((pref.confidence || 0) * 100)}%</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePreference(pref.id)}
                    className="text-text-tertiary hover:text-nova p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </AnimatedSection>

      {/* Notifications */}
      <AnimatedSection>
      <div className="space-y-4">
        <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider px-4">Notifications</h2>

        <div className="space-y-3">
          <label className="flex items-center justify-between py-2 min-h-[44px]">
            <span className="text-sm text-text-primary">Push Notifications</span>
            <IOSToggle
              checked={notifEnabled}
              onChange={setNotifEnabled}
            />
          </label>

          {notifEnabled && (
            <>
              <label className="flex items-center justify-between py-2 pl-4 min-h-[44px]">
                <span className="text-sm text-text-secondary">Workout Reminders</span>
                <IOSToggle
                  checked={notifWorkout}
                  onChange={setNotifWorkout}
                  size="small"
                />
              </label>
              <label className="flex items-center justify-between py-2 pl-4 min-h-[44px]">
                <span className="text-sm text-text-secondary">Meal Logging</span>
                <IOSToggle
                  checked={notifMeals}
                  onChange={setNotifMeals}
                  size="small"
                />
              </label>
              <label className="flex items-center justify-between py-2 pl-4 min-h-[44px]">
                <span className="text-sm text-text-secondary">Supplement Reminders</span>
                <IOSToggle
                  checked={notifSupplements}
                  onChange={setNotifSupplements}
                  size="small"
                />
              </label>
              <label className="flex items-center justify-between py-2 pl-4 min-h-[44px]">
                <span className="text-sm text-text-secondary">Weekly Summary</span>
                <IOSToggle
                  checked={notifWeekly}
                  onChange={setNotifWeekly}
                  size="small"
                />
              </label>

              <div className="pt-2 border-t border-border-default">
                <p className="text-xs text-text-tertiary mb-2">Quiet Hours (no notifications)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={quietStart}
                    onChange={(e) => setQuietStart(e.target.value)}
                    className="px-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm min-h-[44px]"
                  />
                  <span className="text-text-tertiary text-sm">to</span>
                  <input
                    type="time"
                    value={quietEnd}
                    onChange={(e) => setQuietEnd(e.target.value)}
                    className="px-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm min-h-[44px]"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      </AnimatedSection>

      {/* Save */}
      <AnimatedSection>
      <button
        onClick={handleSave}
        disabled={isSaving || savedSuccessfully}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all min-h-[48px] active:scale-95 ${
          savedSuccessfully
            ? 'bg-green-500 text-white'
            : 'bg-plasma text-bg-primary hover:bg-plasma/90 disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {isSaving ? (
          <>
            <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            Saving...
          </>
        ) : savedSuccessfully ? (
          <>
            <Check className="h-5 w-5" />
            Saved!
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            Save Settings
          </>
        )}
      </button>
      </AnimatedSection>

      {/* Legal */}
      <AnimatedSection>
      <div className="space-y-4 pt-4 border-t border-border-default">
        <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider px-4">Legal</h2>
        <div className="flex gap-3">
          <a
            href="/privacy"
            className="flex-1 px-4 py-3 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-secondary text-center hover:text-text-primary transition-colors min-h-[48px] flex items-center justify-center"
          >
            Privacy Policy
          </a>
          <a
            href="/terms"
            className="flex-1 px-4 py-3 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-secondary text-center hover:text-text-primary transition-colors min-h-[48px] flex items-center justify-center"
          >
            Terms of Service
          </a>
        </div>
        <HealthDisclaimer
          text="NeuralFit provides AI-generated fitness and nutrition guidance. This is not medical advice. Consult your healthcare provider before starting any exercise or nutrition program."
        />
      </div>
      </AnimatedSection>

      {/* Account */}
      <AnimatedSection>
      <div className="space-y-4 pt-4 border-t border-border-default">
        <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider px-4">Account</h2>
        <button
          onClick={async () => {
            try {
              await clearKeychain()
              localStorage.clear()
              await fetch('/api/auth/logout', { method: 'POST' })
              router.push('/')
              router.refresh()
            } catch (error) {
              console.error('Logout error:', error)
              router.push('/')
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all min-h-[48px] active:scale-95 bg-bg-secondary text-nova border border-nova/20 hover:bg-nova/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all min-h-[48px] active:scale-95 bg-bg-secondary text-red-500 border border-red-500/20 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
          Delete Account
        </button>
      </div>
      </AnimatedSection>

      <DeleteAccountModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        onConfirm={async () => {
          // 1. Apple token revocation (client-side, native only) per Advocate C1
          try {
            const { isNativeApp } = await import('@/lib/capacitor')
            if (isNativeApp()) {
              const { SocialLogin } = await import('@capgo/capacitor-social-login')
              await SocialLogin.logout({ provider: 'apple' })
            }
          } catch (e) {
            console.warn('Apple token revocation failed:', e)
          }

          // 2. Server-side deletion (Advocate C4: error-gated)
          const res = await fetch('/api/auth/delete-account', { method: 'DELETE' })
          const result = await res.json()
          if (!res.ok || !result.success) {
            throw new Error(result.error || 'Deletion failed. Please try again.')
          }

          // 3. Client-side cleanup — only after server confirms success (Advocate C4)
          localStorage.clear()
          sessionStorage.clear()
          try {
            await clearKeychain()
          } catch {}

          // 4. Redirect
          router.push('/')
        }}
      />
    </PageTransition>
  )
}
