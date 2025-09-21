/**
 * Drag & Drop System - Day 3
 * Smooth, accessible drag and drop with FLIP animations
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FLIPAnimation } from '@/lib/animations';

export interface DragItem {
  id: string;
  index: number;
  type: string;
  data: any;
}

export interface DropResult {
  draggableId: string;
  type: string;
  source: {
    index: number;
    droppableId: string;
  };
  destination: {
    index: number;
    droppableId: string;
  } | null;
}

interface DragDropContextProps {
  onDragStart?: (item: DragItem) => void;
  onDragEnd: (result: DropResult) => void;
  onDragUpdate?: (item: DragItem) => void;
  enableHaptic?: boolean;
  children: React.ReactNode;
}

interface DragDropState {
  isDragging: boolean;
  draggedItem: DragItem | null;
  draggedElement: HTMLElement | null;
  placeholder: HTMLElement | null;
  initialMousePos: { x: number; y: number };
  currentMousePos: { x: number; y: number };
}

const DragDropContext = React.createContext<{
  state: DragDropState;
  startDrag: (item: DragItem, element: HTMLElement, event: React.MouseEvent | React.TouchEvent) => void;
  endDrag: () => void;
  updateDrag: (event: MouseEvent | TouchEvent) => void;
}>({
  state: {
    isDragging: false,
    draggedItem: null,
    draggedElement: null,
    placeholder: null,
    initialMousePos: { x: 0, y: 0 },
    currentMousePos: { x: 0, y: 0 },
  },
  startDrag: () => {},
  endDrag: () => {},
  updateDrag: () => {},
});

export const DragDropProvider: React.FC<DragDropContextProps> = ({
  onDragStart,
  onDragEnd,
  onDragUpdate,
  enableHaptic = true,
  children,
}) => {
  const [state, setState] = useState<DragDropState>({
    isDragging: false,
    draggedItem: null,
    draggedElement: null,
    placeholder: null,
    initialMousePos: { x: 0, y: 0 },
    currentMousePos: { x: 0, y: 0 },
  });

  const animationFrame = useRef<number>();

  // Haptic feedback
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHaptic) return;
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 30,
      };
      navigator.vibrate(patterns[type]);
    }
  }, [enableHaptic]);

  // Start dragging
  const startDrag = useCallback((item: DragItem, element: HTMLElement, event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    // Create placeholder
    const placeholder = element.cloneNode(true) as HTMLElement;
    placeholder.style.opacity = '0.3';
    placeholder.style.pointerEvents = 'none';
    placeholder.classList.add('drag-placeholder');
    
    // Create drag preview
    const dragPreview = element.cloneNode(true) as HTMLElement;
    dragPreview.style.position = 'fixed';
    dragPreview.style.zIndex = '9999';
    dragPreview.style.pointerEvents = 'none';
    dragPreview.style.opacity = '0.9';
    dragPreview.style.transform = 'scale(1.05)';
    dragPreview.style.transition = 'none';
    dragPreview.classList.add('drag-preview');
    
    const rect = element.getBoundingClientRect();
    dragPreview.style.width = `${rect.width}px`;
    dragPreview.style.height = `${rect.height}px`;
    dragPreview.style.left = `${rect.left}px`;
    dragPreview.style.top = `${rect.top}px`;
    
    document.body.appendChild(dragPreview);
    element.parentNode?.replaceChild(placeholder, element);

    setState({
      isDragging: true,
      draggedItem: item,
      draggedElement: dragPreview,
      placeholder,
      initialMousePos: { x: clientX, y: clientY },
      currentMousePos: { x: clientX, y: clientY },
    });

    triggerHaptic('medium');
    onDragStart?.(item);

    // Add global listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
  }, [onDragStart, triggerHaptic]);

  // Update drag position
  const updateDrag = useCallback((event: MouseEvent | TouchEvent) => {
    if (!state.isDragging || !state.draggedElement) return;

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    // Cancel previous animation frame
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }

    // Update position in next frame for smooth animation
    animationFrame.current = requestAnimationFrame(() => {
      if (!state.draggedElement) return;

      const deltaX = clientX - state.initialMousePos.x;
      const deltaY = clientY - state.initialMousePos.y;

      state.draggedElement.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.05)`;

      setState(prev => ({
        ...prev,
        currentMousePos: { x: clientX, y: clientY },
      }));

      // Check for drop zones
      const elementBelow = document.elementFromPoint(clientX, clientY);
      const dropZone = elementBelow?.closest('.droppable');
      
      if (dropZone) {
        dropZone.classList.add('drop-active');
        
        // Find insertion point
        const items = Array.from(dropZone.querySelectorAll('.draggable'));
        const insertIndex = items.findIndex(item => {
          const rect = item.getBoundingClientRect();
          return clientY < rect.top + rect.height / 2;
        });

        // Move placeholder
        if (state.placeholder && insertIndex >= 0) {
          items[insertIndex].parentNode?.insertBefore(state.placeholder, items[insertIndex]);
        } else if (state.placeholder) {
          dropZone.appendChild(state.placeholder);
        }
      }

      onDragUpdate?.(state.draggedItem!);
    });
  }, [state, onDragUpdate]);

  // End dragging
  const endDrag = useCallback(() => {
    if (!state.isDragging || !state.draggedElement || !state.draggedItem) return;

    // Find final position
    const dropZone = state.placeholder?.parentElement;
    const finalIndex = dropZone ? 
      Array.from(dropZone.children).indexOf(state.placeholder!) : -1;

    // Animate to final position
    if (state.placeholder && dropZone) {
      const placeholderRect = state.placeholder.getBoundingClientRect();
      const currentRect = state.draggedElement.getBoundingClientRect();

      // FLIP animation
      const deltaX = placeholderRect.left - currentRect.left;
      const deltaY = placeholderRect.top - currentRect.top;

      state.draggedElement.style.transition = 'transform 200ms ease-out';
      state.draggedElement.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1)`;

      setTimeout(() => {
        // Replace placeholder with original element
        const originalElement = state.draggedElement!.cloneNode(true) as HTMLElement;
        originalElement.style.position = '';
        originalElement.style.transform = '';
        originalElement.style.transition = '';
        originalElement.style.opacity = '';
        originalElement.style.zIndex = '';
        originalElement.classList.remove('drag-preview');

        state.placeholder?.parentNode?.replaceChild(originalElement, state.placeholder);
        state.draggedElement?.remove();

        // Trigger callback
        onDragEnd({
          draggableId: state.draggedItem!.id,
          type: state.draggedItem!.type,
          source: {
            index: state.draggedItem!.index,
            droppableId: 'default',
          },
          destination: dropZone ? {
            index: finalIndex,
            droppableId: dropZone.id || 'default',
          } : null,
        });

        // Reset state
        setState({
          isDragging: false,
          draggedItem: null,
          draggedElement: null,
          placeholder: null,
          initialMousePos: { x: 0, y: 0 },
          currentMousePos: { x: 0, y: 0 },
        });

        triggerHaptic('light');
      }, 200);
    } else {
      // No valid drop zone - cancel
      state.draggedElement?.remove();
      state.placeholder?.remove();
      
      setState({
        isDragging: false,
        draggedItem: null,
        draggedElement: null,
        placeholder: null,
        initialMousePos: { x: 0, y: 0 },
        currentMousePos: { x: 0, y: 0 },
      });
    }

    // Clean up active states
    document.querySelectorAll('.drop-active').forEach(el => {
      el.classList.remove('drop-active');
    });

    // Remove global listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('touchcancel', handleTouchEnd);
  }, [state, onDragEnd, triggerHaptic]);

  // Event handlers
  const handleMouseMove = useCallback((e: MouseEvent) => {
    updateDrag(e);
  }, [updateDrag]);

  const handleMouseUp = useCallback(() => {
    endDrag();
  }, [endDrag]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    updateDrag(e);
  }, [updateDrag]);

  const handleTouchEnd = useCallback(() => {
    endDrag();
  }, [endDrag]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);

  return (
    <DragDropContext.Provider value={{ state, startDrag, endDrag, updateDrag }}>
      {children}
    </DragDropContext.Provider>
  );
};

// Draggable component
interface DraggableProps {
  draggableId: string;
  index: number;
  type?: string;
  data?: any;
  isDragDisabled?: boolean;
  children: (provided: {
    dragHandleProps: {
      onMouseDown: (e: React.MouseEvent) => void;
      onTouchStart: (e: React.TouchEvent) => void;
    };
    isDragging: boolean;
  }) => React.ReactNode;
}

export const Draggable: React.FC<DraggableProps> = ({
  draggableId,
  index,
  type = 'default',
  data,
  isDragDisabled = false,
  children,
}) => {
  const { state, startDrag } = React.useContext(DragDropContext);
  const elementRef = useRef<HTMLElement | null>(null);

  const handleDragStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (isDragDisabled || !elementRef.current) return;

    startDrag(
      { id: draggableId, index, type, data },
      elementRef.current,
      event
    );
  }, [draggableId, index, type, data, isDragDisabled, startDrag]);

  return (
    <>
      {children({
        dragHandleProps: {
          onMouseDown: handleDragStart,
          onTouchStart: handleDragStart,
        },
        isDragging: state.isDragging && state.draggedItem?.id === draggableId,
      })}
    </>
  );
};

// Droppable component
interface DroppableProps {
  droppableId: string;
  isDropDisabled?: boolean;
  children: (provided: {
    droppableProps: {
      id: string;
      className: string;
    };
    isDraggingOver: boolean;
  }) => React.ReactNode;
}

export const Droppable: React.FC<DroppableProps> = ({
  droppableId,
  isDropDisabled = false,
  children,
}) => {
  const { state } = React.useContext(DragDropContext);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    if (!state.isDragging) {
      setIsDraggingOver(false);
    }
  }, [state.isDragging]);

  return (
    <>
      {children({
        droppableProps: {
          id: droppableId,
          className: `droppable ${isDropDisabled ? 'drop-disabled' : ''} ${isDraggingOver ? 'dragging-over' : ''}`,
        },
        isDraggingOver,
      })}
    </>
  );
};

// Export everything
export { DragDropContext };
