import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../services/database.js';
import { ragChatAgent } from '@tripplanner/agent-graph';
import type { ChatMessage } from '@tripplanner/agent-graph';

const router: Router = Router();

// Send a message and get AI response
router.post('/message', async (req: Request, res: Response) => {
  const { threadId, message } = req.body;

  if (!threadId || !message) {
    res.status(400).json({ error: 'threadId and message are required' });
    return;
  }

  try {
    // Verify thread exists
    const thread = db.getThreadById(threadId);
    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    // Save user message
    const timestamp = new Date().toISOString();
    const userMessage = db.addMessage({
      messageId: randomUUID(),
      threadId,
      role: 'user',
      content: message,
      timestamp,
    });

    // Get conversation history (last 10 messages for context)
    const allMessages = db.getMessagesByThreadId(threadId);
    const recentHistory = allMessages.slice(-11, -1); // Exclude the just-added user message
    const conversationHistory: ChatMessage[] = recentHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Get user's documents with embeddings for RAG context
    const userId = thread.userId;
    const documents = db.getDocumentsByUserId(userId);

    // TODO: replace this full-scan with a sqlite-vec ANN query so we only load
    // the top-K semantically relevant chunks rather than every embedding in the
    // database. Loading all vectors (1536 floats × N chunks) into memory per
    // request will not scale beyond a handful of documents.
    // Tracking issue: add sqlite-vec and push similarity search into the DB layer.
    const MAX_CHUNKS = 500;

    // Collect all chunks with embeddings (capped to avoid runaway memory usage)
    const chunksWithEmbeddings: Array<{
      chunkId: string;
      documentId: string;
      content: string;
      embedding: number[];
      documentTitle: string;
      metadata?: unknown;
    }> = [];

    for (const doc of documents) {
      if (chunksWithEmbeddings.length >= MAX_CHUNKS) break;
      if (doc.embeddingStatus === 'completed') {
        const chunks = db.getChunksByDocumentId(doc.documentId);
        for (const chunk of chunks) {
          if (chunksWithEmbeddings.length >= MAX_CHUNKS) break;
          const embedding = db.getEmbeddingByChunkId(chunk.chunkId);
          if (embedding) {
            chunksWithEmbeddings.push({
              chunkId: chunk.chunkId,
              documentId: doc.documentId,
              content: chunk.content,
              embedding: JSON.parse(embedding.vector) as number[],
              documentTitle: doc.title,
              metadata: JSON.parse(chunk.metadata) as unknown,
            });
          }
        }
      }
    }

    // Generate AI response with RAG
    let assistantContent: string;
    let ragMetadata: any = {};

    if (ragChatAgent.isConfigured() && chunksWithEmbeddings.length > 0) {
      // Use RAG-enhanced response
      const ragResponse = await ragChatAgent.chatWithAutoContext(
        message,
        chunksWithEmbeddings,
        conversationHistory
      );

      if (ragResponse.success && ragResponse.message) {
        assistantContent = ragResponse.message;
        ragMetadata = {
          useRAG: true,
          contextCount: ragResponse.contextsUsed?.length || 0,
          model: ragResponse.metadata?.model,
          contextSources: ragResponse.contextsUsed?.map(ctx => ({
            documentTitle: ctx.documentTitle,
            similarity: ctx.similarity,
          })),
        };
      } else {
        // Fallback if RAG fails
        assistantContent = ragResponse.error || 'I encountered an error processing your request.';
        ragMetadata = { useRAG: false, error: ragResponse.error };
      }
    } else if (!ragChatAgent.isConfigured()) {
      // API key not configured
      assistantContent = 'AI chat is not configured. Please set Anthropic and OpenAI API keys in your env.json configuration.';
      ragMetadata = { useRAG: false, reason: 'not_configured' };
    } else {
      // No documents available
      assistantContent = 'I can help you plan trips! However, I don\'t have any context from uploaded documents yet. You can upload ChatGPT transcripts or other travel planning documents to give me more context about your preferences.';
      ragMetadata = { useRAG: false, reason: 'no_documents' };
    }

    // Save assistant message
    const assistantMessage = db.addMessage({
      messageId: randomUUID(),
      threadId,
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date().toISOString(),
    });

    res.json({
      userMessage,
      assistantMessage,
      metadata: ragMetadata,
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Stream a message (for future streaming support)
router.post('/stream', async (req: Request, res: Response) => {
  const { threadId, message } = req.body;

  if (!threadId || !message) {
    res.status(400).json({ error: 'threadId and message are required' });
    return;
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Verify thread exists
    const thread = db.getThreadById(threadId);
    if (!thread) {
      res.write(`data: ${JSON.stringify({ error: 'Thread not found' })}\n\n`);
      res.end();
      return;
    }

    // Save user message
    const timestamp = new Date().toISOString();
    db.addMessage({
      messageId: randomUUID(),
      threadId,
      role: 'user',
      content: message,
      timestamp,
    });

    // TODO: Stream response from agent-graph
    // For now, send a simple response
    res.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'content', content: 'Streaming support coming soon!' })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Error streaming message:', error);
    res.write(`data: ${JSON.stringify({ error: 'Failed to process message' })}\n\n`);
    res.end();
  }
});

export default router;
