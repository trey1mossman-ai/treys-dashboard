/**
 * Email Status Modal Component
 * Handles automated email updates when tasks are completed
 */

import { useState, useEffect } from 'react';
import { X, Send, Users, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import type { Task, Project, Contact, EmailStatusUpdate } from '@/types/projects.types';

interface EmailStatusModalProps {
  isOpen: boolean;
  task: Task | undefined;
  project: Project | undefined;
  onClose: () => void;
  onSend?: (update: EmailStatusUpdate) => void;
}

export function EmailStatusModal({ 
  isOpen, 
  task, 
  project, 
  onClose,
  onSend 
}: EmailStatusModalProps) {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [includeNextSteps, setIncludeNextSteps] = useState(true);
  const [includeProjectStatus, setIncludeProjectStatus] = useState(true);
  const [tone, setTone] = useState<EmailStatusUpdate['tone']>('professional_update');
  const [sendCopy, setSendCopy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset state when modal opens with new task
  useEffect(() => {
    if (isOpen && task) {
      setSelectedContacts([]);
      setCustomMessage('');
      setIncludeNextSteps(true);
      setIncludeProjectStatus(true);
      setTone('professional_update');
      setSendCopy(true);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, task?.id]);

  // Auto-select primary contacts
  useEffect(() => {
    if (isOpen && project?.contacts) {
      const primaryContacts = project.contacts
        .filter(c => c.isPrimary)
        .map(c => c.email);
      if (primaryContacts.length > 0) {
        setSelectedContacts(primaryContacts);
      }
    }
  }, [isOpen, project]);

  const handleSend = async () => {
    if (!task || !project || selectedContacts.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    setSending(true);
    setError(null);

    try {
      // Prepare the email update payload
      const emailUpdate: EmailStatusUpdate = {
        task,
        project,
        recipients: selectedContacts,
        message: customMessage,
        tone,
        includeNextSteps,
        includeProjectStatus,
        sendCopy
      };

      // Send to n8n webhook for AI processing and email sending
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8788' 
        : 'https://ailifeassistanttm.com';

      const response = await fetch(`${apiUrl}/api/task-completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_task_completion',
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
            completedAt: task.completedAt || new Date().toISOString(),
            estimatedHours: task.estimatedHours,
            actualHours: task.actualHours
          },
          project: {
            id: project.id,
            name: project.name,
            deadline: project.deadline,
            progress: project.progress,
            status: project.status
          },
          recipients: selectedContacts,
          tone,
          customMessage,
          includeNextSteps,
          includeProjectStatus,
          sendCopy
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send status update');
      }

      const result = await response.json();
      
      setSuccess(true);
      
      // Call the onSend callback if provided
      if (onSend) {
        onSend(emailUpdate);
      }

      // Close modal after short delay to show success
      setTimeout(() => {
        onClose();
      }, 1500);

      // Log success event
      console.log('✅ Status update sent:', {
        task: task.title,
        recipients: selectedContacts.length,
        result
      });

    } catch (err) {
      console.error('Failed to send status update:', err);
      setError('Failed to send update. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const toggleContact = (email: string) => {
    setSelectedContacts(prev => 
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const selectAll = () => {
    if (project?.contacts) {
      setSelectedContacts(project.contacts.map(c => c.email));
    }
  };

  const clearAll = () => {
    setSelectedContacts([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-background border border-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CheckCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Send Status Update?</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Task "{task?.title}" has been completed!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            disabled={sending}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Contact Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Users className="w-4 h-4" />
                Select Recipients
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-primary hover:underline"
                >
                  Select All
                </button>
                <span className="text-xs text-muted-foreground">•</span>
                <button
                  onClick={clearAll}
                  className="text-xs text-primary hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              {project?.contacts.map(contact => (
                <label
                  key={contact.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                    transition-all duration-200
                    ${selectedContacts.includes(contact.email)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedContacts.includes(contact.email)}
                    onChange={() => toggleContact(contact.email)}
                    className="sr-only"
                  />
                  <div className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center
                    ${selectedContacts.includes(contact.email)
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                    }
                  `}>
                    {selectedContacts.includes(contact.email) && (
                      <svg className="w-3 h-3 text-background" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {contact.email} {contact.role && `• ${contact.role}`}
                    </div>
                  </div>
                  {contact.isPrimary && (
                    <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                      Primary
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Email Options */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Email Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as EmailStatusUpdate['tone'])}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="professional_update">Professional Update</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="celebration">Celebration 🎉</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Custom Message (Optional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add any additional notes or context..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNextSteps}
                  onChange={(e) => setIncludeNextSteps(e.target.checked)}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                />
                <span className="text-sm">Include next steps</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeProjectStatus}
                  onChange={(e) => setIncludeProjectStatus(e.target.checked)}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                />
                <span className="text-sm">Include overall project status</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendCopy}
                  onChange={(e) => setSendCopy(e.target.checked)}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                />
                <span className="text-sm">Send me a copy</span>
              </label>
            </div>
          </div>

          {/* Task & Project Info */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Task:</span>
              <span className="font-medium">{task?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Project:</span>
              <span className="font-medium">{project?.name}</span>
            </div>
            {project?.deadline && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project Deadline:</span>
                <span className="font-medium">
                  {new Date(project.deadline).toLocaleDateString()}
                </span>
              </div>
            )}
            {project?.progress !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project Progress:</span>
                <span className="font-medium">{project.progress}%</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-4 p-3 rounded-lg bg-green-500/10 text-green-500 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Status update sent successfully!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-6 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Skip
          </button>
          
          <button
            onClick={handleSend}
            disabled={selectedContacts.length === 0 || sending || success}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all
              ${selectedContacts.length === 0 || sending || success
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
              }
            `}
          >
            {sending ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Sent!
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Update
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
