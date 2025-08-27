import { json } from '../../_utils/json';
import { corsHeaders, handleOptions } from '../../_utils/cors';

export interface Env {
  CACHE: KVNamespace;
}

export interface EmailData {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  preview?: string;
  body?: string;
  isRead?: boolean;
  isImportant?: boolean;
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  try {
    let body = await request.json();
    console.log('Email webhook received:', JSON.stringify(body));
    
    // Handle various n8n formats
    let emails = null;
    
    // If body is already the emails array
    if (Array.isArray(body)) {
      emails = body;
    }
    // If body.emails exists
    else if (body.emails) {
      emails = body.emails;
      // If emails is a string, parse it
      if (typeof emails === 'string') {
        try {
          const parsed = JSON.parse(emails);
          emails = parsed.emails || parsed;
        } catch (e) {
          console.log('Could not parse emails string');
        }
      }
    }
    // If body has a property with empty key containing stringified data
    else if (body['']) {
      console.log('Found n8n empty key format');
      try {
        const parsed = JSON.parse(body['']);
        emails = parsed.emails || parsed;
      } catch (e) {
        console.log('Could not parse empty key data:', e);
      }
    }
    // If body has other common keys
    else if (body.data) {
      emails = body.data;
    }
    // If body is the email object itself
    else if (body.id && (body.subject || body.from)) {
      emails = [body];
    }
    
    // Ensure emails is an array
    if (!Array.isArray(emails)) {
      emails = emails ? [emails] : [];
    }
    
    // Normalize email fields (handle both 'preview' and 'snippet') 
    // Keep original timestamp fields from email, don't override them
    emails = emails.map((email: any) => ({
      ...email,
      preview: email.preview || email.snippet || email.body?.substring(0, 200) || '',
      snippet: email.snippet || email.preview,
      // Preserve all timestamp fields: sentDate, timestamp, date
      sentDate: email.sentDate,
      timestamp: email.timestamp,
      date: email.date || email.sentDate || email.timestamp || new Date().toISOString()
    }))
    
    // Store with timestamp
    const emailData = {
      emails: emails,
      timestamp: new Date().toISOString(),
      source: 'n8n'
    };
    
    // Store in KV (expires in 1 hour)
    await env.CACHE.put('recent-emails', JSON.stringify(emailData), {
      expirationTtl: 3600
    });
    
    console.log(`Stored ${emailData.emails.length} emails from n8n`);
    
    return json({
      success: true,
      message: `Received ${emailData.emails.length} emails`,
      count: emailData.emails.length
    });
    
  } catch (error: any) {
    console.error('Email webhook error:', error);
    return json({
      success: false,
      error: error.message
    }, 500);
  }
}

export async function onRequestGet(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { env } = context;
  
  try {
    // Retrieve emails from KV
    const emailData = await env.CACHE.get('recent-emails');
    
    if (!emailData) {
      return new Response(JSON.stringify({
        emails: [],
        message: 'No recent emails available'
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    return new Response(emailData, {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error: any) {
    console.error('Error retrieving emails:', error);
    return new Response(JSON.stringify({
      emails: [],
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

export async function onRequestOptions(context: { request: Request; env: Env }) {
  return handleOptions(context.env);
}