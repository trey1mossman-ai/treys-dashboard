import { z } from 'zod'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

interface RequestOptions extends RequestInit {
  params?: Record<string, string>
  skipCache?: boolean
  cacheTime?: number
}

interface CacheEntry {
  data: any
  timestamp: number
}

class ApiClient {
  private baseURL: string
  private cache = new Map<string, CacheEntry>()
  private pendingRequests = new Map<string, Promise<any>>()
  private defaultCacheTime = 5 * 60 * 1000 // 5 minutes
  
  constructor(baseURL: string) {
    this.baseURL = baseURL
  }
  
  private getCacheKey(endpoint: string, options: RequestOptions = {}): string {
    const params = options.params ? JSON.stringify(options.params) : ''
    return `${options.method || 'GET'}:${endpoint}:${params}`
  }
  
  private async requestWithRetry(
    url: string,
    options: RequestInit,
    retries = 3
  ): Promise<Response> {
    try {
      const response = await fetch(url, options)
      
      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        return response
      }
      
      // Retry on server errors (5xx) or network errors
      if (!response.ok && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries))) // Exponential backoff
        return this.requestWithRetry(url, options, retries - 1)
      }
      
      return response
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)))
        return this.requestWithRetry(url, options, retries - 1)
      }
      throw error
    }
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
    schema?: z.ZodSchema<T>
  ): Promise<T> {
    const { params, skipCache, cacheTime = this.defaultCacheTime, ...fetchOptions } = options
    
    let url = `${this.baseURL}${endpoint}`
    if (params) {
      const searchParams = new URLSearchParams(params)
      url += `?${searchParams.toString()}`
    }
    
    const cacheKey = this.getCacheKey(endpoint, options)
    
    // Check cache for GET requests
    if (!skipCache && fetchOptions.method === 'GET') {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        return cached.data
      }
    }
    
    // Check for pending request (request deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)
    }
    
    // Create request promise
    const requestPromise = (async () => {
      try {
        const response = await this.requestWithRetry(url, {
          ...fetchOptions,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
        })
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        
        // Validate with schema if provided
        const result = schema ? schema.parse(data) : data as T
        
        // Cache successful GET requests
        if (fetchOptions.method === 'GET') {
          this.cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          })
        }
        
        return result
      } finally {
        this.pendingRequests.delete(cacheKey)
      }
    })()
    
    this.pendingRequests.set(cacheKey, requestPromise)
    return requestPromise
  }
  
  get<T>(endpoint: string, options?: RequestOptions, schema?: z.ZodSchema<T>) {
    return this.request<T>(endpoint, { ...options, method: 'GET' }, schema)
  }
  
  post<T>(endpoint: string, body?: any, options?: RequestOptions, schema?: z.ZodSchema<T>) {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      },
      schema
    )
  }
  
  put<T>(endpoint: string, body?: any, options?: RequestOptions, schema?: z.ZodSchema<T>) {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      },
      schema
    )
  }
  
  delete<T>(endpoint: string, options?: RequestOptions, schema?: z.ZodSchema<T>) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' }, schema)
  }
  
  // Clear cache methods
  clearCache(endpoint?: string) {
    if (endpoint) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.includes(endpoint)
      )
      keysToDelete.forEach(key => this.cache.delete(key))
    } else {
      this.cache.clear()
    }
  }
  
  // Prefetch method for warming cache
  async prefetch(endpoint: string, options?: RequestOptions) {
    return this.get(endpoint, { ...options, skipCache: false })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
