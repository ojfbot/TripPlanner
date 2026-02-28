/**
 * Pattern-based trip data extraction helpers.
 * Used as a fallback when the AI-powered extractor (agent-graph) is unavailable.
 */

import type { ChatGPTMessage } from '@tripplanner/agent-graph';

export interface ExtractedPreferences {
  activities: string[];
  accommodation: string[];
  transportation: string[];
  dining: string[];
}

export interface PatternExtractedData {
  destinations: string[];
  dates: { start?: string; end?: string; flexible: boolean };
  travelers: { adults: number; children: number; infants: number };
  preferences: ExtractedPreferences;
  keyTopics: string[];
  summary: string;
}

export function extractDestinations(messages: ChatGPTMessage[]): string[] {
  const destinations: Set<string> = new Set();
  const locationKeywords = ['trip to', 'traveling to', 'visit', 'going to', 'in'];

  for (const msg of messages) {
    const content = msg.content.toLowerCase();
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

export function extractDates(messages: ChatGPTMessage[]): { start?: string; end?: string; flexible: boolean } {
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

export function extractPreferences(messages: ChatGPTMessage[]): ExtractedPreferences {
  const preferences: ExtractedPreferences = {
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

export function extractKeyTopics(messages: ChatGPTMessage[]): string[] {
  const topics: Set<string> = new Set();
  const keywords = [
    'christmas', 'summer', 'winter', 'spring', 'fall', 'holiday', 'vacation',
    'family', 'romantic', 'adventure', 'relaxing', 'cultural', 'historical',
  ];

  for (const msg of messages) {
    const content = msg.content.toLowerCase();
    keywords.forEach(keyword => {
      if (content.includes(keyword)) topics.add(keyword);
    });
  }

  return Array.from(topics);
}

export function generateSummary(messages: ChatGPTMessage[]): string {
  if (messages.length === 0) return 'No summary available';
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (firstUserMsg) {
    return firstUserMsg.content.substring(0, 100) + (firstUserMsg.content.length > 100 ? '...' : '');
  }
  return 'Trip planning conversation';
}

/** Build a pattern-extracted data object from raw parsed messages. */
export function buildPatternExtractedData(
  messages: ChatGPTMessage[],
  title?: string
): PatternExtractedData {
  return {
    destinations: extractDestinations(messages),
    dates: extractDates(messages),
    travelers: { adults: 1, children: 0, infants: 0 },
    preferences: extractPreferences(messages),
    keyTopics: extractKeyTopics(messages),
    summary: title || generateSummary(messages),
  };
}
