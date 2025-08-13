import { useState } from 'react';
import { Section } from '@/components/Section';
import { Card } from '@/components/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Dumbbell, Apple, Plus, Check, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  completed: boolean;
}

interface Meal {
  id: string;
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  time: string;
}

export function Fitness() {
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const [workouts, setWorkouts] = useLocalStorage<Exercise[]>(`workout_${today}`, []);
  const [meals, setMeals] = useLocalStorage<Meal[]>(`meals_${today}`, []);
  
  const [newExercise, setNewExercise] = useState({ name: '', sets: '', reps: '', weight: '' });
  const [newMeal, setNewMeal] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });

  const addExercise = () => {
    if (!newExercise.name.trim()) {
      toast({ title: 'Error', description: 'Exercise name is required', variant: 'destructive' });
      return;
    }
    
    const exercise: Exercise = {
      id: Date.now().toString(),
      ...newExercise,
      completed: false
    };
    
    setWorkouts([...workouts, exercise]);
    setNewExercise({ name: '', sets: '', reps: '', weight: '' });
    toast({ title: 'Exercise Added', description: 'Added to today\'s workout' });
  };

  const addMeal = () => {
    if (!newMeal.name.trim()) {
      toast({ title: 'Error', description: 'Meal name is required', variant: 'destructive' });
      return;
    }
    
    const meal: Meal = {
      id: Date.now().toString(),
      ...newMeal,
      time: format(new Date(), 'HH:mm')
    };
    
    setMeals([...meals, meal]);
    setNewMeal({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    toast({ title: 'Meal Added', description: 'Added to nutrition log' });
  };

  const toggleExercise = (id: string) => {
    setWorkouts(workouts.map(w => 
      w.id === id ? { ...w, completed: !w.completed } : w
    ));
  };

  const deleteExercise = (id: string) => {
    setWorkouts(workouts.filter(w => w.id !== id));
  };

  const deleteMeal = (id: string) => {
    setMeals(meals.filter(m => m.id !== id));
  };

  const totalCalories = meals.reduce((sum, m) => sum + (parseInt(m.calories) || 0), 0);
  const totalProtein = meals.reduce((sum, m) => sum + (parseInt(m.protein) || 0), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (parseInt(m.carbs) || 0), 0);
  const totalFat = meals.reduce((sum, m) => sum + (parseInt(m.fat) || 0), 0);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workout Section */}
        <Section title="Today's Workout">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <Input
                  placeholder="Exercise"
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addExercise()}
                />
                <Input
                  placeholder="Sets"
                  type="number"
                  value={newExercise.sets}
                  onChange={(e) => setNewExercise({ ...newExercise, sets: e.target.value })}
                />
                <Input
                  placeholder="Reps"
                  type="number"
                  value={newExercise.reps}
                  onChange={(e) => setNewExercise({ ...newExercise, reps: e.target.value })}
                />
                <Input
                  placeholder="Weight (lbs)"
                  value={newExercise.weight}
                  onChange={(e) => setNewExercise({ ...newExercise, weight: e.target.value })}
                />
              </div>
              
              <Button onClick={addExercise} className="w-full hover-glow">
                <Plus className="w-4 h-4 mr-2" />
                Add Exercise
              </Button>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {workouts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No exercises added yet</p>
                    <p className="text-sm">Start building today's workout</p>
                  </div>
                ) : (
                  workouts.map((exercise) => (
                    <div
                      key={exercise.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        exercise.completed ? 'bg-muted/50 opacity-60' : 'hover:bg-muted/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant={exercise.completed ? "default" : "outline"}
                          onClick={() => toggleExercise(exercise.id)}
                        >
                          {exercise.completed && <Check className="w-4 h-4" />}
                        </Button>
                        <div>
                          <p className={`font-medium ${exercise.completed ? 'line-through' : ''}`}>
                            {exercise.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {exercise.sets} sets × {exercise.reps} reps
                            {exercise.weight && ` @ ${exercise.weight} lbs`}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteExercise(exercise.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              
              {workouts.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Progress: {workouts.filter(w => w.completed).length}/{workouts.length} exercises completed
                  </p>
                </div>
              )}
            </div>
          </Card>
        </Section>
        
        {/* Nutrition Section */}
        <Section title="Nutrition Tracking">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Input
                    placeholder="Meal/Food name"
                    value={newMeal.name}
                    onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && addMeal()}
                  />
                </div>
                <Input
                  placeholder="Calories"
                  type="number"
                  value={newMeal.calories}
                  onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })}
                />
                <Input
                  placeholder="Protein (g)"
                  type="number"
                  value={newMeal.protein}
                  onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })}
                />
                <Input
                  placeholder="Carbs (g)"
                  type="number"
                  value={newMeal.carbs}
                  onChange={(e) => setNewMeal({ ...newMeal, carbs: e.target.value })}
                />
                <Input
                  placeholder="Fat (g)"
                  type="number"
                  value={newMeal.fat}
                  onChange={(e) => setNewMeal({ ...newMeal, fat: e.target.value })}
                />
              </div>
              
              <Button onClick={addMeal} className="w-full hover-glow">
                <Plus className="w-4 h-4 mr-2" />
                Add Meal
              </Button>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {meals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Apple className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No meals logged yet</p>
                    <p className="text-sm">Track your nutrition throughout the day</p>
                  </div>
                ) : (
                  meals.map((meal) => (
                    <div key={meal.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/20">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{meal.name}</p>
                          <span className="text-xs text-muted-foreground">{meal.time}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {meal.calories} cal | P: {meal.protein}g | C: {meal.carbs}g | F: {meal.fat}g
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMeal(meal.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              
              {meals.length > 0 && (
                <div className="pt-4 border-t space-y-2">
                  <p className="font-medium">Daily Totals</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Calories:</span>
                      <span className="font-medium">{totalCalories}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Protein:</span>
                      <span className="font-medium">{totalProtein}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Carbs:</span>
                      <span className="font-medium">{totalCarbs}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fat:</span>
                      <span className="font-medium">{totalFat}g</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </Section>
      </div>
    </div>
  );
}