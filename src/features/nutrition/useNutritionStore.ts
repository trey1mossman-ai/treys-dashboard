import { create } from 'zustand';
import { localBrain } from '@/lib/database/local-brain';

interface FoodItem {
  id?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  timestamp: string;
}

interface NutritionStore {
  foodItems: FoodItem[];
  addFoodItem: (item: FoodItem) => Promise<void>;
  removeFoodItem: (id: string) => void;
  getDailyTotals: () => {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export const useNutritionStore = create<NutritionStore>((set, get) => ({
  foodItems: [],
  
  addFoodItem: async (item: FoodItem) => {
    const newItem = {
      ...item,
      id: item.id || `food-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    set(state => ({
      foodItems: [...state.foodItems, newItem]
    }));
    
    // Log event to local brain
    await localBrain.logEvent('food_logged', {
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      meal: item.meal
    });
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('nutrition-updated'));
  },
  
  removeFoodItem: (id: string) => {
    set(state => ({
      foodItems: state.foodItems.filter(item => item.id !== id)
    }));
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('nutrition-updated'));
  },
  
  getDailyTotals: () => {
    const { foodItems } = get();
    const today = new Date().toDateString();
    
    const todayItems = foodItems.filter(item => 
      new Date(item.timestamp).toDateString() === today
    );
    
    return todayItems.reduce((totals, item) => ({
      calories: totals.calories + item.calories,
      protein: totals.protein + item.protein,
      carbs: totals.carbs + item.carbs,
      fat: totals.fat + item.fat
    }), {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    });
  }
}));