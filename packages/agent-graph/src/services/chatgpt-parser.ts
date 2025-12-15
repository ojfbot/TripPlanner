/**
 * ChatGPT Transcript Parser
 * Handles parsing of ChatGPT conversation exports in both JSON and text formats
 */

export interface ChatGPTMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ParsedTranscript {
  title?: string;
  messages: ChatGPTMessage[];
  metadata: {
    createTime?: number;
    updateTime?: number;
    conversationId?: string;
    model?: string;
  };
  format: 'json' | 'text';
}

/**
 * ChatGPT JSON export structure (based on official export format)
 */
interface ChatGPTJSONExport {
  title?: string;
  create_time?: number;
  update_time?: number;
  mapping?: {
    [key: string]: {
      id: string;
      message?: {
        id: string;
        author: {
          role: string;
        };
        content: {
          content_type: string;
          parts?: string[];
        };
        create_time?: number;
      };
      parent?: string;
      children?: string[];
    };
  };
  conversation_id?: string;
  current_node?: string;
  model?: {
    slug?: string;
  };
}

export class ChatGPTParser {
  /**
   * Parse ChatGPT transcript from string (auto-detects format)
   */
  public static parse(content: string): ParsedTranscript {
    if (!content || content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    // Try parsing as JSON first
    try {
      const parsed = JSON.parse(content);
      return this.parseJSON(parsed);
    } catch (e) {
      // If JSON parsing fails, treat as plain text
      return this.parseText(content);
    }
  }

  /**
   * Parse ChatGPT JSON export format
   */
  private static parseJSON(data: any): ParsedTranscript {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid JSON structure');
    }

    const exportData = data as ChatGPTJSONExport;
    const messages: ChatGPTMessage[] = [];

    // Extract messages from mapping structure
    if (exportData.mapping) {
      // Build conversation tree
      const nodeMap = exportData.mapping;
      const rootNodes: string[] = [];

      // Find root nodes (nodes without parents or with null parents)
      for (const [nodeId, node] of Object.entries(nodeMap)) {
        if (!node.parent || !nodeMap[node.parent]) {
          rootNodes.push(nodeId);
        }
      }

      // Traverse from root to build message sequence
      const traverseNode = (nodeId: string) => {
        const node = nodeMap[nodeId];
        if (!node) return;

        // Add message if it exists
        if (node.message && node.message.content && node.message.content.parts) {
          const role = node.message.author.role;
          const content = node.message.content.parts.join('\n');

          // Only include user and assistant messages
          if ((role === 'user' || role === 'assistant') && content.trim().length > 0) {
            messages.push({
              role: role as 'user' | 'assistant',
              content: content.trim(),
              timestamp: node.message.create_time
                ? new Date(node.message.create_time * 1000).toISOString()
                : undefined,
            });
          }
        }

        // Traverse children
        if (node.children && node.children.length > 0) {
          // For branching conversations, take the first child
          // (or could be enhanced to handle multiple branches)
          traverseNode(node.children[0]);
        }
      };

      // Start traversal from root nodes
      rootNodes.forEach(rootId => traverseNode(rootId));
    }

    if (messages.length === 0) {
      throw new Error('No messages found in JSON export');
    }

    return {
      title: exportData.title || 'Untitled Conversation',
      messages,
      metadata: {
        createTime: exportData.create_time,
        updateTime: exportData.update_time,
        conversationId: exportData.conversation_id,
        model: exportData.model?.slug,
      },
      format: 'json',
    };
  }

  /**
   * Parse plain text ChatGPT transcript
   * Expected format:
   * User: [message]
   * Assistant: [message]
   * or
   * You: [message]
   * ChatGPT: [message]
   */
  private static parseText(content: string): ParsedTranscript {
    const messages: ChatGPTMessage[] = [];
    const lines = content.split('\n');

    let currentRole: 'user' | 'assistant' | null = null;
    let currentContent: string[] = [];

    const flushMessage = () => {
      if (currentRole && currentContent.length > 0) {
        const content = currentContent.join('\n').trim();
        if (content.length > 0) {
          messages.push({
            role: currentRole,
            content,
          });
        }
      }
      currentContent = [];
    };

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check for role markers
      const userMatch = trimmedLine.match(/^(User|You):\s*(.*)$/i);
      const assistantMatch = trimmedLine.match(/^(Assistant|ChatGPT|AI):\s*(.*)$/i);

      if (userMatch) {
        flushMessage();
        currentRole = 'user';
        if (userMatch[2]) {
          currentContent.push(userMatch[2]);
        }
      } else if (assistantMatch) {
        flushMessage();
        currentRole = 'assistant';
        if (assistantMatch[2]) {
          currentContent.push(assistantMatch[2]);
        }
      } else if (currentRole && trimmedLine.length > 0) {
        // Continue current message
        currentContent.push(trimmedLine);
      } else if (trimmedLine.length === 0 && currentContent.length > 0) {
        // Empty line within message - preserve as paragraph break
        currentContent.push('');
      }
    }

    // Flush last message
    flushMessage();

    if (messages.length === 0) {
      throw new Error('No messages found in text format. Expected format: "User: ..." or "Assistant: ..."');
    }

    // Try to extract title from first user message
    const firstUserMessage = messages.find(m => m.role === 'user');
    const title = firstUserMessage
      ? firstUserMessage.content.substring(0, 50).trim() + (firstUserMessage.content.length > 50 ? '...' : '')
      : 'Untitled Conversation';

    return {
      title,
      messages,
      metadata: {},
      format: 'text',
    };
  }

  /**
   * Validate parsed transcript
   */
  public static validate(transcript: ParsedTranscript): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!transcript.messages || transcript.messages.length === 0) {
      errors.push('Transcript has no messages');
    }

    if (transcript.messages) {
      for (let i = 0; i < transcript.messages.length; i++) {
        const msg = transcript.messages[i];

        if (!msg.role || (msg.role !== 'user' && msg.role !== 'assistant')) {
          errors.push(`Message ${i + 1}: Invalid role "${msg.role}"`);
        }

        if (!msg.content || msg.content.trim().length === 0) {
          errors.push(`Message ${i + 1}: Empty content`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convert transcript to plain text format
   */
  public static toText(transcript: ParsedTranscript): string {
    const lines: string[] = [];

    if (transcript.title) {
      lines.push(`# ${transcript.title}`);
      lines.push('');
    }

    for (const message of transcript.messages) {
      const roleLabel = message.role === 'user' ? 'User' : 'Assistant';
      lines.push(`${roleLabel}: ${message.content}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get statistics about the transcript
   */
  public static getStats(transcript: ParsedTranscript): {
    messageCount: number;
    userMessageCount: number;
    assistantMessageCount: number;
    totalCharacters: number;
    averageMessageLength: number;
  } {
    const userMessages = transcript.messages.filter(m => m.role === 'user');
    const assistantMessages = transcript.messages.filter(m => m.role === 'assistant');
    const totalChars = transcript.messages.reduce((sum, m) => sum + m.content.length, 0);

    return {
      messageCount: transcript.messages.length,
      userMessageCount: userMessages.length,
      assistantMessageCount: assistantMessages.length,
      totalCharacters: totalChars,
      averageMessageLength: transcript.messages.length > 0
        ? Math.round(totalChars / transcript.messages.length)
        : 0,
    };
  }
}
