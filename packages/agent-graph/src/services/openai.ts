import OpenAI from 'openai';
import { getOpenAIApiKey } from '../config/index.js';

export interface EmbeddingConfig {
  apiKey?: string;
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

class OpenAIService {
  private client: OpenAI | null = null;
  private config: Required<EmbeddingConfig>;

  constructor(config: EmbeddingConfig = {}) {
    this.config = {
      apiKey: config.apiKey || getOpenAIApiKey() || '',
      model: config.model || 'text-embedding-3-small',
      dimensions: config.dimensions || 1536,
    };

    if (this.config.apiKey) {
      this.initializeClient();
    }
  }

  private initializeClient(): void {
    try {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
      });
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
      this.client = null;
    }
  }

  public isConfigured(): boolean {
    return !!this.client && !!this.config.apiKey;
  }

  public getConfig(): Required<EmbeddingConfig> {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<EmbeddingConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };

    if (newConfig.apiKey) {
      this.initializeClient();
    }
  }

  /**
   * Generate embedding for a single text string
   */
  public async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Please configure API key.');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.config.model,
        input: text,
        dimensions: this.config.dimensions,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No embedding returned from OpenAI');
      }

      return {
        embedding: response.data[0].embedding,
        model: response.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate embedding: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple text strings in a single batch
   * More efficient than calling generateEmbedding multiple times
   */
  public async generateBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Please configure API key.');
    }

    if (!texts || texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    // Filter out empty strings
    const validTexts = texts.filter(text => text && text.trim().length > 0);
    if (validTexts.length === 0) {
      throw new Error('All provided texts are empty');
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.config.model,
        input: validTexts,
        dimensions: this.config.dimensions,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No embeddings returned from OpenAI');
      }

      // Ensure embeddings are returned in the same order as input
      const embeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map(item => item.embedding);

      return {
        embeddings,
        model: response.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate batch embeddings: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   * Returns value between -1 and 1, where 1 is identical
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * Test the OpenAI connection with a simple embedding request
   */
  public async testConnection(): Promise<{ success: boolean; error?: string; model?: string }> {
    try {
      if (!this.client) {
        return { success: false, error: 'OpenAI client not initialized' };
      }

      const result = await this.generateEmbedding('test');
      return {
        success: true,
        model: result.model,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const openaiService = new OpenAIService();

// Export class for testing or custom instances
export { OpenAIService };
