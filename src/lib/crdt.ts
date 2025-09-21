/**
 * CRDT (Conflict-free Replicated Data Type) Implementation - Day 3
 * Enables conflict-free collaborative editing
 */

import { v4 as uuidv4 } from 'uuid';

// Unique client ID for this session
const CLIENT_ID = uuidv4();

/**
 * Vector Clock for tracking causality
 */
export class VectorClock {
  private clock: Map<string, number>;

  constructor(initial?: Map<string, number>) {
    this.clock = initial ? new Map(initial) : new Map();
  }

  increment(clientId: string = CLIENT_ID): void {
    this.clock.set(clientId, (this.clock.get(clientId) || 0) + 1);
  }

  get(clientId: string): number {
    return this.clock.get(clientId) || 0;
  }

  merge(other: VectorClock): void {
    other.clock.forEach((value, key) => {
      this.clock.set(key, Math.max(this.get(key), value));
    });
  }

  happensBefore(other: VectorClock): boolean {
    let hasOneLess = false;
    
    for (const [key, value] of this.clock) {
      const otherValue = other.get(key);
      if (value > otherValue) return false;
      if (value < otherValue) hasOneLess = true;
    }
    
    // Check if other has keys we don't
    for (const key of other.clock.keys()) {
      if (!this.clock.has(key) && other.get(key) > 0) {
        hasOneLess = true;
      }
    }
    
    return hasOneLess;
  }

  concurrent(other: VectorClock): boolean {
    return !this.happensBefore(other) && !other.happensBefore(this);
  }

  equals(other: VectorClock): boolean {
    if (this.clock.size !== other.clock.size) return false;
    
    for (const [key, value] of this.clock) {
      if (other.get(key) !== value) return false;
    }
    
    return true;
  }

  toJSON(): Record<string, number> {
    return Object.fromEntries(this.clock);
  }

  static fromJSON(json: Record<string, number>): VectorClock {
    return new VectorClock(new Map(Object.entries(json)));
  }
}

/**
 * Last-Write-Wins Register
 */
export class LWWRegister<T> {
  private value: T;
  private timestamp: number;
  private clientId: string;

  constructor(value: T, timestamp: number = Date.now(), clientId: string = CLIENT_ID) {
    this.value = value;
    this.timestamp = timestamp;
    this.clientId = clientId;
  }

  set(value: T): void {
    this.value = value;
    this.timestamp = Date.now();
    this.clientId = CLIENT_ID;
  }

  get(): T {
    return this.value;
  }

  merge(other: LWWRegister<T>): void {
    if (other.timestamp > this.timestamp || 
        (other.timestamp === this.timestamp && other.clientId > this.clientId)) {
      this.value = other.value;
      this.timestamp = other.timestamp;
      this.clientId = other.clientId;
    }
  }

  toJSON() {
    return {
      value: this.value,
      timestamp: this.timestamp,
      clientId: this.clientId,
    };
  }

  static fromJSON<T>(json: any): LWWRegister<T> {
    return new LWWRegister(json.value, json.timestamp, json.clientId);
  }
}

/**
 * Grow-Only Set (G-Set)
 */
export class GSet<T> {
  private elements: Set<T>;

  constructor(elements?: Set<T>) {
    this.elements = elements || new Set();
  }

  add(element: T): void {
    this.elements.add(element);
  }

  has(element: T): boolean {
    return this.elements.has(element);
  }

  merge(other: GSet<T>): void {
    other.elements.forEach(element => this.elements.add(element));
  }

  toArray(): T[] {
    return Array.from(this.elements);
  }

  toJSON() {
    return Array.from(this.elements);
  }

  static fromJSON<T>(json: T[]): GSet<T> {
    return new GSet(new Set(json));
  }
}

/**
 * Two-Phase Set (2P-Set) - supports both add and remove
 */
export class TPSet<T> {
  private added: GSet<T>;
  private removed: GSet<T>;

  constructor(added?: GSet<T>, removed?: GSet<T>) {
    this.added = added || new GSet();
    this.removed = removed || new GSet();
  }

  add(element: T): void {
    this.added.add(element);
  }

  remove(element: T): void {
    if (this.added.has(element)) {
      this.removed.add(element);
    }
  }

  has(element: T): boolean {
    return this.added.has(element) && !this.removed.has(element);
  }

  merge(other: TPSet<T>): void {
    this.added.merge(other.added);
    this.removed.merge(other.removed);
  }

  toArray(): T[] {
    return this.added.toArray().filter(element => !this.removed.has(element));
  }

  toJSON() {
    return {
      added: this.added.toJSON(),
      removed: this.removed.toJSON(),
    };
  }

  static fromJSON<T>(json: any): TPSet<T> {
    return new TPSet(
      GSet.fromJSON(json.added),
      GSet.fromJSON(json.removed)
    );
  }
}

/**
 * Observed-Remove Set (OR-Set) - better than 2P-Set
 */
export class ORSet<T> {
  private elements: Map<T, Set<string>>;
  private tombstones: Map<T, Set<string>>;

  constructor() {
    this.elements = new Map();
    this.tombstones = new Map();
  }

  add(element: T): void {
    const uid = uuidv4();
    
    if (!this.elements.has(element)) {
      this.elements.set(element, new Set());
    }
    
    this.elements.get(element)!.add(uid);
  }

  remove(element: T): void {
    const uids = this.elements.get(element);
    
    if (uids) {
      if (!this.tombstones.has(element)) {
        this.tombstones.set(element, new Set());
      }
      
      uids.forEach(uid => this.tombstones.get(element)!.add(uid));
    }
  }

  has(element: T): boolean {
    const elementUids = this.elements.get(element) || new Set();
    const tombstoneUids = this.tombstones.get(element) || new Set();
    
    for (const uid of elementUids) {
      if (!tombstoneUids.has(uid)) {
        return true;
      }
    }
    
    return false;
  }

  merge(other: ORSet<T>): void {
    // Merge elements
    other.elements.forEach((uids, element) => {
      if (!this.elements.has(element)) {
        this.elements.set(element, new Set());
      }
      
      uids.forEach(uid => this.elements.get(element)!.add(uid));
    });
    
    // Merge tombstones
    other.tombstones.forEach((uids, element) => {
      if (!this.tombstones.has(element)) {
        this.tombstones.set(element, new Set());
      }
      
      uids.forEach(uid => this.tombstones.get(element)!.add(uid));
    });
  }

  toArray(): T[] {
    const result: T[] = [];
    
    this.elements.forEach((_, element) => {
      if (this.has(element)) {
        result.push(element);
      }
    });
    
    return result;
  }

  toJSON() {
    return {
      elements: Array.from(this.elements.entries()).map(([element, uids]) => ({
        element,
        uids: Array.from(uids),
      })),
      tombstones: Array.from(this.tombstones.entries()).map(([element, uids]) => ({
        element,
        uids: Array.from(uids),
      })),
    };
  }

  static fromJSON<T>(json: any): ORSet<T> {
    const set = new ORSet<T>();
    
    json.elements.forEach((item: any) => {
      set.elements.set(item.element, new Set(item.uids));
    });
    
    json.tombstones.forEach((item: any) => {
      set.tombstones.set(item.element, new Set(item.uids));
    });
    
    return set;
  }
}

/**
 * Grow-Only Counter (G-Counter)
 */
export class GCounter {
  private counts: Map<string, number>;

  constructor(counts?: Map<string, number>) {
    this.counts = counts || new Map();
  }

  increment(value: number = 1): void {
    this.counts.set(CLIENT_ID, (this.counts.get(CLIENT_ID) || 0) + value);
  }

  get(): number {
    let sum = 0;
    this.counts.forEach(count => sum += count);
    return sum;
  }

  merge(other: GCounter): void {
    other.counts.forEach((count, clientId) => {
      this.counts.set(clientId, Math.max(this.counts.get(clientId) || 0, count));
    });
  }

  toJSON() {
    return Object.fromEntries(this.counts);
  }

  static fromJSON(json: Record<string, number>): GCounter {
    return new GCounter(new Map(Object.entries(json)));
  }
}

/**
 * Positive-Negative Counter (PN-Counter)
 */
export class PNCounter {
  private positive: GCounter;
  private negative: GCounter;

  constructor(positive?: GCounter, negative?: GCounter) {
    this.positive = positive || new GCounter();
    this.negative = negative || new GCounter();
  }

  increment(value: number = 1): void {
    if (value >= 0) {
      this.positive.increment(value);
    } else {
      this.negative.increment(-value);
    }
  }

  decrement(value: number = 1): void {
    this.negative.increment(value);
  }

  get(): number {
    return this.positive.get() - this.negative.get();
  }

  merge(other: PNCounter): void {
    this.positive.merge(other.positive);
    this.negative.merge(other.negative);
  }

  toJSON() {
    return {
      positive: this.positive.toJSON(),
      negative: this.negative.toJSON(),
    };
  }

  static fromJSON(json: any): PNCounter {
    return new PNCounter(
      GCounter.fromJSON(json.positive),
      GCounter.fromJSON(json.negative)
    );
  }
}

/**
 * RGA (Replicated Growable Array) for collaborative text editing
 */
export class RGA<T> {
  private elements: Map<string, { value: T; deleted: boolean; prev: string | null; next: string | null }>;
  private head: string | null;
  private tail: string | null;
  private clock: VectorClock;

  constructor() {
    this.elements = new Map();
    this.head = null;
    this.tail = null;
    this.clock = new VectorClock();
  }

  insert(index: number, value: T): string {
    const id = this.generateId();
    
    let prevId: string | null = null;
    let nextId: string | null = this.head;
    
    let currentIndex = 0;
    let currentId = this.head;
    
    while (currentId && currentIndex < index) {
      const element = this.elements.get(currentId);
      if (element && !element.deleted) {
        currentIndex++;
      }
      prevId = currentId;
      currentId = element?.next || null;
    }
    
    nextId = currentId;
    
    this.elements.set(id, {
      value,
      deleted: false,
      prev: prevId,
      next: nextId,
    });
    
    if (prevId) {
      const prevElement = this.elements.get(prevId);
      if (prevElement) prevElement.next = id;
    } else {
      this.head = id;
    }
    
    if (nextId) {
      const nextElement = this.elements.get(nextId);
      if (nextElement) nextElement.prev = id;
    } else {
      this.tail = id;
    }
    
    return id;
  }

  delete(index: number): void {
    let currentIndex = 0;
    let currentId = this.head;
    
    while (currentId) {
      const element = this.elements.get(currentId);
      if (element && !element.deleted) {
        if (currentIndex === index) {
          element.deleted = true;
          return;
        }
        currentIndex++;
      }
      currentId = element?.next || null;
    }
  }

  toArray(): T[] {
    const result: T[] = [];
    let currentId = this.head;
    
    while (currentId) {
      const element = this.elements.get(currentId);
      if (element && !element.deleted) {
        result.push(element.value);
      }
      currentId = element?.next || null;
    }
    
    return result;
  }

  merge(other: RGA<T>): void {
    other.elements.forEach((element, id) => {
      if (!this.elements.has(id)) {
        this.elements.set(id, { ...element });
      } else {
        const ourElement = this.elements.get(id)!;
        if (element.deleted) {
          ourElement.deleted = true;
        }
      }
    });
    
    this.clock.merge(other.clock);
    this.rebuildLinks();
  }

  private rebuildLinks(): void {
    // Rebuild the linked list structure after merge
    // This is a simplified version - a production implementation would need more sophisticated ordering
    const ids = Array.from(this.elements.keys()).sort();
    
    if (ids.length === 0) {
      this.head = null;
      this.tail = null;
      return;
    }
    
    this.head = ids[0];
    this.tail = ids[ids.length - 1];
    
    for (let i = 0; i < ids.length; i++) {
      const element = this.elements.get(ids[i])!;
      element.prev = i > 0 ? ids[i - 1] : null;
      element.next = i < ids.length - 1 ? ids[i + 1] : null;
    }
  }

  private generateId(): string {
    this.clock.increment();
    return `${CLIENT_ID}-${this.clock.get(CLIENT_ID)}`;
  }
}

/**
 * High-level CRDT document for application use
 */
export interface CRDTDocument {
  id: string;
  title: LWWRegister<string>;
  content: RGA<string>;
  tags: ORSet<string>;
  likes: GCounter;
  metadata: Map<string, LWWRegister<any>>;
  version: VectorClock;
}

export class Document implements CRDTDocument {
  id: string;
  title: LWWRegister<string>;
  content: RGA<string>;
  tags: ORSet<string>;
  likes: GCounter;
  metadata: Map<string, LWWRegister<any>>;
  version: VectorClock;

  constructor(id: string = uuidv4()) {
    this.id = id;
    this.title = new LWWRegister('');
    this.content = new RGA();
    this.tags = new ORSet();
    this.likes = new GCounter();
    this.metadata = new Map();
    this.version = new VectorClock();
  }

  setTitle(title: string): void {
    this.title.set(title);
    this.version.increment();
  }

  addContent(text: string): void {
    const chars = text.split('');
    const currentLength = this.content.toArray().length;
    
    chars.forEach((char, i) => {
      this.content.insert(currentLength + i, char);
    });
    
    this.version.increment();
  }

  addTag(tag: string): void {
    this.tags.add(tag);
    this.version.increment();
  }

  removeTag(tag: string): void {
    this.tags.remove(tag);
    this.version.increment();
  }

  like(): void {
    this.likes.increment();
    this.version.increment();
  }

  setMetadata(key: string, value: any): void {
    if (!this.metadata.has(key)) {
      this.metadata.set(key, new LWWRegister(value));
    } else {
      this.metadata.get(key)!.set(value);
    }
    this.version.increment();
  }

  merge(other: Document): void {
    this.title.merge(other.title);
    this.content.merge(other.content);
    this.tags.merge(other.tags);
    this.likes.merge(other.likes);
    
    other.metadata.forEach((value, key) => {
      if (!this.metadata.has(key)) {
        this.metadata.set(key, value);
      } else {
        this.metadata.get(key)!.merge(value);
      }
    });
    
    this.version.merge(other.version);
  }

  toPlainObject() {
    return {
      id: this.id,
      title: this.title.get(),
      content: this.content.toArray().join(''),
      tags: this.tags.toArray(),
      likes: this.likes.get(),
      metadata: Object.fromEntries(
        Array.from(this.metadata.entries()).map(([k, v]) => [k, v.get()])
      ),
    };
  }
}

// Export everything
export { CLIENT_ID };
