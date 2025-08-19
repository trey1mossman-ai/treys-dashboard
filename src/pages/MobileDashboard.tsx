import { useState, useEffect } from 'react';
import { MobileHeader } from '@/components/MobileHeader';
import { BottomNav } from '@/components/BottomNav';
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
  // const [showSettings, setShowSettings] = useState(false); // TODO: implement settings modal
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  
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

  // AI generation handlers
  const generateAgenda = async () => {
    const webhookUrl = localStorage.getItem('webhook_url');
    
    if (!webhookUrl || !isOnline) {
      // Use smart defaults
      setAgendaItems(getSmartAgendaDefaults());
      toast({
        title: 'Smart defaults loaded',
        description: isOnline ? 'Configure webhook in Settings for AI generation' : 'Offline - using smart defaults'
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
        setAgendaItems(newItems);
        toast({ title: 'AI agenda generated successfully' });
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      setAgendaItems(getSmartAgendaDefaults());
      toast({
        title: 'AI unavailable',
        description: 'Loaded smart defaults instead',
        variant: 'destructive'
      });
    }
  };

  const generateTodos = async () => {
    const webhookUrl = localStorage.getItem('webhook_url');
    
    if (!webhookUrl || !isOnline) {
      setTodoItems(getSmartTodoDefaults());
      toast({
        title: 'Smart defaults loaded',
        description: isOnline ? 'Configure webhook in Settings for AI generation' : 'Offline - using smart defaults'
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
        setTodoItems(newItems);
        toast({ title: 'AI todos generated successfully' });
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      setTodoItems(getSmartTodoDefaults());
      toast({
        title: 'AI unavailable',
        description: 'Loaded smart defaults instead',
        variant: 'destructive'
      });
    }
  };

  const generateFood = async () => {
    const webhookUrl = localStorage.getItem('webhook_url');
    
    if (!webhookUrl || !isOnline) {
      setFoodItems(getSmartFoodDefaults());
      toast({
        title: 'Smart defaults loaded',
        description: isOnline ? 'Configure webhook in Settings for AI generation' : 'Offline - using smart defaults'
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
        setFoodItems(newItems);
        toast({ title: 'AI meal plan generated successfully' });
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      setFoodItems(getSmartFoodDefaults());
      toast({
        title: 'AI unavailable',
        description: 'Loaded smart defaults instead',
        variant: 'destructive'
      });
    }
  };

  const generateSupplements = async () => {
    const webhookUrl = localStorage.getItem('webhook_url');
    
    if (!webhookUrl || !isOnline) {
      setSupplementItems(getSmartSupplementDefaults());
      toast({
        title: 'Smart defaults loaded',
        description: isOnline ? 'Configure webhook in Settings for AI generation' : 'Offline - using smart defaults'
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
        setSupplementItems(newItems);
        toast({ title: 'AI supplement stack generated successfully' });
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      setSupplementItems(getSmartSupplementDefaults());
      toast({
        title: 'AI unavailable',
        description: 'Loaded smart defaults instead',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader onSettingsClick={() => {/* TODO: implement settings modal */}} />
      
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
      
      <BottomNav 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      
      {/* Settings modal would go here */}
    </div>
  );
}