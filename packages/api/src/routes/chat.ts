import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../services/database.js';

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

    // TODO: Call agent-graph for AI response
    // For now, return a placeholder response
    const assistantMessage = db.addMessage({
      messageId: randomUUID(),
      threadId,
      role: 'assistant',
      content: 'This is a placeholder response. Agent integration coming soon!\n\nI\'ll help you plan amazing trips once the AI backend is fully connected.',
      timestamp: new Date().toISOString(),
    });

    res.json({
      userMessage,
      assistantMessage,
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
