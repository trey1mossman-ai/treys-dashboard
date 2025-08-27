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
import { AutomationBuilder } from '@/components/AutomationBuilder';
import '../styles/responsive-system.css';

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
    <div style={{
      fontFamily: 'Georgia, serif',
      padding: 'clamp(1rem, 3vw, 2rem)',
      maxWidth: '1600px',
      margin: '0 auto',
      background: 'var(--bg-gradient)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div className="card-enhanced" style={{
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
        borderRadius: 'var(--radius-card)',
        border: '2px solid var(--accent-500)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Zap className="w-8 h-8" style={{ color: 'var(--accent-500)' }} />
            <div>
              <h1 style={{
                fontSize: 'var(--font-h1)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0
              }}>
                Workflows & Automation
              </h1>
              <p style={{
                fontSize: 'var(--font-body)',
                color: 'var(--text-secondary)',
                margin: '0.5rem 0 0 0'
              }}>
                Streamline your productivity with AI assistance and smart automations
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={() => {
                // Trigger the n8n Agent dock
                const event = new KeyboardEvent('keydown', { key: 'c' });
                window.dispatchEvent(event);
              }}
              className="button-high-contrast" 
              style={{
                padding: 'var(--space-2) var(--space-3)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)'
              }}
            >
              <MessageSquare className="w-4 h-4" />
              Open n8n Agent
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        marginBottom: 'var(--space-4)'
      }}>
        {/* AI Assistant - Full Width */}
        <div className="card-enhanced" style={{
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--accent-500)',
          minHeight: '600px',
          marginBottom: 'var(--space-4)'
        }}>
          <h2 style={{
            fontSize: 'var(--font-h2)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)'
          }}>
            <Zap className="w-6 h-6" style={{ color: 'var(--accent-500)' }} />
            AI Assistant (OpenAI Powered)
          </h2>
          <div style={{ 
            height: 'calc(600px - var(--space-4) - var(--space-3))',
            display: 'flex',
            gap: 'var(--space-4)'
          }}>
            <div style={{ flex: 1 }}>
              <AIAssistant />
            </div>
            <div style={{
              width: '300px',
              padding: 'var(--space-3)',
              background: 'rgba(var(--accent-rgb), 0.05)',
              borderRadius: 'var(--radius-medium)',
              border: '1px solid var(--accent-500)'
            }}>
              <h3 style={{
                fontSize: 'var(--font-h3)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-2)'
              }}>
                n8n Agent Available
              </h3>
              <p style={{
                fontSize: 'var(--font-small)',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-3)'
              }}>
                Press <kbd style={{ 
                  padding: '2px 6px',
                  background: 'var(--accent-500)',
                  borderRadius: '4px',
                  color: 'white',
                  fontWeight: 600
                }}>C</kbd> anywhere to open your n8n Agent for calendar and email management.
              </p>
              <div style={{
                fontSize: 'var(--font-small)',
                color: 'var(--text-muted)'
              }}>
                <p style={{ marginBottom: 'var(--space-1)' }}>• Schedule meetings</p>
                <p style={{ marginBottom: 'var(--space-1)' }}>• Send emails</p>
                <p style={{ marginBottom: 'var(--space-1)' }}>• Check calendar</p>
                <p>• Manage tasks</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Automation Builder - Full Width */}
      <div className="card-enhanced" style={{
        padding: 0,
        borderRadius: 'var(--radius-card)',
        border: '2px solid var(--warn-500)',
        overflow: 'hidden'
      }}>
        <AutomationBuilder />
      </div>
    </div>
  );
}
