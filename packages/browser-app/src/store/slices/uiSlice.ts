import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  extractionPromptTemplate: string;
}

const DEFAULT_EXTRACTION_PROMPT = `Please analyze our entire trip planning conversation and provide a comprehensive, structured export of the complete trip state with all details, reasoning, and alternatives discussed.

## ANALYSIS REQUIREMENTS

### 1. BACKWARD CHRONOLOGICAL ANALYSIS
- Start from the most recent messages and work backwards
- Later messages contain final decisions and confirmations
- Earlier messages show the evolution and alternatives considered
- Cross-reference all mentions of each activity/booking across the entire conversation

### 2. TIME & SCHEDULING ACCURACY
**For Transit (planes, trains, buses, subways, walking):**
- Extract exact departure/arrival times with minute precision (ISO 8601 format)
- Example: "2024-12-22T14:30:00Z" for a 2:30 PM train departure
- Include terminal/platform info when available

**For Activities, Meals, and General Events:**
- Use natural, human-readable time descriptions when exact times weren't discussed
- Examples: "afternoon", "early evening ~6pm", "after lunch", "morning around 10am"
- Only use precise timestamps if explicitly mentioned in conversation
- Prioritize ACCURACY over false precision - if unsure, describe generally

### 3. RESERVATION & CONFIRMATION TRACKING
**CRITICAL: These must be 100% accurate. If ambiguous, mark as "needs_attention"**

For every reservable activity (restaurant, hotel, tour, attraction):
- Search conversation for confirmation numbers, PNRs, booking references
- **Format carefully**: Preserve exact alphanumeric format (e.g., "ABC123XYZ", not "abc123xyz")
- If confirmation appears incomplete or ambiguous → status: "needs_attention" + note the ambiguity
- Include vendor name, booking platform, costs with currency
- Booking status: "confirmed" (has conf#), "pending" (discussed but no conf#), "needs_attention" (ambiguous/incomplete)

**Fail loudly on critical data**: If a reservation detail seems important but unclear, note it explicitly

### 4. MULTI-OPTION ANALYSIS (UP TO 3 ALTERNATIVES)
- For each decision point, extract alternatives that were seriously considered
- Include WHY each option was considered
- Note which option was chosen and the reasoning
- Capture pros/cons discussed for each alternative

### 5. DEEP CONTEXT & REASONING
- For every activity, include:
  - Full description from our conversation
  - The reasoning behind the choice
  - User preferences that influenced the decision
  - Any constraints or requirements mentioned
  - Special notes (dietary restrictions, accessibility needs, etc.)

### 6. DOCUMENTATION & REFERENCE LINKS
- Extract all URLs mentioned (booking sites, restaurant websites, maps, etc.)
- Note which conversation messages discussed each item
- Include any confirmation email references or booking platform names

## RESPONSE FORMAT

Return ONLY valid JSON following this exact schema:

\`\`\`json
{
  "conversationMetadata": {
    "title": "Trip title from conversation",
    "totalMessages": 0,
    "analysisDate": "ISO timestamp of this export",
    "coverageDepth": "How many messages backwards were analyzed"
  },
  "tripOverview": {
    "destinations": ["City/Country names only, no prepositions"],
    "dates": {
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD",
      "flexible": false
    },
    "travelers": {
      "adults": 0,
      "children": 0,
      "infants": 0
    },
    "budget": {
      "amount": 0,
      "currency": "USD",
      "flexibility": "strict|flexible|very_flexible"
    }
  },
  "detailedItinerary": [
    {
      "dayIndex": 0,
      "date": "YYYY-MM-DD",
      "startTime": "ISO 8601 timestamp OR natural description like 'afternoon' or 'early evening ~6pm'",
      "endTime": "ISO 8601 timestamp, natural description, or null",
      "category": "activity|transit|meal|reservation|lodging",
      "title": "Activity/booking name",
      "description": "Full context from our conversation - what we discussed, why chosen, user preferences",
      "location": {
        "name": "Venue/place name",
        "address": "Full address if mentioned",
        "coordinates": "lat,lng if mentioned"
      },

      "reservationDetails": {
        "status": "confirmed|pending|cancelled|needs_attention",
        "confirmationNumber": "EXACT booking reference (preserve case/format) OR null if none found",
        "vendor": "Hotel/restaurant/tour company name",
        "bookingPlatform": "OpenTable, Booking.com, etc.",
        "cost": 0,
        "currency": "USD",
        "partySize": 0,
        "specialRequests": ["Any special requests discussed"],
        "ambiguityNote": "If status is needs_attention, explain what's unclear or incomplete"
      },

      "transitDetails": {
        "mode": "flight|train|bus|car|walking|metro",
        "from": "Origin location",
        "to": "Destination location",
        "carrier": "Airline/train company",
        "flightNumber": "If applicable",
        "departureTime": "MUST be ISO timestamp with minute precision for scheduled transit",
        "arrivalTime": "MUST be ISO timestamp with minute precision for scheduled transit",
        "terminal": "Terminal info if mentioned",
        "gate": "Gate if mentioned"
      },

      "alternatives": [
        {
          "title": "Alternative option name",
          "description": "What this alternative was",
          "reason": "Why we considered this option",
          "prosDiscussed": ["Pros mentioned in conversation"],
          "consDiscussed": ["Cons mentioned in conversation"],
          "url": "Link if mentioned",
          "conversationRef": "Which message discussed this"
        }
      ],

      "reasoning": "Detailed explanation of why this specific option was chosen over alternatives",
      "conversationRefs": ["message-1", "message-15", "message-42"],
      "documentationLinks": [
        "https://restaurant-website.com",
        "https://booking-confirmation-link.com"
      ],
      "userPreferences": ["Preferences that influenced this choice"],
      "notes": "Any additional context, warnings, tips discussed"
    }
  ],
  "preferences": {
    "accommodation": ["Hotel types, locations, amenities discussed"],
    "activities": ["Types of activities user is interested in"],
    "dining": ["Cuisine preferences, dietary restrictions"],
    "transportation": ["Preferred modes of transport"],
    "constraints": ["Budget limits, time constraints, accessibility needs"]
  },
  "extractionQuality": {
    "messagesAnalyzed": 0,
    "reservationsFound": 0,
    "activitiesWithAlternatives": 0,
    "itemsWithConfirmationNumbers": 0,
    "documentationLinksFound": 0
  }
}
\`\`\`

## CRITICAL REQUIREMENTS

1. **Accuracy First**: Cross-reference details across messages. Never guess or fabricate data.
2. **Completeness**: Include EVERY activity, booking, and transit discussed
3. **Human-Readable**: Use natural time descriptions unless precise times were specified
4. **Context & Reasoning**: Provide rich descriptions showing WHY choices were made
5. **Alternatives**: Show the decision-making process with up to 3 serious options per slot
6. **Reservation Precision**: Confirmation numbers, PNRs, booking codes must be exact or marked "needs_attention"
7. **Fail Loudly**: If critical data is ambiguous, note it explicitly rather than guessing
8. **Transit Timing**: Exact departure/arrival times for scheduled transit (planes, trains, buses)
9. **Self-Documenting**: The JSON should be readable by humans, not just machines

This export will be used to populate an interactive trip planning dashboard with full conversation context. Prioritize accuracy and completeness over technical precision.`;

const initialState: UIState = {
  extractionPromptTemplate: DEFAULT_EXTRACTION_PROMPT,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setExtractionPromptTemplate: (state, action: PayloadAction<string>) => {
      state.extractionPromptTemplate = action.payload;
    },
    resetExtractionPromptTemplate: (state) => {
      state.extractionPromptTemplate = DEFAULT_EXTRACTION_PROMPT;
    },
  },
});

export const { setExtractionPromptTemplate, resetExtractionPromptTemplate } = uiSlice.actions;
export default uiSlice.reducer;
