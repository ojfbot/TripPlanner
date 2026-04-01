import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../services/database.js';

const router: Router = Router();

// Get all threads for a user
router.get('/', (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId query parameter is required' });
    return;
  }

  try {
    const threads = db.getThreadsByUserId(userId);
    res.json(threads);
  } catch (error) {
    console.error('Error fetching threads:', error);
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

// Get a single thread by ID
router.get('/:threadId', (req: Request<{ threadId: string }>, res: Response) => {
  const { threadId } = req.params;

  try {
    const thread = db.getThreadById(threadId);

    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    const messages = db.getMessagesByThreadId(threadId);
    res.json({ ...thread, messages });
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// Create a new thread
router.post('/', (req: Request, res: Response) => {
  const { userId, title } = req.body;

  if (!userId || !title) {
    res.status(400).json({ error: 'userId and title are required' });
    return;
  }

  try {
    const now = new Date().toISOString();
    const thread = db.createThread({
      threadId: randomUUID(),
      userId,
      title,
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json(thread);
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

// Update a thread
router.put('/:threadId', (req: Request<{ threadId: string }>, res: Response) => {
  const { threadId } = req.params;
  const { title } = req.body;

  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  try {
    const updated = db.updateThread(threadId, {
      title,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    const thread = db.getThreadById(threadId);
    res.json(thread);
  } catch (error) {
    console.error('Error updating thread:', error);
    res.status(500).json({ error: 'Failed to update thread' });
  }
});

// Delete a thread
router.delete('/:threadId', (req: Request<{ threadId: string }>, res: Response) => {
  const { threadId } = req.params;

  try {
    const deleted = db.deleteThread(threadId);

    if (!deleted) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting thread:', error);
    res.status(500).json({ error: 'Failed to delete thread' });
  }
});

// Get messages for a thread
router.get('/:threadId/messages', (req: Request<{ threadId: string }>, res: Response) => {
  const { threadId } = req.params;

  try {
    const messages = db.getMessagesByThreadId(threadId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
