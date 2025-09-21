import { useEffect } from 'react'
import { wsService, useWebSocket } from '@/services/websocket'
import {
  RealtimeEventType,
  type RealtimeMessage,
  type DataPayload,
  type OptimisticPayload
} from '@/types/realtime.types'

export type RealtimeHandler = (message: RealtimeMessage) => void

type OptimisticEntry = {
  rollback: () => void
  resolve: () => void
  reject: (reason?: string) => void
}

class RealtimeSyncService {
  private handlers = new Map<string, Set<RealtimeHandler>>()
  private optimistic = new Map<string, OptimisticEntry>()

  constructor() {
    wsService.on(RealtimeEventType.DATA_CREATE, message => this.dispatch(message))
    wsService.on(RealtimeEventType.DATA_UPDATE, message => this.dispatch(message))
    wsService.on(RealtimeEventType.DATA_DELETE, message => this.dispatch(message))
    wsService.on(RealtimeEventType.OPTIMISTIC_COMPLETE, message => this.completeOptimistic(message))
    wsService.on(RealtimeEventType.OPTIMISTIC_ROLLBACK, message => this.rollbackOptimistic(message))
    wsService.on(RealtimeEventType.CONNECT, () => this.resendOptimistic())
  }

  subscribe(resource: string, handler: RealtimeHandler): () => void {
    if (!this.handlers.has(resource)) {
      this.handlers.set(resource, new Set())
    }
    this.handlers.get(resource)!.add(handler)

    return () => {
      this.handlers.get(resource)?.delete(handler)
      if (this.handlers.get(resource)?.size === 0) {
        this.handlers.delete(resource)
      }
    }
  }

  broadcast(resource: string, payload: DataPayload, roomId?: string) {
    wsService.send({
      type: RealtimeEventType.DATA_UPDATE,
      payload: { ...payload, type: resource },
      roomId
    })
  }

  optimisticUpdate<T>(opts: {
    resource: string
    payload: T
    apply: () => void
    rollback: () => void
    roomId?: string
  }): Promise<void> {
    const optimisticId = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    opts.apply()

    return new Promise((resolve, reject) => {
      this.optimistic.set(optimisticId, {
        rollback: opts.rollback,
        resolve,
        reject
      })

      wsService.send({
        type: RealtimeEventType.OPTIMISTIC_START,
        payload: {
          type: opts.resource,
          data: opts.payload
        } satisfies DataPayload,
        optimisticId,
        roomId: opts.roomId
      })
    })
  }

  private dispatch(message: RealtimeMessage) {
    const payload = message.payload as DataPayload
    const resourceHandlers = this.handlers.get(payload.type)
    resourceHandlers?.forEach(handler => handler(message))
  }

  private completeOptimistic(message: RealtimeMessage) {
    const entry = this.optimistic.get(message.optimisticId || '')
    if (entry) {
      entry.resolve()
      this.optimistic.delete(message.optimisticId!)
    }
  }

  private rollbackOptimistic(message: RealtimeMessage) {
    const entry = this.optimistic.get(message.optimisticId || '')
    if (entry) {
      entry.rollback()
      entry.reject(message.payload?.reason)
      this.optimistic.delete(message.optimisticId!)
    }
  }

  private resendOptimistic() {
    if (!this.optimistic.size) return
    this.optimistic.forEach((_entry, optimisticId) => {
      wsService.send({
        type: RealtimeEventType.OPTIMISTIC_START,
        payload: {},
        optimisticId
      })
    })
  }
}

export const realtimeSyncService = new RealtimeSyncService()

/**
 * Convenience hook for components that need access to realtime state.
 */
export function useRealtimeState(resource: string, handler: RealtimeHandler) {
  useEffect(() => realtimeSyncService.subscribe(resource, handler), [resource, handler])
  return useWebSocket()
}
