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

interface IngestRequest {
  documents: Array<{
    id?: string;
    text: string;
    metadata?: Record<string, any>;
  }>;
  chunk_size?: number;
  chunk_overlap?: number;
}

// Chunk text with overlap
function chunkText(
  text: string, 
  chunkSize: number = 800, 
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    
    if (end >= text.length) break;
    start = end - overlap;
  }
  
  return chunks;
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

// Store in KV
async function storeInKV(
  id: string,
  text: string,
  embedding: number[],
  metadata: Record<string, any>,
  env: Env
): Promise<void> {
  await env.AI_EMBEDDINGS.put(
    `emb:${id}`,
    JSON.stringify({
      text,
      embedding,
      metadata: {
        ...metadata,
        ingested: new Date().toISOString()
      }
    })
  );
}

// Store in Pinecone
async function storeInPinecone(
  vectors: Array<{
    id: string;
    values: number[];
    metadata: Record<string, any>;
  }>,
  env: Env
): Promise<void> {
  if (!env.PINECONE_API_KEY || !env.PINECONE_ENV) {
    throw new Error('Pinecone configuration missing');
  }

  const response = await fetch(
    `https://your-index.${env.PINECONE_ENV}.pinecone.io/vectors/upsert`,
    {
      method: 'POST',
      headers: {
        'Api-Key': env.PINECONE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vectors
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Pinecone upsert error: ${response.statusText}`);
  }
}

// Main ingest handler
export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  try {
    const body: IngestRequest = await request.json();
    const { documents, chunk_size = 800, chunk_overlap = 200 } = body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return json({ error: 'Documents array is required' }, 400);
    }

    const processedChunks: any[] = [];
    const pineconeVectors: any[] = [];

    // Process each document
    for (const doc of documents) {
      const chunks = chunkText(doc.text, chunk_size, chunk_overlap);
      
      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunkId = doc.id 
          ? `${doc.id}_chunk_${i}` 
          : `doc_${Date.now()}_chunk_${i}`;
        
        const chunkText = chunks[i];
        
        // Generate embedding
        const embedding = await generateEmbedding(chunkText, env);
        
        const metadata = {
          ...doc.metadata,
          source: doc.id || 'unknown',
          chunk_index: i,
          total_chunks: chunks.length,
          text: chunkText // Store text in metadata for retrieval
        };

        // Store based on configured backend
        if (env.RAG_STORE === 'pinecone') {
          pineconeVectors.push({
            id: chunkId,
            values: embedding,
            metadata
          });
        } else {
          // Default to KV store
          await storeInKV(chunkId, chunkText, embedding, metadata, env);
        }

        processedChunks.push({
          id: chunkId,
          chars: chunkText.length
        });
      }
    }

    // Batch upsert to Pinecone if needed
    if (env.RAG_STORE === 'pinecone' && pineconeVectors.length > 0) {
      await storeInPinecone(pineconeVectors, env);
    }

    return json({
      success: true,
      documents_processed: documents.length,
      chunks_created: processedChunks.length,
      chunks: processedChunks
    });

  } catch (error: any) {
    console.error('RAG ingest error:', error);
    return json({ 
      error: error.message || 'Ingest failed' 
    }, 500);
  }
}