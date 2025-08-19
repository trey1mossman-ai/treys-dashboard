import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useDailyData } from '@/hooks/useDailyData';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useToast } from '@/hooks/use-toast';
import type { AgendaItem } from '@/types/daily';

// Import design tokens
import '../styles/design-tokens.css';

// Smart defaults for offline mode
const getSmartAgendaDefaults = (): AgendaItem[] => [
  { id: '1', title: 'Morning routine', startTime: '07:00', endTime: '08:00', completed: false },
  { id: '2', title: 'Deep work block', startTime: '09:00', endTime: '11:00', completed: false },
  { id: '3', title: 'Lunch break', startTime: '12:00', endTime: '13:00', completed: false },
  { id: '4', title: 'Afternoon focus', startTime: '14:00', endTime: '16:00', completed: false },
  { id: '5', title: 'Wrap up & review', startTime: '17:00', endTime: '17:30', completed: false }
];

export function MobileDashboardV2() {
  const [activeSection] = useState('agenda');
  const [universalInput, setUniversalInput] = useState('');
  const [undoState, setUndoState] = useState<any>(null);
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  
  const {
    data,
    addAgendaItem,
    toggleAgendaItem,
    setAgendaItems,
    addTodoItem,
    toggleTodoItem,
    addFoodItem,
    foodTotals,
    addSupplementItem,
    toggleSupplementItem
  } = useDailyData();

  // Get today's date
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  // Theme of the day (Savage 7)
  const themes = ['Focus', 'Systems', 'Growth', 'Recovery', 'Build', 'Connect', 'Reflect'];
  const themeIndex = new Date().getDay();
  const todayTheme = themes[themeIndex];

  // Find current agenda block
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const currentBlock = data.agenda.find(item => 
    item.startTime <= currentTime && item.endTime > currentTime
  );

  // Parse Universal Capture commands
  const parseCommand = (input: string) => {
    const trimmed = input.trim();
    
    // Block command: /block 13:45-14:30 Deep work
    if (trimmed.startsWith('/block ')) {
      const match = trimmed.match(/\/block\s+(\d{1,2}):?(\d{2})-(\d{1,2}):?(\d{2})\s+(.+)/);
      if (match) {
        addAgendaItem({
          title: match[5],
          startTime: `${match[1].padStart(2, '0')}:${match[2]}`,
          endTime: `${match[3].padStart(2, '0')}:${match[4]}`,
          completed: false
        });
        toast({ title: 'Block added' });
        return true;
      }
    }
    
    // Task command: /task Send proposal by 4p
    if (trimmed.startsWith('/task ')) {
      const text = trimmed.slice(6);
      const priority = text.includes('!') ? 'high' : 'medium';
      addTodoItem({
        text: text.replace('!', '').trim(),
        priority,
        completed: false
      });
      toast({ title: 'Task added' });
      return true;
    }
    
    // Meal command: /meal Salmon bowl 650 45P 55C 20F
    if (trimmed.startsWith('/meal ')) {
      const match = trimmed.match(/\/meal\s+(.+?)\s+(\d+)(?:\s+(\d+)P)?(?:\s+(\d+)C)?(?:\s+(\d+)F)?/i);
      if (match) {
        addFoodItem({
          name: match[1],
          calories: parseInt(match[2]),
          protein: match[3] ? parseInt(match[3]) : undefined,
          carbs: match[4] ? parseInt(match[4]) : undefined,
          fat: match[5] ? parseInt(match[5]) : undefined
        });
        toast({ title: 'Meal logged' });
        return true;
      }
    }
    
    // Supplement command: /supp Creatine 5g AM
    if (trimmed.startsWith('/supp ')) {
      const match = trimmed.match(/\/supp\s+(.+?)\s+(.+?)\s+(AM|Pre|Post|PM)/i);
      if (match) {
        addSupplementItem({
          name: match[1],
          dose: match[2],
          time: match[3] as 'AM' | 'Pre' | 'Post' | 'PM',
          taken: false
        });
        toast({ title: 'Supplement added' });
        return true;
      }
    }
    
    // Default: detect time for agenda, otherwise todo
    const timeMatch = trimmed.match(/(\d{1,2}):?(\d{2})/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const min = timeMatch[2];
      addAgendaItem({
        title: trimmed,
        startTime: `${hour.toString().padStart(2, '0')}:${min}`,
        endTime: `${(hour + 1).toString().padStart(2, '0')}:${min}`,
        completed: false
      });
      toast({ title: 'Block added' });
    } else if (trimmed) {
      addTodoItem({
        text: trimmed,
        priority: 'medium',
        completed: false
      });
      toast({ title: 'Task added' });
    }
    
    return true;
  };

  // Handle Universal Capture submit
  const handleUniversalCapture = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && universalInput.trim()) {
      parseCommand(universalInput);
      setUniversalInput('');
    }
  };

  // AI Generation with preview
  const handleAIGenerate = async (section: string) => {
    const webhookUrl = localStorage.getItem('webhook_url');
    
    if (!webhookUrl || !isOnline) {
      // Load smart defaults
      const defaults = section === 'agenda' ? getSmartAgendaDefaults() : [];
      
      // Show preview drawer with Replace/Merge options
      toast({ 
        title: 'AI unavailable', 
        description: 'Loaded smart defaults'
      });
      
      if (section === 'agenda') {
        setAgendaItems(defaults as AgendaItem[]);
      }
      return;
    }

    // Call webhook and handle response
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret': localStorage.getItem('webhook_secret') || ''
        },
        body: JSON.stringify({ section, date: new Date().toISOString() })
      });

      if (response.ok) {
        // Show preview with Replace/Merge toggle
        toast({ title: `AI crafted ${section}` });
      }
    } catch (error) {
      toast({ title: 'AI error', variant: 'destructive' });
    }
  };

  // Haptic feedback for navigation
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // 10ms haptic tick
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Sticky Header */}
      <header className="sticky top-0 z-50" style={{ 
        height: 'var(--header-height)',
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div className="flex items-center justify-between px-4 h-full">
          <span className="text-h2" style={{ color: 'var(--color-text-primary)' }}>
            Agenda
          </span>
          <span className="text-meta" style={{ color: 'var(--color-text-secondary)' }}>
            {today}
          </span>
          <button 
            onClick={() => {
              // TODO: Open settings
              toast({ title: 'Settings coming soon' });
            }}
            className="interactive p-2"
            aria-label="Settings"
          >
            ⋯
          </button>
        </div>
        
        {/* Offline Banner */}
        {!isOnline && (
          <div className="offline-banner">
            Offline - AI features disabled
          </div>
        )}
      </header>

      {/* Daily Chip */}
      <div className="px-4 py-2">
        <div className="pill inline-flex items-center gap-2" style={{
          background: 'var(--color-violet-600)',
          color: 'white'
        }}>
          <span className="text-meta font-semibold">Savage 7</span>
          <span className="text-meta">{todayTheme}</span>
        </div>
        <p className="text-meta mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {todayTheme === 'Focus' && 'Deep work on your highest priority'}
          {todayTheme === 'Systems' && 'Optimize and document your processes'}
          {todayTheme === 'Growth' && 'Learn something new today'}
          {todayTheme === 'Recovery' && 'Rest is productive - recharge fully'}
          {todayTheme === 'Build' && 'Create something meaningful'}
          {todayTheme === 'Connect' && 'Strengthen your relationships'}
          {todayTheme === 'Reflect' && 'Review your week and plan ahead'}
        </p>
      </div>

      {/* Main Content */}
      <main className="px-4 pb-32 space-y-6">
        {/* Agenda Section */}
        <section className="card-stack section-violet">
          <div className="card-header">
            <h2 className="text-h2" style={{ color: 'var(--color-violet-600)' }}>
              Agenda
            </h2>
            <div className="flex items-center gap-2">
              {currentBlock && (
                <button 
                  className="pill interactive"
                  style={{ background: 'var(--color-violet-600)', color: 'white' }}
                  onClick={() => {
                    const element = document.getElementById(`agenda-${currentBlock.id}`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                >
                  Jump to Now
                </button>
              )}
              <button 
                onClick={() => handleAIGenerate('agenda')}
                className="pill interactive"
                style={{ 
                  background: 'var(--color-violet-600)', 
                  color: 'white',
                  opacity: isOnline ? 1 : 0.5
                }}
                disabled={!isOnline}
              >
                🤖 AI: craft today
              </button>
            </div>
          </div>
          
          <div className="card-accent-stripe" style={{ background: 'var(--color-violet-600)' }} />
          
          <div className="card-body">
            {/* Quick Add */}
            <div className="quick-add">
              <input 
                type="text"
                placeholder="Add block..."
                className="input-field flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Handle quick add
                  }
                }}
              />
              <input type="time" className="input-field w-24" defaultValue="09:00" />
              <input type="time" className="input-field w-24" defaultValue="10:00" />
            </div>
            
            {/* Agenda Items */}
            {data.agenda.length === 0 ? (
              <div className="text-center py-12">
                <p style={{ color: 'var(--color-text-muted)' }}>
                  Add your first block or type /block below
                </p>
              </div>
            ) : (
              data.agenda.map(item => (
                <div 
                  key={item.id}
                  id={`agenda-${item.id}`}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg",
                    item.id === currentBlock?.id && "now-line"
                  )}
                  style={{ background: 'rgba(124, 58, 237, 0.05)' }}
                >
                  <input 
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleAgendaItem(item.id)}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <div className={cn("text-body", item.completed && "completed")}>
                      {item.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="pill" style={{ 
                      background: 'rgba(124, 58, 237, 0.1)',
                      color: 'var(--color-violet-600)'
                    }}>
                      {item.startTime}–{item.endTime}
                    </span>
                    {item.id === currentBlock?.id && (
                      <span className="now-pill">Now</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* To-Do Section */}
        <section className="card-stack section-amber">
          <div className="card-header">
            <h2 className="text-h2" style={{ color: 'var(--color-amber-500)' }}>
              To-Do
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-meta" style={{ color: 'var(--color-text-secondary)' }}>
                {data.todos.filter(t => t.completed).length}/{data.todos.length}
              </span>
              <button 
                onClick={() => handleAIGenerate('todos')}
                className="pill interactive"
                style={{ 
                  background: 'var(--color-amber-500)', 
                  color: 'var(--color-bg)',
                  opacity: isOnline ? 1 : 0.5
                }}
                disabled={!isOnline}
              >
                🤖 AI: craft today
              </button>
            </div>
          </div>
          
          <div className="card-accent-stripe" style={{ background: 'var(--color-amber-500)' }} />
          
          <div className="card-body">
            {/* Quick Add */}
            <div className="quick-add">
              <input 
                type="text"
                placeholder="Add task..."
                className="input-field flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    addTodoItem({
                      text: e.currentTarget.value,
                      priority: 'medium',
                      completed: false
                    });
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
            
            {/* Todo Items */}
            {data.todos.map(item => (
              <div 
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: 'rgba(245, 158, 11, 0.05)' }}
              >
                <input 
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => toggleTodoItem(item.id)}
                  className="w-5 h-5"
                />
                <div className={cn("flex-1 text-body", item.completed && "completed")}>
                  {item.text}
                </div>
                <span className={cn(
                  "pill",
                  item.priority === 'high' && "priority-high",
                  item.priority === 'medium' && "priority-medium",
                  item.priority === 'low' && "priority-low"
                )}>
                  {item.priority}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Food Section */}
        <section className="card-stack section-emerald">
          <div className="card-header">
            <h2 className="text-h2" style={{ color: 'var(--color-emerald-500)' }}>
              Food
            </h2>
            <button 
              onClick={() => handleAIGenerate('food')}
              className="pill interactive"
              style={{ 
                background: 'var(--color-emerald-500)', 
                color: 'white',
                opacity: isOnline ? 1 : 0.5
              }}
              disabled={!isOnline}
            >
              🤖 AI: craft today
            </button>
          </div>
          
          <div className="card-accent-stripe" style={{ background: 'var(--color-emerald-500)' }} />
          
          {/* Totals Bar */}
          <div className="text-meta" style={{ color: 'var(--color-text-secondary)' }}>
            Totals: {foodTotals.calories} kcal • {foodTotals.protein}P • {foodTotals.carbs}C • {foodTotals.fat}F
          </div>
          
          <div className="card-body">
            {/* Quick Add */}
            <div className="quick-add">
              <input type="text" placeholder="Meal name" className="input-field flex-1" />
              <input type="number" placeholder="kcal" className="input-field w-20" />
              <input type="number" placeholder="P" className="input-field w-16" />
              <input type="number" placeholder="C" className="input-field w-16" />
              <input type="number" placeholder="F" className="input-field w-16" />
            </div>
            
            {/* Food Items */}
            {data.food.map(item => (
              <div 
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: 'rgba(16, 185, 129, 0.05)' }}
              >
                <div className="flex-1 text-body">{item.name}</div>
                <div className="flex gap-2">
                  <span className="text-meta">{item.calories}</span>
                  <span className="text-meta">{item.protein}P</span>
                  <span className="text-meta">{item.carbs}C</span>
                  <span className="text-meta">{item.fat}F</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Supplements Section */}
        <section className="card-stack section-sky">
          <div className="card-header">
            <h2 className="text-h2" style={{ color: 'var(--color-sky-500)' }}>
              Supplements
            </h2>
            <button 
              onClick={() => handleAIGenerate('supplements')}
              className="pill interactive"
              style={{ 
                background: 'var(--color-sky-500)', 
                color: 'white',
                opacity: isOnline ? 1 : 0.5
              }}
              disabled={!isOnline}
            >
              🤖 AI: craft today
            </button>
          </div>
          
          <div className="card-accent-stripe" style={{ background: 'var(--color-sky-500)' }} />
          
          <div className="card-body">
            {/* Quick Add */}
            <div className="quick-add">
              <input type="text" placeholder="Supplement name" className="input-field flex-1" />
              <input type="text" placeholder="Dose" className="input-field w-24" />
              <select className="input-field w-20">
                <option>AM</option>
                <option>Pre</option>
                <option>Post</option>
                <option>PM</option>
              </select>
            </div>
            
            {/* Supplement Lanes */}
            {['AM', 'Pre', 'Post', 'PM'].map(time => {
              const items = data.supplements.filter(s => s.time === time);
              if (items.length === 0) return null;
              
              return (
                <div key={time}>
                  <div className="text-meta mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    {time}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => toggleSupplementItem(item.id)}
                        className={cn(
                          "pill interactive",
                          item.taken && "completed"
                        )}
                        style={{ 
                          background: item.taken 
                            ? 'var(--color-sky-500)' 
                            : 'rgba(14, 165, 233, 0.1)',
                          color: item.taken 
                            ? 'white' 
                            : 'var(--color-sky-500)'
                        }}
                      >
                        {item.name} • {item.dose}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Universal Capture */}
      <div className="fixed left-4 right-4 z-40" style={{ 
        bottom: `calc(var(--nav-height) + env(safe-area-inset-bottom) + 16px)` 
      }}>
        <div className="flex items-center gap-2 p-3 rounded-full" style={{
          background: 'var(--color-surface)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <input
            type="text"
            value={universalInput}
            onChange={(e) => setUniversalInput(e.target.value)}
            onKeyDown={handleUniversalCapture}
            placeholder="Quick add anything... /task /block /meal /supp"
            className="flex-1 bg-transparent text-body"
            style={{ color: 'var(--color-text-primary)' }}
          />
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-40">
        <div className="flex items-center justify-around h-full">
          {[
            { id: 'agenda', label: 'Agenda', icon: '📅', color: 'var(--color-violet-600)' },
            { id: 'todos', label: 'To-Do', icon: '✓', color: 'var(--color-amber-500)' },
            { id: 'food', label: 'Food', icon: '🍽', color: 'var(--color-emerald-500)' },
            { id: 'supplements', label: 'Supps', icon: '💊', color: 'var(--color-sky-500)' }
          ].map(section => (
            <button
              key={section.id}
              onClick={() => {
                triggerHaptic();
                const element = document.querySelector(`.section-${section.id === 'todos' ? 'amber' : section.id === 'supplements' ? 'sky' : section.id}`);
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="interactive haptic-button flex flex-col items-center gap-1 p-2"
              style={{
                color: activeSection === section.id ? section.color : 'var(--color-text-muted)'
              }}
            >
              <span className="text-h2">{section.icon}</span>
              <span className="text-meta">{section.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Undo Snackbar */}
      {undoState && (
        <div className="undo-snackbar">
          <span className="text-body">{undoState.message}</span>
          <button 
            onClick={() => {
              // Handle undo
              setUndoState(null);
            }}
            className="pill interactive ml-3"
            style={{ background: 'var(--color-text-primary)', color: 'var(--color-bg)' }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}