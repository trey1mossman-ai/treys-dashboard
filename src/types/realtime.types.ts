export enum RealtimeEventType {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  DATA_CREATE = 'data:create',
  DATA_UPDATE = 'data:update',
  DATA_DELETE = 'data:delete',
  SYNC_REQUEST = 'sync:request',
  SYNC_RESPONSE = 'sync:response',
  PRESENCE_JOIN = 'presence:join',
  PRESENCE_LEAVE = 'presence:leave',
  PRESENCE_UPDATE = 'presence:update',
  OPTIMISTIC_START = 'optimistic:start',
  OPTIMISTIC_COMPLETE = 'optimistic:complete',
  OPTIMISTIC_ROLLBACK = 'optimistic:rollback',
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop'
}

export type RealtimeConnectionState = 'connecting' | 'connected' | 'disconnected'

export interface RealtimeMessage<T = any> {
  id: string
  type: RealtimeEventType | string
  payload: T
  timestamp: number
  userId?: string
  roomId?: string
  optimisticId?: string
  version?: number
}

export interface PresencePayload {
  userId: string
  status: 'online' | 'offline' | 'away'
  lastSeen: string
  roomId?: string
  cursor?: { x: number; y: number }
}

export interface DataPayload<T = any> {
  type: string
  data: T
  id?: string
  roomId?: string
}

export interface OptimisticPayload<T = any> {
  id: string
  action: string
  data?: T
  reason?: string
}

export interface TypingPayload {
  userId: string
  roomId?: string
}
