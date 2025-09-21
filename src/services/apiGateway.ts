import { apiClient } from '@/services/apiClient'

type RequestOptions = Parameters<typeof apiClient.get>[1]

type GatewayOptions = {
  ttl?: number
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  cacheKey?: string
}

interface CacheEntry {
  value: unknown
  expires: number
}

export class APIGateway {
  private pending = new Map<string, Promise<any>>()
  private cache = new Map<string, CacheEntry>()
  private failureCount = 0
  private circuitOpenUntil = 0
  private readonly breakerThreshold = 5
  private readonly breakerCooldown = 30_000

  async request<T = unknown>(
    endpoint: string,
    options: RequestOptions = {},
    gatewayOptions: GatewayOptions = {}
  ): Promise<T> {
    const method = gatewayOptions.method ?? 'GET'
    const cacheKey = gatewayOptions.cacheKey || this.createCacheKey(endpoint, method, options)

    if (gatewayOptions.ttl) {
      const cached = this.cache.get(cacheKey)
      if (cached && cached.expires > Date.now()) {
        return cached.value as T
      }
    }

    if (Date.now() < this.circuitOpenUntil) {
      throw new Error('API circuit breaker open')
    }

    if (this.pending.has(cacheKey)) {
      return this.pending.get(cacheKey) as Promise<T>
    }

    const requestPromise = this.executeRequest<T>(endpoint, options, method)
      .then(result => {
        this.failureCount = 0
        if (gatewayOptions.ttl) {
          this.cache.set(cacheKey, {
            value: result,
            expires: Date.now() + gatewayOptions.ttl
          })
        }
        return result
      })
      .catch(error => {
        this.failureCount += 1
        if (this.failureCount >= this.breakerThreshold) {
          this.circuitOpenUntil = Date.now() + this.breakerCooldown
        }
        throw error
      })
      .finally(() => {
        this.pending.delete(cacheKey)
      })

    this.pending.set(cacheKey, requestPromise)
    return requestPromise
  }

  clearCache(prefix?: string) {
    if (!prefix) {
      this.cache.clear()
      return
    }

    Array.from(this.cache.keys()).forEach(key => {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    })
  }

  /**
   * Simple batching helper. It relies on the backend supporting an array of keys.
   */
  async batch<T = unknown>(
    endpoint: string,
    keys: string[],
    options: RequestOptions = {},
    gatewayOptions: GatewayOptions = {}
  ): Promise<Record<string, T>> {
    const response = await this.request<Record<string, T>>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify({ keys, options: options?.params }),
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      }
    }, {
      ...gatewayOptions,
      method: 'POST'
    })

    return response
  }

  private async executeRequest<T>(endpoint: string, options: RequestOptions, method: string) {
    const body = (options as any)?.body
    switch (method) {
      case 'GET':
        return apiClient.get<T>(endpoint, options)
      case 'POST':
        return apiClient.post<T>(endpoint, typeof body === 'string' ? JSON.parse(body) : body, options)
      case 'PUT':
        return apiClient.put<T>(endpoint, typeof body === 'string' ? JSON.parse(body) : body, options)
      case 'DELETE':
        return apiClient.delete<T>(endpoint, options)
      default:
        throw new Error(`Unsupported method: ${method}`)
    }
  }

  private createCacheKey(endpoint: string, method: string, options: RequestOptions = {}) {
    const params = options?.params ? JSON.stringify(options.params) : ''
    const body = options?.body ? JSON.stringify(options.body) : ''
    return `${method}:${endpoint}:${params}:${body}`
  }
}

export const apiGateway = new APIGateway()
