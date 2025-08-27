import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import { useDailyData } from '@/hooks/useDailyData';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useToast } from '@/hooks/use-toast';
import { SettingsModal } from '@/components/SettingsModal';
import { AIGenerateModal, UndoToast } from '@/components/AIGenerateModal';
import { EmailWidget } from '@/components/EmailWidget';
import { CalendarWidget } from '@/components/CalendarWidget';
import type { AgendaItem, TodoItem, FoodItem, SupplementItem } from '@/types/daily';

// Import design tokens and aesthetic enhancements
import '../styles/design-tokens.css';
import '../styles/aesthetic-enhancements.css';
import '../styles/responsive-system.css';
import '../styles/radical-mobile-fix.css';

// Smart defaults for offline mode
const getSmartAgendaDefaults = (): AgendaItem[] => [
  { id: '1', title: 'Morning routine', startTime: '07:00', endTime: '08:00', completed: false },
  { id: '2', title: 'Deep work block', startTime: '09:00', endTime: '11:00', completed: false },
  { id: '3', title: 'Lunch break', startTime: '12:00', endTime: '13:00', completed: false },
  { id: '4', title: 'Afternoon focus', startTime: '14:00', endTime: '16:00', completed: false },
  { id: '5', title: 'Wrap up & review', startTime: '17:00', endTime: '17:30', completed: false }
];

export function MobileDashboardFixed() {
  const [activeSection] = useState('agenda');
  const [showSettings, setShowSettings] = useState(false);
  const [universalInput, setUniversalInput] = useState('');
  const [undoState, setUndoState] = useState<any>(null);
  const [undoTimeLeft, setUndoTimeLeft] = useState(10);
  
  // AI Generate Modal state
  const [aiModalState, setAiModalState] = useState<{
    isOpen: boolean;
    section: string;
    generatedItems: any[];
  }>({ isOpen: false, section: '', generatedItems: [] });
  
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  
  const {
    data,
    addAgendaItem,
    updateAgendaItem,
    deleteAgendaItem,
    toggleAgendaItem,
    setAgendaItems,
    addTodoItem,
    updateTodoItem,
    deleteTodoItem,
    toggleTodoItem,
    setTodoItems,
    addFoodItem,
    updateFoodItem,
    deleteFoodItem,
    setFoodItems,
    foodTotals,
    addSupplementItem,
    deleteSupplementItem,
    toggleSupplementItem,
    setSupplementItems
  } = useDailyData();

  // Quick add states for each section
  const [agendaQuickAdd, setAgendaQuickAdd] = useState({ title: '', start: '09:00', end: '10:00' });
  const [todoQuickAdd, setTodoQuickAdd] = useState({ text: '', priority: 'medium' });
  const [foodQuickAdd, setFoodQuickAdd] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  const [suppQuickAdd, setSuppQuickAdd] = useState({ name: '', dose: '', time: 'AM' });

  // Listen for AI events to update data
  useEffect(() => {
    const handleAIAdd = (event: CustomEvent) => {
      const data = event.detail;
      
      if (data.section === 'agenda') {
        addAgendaItem({
          title: data.title,
          startTime: data.startTime || '09:00',
          endTime: data.endTime || '10:00',
          completed: false
        });
        toast({ title: 'AI added agenda item' });
      } else if (data.section === 'todo') {
        addTodoItem({
          text: data.text || data.title,
          priority: data.priority || 'medium',
          completed: false
        });
        toast({ title: 'AI added task' });
      } else if (data.section === 'food') {
        addFoodItem({
          name: data.name,
          calories: data.calories || 0,
          protein: data.protein || 0,
          carbs: data.carbs || 0,
          fat: data.fat || 0
        });
        toast({ title: 'AI logged food' });
      } else if (data.section === 'supplement') {
        addSupplementItem({
          name: data.name,
          dose: data.dose || '',
          time: data.time || 'AM',
          taken: false
        });
        toast({ title: 'AI added supplement' });
      }
    };

    window.addEventListener('ai-add-item', handleAIAdd as EventListener);
    return () => window.removeEventListener('ai-add-item', handleAIAdd as EventListener);
  }, [addAgendaItem, addTodoItem, addFoodItem, addSupplementItem, toast]);

  // Undo timer
  useEffect(() => {
    if (undoState && undoTimeLeft > 0) {
      const timer = setTimeout(() => setUndoTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (undoTimeLeft === 0) {
      setUndoState(null);
      setUndoTimeLeft(10);
    }
  }, [undoState, undoTimeLeft]);


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
        priority: priority as 'low' | 'medium' | 'high',
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

  // AI Generation handlers
  const generateAgenda = async () => {
    const webhookUrl = localStorage.getItem('webhook_url');
    
    if (!webhookUrl || !isOnline) {
      const generatedItems = getSmartAgendaDefaults();
      setAiModalState({
        isOpen: true,
        section: 'agenda',
        generatedItems
      });
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret': localStorage.getItem('webhook_secret') || ''
        },
        body: JSON.stringify({ section: 'agenda', date: new Date().toISOString() })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.items) {
          const newItems = result.items.map((item: any) => ({
            id: crypto.randomUUID(),
            title: item.title,
            startTime: item.start,
            endTime: item.end,
            completed: false
          }));
          setAiModalState({
            isOpen: true,
            section: 'agenda',
            generatedItems: newItems
          });
        }
      }
    } catch (error) {
      const generatedItems = getSmartAgendaDefaults();
      setAiModalState({
        isOpen: true,
        section: 'agenda',
        generatedItems
      });
    }
  };

  // Handle AI Modal actions
  const handleAIModalReplace = () => {
    const { section, generatedItems } = aiModalState;
    let previousItems: any[] = [];
    
    switch (section) {
      case 'agenda':
        previousItems = [...data.agenda];
        setAgendaItems(generatedItems as AgendaItem[]);
        break;
      case 'todos':
        previousItems = [...data.todos];
        setTodoItems(generatedItems as TodoItem[]);
        break;
      case 'food':
        previousItems = [...data.food];
        setFoodItems(generatedItems as FoodItem[]);
        break;
      case 'supplements':
        previousItems = [...data.supplements];
        setSupplementItems(generatedItems as SupplementItem[]);
        break;
    }
    
    setAiModalState({ isOpen: false, section: '', generatedItems: [] });
    setUndoState({ isVisible: true, previousItems, section });
    setUndoTimeLeft(10);
    toast({ title: 'AI items replaced' });
  };

  const handleAIModalMerge = () => {
    const { section, generatedItems } = aiModalState;
    let previousItems: any[] = [];
    
    switch (section) {
      case 'agenda':
        previousItems = [...data.agenda];
        setAgendaItems([...data.agenda, ...generatedItems as AgendaItem[]]);
        break;
      case 'todos':
        previousItems = [...data.todos];
        setTodoItems([...data.todos, ...generatedItems as TodoItem[]]);
        break;
      case 'food':
        previousItems = [...data.food];
        setFoodItems([...data.food, ...generatedItems as FoodItem[]]);
        break;
      case 'supplements':
        previousItems = [...data.supplements];
        setSupplementItems([...data.supplements, ...generatedItems as SupplementItem[]]);
        break;
    }
    
    setAiModalState({ isOpen: false, section: '', generatedItems: [] });
    setUndoState({ isVisible: true, previousItems, section });
    setUndoTimeLeft(10);
    toast({ title: 'AI items merged' });
  };

  const handleAIModalCancel = () => {
    setAiModalState({ isOpen: false, section: '', generatedItems: [] });
  };

  const handleUndo = () => {
    if (!undoState.section || undoState.previousItems.length === 0) return;
    
    switch (undoState.section) {
      case 'agenda':
        setAgendaItems(undoState.previousItems as AgendaItem[]);
        break;
      case 'todos':
        setTodoItems(undoState.previousItems as TodoItem[]);
        break;
      case 'food':
        setFoodItems(undoState.previousItems as FoodItem[]);
        break;
      case 'supplements':
        setSupplementItems(undoState.previousItems as SupplementItem[]);
        break;
    }
    
    setUndoState(null);
    setUndoTimeLeft(10);
    toast({ title: 'Changes undone' });
  };

  // Haptic feedback for navigation
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // 10ms haptic tick
    }
  };

  return (
    <div className="min-h-screen cyberpunk-grid" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Sticky Header - Mobile First */}
      <header className="sticky top-0 z-50 glass-morphism-enhanced" style={{ 
        height: 'clamp(56px, 12vw, 72px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div className="flex items-center justify-between h-full" style={{
          padding: '0 clamp(12px, 3vw, 16px)',
          width: '100%',
          boxSizing: 'border-box',
          maxWidth: '100vw'
        }}>
          <span className="wave-logo" style={{ 
            fontWeight: 900,
            fontSize: 'clamp(18px, 4vw, 24px)',
            flex: '0 0 auto',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            Agenda
          </span>
          <span className="text-meta" style={{ 
            color: 'var(--color-text-secondary)',
            fontSize: 'clamp(12px, 2.5vw, 14px)',
            flex: '0 1 auto',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {today}
          </span>
          <button 
            onClick={() => setShowSettings(true)}
            className="interactive"
            aria-label="Settings"
            style={{
              padding: 'clamp(8px, 2vw, 12px)',
              fontSize: 'clamp(16px, 4vw, 20px)',
              flex: '0 0 auto',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
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

      {/* Daily Chip - Mobile First */}
      <div style={{ 
        padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div className="pill inline-flex items-center gap-2" style={{
          background: 'var(--accent-500)',
          color: 'white',
          padding: 'clamp(6px, 1.5vw, 10px) clamp(10px, 2.5vw, 16px)',
          fontSize: 'clamp(12px, 2.5vw, 14px)',
          borderRadius: 'clamp(12px, 3vw, 20px)'
        }}>
          <span className="font-semibold">Savage 7</span>
          <span>{todayTheme}</span>
        </div>
        <p className="mt-1" style={{ 
          color: 'var(--color-text-muted)',
          fontSize: 'clamp(11px, 2.2vw, 13px)',
          lineHeight: '1.4',
          marginTop: 'clamp(6px, 1.5vw, 8px)'
        }}>
          {todayTheme === 'Focus' && 'Deep work on your highest priority'}
          {todayTheme === 'Systems' && 'Optimize and document your processes'}
          {todayTheme === 'Growth' && 'Learn something new today'}
          {todayTheme === 'Recovery' && 'Rest is productive - recharge fully'}
          {todayTheme === 'Build' && 'Create something meaningful'}
          {todayTheme === 'Connect' && 'Strengthen your relationships'}
          {todayTheme === 'Reflect' && 'Review your week and plan ahead'}
        </p>
      </div>

      {/* Email and Calendar Widgets - Ultra Simple Mobile */}
      <div className="mobile-widgets-section">
        <h2>📧 Emails & 📅 Calendar</h2>
        <EmailWidget />
        <CalendarWidget />
      </div>

      {/* Main Content - Responsive Grid */}
      <main className="page-grid" style={{ paddingBottom: '80px' }}>
        {/* Agenda Section */}
        <section className="card-responsive">
          <div className="card-header">
            <h2 className="text-h2" style={{ color: 'var(--accent-500)' }}>
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
                onClick={generateAgenda}
                className="pill iridescent-button"
                style={{ 
                  opacity: isOnline ? 1 : 0.5
                }}
                disabled={!isOnline}
              >
                🤖 AI: craft today
              </button>
            </div>
          </div>
          
          <div className="card-accent-stripe" style={{ background: 'var(--accent-500)' }} />
          
          <div className="card-body">
            {/* Quick Add */}
            <div className="quick-add">
              <input 
                type="text"
                placeholder="Add block..."
                className="input-field flex-1"
                value={agendaQuickAdd.title}
                onChange={(e) => setAgendaQuickAdd({...agendaQuickAdd, title: e.target.value})}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && agendaQuickAdd.title) {
                    addAgendaItem({
                      title: agendaQuickAdd.title,
                      startTime: agendaQuickAdd.start,
                      endTime: agendaQuickAdd.end,
                      completed: false
                    });
                    setAgendaQuickAdd({ title: '', start: '09:00', end: '10:00' });
                  }
                }}
              />
              <input 
                type="time" 
                className="input-field w-24" 
                value={agendaQuickAdd.start}
                onChange={(e) => setAgendaQuickAdd({...agendaQuickAdd, start: e.target.value})}
              />
              <input 
                type="time" 
                className="input-field w-24" 
                value={agendaQuickAdd.end}
                onChange={(e) => setAgendaQuickAdd({...agendaQuickAdd, end: e.target.value})}
              />
              <button
                onClick={() => {
                  if (agendaQuickAdd.title) {
                    addAgendaItem({
                      title: agendaQuickAdd.title,
                      startTime: agendaQuickAdd.start,
                      endTime: agendaQuickAdd.end,
                      completed: false
                    });
                    setAgendaQuickAdd({ title: '', start: '09:00', end: '10:00' });
                  }
                }}
                className="shiny-button p-2 rounded-lg"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {/* Agenda Items */}
            {data.agenda.length === 0 ? (
              <div className="text-center py-12">
                <p style={{ color: 'var(--color-text-muted)' }}>
                  Add your first block or type /block below
                </p>
              </div>
            ) : (
              data.agenda.map((item) => (
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
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateAgendaItem(item.id, { title: e.target.value })}
                      className={cn("bg-transparent text-body w-full", item.completed && "completed")}
                      style={{ color: 'var(--color-text-primary)' }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={item.startTime}
                      onChange={(e) => updateAgendaItem(item.id, { startTime: e.target.value })}
                      className="bg-transparent text-meta"
                      style={{ color: 'var(--accent-500)' }}
                    />
                    <span>–</span>
                    <input
                      type="time"
                      value={item.endTime}
                      onChange={(e) => updateAgendaItem(item.id, { endTime: e.target.value })}
                      className="bg-transparent text-meta"
                      style={{ color: 'var(--accent-500)' }}
                    />
                    {item.id === currentBlock?.id && (
                      <span className="now-pill">Now</span>
                    )}
                    <button
                      onClick={() => deleteAgendaItem(item.id)}
                      className="interactive p-1 rounded"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* To-Do Section */}
        <section className="card-stack section-amber neon-card">
          <div className="card-header">
            <h2 className="text-h2" style={{ color: 'var(--color-amber-500)' }}>
              To-Do
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-meta" style={{ color: 'var(--color-text-secondary)' }}>
                {data.todos.filter(t => t.completed).length}/{data.todos.length}
              </span>
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
                value={todoQuickAdd.text}
                onChange={(e) => setTodoQuickAdd({...todoQuickAdd, text: e.target.value})}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && todoQuickAdd.text) {
                    addTodoItem({
                      text: todoQuickAdd.text,
                      priority: todoQuickAdd.priority as 'low' | 'medium' | 'high',
                      completed: false
                    });
                    setTodoQuickAdd({ text: '', priority: 'medium' });
                  }
                }}
              />
              <select
                value={todoQuickAdd.priority}
                onChange={(e) => setTodoQuickAdd({...todoQuickAdd, priority: e.target.value})}
                className="input-field"
              >
                <option value="low">Low</option>
                <option value="medium">Med</option>
                <option value="high">High</option>
              </select>
              <button
                onClick={() => {
                  if (todoQuickAdd.text) {
                    addTodoItem({
                      text: todoQuickAdd.text,
                      priority: todoQuickAdd.priority as 'low' | 'medium' | 'high',
                      completed: false
                    });
                    setTodoQuickAdd({ text: '', priority: 'medium' });
                  }
                }}
                className="shiny-button p-2 rounded-lg"
                style={{ background: 'linear-gradient(135deg, var(--color-amber-500), var(--color-amber-600))' }}
              >
                <Plus className="w-5 h-5" />
              </button>
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
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => updateTodoItem(item.id, { text: e.target.value })}
                  className={cn("flex-1 bg-transparent text-body", item.completed && "completed")}
                  style={{ color: 'var(--color-text-primary)' }}
                />
                <select
                  value={item.priority}
                  onChange={(e) => updateTodoItem(item.id, { priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className={cn(
                    "pill",
                    item.priority === 'high' && "priority-high",
                    item.priority === 'medium' && "priority-medium",
                    item.priority === 'low' && "priority-low"
                  )}
                >
                  <option value="low">Low</option>
                  <option value="medium">Med</option>
                  <option value="high">High</option>
                </select>
                <button
                  onClick={() => deleteTodoItem(item.id)}
                  className="interactive p-1 rounded"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Food Section */}
        <section className="card-stack section-emerald neon-card">
          <div className="card-header">
            <h2 className="text-h2" style={{ color: 'var(--color-emerald-500)' }}>
              Food
            </h2>
          </div>
          
          <div className="card-accent-stripe" style={{ background: 'var(--color-emerald-500)' }} />
          
          {/* Totals Bar */}
          <div className="text-meta" style={{ color: 'var(--color-text-secondary)' }}>
            Totals: {foodTotals.calories} kcal • {foodTotals.protein}P • {foodTotals.carbs}C • {foodTotals.fat}F
          </div>
          
          <div className="card-body">
            {/* Quick Add */}
            <div className="quick-add">
              <input 
                type="text" 
                placeholder="Meal name" 
                className="input-field flex-1"
                value={foodQuickAdd.name}
                onChange={(e) => setFoodQuickAdd({...foodQuickAdd, name: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="kcal" 
                className="input-field w-20"
                value={foodQuickAdd.calories}
                onChange={(e) => setFoodQuickAdd({...foodQuickAdd, calories: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="P" 
                className="input-field w-16"
                value={foodQuickAdd.protein}
                onChange={(e) => setFoodQuickAdd({...foodQuickAdd, protein: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="C" 
                className="input-field w-16"
                value={foodQuickAdd.carbs}
                onChange={(e) => setFoodQuickAdd({...foodQuickAdd, carbs: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="F" 
                className="input-field w-16"
                value={foodQuickAdd.fat}
                onChange={(e) => setFoodQuickAdd({...foodQuickAdd, fat: e.target.value})}
              />
              <button
                onClick={() => {
                  if (foodQuickAdd.name) {
                    addFoodItem({
                      name: foodQuickAdd.name,
                      calories: parseInt(foodQuickAdd.calories) || 0,
                      protein: parseInt(foodQuickAdd.protein) || 0,
                      carbs: parseInt(foodQuickAdd.carbs) || 0,
                      fat: parseInt(foodQuickAdd.fat) || 0
                    });
                    setFoodQuickAdd({ name: '', calories: '', protein: '', carbs: '', fat: '' });
                  }
                }}
                className="shiny-button p-2 rounded-lg"
                style={{ background: 'linear-gradient(135deg, var(--color-emerald-500), var(--color-emerald-600))' }}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {/* Food Items */}
            {data.food.map(item => (
              <div 
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: 'rgba(16, 185, 129, 0.05)' }}
              >
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateFoodItem(item.id, { name: e.target.value })}
                  className="flex-1 bg-transparent text-body"
                  style={{ color: 'var(--color-text-primary)' }}
                />
                <input
                  type="number"
                  value={item.calories || ''}
                  onChange={(e) => updateFoodItem(item.id, { calories: parseInt(e.target.value) || 0 })}
                  className="bg-transparent text-meta w-16 text-right"
                  placeholder="kcal"
                />
                <input
                  type="number"
                  value={item.protein || ''}
                  onChange={(e) => updateFoodItem(item.id, { protein: parseInt(e.target.value) || 0 })}
                  className="bg-transparent text-meta w-12 text-right"
                  placeholder="P"
                />
                <input
                  type="number"
                  value={item.carbs || ''}
                  onChange={(e) => updateFoodItem(item.id, { carbs: parseInt(e.target.value) || 0 })}
                  className="bg-transparent text-meta w-12 text-right"
                  placeholder="C"
                />
                <input
                  type="number"
                  value={item.fat || ''}
                  onChange={(e) => updateFoodItem(item.id, { fat: parseInt(e.target.value) || 0 })}
                  className="bg-transparent text-meta w-12 text-right"
                  placeholder="F"
                />
                <button
                  onClick={() => deleteFoodItem(item.id)}
                  className="interactive p-1 rounded"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Supplements Section */}
        <section className="card-stack section-sky neon-card">
          <div className="card-header">
            <h2 className="text-h2" style={{ color: 'var(--color-sky-500)' }}>
              Supplements
            </h2>
          </div>
          
          <div className="card-accent-stripe" style={{ background: 'var(--color-sky-500)' }} />
          
          <div className="card-body">
            {/* Quick Add */}
            <div className="quick-add">
              <input 
                type="text" 
                placeholder="Supplement name" 
                className="input-field flex-1"
                value={suppQuickAdd.name}
                onChange={(e) => setSuppQuickAdd({...suppQuickAdd, name: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Dose" 
                className="input-field w-24"
                value={suppQuickAdd.dose}
                onChange={(e) => setSuppQuickAdd({...suppQuickAdd, dose: e.target.value})}
              />
              <select 
                className="input-field w-20"
                value={suppQuickAdd.time}
                onChange={(e) => setSuppQuickAdd({...suppQuickAdd, time: e.target.value})}
              >
                <option>AM</option>
                <option>Pre</option>
                <option>Post</option>
                <option>PM</option>
              </select>
              <button
                onClick={() => {
                  if (suppQuickAdd.name) {
                    addSupplementItem({
                      name: suppQuickAdd.name,
                      dose: suppQuickAdd.dose,
                      time: suppQuickAdd.time as 'AM' | 'Pre' | 'Post' | 'PM',
                      taken: false
                    });
                    setSuppQuickAdd({ name: '', dose: '', time: 'AM' });
                  }
                }}
                className="shiny-button p-2 rounded-lg"
                style={{ background: 'linear-gradient(135deg, var(--color-sky-500), var(--color-sky-600))' }}
              >
                <Plus className="w-5 h-5" />
              </button>
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
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded-lg"
                        style={{ 
                          background: item.taken 
                            ? 'var(--color-sky-500)' 
                            : 'rgba(14, 165, 233, 0.1)',
                          border: '1px solid rgba(14, 165, 233, 0.3)'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={item.taken}
                          onChange={() => toggleSupplementItem(item.id)}
                          className="w-4 h-4"
                        />
                        <span
                          className={cn("text-meta", item.taken && "completed")}
                          style={{ color: item.taken ? 'white' : 'var(--color-sky-500)' }}
                        >
                          {item.name} • {item.dose}
                        </span>
                        <button
                          onClick={() => deleteSupplementItem(item.id)}
                          className="interactive p-0.5 rounded"
                          style={{ color: item.taken ? 'white' : 'var(--color-text-muted)' }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
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
        <div className="flex items-center gap-2 p-3 rounded-full glass-morphism-enhanced gradient-border">
          <input
            id="universal-capture-input"
            type="text"
            value={universalInput}
            onChange={(e) => setUniversalInput(e.target.value)}
            onKeyDown={handleUniversalCapture}
            placeholder="Quick add anything... /task /block /meal /supp (N or /)" 
            className="flex-1 bg-transparent text-body neon-input rounded-full px-3"
            style={{ border: 'none' }}
          />
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-40">
        <div className="flex items-center justify-around h-full">
          {[
            { id: 'agenda', label: 'Agenda', icon: '📅', color: 'var(--accent-500)' },
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

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      {/* AI Generate Modal */}
      <AIGenerateModal
        isOpen={aiModalState.isOpen}
        section={aiModalState.section}
        currentItems={
          aiModalState.section === 'agenda' ? data.agenda :
          aiModalState.section === 'todos' ? data.todos :
          aiModalState.section === 'food' ? data.food :
          data.supplements
        }
        generatedItems={aiModalState.generatedItems}
        onReplace={handleAIModalReplace}
        onMerge={handleAIModalMerge}
        onCancel={handleAIModalCancel}
      />
      
      {/* Undo Toast */}
      <UndoToast
        isVisible={undoState?.isVisible}
        onUndo={handleUndo}
        timeLeft={undoTimeLeft}
      />
    </div>
  );
}