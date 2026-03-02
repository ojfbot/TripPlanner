/**
 * Background processing functions for document import pipelines.
 * Separated from the route layer so integrations.ts stays focused on HTTP concerns.
 */

import { randomUUID } from 'crypto';
import { db } from './database.js';
import { openaiService, ChatGPTParser, ragManager } from '@tripplanner/agent-graph';
import type { ExtractedTripData } from '@tripplanner/agent-graph';
import { ProgressEmitter, ProcessingPhase } from './progress-emitter.js';
import {
  extractDestinations,
  extractDates,
  extractPreferences,
  extractKeyTopics,
  generateSummary,
} from './trip-extractor.js';

/** Shape of the pre-structured extraction JSON that the intelligent import accepts. */
export interface PreStructuredTrip {
  conversationMetadata: {
    title?: string;
    totalMessages?: number;
  };
  tripOverview: {
    destinations?: string[];
    dates?: ExtractedTripData['dates'];
    travelers?: ExtractedTripData['travelers'];
    budget?: ExtractedTripData['budget'];
  };
  preferences?: ExtractedTripData['preferences'] & { constraints?: string[] };
  detailedItinerary?: ExtractedTripData['detailedItinerary'];
  extractionQuality?: {
    reservationsFound?: number;
  };
}

/**
 * Process intelligent import with progress updates.
 * Handles both pre-structured JSON and raw ChatGPT transcripts.
 */
export async function processIntelligentImport(
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
    let preStructuredData: PreStructuredTrip | null = null;
    try {
      const testParse = JSON.parse(content);
      if (testParse.conversationMetadata && testParse.tripOverview && testParse.detailedItinerary) {
        isPreStructured = true;
        preStructuredData = testParse as PreStructuredTrip;
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
        extractionMetadata: preStructuredData.extractionQuality ?? {
          messagesAnalyzed: preStructuredData.conversationMetadata?.totalMessages || 0,
          backwardAnalysisDepth: 0,
          optionsPerSlot: 3,
          reservationsFound: 0,
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
        embeddingStatus: 'skipped',
        extractionStatus: 'completed',
        extractedData: JSON.stringify(transformedData),
      });

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
    db.updateDocument(documentId, {
      embeddingStatus: 'processing',
      updatedAt: new Date().toISOString(),
    });

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

    const ragDocument = ragResult.document;
    for (const chunk of ragDocument.chunks) {
      db.createDocumentChunk({
        chunkId: chunk.chunkId,
        documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        metadata: JSON.stringify(chunk.metadata),
      });

      if (chunk.embedding) {
        db.createEmbedding({
          embeddingId: randomUUID(),
          chunkId: chunk.chunkId,
          documentId,
          vector: JSON.stringify(chunk.embedding),
          model: openaiService.getConfig().model,
        });
      }
    }

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

    let extractedData: ExtractedTripData | undefined;
    if (hasAnthropicKey) {
      try {
        const { getTripExtractor } = await import('@tripplanner/agent-graph');
        const extractor = getTripExtractor();
        const result = await extractor.extractFromTranscript(content);

        if (result.success && result.data) {
          extractedData = result.data;
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
    const hasHotels = extractedData.preferences.accommodation?.some(a => a.includes('hotel'));
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
    db.updateDocument(documentId, {
      extractionStatus: 'completed',
      extractedData: JSON.stringify(extractedData),
      updatedAt: new Date().toISOString(),
    });

    emitter.emitComplete(formatted);
  } catch (error) {
    console.error('Error in processIntelligentImport:', error);
    throw error;
  }
}

/**
 * Background processing function for document embeddings.
 * Chunks a document and stores embeddings in the DB.
 */
export async function processDocumentEmbeddings(
  documentId: string,
  content: string,
  userId: string
): Promise<void> {
  try {
    db.updateDocument(documentId, {
      embeddingStatus: 'processing',
      updatedAt: new Date().toISOString(),
    });

    const result = await ragManager.ingestChatGPTTranscript(content, userId);

    if (!result.success || !result.document) {
      throw new Error(result.error || 'Failed to process document');
    }

    const ragDocument = result.document;

    for (const chunk of ragDocument.chunks) {
      db.createDocumentChunk({
        chunkId: chunk.chunkId,
        documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        metadata: JSON.stringify(chunk.metadata),
      });

      if (chunk.embedding) {
        db.createEmbedding({
          embeddingId: randomUUID(),
          chunkId: chunk.chunkId,
          documentId,
          vector: JSON.stringify(chunk.embedding),
          model: openaiService.getConfig().model,
        });
      }
    }

    console.log(`✅ Successfully processed document ${documentId}:`, {
      chunks: result.chunksCreated,
      embeddings: result.embeddingsGenerated,
      processingTime: result.stats?.processingTimeMs,
    });

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
