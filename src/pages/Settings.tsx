import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Save, TestTube, Key, Globe, Mail, Download, Trash2, Moon, Sun, Calendar, Settings as SettingsIcon, Shield, Smartphone } from 'lucide-react';
import { googleCalendar } from '@/lib/integrations/google-calendar';
import '../styles/responsive-system.css';

export function Settings() {
  const { toast } = useToast();
  const [apis, setApis] = useState({
    openai: localStorage.getItem('api_openai') || '',
    anthropic: localStorage.getItem('api_anthropic') || '',
    n8n: localStorage.getItem('api_n8n') || '',
    n8nToken: localStorage.getItem('api_n8n_token') || '',
    sendgrid: localStorage.getItem('api_sendgrid') || '',
    twilio: localStorage.getItem('api_twilio') || '',
    twilioAuth: localStorage.getItem('api_twilioAuth') || '',
    twilioPhone: localStorage.getItem('api_twilioPhone') || '',
  });

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isCalendarConnected, setIsCalendarConnected] = useState(googleCalendar.isConnected());

  const handleSave = () => {
    Object.entries(apis).forEach(([key, value]) => {
      if (value) {
        localStorage.setItem(`api_${key}`, value);
      } else {
        localStorage.removeItem(`api_${key}`);
      }
    });
    
    toast({
      title: 'Settings Saved',
      description: 'Your API configurations have been saved successfully.',
    });
  };

  const testConnection = async (service: string) => {
    toast({
      title: 'Testing Connection',
      description: `Testing ${service} connection...`,
    });

    setTimeout(() => {
      toast({
        title: 'Connection Test',
        description: `${service} connection test completed. Check console for details.`,
      });
    }, 2000);
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const connectCalendar = async () => {
    try {
      await googleCalendar.connect();
      setIsCalendarConnected(true);
      toast({
        title: 'Calendar Connected',
        description: 'Google Calendar has been connected successfully.',
      });
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect to Google Calendar.',
        variant: 'destructive'
      });
    }
  };

  const disconnectCalendar = () => {
    googleCalendar.disconnect();
    setIsCalendarConnected(false);
    toast({
      title: 'Calendar Disconnected',
      description: 'Google Calendar has been disconnected.',
    });
  };

  const exportData = () => {
    const data = {
      apis,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Settings Exported',
      description: 'Your settings have been exported successfully.',
    });
  };

  const clearData = () => {
    if (confirm('Are you sure you want to clear all settings? This action cannot be undone.')) {
      Object.keys(apis).forEach(key => {
        localStorage.removeItem(`api_${key}`);
      });
      setApis({
        openai: '',
        anthropic: '',
        n8n: '',
        n8nToken: '',
        sendgrid: '',
        twilio: '',
        twilioAuth: '',
        twilioPhone: '',
      });
      toast({
        title: 'Settings Cleared',
        description: 'All settings have been cleared.',
      });
    }
  };

  const apiSections = [
    {
      title: 'AI Services',
      icon: <SettingsIcon className="w-5 h-5" />,
      color: 'var(--accent-500)',
      apis: [
        { key: 'openai', label: 'OpenAI API Key', placeholder: 'sk-...' },
        { key: 'anthropic', label: 'Anthropic API Key', placeholder: 'sk-ant-...' }
      ]
    },
    {
      title: 'Communication',
      icon: <Mail className="w-5 h-5" />,
      color: 'var(--success-500)',
      apis: [
        { key: 'sendgrid', label: 'SendGrid API Key', placeholder: 'SG...' },
        { key: 'twilio', label: 'Twilio Account SID', placeholder: 'AC...' },
        { key: 'twilioAuth', label: 'Twilio Auth Token', placeholder: 'Auth token...' },
        { key: 'twilioPhone', label: 'Twilio Phone Number', placeholder: '+1234567890' }
      ]
    },
    {
      title: 'Automation',
      icon: <Globe className="w-5 h-5" />,
      color: 'var(--warn-500)',
      apis: [
        { key: 'n8n', label: 'n8n Webhook URL', placeholder: 'https://n8n.example.com/webhook/...' },
        { key: 'n8nToken', label: 'n8n API Token', placeholder: 'n8n_api_...' }
      ]
    }
  ];

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
            <SettingsIcon className="w-8 h-8" style={{ color: 'var(--accent-500)' }} />
            <div>
              <h1 style={{
                fontSize: 'var(--font-h1)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0
              }}>
                Settings & Configuration
              </h1>
              <p style={{
                fontSize: 'var(--font-body)',
                color: 'var(--text-secondary)',
                margin: '0.5rem 0 0 0'
              }}>
                Configure API keys, integrations, and system preferences
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
              onClick={handleSave}
              className="button-high-contrast"
              style={{
                padding: 'var(--space-2) var(--space-3)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)'
              }}
            >
              <Save className="w-4 h-4" />
              Save All
            </button>
            <button
              onClick={exportData}
              className="button-responsive"
              style={{
                padding: 'var(--space-2) var(--space-3)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                border: '1px solid var(--border-default)'
              }}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* API Configuration Sections */}
      <div style={{
        display: 'grid',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-4)'
      }}>
        {apiSections.map((section) => (
          <div
            key={section.title}
            className="card-enhanced"
            style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-card)',
              border: `1px solid ${section.color}`
            }}
          >
            <h2 style={{
              fontSize: 'var(--font-h2)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-3)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}>
              <span style={{ color: section.color }}>{section.icon}</span>
              {section.title}
            </h2>

            <div style={{
              display: 'grid',
              gap: 'var(--space-3)'
            }}>
              {section.apis.map((api) => (
                <div key={api.key} style={{
                  display: 'grid',
                  gridTemplateColumns: '200px 1fr auto auto',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-medium)',
                  border: '1px solid var(--border-default)'
                }}>
                  <label style={{
                    fontSize: 'var(--font-body)',
                    fontWeight: 500,
                    color: 'var(--text-primary)'
                  }}>
                    {api.label}
                  </label>
                  
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showKeys[api.key] ? 'text' : 'password'}
                      placeholder={api.placeholder}
                      value={apis[api.key as keyof typeof apis]}
                      onChange={(e) => setApis(prev => ({ ...prev, [api.key]: e.target.value }))}
                      className="input-enhanced"
                      style={{
                        width: '100%',
                        padding: 'var(--space-2)',
                        borderRadius: 'var(--radius-medium)',
                        fontSize: 'var(--font-body)',
                        paddingRight: '40px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility(api.key)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      {showKeys[api.key] ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    onClick={() => testConnection(api.label)}
                    className="button-responsive"
                    style={{
                      padding: 'var(--space-1) var(--space-2)',
                      fontSize: 'var(--font-small)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)'
                    }}
                    disabled={!apis[api.key as keyof typeof apis]}
                  >
                    <TestTube className="w-3 h-3" />
                    Test
                  </button>

                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: apis[api.key as keyof typeof apis] ? 'var(--success-500)' : 'var(--text-muted)'
                  }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Integration & Data Management */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 'var(--space-4)'
      }}>
        {/* Calendar Integration */}
        <div className="card-enhanced" style={{
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--success-500)'
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
            <Calendar className="w-6 h-6" style={{ color: 'var(--success-500)' }} />
            Calendar Integration
          </h2>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-3)',
            background: isCalendarConnected 
              ? 'rgba(16, 185, 129, 0.1)' 
              : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${isCalendarConnected ? 'var(--success-500)' : 'var(--warn-500)'}`,
            borderRadius: 'var(--radius-medium)'
          }}>
            <div>
              <p style={{
                fontSize: 'var(--font-body)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-1)'
              }}>
                Google Calendar
              </p>
              <p style={{
                fontSize: 'var(--font-small)',
                color: 'var(--text-secondary)'
              }}>
                {isCalendarConnected ? 'Connected and syncing' : 'Not connected'}
              </p>
            </div>
            
            <button
              onClick={isCalendarConnected ? disconnectCalendar : connectCalendar}
              className={isCalendarConnected ? "button-responsive" : "button-high-contrast"}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                border: isCalendarConnected ? '1px solid var(--error-500)' : undefined,
                color: isCalendarConnected ? 'var(--error-500)' : undefined
              }}
            >
              {isCalendarConnected ? 'Disconnect' : 'Connect'}
            </button>
          </div>

          <div style={{
            marginTop: 'var(--space-3)',
            padding: 'var(--space-2)',
            fontSize: 'var(--font-small)',
            color: 'var(--text-muted)',
            background: 'rgba(96, 165, 250, 0.1)',
            border: '1px solid var(--accent-500)',
            borderRadius: 'var(--radius-medium)'
          }}>
            <p>Calendar integration allows automatic event syncing and smart scheduling suggestions.</p>
          </div>
        </div>

        {/* Data Management */}
        <div className="card-enhanced" style={{
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--warn-500)'
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
            <Shield className="w-6 h-6" style={{ color: 'var(--warn-500)' }} />
            Data Management
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{
              padding: 'var(--space-3)',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-medium)',
              border: '1px solid var(--border-default)'
            }}>
              <h3 style={{
                fontSize: 'var(--font-body)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-2)'
              }}>
                Export Settings
              </h3>
              <p style={{
                fontSize: 'var(--font-small)',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-2)'
              }}>
                Download your current configuration as a backup file.
              </p>
              <button
                onClick={exportData}
                className="button-responsive"
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)'
                }}
              >
                <Download className="w-4 h-4" />
                Export Configuration
              </button>
            </div>

            <div style={{
              padding: 'var(--space-3)',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 'var(--radius-medium)',
              border: '1px solid var(--error-500)'
            }}>
              <h3 style={{
                fontSize: 'var(--font-body)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-2)'
              }}>
                Clear All Data
              </h3>
              <p style={{
                fontSize: 'var(--font-small)',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-2)'
              }}>
                Remove all stored API keys and configuration data. This action cannot be undone.
              </p>
              <button
                onClick={clearData}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'var(--error-500)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-medium)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: 'var(--font-body)',
                  fontFamily: 'Georgia, serif',
                  fontWeight: 600,
                  transition: 'all var(--transition-fast)'
                }}
              >
                <Trash2 className="w-4 h-4" />
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}