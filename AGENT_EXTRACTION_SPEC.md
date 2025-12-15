# Agent Extraction Specification

## Overview
The LangGraph agent must analyze ChatGPT conversation transcripts to build complete, accurate itineraries by working backwards from most recent entries.

## Core Requirements

### 1. Backward Chronological Analysis
- **Start**: Most recent conversation entries
- **Direction**: Work backwards through conversation history
- **Goal**: Build complete picture of itinerary evolution

### 2. Minute-Level Granularity
- Extract timing down to the minute for all activities
- Identify time slots, durations, and transitions
- Calculate travel time between locations

### 3. Reservation Detection & Tracking
- **Assumption**: If an activity is reservable, assume reservation was made
- **Search**: Look backwards in conversation for:
  - Confirmation numbers
  - Booking references
  - Reservation status updates
  - Cancellations or changes

### 4. Multi-Option Analysis (3 Options per Slot)
Given the large document size (10MB+), assume all time slots have multiple options discussed:

- **For each time slot**: Extract up to 3 valid options
- **Ranking**: Order by recency and confirmation level
- **Context**: Capture reasoning for each option

### 5. Deep Context Verification
For each extracted item, verify:

**Reasoning**:
- Why was this option chosen?
- What alternatives were considered?
- What constraints influenced the decision?

**Description**:
- Full activity details from conversation
- User preferences mentioned
- Special requirements or notes

**Documentation Links**:
- Booking URLs
- Confirmation emails referenced
- Map links
- Recommendation sources

### 6. Accuracy Validation
- **Cross-reference**: Check multiple conversation points for same item
- **Consistency**: Verify dates, times, and details match across mentions
- **Completeness**: Ensure no gaps in itinerary timeline

## Data Structure Requirements

### Itinerary Item
```typescript
interface ItineraryItem {
  id: string;
  dayIndex: number;
  startTime: string; // ISO timestamp with minute precision
  endTime?: string;
  category: 'activity' | 'transit' | 'meal' | 'reservation' | 'lodging';
  title: string;
  description: string; // Full context from conversation
  location: string;

  // Reservation tracking
  status: 'confirmed' | 'pending' | 'cancelled' | 'needs_attention';
  confirmationNumber?: string;
  vendor?: string;
  cost?: number;
  currency?: string;

  // Multi-option tracking
  alternatives?: Array<{
    title: string;
    description: string;
    reason: string; // Why this was considered
    url?: string;
  }>;

  // Context and reasoning
  reasoning: string; // Why this was chosen
  conversationRefs: string[]; // Message IDs where this was discussed
  documentationLinks: string[]; // URLs mentioned

  // Metadata
  notes?: string;
  url?: string;
}
```

## Implementation Location

File: `/packages/api/src/routes/integrations.ts`
Function: Around line 650-750 (Claude extraction call)

### Current Implementation (Simplified)
```typescript
const extractionResponse = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  messages: [{
    role: 'user',
    content: `Analyze this trip planning conversation and extract structured data...`
  }]
});
```

### Required Enhancement
```typescript
// Phase 1: Backward chronological analysis
// - Parse messages in reverse order
// - Build timeline of decisions
// - Track option evolution

// Phase 2: Multi-option extraction
// - For each time slot, extract 3 options
// - Rank by recency and confirmation
// - Capture reasoning for each

// Phase 3: Reservation detection
// - Identify reservable items
// - Search for confirmation details
// - Extract booking references

// Phase 4: Context verification
// - Cross-reference details across messages
// - Extract documentation links
// - Verify consistency

// Phase 5: Assemble complete itinerary
// - Minute-level granularity
// - Full context and reasoning
// - Alternative options preserved
```

## Success Criteria

1. **Completeness**: All conversation mentions of activities/bookings captured
2. **Accuracy**: Details match across multiple conversation references
3. **Granularity**: Timing accurate to the minute
4. **Context**: Full reasoning and alternatives preserved
5. **Traceability**: Can link each item back to specific conversation messages
6. **Documentation**: All links and references captured

## Example Output

For a restaurant reservation mentioned in conversation:

```json
{
  "id": "meal-001",
  "dayIndex": 2,
  "startTime": "2024-12-22T19:30:00Z",
  "endTime": "2024-12-22T21:30:00Z",
  "category": "meal",
  "title": "Dinner at The Ivy",
  "description": "High-end British restaurant in Covent Garden. Discussed on Dec 10, user wanted traditional British cuisine with good atmosphere. Confirmed reservation for 7:30pm party of 2.",
  "location": "1-5 West St, London WC2H 9NQ",
  "status": "confirmed",
  "confirmationNumber": "IVY-123456",
  "vendor": "The Ivy",
  "cost": 150,
  "currency": "GBP",
  "alternatives": [
    {
      "title": "Rules Restaurant",
      "description": "Oldest restaurant in London, traditional British",
      "reason": "User liked the history but preferred The Ivy's location",
      "url": "https://rules.co.uk"
    },
    {
      "title": "Dishoom Covent Garden",
      "description": "Indian restaurant, Bombay café style",
      "reason": "Considered for variety but user wanted British first night",
      "url": "https://dishoom.com"
    }
  ],
  "reasoning": "User specifically requested traditional British cuisine for first dinner. The Ivy was chosen over Rules for better location near hotel and more modern atmosphere while still being traditional.",
  "conversationRefs": ["msg-145", "msg-156", "msg-203"],
  "documentationLinks": [
    "https://theivyweststreet.com",
    "https://www.opentable.com/r/the-ivy-west-street"
  ],
  "notes": "User has dietary preference for pescatarian options. Mentioned wanting to try fish and chips."
}
```

## Priority
**HIGH** - This is the core value proposition of the system. Accurate, complete itinerary extraction from conversation history is essential for user trust and system usefulness.
