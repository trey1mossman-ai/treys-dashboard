// Type definitions for Fuse.js and CommandPalette
// Team Lead: Claude - Day 6 Legacy TypeScript Fixes

declare module 'fuse.js' {
  export interface IFuseOptions<T> {
    isCaseSensitive?: boolean;
    includeScore?: boolean;
    includeMatches?: boolean;
    minMatchCharLength?: number;
    shouldSort?: boolean;
    findAllMatches?: boolean;
    keys?: Array<string | { name: string; weight: number }>;
    location?: number;
    threshold?: number;
    distance?: number;
    useExtendedSearch?: boolean;
    getFn?: (obj: any, path: string) => any;
    sortFn?: (a: any, b: any) => number;
    ignoreLocation?: boolean;
    ignoreFieldNorm?: boolean;
  }

  export interface FuseResult<T> {
    item: T;
    refIndex?: number;
    score?: number;
    matches?: readonly FuseResultMatch[];
  }

  export interface FuseResultMatch {
    indices: ReadonlyArray<readonly [number, number]>;
    value?: string;
    key?: string;
    refIndex?: number;
  }

  export default class Fuse<T> {
    constructor(list: T[], options?: IFuseOptions<T>);
    search(pattern: string): FuseResult<T>[];
    setCollection(docs: T[]): void;
    add(doc: T): void;
    remove(predicate: (item: T) => boolean): void;
    removeAt(idx: number): void;
    getIndex(): any;
  }
}

// Voice API type definitions
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// React Query types
declare module '@tanstack/react-query' {
  export * from '@tanstack/react-query';
}

// Global window augmentations
declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition;
    SpeechRecognition: typeof SpeechRecognition;
    eventsFired?: string[];
    db?: any;
    layoutShifts?: number;
  }

  // Service Worker globals
  interface ServiceWorkerGlobalScope {
    skipWaiting(): void;
    clients: Clients;
  }

  interface Clients {
    claim(): Promise<void>;
    get(id: string): Promise<Client | undefined>;
    matchAll(options?: ClientQueryOptions): Promise<Client[]>;
    openWindow(url: string): Promise<WindowClient>;
  }

  interface ClientQueryOptions {
    includeUncontrolled?: boolean;
    type?: ClientTypes;
  }

  type ClientTypes = 'window' | 'worker' | 'sharedworker' | 'all';

  interface Client {
    id: string;
    type: ClientTypes;
    url: string;
    postMessage(message: any, transfer?: Transferable[]): void;
  }

  interface WindowClient extends Client {
    focused: boolean;
    visibilityState: VisibilityState;
    focus(): Promise<WindowClient>;
    navigate(url: string): Promise<WindowClient>;
  }

  // Node environment for development
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      VITE_API_URL?: string;
      VITE_WS_URL?: string;
    }
  }
}

// Service Worker type augmentations
declare const self: ServiceWorkerGlobalScope;

// Export empty to make this a module
export {};