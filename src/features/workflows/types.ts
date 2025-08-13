export interface EmailData {
  from: string
  to: string
  subject: string
  body: string
  html?: string
}

export interface SMSData {
  from: string
  to: string
  body: string
}

export interface WhatsAppData {
  from: string
  to: string
  body: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface QuickAction {
  id: string
  label: string
  icon: string
  action: () => void
}