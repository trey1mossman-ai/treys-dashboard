import { useState, useEffect } from 'react';
import { Settings, X, Globe, TestTube, Check, AlertCircle, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { aiService } from '@/services/aiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [webhookUrl, setWebhookUrl] = useState(localStorage.getItem('webhook_url') || '');
  const [webhookSecret, setWebhookSecret] = useState(localStorage.getItem('webhook_secret') || '');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // AI Configuration
  const [aiProvider, setAiProvider] = useState<'openai' | 'claude'>('openai');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  
  const { toast } = useToast();

  // Load existing AI config on mount
  useEffect(() => {
    const aiConfig = aiService.loadConfig();
    if (aiConfig) {
      setAiProvider(aiConfig.provider);
      setAiApiKey(aiConfig.apiKey);
      setAiModel(aiConfig.model || '');
    }
  }, []);

  if (!isOpen) return null;

  const handleSave = () => {
    console.log('SettingsModal - handleSave called');
    console.log('SettingsModal - AI settings:', { provider: aiProvider, model: aiModel, hasApiKey: !!aiApiKey });
    
    // Save webhook settings
    localStorage.setItem('webhook_url', webhookUrl);
    localStorage.setItem('webhook_secret', webhookSecret);
    
    // Save AI settings
    if (aiApiKey) {
      console.log('SettingsModal - Initializing AI service with config');
      
      const config = {
        provider: aiProvider,
        apiKey: aiApiKey,
        model: aiModel || (aiProvider === 'openai' ? 'gpt-4' : 'claude-3-opus-20240229')
      };
      
      aiService.initialize(config);
      
      console.log('SettingsModal - AI service initialized, dispatching event');
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('ai-settings-saved'));
      console.log('SettingsModal - AI settings saved and event dispatched');
      
      // Also verify the configuration was saved
      setTimeout(() => {
        const isConfigured = aiService.isConfigured();
        console.log('SettingsModal - Post-save verification, isConfigured:', isConfigured);
      }, 50);
    } else {
      console.log('SettingsModal - No API key provided, skipping AI initialization');
    }
    
    toast({ title: 'Settings saved' });
    onClose();
  };

  const testAI = async () => {
    if (!aiApiKey) {
      toast({ 
        title: 'Missing API key',
        description: 'Please enter your OpenAI API key first',
        variant: 'destructive' 
      });
      return;
    }

    setAiTestStatus('testing');

    try {
      // Temporarily save config for testing
      aiService.initialize({
        provider: aiProvider,
        apiKey: aiApiKey,
        model: aiModel || (aiProvider === 'openai' ? 'gpt-4' : 'claude-3-opus-20240229')
      });

      const response = await aiService.processCommand('test connection');
      
      if (response.success || response.message.includes('test')) {
        setAiTestStatus('success');
        toast({ 
          title: 'AI Connected',
          description: 'Your AI assistant is working correctly'
        });
      } else {
        setAiTestStatus('error');
        toast({ 
          title: 'AI test failed',
          description: response.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      setAiTestStatus('error');
      toast({ 
        title: 'Connection failed',
        description: 'Could not connect to AI service',
        variant: 'destructive'
      });
    }
  };

  const testWebhook = async () => {
    if (!webhookUrl) {
      toast({ 
        title: 'Missing webhook URL',
        description: 'Please enter a webhook URL first',
        variant: 'destructive' 
      });
      return;
    }

    setIsTestingWebhook(true);
    setTestStatus('idle');

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret': webhookSecret || ''
        },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setTestStatus('success');
        toast({ 
          title: 'Webhook connected',
          description: 'Your webhook is working correctly'
        });
      } else {
        setTestStatus('error');
        toast({ 
          title: 'Webhook test failed',
          description: `Status: ${response.status}`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      setTestStatus('error');
      toast({ 
        title: 'Connection failed',
        description: 'Could not reach webhook URL',
        variant: 'destructive'
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        "relative bg-card border border-border rounded-2xl",
        "max-w-md w-full p-6",
        "shadow-2xl elevation-high"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* AI Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bot className="w-4 h-4 text-primary" />
              <span>AI Assistant Configuration</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  AI Provider
                </label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as 'openai' | 'claude')}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg",
                    "bg-background border border-border",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50"
                  )}
                >
                  <option value="openai">OpenAI (GPT-4)</option>
                  <option value="claude">Anthropic (Claude)</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  API Key
                </label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder="Enter your OpenAI API key (sk-...)"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg",
                    "bg-background border border-border",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50"
                  )}
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Model (optional)
                </label>
                <input
                  type="text"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="gpt-4 (default)"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg",
                    "bg-background border border-border",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50"
                  )}
                />
              </div>
            </div>

            {/* Test AI Connection */}
            <div className="flex items-center gap-3">
              <button
                onClick={testAI}
                disabled={aiTestStatus === 'testing' || !aiApiKey}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-primary/10 text-primary hover:bg-primary/20",
                  "transition-colors font-medium text-sm",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <TestTube className="w-4 h-4" />
                {aiTestStatus === 'testing' ? 'Testing...' : 'Test AI Connection'}
              </button>

              {aiTestStatus === 'success' && (
                <span className="flex items-center gap-1 text-sm text-green-500">
                  <Check className="w-4 h-4" />
                  Connected
                </span>
              )}

              {aiTestStatus === 'error' && (
                <span className="flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  Failed
                </span>
              )}
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe className="w-4 h-4 text-primary" />
              <span>AI Webhook Configuration (Optional)</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Webhook URL (n8n/Make/Zapier)
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-webhook.com/endpoint"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg",
                    "bg-background border border-border",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50"
                  )}
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Secret Key (optional)
                </label>
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="Enter secret for authentication"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg",
                    "bg-background border border-border",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50"
                  )}
                />
              </div>
            </div>

            {/* Test Connection */}
            <div className="flex items-center gap-3">
              <button
                onClick={testWebhook}
                disabled={isTestingWebhook || !webhookUrl}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-primary/10 text-primary hover:bg-primary/20",
                  "transition-colors font-medium text-sm",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <TestTube className="w-4 h-4" />
                {isTestingWebhook ? 'Testing...' : 'Test Connection'}
              </button>

              {testStatus === 'success' && (
                <span className="flex items-center gap-1 text-sm text-green-500">
                  <Check className="w-4 h-4" />
                  Connected
                </span>
              )}

              {testStatus === 'error' && (
                <span className="flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  Failed
                </span>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className={cn(
            "p-3 rounded-lg",
            "bg-muted/50 border border-muted-foreground/20"
          )}>
            <p className="text-xs text-muted-foreground">
              <strong>How it works:</strong> Connect your n8n workflow or automation tool 
              to generate daily agendas, tasks, meal plans, and supplement stacks using AI.
              The webhook will receive your request and return structured data.
            </p>
          </div>

          {/* Sample Webhook Response */}
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Expected webhook response format
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-x-auto">
{`{
  "items": [
    {
      "title": "Morning workout",
      "start": "07:00",
      "end": "08:00"
    }
  ]
}`}
            </pre>
          </details>
        </div>

        {/* Footer */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg",
              "bg-muted hover:bg-muted/80",
              "transition-colors font-medium"
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors font-medium"
            )}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}