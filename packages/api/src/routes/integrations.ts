import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../services/database.js';
import { openaiService, ChatGPTParser, ragManager } from '@tripplanner/agent-graph';
import { uploadTranscript, extractFileContent } from '../middleware/upload.js';
import {
  ProgressEmitter,
  ProcessingPhase,
  processEmitters,
} from '../services/progress-emitter.js';

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

    let extractedData;

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
 * Helper functions for trip extraction
 */
function extractDestinations(messages: any[]): string[] {
  const destinations: Set<string> = new Set();
  const locationKeywords = ['trip to', 'traveling to', 'visit', 'going to', 'in'];

  for (const msg of messages) {
    const content = msg.content.toLowerCase();
    // Look for common location patterns
    locationKeywords.forEach(keyword => {
      const regex = new RegExp(`${keyword}\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)`, 'gi');
      const matches = content.matchAll(regex);
      for (const match of matches) {
        if (match[1]) destinations.add(match[1]);
      }
    });
  }

  return Array.from(destinations);
}

function extractDates(messages: any[]): { start?: string; end?: string; flexible: boolean } {
  // Simple date extraction - look for date patterns in messages
  const datePattern = /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:,\s+\d{4})?\b/gi;

  for (const msg of messages) {
    const matches = msg.content.match(datePattern);
    if (matches && matches.length > 0) {
      return {
        start: matches[0],
        end: matches[1] || undefined,
        flexible: msg.content.toLowerCase().includes('flexible'),
      };
    }
  }

  return { flexible: true };
}

function extractPreferences(messages: any[]): any {
  const preferences: any = {
    activities: [],
    accommodation: [],
    transportation: [],
    dining: [],
  };

  const activityKeywords = ['museum', 'tour', 'sightseeing', 'hiking', 'shopping', 'beach', 'park'];
  const accomKeywords = ['hotel', 'airbnb', 'hostel', 'resort'];
  const transKeywords = ['flight', 'train', 'car', 'bus', 'uber'];
  const diningKeywords = ['restaurant', 'cafe', 'food', 'dining', 'cuisine'];

  for (const msg of messages) {
    const content = msg.content.toLowerCase();

    activityKeywords.forEach(kw => {
      if (content.includes(kw) && !preferences.activities.includes(kw)) {
        preferences.activities.push(kw);
      }
    });

    accomKeywords.forEach(kw => {
      if (content.includes(kw) && !preferences.accommodation.includes(kw)) {
        preferences.accommodation.push(kw);
      }
    });

    transKeywords.forEach(kw => {
      if (content.includes(kw) && !preferences.transportation.includes(kw)) {
        preferences.transportation.push(kw);
      }
    });

    diningKeywords.forEach(kw => {
      if (content.includes(kw) && !preferences.dining.includes(kw)) {
        preferences.dining.push(kw);
      }
    });
  }

  return preferences;
}

function extractKeyTopics(messages: any[]): string[] {
  const topics: Set<string> = new Set();
  const seasonKeywords = ['christmas', 'summer', 'winter', 'spring', 'fall', 'holiday', 'vacation'];
  const interestKeywords = ['family', 'romantic', 'adventure', 'relaxing', 'cultural', 'historical'];

  const allKeywords = [...seasonKeywords, ...interestKeywords];

  for (const msg of messages) {
    const content = msg.content.toLowerCase();
    allKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        topics.add(keyword);
      }
    });
  }

  return Array.from(topics);
}

function generateSummary(messages: any[]): string {
  if (messages.length === 0) return 'No summary available';

  // Use the first user message as a basis for summary
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (firstUserMsg) {
    return firstUserMsg.content.substring(0, 100) + (firstUserMsg.content.length > 100 ? '...' : '');
  }

  return 'Trip planning conversation';
}

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

  // Set up event listeners
  const onProgress = (data: any) => {
    res.write(`event: progress\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onError = (data: any) => {
    res.write(`event: error\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onComplete = (data: any) => {
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

  // Return immediately with process ID
  res.status(202).json({ processId, status: 'processing' });

  // Start background processing
  processIntelligentImport(userId, content, emitter)
    .then(() => {
      processEmitters.delete(processId);
    })
    .catch(error => {
      console.error('Error in intelligent import:', error);
      emitter.emitError(
        ProcessingPhase.POPULATING,
        error instanceof Error ? error.message : 'Unknown error'
      );
      processEmitters.delete(processId);
    });
});

/**
 * Process intelligent import with progress updates
 */
async function processIntelligentImport(
  userId: string,
  content: string,
  emitter: ProgressEmitter
): Promise<void> {
  try {
    // Phase 1: Store (5%)
    emitter.emitPhase(ProcessingPhase.STORING, 5);
    const now = new Date().toISOString();
    const documentId = randomUUID();

    // Detect if this is pre-structured extraction JSON or raw conversation
    let isPreStructured = false;
    let preStructuredData: any = null;
    try {
      const testParse = JSON.parse(content);
      if (testParse.conversationMetadata && testParse.tripOverview && testParse.detailedItinerary) {
        isPreStructured = true;
        preStructuredData = testParse;
      }
    } catch {
      // Not JSON or not structured format, proceed with normal parsing
    }

    // Handle pre-structured extraction JSON
    if (isPreStructured && preStructuredData) {
      console.log('[Import] Detected pre-structured extraction JSON');

      // Transform pre-structured data to match extraction format expected by itineraryTransform.ts
      const transformedData = {
        destinations: preStructuredData.tripOverview?.destinations || [],
        dates: preStructuredData.tripOverview?.dates,
        travelers: preStructuredData.tripOverview?.travelers || { adults: 0, children: 0, infants: 0 },
        budget: preStructuredData.tripOverview?.budget,
        preferences: preStructuredData.preferences || {},
        constraints: preStructuredData.preferences?.constraints || [],
        keyTopics: [],
        summary: `Imported trip to ${preStructuredData.tripOverview?.destinations?.join(', ') || 'unknown destinations'}`,
        // CRITICAL: Include detailedItinerary array from root level for itinerary transformation
        detailedItinerary: preStructuredData.detailedItinerary || [],
        extractionMetadata: preStructuredData.extractionQuality || {
          messagesAnalyzed: preStructuredData.conversationMetadata?.totalMessages || 0,
          backwardAnalysisDepth: 0,
          optionsPerSlot: 3,
          reservationsFound: preStructuredData.extractionQuality?.reservationsFound || 0,
        },
      };

      console.log(`[Import] Transformed data includes ${transformedData.detailedItinerary.length} itinerary items`);

      const document = db.createDocument({
        documentId,
        userId,
        type: 'pre_structured_trip',
        title: preStructuredData.conversationMetadata.title || 'Imported Trip',
        rawContent: content,
        metadata: JSON.stringify({
          format: 'pre_structured',
          messageCount: preStructuredData.conversationMetadata.totalMessages || 0,
          conversationId: null,
          model: 'chatgpt',
          parsedAt: now,
          isPreStructured: true,
          detailedItineraryItems: transformedData.detailedItinerary.length,
        }),
        threadId: undefined,
        embeddingStatus: 'skipped', // Skip embedding for pre-structured
        extractionStatus: 'completed',
        extractedData: JSON.stringify(transformedData),
      });

      // Skip phases 2-6 and go directly to completion
      emitter.emitProgress(
        ProcessingPhase.POPULATING,
        100,
        `✓ Imported pre-structured trip: ${preStructuredData.tripOverview?.destinations?.join(', ') || 'Unknown destinations'}`
      );

      emitter.emitComplete({
        documentId: document.documentId,
        title: document.title,
        extractedData: preStructuredData.tripOverview || preStructuredData,
        stats: {
          destinations: preStructuredData.tripOverview?.destinations?.length || 0,
          itineraryItems: preStructuredData.detailedItinerary?.length || 0,
        },
      });
      return;
    }

    // Normal flow: parse ChatGPT conversation
    const parsed = ChatGPTParser.parse(content);

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
        parsedAt: now,
      }),
      threadId: undefined,
      embeddingStatus: 'pending',
      extractionStatus: 'pending',
    });

    // Phase 2: Extract text (15%)
    emitter.emitProgress(
      ProcessingPhase.EXTRACTING_TEXT,
      15,
      `Extracted ${parsed.messages.length} messages from conversation: "${parsed.title || 'Untitled'}"`
    );

    // Phase 3: Chunk (25%)
    emitter.emitProgress(
      ProcessingPhase.CHUNKING,
      25,
      'Analyzing conversation structure and splitting into semantic chunks...'
    );
    // Update document status to processing for embeddings
    db.updateDocument(documentId, {
      embeddingStatus: 'processing',
      updatedAt: new Date().toISOString(),
    });

    // Use RAG manager to chunk the document
    const ragResult = await ragManager.ingestChatGPTTranscript(content, userId);

    if (!ragResult.success || !ragResult.document) {
      throw new Error(ragResult.error || 'Failed to chunk document');
    }

    // Phase 4: Embed (35%)
    const embeddingMessage = ragResult.embeddingsGenerated > 0
      ? `Generated ${ragResult.embeddingsGenerated} vector embeddings across ${ragResult.chunksCreated} text chunks for semantic search`
      : `Created ${ragResult.chunksCreated} text chunks (OpenAI API not configured for embeddings)`;
    emitter.emitProgress(ProcessingPhase.EMBEDDING, 35, embeddingMessage);

    // Phase 5: Store in RAG (50%)
    const avgChunkSize = ragResult.stats?.avgChunkSize || 0;
    emitter.emitProgress(
      ProcessingPhase.RAG_STORE,
      50,
      `Saved ${ragResult.chunksCreated} chunks (avg ${avgChunkSize} chars) to knowledge base for AI context retrieval`
    );
    // Save chunks and embeddings to database
    const ragDocument = ragResult.document;
    for (const chunk of ragDocument.chunks) {
      db.createDocumentChunk({
        chunkId: chunk.chunkId,
        documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        metadata: JSON.stringify(chunk.metadata),
      });

      // Save embedding if it exists
      if (chunk.embedding) {
        db.createEmbedding({
          embeddingId: randomUUID(),
          chunkId: chunk.chunkId,
          documentId,
          vector: JSON.stringify(chunk.embedding),
          model: 'text-embedding-3-small',
        });
      }
    }

    // Update document with embedding stats
    db.updateDocument(documentId, {
      embeddingStatus: 'completed',
      metadata: JSON.stringify({
        ...JSON.parse(document.metadata),
        chunks: ragResult.chunksCreated,
        embeddings: ragResult.embeddingsGenerated,
        processingStats: ragResult.stats,
      }),
      updatedAt: new Date().toISOString(),
    });

    // Phase 6: Agent extraction (60%)
    emitter.emitProgress(
      ProcessingPhase.AGENT_SUMMARY,
      60,
      'AI agent analyzing conversation to extract trip details, destinations, dates, and preferences...'
    );

    const { isAnthropicConfigured } = await import('@tripplanner/agent-graph');
    const hasAnthropicKey = isAnthropicConfigured();

    let extractedData;
    if (hasAnthropicKey) {
      try {
        const { getTripExtractor } = await import('@tripplanner/agent-graph');
        const extractor = getTripExtractor();
        const result = await extractor.extractFromTranscript(content);

        if (result.success && result.data) {
          extractedData = result.data;
          // Emit detailed extraction results
          const destinations = extractedData.destinations.join(', ') || 'No destinations';
          const dateInfo = extractedData.dates?.start ? `from ${extractedData.dates.start}` : 'dates flexible';
          const topics = extractedData.keyTopics.slice(0, 3).join(', ') || 'general travel';
          emitter.emitProgress(
            ProcessingPhase.AGENT_SUMMARY,
            65,
            `✓ Extracted: ${destinations} ${dateInfo} | Themes: ${topics} | ${extractedData.travelers.adults} traveler(s)`
          );
        } else {
          throw new Error('AI extraction failed');
        }
      } catch (aiError) {
        console.warn('AI extraction error, falling back:', aiError);
        extractedData = {
          destinations: extractDestinations(parsed.messages),
          dates: extractDates(parsed.messages),
          travelers: { adults: 1, children: 0, infants: 0 },
          preferences: extractPreferences(parsed.messages),
          keyTopics: extractKeyTopics(parsed.messages),
          summary: parsed.title || generateSummary(parsed.messages),
        };
        emitter.emitProgress(
          ProcessingPhase.AGENT_SUMMARY,
          65,
          `✓ Pattern-based extraction: ${extractedData.destinations.join(', ') || 'locations detected'}`
        );
      }
    } else {
      extractedData = {
        destinations: extractDestinations(parsed.messages),
        dates: extractDates(parsed.messages),
        travelers: { adults: 1, children: 0, infants: 0 },
        preferences: extractPreferences(parsed.messages),
        keyTopics: extractKeyTopics(parsed.messages),
        summary: parsed.title || generateSummary(parsed.messages),
      };
      emitter.emitProgress(
        ProcessingPhase.AGENT_SUMMARY,
        65,
        `Using pattern matching (AI not configured): Found ${extractedData.destinations.length} destination(s)`
      );
    }

    // Phase 7: Generate itineraries (70%)
    const activityCount = extractedData.preferences.activities?.length || 0;
    const accommodations = extractedData.preferences.accommodation?.length || 0;
    emitter.emitProgress(
      ProcessingPhase.ITINERARY_GEN,
      70,
      `Building itinerary structure: ${activityCount} activities, ${accommodations} accommodation preference(s) identified`
    );

    // Phase 8: Generate vision tiles (80%)
    const visionTopics = extractedData.keyTopics.length;
    emitter.emitProgress(
      ProcessingPhase.VISION_GEN,
      80,
      `Creating ${visionTopics} vision tile(s) based on trip themes: ${extractedData.keyTopics.slice(0, 3).join(', ')}`
    );

    // Phase 9: Analyze integrations (90%)
    const hasFlights = extractedData.preferences.transportation?.includes('flight');
    const hasHotels = extractedData.preferences.accommodation?.some((a: string) => a.includes('hotel'));
    emitter.emitProgress(
      ProcessingPhase.INTEGRATION_ANALYSIS,
      90,
      `Analyzing: ${hasFlights ? 'Flight bookings detected' : 'No flights found'}, ${hasHotels ? 'Hotel reservations detected' : 'No hotels found'}`
    );

    // Phase 10: Format (95%)
    emitter.emitProgress(
      ProcessingPhase.FORMATTING,
      95,
      `Structuring ${extractedData.destinations.length} destination(s) with ${visionTopics} theme(s) into dashboard format`
    );
    const formatted = {
      documentId: document.documentId,
      title: document.title,
      extractedData,
      messageCount: parsed.messages.length,
    };

    // Phase 11: Populate (98%)
    emitter.emitProgress(
      ProcessingPhase.POPULATING,
      98,
      `Populating dashboard: "${parsed.title || 'Your Trip'}" with ${ragResult.chunksCreated} searchable chunks ready for AI chat`
    );
    // Update document with extraction status
    db.updateDocument(documentId, {
      extractionStatus: 'completed',
      extractedData: JSON.stringify(extractedData),
      updatedAt: new Date().toISOString(),
    });

    // Complete (100%)
    emitter.emitComplete(formatted);
  } catch (error) {
    console.error('Error in processIntelligentImport:', error);
    throw error;
  }
}

/**
 * Background processing function for document embeddings
 */
async function processDocumentEmbeddings(
  documentId: string,
  content: string,
  userId: string
): Promise<void> {
  try {
    // Update status to processing
    db.updateDocument(documentId, {
      embeddingStatus: 'processing',
      updatedAt: new Date().toISOString(),
    });

    // Use RAG manager to chunk and embed
    const result = await ragManager.ingestChatGPTTranscript(content, userId);

    if (!result.success || !result.document) {
      throw new Error(result.error || 'Failed to process document');
    }

    const ragDocument = result.document;

    // Save chunks to database
    for (const chunk of ragDocument.chunks) {
      db.createDocumentChunk({
        chunkId: chunk.chunkId,
        documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        metadata: JSON.stringify(chunk.metadata),
      });

      // Save embedding if it exists
      if (chunk.embedding) {
        db.createEmbedding({
          embeddingId: randomUUID(),
          chunkId: chunk.chunkId,
          documentId,
          vector: JSON.stringify(chunk.embedding),
          model: 'text-embedding-3-small', // From OpenAI service config
        });
      }
    }

    console.log(`✅ Successfully processed document ${documentId}:`, {
      chunks: result.chunksCreated,
      embeddings: result.embeddingsGenerated,
      processingTime: result.stats?.processingTimeMs,
    });

    // Update document status to completed
    db.updateDocument(documentId, {
      embeddingStatus: 'completed',
      metadata: JSON.stringify({
        ...JSON.parse(db.getDocumentById(documentId)?.metadata || '{}'),
        chunks: result.chunksCreated,
        embeddings: result.embeddingsGenerated,
        processingStats: result.stats,
      }),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in background embedding processing:', error);
    throw error;
  }
}

export default router;
