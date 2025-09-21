import { handleOptions, jsonResponse } from '../../_utils/cors';

interface Env {
  CACHE: KVNamespace;
}

const EMAIL_CACHE_KEY = 'recent-emails';
const CALENDAR_CACHE_KEY = 'calendar-events';

type StoredPayload = {
  emails?: any[];
  events?: any[];
  timestamp?: string;
  processedAt?: string;
  count?: number;
};

export async function onRequestGet(context: { env: Env }): Promise<Response> {
  const { env } = context;

  try {
    const [emailRaw, calendarRaw] = await Promise.all([
      env.CACHE.get(EMAIL_CACHE_KEY),
      env.CACHE.get(CALENDAR_CACHE_KEY)
    ]);

    const parse = (raw: string | null): StoredPayload => {
      if (!raw) return {};
      try {
        return JSON.parse(raw) as StoredPayload;
      } catch (error) {
        console.error('Failed to parse cached webhook payload:', error);
        return {};
      }
    };

    const emailPayload = parse(emailRaw);
    const calendarPayload = parse(calendarRaw);

    const summary = {
      success: true,
      emails: {
        lastUpdatedAt: emailPayload.timestamp || emailPayload.processedAt || null,
        count: Array.isArray(emailPayload.emails)
          ? emailPayload.emails.length
          : typeof emailPayload.count === 'number'
            ? emailPayload.count
            : 0
      },
      calendar: {
        lastUpdatedAt: calendarPayload.timestamp || null,
        count: Array.isArray(calendarPayload.events)
          ? calendarPayload.events.length
          : typeof calendarPayload.count === 'number'
            ? calendarPayload.count
            : 0
      }
    };

    return jsonResponse(summary, 200, env);
  } catch (error: any) {
    console.error('Status endpoint error:', error);
    return jsonResponse({
      success: false,
      error: error.message || 'Unable to load webhook status'
    }, 500, env);
  }
}

export async function onRequestOptions(context: { env: Env }) {
  return handleOptions(context.env);
}
