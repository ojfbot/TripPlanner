# TripPlanner - Intelligent Import System Issues

This document tracks the implementation of the intelligent trip import system with multi-phase agent processing.

---

## Epic: Intelligent Trip Import with Multi-Agent Processing

**Status**: 🚧 In Progress (Infrastructure Phase)
**Priority**: High
**Complexity**: High
**Timeline**: 4-6 weeks

### Overview
Transform the current basic ChatGPT conversation import into an intelligent, multi-agent system that fully populates the TripPlanner dashboard with structured itineraries, vision tiles, and integration suggestions.

### Current State (as of 2025-12-13)
- ✅ Basic file upload/paste interface (`ImportAgentModal.tsx`)
- ✅ ChatGPT transcript parsing (`ChatGPTParser`)
- ✅ AI-powered trip data extraction via Claude (`TripExtractorAgent`)
- ✅ Configuration loader (`env.json` → agent-graph)
- ✅ Pattern-based fallback extraction
- ✅ Basic Redux state management (`tripSlice.ts`)
- ❌ No progress updates during processing
- ❌ No RAG embedding creation
- ❌ No structured itinerary generation
- ❌ No dashboard population
- ❌ No agent chat flow coordination

---

## Issue #1: Multi-Phase Progress Tracking & UI

**Labels**: `enhancement`, `ux`, `frontend`
**Assignee**: TBD
**Priority**: High
**Status**: 📋 Planned

### Description
Add real-time progress updates to the import modal showing each processing phase with descriptive text and progress indicators.

### Acceptance Criteria
- [ ] Loading overlay shows current phase name
- [ ] Progress bar reflects overall completion (11 phases)
- [ ] Each phase displays descriptive text:
  - "Storing conversation copy..."
  - "Extracting text content..."
  - "Creating semantic chunks..."
  - "Generating vector embeddings..."
  - "Updating RAG store..."
  - "Awaiting agent summaries..."
  - "Generating itineraries..."
  - "Creating vision tiles..."
  - "Analyzing integration needs..."
  - "Formatting responses..."
  - "Populating dashboard..."
- [ ] Phase transitions are animated smoothly
- [ ] Errors display with specific phase context
- [ ] Users can cancel long-running imports

### Technical Approach
1. Add WebSocket or Server-Sent Events for real-time updates
2. Create `ProcessingProgress` component with phase enum
3. Update `tripSlice.ts` with `processingPhase` state
4. Backend emits progress events at each pipeline stage

### Files to Modify
- `packages/browser-app/src/components/ImportAgentModal.tsx`
- `packages/browser-app/src/components/ProcessingProgress.tsx` (new)
- `packages/browser-app/src/store/slices/tripSlice.ts`
- `packages/api/src/routes/integrations.ts`

### Dependencies
- Issue #2 (Backend pipeline)
- WebSocket or SSE infrastructure

---

## Issue #2: Document Processing Pipeline - RAG Infrastructure

**Labels**: `enhancement`, `backend`, `rag`, `agent-graph`
**Assignee**: TBD
**Priority**: High
**Status**: 📋 Planned

### Description
Implement the core RAG (Retrieval-Augmented Generation) pipeline for processing uploaded conversations: chunking, embedding, and storing in a vector database.

### Acceptance Criteria
- [ ] Document chunker creates semantic chunks (500-1000 tokens each)
- [ ] Chunk boundaries respect message boundaries (don't split mid-message)
- [ ] OpenAI embeddings generated for each chunk
- [ ] Embeddings stored in vector database (SQLite-VSS or Pinecone)
- [ ] Chunks linked to source document and messages
- [ ] Metadata includes: timestamp, speaker role, topics
- [ ] Vector search works for semantic queries
- [ ] Embedding generation respects rate limits
- [ ] Failed chunks are retried with exponential backoff

### Technical Approach
1. Enhance `DocumentChunker` with semantic awareness
2. Integrate OpenAI embeddings API
3. Set up vector store (start with SQLite-VSS for simplicity)
4. Create `EmbeddingService` in agent-graph
5. Implement batch processing for efficiency

### Files to Create/Modify
- `packages/agent-graph/src/services/document-chunker.ts` (enhance)
- `packages/agent-graph/src/services/embedding-service.ts` (new)
- `packages/agent-graph/src/services/vector-store.ts` (new)
- `packages/api/src/routes/integrations.ts` (integrate pipeline)
- `packages/api/src/services/database.ts` (vector store schema)

### Database Schema
```sql
CREATE TABLE vector_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB NOT NULL, -- 1536-dim vector
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(documentId)
);

CREATE INDEX idx_vector_chunks_document ON vector_chunks(document_id);
```

### Dependencies
- OpenAI API access (embeddings)
- SQLite-VSS or vector database setup

---

## Issue #3: LangGraph Agent Coordinator

**Labels**: `enhancement`, `backend`, `agent-graph`, `langgraph`
**Assignee**: TBD
**Priority**: High
**Status**: 📋 Planned

### Description
Implement a LangGraph-based coordinator agent that orchestrates the entire import workflow, managing state transitions and coordinating sub-agents.

### Acceptance Criteria
- [ ] StateGraph defined with all processing nodes
- [ ] Nodes: parse, chunk, embed, extract, generate_itinerary, generate_vision, analyze_gaps, populate
- [ ] Conditional edges based on extraction confidence
- [ ] State persisted between nodes
- [ ] Agent can resume from failure points
- [ ] All node outputs typed with Zod schemas
- [ ] Logging at each state transition
- [ ] Agent emits progress events for frontend

### Technical Approach
```python
# Example LangGraph structure (TypeScript equivalent needed)
from langgraph.graph import StateGraph

coordinator = StateGraph({
  "document": str,
  "chunks": List[Chunk],
  "embeddings": List[Embedding],
  "extracted_data": TripData,
  "itineraries": List[Itinerary],
  "vision_tiles": List[VisionTile],
  "suggestions": List[Integration],
  "phase": ProcessingPhase
})

coordinator.add_node("parse", parse_transcript)
coordinator.add_node("chunk", chunk_documents)
coordinator.add_node("embed", generate_embeddings)
coordinator.add_node("extract", extract_trip_data)
coordinator.add_node("generate_itinerary", create_itineraries)
coordinator.add_node("generate_vision", create_vision_tiles)
coordinator.add_node("analyze_gaps", identify_missing_docs)
coordinator.add_node("populate", populate_dashboard)

coordinator.set_entry_point("parse")
coordinator.add_edge("parse", "chunk")
coordinator.add_edge("chunk", "embed")
coordinator.add_edge("embed", "extract")
# ... more edges
```

### Files to Create
- `packages/agent-graph/src/agents/coordinator.ts` (new)
- `packages/agent-graph/src/agents/itinerary-generator.ts` (new)
- `packages/agent-graph/src/agents/vision-generator.ts` (new)
- `packages/agent-graph/src/agents/integration-analyzer.ts` (new)
- `packages/agent-graph/src/schemas/workflow-state.ts` (new)

### Dependencies
- Issue #2 (RAG infrastructure)
- LangGraph TypeScript bindings or custom implementation
- Zod for schema validation

---

## Issue #4: Itinerary Structure Generation Agent

**Labels**: `enhancement`, `backend`, `agent-graph`, `ai`
**Assignee**: TBD
**Priority**: Medium
**Status**: 📋 Planned

### Description
Create an agent that analyzes the extracted trip data and RAG chunks to generate structured, hierarchical itineraries grouped by week/day/transit/lodging.

### Acceptance Criteria
- [ ] Agent analyzes temporal data (dates, durations)
- [ ] Groups items by week, then by day
- [ ] Identifies lodging items (hotels, Airbnb)
- [ ] Identifies transit items (flights, trains, car rentals)
- [ ] Identifies activity items (restaurants, tours, sights)
- [ ] Assigns confidence scores to each item
- [ ] Links itinerary items to source conversation chunks
- [ ] Handles ambiguous dates ("around Christmas")
- [ ] Detects overlapping/conflicting items
- [ ] Generates natural language descriptions

### Technical Approach
1. Use Claude with structured output (JSON schema)
2. Prompt engineering for itinerary extraction
3. Multi-pass approach:
   - Pass 1: Extract all temporal entities
   - Pass 2: Group into hierarchical structure
   - Pass 3: Classify item types
   - Pass 4: Generate descriptions
4. Use RAG to ground decisions in conversation context

### System Prompt Example
```
You are an expert travel itinerary organizer. Analyze the provided trip conversation
and generate a structured itinerary.

Extract:
1. All mentioned accommodations with check-in/out dates
2. All transportation with departure/arrival times
3. All activities with dates/times
4. Any mentioned reservations or bookings

Group items hierarchically:
- By week (Week 1: Dec 20-26, Week 2: Dec 27-31)
- By day within each week
- By time within each day
- Separate sections for Lodging, Transit, Activities

For each item, provide:
- Confidence score (0-1)
- Source conversation references
- Any missing information that should be requested

Return as JSON following the ItineraryStructure schema.
```

### Files to Create
- `packages/agent-graph/src/agents/itinerary-generator.ts`
- `packages/agent-graph/src/schemas/itinerary.ts`
- `packages/agent-graph/src/prompts/itinerary-extraction.ts`

### Data Model
```typescript
interface Itinerary {
  id: string;
  tripId: string;
  title: string; // "Week 1: London & Cotswolds"
  startDate: string;
  endDate: string;
  items: ItineraryItem[];
  metadata: {
    sourceDocumentId: string;
    sourceChunks: string[];
    generatedBy: 'agent';
    confidence: number;
  };
}

interface ItineraryItem {
  id: string;
  type: 'lodging' | 'transit' | 'activity' | 'dining';
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: Location;
  reservation?: Reservation;
  cost?: Cost;
  notes?: string;
  sourceChunks: string[];
  confidence: number;
}
```

### Dependencies
- Issue #2 (RAG infrastructure for chunk lookup)
- Issue #3 (Coordinator integration)

---

## Issue #5: Trip Vision Tile Generation Agent

**Labels**: `enhancement`, `backend`, `agent-graph`, `ai`
**Assignee**: TBD
**Priority**: Medium
**Status**: 📋 Planned

### Description
Create an agent that generates inspirational "vision tiles" for the Trip Vision tab based on conversation themes, preferences, and goals mentioned in the conversation.

### Acceptance Criteria
- [ ] Extracts user's motivations ("celebrating anniversary", "reconnecting with family")
- [ ] Identifies key experiences mentioned ("Christmas markets", "countryside walks")
- [ ] Generates 3-6 vision tiles per conversation
- [ ] Each tile has: title, description, category, image prompt
- [ ] Tiles link to source conversation chunks
- [ ] Categories: inspiration, goal, experience, memory
- [ ] Descriptions are evocative and personal
- [ ] Image prompts suitable for image generation APIs

### Vision Tile Examples
```json
{
  "title": "A White Christmas in the Cotswolds",
  "description": "Experience the magic of an English Christmas in honey-stone villages, with crackling fires and mulled wine in historic pubs.",
  "category": "inspiration",
  "imagePrompt": "snow-covered Cotswolds village at Christmas, warm lights glowing from cottage windows, church steeple in background",
  "sourceChunks": ["chunk_12", "chunk_45"]
}
```

### System Prompt Example
```
You are a travel vision curator. Read this trip planning conversation and identify
the emotional drivers, aspirations, and memorable experiences the traveler is seeking.

Create 3-6 "vision tiles" - short, evocative descriptions of what makes this trip special.
Focus on:
- Why they're taking this trip (not just what they'll do)
- The feelings and experiences they're seeking
- The memories they hope to create
- Personal touches mentioned in their conversation

Each tile should paint a vivid picture in 1-2 sentences.
```

### Files to Create
- `packages/agent-graph/src/agents/vision-generator.ts`
- `packages/agent-graph/src/schemas/vision-tile.ts`
- `packages/agent-graph/src/prompts/vision-extraction.ts`

### Dependencies
- Issue #2 (RAG infrastructure)
- Issue #3 (Coordinator integration)

---

## Issue #6: Integration Suggestion Agent

**Labels**: `enhancement`, `backend`, `agent-graph`, `ai`
**Assignee**: TBD
**Priority**: Low
**Status**: 📋 Planned

### Description
Create an agent that analyzes the generated itinerary to identify missing reservation documents and suggests actionable integration tasks.

### Acceptance Criteria
- [ ] Detects mentioned reservations without confirmation numbers
- [ ] Identifies accommodations needing booking documents
- [ ] Flags flights/trains needing ticket confirmations
- [ ] Suggests tours/activities needing booking receipts
- [ ] Prioritizes suggestions (high/medium/low)
- [ ] Links suggestions to relevant itinerary items
- [ ] Generates clear, actionable descriptions
- [ ] Avoids duplicate suggestions

### Suggestion Examples
```json
{
  "type": "reservation",
  "title": "Hotel Confirmation - The Savoy",
  "description": "Upload your hotel reservation for The Savoy (Dec 20-27). This will help track check-in details and any special requests.",
  "priority": "high",
  "relatedItineraryItems": ["item_lodging_1"],
  "status": "pending"
}
```

### Files to Create
- `packages/agent-graph/src/agents/integration-analyzer.ts`
- `packages/agent-graph/src/schemas/integration-suggestion.ts`

### Dependencies
- Issue #4 (Itinerary generation)
- Issue #3 (Coordinator integration)

---

## Issue #7: Dashboard Population Service

**Labels**: `enhancement`, `backend`, `frontend`
**Assignee**: TBD
**Priority**: Medium
**Status**: 📋 Planned

### Description
Create services and UI components to populate the Itineraries, Trip Vision, and Integrations tabs with agent-generated data.

### Acceptance Criteria
- [ ] Itineraries tab renders structured timeline
- [ ] Week/day grouping with expand/collapse
- [ ] Lodging items highlighted differently than activities
- [ ] Transit items show departure/arrival times
- [ ] Each item linkable to source conversation
- [ ] Trip Vision tab shows auto-generated tiles
- [ ] Integrations tab lists pending document uploads
- [ ] Dashboard title updates from "TripPlanner" to trip name
- [ ] All data persists in database
- [ ] Loading states while data populates

### API Endpoints
```
GET /api/v1/itineraries?tripId={id}
GET /api/v1/vision-tiles?tripId={id}
GET /api/v1/integration-suggestions?tripId={id}
POST /api/v1/trips/{id}/populate (triggers dashboard update)
```

### Files to Create/Modify
- `packages/browser-app/src/components/ItineraryTimeline.tsx` (enhance)
- `packages/browser-app/src/components/VisionTileGrid.tsx` (new)
- `packages/browser-app/src/components/IntegrationSuggestionList.tsx` (new)
- `packages/api/src/routes/itineraries.ts` (new)
- `packages/api/src/routes/vision-tiles.ts` (new)
- `packages/api/src/services/database.ts` (add tables)

### Database Schema
```sql
CREATE TABLE itineraries (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE itinerary_items (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('lodging','transit','activity','dining','other')),
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT,
  end_time TEXT,
  location_json JSON,
  reservation_json JSON,
  cost_json JSON,
  notes TEXT,
  source_chunks TEXT, -- JSON array
  confidence REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id)
);

CREATE TABLE vision_tiles (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  category TEXT CHECK(category IN ('inspiration','goal','experience','memory')),
  source_chunks TEXT, -- JSON array
  generated_by TEXT DEFAULT 'agent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE integration_suggestions (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT CHECK(priority IN ('high','medium','low')),
  related_items TEXT, -- JSON array of itinerary_item IDs
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','uploaded','dismissed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Dependencies
- Issues #4, #5, #6 (Agent outputs)

---

## Issue #8: Agent Chat Flow Integration

**Labels**: `enhancement`, `frontend`, `backend`, `ai`
**Assignee**: TBD
**Priority**: Low
**Status**: 📋 Planned

### Description
Enable conversational refinement of extracted data, allowing users to ask questions grounded in the imported conversation and request changes via natural language.

### Acceptance Criteria
- [ ] User can ask: "What did I say about restaurant preferences?"
- [ ] RAG search provides conversation context
- [ ] Agent responses cite source messages
- [ ] User can request changes: "Move Edinburgh to week 2"
- [ ] Changes update itinerary in real-time
- [ ] Agent prompts for missing info during import
- [ ] Conversation state persists across sessions
- [ ] Chat distinguishes between:
  - General trip planning questions
  - Questions about imported conversation
  - Requests to modify extracted data

### Example Interactions
```
User: "What restaurants did I mention for London?"