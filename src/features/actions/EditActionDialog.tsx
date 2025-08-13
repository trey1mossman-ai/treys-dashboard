import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { IconButton } from '@/components/IconButton';
import type { QuickAction } from './types';

interface EditActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: QuickAction;
  onSubmit: (action: QuickAction) => void;
}

export const EditActionDialog: React.FC<EditActionDialogProps> = ({
  open,
  onOpenChange,
  action,
  onSubmit
}) => {
  const [name, setName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST'>('POST');
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([]);
  const [defaultPayload, setDefaultPayload] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (action) {
      setName(action.name);
      setWebhookUrl(action.webhook_url);
      setMethod(action.method);
      
      const headersList = action.headers 
        ? Object.entries(action.headers).map(([key, value]) => ({ key, value }))
        : [];
      setHeaders(headersList);
      
      setDefaultPayload(action.default_payload ? JSON.stringify(action.default_payload, null, 2) : '');
      setErrors({});
    }
  }, [action]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!webhookUrl.trim()) {
      newErrors.webhookUrl = 'Webhook URL is required';
    } else {
      try {
        new URL(webhookUrl);
      } catch {
        newErrors.webhookUrl = 'Invalid URL format';
      }
    }
    
    if (defaultPayload) {
      try {
        JSON.parse(defaultPayload);
      } catch {
        newErrors.defaultPayload = 'Invalid JSON format';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const headersObj = headers.reduce((acc, { key, value }) => {
      if (key && value) acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    onSubmit({
      ...action,
      name: name.trim(),
      webhook_url: webhookUrl.trim(),
      method,
      headers: Object.keys(headersObj).length > 0 ? headersObj : undefined,
      default_payload: defaultPayload ? JSON.parse(defaultPayload) : undefined
    });
  };

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] border-glow max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Automation</DialogTitle>
            <DialogDescription>
              Update the webhook automation configuration
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Send Daily Report"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="webhook">Webhook URL *</Label>
              <Input
                id="webhook"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://n8n.example.com/webhook/..."
                className={errors.webhookUrl ? 'border-destructive' : ''}
              />
              {errors.webhookUrl && (
                <p className="text-sm text-destructive">{errors.webhookUrl}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="method">Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as 'GET' | 'POST')}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Headers (Optional)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addHeader}
                  className="hover-glow"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Header
                </Button>
              </div>
              {headers.length > 0 && (
                <div className="space-y-2">
                  {headers.map((header, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Key"
                        value={header.key}
                        onChange={(e) => updateHeader(index, 'key', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value"
                        value={header.value}
                        onChange={(e) => updateHeader(index, 'value', e.target.value)}
                        className="flex-1"
                      />
                      <IconButton
                        type="button"
                        icon={<Trash2 className="h-4 w-4" />}
                        label="Remove"
                        onClick={() => removeHeader(index)}
                        variant="ghost"
                        size="icon"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="payload">Extra Details (JSON, Optional)</Label>
              <Textarea
                id="payload"
                value={defaultPayload}
                onChange={(e) => setDefaultPayload(e.target.value)}
                placeholder='{"key": "value"}'
                rows={4}
                className={errors.defaultPayload ? 'border-destructive font-mono text-sm' : 'font-mono text-sm'}
              />
              {errors.defaultPayload && (
                <p className="text-sm text-destructive">{errors.defaultPayload}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="hover-glow">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};