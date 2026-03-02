// TripPlanner Agent Graph
// LangGraph-based multi-agent system for trip planning

export const version = '0.1.0';

// Export ChatGPT transcript parser
export { ChatGPTParser } from './services/chatgpt-parser.js';
export type { ChatGPTMessage, ParsedTranscript } from './services/chatgpt-parser.js';

// Export trip extraction agent
export { tripExtractor, getTripExtractor, TripExtractorAgent } from './agents/trip-extractor.js';
export type { ExtractedTripData, ExtractionResult } from './agents/trip-extractor.js';

// Export RAG chat agent
export { ragChatAgent, RAGChatAgent } from './agents/rag-chat-agent.js';
export type { ChatMessage, DocumentContext, RAGChatConfig, ChatResponse } from './agents/rag-chat-agent.js';

// Export OpenAI service
export { openaiService, OpenAIService } from './services/openai.js';
export type { EmbeddingConfig, EmbeddingResult, BatchEmbeddingResult } from './services/openai.js';

// Export RAG manager
export { ragManager, RAGManager } from './services/rag-manager.js';
export type { RAGDocument, RAGChunk, IngestionResult, RAGConfig } from './services/rag-manager.js';

// Export document chunker
export { DocumentChunker } from './services/document-chunker.js';
export type { ChunkConfig, DocumentChunk } from './services/document-chunker.js';

// Export configuration utilities
export {
  getConfig,
  getAnthropicApiKey,
  getOpenAIApiKey,
  getModel,
  getTemperature,
  isAnthropicConfigured,
  isOpenAIConfigured,
} from './config/index.js';

// TODO: Implement agent nodes and graph orchestration
