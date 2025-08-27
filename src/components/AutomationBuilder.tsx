import { useState } from 'react';
import { Plus, X, Settings, Zap, ArrowRight, Calendar, Clock, Mail, MessageSquare, Webhook } from 'lucide-react';

interface AutomationTrigger {
  type: 'time' | 'event' | 'condition';
  config: {
    time?: string;
    event?: string;
    condition?: string;
  };
}

interface AutomationAction {
  type: 'email' | 'sms' | 'webhook' | 'notification' | 'task';
  config: {
    recipient?: string;
    message?: string;
    url?: string;
    title?: string;
  };
}

interface Automation {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  lastRun?: string;
}

export function AutomationBuilder() {
  const [automations, setAutomations] = useState<Automation[]>([
    {
      id: '1',
      name: 'Daily Morning Report',
      description: 'Send daily agenda summary via email',
      enabled: true,
      trigger: {
        type: 'time',
        config: { time: '07:00' }
      },
      actions: [
        {
          type: 'email',
          config: {
            recipient: 'you@example.com',
            message: 'Good morning! Here\'s your daily agenda summary.'
          }
        }
      ],
      lastRun: '2024-01-15T07:00:00Z'
    },
    {
      id: '2',
      name: 'Low Inventory Alert',
      description: 'Notify when supplement levels are low',
      enabled: true,
      trigger: {
        type: 'condition',
        config: { condition: 'inventory_low' }
      },
      actions: [
        {
          type: 'notification',
          config: {
            title: 'Low Inventory Alert',
            message: 'Time to reorder supplements'
          }
        }
      ]
    }
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [newAutomation, setNewAutomation] = useState<Partial<Automation>>({
    name: '',
    description: '',
    enabled: true,
    trigger: { type: 'time', config: {} },
    actions: []
  });

  const triggerTypes = [
    { type: 'time', label: 'Time-based', icon: Clock },
    { type: 'event', label: 'Event-based', icon: Calendar },
    { type: 'condition', label: 'Condition-based', icon: Settings }
  ];

  const actionTypes = [
    { type: 'email', label: 'Send Email', icon: Mail },
    { type: 'sms', label: 'Send SMS', icon: MessageSquare },
    { type: 'webhook', label: 'Webhook', icon: Webhook },
    { type: 'notification', label: 'Notification', icon: Zap },
  ];

  const addAction = () => {
    if (newAutomation.actions) {
      setNewAutomation({
        ...newAutomation,
        actions: [...newAutomation.actions, { type: 'notification', config: {} }]
      });
    }
  };

  const removeAction = (index: number) => {
    if (newAutomation.actions) {
      const updatedActions = newAutomation.actions.filter((_, i) => i !== index);
      setNewAutomation({ ...newAutomation, actions: updatedActions });
    }
  };

  const saveAutomation = () => {
    if (newAutomation.name && newAutomation.trigger && newAutomation.actions) {
      const automation: Automation = {
        id: Date.now().toString(),
        name: newAutomation.name,
        description: newAutomation.description || '',
        enabled: newAutomation.enabled || true,
        trigger: newAutomation.trigger,
        actions: newAutomation.actions
      };
      
      setAutomations([...automations, automation]);
      setNewAutomation({
        name: '',
        description: '',
        enabled: true,
        trigger: { type: 'time', config: {} },
        actions: []
      });
      setIsCreating(false);
    }
  };

  const toggleAutomation = (id: string) => {
    setAutomations(automations.map(auto => 
      auto.id === id ? { ...auto, enabled: !auto.enabled } : auto
    ));
  };

  const deleteAutomation = (id: string) => {
    setAutomations(automations.filter(auto => auto.id !== id));
  };

  return (
    <div style={{
      fontFamily: 'Georgia, serif',
      padding: 'var(--space-3)',
      background: 'var(--bg-gradient)',
      minHeight: '100%'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-4)',
        flexWrap: 'wrap',
        gap: 'var(--space-2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Zap className="w-8 h-8" style={{ color: 'var(--accent-500)' }} />
          <div>
            <h1 style={{
              fontSize: 'var(--font-h2)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0
            }}>
              Automation Builder
            </h1>
            <p style={{
              fontSize: 'var(--font-body)',
              color: 'var(--text-secondary)',
              margin: '0.25rem 0 0 0'
            }}>
              Create smart workflows to automate your daily tasks
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="button-high-contrast"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)'
          }}
        >
          <Plus className="w-4 h-4" />
          New Automation
        </button>
      </div>

      {/* Existing Automations */}
      <div style={{
        display: 'grid',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)'
      }}>
        {automations.map((automation) => (
          <div
            key={automation.id}
            className="card-enhanced"
            style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-card)',
              border: automation.enabled 
                ? '2px solid var(--accent-500)' 
                : '1px solid var(--border-default)'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-3)',
              flexWrap: 'wrap',
              gap: 'var(--space-2)'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-1)'
                }}>
                  <h3 style={{
                    fontSize: 'var(--font-h3)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: 0
                  }}>
                    {automation.name}
                  </h3>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: automation.enabled ? 'var(--success-500)' : 'var(--text-muted)'
                  }} />
                </div>
                <p style={{
                  fontSize: 'var(--font-small)',
                  color: 'var(--text-secondary)',
                  margin: 0
                }}>
                  {automation.description}
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)'
              }}>
                <button
                  onClick={() => toggleAutomation(automation.id)}
                  className="button-responsive"
                  style={{
                    padding: '0.25rem 0.75rem',
                    fontSize: 'var(--font-small)',
                    background: automation.enabled ? 'var(--success-500)' : 'var(--text-muted)'
                  }}
                >
                  {automation.enabled ? 'Enabled' : 'Disabled'}
                </button>
                <button
                  onClick={() => deleteAutomation(automation.id)}
                  className="button-responsive"
                  style={{
                    padding: '0.25rem',
                    color: 'var(--error-500)',
                    border: '1px solid var(--error-500)'
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Automation Flow */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              flexWrap: 'wrap'
            }}>
              {/* Trigger */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'rgba(96, 165, 250, 0.1)',
                border: '1px solid var(--accent-500)',
                borderRadius: 'var(--radius-medium)'
              }}>
                <Clock className="w-4 h-4" style={{ color: 'var(--accent-500)' }} />
                <span style={{
                  fontSize: 'var(--font-small)',
                  color: 'var(--text-primary)',
                  fontWeight: 500
                }}>
                  {automation.trigger.type === 'time' && `Daily at ${automation.trigger.config.time}`}
                  {automation.trigger.type === 'event' && automation.trigger.config.event}
                  {automation.trigger.type === 'condition' && automation.trigger.config.condition}
                </span>
              </div>

              <ArrowRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />

              {/* Actions */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                flexWrap: 'wrap'
              }}>
                {automation.actions.map((action, index) => {
                  const ActionIcon = actionTypes.find(t => t.type === action.type)?.icon || Zap;
                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-1)',
                        padding: 'var(--space-1) var(--space-2)',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid var(--success-500)',
                        borderRadius: 'var(--radius-small)'
                      }}
                    >
                      <ActionIcon className="w-3 h-3" style={{ color: 'var(--success-500)' }} />
                      <span style={{
                        fontSize: 'var(--font-small)',
                        color: 'var(--text-primary)'
                      }}>
                        {actionTypes.find(t => t.type === action.type)?.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {automation.lastRun && (
              <div style={{
                marginTop: 'var(--space-2)',
                fontSize: 'var(--font-small)',
                color: 'var(--text-muted)'
              }}>
                Last run: {new Date(automation.lastRun).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create New Automation */}
      {isCreating && (
        <div className="card-enhanced" style={{
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-card)',
          border: '2px solid var(--accent-500)'
        }}>
          <h3 style={{
            fontSize: 'var(--font-h3)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-3)'
          }}>
            Create New Automation
          </h3>

          <div style={{
            display: 'grid',
            gap: 'var(--space-3)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
          }}>
            {/* Basic Info */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-small)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-1)'
              }}>
                Name
              </label>
              <input
                type="text"
                value={newAutomation.name || ''}
                onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })}
                className="input-enhanced"
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-medium)',
                  marginBottom: 'var(--space-2)'
                }}
                placeholder="Enter automation name"
              />

              <label style={{
                display: 'block',
                fontSize: 'var(--font-small)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-1)'
              }}>
                Description
              </label>
              <textarea
                value={newAutomation.description || ''}
                onChange={(e) => setNewAutomation({ ...newAutomation, description: e.target.value })}
                className="input-enhanced"
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-medium)',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                placeholder="Describe what this automation does"
              />
            </div>

            {/* Trigger Configuration */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-small)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-2)'
              }}>
                Trigger
              </label>
              <div style={{
                display: 'flex',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-2)'
              }}>
                {triggerTypes.map((trigger) => {
                  const Icon = trigger.icon;
                  return (
                    <button
                      key={trigger.type}
                      onClick={() => setNewAutomation({
                        ...newAutomation,
                        trigger: { type: trigger.type as 'time' | 'event' | 'condition', config: {} }
                      })}
                      className="button-responsive"
                      style={{
                        padding: 'var(--space-2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-1)',
                        fontSize: 'var(--font-small)',
                        background: newAutomation.trigger?.type === trigger.type 
                          ? 'var(--accent-500)' 
                          : 'transparent',
                        border: `1px solid ${newAutomation.trigger?.type === trigger.type 
                          ? 'var(--accent-500)' 
                          : 'var(--border-default)'}`
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {trigger.label}
                    </button>
                  );
                })}
              </div>

              {newAutomation.trigger?.type === 'time' && (
                <input
                  type="time"
                  value={newAutomation.trigger.config.time || ''}
                  onChange={(e) => setNewAutomation({
                    ...newAutomation,
                    trigger: {
                      ...newAutomation.trigger!,
                      config: { ...newAutomation.trigger!.config, time: e.target.value }
                    }
                  })}
                  className="input-enhanced"
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    borderRadius: 'var(--radius-medium)'
                  }}
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ marginTop: 'var(--space-3)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-2)'
            }}>
              <label style={{
                fontSize: 'var(--font-small)',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}>
                Actions
              </label>
              <button
                onClick={addAction}
                className="button-responsive"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: 'var(--font-small)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-1)'
                }}
              >
                <Plus className="w-3 h-3" />
                Add Action
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {newAutomation.actions?.map((action, index) => (
                <div
                  key={index}
                  style={{
                    padding: 'var(--space-2)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-medium)',
                    background: 'rgba(255, 255, 255, 0.02)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-2)'
                  }}>
                    <select
                      value={action.type}
                      onChange={(e) => {
                        const updatedActions = [...(newAutomation.actions || [])];
                        updatedActions[index] = { ...action, type: e.target.value as any };
                        setNewAutomation({ ...newAutomation, actions: updatedActions });
                      }}
                      className="input-enhanced"
                      style={{
                        flex: 1,
                        padding: 'var(--space-1)',
                        borderRadius: 'var(--radius-small)'
                      }}
                    >
                      {actionTypes.map((actionType) => (
                        <option key={actionType.type} value={actionType.type}>
                          {actionType.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeAction(index)}
                      className="button-responsive"
                      style={{
                        padding: '0.25rem',
                        color: 'var(--error-500)',
                        border: '1px solid var(--error-500)'
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {(action.type === 'email' || action.type === 'sms') && (
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <input
                        type="text"
                        placeholder="Recipient"
                        value={action.config.recipient || ''}
                        onChange={(e) => {
                          const updatedActions = [...(newAutomation.actions || [])];
                          updatedActions[index] = {
                            ...action,
                            config: { ...action.config, recipient: e.target.value }
                          };
                          setNewAutomation({ ...newAutomation, actions: updatedActions });
                        }}
                        className="input-enhanced"
                        style={{
                          flex: 1,
                          padding: 'var(--space-1)',
                          borderRadius: 'var(--radius-small)'
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Message"
                        value={action.config.message || ''}
                        onChange={(e) => {
                          const updatedActions = [...(newAutomation.actions || [])];
                          updatedActions[index] = {
                            ...action,
                            config: { ...action.config, message: e.target.value }
                          };
                          setNewAutomation({ ...newAutomation, actions: updatedActions });
                        }}
                        className="input-enhanced"
                        style={{
                          flex: 2,
                          padding: 'var(--space-1)',
                          borderRadius: 'var(--radius-small)'
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save/Cancel */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginTop: 'var(--space-4)',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setIsCreating(false)}
              className="button-responsive"
              style={{
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--border-default)'
              }}
            >
              Cancel
            </button>
            <button
              onClick={saveAutomation}
              className="button-high-contrast"
              style={{
                padding: 'var(--space-2) var(--space-3)'
              }}
            >
              Save Automation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}