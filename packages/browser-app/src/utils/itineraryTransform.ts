/**
 * Transforms extracted document data into TripItinerary format
 */

import { TripItinerary, ItineraryItem } from '../types/itinerary';
import { Document } from '../store/slices/documentsSlice';

interface AlternativeOption {
  title: string;
  description: string;
  reason: string;
  url?: string;
  conversationRef?: string;
}

interface DetailedItineraryItem {
  dayIndex: number;
  startTime: string;
  endTime?: string;
  category: 'activity' | 'transit' | 'meal' | 'reservation' | 'lodging';
  title: string;
  description: string;
  location: string | { name?: string; address?: string; coordinates?: string };
  status?: 'confirmed' | 'pending' | 'cancelled' | 'needs_attention';
  confirmationNumber?: string;
  vendor?: string;
  cost?: number;
  currency?: string;
  alternatives?: AlternativeOption[];
  reasoning: string;
  conversationRefs: string[];
  documentationLinks: string[];
  notes?: string;
  url?: string;
}

interface ExtractedData {
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
    flexibility?: string;
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
  detailedItinerary?: DetailedItineraryItem[];
  extractionMetadata?: {
    messagesAnalyzed: number;
    backwardAnalysisDepth: number;
    optionsPerSlot: number;
    reservationsFound: number;
  };
}

/**
 * Transforms a document with extracted trip data into a TripItinerary
 */
export function documentToItinerary(doc: Document): TripItinerary | null {
  console.log('[documentToItinerary] Processing document:', {
    id: doc.documentId,
    title: doc.title,
    extractionStatus: doc.extractionStatus,
    hasExtractedData: !!doc.extractedData
  });

  if (!doc.extractedData || doc.extractionStatus !== 'completed') {
    console.log('[documentToItinerary] Skipping document - no extracted data or not completed');
    return null;
  }

  try {
    const extractedData: ExtractedData = JSON.parse(doc.extractedData);
    console.log('[documentToItinerary] Parsed extracted data:', {
      destinations: extractedData.destinations,
      dates: extractedData.dates,
      activitiesCount: extractedData.preferences.activities?.length || 0,
      transportationCount: extractedData.preferences.transportation?.length || 0,
      hasDetailedItinerary: !!extractedData.detailedItinerary,
      detailedItemsCount: extractedData.detailedItinerary?.length || 0
    });

    // Calculate dates (used in both detailed and fallback paths)
    const startDate = extractedData.dates?.start || new Date().toISOString();
    const endDate = extractedData.dates?.end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Use detailed itinerary if available (from enhanced extraction)
    let items: ItineraryItem[] = [];

    if (extractedData.detailedItinerary && extractedData.detailedItinerary.length > 0) {
      console.log('[documentToItinerary] Using detailed itinerary from enhanced extraction');
      items = extractedData.detailedItinerary.map(detail => {
        // Handle location - it might be a string or an object with name/address/coordinates
        const location = typeof detail.location === 'string'
          ? detail.location
          : (detail.location?.name || detail.location?.address || 'Location not specified');

        return {
          id: `detailed-${detail.dayIndex}-${detail.startTime}`,
          dayIndex: detail.dayIndex,
          startTime: detail.startTime,
          endTime: detail.endTime,
          category: detail.category,
          title: detail.title,
          description: detail.description,
          location,
          status: detail.status,
          confirmationNumber: detail.confirmationNumber,
          vendor: detail.vendor,
          cost: detail.cost,
          currency: detail.currency,
          notes: `${detail.reasoning || ''}\n\nAlternatives: ${detail.alternatives?.map(a => a.title).join(', ') || 'None'}\n\nDocs: ${detail.documentationLinks?.join(', ') || 'None'}`,
          url: detail.url || detail.documentationLinks?.[0],
        };
      });
    } else {
      console.log('[documentToItinerary] Fallback to preference-based itinerary generation');
      // Fallback to old method
      let itemIdCounter = 0;

      // Calculate trip length
      const tripLength = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      // Add activities as itinerary items distributed across days
      if (extractedData.preferences.activities && extractedData.preferences.activities.length > 0) {
        extractedData.preferences.activities.forEach((activity, idx) => {
          // Distribute activities across the trip days
          const dayIndex = Math.floor((idx / extractedData.preferences.activities!.length) * tripLength);

          items.push({
            id: `activity-${itemIdCounter++}`,
            dayIndex: Math.min(dayIndex, tripLength - 1),
            category: 'activity',
            title: activity,
            description: `Extracted from conversation: ${activity}`,
            location: extractedData.destinations[0], // Use first destination as default
          });
        });
      }

      // Add transportation as transit items
      if (extractedData.preferences.transportation && extractedData.preferences.transportation.length > 0) {
        extractedData.preferences.transportation.forEach((transport, idx) => {
          // Add transit items at the beginning of the trip
          const transitMode = transport.toLowerCase().includes('flight') ? 'flight' :
                             transport.toLowerCase().includes('train') ? 'train' :
                             transport.toLowerCase().includes('bus') ? 'bus' :
                             transport.toLowerCase().includes('car') ? 'car' : 'other';

          items.push({
            id: `transit-${itemIdCounter++}`,
            dayIndex: idx === 0 ? 0 : tripLength - 1, // First/last day for transit
            category: 'transit',
            title: transport,
            transitMode,
            fromLocation: idx === 0 ? 'Origin' : extractedData.destinations[extractedData.destinations.length - 1],
            toLocation: idx === 0 ? extractedData.destinations[0] : 'Home',
          });
        });
      }

      // Add accommodation as lodging items
      if (extractedData.preferences.accommodation && extractedData.preferences.accommodation.length > 0) {
        extractedData.preferences.accommodation.forEach((lodging) => {
          items.push({
            id: `lodging-${itemIdCounter++}`,
            dayIndex: 0, // Usually check-in is first day
            category: 'lodging',
            title: lodging,
            location: extractedData.destinations[0],
            checkIn: startDate,
            checkOut: endDate,
            status: 'pending',
          });
        });
      }

      // Add dining preferences as meal items
      if (extractedData.preferences.dining && extractedData.preferences.dining.length > 0) {
        extractedData.preferences.dining.slice(0, 3).forEach((dining, idx) => {
          // Distribute meals across first few days
          const dayIndex = Math.min(idx, tripLength - 1);
          const mealType = idx === 0 ? 'breakfast' : idx === 1 ? 'lunch' : 'dinner';

          items.push({
            id: `meal-${itemIdCounter++}`,
            dayIndex,
            category: 'meal',
            title: dining,
            mealType: mealType as 'breakfast' | 'lunch' | 'dinner',
            location: extractedData.destinations[0],
          });
        });
      }

      // Sort items by day index
      items.sort((a, b) => a.dayIndex - b.dayIndex);
    } // End of fallback method

    return {
      id: `itinerary-${doc.documentId}`,
      userId: doc.userId,
      title: doc.title,
      startDate,
      endDate,
      destinations: extractedData.destinations,
      items,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  } catch (error) {
    console.error('Failed to transform document to itinerary:', error);
    return null;
  }
}

/**
 * Transforms all completed documents into itineraries
 */
export function documentsToItineraries(documents: Document[]): TripItinerary[] {
  return documents
    .map(documentToItinerary)
    .filter((itinerary): itinerary is TripItinerary => itinerary !== null);
}
