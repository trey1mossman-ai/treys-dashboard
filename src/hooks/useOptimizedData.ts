// Optimized Data Hook - Performance Foundation
// Team Lead: Claude - Day 3-4 Implementation
// Simplified version without external dependencies

import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/services/db';

interface UseOptimizedDataOptions {
  cacheKey?: string;
  ttl?: number; // Time to live in seconds
  staleTime?: number; // Time before data is considered stale
  refetchInterval?: number | false;
  enabled?: boolean;
}

interface UseOptimizedDataReturn<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

export function useOptimizedData<T>(
  queryKey: string | string[],
  fetcher: () => Promise<T>,
  options?: UseOptimizedDataOptions
): UseOptimizedDataReturn<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const abortControllerRef = useRef<AbortController>();
  const lastFetchTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const actualQueryKey = Array.isArray(queryKey) ? queryKey : [queryKey];
  const cacheKey = options?.cacheKey || actualQueryKey.join(':');
  const ttl = options?.ttl || 300; // Default 5 minutes
  const staleTime = options?.staleTime || 60; // Default 1 minute
  const enabled = options?.enabled !== false;

  const checkIfStale = useCallback(() => {
    if (!lastFetchTimeRef.current) return true;
    const now = Date.now();
    const timeSinceLastFetch = (now - lastFetchTimeRef.current) / 1000;
    return timeSinceLastFetch > staleTime;
  }, [staleTime]);

  const fetchData = useCallback(async (isRetry = false) => {
    if (!enabled && !isRetry) return;

    try {
      // Cancel any pending request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      // Try to get cached data first
      if (!isRetry && db) {
        try {
          const cached = await db.cache.where('key').equals(cacheKey).first();
          if (cached && cached.data) {
            const cachedTime = cached.timestamp instanceof Date ? cached.timestamp.getTime() : cached.timestamp;
            const age = (Date.now() - cachedTime) / 1000;
            if (age < ttl) {
              setData(cached.data as T);
              lastFetchTimeRef.current = cachedTime;
              setIsStale(age > staleTime);

              // If stale, refresh in background
              if (age > staleTime) {
                fetchData(true);
              }

              setIsLoading(false);
              return;
            }
          }
        } catch (cacheError) {
          console.warn('Cache read failed:', cacheError);
        }
      }

      // Fetch fresh data
      const result = await fetcher();

      if (!abortControllerRef.current?.signal.aborted) {
        setData(result);
        lastFetchTimeRef.current = Date.now();
        setIsStale(false);

        // Cache the result
        if (db) {
          try {
            await db.cache.put({
              key: cacheKey,
              data: result as any,
              timestamp: Date.now() as any,
              type: 'api'
            });
          } catch (cacheError) {
            console.warn('Cache write failed:', cacheError);
          }
        }
      }
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        setError(err as Error);
        console.error('Fetch error:', err);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [enabled, cacheKey, ttl, staleTime, fetcher]);

  // Initial fetch
  useEffect(() => {
    fetchData();

    // Set up refetch interval if specified
    if (options?.refetchInterval && options.refetchInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchData(true);
      }, options.refetchInterval);
    }

    return () => {
      abortControllerRef.current?.abort();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [cacheKey]); // Only refetch if cache key changes

  // Check staleness periodically
  useEffect(() => {
    const checkInterval = setInterval(() => {
      setIsStale(checkIfStale());
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkInterval);
  }, [checkIfStale]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
    isStale
  };
}

// Mutation hook for optimistic updates
export function useOptimisticMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    optimisticUpdate?: (variables: TVariables) => void;
    rollback?: (variables: TVariables) => void;
  }
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (variables: TVariables) => {
    setIsLoading(true);
    setError(null);

    // Apply optimistic update
    if (options?.optimisticUpdate) {
      options.optimisticUpdate(variables);
    }

    try {
      const result = await mutationFn(variables);
      if (options?.onSuccess) {
        options.onSuccess(result, variables);
      }
      return result;
    } catch (err) {
      setError(err as Error);

      // Rollback on error
      if (options?.rollback) {
        options.rollback(variables);
      }

      if (options?.onError) {
        options.onError(err as Error, variables);
      }

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, options]);

  return {
    mutate,
    isLoading,
    error
  };
}