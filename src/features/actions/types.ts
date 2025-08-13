export interface QuickAction {
  id: string;
  name: string;
  method: 'GET' | 'POST';
  webhook_url: string;
  headers?: Record<string, string>;
  default_payload?: any;
  created_at?: string;
}

export interface ExecActionRequest {
  payload?: any;
}

export interface ExecActionResponse {
  ok: boolean;
  id?: string;
  status?: number;
  data?: any;
  error?: string;
}