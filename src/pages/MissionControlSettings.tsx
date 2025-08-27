import { useState } from 'react';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { cn } from '@/lib/utils';
import { 
  Save, Copy, RefreshCw, Clock, Globe, Eye, EyeOff,
  ChevronLeft, CheckCircle, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import '@/styles/mission-control.css';

export default function MissionControlSettings() {
  const { settings, updateSettings } = useMissionControlStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [showSecret, setShowSecret] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const handleSave = () => {
    setSaveStatus('saving');
    try {
      updateSettings(localSettings);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast notification here
  };
  
  const generateSecret = () => {
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setLocalSettings({ ...localSettings, hmac_secret: secret });
  };
  
  return (
    <div className="mc-container min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-mc-border">
        <div className="flex items-center gap-4">
          <Link
            to="/mission-control"
            className="p-2 rounded-lg hover:bg-mc-surface transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Mission Control Settings</h1>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={cn(
            "mc-button mc-button-primary flex items-center gap-2",
            saveStatus === 'saving' && "opacity-50 cursor-not-allowed"
          )}
        >
          {saveStatus === 'saving' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : saveStatus === 'saved' ? (
            <CheckCircle className="w-4 h-4" />
          ) : saveStatus === 'error' ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : 'Save'}
        </button>
      </header>
      
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Webhook URLs */}
        <div className="mc-card p-6">
          <h2 className="text-lg font-semibold mb-4">Inbound Webhook URLs</h2>
          <p className="text-sm text-mc-text-secondary mb-4">
            Configure URLs where your agents will send data
          </p>
          
          <div className="space-y-4">
            {Object.entries({
              calendar: 'Calendar Feed',
              supplements: 'Supplements Feed',
              workout: 'Workout Feed',
              inventory: 'Inventory Feed'
            }).map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={localSettings.webhook_urls[key as keyof typeof localSettings.webhook_urls] || ''}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      webhook_urls: {
                        ...localSettings.webhook_urls,
                        [key]: e.target.value
                      }
                    })}
                    placeholder={`https://your-domain.com/api/webhooks/${key}`}
                    className="flex-1 px-3 py-2 bg-mc-surface border border-mc-border rounded-lg 
                             text-sm text-mc-text-primary placeholder:text-mc-text-muted
                             focus:outline-none focus:border-mc-accent-cyan focus:ring-1 focus:ring-mc-accent-cyan/50"
                  />
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/api/webhooks/${key}`;
                      copyToClipboard(url, label);
                    }}
                    className="mc-button mc-button-secondary px-3 py-2 text-sm"
                    title="Copy webhook URL"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Outbound URLs */}
        <div className="mc-card p-6">
          <h2 className="text-lg font-semibold mb-4">Outbound Command URLs</h2>
          <p className="text-sm text-mc-text-secondary mb-4">
            Configure URLs where commands will be sent
          </p>
          
          <div className="space-y-4">
            {Object.entries({
              mark_complete: 'Mark Complete',
              baby_agent: 'Baby Agent',
              queue_reorder: 'Queue Reorder'
            }).map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input
                  type="url"
                  value={localSettings.outbound_urls[key as keyof typeof localSettings.outbound_urls] || ''}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    outbound_urls: {
                      ...localSettings.outbound_urls,
                      [key]: e.target.value
                    }
                  })}
                  placeholder={`https://your-agent.com/api/${key}`}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border rounded-lg 
                           text-sm text-mc-text-primary placeholder:text-mc-text-muted
                           focus:outline-none focus:border-mc-accent-cyan focus:ring-1 focus:ring-mc-accent-cyan/50"
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Security */}
        <div className="mc-card p-6">
          <h2 className="text-lg font-semibold mb-4">Security</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">HMAC Secret</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={localSettings.hmac_secret}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      hmac_secret: e.target.value
                    })}
                    placeholder="Enter your shared HMAC secret"
                    className="w-full pr-10 px-3 py-2 bg-mc-surface border border-mc-border rounded-lg 
                             text-sm text-mc-text-primary placeholder:text-mc-text-muted
                             focus:outline-none focus:border-mc-accent-cyan focus:ring-1 focus:ring-mc-accent-cyan/50"
                  />
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-mc-text-muted hover:text-mc-text-primary"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={generateSecret}
                  className="mc-button mc-button-secondary px-3 py-2 text-sm flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Generate
                </button>
              </div>
              <p className="text-xs text-mc-text-muted mt-1">
                Used to verify webhook signatures. Must match your agent configuration.
              </p>
            </div>
          </div>
        </div>
        
        {/* Schedule */}
        <div className="mc-card p-6">
          <h2 className="text-lg font-semibold mb-4">Schedule</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Timezone
                </label>
                <select
                  value={localSettings.timezone}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    timezone: e.target.value
                  })}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border rounded-lg 
                           text-sm text-mc-text-primary
                           focus:outline-none focus:border-mc-accent-cyan focus:ring-1 focus:ring-mc-accent-cyan/50"
                >
                  <option value="America/Denver">Mountain Time (Denver)</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Daily Build Time
                </label>
                <input
                  type="time"
                  value={localSettings.daily_build_time}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    daily_build_time: e.target.value
                  })}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border rounded-lg 
                           text-sm text-mc-text-primary
                           focus:outline-none focus:border-mc-accent-cyan focus:ring-1 focus:ring-mc-accent-cyan/50"
                />
              </div>
            </div>
            
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localSettings.refresh_window.enabled}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    refresh_window: {
                      ...localSettings.refresh_window,
                      enabled: e.target.checked
                    }
                  })}
                  className="rounded border-mc-border"
                />
                <span className="text-sm font-medium">Enable Hourly Refresh</span>
              </label>
              
              {localSettings.refresh_window.enabled && (
                <div className="grid grid-cols-2 gap-4 mt-3 ml-6">
                  <div>
                    <label className="block text-xs text-mc-text-secondary mb-1">Start Time</label>
                    <input
                      type="time"
                      value={localSettings.refresh_window.start}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        refresh_window: {
                          ...localSettings.refresh_window,
                          start: e.target.value
                        }
                      })}
                      className="w-full px-2 py-1 bg-mc-surface border border-mc-border rounded 
                               text-sm text-mc-text-primary
                               focus:outline-none focus:border-mc-accent-cyan"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-mc-text-secondary mb-1">End Time</label>
                    <input
                      type="time"
                      value={localSettings.refresh_window.end}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        refresh_window: {
                          ...localSettings.refresh_window,
                          end: e.target.value
                        }
                      })}
                      className="w-full px-2 py-1 bg-mc-surface border border-mc-border rounded 
                               text-sm text-mc-text-primary
                               focus:outline-none focus:border-mc-accent-cyan"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Display Preferences */}
        <div className="mc-card p-6">
          <h2 className="text-lg font-semibold mb-4">Display Preferences</h2>
          
          <div className="space-y-3">
            {Object.entries({
              reduce_motion: 'Reduce Motion',
              show_supplements: 'Show Supplements',
              show_workout: 'Show Workout',
              show_tasks: 'Show Tasks',
              show_calendar: 'Show Calendar',
              show_telemetry: 'Show Telemetry',
              show_inventory: 'Show Inventory'
            }).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localSettings.display[key as keyof typeof localSettings.display]}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    display: {
                      ...localSettings.display,
                      [key]: e.target.checked
                    }
                  })}
                  className="rounded border-mc-border"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}