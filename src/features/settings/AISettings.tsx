import { useState, useEffect } from 'react'
import { Bot, Save, Trash2, Shield } from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/useToast'
import { aiService } from '@/services/aiService'

export function AISettings() {
  const [provider, setProvider] = useState<'claude' | 'openai'>('claude')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const { toast } = useToast()
  
  useEffect(() => {
    const config = aiService.loadConfig()
    if (config) {
      setProvider(config.provider)
      setApiKey(config.apiKey)
      setModel(config.model || '')
      setIsConfigured(true)
    }
  }, [])
  
  const handleSave = () => {
    if (!apiKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an API key',
        variant: 'destructive'
      })
      return
    }
    
    aiService.initialize({
      provider,
      apiKey: apiKey.trim(),
      model: model.trim() || undefined
    })
    
    setIsConfigured(true)
    toast({
      title: 'Success',
      description: 'AI credentials saved successfully',
      variant: 'default'
    })
  }
  
  const handleClear = () => {
    aiService.clearConfig()
    setApiKey('')
    setModel('')
    setIsConfigured(false)
    toast({
      title: 'Success',
      description: 'AI credentials cleared',
      variant: 'default'
    })
  }
  
  const getModelOptions = () => {
    if (provider === 'claude') {
      return [
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
        { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
        { value: 'claude-2.1', label: 'Claude 2.1' },
        { value: 'claude-2.0', label: 'Claude 2.0' }
      ]
    } else {
      return [
        { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K' }
      ]
    }
  }
  
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Bot className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold">AI Assistant Configuration</h2>
        {isConfigured && (
          <span className="ml-auto text-sm text-green-500 flex items-center gap-1">
            <Shield className="w-4 h-4" />
            Configured
          </span>
        )}
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="provider">AI Provider</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as 'claude' | 'openai')}>
            <SelectTrigger id="provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude">Anthropic Claude</SelectItem>
              <SelectItem value="openai">OpenAI GPT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="apiKey">API Key</Label>
          <div className="flex gap-2">
            <Input
              id="apiKey"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'claude' ? 'sk-ant-api...' : 'sk-...'}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? 'Hide' : 'Show'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {provider === 'claude' 
              ? 'Get your API key from console.anthropic.com'
              : 'Get your API key from platform.openai.com'}
          </p>
        </div>
        
        <div>
          <Label htmlFor="model">Model (Optional)</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger id="model">
              <SelectValue placeholder="Select a model (or leave default)" />
            </SelectTrigger>
            <SelectContent>
              {getModelOptions().map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Credentials
          </Button>
          {isConfigured && (
            <Button 
              onClick={handleClear} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Credentials
            </Button>
          )}
        </div>
        
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="text-sm font-medium mb-2">How AI Control Works:</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Your AI can add, edit, and delete agenda items</li>
            <li>• Navigate between different sections of the app</li>
            <li>• Analyze your schedule and provide insights</li>
            <li>• Execute complex commands like "Schedule a meeting tomorrow at 2pm"</li>
            <li>• Your API key is stored locally and never sent to our servers</li>
          </ul>
        </div>
      </div>
    </Card>
  )
}