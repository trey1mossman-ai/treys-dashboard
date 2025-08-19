import { useState, useEffect, useCallback } from 'react';
import type { DayData, AgendaItem, TodoItem, FoodItem, SupplementItem } from '@/types/daily';

const getTodayString = () => new Date().toISOString().slice(0, 10);

const getStorageKey = (date: string) => `day:${date}`;

const defaultDayData = (date: string): DayData => ({
  date,
  agenda: [],
  todos: [],
  food: [],
  supplements: []
});

export function useDailyData(date?: string) {
  const targetDate = date || getTodayString();
  const [data, setData] = useState<DayData>(() => {
    const key = getStorageKey(targetDate);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        console.error('Failed to parse stored data');
      }
    }
    return defaultDayData(targetDate);
  });

  // Save to localStorage whenever data changes
  useEffect(() => {
    const key = getStorageKey(targetDate);
    localStorage.setItem(key, JSON.stringify(data));
  }, [data, targetDate]);

  // Agenda operations
  const addAgendaItem = useCallback((item: Omit<AgendaItem, 'id'>) => {
    setData(prev => ({
      ...prev,
      agenda: [...prev.agenda, { ...item, id: crypto.randomUUID() }]
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
    }));
  }, []);

  const updateAgendaItem = useCallback((id: string, updates: Partial<AgendaItem>) => {
    setData(prev => ({
      ...prev,
      agenda: prev.agenda.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ).sort((a, b) => a.startTime.localeCompare(b.startTime))
    }));
  }, []);

  const deleteAgendaItem = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      agenda: prev.agenda.filter(item => item.id !== id)
    }));
  }, []);

  const toggleAgendaItem = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      agenda: prev.agenda.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    }));
  }, []);

  // Todo operations
  const addTodoItem = useCallback((item: Omit<TodoItem, 'id'>) => {
    setData(prev => ({
      ...prev,
      todos: [...prev.todos, { ...item, id: crypto.randomUUID() }]
    }));
  }, []);

  const updateTodoItem = useCallback((id: string, updates: Partial<TodoItem>) => {
    setData(prev => ({
      ...prev,
      todos: prev.todos.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  }, []);

  const deleteTodoItem = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      todos: prev.todos.filter(item => item.id !== id)
    }));
  }, []);

  const toggleTodoItem = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      todos: prev.todos.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    }));
  }, []);

  const reorderTodos = useCallback((fromIndex: number, toIndex: number) => {
    setData(prev => {
      const newTodos = [...prev.todos];
      const [removed] = newTodos.splice(fromIndex, 1);
      newTodos.splice(toIndex, 0, removed);
      return { ...prev, todos: newTodos };
    });
  }, []);

  // Food operations
  const addFoodItem = useCallback((item: Omit<FoodItem, 'id'>) => {
    setData(prev => ({
      ...prev,
      food: [...prev.food, { ...item, id: crypto.randomUUID() }]
    }));
  }, []);

  const updateFoodItem = useCallback((id: string, updates: Partial<FoodItem>) => {
    setData(prev => ({
      ...prev,
      food: prev.food.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  }, []);

  const deleteFoodItem = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      food: prev.food.filter(item => item.id !== id)
    }));
  }, []);

  // Calculate food totals
  const foodTotals = {
    calories: data.food.reduce((sum, item) => sum + (item.calories || 0), 0),
    protein: data.food.reduce((sum, item) => sum + (item.protein || 0), 0),
    carbs: data.food.reduce((sum, item) => sum + (item.carbs || 0), 0),
    fat: data.food.reduce((sum, item) => sum + (item.fat || 0), 0)
  };

  // Supplement operations
  const addSupplementItem = useCallback((item: Omit<SupplementItem, 'id'>) => {
    setData(prev => ({
      ...prev,
      supplements: [...prev.supplements, { ...item, id: crypto.randomUUID() }]
    }));
  }, []);

  const updateSupplementItem = useCallback((id: string, updates: Partial<SupplementItem>) => {
    setData(prev => ({
      ...prev,
      supplements: prev.supplements.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  }, []);

  const deleteSupplementItem = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      supplements: prev.supplements.filter(item => item.id !== id)
    }));
  }, []);

  const toggleSupplementItem = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      supplements: prev.supplements.map(item =>
        item.id === id ? { ...item, taken: !item.taken } : item
      )
    }));
  }, []);

  // Bulk operations
  const setAgendaItems = useCallback((items: AgendaItem[]) => {
    setData(prev => ({
      ...prev,
      agenda: items.sort((a, b) => a.startTime.localeCompare(b.startTime))
    }));
  }, []);

  const setTodoItems = useCallback((items: TodoItem[]) => {
    setData(prev => ({ ...prev, todos: items }));
  }, []);

  const setFoodItems = useCallback((items: FoodItem[]) => {
    setData(prev => ({ ...prev, food: items }));
  }, []);

  const setSupplementItems = useCallback((items: SupplementItem[]) => {
    setData(prev => ({ ...prev, supplements: items }));
  }, []);

  // Export/Import
  const exportData = useCallback(() => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  const importData = useCallback((jsonString: string) => {
    try {
      const imported = JSON.parse(jsonString);
      if (imported.date && imported.agenda && imported.todos && imported.food && imported.supplements) {
        setData(imported);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const clearAll = useCallback(() => {
    setData(defaultDayData(targetDate));
  }, [targetDate]);

  return {
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
    setSupplementItems,
    // Bulk
    exportData,
    importData,
    clearAll
  };
}