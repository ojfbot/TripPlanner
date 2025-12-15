import Database from 'better-sqlite3';
import { join } from 'path';

export interface Thread {
  threadId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface Message {
  messageId: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Document {
  documentId: string;
  userId: string;
  type: 'chatgpt_transcript' | 'text' | 'other';
  title: string;
  rawContent: string;
  metadata: string; // JSON string
  threadId?: string; // Optional link to associated thread
  embeddingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  extractionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  extractedData?: string; // JSON string of ExtractedTripData
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunk {
  chunkId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  metadata: string; // JSON string with page, section, etc.
  createdAt: string;
}

export interface Embedding {
  embeddingId: string;
  chunkId: string;
  documentId: string;
  vector: string; // JSON array of floats
  model: string;
  createdAt: string;
}

class DatabaseService {
  private db: Database.Database;

  constructor() {
    const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'tripplanner.db');
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    // Create threads table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS threads (
        threadId TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        title TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        messageId TEXT PRIMARY KEY,
        threadId TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (threadId) REFERENCES threads(threadId) ON DELETE CASCADE
      )
    `);

    // Create documents table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        documentId TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('chatgpt_transcript', 'text', 'other')),
        title TEXT NOT NULL,
        rawContent TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        threadId TEXT,
        embeddingStatus TEXT NOT NULL DEFAULT 'pending' CHECK(embeddingStatus IN ('pending', 'processing', 'completed', 'failed')),
        extractionStatus TEXT NOT NULL DEFAULT 'pending' CHECK(extractionStatus IN ('pending', 'processing', 'completed', 'failed')),
        extractedData TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (threadId) REFERENCES threads(threadId) ON DELETE SET NULL
      )
    `);

    // Create document_chunks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        chunkId TEXT PRIMARY KEY,
        documentId TEXT NOT NULL,
        chunkIndex INTEGER NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        createdAt TEXT NOT NULL,
        FOREIGN KEY (documentId) REFERENCES documents(documentId) ON DELETE CASCADE
      )
    `);

    // Create embeddings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings (
        embeddingId TEXT PRIMARY KEY,
        chunkId TEXT NOT NULL,
        documentId TEXT NOT NULL,
        vector TEXT NOT NULL,
        model TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (chunkId) REFERENCES document_chunks(chunkId) ON DELETE CASCADE,
        FOREIGN KEY (documentId) REFERENCES documents(documentId) ON DELETE CASCADE
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_threads_userId ON threads(userId);
      CREATE INDEX IF NOT EXISTS idx_messages_threadId ON messages(threadId);
      CREATE INDEX IF NOT EXISTS idx_documents_userId ON documents(userId);
      CREATE INDEX IF NOT EXISTS idx_documents_threadId ON documents(threadId);
      CREATE INDEX IF NOT EXISTS idx_document_chunks_documentId ON document_chunks(documentId);
      CREATE INDEX IF NOT EXISTS idx_embeddings_documentId ON embeddings(documentId);
      CREATE INDEX IF NOT EXISTS idx_embeddings_chunkId ON embeddings(chunkId);
    `);
  }

  // Thread operations
  createThread(thread: Omit<Thread, 'messageCount'>): Thread {
    const stmt = this.db.prepare(`
      INSERT INTO threads (threadId, userId, title, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(thread.threadId, thread.userId, thread.title, thread.createdAt, thread.updatedAt);
    return { ...thread, messageCount: 0 };
  }

  getThreadsByUserId(userId: string): Thread[] {
    const stmt = this.db.prepare(`
      SELECT
        t.*,
        COUNT(m.messageId) as messageCount
      FROM threads t
      LEFT JOIN messages m ON t.threadId = m.threadId
      WHERE t.userId = ?
      GROUP BY t.threadId
      ORDER BY t.updatedAt DESC
    `);

    return stmt.all(userId) as Thread[];
  }

  getThreadById(threadId: string): Thread | undefined {
    const stmt = this.db.prepare(`
      SELECT
        t.*,
        COUNT(m.messageId) as messageCount
      FROM threads t
      LEFT JOIN messages m ON t.threadId = m.threadId
      WHERE t.threadId = ?
      GROUP BY t.threadId
    `);

    return stmt.get(threadId) as Thread | undefined;
  }

  updateThread(threadId: string, updates: Partial<Pick<Thread, 'title' | 'updatedAt'>>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.updatedAt !== undefined) {
      fields.push('updatedAt = ?');
      values.push(updates.updatedAt);
    }

    if (fields.length === 0) return false;

    values.push(threadId);
    const stmt = this.db.prepare(`
      UPDATE threads
      SET ${fields.join(', ')}
      WHERE threadId = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  deleteThread(threadId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM threads WHERE threadId = ?');
    const result = stmt.run(threadId);
    return result.changes > 0;
  }

  // Message operations
  addMessage(message: Message): Message {
    const stmt = this.db.prepare(`
      INSERT INTO messages (messageId, threadId, role, content, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(message.messageId, message.threadId, message.role, message.content, message.timestamp);

    // Update thread's updatedAt timestamp
    this.updateThread(message.threadId, { updatedAt: message.timestamp });

    return message;
  }

  getMessagesByThreadId(threadId: string): Message[] {
    const stmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE threadId = ?
      ORDER BY timestamp ASC
    `);

    return stmt.all(threadId) as Message[];
  }

  deleteMessagesByThreadId(threadId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM messages WHERE threadId = ?');
    const result = stmt.run(threadId);
    return result.changes > 0;
  }

  // Document operations
  createDocument(document: Omit<Document, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }): Document {
    const now = new Date().toISOString();
    const fullDocument: Document = {
      ...document,
      createdAt: document.createdAt || now,
      updatedAt: document.updatedAt || now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO documents (documentId, userId, type, title, rawContent, metadata, threadId, embeddingStatus, extractionStatus, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      fullDocument.documentId,
      fullDocument.userId,
      fullDocument.type,
      fullDocument.title,
      fullDocument.rawContent,
      fullDocument.metadata,
      fullDocument.threadId,
      fullDocument.embeddingStatus,
      fullDocument.extractionStatus,
      fullDocument.createdAt,
      fullDocument.updatedAt
    );

    return fullDocument;
  }

  getDocumentsByUserId(userId: string): Document[] {
    const stmt = this.db.prepare(`
      SELECT * FROM documents
      WHERE userId = ?
      ORDER BY createdAt DESC
    `);

    return stmt.all(userId) as Document[];
  }

  getDocumentById(documentId: string): Document | undefined {
    const stmt = this.db.prepare('SELECT * FROM documents WHERE documentId = ?');
    return stmt.get(documentId) as Document | undefined;
  }

  updateDocument(documentId: string, updates: Partial<Pick<Document, 'title' | 'embeddingStatus' | 'extractionStatus' | 'extractedData' | 'metadata' | 'updatedAt'>>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.embeddingStatus !== undefined) {
      fields.push('embeddingStatus = ?');
      values.push(updates.embeddingStatus);
    }
    if (updates.extractionStatus !== undefined) {
      fields.push('extractionStatus = ?');
      values.push(updates.extractionStatus);
    }
    if (updates.extractedData !== undefined) {
      fields.push('extractedData = ?');
      values.push(updates.extractedData);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(updates.metadata);
    }
    if (updates.updatedAt !== undefined) {
      fields.push('updatedAt = ?');
      values.push(updates.updatedAt);
    }

    if (fields.length === 0) return false;

    values.push(documentId);
    const stmt = this.db.prepare(`
      UPDATE documents
      SET ${fields.join(', ')}
      WHERE documentId = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  deleteDocument(documentId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM documents WHERE documentId = ?');
    const result = stmt.run(documentId);
    return result.changes > 0;
  }

  // Document chunk operations
  createDocumentChunk(chunk: Omit<DocumentChunk, 'createdAt'> & { createdAt?: string }): DocumentChunk {
    const now = new Date().toISOString();
    const fullChunk: DocumentChunk = {
      ...chunk,
      createdAt: chunk.createdAt || now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO document_chunks (chunkId, documentId, chunkIndex, content, metadata, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      fullChunk.chunkId,
      fullChunk.documentId,
      fullChunk.chunkIndex,
      fullChunk.content,
      fullChunk.metadata,
      fullChunk.createdAt
    );

    return fullChunk;
  }

  getChunksByDocumentId(documentId: string): DocumentChunk[] {
    const stmt = this.db.prepare(`
      SELECT * FROM document_chunks
      WHERE documentId = ?
      ORDER BY chunkIndex ASC
    `);

    return stmt.all(documentId) as DocumentChunk[];
  }

  getChunkById(chunkId: string): DocumentChunk | undefined {
    const stmt = this.db.prepare('SELECT * FROM document_chunks WHERE chunkId = ?');
    return stmt.get(chunkId) as DocumentChunk | undefined;
  }

  deleteChunksByDocumentId(documentId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM document_chunks WHERE documentId = ?');
    const result = stmt.run(documentId);
    return result.changes > 0;
  }

  // Embedding operations
  createEmbedding(embedding: Omit<Embedding, 'createdAt'> & { createdAt?: string }): Embedding {
    const now = new Date().toISOString();
    const fullEmbedding: Embedding = {
      ...embedding,
      createdAt: embedding.createdAt || now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO embeddings (embeddingId, chunkId, documentId, vector, model, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      fullEmbedding.embeddingId,
      fullEmbedding.chunkId,
      fullEmbedding.documentId,
      fullEmbedding.vector,
      fullEmbedding.model,
      fullEmbedding.createdAt
    );

    return fullEmbedding;
  }

  getEmbeddingsByDocumentId(documentId: string): Embedding[] {
    const stmt = this.db.prepare(`
      SELECT * FROM embeddings
      WHERE documentId = ?
      ORDER BY createdAt ASC
    `);

    return stmt.all(documentId) as Embedding[];
  }

  getEmbeddingByChunkId(chunkId: string): Embedding | undefined {
    const stmt = this.db.prepare('SELECT * FROM embeddings WHERE chunkId = ?');
    return stmt.get(chunkId) as Embedding | undefined;
  }

  deleteEmbeddingsByDocumentId(documentId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM embeddings WHERE documentId = ?');
    const result = stmt.run(documentId);
    return result.changes > 0;
  }

  close(): void {
    this.db.close();
  }
}

export const db = new DatabaseService();
