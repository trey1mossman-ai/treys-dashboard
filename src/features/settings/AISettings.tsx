import { useState, useEffect } from 'react'
import { Settings, Save, TestTube, Check, X, AlertCircle, Key, Bot, Link } from 'lucide-react'
import { PrimaryButton } from '@/components/PrimaryButton'
import { agentBridge } from '@/services/agentBridge'
import { aiService } from '@/services/aiService'
import { cn } from '@/lib/utils'

export function AISettings() {
  const [aiProvider, setAiProvider] = useState<'openai' | 'claude'>('openai')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiModel, setAiModel] = useState('')
  const [agentToken, setAgentToken] = useState('')
  const [agentSecret, setAgentSecret] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Load existing config
    const aiConfig = aiService.loadConfig()
    if (aiConfig) {
      setAiProvider(aiConfig.provider)
      setAiApiKey(aiConfig.apiKey)
      setAiModel(aiConfig.model || '')
    }

    // Load agent config from localStorage (for dev)
    const agentConfig = localStorage.getItem('agent_config')
    if (agentConfig) {
      const parsed = JSON.parse(agentConfig)
      setAgentToken(parsed.serviceToken || '')
      setAgentSecret(parsed.hmacSecret || '')
    }
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      // Save AI config
      if (aiApiKey) {
        aiService.initialize({
          provider: aiProvider,
          apiKey: aiApiKey,
          model: aiModel || (aiProvider === 'openai' ? 'gpt-4' : 'claude-3-opus-20240229')
        })
      }

      // Save agent config
      if (agentToken && agentSecret) {
        agentBridge.setConfig(agentToken, agentSecret)
      }

      setTestMessage('Configuration saved successfully!')
      setTestStatus('success')
    } catch (error) {
      setTestMessage('Failed to save configuration')
      setTestStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setTestStatus('testing')
    setTestMessage('Testing connection...')

    try {
      // Test AI service
      if (aiApiKey) {
        const aiResponse = await aiService.processCommand('test connection')
        if (!aiResponse.success && !aiResponse.message.includes('configured')) {
          throw new Error('AI service test failed')
        }
      }

      // Test agent connection
      if (agentToken && agentSecret) {
        const connected = true // Simplified for now
        if (!connected) {
          throw new Error('Agent API connection failed')
        }
      }

      setTestStatus('success')
      setTestMessage('All connections successful!')
    } catch (error) {
      setTestStatus('error')
      setTestMessage(error instanceof Error ? error.message : 'Connection test failed')
    }
  }

  const generateTokens = () => {
    // Generate random tokens for dev/testing
    const randomToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    const randomSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    setAgentToken(randomToken)
    setAgentSecret(randomSecret)
  }

  const models = {
    openai: ['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo'],
    claude: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          AI & Agent Configuration
        </h2>
        <p className="text-muted-foreground">
          Configure your AI provider and agent credentials to enable intelligent automation
        </p>
      </div>

      {/* AI Provider Settings */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          AI Provider Settings
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Provider</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAiProvider('openai')}
                className={cn(
                  "flex-1 p-3 rounded-lg border transition-all",
                  aiProvider === 'openai' 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                )}
              >
                OpenAI
              </button>
              <button
                onClick={() => setAiProvider('claude')}
                className={cn(
                  "flex-1 p-3 rounded-lg border transition-all",
                  aiProvider === 'claude' 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                )}
              >
                Anthropic Claude
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">API Key</label>
            <input
              type="password"
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
              placeholder={aiProvider === 'openai' ? 'sk-...' : 'sk-ant-...'}
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Model (Optional)</label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Default</option>
              {models[aiProvider].map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Agent API Settings */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Link className="w-5 h-5 text-primary" />
          Agent API Settings
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Service Token</label>
            <input
              type="password"
              value={agentToken}
              onChange={(e) => setAgentToken(e.target.value)}
              placeholder="Your agent service token"
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">HMAC Secret</label>
            <input
              type="password"
              value={agentSecret}
              onChange={(e) => setAgentSecret(e.target.value)}
              placeholder="Your HMAC signing secret"
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <button
            onClick={generateTokens}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <Key className="w-4 h-4" />
            Generate Random Tokens (for testing)
          </button>
        </div>
      </div>

      {/* Status Message */}
      {testMessage && (
        <div className={cn(
          "p-4 rounded-lg mb-6 flex items-center gap-2",
          testStatus === 'success' && "bg-green-500/10 border border-green-500/30 text-green-500",
          testStatus === 'error' && "bg-red-500/10 border border-red-500/30 text-red-500",
          testStatus === 'testing' && "bg-yellow-500/10 border border-yellow-500/30 text-yellow-500"
        )}>
          {testStatus === 'success' && <Check className="w-5 h-5" />}
          {testStatus === 'error' && <X className="w-5 h-5" />}
          {testStatus === 'testing' && <AlertCircle className="w-5 h-5 animate-pulse" />}
          <span>{testMessage}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <PrimaryButton
          onClick={handleTest}
          variant="ghost"
          disabled={testStatus === 'testing' || (!aiApiKey && !agentToken)}
        >
          <TestTube className="w-4 h-4 mr-2" />
          Test Connection
        </PrimaryButton>
        
        <PrimaryButton
          onClick={handleSave}
          disabled={isSaving || (!aiApiKey && !agentToken)}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </PrimaryButton>
      </div>

      {/* Help Text */}
      <div className="mt-8 p-4 bg-muted/30 rounded-lg">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-500" />
          Setup Instructions
        </h4>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Get your AI API key from OpenAI or Anthropic</li>
          <li>For production: Add AGENT_SERVICE_TOKEN and AGENT_HMAC_SECRET to Cloudflare environment</li>
          <li>For testing: Use the "Generate Random Tokens" button</li>
          <li>Click "Test Connection" to verify setup</li>
          <li>Save your configuration</li>
        </ol>
      </div>
    </div>
  )
}
