import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Dumbbell, Apple, Plus, Check, Trash2, Target, TrendingUp, Clock, Award } from 'lucide-react';
import { format } from 'date-fns';
import '../styles/responsive-system.css';

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
  const completedExercises = workouts.filter(w => w.completed).length;

  // Targets
  const calorieTarget = 2500;
  const proteinTarget = 150;
  const workoutTarget = 6;

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
        border: '2px solid var(--success-500)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Dumbbell className="w-8 h-8" style={{ color: 'var(--success-500)' }} />
            <div>
              <h1 style={{
                fontSize: 'var(--font-h1)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0
              }}>
                Fitness Tracker
              </h1>
              <p style={{
                fontSize: 'var(--font-body)',
                color: 'var(--text-secondary)',
                margin: '0.5rem 0 0 0'
              }}>
                Track workouts and nutrition for {format(new Date(), 'EEEE, MMMM do')}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-3)',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid var(--success-500)',
              borderRadius: 'var(--radius-medium)'
            }}>
              <Target className="w-4 h-4" style={{ color: 'var(--success-500)' }} />
              <span style={{
                fontSize: 'var(--font-body)',
                color: 'var(--text-primary)',
                fontWeight: 600
              }}>
                {completedExercises}/{workoutTarget} exercises
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-3)',
              background: 'rgba(96, 165, 250, 0.1)',
              border: '1px solid var(--accent-500)',
              borderRadius: 'var(--radius-medium)'
            }}>
              <Apple className="w-4 h-4" style={{ color: 'var(--accent-500)' }} />
              <span style={{
                fontSize: 'var(--font-body)',
                color: 'var(--text-primary)',
                fontWeight: 600
              }}>
                {totalCalories}/{calorieTarget} cal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 'var(--space-4)'
      }}>
        {/* Workout Section */}
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
            <Dumbbell className="w-6 h-6" style={{ color: 'var(--success-500)' }} />
            Today's Workout
          </h2>

          {/* Add Exercise Form */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-3)'
          }}>
            <input
              type="text"
              placeholder="Exercise name"
              value={newExercise.name}
              onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addExercise()}
              className="input-enhanced"
              style={{
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-medium)',
                fontSize: 'var(--font-body)'
              }}
            />
            <input
              type="number"
              placeholder="Sets"
              value={newExercise.sets}
              onChange={(e) => setNewExercise({ ...newExercise, sets: e.target.value })}
              className="input-enhanced"
              style={{
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-medium)'
              }}
            />
            <input
              type="number"
              placeholder="Reps"
              value={newExercise.reps}
              onChange={(e) => setNewExercise({ ...newExercise, reps: e.target.value })}
              className="input-enhanced"
              style={{
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-medium)'
              }}
            />
            <input
              type="text"
              placeholder="Weight"
              value={newExercise.weight}
              onChange={(e) => setNewExercise({ ...newExercise, weight: e.target.value })}
              className="input-enhanced"
              style={{
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-medium)'
              }}
            />
          </div>

          <button
            onClick={addExercise}
            className="button-high-contrast"
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3)',
              marginBottom: 'var(--space-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)'
            }}
          >
            <Plus className="w-4 h-4" />
            Add Exercise
          </button>

          {/* Exercise List */}
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            scrollbarWidth: 'thin'
          }}>
            {workouts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: 'var(--space-6)',
                color: 'var(--text-muted)'
              }}>
                <Dumbbell className="w-12 h-12" style={{
                  margin: '0 auto var(--space-3) auto',
                  opacity: 0.5,
                  color: 'var(--success-500)'
                }} />
                <p style={{
                  fontSize: 'var(--font-body)',
                  marginBottom: 'var(--space-1)'
                }}>No exercises added yet</p>
                <p style={{
                  fontSize: 'var(--font-small)',
                  color: 'var(--text-muted)'
                }}>Start building today's workout</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {workouts.map((exercise) => (
                  <div
                    key={exercise.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-medium)',
                      border: exercise.completed 
                        ? '2px solid var(--success-500)' 
                        : '1px solid var(--border-default)',
                      background: exercise.completed 
                        ? 'rgba(16, 185, 129, 0.1)' 
                        : 'rgba(255, 255, 255, 0.02)',
                      opacity: exercise.completed ? 0.8 : 1,
                      transition: 'all var(--transition-normal)'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)'
                    }}>
                      <button
                        onClick={() => toggleExercise(exercise.id)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: `2px solid ${exercise.completed ? 'var(--success-500)' : 'var(--border-default)'}`,
                          background: exercise.completed ? 'var(--success-500)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        {exercise.completed && <Check className="w-4 h-4" style={{ color: 'white' }} />}
                      </button>
                      <div>
                        <p style={{
                          fontSize: 'var(--font-body)',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          textDecoration: exercise.completed ? 'line-through' : 'none'
                        }}>
                          {exercise.name}
                        </p>
                        <p style={{
                          fontSize: 'var(--font-small)',
                          color: 'var(--text-secondary)',
                          fontFamily: 'Georgia, monospace'
                        }}>
                          {exercise.sets} sets × {exercise.reps} reps
                          {exercise.weight && ` @ ${exercise.weight} lbs`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteExercise(exercise.id)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-small)',
                        border: '1px solid var(--error-500)',
                        background: 'transparent',
                        color: 'var(--error-500)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workout Progress */}
          {workouts.length > 0 && (
            <div style={{
              marginTop: 'var(--space-3)',
              padding: 'var(--space-3)',
              borderTop: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontSize: 'var(--font-body)',
                color: 'var(--text-secondary)',
                fontWeight: 500
              }}>
                Workout Progress
              </span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)'
              }}>
                <div style={{
                  width: '120px',
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    background: 'var(--success-500)',
                    width: `${(completedExercises / workouts.length) * 100}%`,
                    borderRadius: '4px',
                    transition: 'width var(--transition-normal)'
                  }} />
                </div>
                <span style={{
                  fontSize: 'var(--font-body)',
                  color: 'var(--success-500)',
                  fontWeight: 600,
                  fontFamily: 'Georgia, monospace'
                }}>
                  {Math.round((completedExercises / workouts.length) * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Nutrition Section */}
        <div className="card-enhanced" style={{
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--accent-500)'
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
            <Apple className="w-6 h-6" style={{ color: 'var(--accent-500)' }} />
            Nutrition Tracking
          </h2>

          {/* Add Meal Form */}
          <div style={{
            display: 'grid',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-3)'
          }}>
            <input
              type="text"
              placeholder="Meal/Food name"
              value={newMeal.name}
              onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addMeal()}
              className="input-enhanced"
              style={{
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-medium)',
                fontSize: 'var(--font-body)'
              }}
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-2)'
            }}>
              <input
                type="number"
                placeholder="Calories"
                value={newMeal.calories}
                onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })}
                className="input-enhanced"
                style={{
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-medium)'
                }}
              />
              <input
                type="number"
                placeholder="Protein (g)"
                value={newMeal.protein}
                onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })}
                className="input-enhanced"
                style={{
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-medium)'
                }}
              />
              <input
                type="number"
                placeholder="Carbs (g)"
                value={newMeal.carbs}
                onChange={(e) => setNewMeal({ ...newMeal, carbs: e.target.value })}
                className="input-enhanced"
                style={{
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-medium)'
                }}
              />
              <input
                type="number"
                placeholder="Fat (g)"
                value={newMeal.fat}
                onChange={(e) => setNewMeal({ ...newMeal, fat: e.target.value })}
                className="input-enhanced"
                style={{
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-medium)'
                }}
              />
            </div>
          </div>

          <button
            onClick={addMeal}
            className="button-high-contrast"
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3)',
              marginBottom: 'var(--space-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)'
            }}
          >
            <Plus className="w-4 h-4" />
            Add Meal
          </button>

          {/* Meals List */}
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            marginBottom: 'var(--space-3)'
          }}>
            {meals.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: 'var(--space-6)',
                color: 'var(--text-muted)'
              }}>
                <Apple className="w-12 h-12" style={{
                  margin: '0 auto var(--space-3) auto',
                  opacity: 0.5,
                  color: 'var(--accent-500)'
                }} />
                <p style={{
                  fontSize: 'var(--font-body)',
                  marginBottom: 'var(--space-1)'
                }}>No meals logged yet</p>
                <p style={{
                  fontSize: 'var(--font-small)',
                  color: 'var(--text-muted)'
                }}>Track your nutrition throughout the day</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {meals.map((meal) => (
                  <div
                    key={meal.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-medium)',
                      border: '1px solid var(--border-default)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        marginBottom: 'var(--space-1)'
                      }}>
                        <p style={{
                          fontSize: 'var(--font-body)',
                          fontWeight: 600,
                          color: 'var(--text-primary)'
                        }}>
                          {meal.name}
                        </p>
                        <span style={{
                          fontSize: 'var(--font-small)',
                          color: 'var(--text-muted)',
                          fontFamily: 'Georgia, monospace',
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: 'var(--radius-small)'
                        }}>
                          {meal.time}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 'var(--font-small)',
                        color: 'var(--text-secondary)',
                        fontFamily: 'Georgia, monospace'
                      }}>
                        {meal.calories} cal | P: {meal.protein}g | C: {meal.carbs}g | F: {meal.fat}g
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMeal(meal.id)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-small)',
                        border: '1px solid var(--error-500)',
                        background: 'transparent',
                        color: 'var(--error-500)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily Nutrition Totals */}
          {meals.length > 0 && (
            <div style={{
              padding: 'var(--space-3)',
              borderTop: '1px solid var(--border-default)',
              background: 'rgba(96, 165, 250, 0.1)',
              borderRadius: 'var(--radius-medium)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-2)'
              }}>
                <TrendingUp className="w-5 h-5" style={{ color: 'var(--accent-500)' }} />
                <span style={{
                  fontSize: 'var(--font-body)',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Daily Totals
                </span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 'var(--space-2)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--font-body)'
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Calories:</span>
                  <span style={{
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'Georgia, monospace'
                  }}>
                    {totalCalories} / {calorieTarget}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--font-body)'
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Protein:</span>
                  <span style={{
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'Georgia, monospace'
                  }}>
                    {totalProtein} / {proteinTarget}g
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--font-body)'
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Carbs:</span>
                  <span style={{
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'Georgia, monospace'
                  }}>
                    {totalCarbs}g
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--font-body)'
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Fat:</span>
                  <span style={{
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'Georgia, monospace'
                  }}>
                    {totalFat}g
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}