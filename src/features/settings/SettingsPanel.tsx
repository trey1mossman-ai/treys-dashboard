import { Moon, Sun, Clock, Bell, Database } from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectItem } from '@/components/ui/select'
import { useUIStore } from '@/state/useUIStore'
import { useLocalStorage } from '@/hooks/useLocalStorage'

export function SettingsPanel() {
  const { theme, setTheme } = useUIStore()
  const [settings, setSettings] = useLocalStorage('user_settings', {
    dayStartHour: 6,
    dayEndHour: 22,
    notifications: true,
    autoSync: false,
    updateInterval: 30
  })
  
  const handleExport = () => {
    const data = {
      settings,
      agenda: localStorage.getItem('agenda_items'),
      fitness: localStorage.getItem('fitness_done'),
      nutrition: localStorage.getItem('nutrition_done'),
      exportDate: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agenda-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        
        if (data.settings) {
          setSettings(data.settings)
        }
        if (data.agenda) {
          localStorage.setItem('agenda_items', data.agenda)
        }
        if (data.fitness) {
          localStorage.setItem('fitness_done', data.fitness)
        }
        if (data.nutrition) {
          localStorage.setItem('nutrition_done', data.nutrition)
        }
        
        alert('Data imported successfully!')
        window.location.reload()
      } catch (error) {
        alert('Failed to import data')
      }
    }
    reader.readAsText(file)
  }
  
  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
      localStorage.clear()
      window.location.reload()
    }
  }
  
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Sun className="w-5 h-5" />
          Appearance
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Theme</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={theme === 'light' ? 'default' : 'outline'}
                onClick={() => setTheme('light')}
              >
                <Sun className="w-4 h-4 mr-1" />
                Light
              </Button>
              <Button
                size="sm"
                variant={theme === 'dark' ? 'default' : 'outline'}
                onClick={() => setTheme('dark')}
              >
                <Moon className="w-4 h-4 mr-1" />
                Dark
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Schedule
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Day Start Hour</label>
              <Select
                value={String(settings.dayStartHour)}
                onValueChange={(value) => setSettings({ ...settings, dayStartHour: Number(value) })}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {i.toString().padStart(2, '0')}:00
                  </SelectItem>
                ))}
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Day End Hour</label>
              <Select
                value={String(settings.dayEndHour)}
                onValueChange={(value) => setSettings({ ...settings, dayEndHour: Number(value) })}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {i.toString().padStart(2, '0')}:00
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Update Interval (seconds)</label>
            <Select
              value={String(settings.updateInterval)}
              onValueChange={(value) => setSettings({ ...settings, updateInterval: Number(value) })}
            >
              <SelectItem value="10">10 seconds</SelectItem>
              <SelectItem value="30">30 seconds</SelectItem>
              <SelectItem value="60">1 minute</SelectItem>
              <SelectItem value="300">5 minutes</SelectItem>
            </Select>
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Enable Notifications</label>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) => setSettings({ ...settings, notifications: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Auto Sync</label>
            <Switch
              checked={settings.autoSync}
              onCheckedChange={(checked) => setSettings({ ...settings, autoSync: checked })}
            />
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Data Management
        </h3>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline">
              Export Data
            </Button>
            
            <label className="cursor-pointer">
              <span className="inline-flex items-center px-4 py-2 border border-border rounded-md text-sm font-medium bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
                Import Data
              </span>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            
            <Button onClick={handleClearData} variant="destructive">
              Clear All Data
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}