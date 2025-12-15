/**
 * Document Chunking Strategy for RAG Ingestion
 * Splits documents into smaller chunks suitable for embedding and retrieval
 */

export interface ChunkConfig {
  maxChunkSize?: number; // Maximum characters per chunk
  chunkOverlap?: number; // Number of characters to overlap between chunks
  strategy?: 'paragraph' | 'sentence' | 'fixed' | 'recursive';
  preserveFormatting?: boolean; // Whether to preserve markdown/formatting
}

export interface DocumentChunk {
  content: string;
  index: number;
  metadata: {
    startChar: number;
    endChar: number;
    tokenCount?: number;
    type?: string;
  };
}

export class DocumentChunker {
  private config: Required<ChunkConfig>;

  constructor(config: ChunkConfig = {}) {
    this.config = {
      maxChunkSize: config.maxChunkSize || 1000,
      chunkOverlap: config.chunkOverlap || 200,
      strategy: config.strategy || 'recursive',
      preserveFormatting: config.preserveFormatting ?? true,
    };

    // Validate config
    if (this.config.chunkOverlap >= this.config.maxChunkSize) {
      throw new Error('chunkOverlap must be less than maxChunkSize');
    }
  }

  /**
   * Chunk a document based on the configured strategy
   */
  public chunk(text: string): DocumentChunk[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    switch (this.config.strategy) {
      case 'paragraph':
        return this.chunkByParagraph(text);
      case 'sentence':
        return this.chunkBySentence(text);
      case 'fixed':
        return this.chunkByFixedSize(text);
      case 'recursive':
        return this.chunkRecursive(text);
      default:
        throw new Error(`Unknown chunking strategy: ${this.config.strategy}`);
    }
  }

  /**
   * Chunk by paragraphs (double newlines)
   */
  private chunkByParagraph(text: string): DocumentChunk[] {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let startChar = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      const potentialChunk = currentChunk
        ? currentChunk + '\n\n' + trimmed
        : trimmed;

      if (potentialChunk.length <= this.config.maxChunkSize) {
        currentChunk = potentialChunk;
      } else {
        // Flush current chunk if it exists
        if (currentChunk) {
          chunks.push(this.createChunk(currentChunk, chunkIndex++, startChar));
          startChar += currentChunk.length;

          // Handle overlap
          const overlapText = this.extractOverlap(currentChunk);
          currentChunk = overlapText ? overlapText + '\n\n' + trimmed : trimmed;
        } else {
          // Single paragraph exceeds max size, split it
          const subChunks = this.chunkByFixedSize(trimmed);
          for (const subChunk of subChunks) {
            chunks.push({
              ...subChunk,
              index: chunkIndex++,
              metadata: {
                ...subChunk.metadata,
                startChar: startChar + subChunk.metadata.startChar,
                type: 'large-paragraph',
              },
            });
          }
          startChar += trimmed.length;
          currentChunk = '';
        }
      }
    }

    // Flush final chunk
    if (currentChunk) {
      chunks.push(this.createChunk(currentChunk, chunkIndex, startChar));
    }

    return chunks;
  }

  /**
   * Chunk by sentences
   */
  private chunkBySentence(text: string): DocumentChunk[] {
    // Simple sentence splitting (could be enhanced with NLP library)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let startChar = 0;
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      const potentialChunk = currentChunk
        ? currentChunk + ' ' + trimmed
        : trimmed;

      if (potentialChunk.length <= this.config.maxChunkSize) {
        currentChunk = potentialChunk;
      } else {
        // Flush current chunk
        if (currentChunk) {
          chunks.push(this.createChunk(currentChunk, chunkIndex++, startChar));
          startChar += currentChunk.length;

          const overlapText = this.extractOverlap(currentChunk);
          currentChunk = overlapText ? overlapText + ' ' + trimmed : trimmed;
        } else {
          // Single sentence exceeds max size
          currentChunk = trimmed;
        }
      }
    }

    // Flush final chunk
    if (currentChunk) {
      chunks.push(this.createChunk(currentChunk, chunkIndex, startChar));
    }

    return chunks;
  }

  /**
   * Chunk by fixed character size with overlap
   */
  private chunkByFixedSize(text: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let index = 0;
    let position = 0;

    while (position < text.length) {
      const end = Math.min(position + this.config.maxChunkSize, text.length);
      const chunkText = text.substring(position, end);

      chunks.push(this.createChunk(chunkText, index++, position));

      // Move position forward, accounting for overlap
      position = end - this.config.chunkOverlap;
      if (position <= 0) position = end;
    }

    return chunks;
  }

  /**
   * Recursive chunking - tries larger separators first, falls back to smaller ones
   * This is the recommended strategy for most use cases
   */
  private chunkRecursive(text: string): DocumentChunk[] {
    const separators = [
      '\n\n',  // Paragraphs
      '\n',    // Lines
      '. ',    // Sentences
      ', ',    // Clauses
      ' ',     // Words
    ];

    return this.recursiveSplit(text, separators, 0, 0);
  }

  private recursiveSplit(
    text: string,
    separators: string[],
    chunkIndex: number,
    startChar: number
  ): DocumentChunk[] {
    if (!text || text.length <= this.config.maxChunkSize) {
      return text.trim() ? [this.createChunk(text.trim(), chunkIndex, startChar)] : [];
    }

    if (separators.length === 0) {
      // No more separators, do fixed-size split
      return this.chunkByFixedSize(text);
    }

    const [separator, ...restSeparators] = separators;
    const parts = text.split(separator);
    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let currentStartChar = startChar;
    let currentIndex = chunkIndex;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const potentialChunk = currentChunk
        ? currentChunk + separator + part
        : part;

      if (potentialChunk.length <= this.config.maxChunkSize) {
        currentChunk = potentialChunk;
      } else {
        // Current chunk is full
        if (currentChunk) {
          // Try to split current chunk with smaller separators if it's still too large
          if (currentChunk.length > this.config.maxChunkSize) {
            const subChunks = this.recursiveSplit(
              currentChunk,
              restSeparators,
              currentIndex,
              currentStartChar
            );
            chunks.push(...subChunks);
            currentIndex += subChunks.length;
          } else {
            chunks.push(this.createChunk(currentChunk, currentIndex++, currentStartChar));
          }
          currentStartChar += currentChunk.length + separator.length;

          // Start new chunk with overlap
          const overlapText = this.extractOverlap(currentChunk);
          currentChunk = overlapText ? overlapText + separator + part : part;
        } else {
          currentChunk = part;
        }
      }
    }

    // Flush final chunk
    if (currentChunk && currentChunk.trim()) {
      if (currentChunk.length > this.config.maxChunkSize) {
        const subChunks = this.recursiveSplit(
          currentChunk,
          restSeparators,
          currentIndex,
          currentStartChar
        );
        chunks.push(...subChunks);
      } else {
        chunks.push(this.createChunk(currentChunk, currentIndex, currentStartChar));
      }
    }

    return chunks;
  }

  /**
   * Extract overlap text from the end of a chunk
   */
  private extractOverlap(text: string): string {
    if (this.config.chunkOverlap === 0) return '';

    const overlapStart = Math.max(0, text.length - this.config.chunkOverlap);
    return text.substring(overlapStart);
  }

  /**
   * Create a chunk object with metadata
   */
  private createChunk(
    content: string,
    index: number,
    startChar: number
  ): DocumentChunk {
    return {
      content: content.trim(),
      index,
      metadata: {
        startChar,
        endChar: startChar + content.length,
        tokenCount: this.estimateTokenCount(content),
      },
    };
  }

  /**
   * Estimate token count (rough approximation: ~4 chars per token)
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get statistics about chunking results
   */
  public static getStats(chunks: DocumentChunk[]): {
    chunkCount: number;
    avgChunkSize: number;
    minChunkSize: number;
    maxChunkSize: number;
    totalTokens: number;
  } {
    if (chunks.length === 0) {
      return {
        chunkCount: 0,
        avgChunkSize: 0,
        minChunkSize: 0,
        maxChunkSize: 0,
        totalTokens: 0,
      };
    }

    const sizes = chunks.map(c => c.content.length);
    const tokens = chunks.reduce((sum, c) => sum + (c.metadata.tokenCount || 0), 0);

    return {
      chunkCount: chunks.length,
      avgChunkSize: Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length),
      minChunkSize: Math.min(...sizes),
      maxChunkSize: Math.max(...sizes),
      totalTokens: tokens,
    };
  }
}
