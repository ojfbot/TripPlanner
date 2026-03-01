import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../services/database.js';
import { openaiService, ChatGPTParser } from '@tripplanner/agent-graph';
import type { ExtractedTripData } from '@tripplanner/agent-graph';
import { uploadTranscript, extractFileContent } from '../middleware/upload.js';
import {
  ProgressEmitter,
  ProcessingPhase,
  processEmitters,
  type ProgressEvent,
  type ErrorEvent,
  type CompleteEvent,
} from '../services/progress-emitter.js';
import {
  processIntelligentImport,
  processDocumentEmbeddings,
} from '../services/import-processor.js';
import {
  extractDestinations,
  extractDates,
  extractPreferences,
  extractKeyTopics,
  generateSummary,
} from '../services/trip-extractor.js';

const router: Router = Router();

/**
 * POST /api/v1/integrations/chatgpt/import/file
 * Import a ChatGPT transcript from uploaded file
 */
router.post('/chatgpt/import/file', uploadTranscript, async (req: Request, res: Response) => {
  const { userId, threadId } = req.body;

  // Validate input
  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    // Extract file content
    const content = extractFileContent(req.file);

    // Parse the transcript
    const parsed = ChatGPTParser.parse(content);

    // Validate parsed transcript
    const validation = ChatGPTParser.validate(parsed);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Invalid transcript format',
        details: validation.errors,
      });
      return;
    }

    // Get transcript stats
    const stats = ChatGPTParser.getStats(parsed);

    // Create document in database
    const now = new Date().toISOString();
    const documentId = randomUUID();

    const document = db.createDocument({
      documentId,
      userId,
      type: 'chatgpt_transcript',
      title: parsed.title || req.file?.originalname || 'Untitled Conversation',
      rawContent: content,
      metadata: JSON.stringify({
        format: parsed.format,
        messageCount: parsed.messages.length,
        conversationId: parsed.metadata.conversationId,
        model: parsed.metadata.model,
        stats,
        parsedAt: now,
        fileName: req.file?.originalname,
      }),
      threadId: threadId || null,
      embeddingStatus: 'pending',
      extractionStatus: 'pending',
    });

    // Asynchronously process chunks and embeddings
    processDocumentEmbeddings(document.documentId, content, userId).catch(error => {
      console.error('Error processing document embeddings:', error);
      db.updateDocument(document.documentId, {
        embeddingStatus: 'failed',
        metadata: JSON.stringify({
          ...JSON.parse(document.metadata),
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        updatedAt: new Date().toISOString(),
      });
    });

    // Return immediate response
    res.status(201).json({
      documentId: document.documentId,
      title: document.title,
      messageCount: stats.messageCount,
      format: parsed.format,
      embeddingStatus: 'pending',
      message: 'Document imported successfully. Embeddings will be generated in the background.',
    });
  } catch (error) {
    console.error('Error importing ChatGPT transcript file:', error);
    res.status(500).json({
      error: 'Failed to import transcript file',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/integrations/chatgpt/import
 * Import a ChatGPT transcript from pasted text (JSON or text format)
 */
router.post('/chatgpt/import', async (req: Request, res: Response) => {
  const { userId, content, threadId } = req.body;

  // Validate input
  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  try {
    // Parse the transcript
    const parsed = ChatGPTParser.parse(content);

    // Validate parsed transcript
    const validation = ChatGPTParser.validate(parsed);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Invalid transcript format',
        details: validation.errors,
      });
      return;
    }

    // Get transcript stats
    const stats = ChatGPTParser.getStats(parsed);

    // Create document in database
    const now = new Date().toISOString();
    const documentId = randomUUID();

    const document = db.createDocument({
      documentId,
      userId,
      type: 'chatgpt_transcript',
      title: parsed.title || 'Untitled Conversation',
      rawContent: content,
      metadata: JSON.stringify({
        format: parsed.format,
        messageCount: parsed.messages.length,
        conversationId: parsed.metadata.conversationId,
        model: parsed.metadata.model,
        stats,
        parsedAt: now,
      }),
      threadId: threadId || null,
      embeddingStatus: 'pending',
      extractionStatus: 'pending',
    });

    // Asynchronously process chunks and embeddings
    // Don't wait for this to complete - it runs in the background
    processDocumentEmbeddings(document.documentId, content, userId).catch(error => {
      console.error('Error processing document embeddings:', error);
      // Update document status to failed
      db.updateDocument(document.documentId, {
        embeddingStatus: 'failed',
        metadata: JSON.stringify({
          ...JSON.parse(document.metadata),
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        updatedAt: new Date().toISOString(),
      });
    });

    // Return immediate response
    res.status(201).json({
      documentId: document.documentId,
      title: document.title,
      messageCount: stats.messageCount,
      format: parsed.format,
      embeddingStatus: 'pending',
      message: 'Document imported successfully. Embeddings will be generated in the background.',
    });
  } catch (error) {
    console.error('Error importing ChatGPT transcript:', error);
    res.status(500).json({
      error: 'Failed to import transcript',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/integrations/openai/status
 * Check OpenAI service status and configuration
 */
router.get('/openai/status', async (_req: Request, res: Response) => {
  try {
    const isConfigured = openaiService.isConfigured();

    if (!isConfigured) {
      res.json({
        configured: false,
        connected: false,
        message: 'OpenAI API key not configured',
      });
      return;
    }

    // Test the connection
    const testResult = await openaiService.testConnection();

    res.json({
      configured: true,
      connected: testResult.success,
      model: testResult.model || null,
      error: testResult.error || null,
      message: testResult.success
        ? 'OpenAI service is connected and ready'
        : `Connection failed: ${testResult.error}`,
    });
  } catch (error) {
    console.error('Error checking OpenAI status:', error);
    res.status(500).json({
      configured: false,
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to check OpenAI status',
    });
  }
});

/**
 * GET /api/v1/integrations/documents
 * Get all imported documents for a user
 *
 * TODO: add auth middleware — any caller who knows a userId can enumerate that
 * user's documents. Needs ownership check once JWT auth is in place.
 */
router.get('/documents', (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId query parameter is required' });
    return;
  }

  try {
    const documents = db.getDocumentsByUserId(userId);

    // Parse metadata JSON for each document
    const documentsWithParsedMetadata = documents.map(doc => ({
      ...doc,
      metadata: JSON.parse(doc.metadata),
    }));

    res.json(documentsWithParsedMetadata);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

/**
 * GET /api/v1/integrations/documents/:documentId
 * Get a single document with its chunks and embeddings
 *
 * TODO: add auth middleware — documentId is not scoped to the requesting user.
 */
router.get('/documents/:documentId', (req: Request, res: Response) => {
  const { documentId } = req.params;

  try {
    const document = db.getDocumentById(documentId);

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Get chunks
    const chunks = db.getChunksByDocumentId(documentId);

    // Get embeddings
    const embeddings = db.getEmbeddingsByDocumentId(documentId);

    res.json({
      ...document,
      metadata: JSON.parse(document.metadata),
      chunks: chunks.map(chunk => ({
        ...chunk,
        metadata: JSON.parse(chunk.metadata),
        hasEmbedding: embeddings.some(e => e.chunkId === chunk.chunkId),
      })),
      embeddingCount: embeddings.length,
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

/**
 * DELETE /api/v1/integrations/documents/:documentId
 * Delete a document and its associated chunks and embeddings
 *
 * TODO: add auth middleware — any caller who knows the documentId can delete it.
 */
router.delete('/documents/:documentId', (req: Request, res: Response) => {
  const { documentId } = req.params;

  try {
    const deleted = db.deleteDocument(documentId);

    if (!deleted) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

/**
 * POST /api/v1/integrations/chatgpt/extract-trip
 * Extract trip details from a ChatGPT conversation using AI
 */
router.post('/chatgpt/extract-trip', async (req: Request, res: Response) => {
  const { content } = req.body;

  // Validate input
  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  try {
    // Parse the conversation
    const parsed = ChatGPTParser.parse(content);

    // Try AI-powered extraction if Anthropic API is configured
    const { isAnthropicConfigured } = await import('@tripplanner/agent-graph');
    const hasAnthropicKey = isAnthropicConfigured();

    let extractedData: ExtractedTripData | undefined;

    if (hasAnthropicKey) {
      try {
        // Use AI-powered extraction via trip extractor agent
        const { getTripExtractor } = await import('@tripplanner/agent-graph');
        const extractor = getTripExtractor();

        // Use the extractor to analyze the full conversation
        const result = await extractor.extractFromTranscript(content);

        if (result.success && result.data) {
          extractedData = result.data;
          console.log('✅ AI-powered extraction completed successfully');
        } else {
          console.warn('⚠️  AI extraction failed, falling back to pattern matching:', result.error);
          throw new Error('AI extraction failed');
        }
      } catch (aiError) {
        console.warn('⚠️  AI extraction error, falling back to pattern matching:', aiError);
        // Fall through to pattern-based extraction
      }
    }

    // Fallback to pattern-based extraction if AI extraction unavailable or failed
    if (!extractedData) {
      console.log('Using pattern-based extraction (Anthropic API not configured or AI extraction failed)');
      extractedData = {
        destinations: extractDestinations(parsed.messages),
        dates: extractDates(parsed.messages),
        travelers: { adults: 1, children: 0, infants: 0 }, // Default
        preferences: extractPreferences(parsed.messages),
        keyTopics: extractKeyTopics(parsed.messages),
        summary: parsed.title || generateSummary(parsed.messages),
      };
    }

    res.json(extractedData);
  } catch (error) {
    console.error('Error extracting trip data:', error);
    res.status(500).json({
      error: 'Failed to extract trip data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/integrations/process/:processId/stream
 * Server-Sent Events endpoint for real-time progress updates
 */
router.get('/process/:processId/stream', (req: Request, res: Response) => {
  const { processId } = req.params;

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Get the emitter for this process
  const emitter = processEmitters.get(processId);
  if (!emitter) {
    res.write(`data: ${JSON.stringify({ error: 'Process not found' })}\n\n`);
    res.end();
    return;
  }

  // Replay any events that fired before the client connected (fixes race condition
  // where processing completes before the SSE stream is established)
  for (const buffered of emitter.bufferedEvents) {
    res.write(`event: ${buffered.type}\ndata: ${JSON.stringify(buffered.data)}\n\n`);
  }

  // If the process already finished, nothing more to stream
  if (emitter.isCompleted) {
    res.end();
    return;
  }

  // Set up typed event listeners for future events
  const onProgress = (data: ProgressEvent) => {
    res.write(`event: progress\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onError = (data: ErrorEvent) => {
    res.write(`event: error\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onComplete = (data: CompleteEvent) => {
    res.write(`event: complete\ndata: ${JSON.stringify(data)}\n\n`);
    res.end();
  };

  emitter.on('progress', onProgress);
  emitter.on('error', onError);
  emitter.on('complete', onComplete);

  // Clean up when client disconnects
  req.on('close', () => {
    emitter.off('progress', onProgress);
    emitter.off('error', onError);
    emitter.off('complete', onComplete);
  });
});

/**
 * POST /api/v1/integrations/chatgpt/import/intelligent
 * Import a ChatGPT transcript with full multi-phase processing and progress updates
 */
router.post('/chatgpt/import/intelligent', async (req: Request, res: Response) => {
  const { userId, content } = req.body;

  // Validate input
  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  const processId = randomUUID();
  const emitter = new ProgressEmitter(processId);
  processEmitters.set(processId, emitter);

  // Safety TTL: remove the emitter if the client never connects or processing hangs
  const ttlTimer = setTimeout(() => {
    processEmitters.delete(processId);
  }, 10 * 60 * 1000);

  // Return immediately with process ID
  res.status(202).json({ processId, status: 'processing' });

  // Start background processing
  processIntelligentImport(userId, content, emitter)
    .then(() => {
      clearTimeout(ttlTimer);
      processEmitters.delete(processId);
    })
    .catch(error => {
      clearTimeout(ttlTimer);
      console.error('Error in intelligent import:', error);
      emitter.emitError(
        ProcessingPhase.POPULATING,
        error instanceof Error ? error.message : 'Unknown error'
      );
      processEmitters.delete(processId);
    });
});


export default router;
