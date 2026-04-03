'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const inflight = new Map<string, Promise<any>>();
const DEFAULT_TTL = 30_000; // 30 seconds

function getCacheKey(fetcher: Function): string {
  return fetcher.toString();
}

interface UseApiOptions {
  /** Cache TTL in milliseconds (default: 30s). Set to 0 to disable caching. */
  ttl?: number;
  /** Custom cache key. Defaults to fetcher.toString(). */
  cacheKey?: string;
}

interface UseApiResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  options?: UseApiOptions,
): UseApiResult<T> {
  const ttl = options?.ttl ?? DEFAULT_TTL;
  const keyRef = useRef(options?.cacheKey || getCacheKey(fetcher));
  const [data, setData] = useState<T | null>(() => {
    // Initialize from cache if available
    const key = keyRef.current;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(data === null);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const doFetch = useCallback(
    async (showLoading = true) => {
      const key = keyRef.current;

      // Check cache
      const cached = cache.get(key);
      if (cached && Date.now() - cached.timestamp < ttl) {
        setData(cached.data);
        setIsLoading(false);
        return;
      }

      // Show cached data while revalidating (stale-while-revalidate)
      if (cached) {
        setData(cached.data);
      }

      if (showLoading && !cached) {
        setIsLoading(true);
      }

      try {
        // Deduplicate: if this exact request is already in flight, wait for it
        let promise = inflight.get(key);
        if (!promise) {
          promise = fetcher();
          inflight.set(key, promise);
        }

        const result = await promise;
        inflight.delete(key);

        // Update cache
        cache.set(key, { data: result, timestamp: Date.now() });

        if (mountedRef.current) {
          setData(result);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        inflight.delete(key);
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    },
    [fetcher, ttl],
  );

  useEffect(() => {
    mountedRef.current = true;
    doFetch();
    return () => {
      mountedRef.current = false;
    };
  }, [doFetch]);

  const refetch = useCallback(() => {
    // Invalidate cache and refetch
    const key = keyRef.current;
    cache.delete(key);
    doFetch(true);
  }, [doFetch]);

  return { data, isLoading, error, refetch };
}

/** Invalidate all cached entries */
export function invalidateCache(keyPattern?: string) {
  if (!keyPattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(keyPattern)) {
      cache.delete(key);
    }
  }
}
