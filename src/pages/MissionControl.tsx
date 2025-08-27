import { useState, useEffect } from 'react';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { TodayTimeline } from '@/components/mission-control/TodayTimeline';
import { PreviewDrawer } from '@/components/mission-control/PreviewDrawer';
import { TelemetryPanel } from '@/components/mission-control/TelemetryPanel';
import { InventoryWarnings } from '@/components/mission-control/InventoryWarnings';
import { ActionBar } from '@/components/mission-control/ActionBar';
import { NotificationToasts } from '@/components/mission-control/NotificationToasts';
import { InfoPill, ProgressPill } from '@/components/InfoPill';
import { EmailWidget } from '@/components/EmailWidget';
import { CalendarWidget } from '@/components/CalendarWidget';
import type { AgendaItem } from '@/types/mission-control';
import { cn } from '@/lib/utils';
import { Settings, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';

// Import the design system CSS
import '@/styles/tokens.css';
import '@/styles/mission-control.css';
import '@/styles/wave-effects.css';
import '@/styles/responsive-system.css';

export default function MissionControl() {
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const { 
    setLoading, 
    executeDailyBuild,
    settings 
  } = useMissionControlStore();
  
  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading('agenda', true);
      setLoading('status', true);
      setLoading('inventory', true);
      
      try {
        // For now, skip API calls since backend isn't running
        console.log('Mission Control: Loading in demo mode (no backend)');
        
        // You can uncomment these when your backend is ready:
        /*
        // Fetch today's agenda
        const agendaResponse = await fetch('/api/agenda/today');
        if (agendaResponse.ok) {
          const data = await agendaResponse.json();
          useMissionControlStore.getState().setAgenda(data.items || []);
        }
        
        // Fetch latest status
        const statusResponse = await fetch('/api/status/latest');
        if (statusResponse.ok) {
          const data = await statusResponse.json();
          useMissionControlStore.getState().setStatus(data);
        }
        
        // Fetch inventory
        const inventoryResponse = await fetch('/api/inventory');
        if (inventoryResponse.ok) {
          const data = await inventoryResponse.json();
          useMissionControlStore.getState().setInventory(data.items || []);
        }
        */
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading('agenda', false);
        setLoading('status', false);
        setLoading('inventory', false);
      }
    };
    
    loadData();
    
    // Set up refresh interval if enabled
    if (settings.refresh_window.enabled) {
      const interval = setInterval(() => {
        const now = new Date();
        const hour = now.getHours();
        const startHour = parseInt(settings.refresh_window.start.split(':')[0]);
        const endHour = parseInt(settings.refresh_window.end.split(':')[0]);
        
        if (hour >= startHour && hour <= endHour) {
          loadData();
        }
      }, 3600000); // Refresh every hour
      
      return () => clearInterval(interval);
    }
  }, [setLoading, settings.refresh_window]);
  
  // Check if daily build should run
  useEffect(() => {
    const checkDailyBuild = () => {
      const now = new Date();
      const [buildHour, buildMinute] = settings.daily_build_time.split(':').map(Number);
      
      if (now.getHours() === buildHour && now.getMinutes() === buildMinute) {
        executeDailyBuild();
      }
    };
    
    // Check every minute
    const interval = setInterval(checkDailyBuild, 60000);
    
    // Check immediately
    checkDailyBuild();
    
    return () => clearInterval(interval);
  }, [executeDailyBuild, settings.daily_build_time]);
  
  return (
    <div style={{
      fontFamily: 'Georgia, serif',
      padding: 'clamp(1rem, 3vw, 2rem)',
      maxWidth: '1600px',
      margin: '0 auto',
      background: 'var(--bg-gradient)',
      minHeight: '100vh'
    }}>
      {/* Top Info Bar - Information at a Glance */}
      <div className="card-enhanced" style={{ 
        borderRadius: 'var(--radius-card)',
        fontFamily: 'Georgia, serif',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
        border: '2px solid var(--accent-500)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
            flexWrap: 'wrap'
          }}>
            {/* Next Block */}
            <InfoPill label="Next" type="primary">
              <span style={{
                fontSize: 'var(--font-body)',
                color: '#ffffff',
                fontWeight: 600
              }}>Deep Work Block</span>
              <span style={{
                color: '#93c5fd',
                fontSize: 'var(--font-body)',
                fontWeight: 600
              }}>in 25m</span>
            </InfoPill>
            
            {/* Top 3 Tasks */}
            <InfoPill label="Priority" type="success">
              <span style={{
                fontSize: 'var(--font-body)',
                color: '#ffffff'
              }}>Review PRs • Fix auth bug • Deploy v2</span>
            </InfoPill>
            
            {/* Progress */}
            <ProgressPill label="Today" value={65} type="warning" />
          </div>
          
          <div className="flex items-center gap-4">
            {/* Stress Flag */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success-500" />
              <span className="text-text-muted text-sm">Low Stress</span>
            </div>
            
            {/* Inventory Alert */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-warn-500 animate-pulse" />
              <span className="text-warn-500 text-sm">Low: Magnesium</span>
            </div>
            {/* Management Links */}
            <div className="flex items-center gap-2">
              <Link
                to="/mission-control/manage"
                className="button-responsive laser-sweep flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Manage</span>
              </Link>
              <Link
                to="/mission-control/settings"
                className="button-responsive laser-sweep flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Email and Calendar Widgets */}
      <div className="card-enhanced" style={{
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
        border: '2px solid var(--accent-500)',
        background: 'var(--card-bg)'
      }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--accent-500)' }}>
          📧 Emails & 📅 Calendar
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <EmailWidget />
          <CalendarWidget />
        </div>
      </div>
      
      {/* Quick Action Bar with Slash Syntax */}
      <div className="px-6 py-3 border-b" style={{ borderColor: 'var(--border-default)', background: 'var(--panel-bg)' }}>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Quick add: /task, /block, /meal, /supp or press ⌘K"
            className="input-enhanced flex-1 rounded-lg"
            style={{ fontFamily: 'Georgia, serif' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value) {
                window.dispatchEvent(new CustomEvent('quick-command', {
                  detail: { command: e.currentTarget.value }
                }));
                e.currentTarget.value = '';
              }
            }}
          />
          <button className="button-high-contrast rounded-lg">
            Daily Build
          </button>
          <button className="button-high-contrast rounded-lg" style={{ background: 'var(--accent-500/80)' }}>
            Jump to Now
          </button>
        </div>
      </div>
      
      {/* Main Grid - Responsive 3/2/1 Layout */}
      <div className="mission-control-grid">
        {/* Left: Today Panel - Unified Timeline */}
        <div className="grid-today card-enhanced" style={{ 
          borderRadius: 'var(--radius-card)',
          fontFamily: 'Georgia, serif'
        }}>
          <div className="card-header sticky top-0" style={{ 
            background: 'var(--panel-bg)',
            borderBottom: '1px solid var(--border-default)',
            zIndex: 10
          }}>
            <div className="flex items-center justify-between">
              <h2 className="enhanced-text" style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>Today</h2>
              <div className="flex gap-2">
                <button className="text-xs px-2 py-1 rounded bg-accent-500/20 text-accent-400 border border-accent-500/30">Agenda</button>
                <button className="text-xs px-2 py-1 rounded bg-white/5 text-text-muted">Tasks</button>
                <button className="text-xs px-2 py-1 rounded bg-white/5 text-text-muted">Meals</button>
                <button className="text-xs px-2 py-1 rounded bg-white/5 text-text-muted">Supps</button>
              </div>
            </div>
          </div>
          <div className="card-content">
            <TodayTimeline onItemClick={setSelectedItem} />
          </div>
        </div>
        
        {/* Center: Preview Panel */}
        <div className="grid-preview card-enhanced" style={{ 
          borderRadius: 'var(--radius-card)',
          fontFamily: 'Georgia, serif'
        }}>
          <div className="card-header sticky top-0" style={{ 
            background: 'var(--panel-bg)',
            borderBottom: '1px solid var(--border-default)',
            zIndex: 10
          }}>
            <h2 className="enhanced-text" style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>Preview</h2>
          </div>
          <div className="card-content">
            {selectedItem ? (
              <PreviewDrawer 
                item={selectedItem} 
                onClose={() => setSelectedItem(null)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-center p-8">
                <div>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-mc-surface flex items-center justify-center">
                    <LayoutDashboard className="w-8 h-8 text-mc-text-muted opacity-50" />
                  </div>
                  <p className="text-mc-text-muted">Select an item to preview</p>
                  <p className="text-sm text-mc-text-muted mt-2">
                    Click any agenda item to see details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right: Meta Column - Telemetry & Inventory */}
        <div className="grid-meta space-y-4">
          {/* Telemetry */}
          <div className="card-enhanced" style={{ 
            borderRadius: 'var(--radius-card)',
            fontFamily: 'Georgia, serif',
            padding: 'var(--space-3)'
          }}>
            <TelemetryPanel />
          </div>
          
          {/* Inventory Alerts */}
          <div className="card-responsive" style={{ 
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-default)'
          }}>
            <div className="card-header" style={{ 
              background: 'var(--panel-bg)',
              borderBottom: '1px solid var(--border-default)'
            }}>
              <h2 className="text-lg font-semibold text-crisp">Inventory</h2>
            </div>
            <div className="card-content">
              <InventoryWarnings />
              {/* Show alerts only */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-warn-500/10 border border-warn-500/30">
                  <span className="text-warn-500 text-sm font-medium">Low: Magnesium</span>
                  <button className="text-xs px-2 py-1 bg-warn-500/20 text-warn-500 rounded hover:bg-warn-500/30 transition-colors">
                    Queue Reorder
                  </button>
                </div>
                <div className="text-center py-4 text-text-muted text-sm">
                  All other levels OK
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Action Bar */}
      <div className="mobile-action-bar">
        <button className="button-responsive button-primary">
          Daily Build
        </button>
        <button className="button-responsive">
          Quick Entry
        </button>
        <button className="button-responsive">
          Jump to Now
        </button>
      </div>
      
      {/* Notification Toasts */}
      <NotificationToasts />
    </div>
  );
}