/**
 * Trip Data Extraction Agent
 * Uses Claude to extract structured trip information from ChatGPT conversations
 */

import Anthropic from '@anthropic-ai/sdk';
import { ChatGPTParser, type ParsedTranscript } from '../services/chatgpt-parser.js';
import { getAnthropicApiKey, getModel } from '../config/index.js';

// Alternative option for a time slot
export interface AlternativeOption {
  title: string;
  description: string;
  reason: string; // Why this was considered
  url?: string;
  conversationRef?: string; // Message ID where discussed
}

// Enhanced itinerary item with full context
export interface DetailedItineraryItem {
  dayIndex: number;
  startTime: string; // ISO timestamp with minute precision
  endTime?: string;
  category: 'activity' | 'transit' | 'meal' | 'reservation' | 'lodging';
  title: string;
  description: string; // Full context from conversation
  location: string;

  // Reservation tracking
  status?: 'confirmed' | 'pending' | 'cancelled' | 'needs_attention';
  confirmationNumber?: string;
  vendor?: string;
  cost?: number;
  currency?: string;

  // Multi-option tracking
  alternatives?: AlternativeOption[];

  // Context and reasoning
  reasoning: string; // Why this was chosen
  conversationRefs: string[]; // Message IDs where this was discussed
  documentationLinks: string[]; // URLs mentioned

  // Metadata
  notes?: string;
  url?: string;
}

export interface ExtractedTripData {
  destinations: string[];
  dates?: {
    start?: string;
    end?: string;
    flexible: boolean;
  };
  travelers: {
    adults: number;
    children: number;
    infants: number;
  };
  budget?: {
    amount?: number;
    currency?: string;
    flexibility?: 'strict' | 'flexible' | 'very_flexible';
  };
  preferences: {
    accommodation?: string[];
    activities?: string[];
    transportation?: string[];
    dining?: string[];
  };
  constraints?: string[];
  keyTopics: string[];
  summary: string;

  // Enhanced fields for detailed extraction
  detailedItinerary?: DetailedItineraryItem[];
  extractionMetadata?: {
    messagesAnalyzed: number;
    backwardAnalysisDepth: number;
    optionsPerSlot: number;
    reservationsFound: number;
  };
}

export interface ExtractionResult {
  success: boolean;
  data?: ExtractedTripData;
  error?: string;
  conversationTitle?: string;
  messageCount?: number;
}

export class TripExtractorAgent {
  private client: Anthropic;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || getAnthropicApiKey();
    if (!key) {
      throw new Error('ANTHROPIC_API_KEY is required for trip extraction');
    }
    this.client = new Anthropic({ apiKey: key });
    this.model = model || getModel();
  }

  /**
   * Extract trip data from a ChatGPT conversation transcript
   * Now uses enhanced backward chronological analysis
   */
  async extractFromTranscript(content: string, useEnhanced: boolean = true): Promise<ExtractionResult> {
    try {
      // Parse the transcript
      const parsed = ChatGPTParser.parse(content);

      // Convert to plain text for analysis
      const conversationText = this.formatConversation(parsed);

      // Use enhanced extraction for detailed itinerary
      let extractedData: ExtractedTripData;
      if (useEnhanced) {
        console.log('[TripExtractor] Using enhanced backward chronological extraction');
        extractedData = await this.extractTripDataEnhanced(parsed, conversationText);
      } else {
        console.log('[TripExtractor] Using basic extraction');
        extractedData = await this.extractTripData(conversationText);
      }

      return {
        success: true,
        data: extractedData,
        conversationTitle: parsed.title,
        messageCount: parsed.messages.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown extraction error',
      };
    }
  }

  /**
   * Format conversation for analysis
   */
  private formatConversation(parsed: ParsedTranscript): string {
    const messages = parsed.messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    return `Conversation: ${parsed.title || 'Untitled'}\n\n${messages}`;
  }

  /**
   * Enhanced extraction with backward chronological analysis
   */
  private async extractTripDataEnhanced(
    parsed: ParsedTranscript,
    conversationText: string
  ): Promise<ExtractedTripData> {
    // Phase 1: Basic extraction
    const basicData = await this.extractTripData(conversationText);

    // Phase 2: Backward chronological analysis for detailed itinerary
    const detailedItinerary = await this.extractDetailedItinerary(parsed);

    return {
      ...basicData,
      detailedItinerary,
      extractionMetadata: {
        messagesAnalyzed: parsed.messages.length,
        backwardAnalysisDepth: parsed.messages.length,
        optionsPerSlot: 3,
        reservationsFound: detailedItinerary?.filter(item => item.confirmationNumber).length || 0,
      },
    };
  }

  /**
   * Extract detailed itinerary by working backwards through conversation
   */
  private async extractDetailedItinerary(
    parsed: ParsedTranscript
  ): Promise<DetailedItineraryItem[]> {
    // Reverse messages to analyze backwards
    const reversedMessages = [...parsed.messages].reverse();

    // Format for backward analysis
    const backwardContext = reversedMessages
      .map((msg, idx) => `[Message ${parsed.messages.length - idx}] ${msg.role}: ${msg.content}`)
      .join('\n\n');

    const systemPrompt = `You are a sophisticated trip planning analyst. Analyze this conversation IN REVERSE ORDER (most recent first) to build a complete, minute-level itinerary.

CRITICAL REQUIREMENTS:

1. BACKWARD ANALYSIS: Start from the most recent messages and work backwards
   - Later messages often contain final decisions and confirmations
   - Earlier messages show the evolution and alternatives considered

2. MINUTE-LEVEL GRANULARITY: Extract exact times for every activity
   - Format: ISO 8601 with minute precision (e.g., "2024-12-22T14:30:00Z")
   - Include start and end times when mentioned

3. RESERVATION DETECTION:
   - If an activity is reservable (restaurant, hotel, tour, etc.), assume it WAS reserved
   - Search backwards for confirmation numbers, booking references
   - Mark status as "confirmed" if confirmation found, "pending" if discussed but no confirmation

4. MULTI-OPTION ANALYSIS (3 options per slot):
   - For each time slot, find up to 3 alternatives discussed
   - Include the reasoning for why each was considered
   - Note which option was ultimately chosen and why

5. CONTEXT VERIFICATION:
   - Extract full description from conversation
   - Include the reasoning behind each choice
   - Capture all URLs and documentation links mentioned
   - Track which messages discussed each item (message IDs)

6. ACCURACY: Cross-reference details across multiple messages to ensure consistency

Return ONLY valid JSON array of itinerary items following this schema:
[{
  "dayIndex": number (0-indexed),
  "startTime": "ISO 8601 timestamp",
  "endTime": "ISO 8601 timestamp or null",
  "category": "activity|transit|meal|reservation|lodging",
  "title": "string",
  "description": "Full context from conversation",
  "location": "string",
  "status": "confirmed|pending|cancelled|needs_attention",
  "confirmationNumber": "string or null",
  "vendor": "string or null",
  "cost": number or null,
  "currency": "string or null",
  "alternatives": [{
    "title": "string",
    "description": "string",
    "reason": "Why this was considered",
    "url": "string or null"
  }],
  "reasoning": "Why this option was chosen",
  "conversationRefs": ["message-1", "message-5"],
  "documentationLinks": ["url1", "url2"],
  "notes": "Additional context"
}]

If no detailed itinerary can be extracted, return an empty array [].`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 16000, // Increased for detailed extraction
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Conversation Title: ${parsed.title || 'Untitled'}\nTotal Messages: ${parsed.messages.length}\n\n${backwardContext}`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        console.warn('Unexpected response type from Claude for detailed extraction');
        return [];
      }

      // Extract JSON array from response
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('No JSON array found in detailed extraction response');
        return [];
      }

      const items = JSON.parse(jsonMatch[0]) as DetailedItineraryItem[];
      console.log(`[TripExtractor] Extracted ${items.length} detailed itinerary items`);

      return items;
    } catch (error) {
      console.error('Error in detailed itinerary extraction:', error);
      return [];
    }
  }

  /**
   * Use Claude to extract structured trip data (basic extraction)
   */
  private async extractTripData(conversationText: string): Promise<ExtractedTripData> {
    const systemPrompt = `You are a trip planning data extraction expert. Analyze the conversation and extract structured trip planning information.

Extract the following information:
1. Destinations - Extract ONLY proper nouns (city, country, or region names). DO NOT include prepositions, articles, or connecting words.
   Examples: "London" (NOT "in London"), "Paris" (NOT "to Paris"), "Tokyo and Kyoto" (NOT "going to Tokyo")
2. Travel dates (start, end, or if flexible)
3. Number of travelers (adults, children, infants)
4. Budget information (amount, currency, flexibility)
5. Preferences (accommodation types, activities, transportation, dining)
6. Constraints or requirements (accessibility, dietary, etc.)
7. Key topics - Extract ONLY single-word or short topics without prepositions
   Examples: "Christmas", "summer", "romantic", "adventure" (NOT "for Christmas", "in summer")
8. Brief summary of trip plans

CRITICAL FORMATTING RULES:
- Destinations array must contain ONLY location names (proper nouns)
- Remove all prepositions: "to", "in", "at", "from", "for"
- Remove all articles: "a", "an", "the"
- Capitalize proper nouns correctly: "London", "New York", "United Kingdom"

If information is not mentioned, omit it from the response. Only include data that is explicitly discussed.

Return ONLY valid JSON matching this schema:
{
  "destinations": ["string"],
  "dates": {
    "start": "YYYY-MM-DD or descriptive text",
    "end": "YYYY-MM-DD or descriptive text",
    "flexible": boolean
  },
  "travelers": {
    "adults": number,
    "children": number,
    "infants": number
  },
  "budget": {
    "amount": number,
    "currency": "USD/EUR/etc",
    "flexibility": "strict|flexible|very_flexible"
  },
  "preferences": {
    "accommodation": ["string"],
    "activities": ["string"],
    "transportation": ["string"],
    "dining": ["string"]
  },
  "constraints": ["string"],
  "keyTopics": ["string"],
  "summary": "string"
}`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      temperature: 0.1, // Low temperature for consistent extraction
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: conversationText,
        },
      ],
    });

    // Extract JSON from response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const extractedData = JSON.parse(jsonMatch[0]) as ExtractedTripData;

    // Set defaults for required fields
    return {
      ...extractedData,
      destinations: extractedData.destinations || [],
      travelers: extractedData.travelers || { adults: 0, children: 0, infants: 0 },
      preferences: extractedData.preferences || {},
      keyTopics: extractedData.keyTopics || [],
      summary: extractedData.summary || 'No summary available',
    };
  }

  /**
   * Extract from multiple conversations and merge insights
   */
  async extractFromMultipleTranscripts(contents: string[]): Promise<ExtractionResult[]> {
    const results = await Promise.all(
      contents.map(content => this.extractFromTranscript(content))
    );

    return results;
  }

  /**
   * Quick extraction of just destinations and summary (faster, cheaper)
   */
  async quickExtract(content: string): Promise<{ destinations: string[]; summary: string }> {
    try {
      const parsed = ChatGPTParser.parse(content);
      const conversationText = this.formatConversation(parsed);

      const systemPrompt = `You are a trip planning assistant. Quickly extract:
1. All destinations mentioned (cities, countries, regions)
2. A one-sentence summary of the trip

Return ONLY valid JSON: { "destinations": ["string"], "summary": "string" }`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 512,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: 'user', content: conversationText }],
      });

      const content_text = response.content[0];
      if (content_text.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const jsonMatch = content_text.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      return { destinations: [], summary: 'Extraction failed' };
    }
  }

  /**
   * Test if the agent is properly configured
   */
  async test(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Lazy-loaded singleton instance to avoid requiring ANTHROPIC_API_KEY at import time
let _tripExtractor: TripExtractorAgent | null = null;

export const getTripExtractor = (): TripExtractorAgent => {
  if (!_tripExtractor) {
    _tripExtractor = new TripExtractorAgent();
  }
  return _tripExtractor;
};

// Export a proxy for backwards compatibility that lazy-loads the instance
export const tripExtractor = new Proxy({} as TripExtractorAgent, {
  get(_target, prop) {
    return (getTripExtractor() as any)[prop];
  }
});
