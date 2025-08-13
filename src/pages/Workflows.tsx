import { useState } from 'react';
import { Section } from '@/components/Section';
import { Card } from '@/components/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, MessageSquare, Zap } from 'lucide-react';
import { AIAssistant } from '@/features/workflows/AIAssistant';

export function Workflows() {
  const { toast } = useToast();
  const [composerText, setComposerText] = useState('');
  const [recipient, setRecipient] = useState('');
  const [sendMethod, setSendMethod] = useState<'email' | 'sms'>('email');

  const sendMessage = () => {
    if (!composerText.trim() || !recipient.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both recipient and message.',
        variant: 'destructive'
      });
      return;
    }

    // Save to outbox in localStorage
    const outbox = JSON.parse(localStorage.getItem('message_outbox') || '[]');
    outbox.push({
      id: Date.now().toString(),
      to: recipient,
      message: composerText,
      method: sendMethod,
      timestamp: new Date().toISOString(),
      status: 'pending'
    });
    localStorage.setItem('message_outbox', JSON.stringify(outbox));

    toast({
      title: 'Message Queued',
      description: `Message will be sent via ${sendMethod} when API is configured.`,
    });
    
    setComposerText('');
    setRecipient('');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Assistant */}
        <Section title="AI Assistant" className="h-[600px]">
          <AIAssistant />
        </Section>
        
        {/* Message Composer */}
        <Section title="Message Composer">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="recipient">Recipient</Label>
                <Input
                  id="recipient"
                  placeholder={sendMethod === 'email' ? 'email@example.com' : '+1234567890'}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message..."
                  className="min-h-[200px]"
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => { setSendMethod('email'); sendMessage(); }} 
                  className="flex-1 hover-glow"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send via Email
                </Button>
                <Button 
                  onClick={() => { setSendMethod('sms'); sendMessage(); }} 
                  variant="outline" 
                  className="flex-1"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send via SMS
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground text-center">
                Configure email/SMS providers in Settings to enable sending
              </div>
            </div>
          </Card>
        </Section>
      </div>
      
      {/* Quick Actions Info */}
      <Section title="Automations" className="mt-6">
        <Card className="p-6">
          <div className="text-center py-8">
            <Zap className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
            <p className="font-medium mb-2">Quick Actions Available</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create and manage webhook automations from the Dashboard
            </p>
            <Button onClick={() => window.location.href = '/'} className="hover-glow">
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </Section>
    </div>
  );
}
