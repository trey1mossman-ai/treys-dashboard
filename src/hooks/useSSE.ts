// SSE Hook for React components to handle live updates
import { useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';
import { useOptimisticStore } from '../stores/optimisticStore';
import { useDashboardStore } from '../stores/dashboardStore';

export interface SSEMessage {
  type: string;
  payload: any;
  timestamp: string;
}

export function useSSE() {
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { reconcile } = useOptimisticStore();
  const { actions } = useDashboardStore();
  
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: SSEMessage = JSON.parse(event.data);
      
      switch (data.type) {
        case 'connected':
          console.log('[SSE] Connected to live updates stream');
          break;
          
        case 'keepalive':
          // Silent keepalive - no action needed
          break;
          
        case 'agenda.updated':
          // Update agenda store
          console.log('[SSE] Agenda updated, refreshing...');
          actions.loadAgenda();
          break;
          
        case 'notification.created':
          // Show notification
          const notif = data.payload;
          console.log('[SSE] New notification:', notif.message);
          
          // Add to notifications store
          // This would integrate with a toast/notification system
          break;
          
        case 'inventory.updated':
          // Update inventory data
          console.log('[SSE] Inventory updated, refreshing...');
          actions.loadInventory();
          break;
          
        case 'status.updated':
          // Update telemetry/status data
          console.log('[SSE] Status updated, refreshing...');
          actions.loadStatus();
          break;
          
        case 'today.ready':
          // Today's data build complete
          console.log('[SSE] Today ready signal received');
          actions.loadAgenda();
          actions.loadStatus();
          actions.loadInventory();
          break;
          
        default:
          console.log('[SSE] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[SSE] Failed to process message:', error);
    }
  }, [reconcile, actions]);
  
  const handleError = useCallback((_error: Event) => {
    console.error('[SSE] Connection error, will attempt reconnection');
    // Toast notification about connection loss could go here
  }, []);
  
  const handleOpen = useCallback(() => {
    console.log('[SSE] Live updates connected successfully');
    // Toast notification about connection success could go here
  }, []);
  
  useEffect(() => {
    // Connect to SSE stream
    apiClient.connectSSE({
      onMessage: handleMessage,
      onError: handleError,
      onOpen: handleOpen,
      reconnectDelay: 5000
    });
    
    // Cleanup on unmount
    return () => {
      apiClient.disconnectSSE();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [handleMessage, handleError, handleOpen]);
  
  return {
    // Can expose connection status if needed
    isConnected: apiClient ? true : false
  };
}