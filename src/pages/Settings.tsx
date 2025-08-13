import { useState } from 'react';
import { Section } from '@/components/Section';
import { Card } from '@/components/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, TestTube, Key, Globe, Mail, Download, Trash2, Moon, Sun } from 'lucide-react';

export function Settings() {
  const { toast } = useToast();
  const [apis, setApis] = useState({
    openai: localStorage.getItem('api_openai') || '',
    anthropic: localStorage.getItem('api_anthropic') || '',
    n8n: localStorage.getItem('api_n8n') || '',
    n8nToken: localStorage.getItem('api_n8n_token') || '',
    sendgrid: localStorage.getItem('api_sendgrid') || '',
    twilio: localStorage.getItem('api_twilio') || '',
    twilioAuth: localStorage.getItem('api_twilioAuth') || '',
    twilioPhone: localStorage.getItem('api_twilioPhone') || '',
  });

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const handleSave = () => {
    Object.entries(apis).forEach(([key, value]) => {
      if (value) {
        localStorage.setItem(`api_${key}`, value);
      } else {
        localStorage.removeItem(`api_${key}`);
      }
    });
    
    toast({
      title: 'Settings Saved',
      description: 'Your API configurations have been saved successfully.',
    });
  };

  const testConnection = async (service: string) => {
    toast({
      title: 'Testing Connection',
      description: `Testing ${service} connection...`,
    });

    setTimeout(() => {
      toast({
        title: 'Connection Test',
        description: `${service} is configured. Full test requires backend.`,
      });
    }, 1000);
  };

  const exportData = () => {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith('api_')) {
        data[key] = localStorage.getItem(key);
      }
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agenda-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Data Exported',
      description: 'Your data has been downloaded as JSON.',
    });
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        Object.entries(data).forEach(([key, value]) => {
          if (!key.startsWith('api_')) {
            localStorage.setItem(key, value as string);
          }
        });
        toast({
          title: 'Data Imported',
          description: 'Your data has been restored successfully.',
        });
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        toast({
          title: 'Import Failed',
          description: 'Invalid backup file format.',
          variant: 'destructive'
        });
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    if (!confirm('This will delete ALL your local data. Are you sure?')) {
      return;
    }
    
    const apiKeys = Object.keys(apis).map(k => `api_${k}`);
    const savedApis: Record<string, string> = {};
    apiKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) savedApis[key] = value;
    });
    
    localStorage.clear();
    
    // Restore API keys
    Object.entries(savedApis).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    
    toast({
      title: 'Data Cleared',
      description: 'All local data has been deleted (API keys preserved).',
    });
    
    setTimeout(() => window.location.reload(), 1000);
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', !isDark);
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    toast({
      title: 'Theme Changed',
      description: `Switched to ${isDark ? 'light' : 'dark'} mode.`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Section title="API Configuration">
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Key className="w-5 h-5" />
              AI Services
            </h3>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="openai">OpenAI API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="openai"
                    type={showKeys.openai ? "text" : "password"}
                    placeholder="sk-..."
                    value={apis.openai}
                    onChange={(e) => setApis({ ...apis, openai: e.target.value })}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowKeys({ ...showKeys, openai: !showKeys.openai })}
                  >
                    {showKeys.openai ? '🙈' : '👁️'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testConnection('openai')}
                  >
                    <TestTube className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="anthropic">Anthropic API Key (Claude)</Label>
                <div className="flex gap-2">
                  <Input
                    id="anthropic"
                    type={showKeys.anthropic ? "text" : "password"}
                    placeholder="sk-ant-..."
                    value={apis.anthropic}
                    onChange={(e) => setApis({ ...apis, anthropic: e.target.value })}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowKeys({ ...showKeys, anthropic: !showKeys.anthropic })}
                  >
                    {showKeys.anthropic ? '🙈' : '👁️'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testConnection('anthropic')}
                  >
                    <TestTube className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Automation
            </h3>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="n8n">n8n Webhook URL</Label>
                <Input
                  id="n8n"
                  type="url"
                  placeholder="https://your-n8n.com/webhook/..."
                  value={apis.n8n}
                  onChange={(e) => setApis({ ...apis, n8n: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="n8nToken">n8n API Token</Label>
                <Input
                  id="n8nToken"
                  type={showKeys.n8nToken ? "text" : "password"}
                  placeholder="Token for n8n"
                  value={apis.n8nToken}
                  onChange={(e) => setApis({ ...apis, n8nToken: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Communication Services
            </h3>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="sendgrid">SendGrid API Key</Label>
                <Input
                  id="sendgrid"
                  type={showKeys.sendgrid ? "text" : "password"}
                  placeholder="SG...."
                  value={apis.sendgrid}
                  onChange={(e) => setApis({ ...apis, sendgrid: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="twilio">Twilio Account SID</Label>
                <Input
                  id="twilio"
                  type="text"
                  placeholder="AC..."
                  value={apis.twilio}
                  onChange={(e) => setApis({ ...apis, twilio: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="twilioAuth">Twilio Auth Token</Label>
                <Input
                  id="twilioAuth"
                  type={showKeys.twilioAuth ? "text" : "password"}
                  placeholder="Auth token"
                  value={apis.twilioAuth}
                  onChange={(e) => setApis({ ...apis, twilioAuth: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="twilioPhone">Twilio Phone Number</Label>
                <Input
                  id="twilioPhone"
                  type="tel"
                  placeholder="+1234567890"
                  value={apis.twilioPhone}
                  onChange={(e) => setApis({ ...apis, twilioPhone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full hover-glow">
            <Save className="w-4 h-4 mr-2" />
            Save All Settings
          </Button>
        </Card>
      </Section>

      <Section title="Application Settings">
        <Card className="p-6 space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-muted-foreground">Toggle between light and dark mode</p>
              </div>
              <Button variant="outline" onClick={toggleTheme}>
                {document.documentElement.classList.contains('dark') ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Export Data</p>
                <p className="text-sm text-muted-foreground">Download all your data as JSON</p>
              </div>
              <Button variant="outline" onClick={exportData}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Import Data</p>
                <p className="text-sm text-muted-foreground">Restore from a backup file</p>
              </div>
              <div>
                <Label htmlFor="import-file">
                  <Button variant="outline" onClick={() => document.getElementById('import-file')?.click()}>
                    <Download className="w-4 h-4 mr-2 rotate-180" />
                    Import
                  </Button>
                </Label>
                <Input
                  id="import-file"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={importData}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-destructive">Clear All Data</p>
                <p className="text-sm text-muted-foreground">Remove all locally stored data</p>
              </div>
              <Button variant="destructive" onClick={clearAllData}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Data
              </Button>
            </div>
          </div>
        </Card>
      </Section>
    </div>
  );
}
