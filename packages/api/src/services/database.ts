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

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_threads_userId ON threads(userId);
      CREATE INDEX IF NOT EXISTS idx_messages_threadId ON messages(threadId);
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

  close(): void {
    this.db.close();
  }
}

export const db = new DatabaseService();
