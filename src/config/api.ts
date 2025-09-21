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

  // n8n proxy endpoints
  n8nChat: `${API_BASE}/api/n8n/chat`,
  n8nEmailDigest: `${API_BASE}/api/n8n/email-digest`,
  n8nCalendarSummary: `${API_BASE}/api/n8n/calendar-summary`,

  // Project endpoints
  projectUpload: `${API_BASE}/api/projects/upload`,

  // AI endpoints
  aiEmailAssistant: `${API_BASE}/api/ai/email-assistant`,
}

// n8n Webhook URLs (direct, not proxied)
export const N8N_WEBHOOKS = {
  email: 'https://flow.voxemarketing.com/webhook/c14a535e-80bf-4bd9-9b3d-1001e6917d85',
  calendar: 'https://flow.voxemarketing.com/webhook/f4fd2f67-df3b-4ee2-b426-944e51d01f28',
  chat: 'https://flow.voxemarketing.com/webhook/c0552eb4-8ed7-4a46-b141-492ba7fefd04/chat'
}