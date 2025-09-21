// API Configuration
// This file centralizes API endpoints and backend URLs

// Use environment variable if set, otherwise use Cloudflare Pages backend
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://agenda-dashboard.pages.dev'

// API Endpoints
export const API_ENDPOINTS = {
  // Webhook endpoints
  emails: `${API_BASE}/api/webhook/emails`,
  calendar: `${API_BASE}/api/webhook/calendar`,
  status: `${API_BASE}/api/webhook/status`,

  // Webhook proxy endpoints (CORS-safe)
  webhookChat: '/api/webhook/chat',
  webhookEmails: '/api/webhook/emails',
  webhookCalendar: '/api/webhook/calendar',

  // Project endpoints
  projectUpload: `${API_BASE}/api/projects/upload`,

  // AI endpoints
  aiEmailAssistant: `${API_BASE}/api/ai/email-assistant`,
}

// Vercel API Proxy URLs (CORS-safe)
export const WEBHOOK_PROXIES = {
  email: '/api/webhook/emails',
  calendar: '/api/webhook/calendar',
  chat: '/api/webhook/chat'
}