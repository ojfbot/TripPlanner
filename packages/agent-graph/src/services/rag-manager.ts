/**
 * RAG Document Manager
 * Orchestrates document ingestion, chunking, and embedding generation
 */

import { randomUUID } from 'crypto';
import { ChatGPTParser } from './chatgpt-parser.js';
import { DocumentChunker, type ChunkConfig } from './document-chunker.js';
import { openaiService, type OpenAIService, OpenAIService as OpenAIServiceClass } from './openai.js';

export interface RAGDocument {
  documentId: string;
  userId: string;
  type: 'chatgpt_transcript' | 'text' | 'other';
  title: string;
  rawContent: string;
  metadata: Record<string, any>;
  chunks: RAGChunk[];
  embeddingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface RAGChunk {
  chunkId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

export interface IngestionResult {
  documentId: string;
  success: boolean;
  chunksCreated: number;
  embeddingsGenerated: number;
  document?: RAGDocument; // Return the full document with chunks for persistence
  error?: string;
  stats?: {
    totalCharacters: number;
    avgChunkSize: number;
    processingTimeMs: number;
  };
}

export interface RAGConfig {
  chunkConfig?: ChunkConfig;
  openaiService?: OpenAIService;
  batchSize?: number; // Number of chunks to embed at once
}

export class RAGManager {
  private chunker: DocumentChunker;
  private openaiSvc: OpenAIService;
  private config: Required<RAGConfig>;

  constructor(config: RAGConfig = {}) {
    this.config = {
      chunkConfig: config.chunkConfig || {},
      openaiService: config.openaiService || openaiService,
      batchSize: config.batchSize || 10,
    };

    this.chunker = new DocumentChunker(this.config.chunkConfig);
    this.openaiSvc = this.config.openaiService;
  }

  /**
   * Ingest a ChatGPT transcript and create document with embeddings
   */
  public async ingestChatGPTTranscript(
    transcriptContent: string,
    userId: string
  ): Promise<IngestionResult> {
    const startTime = Date.now();

    try {
      // Parse the transcript
      const parsed = ChatGPTParser.parse(transcriptContent);

      // Validate parsed content
      const validation = ChatGPTParser.validate(parsed);
      if (!validation.valid) {
        return {
          documentId: '',
          success: false,
          chunksCreated: 0,
          embeddingsGenerated: 0,
          error: `Invalid transcript: ${validation.errors.join(', ')}`,
        };
      }

      // Convert to plain text for chunking
      const textContent = ChatGPTParser.toText(parsed);

      // Create document
      const document: RAGDocument = {
        documentId: randomUUID(),
        userId,
        type: 'chatgpt_transcript',
        title: parsed.title || 'Untitled Conversation',
        rawContent: transcriptContent,
        metadata: {
          format: parsed.format,
          messageCount: parsed.messages.length,
          conversationId: parsed.metadata.conversationId,
          model: parsed.metadata.model,
          stats: ChatGPTParser.getStats(parsed),
        },
        chunks: [],
        embeddingStatus: 'processing',
      };

      // Chunk the document
      const chunks = this.chunker.chunk(textContent);

      // Create chunk objects
      document.chunks = chunks.map((chunk, index) => ({
        chunkId: randomUUID(),
        documentId: document.documentId,
        chunkIndex: index,
        content: chunk.content,
        metadata: chunk.metadata,
      }));

      // Generate embeddings if OpenAI is configured
      let embeddingsGenerated = 0;
      if (this.openaiSvc.isConfigured()) {
        embeddingsGenerated = await this.generateEmbeddings(document.chunks);
        document.embeddingStatus = 'completed';
      } else {
        document.embeddingStatus = 'pending';
      }

      const processingTime = Date.now() - startTime;

      return {
        documentId: document.documentId,
        success: true,
        chunksCreated: document.chunks.length,
        embeddingsGenerated,
        document, // Include the full document with chunks and embeddings
        stats: {
          totalCharacters: textContent.length,
          avgChunkSize: Math.round(
            document.chunks.reduce((sum, c) => sum + c.content.length, 0) / document.chunks.length
          ),
          processingTimeMs: processingTime,
        },
      };
    } catch (error) {
      return {
        documentId: '',
        success: false,
        chunksCreated: 0,
        embeddingsGenerated: 0,
        error: error instanceof Error ? error.message : 'Unknown error during ingestion',
      };
    }
  }

  /**
   * Ingest plain text document
   */
  public async ingestTextDocument(
    content: string,
    userId: string,
    title: string,
    metadata: Record<string, any> = {}
  ): Promise<IngestionResult> {
    const startTime = Date.now();

    try {
      if (!content || content.trim().length === 0) {
        return {
          documentId: '',
          success: false,
          chunksCreated: 0,
          embeddingsGenerated: 0,
          error: 'Content cannot be empty',
        };
      }

      // Create document
      const document: RAGDocument = {
        documentId: randomUUID(),
        userId,
        type: 'text',
        title: title || 'Untitled Document',
        rawContent: content,
        metadata: {
          ...metadata,
          characterCount: content.length,
        },
        chunks: [],
        embeddingStatus: 'processing',
      };

      // Chunk the document
      const chunks = this.chunker.chunk(content);

      // Create chunk objects
      document.chunks = chunks.map((chunk, index) => ({
        chunkId: randomUUID(),
        documentId: document.documentId,
        chunkIndex: index,
        content: chunk.content,
        metadata: chunk.metadata,
      }));

      // Generate embeddings if OpenAI is configured
      let embeddingsGenerated = 0;
      if (this.openaiSvc.isConfigured()) {
        embeddingsGenerated = await this.generateEmbeddings(document.chunks);
        document.embeddingStatus = 'completed';
      } else {
        document.embeddingStatus = 'pending';
      }

      const processingTime = Date.now() - startTime;

      return {
        documentId: document.documentId,
        success: true,
        chunksCreated: document.chunks.length,
        embeddingsGenerated,
        document, // Include the full document with chunks and embeddings
        stats: {
          totalCharacters: content.length,
          avgChunkSize: Math.round(
            document.chunks.reduce((sum, c) => sum + c.content.length, 0) / document.chunks.length
          ),
          processingTimeMs: processingTime,
        },
      };
    } catch (error) {
      return {
        documentId: '',
        success: false,
        chunksCreated: 0,
        embeddingsGenerated: 0,
        error: error instanceof Error ? error.message : 'Unknown error during ingestion',
      };
    }
  }

  /**
   * Generate embeddings for chunks in batches
   */
  private async generateEmbeddings(chunks: RAGChunk[]): Promise<number> {
    let generated = 0;

    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += this.config.batchSize) {
      const batch = chunks.slice(i, i + this.config.batchSize);
      const texts = batch.map(chunk => chunk.content);

      try {
        const result = await this.openaiSvc.generateBatchEmbeddings(texts);

        // Assign embeddings to chunks
        batch.forEach((chunk, index) => {
          chunk.embedding = result.embeddings[index];
        });

        generated += batch.length;
      } catch (error) {
        console.error(`Failed to generate embeddings for batch ${i / this.config.batchSize}:`, error);
        // Continue with next batch even if this one fails
      }
    }

    return generated;
  }

  /**
   * Search for similar chunks using cosine similarity
   * This is a simple in-memory search - in production you'd use a vector database
   */
  public async search(
    queryText: string,
    documents: RAGDocument[],
    topK: number = 5
  ): Promise<Array<{ chunk: RAGChunk; similarity: number; documentTitle: string }>> {
    if (!this.openaiSvc.isConfigured()) {
      throw new Error('OpenAI service not configured');
    }

    // Generate embedding for query
    const queryResult = await this.openaiSvc.generateEmbedding(queryText);
    const queryEmbedding = queryResult.embedding;

    // Collect all chunks with embeddings
    const allChunks: Array<{ chunk: RAGChunk; documentTitle: string }> = [];
    for (const doc of documents) {
      for (const chunk of doc.chunks) {
        if (chunk.embedding) {
          allChunks.push({ chunk, documentTitle: doc.title });
        }
      }
    }

    // Calculate similarities
    const similarities = allChunks.map(({ chunk, documentTitle }) => {
      const similarity = OpenAIServiceClass.cosineSimilarity(
        queryEmbedding,
        chunk.embedding!
      );
      return { chunk, similarity, documentTitle };
    });

    // Sort by similarity (highest first) and return top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Re-generate embeddings for existing chunks
   * Useful when switching embedding models or if embedding generation failed
   */
  public async regenerateEmbeddings(chunks: RAGChunk[]): Promise<number> {
    if (!this.openaiSvc.isConfigured()) {
      throw new Error('OpenAI service not configured');
    }

    return this.generateEmbeddings(chunks);
  }

  /**
   * Check if RAG manager is ready for operation
   */
  public isReady(): { ready: boolean; message: string } {
    if (!this.openaiSvc.isConfigured()) {
      return {
        ready: false,
        message: 'OpenAI service not configured. Please set OPENAI_API_KEY.',
      };
    }

    return {
      ready: true,
      message: 'RAG manager ready',
    };
  }
}

// Export singleton instance
export const ragManager = new RAGManager();
