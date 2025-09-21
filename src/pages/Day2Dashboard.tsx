/**
 * Day 2 Integration Example
 * Shows how all real-time features work together
 */

import React, { useEffect, useState } from 'react';
import { useWebSocket, WSEventType } from '@/services/websocket';
import { 
  useRealtimeAnimation, 
  usePresenceAnimation,
  useOptimisticAnimation,
  useConnectionAnimation 
} from '@/hooks/useRealtimeAnimation';
import { PerformanceMonitor } from '@/features/monitoring/PerformanceMonitor';
import { GPUAnimation, gestureAnimations } from '@/lib/animations';

/**
 * Example Dashboard with all Day 2 features
 */
export const Day2Dashboard: React.FC = () => {
  const [todos, setTodos] = useState<any[]>([]);
  const [showPerformance, setShowPerformance] = useState(false);
  
  // WebSocket hooks
  const { isConnected, send, on, off } = useWebSocket();
  
  // Animation hooks
  useRealtimeAnimation();
  usePresenceAnimation();
  const { startOptimistic, completeOptimistic, rollbackOptimistic } = useOptimisticAnimation();
  useConnectionAnimation();
  
  // Handle real-time updates
  useEffect(() => {
    const handleDataCreate = (payload: any) => {
      if (payload.type === 'todos') {
        setTodos(prev => [...prev, payload.data]);
      }
    };
    
    const handleDataUpdate = (payload: any) => {
      if (payload.type === 'todos') {
        setTodos(prev => prev.map(todo => 
          todo.id === payload.id ? { ...todo, ...payload.data } : todo
        ));
      }
    };
    
    const handleDataDelete = (payload: any) => {
      if (payload.type === 'todos') {
        setTodos(prev => prev.filter(todo => todo.id !== payload.id));
      }
    };
    
    on(WSEventType.DATA_CREATE, handleDataCreate);
    on(WSEventType.DATA_UPDATE, handleDataUpdate);
    on(WSEventType.DATA_DELETE, handleDataDelete);
    
    return () => {
      off(WSEventType.DATA_CREATE, handleDataCreate);
      off(WSEventType.DATA_UPDATE, handleDataUpdate);
      off(WSEventType.DATA_DELETE, handleDataDelete);
    };
  }, [on, off]);
  
  // Create todo with optimistic update
  const createTodo = async (text: string) => {
    const tempId = `temp-${Date.now()}`;
    const tempTodo = { id: tempId, text, completed: false };
    
    // Start optimistic update
    startOptimistic(tempId, 'create');
    setTodos(prev => [...prev, tempTodo]);
    
    // Send to server
    send({
      type: WSEventType.DATA_CREATE,
      payload: { type: 'todos', data: { text, completed: false } }
    });
    
    // Simulate server response (in real app, this would be handled by WebSocket)
    setTimeout(() => {
      if (text === 'FAIL_TODO') {
        // Simulate failure
        rollbackOptimistic(tempId);
        setTodos(prev => prev.filter(t => t.id !== tempId));
      } else {
        // Success
        completeOptimistic(tempId);
      }
    }, 1000);
  };
  
  // Toggle todo completion with animation
  const toggleTodo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const anim = new GPUAnimation(element);
      anim.spring({ duration: 200 });
    }
    
    send({
      type: WSEventType.DATA_UPDATE,
      payload: { 
        type: 'todos', 
        id, 
        data: { 
          completed: !todos.find(t => t.id === id)?.completed 
        }
      }
    });
  };
  
  // Delete todo with swipe animation
  const deleteTodo = async (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      await gestureAnimations.swipeDelete(element);
    }
    
    send({
      type: WSEventType.DATA_DELETE,
      payload: { type: 'todos', id }
    });
  };
  
  return (
    <div className="day2-dashboard min-h-screen bg-background p-6">
      {/* Connection Indicator */}
      <div 
        id="connection-indicator" 
        className={`fixed top-4 left-4 w-3 h-3 rounded-full transition-all ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
        title={isConnected ? 'Connected' : 'Disconnected'}
      />
      
      {/* Performance Monitor Toggle */}
      <button
        onClick={() => setShowPerformance(!showPerformance)}
        className="fixed top-4 right-4 px-3 py-1 text-xs bg-black/50 text-white rounded hover:bg-black/70 transition-colors"
      >
        {showPerformance ? 'Hide' : 'Show'} Performance
      </button>
      
      {/* Performance Monitor */}
      {showPerformance && <PerformanceMonitor />}
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-foreground">
          Day 2 Real-time Dashboard
        </h1>
        
        {/* Add Todo */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Add a new todo (type 'FAIL_TODO' to test rollback)"
            className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:ring-2 focus:ring-accent transition-all"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const input = e.target as HTMLInputElement;
                createTodo(input.value);
                input.value = '';
              }
            }}
          />
        </div>
        
        {/* Todo List */}
        <div id="todo-list" className="space-y-2">
          {todos.map(todo => (
            <div
              key={todo.id}
              id={todo.id}
              className={`
                todo-item p-4 bg-card border border-border rounded-lg
                flex items-center justify-between
                transition-all hover:shadow-lg hover-glow
                ${todo.completed ? 'opacity-60' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  className="w-5 h-5"
                />
                <span className={todo.completed ? 'line-through' : ''}>
                  {todo.text}
                </span>
              </div>
              
              <button
                onClick={() => deleteTodo(todo.id)}
                className="px-3 py-1 text-sm text-red-500 hover:bg-red-500/10 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        
        {/* Empty State */}
        {todos.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No todos yet. Add one above!</p>
          </div>
        )}
        
        {/* Feature Status */}
        <div className="mt-12 p-6 bg-card border border-border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Day 2 Features Active</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              WebSocket {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Real-time Updates
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Optimistic Updates
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              GPU Animations
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Performance Monitoring
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Offline Queue
            </div>
          </div>
        </div>
        
        {/* Keyboard Shortcuts */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p className="font-semibold mb-2">Keyboard Shortcuts:</p>
          <div className="grid grid-cols-2 gap-2">
            <div>⌘K - Command Palette</div>
            <div>⌘/ - Help</div>
            <div>⌘Z - Undo</div>
            <div>⌘⇧Z - Redo</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export for use in app
export default Day2Dashboard;
