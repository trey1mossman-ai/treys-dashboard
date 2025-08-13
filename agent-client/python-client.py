import hashlib
import hmac
import json
import time
import uuid
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

class ErrorCode(Enum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    RETRY = "RETRY"
    INTERNAL = "INTERNAL"

@dataclass
class CommandResult:
    ok: bool
    tool: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    warning: Optional[str] = None
    error: Optional[Dict[str, str]] = None

class AgentCommandError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(f"{code}: {message}")

class AgentCommandClient:
    """
    Python client for the Agent Command API
    Handles authentication, signing, and retry logic
    """
    
    def __init__(
        self,
        base_url: str,
        service_token: str,
        hmac_secret: str,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        timeout: int = 30
    ):
        self.base_url = base_url.rstrip('/')
        self.service_token = service_token
        self.hmac_secret = hmac_secret.encode('utf-8')
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.timeout = timeout
        
        # Configure session with retry strategy
        self.session = requests.Session()
        retry_strategy = Retry(
            total=0,  # We handle retries ourselves
            backoff_factor=0,
            status_forcelist=[]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
    
    def execute(
        self,
        tool: str,
        args: Dict[str, Any],
        idempotency_key: Optional[str] = None,
        dry_run: bool = False
    ) -> CommandResult:
        """
        Execute a command with automatic retry logic
        """
        idempotency_key = idempotency_key or str(uuid.uuid4())
        
        last_error = None
        for attempt in range(self.max_retries + 1):
            try:
                result = self._send_command(tool, args, idempotency_key, dry_run)
                
                if result.ok:
                    return result
                
                # Handle specific error codes
                if result.error and result.error.get('code') == 'RETRY':
                    if attempt < self.max_retries:
                        delay = self.retry_delay * (2 ** attempt)
                        print(f"Retry {attempt + 1}/{self.max_retries} after {delay}s: {result.error.get('message')}")
                        time.sleep(delay)
                        continue
                
                # Don't retry on these errors
                if result.error and result.error.get('code') in [
                    'VALIDATION_ERROR', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT'
                ]:
                    raise AgentCommandError(result.error['code'], result.error['message'])
                
                last_error = result.error
                
            except (requests.RequestException, json.JSONDecodeError) as e:
                # Network or parsing errors - retry
                if attempt < self.max_retries:
                    delay = self.retry_delay * (2 ** attempt)
                    print(f"Retry {attempt + 1}/{self.max_retries} after {delay}s: {str(e)}")
                    time.sleep(delay)
                    last_error = {'code': 'INTERNAL', 'message': str(e)}
                else:
                    raise AgentCommandError('INTERNAL', str(e))
        
        error_msg = last_error.get('message', 'Unknown error') if last_error else 'Max retries exceeded'
        raise AgentCommandError('RETRY', f"Max retries exceeded: {error_msg}")
    
    def _send_command(
        self,
        tool: str,
        args: Dict[str, Any],
        idempotency_key: str,
        dry_run: bool
    ) -> CommandResult:
        """
        Send a single command request
        """
        timestamp = int(time.time())
        body = json.dumps({
            'tool': tool,
            'args': args,
            'dryRun': dry_run
        })
        
        # Generate HMAC signature
        signature = hmac.new(
            self.hmac_secret,
            body.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.service_token}',
            'X-Signature': f'sha256={signature}',
            'X-TS': str(timestamp),
            'X-Idempotency-Key': idempotency_key
        }
        
        response = self.session.post(
            f'{self.base_url}/api/agent/command',
            headers=headers,
            data=body,
            timeout=self.timeout
        )
        
        data = response.json()
        return CommandResult(**data)
    
    # Convenience methods
    
    def create_agenda_item(
        self,
        date: str,
        title: str,
        start_ts: int,
        end_ts: int,
        tag: Optional[str] = None,
        notes: Optional[str] = None
    ) -> CommandResult:
        args = {
            'date': date,
            'title': title,
            'start_ts': start_ts,
            'end_ts': end_ts
        }
        if tag:
            args['tag'] = tag
        if notes:
            args['notes'] = notes
        return self.execute('agenda.create', args)
    
    def update_agenda_item(self, id: str, patch: Dict[str, Any]) -> CommandResult:
        return self.execute('agenda.update', {'id': id, 'patch': patch})
    
    def delete_agenda_item(self, id: str) -> CommandResult:
        return self.execute('agenda.delete', {'id': id})
    
    def list_agenda_by_date(self, date: str) -> CommandResult:
        return self.execute('agenda.listByDate', {'date': date})
    
    def create_task(
        self,
        title: str,
        due_ts: Optional[int] = None,
        source: Optional[str] = None
    ) -> CommandResult:
        args = {'title': title}
        if due_ts:
            args['due_ts'] = due_ts
        if source:
            args['source'] = source
        return self.execute('tasks.create', args)
    
    def toggle_task(self, id: str, status: str) -> CommandResult:
        return self.execute('tasks.toggle', {'id': id, 'status': status})
    
    def create_note(self, body: str, tag: Optional[str] = None) -> CommandResult:
        args = {'body': body}
        if tag:
            args['tag'] = tag
        return self.execute('notes.create', args)
    
    def archive_note(self, id: str) -> CommandResult:
        return self.execute('notes.archive', {'id': id})
    
    def update_metrics(
        self,
        date: str,
        work_actual: Optional[float] = None,
        gym_actual: Optional[float] = None,
        nutrition_actual: Optional[float] = None
    ) -> CommandResult:
        args = {'date': date}
        if work_actual is not None:
            args['work_actual'] = work_actual
        if gym_actual is not None:
            args['gym_actual'] = gym_actual
        if nutrition_actual is not None:
            args['nutrition_actual'] = nutrition_actual
        return self.execute('metrics.update', args)
    
    def log_training(self, entries: list) -> CommandResult:
        return self.execute('trainer.log', {'entries': entries})


# Example usage
if __name__ == "__main__":
    import os
    from datetime import datetime, timedelta
    
    # Initialize client
    client = AgentCommandClient(
        base_url=os.getenv('AGENT_BASE_URL', 'https://your-app.pages.dev'),
        service_token=os.getenv('AGENT_SERVICE_TOKEN', 'your-service-token'),
        hmac_secret=os.getenv('AGENT_HMAC_SECRET', 'your-hmac-secret')
    )
    
    # Example: Create an agenda item for tomorrow
    tomorrow = datetime.now() + timedelta(days=1)
    date_str = tomorrow.strftime('%Y-%m-%d')
    start_time = tomorrow.replace(hour=9, minute=0, second=0)
    end_time = tomorrow.replace(hour=11, minute=0, second=0)
    
    try:
        result = client.create_agenda_item(
            date=date_str,
            title="Deep Work Session",
            start_ts=int(start_time.timestamp()),
            end_ts=int(end_time.timestamp()),
            tag="work",
            notes="Focus on API development"
        )
        
        if result.ok:
            print(f"Created agenda item: {result.result}")
        else:
            print(f"Error: {result.error}")
            
    except AgentCommandError as e:
        print(f"Command failed: {e}")
    
    # Example: Create a task
    try:
        result = client.create_task(
            title="Review pull requests",
            due_ts=int((datetime.now() + timedelta(days=2)).timestamp()),
            source="agent"
        )
        
        if result.ok:
            print(f"Created task: {result.result}")
            
    except AgentCommandError as e:
        print(f"Command failed: {e}")