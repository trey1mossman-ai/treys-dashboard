import Dexie, { Table } from 'dexie';
import CryptoJS from 'crypto-js';

interface Pattern {
  id?: number;
  type: string;
  subtype?: string;
  description: string;
  confidence: number;
  lastSeen: Date;
  metadata?: any;
}

interface CachedResponse {
  id?: number;
  hash: string;
  prompt?: string;
  response: any;
  model?: string;
  tokens?: number;
  timestamp: number;
  hitCount: number;
}

interface LifeEvent {
  id?: number;
  timestamp: number;
  type: string;
  data: any;
  processed: boolean;
  userId?: string;
}

interface Decision {
  id?: number;
  timestamp: number;
  type: string;
  input: any;
  output: any;
  feedback: 'success' | 'failure';
  confidence?: number;
}

class LocalBrain extends Dexie {
  patterns!: Table<Pattern>;
  cache!: Table<CachedResponse>;
  events!: Table<LifeEvent>;
  decisions!: Table<Decision>;
  
  constructor() {
    super('LifeOS');
    
    this.version(1).stores({
      patterns: '++id, type, confidence, lastSeen, [type+subtype]',
      cache: '++id, hash, response, timestamp, hitCount',
      events: '++id, timestamp, type, data, processed',
      decisions: '++id, timestamp, type, input, output, feedback'
    });
  }
  
  // Aggressive caching with 80% hit rate target
  async getCached(prompt: string): Promise<any | null> {
    const hash = CryptoJS.SHA256(this.normalizePrompt(prompt)).toString();
    const cached = await this.cache.where('hash').equals(hash).first();
    
    if (cached && Date.now() - cached.timestamp < Number(import.meta.env.VITE_CACHE_TTL || 86400) * 1000) {
      await this.cache.update(cached.id!, { hitCount: cached.hitCount + 1 });
      return cached.response;
    }
    return null;
  }
  
  async storeCache(prompt: string, response: any, model?: string, tokens?: number): Promise<void> {
    const hash = CryptoJS.SHA256(this.normalizePrompt(prompt)).toString();
    
    // Update existing or create new
    const existing = await this.cache.where('hash').equals(hash).first();
    if (existing) {
      await this.cache.update(existing.id!, { 
        response, 
        timestamp: Date.now(),
        model,
        tokens
      });
    } else {
      await this.cache.add({
        hash,
        prompt: this.sanitizeForStorage(prompt),
        response,
        model,
        tokens,
        timestamp: Date.now(),
        hitCount: 0
      });
    }
  }
  
  normalizePrompt(prompt: string): string {
    // Strip timestamps, normalize spacing, remove PII
    return prompt
      .toLowerCase()
      .replace(/\d{1,2}:\d{2}/g, '[TIME]')
      .replace(/\d{4}-\d{2}-\d{2}/g, '[DATE]')
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[PERSON]')
      .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]')
      .replace(/\b[\w._%+-]+@[\w.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  private sanitizeForStorage(prompt: string): string {
    // More aggressive PII removal for storage
    return prompt
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[PERSON]')
      .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]')
      .replace(/\b[\w._%+-]+@[\w.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{1,5}\s\w+\s(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b/gi, '[ADDRESS]')
      .substring(0, 500); // Limit storage size
  }
  
  async logEvent(type: string, data: any): Promise<void> {
    await this.events.add({
      timestamp: Date.now(),
      type,
      data: this.sanitizeForStorage(JSON.stringify(data)),
      processed: false
    });
  }
  
  async logDecision(type: string, input: any, output: any, feedback: 'success' | 'failure'): Promise<void> {
    await this.decisions.add({
      timestamp: Date.now(),
      type,
      input: this.sanitizeForStorage(JSON.stringify(input)),
      output: this.sanitizeForStorage(JSON.stringify(output)),
      feedback
    });
  }
  
  async getCacheStats(): Promise<{ hitRate: number; totalCached: number; oldestEntry: Date | null }> {
    const total = await this.cache.count();
    const withHits = await this.cache.where('hitCount').above(0).count();
    const oldest = await this.cache.orderBy('timestamp').first();
    
    return {
      hitRate: total > 0 ? withHits / total : 0,
      totalCached: total,
      oldestEntry: oldest ? new Date(oldest.timestamp) : null
    };
  }
  
  async cleanupOldCache(): Promise<void> {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoff = Date.now() - maxAge;
    
    await this.cache.where('timestamp').below(cutoff).delete();
  }
}

export const localBrain = new LocalBrain();
export type { Pattern, CachedResponse, LifeEvent, Decision };