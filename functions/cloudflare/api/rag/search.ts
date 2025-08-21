import { json } from '../../_utils/json';

export interface Env {
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL: string;
  RAG_STORE: string;
  POSTGRES_URL?: string;
  PINECONE_API_KEY?: string;
  PINECONE_ENV?: string;
  AI_EMBEDDINGS: KVNamespace;
}

interface SearchRequest {
  query: string;
  top_k?: number;
  filter?: Record<string, any>;
}

// Generate embeddings using OpenAI
async function generateEmbedding(text: string, env: Env): Promise<number[]> {
  const response = await fetch(`${env.OPENAI_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Simple cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Search in KV store (simple implementation)
async function searchKV(
  queryEmbedding: number[], 
  topK: number, 
  env: Env
): Promise<any[]> {
  // List all embeddings (in production, use a proper vector DB)
  const list = await env.AI_EMBEDDINGS.list({ prefix: 'emb:' });
  
  const results: any[] = [];
  
  for (const key of list.keys) {
    const stored = await env.AI_EMBEDDINGS.get(key.name, 'json') as any;
    if (!stored) continue;
    
    const similarity = cosineSimilarity(queryEmbedding, stored.embedding);
    
    results.push({
      id: key.name.replace('emb:', ''),
      text: stored.text,
      metadata: stored.metadata,
      score: similarity
    });
  }
  
  // Sort by similarity and return top K
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

// Search in Pinecone
async function searchPinecone(
  queryEmbedding: number[], 
  topK: number, 
  env: Env,
  filter?: Record<string, any>
): Promise<any[]> {
  if (!env.PINECONE_API_KEY || !env.PINECONE_ENV) {
    throw new Error('Pinecone configuration missing');
  }

  const response = await fetch(
    `https://your-index.${env.PINECONE_ENV}.pinecone.io/query`,
    {
      method: 'POST',
      headers: {
        'Api-Key': env.PINECONE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Pinecone query error: ${response.statusText}`);
  }

  const data = await response.json();
  
  return data.matches.map((match: any) => ({
    id: match.id,
    text: match.metadata?.text,
    metadata: match.metadata,
    score: match.score
  }));
}

// Main search handler
export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  try {
    const body: SearchRequest = await request.json();
    const { query, top_k = 5, filter } = body;

    if (!query) {
      return json({ error: 'Query is required' }, 400);
    }

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query, env);

    // Search based on configured store
    let results: any[] = [];
    
    switch (env.RAG_STORE) {
      case 'pinecone':
        results = await searchPinecone(queryEmbedding, top_k, env, filter);
        break;
      
      case 'kv':
      default:
        results = await searchKV(queryEmbedding, top_k, env);
        break;
    }

    // Format response
    const passages = results.map(r => ({
      text: r.text,
      source: r.metadata?.source || 'knowledge_base',
      score: r.score,
      metadata: r.metadata
    }));

    return json({
      success: true,
      query,
      passages,
      count: passages.length
    });

  } catch (error: any) {
    console.error('RAG search error:', error);
    return json({ 
      error: error.message || 'Search failed' 
    }, 500);
  }
}