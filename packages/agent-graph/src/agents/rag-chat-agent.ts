/**
 * RAG-Enhanced Chat Agent
 *
 * Provides context-aware responses by searching through embedded documents
 * and using retrieved context to inform AI-generated answers.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicApiKey, getModel, getTemperature } from '../config/index.js';
import { OpenAIService } from '../services/openai.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DocumentContext {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  similarity: number;
  metadata?: Record<string, any>;
}

export interface RAGChatConfig {
  anthropicApiKey?: string;
  openaiService?: OpenAIService;
  model?: string;
  temperature?: number;
  maxContextChunks?: number; // Maximum number of chunks to include as context
  similarityThreshold?: number; // Minimum similarity score to include chunk
}

export interface ChatResponse {
  success: boolean;
  message?: string;
  contextsUsed?: DocumentContext[];
  error?: string;
  metadata?: {
    model: string;
    contextCount: number;
    totalContextChars: number;
    inputTokens?: number;
    outputTokens?: number;
  };
}

export class RAGChatAgent {
  private client: Anthropic | null = null;
  private openaiService: OpenAIService;
  private config: Required<RAGChatConfig>;

  constructor(config: RAGChatConfig = {}) {
    this.config = {
      anthropicApiKey: config.anthropicApiKey || getAnthropicApiKey() || '',
      openaiService: config.openaiService || new OpenAIService(),
      model: config.model || getModel(),
      temperature: config.temperature ?? getTemperature(),
      maxContextChunks: config.maxContextChunks || 5,
      similarityThreshold: config.similarityThreshold || 0.7,
    };

    if (this.config.anthropicApiKey) {
      this.initializeClient();
    }

    this.openaiService = this.config.openaiService;
  }

  private initializeClient(): void {
    try {
      this.client = new Anthropic({
        apiKey: this.config.anthropicApiKey,
      });
    } catch (error) {
      console.error('Failed to initialize Anthropic client:', error);
      this.client = null;
    }
  }

  public isConfigured(): boolean {
    return !!this.client && !!this.config.anthropicApiKey && this.openaiService.isConfigured();
  }

  /**
   * Generate a chat response with RAG context
   */
  public async chat(
    userMessage: string,
    documentContexts: DocumentContext[],
    conversationHistory: ChatMessage[] = []
  ): Promise<ChatResponse> {
    if (!this.client) {
      return {
        success: false,
        error: 'Anthropic client not initialized. Please configure ANTHROPIC_API_KEY.',
      };
    }

    try {
      // Filter contexts by similarity threshold and limit
      const relevantContexts = documentContexts
        .filter(ctx => ctx.similarity >= this.config.similarityThreshold)
        .slice(0, this.config.maxContextChunks);

      // Build context section
      const contextSection = this.buildContextSection(relevantContexts);

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(contextSection);

      // Build conversation messages
      const messages = this.buildMessages(conversationHistory, userMessage);

      // Call Anthropic API
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 4096,
        temperature: this.config.temperature,
        system: systemPrompt,
        messages,
      });

      // Extract text content
      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as Anthropic.TextBlock).text)
        .join('\n');

      return {
        success: true,
        message: textContent,
        contextsUsed: relevantContexts,
        metadata: {
          model: response.model,
          contextCount: relevantContexts.length,
          totalContextChars: contextSection.length,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during chat',
      };
    }
  }

  /**
   * Build context section from relevant document chunks
   */
  private buildContextSection(contexts: DocumentContext[]): string {
    if (contexts.length === 0) {
      return '';
    }

    const contextParts = contexts.map((ctx, index) => {
      return `[Context ${index + 1}] From "${ctx.documentTitle}" (similarity: ${(ctx.similarity * 100).toFixed(1)}%)\n${ctx.content}`;
    });

    return `# Retrieved Context\n\nThe following information has been retrieved from your uploaded documents:\n\n${contextParts.join('\n\n---\n\n')}`;
  }

  /**
   * Build system prompt with context
   */
  private buildSystemPrompt(contextSection: string): string {
    const basePrompt = `You are a helpful AI travel assistant for TripPlanner. Your role is to help users plan trips, create itineraries, and provide travel advice.

When answering questions:
1. Use information from the retrieved context when relevant
2. If the context contains trip planning conversations, use that to understand the user's preferences
3. Be specific and actionable in your recommendations
4. If you're not sure about something, say so
5. Cite which context you're using when making recommendations (e.g., "Based on your previous conversation about Paris...")`;

    if (contextSection) {
      return `${basePrompt}\n\n${contextSection}`;
    }

    return basePrompt;
  }

  /**
   * Build conversation messages for API
   */
  private buildMessages(
    history: ChatMessage[],
    currentMessage: string
  ): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history
    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: currentMessage,
    });

    return messages;
  }

  /**
   * Search for relevant contexts using semantic search
   * This method would typically be called before chat() to retrieve contexts
   */
  public async searchContexts(
    query: string,
    chunks: Array<{ chunkId: string; documentId: string; content: string; embedding: number[]; documentTitle: string; metadata?: any }>
  ): Promise<DocumentContext[]> {
    if (!this.openaiService.isConfigured()) {
      throw new Error('OpenAI service not configured for semantic search');
    }

    // Generate query embedding
    const queryResult = await this.openaiService.generateEmbedding(query);
    const queryEmbedding = queryResult.embedding;

    // Calculate similarities
    const contexts: DocumentContext[] = chunks.map(chunk => {
      const similarity = OpenAIService.cosineSimilarity(queryEmbedding, chunk.embedding);
      return {
        chunkId: chunk.chunkId,
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        content: chunk.content,
        similarity,
        metadata: chunk.metadata,
      };
    });

    // Sort by similarity (highest first)
    return contexts.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Chat with automatic context retrieval
   * Convenience method that combines searchContexts and chat
   */
  public async chatWithAutoContext(
    userMessage: string,
    availableChunks: Array<{ chunkId: string; documentId: string; content: string; embedding: number[]; documentTitle: string; metadata?: any }>,
    conversationHistory: ChatMessage[] = []
  ): Promise<ChatResponse> {
    // Search for relevant contexts
    const contexts = await this.searchContexts(userMessage, availableChunks);

    // Generate response with contexts
    return this.chat(userMessage, contexts, conversationHistory);
  }
}

// Export singleton instance
export const ragChatAgent = new RAGChatAgent();
