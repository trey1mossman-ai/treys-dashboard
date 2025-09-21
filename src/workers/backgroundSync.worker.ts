const DEFAULT_INTERVAL = 5 * 60 * 1000

interface SyncTask {
  resource: string
  payload?: unknown
}

type WorkerMessage =
  | { type: 'enqueue'; task: SyncTask }
  | { type: 'flush' }
  | { type: 'configure'; interval: number }

const queue: SyncTask[] = []
let flushTimer: number | null = null
let interval = DEFAULT_INTERVAL

function scheduleFlush() {
  if (flushTimer !== null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushQueue()
  }, interval) as unknown as number
}

async function flushQueue() {
  if (queue.length === 0) return

  const tasks = queue.splice(0, queue.length)

  for (const task of tasks) {
    self.postMessage({ type: 'sync:start', task })
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      })
      self.postMessage({ type: 'sync:success', task })
    } catch (error) {
      queue.push(task)
      self.postMessage({
        type: 'sync:error',
        task,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  if (queue.length > 0) {
    scheduleFlush()
  }
}

self.addEventListener('message', event => {
  const data = event.data as WorkerMessage
  switch (data.type) {
    case 'enqueue':
      queue.push(data.task)
      scheduleFlush()
      break
    case 'flush':
      void flushQueue()
      break
    case 'configure':
      interval = Math.max(1_000, data.interval)
      if (flushTimer !== null) {
        clearTimeout(flushTimer)
        flushTimer = null
      }
      scheduleFlush()
      break
    default:
      break
  }
})

self.addEventListener('push', () => {
  self.postMessage({ type: 'notification:received' })
})
