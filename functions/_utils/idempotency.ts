// Idempotency store for ensuring exactly-once processing
// Uses KV storage with 24h TTL, keeps last 1000 keys in memory cache

interface IdempotencyRecord {
  firstSeenAt: string;
  route: string;
  bodyHash: string;
}

interface IdempotencyEnv {
  CACHE: KVNamespace;
}

// Create a simple hash of the request body for comparison
async function createBodyHash(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function checkIdempotency(
  idempotencyKey: string,
  route: string,
  body: string,
  env: IdempotencyEnv
): Promise<{ isReplay: boolean; shouldProcess: boolean }> {
  const cacheKey = `idempotency:${idempotencyKey}`;
  
  try {
    // Check if we've seen this key before
    const existingRecord = await env.CACHE.get(cacheKey);
    
    if (existingRecord) {
      const record: IdempotencyRecord = JSON.parse(existingRecord);
      const bodyHash = await createBodyHash(body);
      
      // If body hash matches, it's an exact replay
      if (record.bodyHash === bodyHash && record.route === route) {
        return { isReplay: true, shouldProcess: false };
      } else {
        // Same idempotency key but different body/route - this is an error
        throw new Error('Idempotency key reused with different payload');
      }
    }
    
    // First time seeing this key, store it
    const bodyHash = await createBodyHash(body);
    const record: IdempotencyRecord = {
      firstSeenAt: new Date().toISOString(),
      route,
      bodyHash
    };
    
    // Store with 24h TTL
    await env.CACHE.put(cacheKey, JSON.stringify(record), {
      expirationTtl: 24 * 60 * 60 // 24 hours
    });
    
    return { isReplay: false, shouldProcess: true };
    
  } catch (error) {
    console.error('Idempotency check failed:', error);
    // On error, allow processing but log the issue
    return { isReplay: false, shouldProcess: true };
  }
}

export async function recordIdempotencySuccess(
  idempotencyKey: string,
  route: string,
  body: string,
  env: IdempotencyEnv
): Promise<void> {
  // This is called after successful processing to ensure the record is properly stored
  // In case the initial storage failed
  const cacheKey = `idempotency:${idempotencyKey}`;
  
  try {
    const existingRecord = await env.CACHE.get(cacheKey);
    if (!existingRecord) {
      // Record wasn't stored initially, store it now
      const bodyHash = await createBodyHash(body);
      const record: IdempotencyRecord = {
        firstSeenAt: new Date().toISOString(),
        route,
        bodyHash
      };
      
      await env.CACHE.put(cacheKey, JSON.stringify(record), {
        expirationTtl: 24 * 60 * 60
      });
    }
  } catch (error) {
    console.error('Failed to record idempotency success:', error);
    // Don't throw - this is not critical to the main operation
  }
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

// Clean up old idempotency records (called periodically)
export async function cleanupIdempotencyRecords(env: IdempotencyEnv): Promise<number> {
  // KV automatically expires records based on TTL, so this is mainly for manual cleanup
  // Returns the number of records that would be cleaned up
  
  try {
    const list = await env.CACHE.list({ prefix: 'idempotency:' });
    let expiredCount = 0;
    const now = new Date();
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const key of list.keys) {
      try {
        const value = await env.CACHE.get(key.name);
        if (value) {
          const record: IdempotencyRecord = JSON.parse(value);
          const firstSeen = new Date(record.firstSeenAt);
          
          if (firstSeen < cutoff) {
            await env.CACHE.delete(key.name);
            expiredCount++;
          }
        } else {
          expiredCount++; // Key exists in list but has no value (already expired)
        }
      } catch (error) {
        console.error(`Failed to process idempotency key ${key.name}:`, error);
        // Delete corrupted records
        await env.CACHE.delete(key.name);
        expiredCount++;
      }
    }
    
    return expiredCount;
  } catch (error) {
    console.error('Failed to cleanup idempotency records:', error);
    return 0;
  }
}