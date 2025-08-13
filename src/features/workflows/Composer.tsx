import { useState } from 'react'
import { Send, Mail, MessageSquare, Phone } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectItem } from '@/components/ui/select'
import { Card } from '@/components/Card'
import { emailService } from '@/services/emailService'
import { smsService } from '@/services/smsService'
import { whatsappService } from '@/services/whatsappService'
import { PROVIDERS } from '@/lib/constants'
import type { EmailData, SMSData, WhatsAppData } from './types'

export function Composer() {
  const [activeTab, setActiveTab] = useState('email')
  const [emailForm, setEmailForm] = useState<EmailData>({
    from: '',
    to: '',
    subject: '',
    body: ''
  })
  const [smsForm, setSmsForm] = useState<SMSData>({
    from: '',
    to: '',
    body: ''
  })
  const [whatsappForm, setWhatsappForm] = useState<WhatsAppData>({
    from: '',
    to: '',
    body: ''
  })
  const [sending, setSending] = useState(false)
  
  const handleEmailSend = async () => {
    setSending(true)
    try {
      await emailService.send(emailForm)
      setEmailForm({ from: '', to: '', subject: '', body: '' })
      alert('Email sent successfully!')
    } catch (error) {
      alert('Failed to send email')
    }
    setSending(false)
  }
  
  const handleSMSSend = async () => {
    setSending(true)
    try {
      await smsService.send(smsForm)
      setSmsForm({ from: '', to: '', body: '' })
      alert('SMS sent successfully!')
    } catch (error) {
      alert('Failed to send SMS')
    }
    setSending(false)
  }
  
  const handleWhatsAppSend = async () => {
    setSending(true)
    try {
      await whatsappService.send(whatsappForm)
      setWhatsappForm({ from: '', to: '', body: '' })
      alert('WhatsApp message sent successfully!')
    } catch (error) {
      alert('Failed to send WhatsApp message')
    }
    setSending(false)
  }
  
  return (
    <Card className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms">
            <MessageSquare className="w-4 h-4 mr-2" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <Phone className="w-4 h-4 mr-2" />
            WhatsApp
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="email" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">From</label>
              <Select 
                value={emailForm.from}
                onValueChange={(value) => setEmailForm({ ...emailForm, from: value })}
              >
                {PROVIDERS.EMAIL.map(provider => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">To</label>
              <Input
                type="email"
                value={emailForm.to}
                onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                placeholder="recipient@example.com"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Subject</label>
            <Input
              value={emailForm.subject}
              onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
              placeholder="Email subject"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={emailForm.body}
              onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
              placeholder="Type your message..."
              rows={6}
            />
          </div>
          
          <Button 
            onClick={handleEmailSend} 
            disabled={sending || !emailForm.from || !emailForm.to || !emailForm.subject || !emailForm.body}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            Send Email
          </Button>
        </TabsContent>
        
        <TabsContent value="sms" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">From</label>
              <Select 
                value={smsForm.from}
                onValueChange={(value) => setSmsForm({ ...smsForm, from: value })}
              >
                {PROVIDERS.SMS.map(provider => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">To</label>
              <Input
                type="tel"
                value={smsForm.to}
                onChange={(e) => setSmsForm({ ...smsForm, to: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Message (160 chars max)</label>
            <Textarea
              value={smsForm.body}
              onChange={(e) => setSmsForm({ ...smsForm, body: e.target.value.slice(0, 160) })}
              placeholder="Type your message..."
              rows={3}
              maxLength={160}
            />
            <span className="text-xs text-muted">
              {smsForm.body.length}/160 characters
            </span>
          </div>
          
          <Button 
            onClick={handleSMSSend}
            disabled={sending || !smsForm.from || !smsForm.to || !smsForm.body}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            Send SMS
          </Button>
        </TabsContent>
        
        <TabsContent value="whatsapp" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">From</label>
              <Select 
                value={whatsappForm.from}
                onValueChange={(value) => setWhatsappForm({ ...whatsappForm, from: value })}
              >
                {PROVIDERS.WHATSAPP.map(provider => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">To</label>
              <Input
                type="tel"
                value={whatsappForm.to}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, to: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={whatsappForm.body}
              onChange={(e) => setWhatsappForm({ ...whatsappForm, body: e.target.value })}
              placeholder="Type your message..."
              rows={4}
            />
          </div>
          
          <Button 
            onClick={handleWhatsAppSend}
            disabled={sending || !whatsappForm.from || !whatsappForm.to || !whatsappForm.body}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            Send WhatsApp
          </Button>
        </TabsContent>
      </Tabs>
    </Card>
  )
}