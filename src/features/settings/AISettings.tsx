import { useState, useEffect } from 'react'
import { Bot, Save, Trash2, Shield, Key, Server, CheckCircle, AlertCircle } from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/useToast'
import { aiService } from '@/services/aiService'
import { agentBridge } from '@/services/agentBridge'

export function AISettings() {
  // AI Provider State
  const [provider, setProvider] = useState<'claude' | 'openai'>('claude')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [isAIConfigured, setIsAIConfigured] = useState(false)
  const [showKey, setShowKey] = useState(false)
  
  // Agent API State
  const [agentToken, setAgentToken] = useState('')
  const [agentSecret, setAgentSecret] = useState('')
  const [isAgentConfigured, setIsAgentConfigured] = useState(false)
  const [showAgentToken, setShowAgentToken] = useState(false)
  const [showAgentSecret, setShowAgentSecret] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'testing' | 'success' | 'error'>('untested')
  
  const { toast } = useToast()
  
  useEffect(() => {
    // Load AI config
    const aiConfig = aiService.loadConfig()
    if (aiConfig) {
      setProvider(aiConfig.provider)
      setApiKey(aiConfig.apiKey)
      setModel(aiConfig.model || '')
      setIsAIConfigured(true)
    }
    
    // Load Agent config
    const agentConfig = agentBridge.loadCredentials()
    if (agentConfig) {
      setAgentToken(agentConfig.token)
      setAgentSecret(agentConfig.secret)
      setIsAgentConfigured(true)
    }
  }, [])
  
  const handleSaveAI = () => {
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
    
    setIsAIConfigured(true)
    toast({
      title: 'Success',
      description: 'AI credentials saved successfully',
      variant: 'default'
    })
  }
  
  const handleClearAI = () => {
    aiService.clearConfig()
    setApiKey('')
    setModel('')
    setIsAIConfigured(false)
    toast({
      title: 'Success',
      description: 'AI credentials cleared',
      variant: 'default'
    })
  }
  
  const handleSaveAgent = () => {
    if (!agentToken.trim() || !agentSecret.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter both Agent Token and Secret',
        variant: 'destructive'
      })
      return
    }
    
    agentBridge.saveCredentials(agentToken.trim(), agentSecret.trim())
    setIsAgentConfigured(true)
    
    toast({
      title: 'Success',
      description: 'Agent API credentials saved successfully',
      variant: 'default'
    })
  }
  
  const handleTestConnection = async () => {
    setIsTestingConnection(true)
    setConnectionStatus('testing')
    
    try {
      // Test the connection with a simple list command
      const result = await agentBridge.executeDirectCommand('agenda.listByDate', {
        date: new Date().toISOString().split('T')[0]
      })
      
      if (result.ok !== false) {
        setConnectionStatus('success')
        toast({
          title: 'Connection Successful',
          description: 'Agent API is configured correctly',
          variant: 'default'
        })
      } else {
        setConnectionStatus('error')
        toast({
          title: 'Connection Failed',
          description: result.error?.message || 'Unable to connect to Agent API',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      setConnectionStatus('error')
      toast({
        title: 'Connection Error',
        description: error.message || 'Failed to test connection',
        variant: 'destructive'
      })
    } finally {
      setIsTestingConnection(false)
    }
  }
  
  const handleClearAgent = () => {
    localStorage.removeItem('agent_config')
    setAgentToken('')
    setAgentSecret('')
    setIsAgentConfigured(false)
    setConnectionStatus('untested')
    toast({
      title: 'Success',
      description: 'Agent API credentials cleared',
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
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bot className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">AI Configuration</h2>
          {isAIConfigured && isAgentConfigured && (
            <span className="ml-auto text-sm text-green-500 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Fully Configured
            </span>
          )}
        </div>
        
        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI Provider
            </TabsTrigger>
            <TabsTrigger value="agent" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              Agent API
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="ai" className="space-y-4 mt-6">
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Step 1: Configure AI Provider
              </h3>
              <p className="text-xs text-muted-foreground">
                This powers the natural language understanding
              </p>
            </div>
            
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
              <Button onClick={handleSaveAI} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save AI Credentials
              </Button>
              {isAIConfigured && (
                <Button 
                  onClick={handleClearAI} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </Button>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="agent" className="space-y-4 mt-6">
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Server className="w-4 h-4" />
                Step 2: Configure Dashboard Control
              </h3>
              <p className="text-xs text-muted-foreground">
                This allows the AI to control your dashboard
              </p>
            </div>
            
            {!isAgentConfigured && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-500 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  How to Get Agent Credentials
                </h4>
                <ol className="text-xs text-yellow-500/80 space-y-1 ml-5">
                  <li>1. Deploy your app to Cloudflare Pages</li>
                  <li>2. Run: <code className="px-1 py-0.5 bg-black/20 rounded">wrangler secret put AGENT_SERVICE_TOKEN</code></li>
                  <li>3. Run: <code className="px-1 py-0.5 bg-black/20 rounded">wrangler secret put AGENT_HMAC_SECRET</code></li>
                  <li>4. Copy those same values here for local testing</li>
                </ol>
              </div>
            )}
            
            <div>
              <Label htmlFor="agentToken">Agent Service Token</Label>
              <div className="flex gap-2">
                <Input
                  id="agentToken"
                  type={showAgentToken ? 'text' : 'password'}
                  value={agentToken}
                  onChange={(e) => setAgentToken(e.target.value)}
                  placeholder="Your agent service token"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAgentToken(!showAgentToken)}
                >
                  {showAgentToken ? 'Hide' : 'Show'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This should match your AGENT_SERVICE_TOKEN environment variable
              </p>
            </div>
            
            <div>
              <Label htmlFor="agentSecret">Agent HMAC Secret</Label>
              <div className="flex gap-2">
                <Input
                  id="agentSecret"
                  type={showAgentSecret ? 'text' : 'password'}
                  value={agentSecret}
                  onChange={(e) => setAgentSecret(e.target.value)}
                  placeholder="Your HMAC secret for signing"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAgentSecret(!showAgentSecret)}
                >
                  {showAgentSecret ? 'Hide' : 'Show'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This should match your AGENT_HMAC_SECRET environment variable
              </p>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveAgent} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Agent Credentials
              </Button>
              {isAgentConfigured && (
                <>
                  <Button 
                    onClick={handleTestConnection}
                    variant="outline"
                    disabled={isTestingConnection}
                    className="flex items-center gap-2"
                  >
                    {isTestingConnection ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Test Connection
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleClearAgent} 
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear
                  </Button>
                </>
              )}
            </div>
            
            {connectionStatus !== 'untested' && (
              <div className={cn(
                "p-3 rounded-lg border flex items-center gap-2",
                connectionStatus === 'success' && "bg-green-500/10 border-green-500/30 text-green-500",
                connectionStatus === 'error' && "bg-red-500/10 border-red-500/30 text-red-500",
                connectionStatus === 'testing' && "bg-blue-500/10 border-blue-500/30 text-blue-500"
              )}>
                {connectionStatus === 'success' && <CheckCircle className="w-4 h-4" />}
                {connectionStatus === 'error' && <AlertCircle className="w-4 h-4" />}
                {connectionStatus === 'testing' && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                <span className="text-sm">
                  {connectionStatus === 'success' && 'Connection successful! Agent API is working.'}
                  {connectionStatus === 'error' && 'Connection failed. Check your credentials.'}
                  {connectionStatus === 'testing' && 'Testing connection...'}
                </span>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="text-sm font-medium mb-2">How the AI Assistant Works:</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-primary">1.</span>
              <span>AI Provider (Claude/OpenAI) understands your natural language commands</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">2.</span>
              <span>Agent API executes actions on your dashboard (add events, create tasks, etc.)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">3.</span>
              <span>Your credentials are stored locally and never sent to our servers</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-3 h-3 text-green-500 mt-0.5" />
              <span>All API calls are authenticated and encrypted</span>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
