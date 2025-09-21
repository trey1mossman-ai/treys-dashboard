-- Seed essential quick actions for n8n integrations
INSERT OR IGNORE INTO quick_actions (id, name, method, webhook_url, default_payload_json, created_at)
VALUES
  (
    'email-refresh',
    'Refresh Emails',
    'POST',
    'https://flow.voxemarketing.com/webhook/c14a535e-80bf-4bd9-9b3d-1001e6917d85',
    '{}',
    CURRENT_TIMESTAMP
  ),
  (
    'calendar-sync',
    'Sync Calendar',
    'POST',
    'https://flow.voxemarketing.com/webhook/f4fd2f67-df3b-4ee2-b426-944e51d01f28',
    '{}',
    CURRENT_TIMESTAMP
  );
