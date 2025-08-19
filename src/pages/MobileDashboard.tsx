import { useState, useEffect, useRef } from 'react';
import { MobileHeader } from '@/components/MobileHeader';
import { BottomNav } from '@/components/BottomNav';
import { UniversalCapture } from '@/components/UniversalCapture';
import { ThemeOfDay } from '@/components/ThemeOfDay';
import { FocusMode, FocusModeToggle } from '@/components/FocusMode';
import { AIGenerateModal, UndoToast } from '@/components/AIGenerateModal';
import { SettingsModal } from '@/components/SettingsModal';
import { AgendaSection } from '@/features/agenda/AgendaSection';
import { TodoSection } from '@/features/todos/TodoSection';
import { FoodSection } from '@/features/food/FoodSection';
import { SupplementsSection } from '@/features/supplements/SupplementsSection';
import { useDailyData } from '@/hooks/useDailyData';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useToast } from '@/hooks/use-toast';
import type { AgendaItem, TodoItem, FoodItem, SupplementItem } from '@/types/daily';

// Smart defaults for offline mode
const getSmartAgendaDefaults = (): AgendaItem[] => [
  { id: '1', title: 'Morning routine', startTime: '07:00', endTime: '08:00', completed: false },
  { id: '2', title: 'Deep work block', startTime: '09:00', endTime: '11:00', completed: false },
  { id: '3', title: 'Lunch break', startTime: '12:00', endTime: '13:00', completed: false },
  { id: '4', title: 'Afternoon focus', startTime: '14:00', endTime: '16:00', completed: false },
  { id: '5', title: 'Wrap up & review', startTime: '17:00', endTime: '17:30', completed: false }
];

const getSmartTodoDefaults = (): TodoItem[] => [
  { id: '1', text: 'Review daily priorities', priority: 'high', completed: false },
  { id: '2', text: 'Check emails', priority: 'medium', completed: false },
  { id: '3', text: 'Update project status', priority: 'medium', completed: false }
];

const getSmartFoodDefaults = (): FoodItem[] => [
  { id: '1', name: 'Breakfast', calories: 400, protein: 25, carbs: 45, fat: 15 },
  { id: '2', name: 'Lunch', calories: 600, protein: 40, carbs: 60, fat: 20 },
  { id: '3', name: 'Dinner', calories: 700, protein: 45, carbs: 70, fat: 25 }
];

const getSmartSupplementDefaults = (): SupplementItem[] => [
  { id: '1', name: 'Multivitamin', dose: '1 cap', time: 'AM', taken: false },
  { id: '2', name: 'Vitamin D', dose: '5000 IU', time: 'AM', taken: false },
  { id: '3', name: 'Magnesium', dose: '400mg', time: 'PM', taken: false }
];

export function MobileDashboard() {
  const [activeSection, setActiveSection] = useState('agenda');
  const [focusMode, setFocusMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  
  // AI Generate Modal state
  const [aiModalState, setAiModalState] = useState<{
    isOpen: boolean;
    section: string;
    generatedItems: any[];
  }>({ isOpen: false, section: '', generatedItems: [] });
  
  // Undo state
  const [undoState, setUndoState] = useState<{
    isVisible: boolean;
    previousItems: any[];
    section: string;
  }>({ isVisible: false, previousItems: [], section: '' });
  const [undoTimeLeft, setUndoTimeLeft] = useState(10);
  const undoTimerRef = useRef<NodeJS.Timeout>();
  
  const {
    data,
    // Agenda
    addAgendaItem,
    updateAgendaItem,
    deleteAgendaItem,
    toggleAgendaItem,
    setAgendaItems,
    // Todo
    addTodoItem,
    updateTodoItem,
    deleteTodoItem,
    toggleTodoItem,
    reorderTodos,
    setTodoItems,
    // Food
    addFoodItem,
    updateFoodItem,
    deleteFoodItem,
    setFoodItems,
    foodTotals,
    // Supplements
    addSupplementItem,
    updateSupplementItem,
    deleteSupplementItem,
    toggleSupplementItem,
    setSupplementItems
  } = useDailyData();

  // Detect active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['agenda', 'todos', 'food', 'supplements'];
      const scrollPosition = window.scrollY + 100;
      
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Undo timer effect
  useEffect(() => {
    if (undoState.isVisible && undoTimeLeft > 0) {
      undoTimerRef.current = setTimeout(() => {
        setUndoTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (undoTimeLeft === 0) {
      setUndoState({ isVisible: false, previousItems: [], section: '' });
    }
    
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, [undoState.isVisible, undoTimeLeft]);

  // Handle undo action
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
    
    setUndoState({ isVisible: false, previousItems: [], section: '' });
    setUndoTimeLeft(10);
    toast({ title: 'Changes undone' });
  };

  // Helper function to handle AI modal actions
  const handleAIModalReplace = () => {
    const { section, generatedItems } = aiModalState;
    
    // Store current items for undo
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
    
    // Store current items for undo
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

  // AI generation handlers
  const generateAgenda = async () => {
    const webhookUrl = localStorage.getItem('webhook_url');
    
    if (!webhookUrl || !isOnline) {
      // Use smart defaults and show modal
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
        body: JSON.stringify({
          section: 'agenda',
          date: new Date().toISOString().slice(0, 10),
          context: {}
        })
      });

      if (!response.ok) throw new Error('Webhook request failed');
      
      const result = await response.json();
      if (result.items && Array.isArray(result.items)) {
        const newItems = result.items.map((item: any) => ({
          id: crypto.randomUUID(),
          title: item.title || 'Untitled',
          startTime: item.start || '09:00',
          endTime: item.end || '10:00',
          completed: false
        }));
        setAiModalState({
          isOpen: true,
          section: 'agenda',
          generatedItems: newItems
        });
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      const generatedItems = getSmartAgendaDefaults();
      setAiModalState({
        isOpen: true,
        section: 'agenda',
        generatedItems
      });
    }
  };

  const generateTodos = async () => {
    const webhookUrl = localStorage.getItem('webhook_url');
    
    if (!webhookUrl || !isOnline) {
      const generatedItems = getSmartTodoDefaults();
      setAiModalState({
        isOpen: true,
        section: 'todos',
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
        body: JSON.stringify({
          section: 'todos',
          date: new Date().toISOString().slice(0, 10),
          context: {}
        })
      });

      if (!response.ok) throw new Error('Webhook request failed');
      
      const result = await response.json();
      if (result.items && Array.isArray(result.items)) {
        const priorityMap = { 1: 'low', 2: 'medium', 3: 'high' } as const;
        const newItems = result.items.map((item: any) => ({
          id: crypto.randomUUID(),
          text: item.text || 'Untitled task',
          priority: priorityMap[item.priority as keyof typeof priorityMap] || 'medium',
          completed: false
        }));
        setAiModalState({
          isOpen: true,
          section: 'todos',
          generatedItems: newItems
        });
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      const generatedItems = getSmartTodoDefaults();
      setAiModalState({
        isOpen: true,
        section: 'todos',
        generatedItems
      });
    }
  };

  const generateFood = async () => {
    const webhookUrl = localStorage.getItem('webhook_url');
    
    if (!webhookUrl || !isOnline) {
      const generatedItems = getSmartFoodDefaults();
      setAiModalState({
        isOpen: true,
        section: 'food',
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
        body: JSON.stringify({
          section: 'food',
          date: new Date().toISOString().slice(0, 10),
          context: {}
        })
      });

      if (!response.ok) throw new Error('Webhook request failed');
      
      const result = await response.json();
      if (result.items && Array.isArray(result.items)) {
        const newItems = result.items.map((item: any) => ({
          id: crypto.randomUUID(),
          name: item.name || 'Meal',
          calories: item.cals,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat
        }));
        setAiModalState({
          isOpen: true,
          section: 'food',
          generatedItems: newItems
        });
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      const generatedItems = getSmartFoodDefaults();
      setAiModalState({
        isOpen: true,
        section: 'food',
        generatedItems
      });
    }
  };

  const generateSupplements = async () => {
    const webhookUrl = localStorage.getItem('webhook_url');
    
    if (!webhookUrl || !isOnline) {
      const generatedItems = getSmartSupplementDefaults();
      setAiModalState({
        isOpen: true,
        section: 'supplements',
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
        body: JSON.stringify({
          section: 'supplements',
          date: new Date().toISOString().slice(0, 10),
          context: {}
        })
      });

      if (!response.ok) throw new Error('Webhook request failed');
      
      const result = await response.json();
      if (result.items && Array.isArray(result.items)) {
        const newItems = result.items.map((item: any) => ({
          id: crypto.randomUUID(),
          name: item.name || 'Supplement',
          dose: item.dose,
          time: item.time || 'AM',
          taken: false
        }));
        setAiModalState({
          isOpen: true,
          section: 'supplements',
          generatedItems: newItems
        });
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      const generatedItems = getSmartSupplementDefaults();
      setAiModalState({
        isOpen: true,
        section: 'supplements',
        generatedItems
      });
    }
  };

  // Find current and next agenda blocks
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const currentBlock = data.agenda.find(item => 
    item.startTime <= currentTime && item.endTime > currentTime
  );
  const currentBlockIndex = data.agenda.findIndex(item => item.id === currentBlock?.id);
  const nextBlock = currentBlockIndex >= 0 && currentBlockIndex < data.agenda.length - 1
    ? data.agenda[currentBlockIndex + 1]
    : null;

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader onSettingsClick={() => setShowSettings(true)} />
      
      {/* Theme of the day and Focus Mode toggle */}
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <ThemeOfDay />
        {currentBlock && (
          <FocusModeToggle 
            isActive={focusMode} 
            onToggle={() => setFocusMode(!focusMode)} 
          />
        )}
      </div>
      
      {/* Focus Mode overlay */}
      {focusMode && currentBlock && (
        <FocusMode 
          currentBlock={currentBlock}
          nextBlock={nextBlock}
          onClose={() => setFocusMode(false)}
        />
      )}
      
      <main className="container mx-auto px-4 py-6 space-y-8 pb-24">
        <AgendaSection
          items={data.agenda}
          onAdd={addAgendaItem}
          onUpdate={updateAgendaItem}
          onDelete={deleteAgendaItem}
          onToggle={toggleAgendaItem}
          onAIGenerate={generateAgenda}
          isOnline={isOnline}
        />
        
        <TodoSection
          items={data.todos}
          onAdd={addTodoItem}
          onUpdate={updateTodoItem}
          onDelete={deleteTodoItem}
          onToggle={toggleTodoItem}
          onReorder={reorderTodos}
          onAIGenerate={generateTodos}
          isOnline={isOnline}
        />
        
        <FoodSection
          items={data.food}
          totals={foodTotals}
          onAdd={addFoodItem}
          onUpdate={updateFoodItem}
          onDelete={deleteFoodItem}
          onAIGenerate={generateFood}
          isOnline={isOnline}
        />
        
        <SupplementsSection
          items={data.supplements}
          onAdd={addSupplementItem}
          onUpdate={updateSupplementItem}
          onDelete={deleteSupplementItem}
          onToggle={toggleSupplementItem}
          onAIGenerate={generateSupplements}
          isOnline={isOnline}
        />
      </main>
      
      {/* Universal Capture pill */}
      <UniversalCapture
        onAddAgenda={(item) => addAgendaItem({ ...item, completed: false })}
        onAddTodo={(item) => addTodoItem({ ...item, completed: false })}
        onAddFood={addFoodItem}
        onAddSupplement={(item) => addSupplementItem({ ...item, taken: false })}
      />
      
      <BottomNav 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
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
        isVisible={undoState.isVisible}
        onUndo={handleUndo}
        timeLeft={undoTimeLeft}
      />
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  );
}