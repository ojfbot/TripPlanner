# RAG (Retrieval-Augmented Generation) Workflow

## Overview

TripPlanner now features a complete RAG workflow that enables context-aware AI responses by searching through uploaded documents. This allows the AI to reference previous conversations, trip plans, and user preferences when generating recommendations.

## Architecture

```
User uploads document (ChatGPT transcript, text file)
          ↓
   [Document Parser]
          ↓
   [RAG Manager] ← Chunks text into segments
          ↓
   [OpenAI Embeddings] ← Generates vector embeddings
          ↓
   [SQLite Database] ← Stores chunks + embeddings
          ↓
User asks question in chat
          ↓
   [Semantic Search] ← Finds relevant chunks via cosine similarity
          ↓
   [RAG Chat Agent] ← Uses Anthropic Claude with context
          ↓
Context-aware AI response
```

## Components

### 1. Document Ingestion (`packages/agent-graph/src/services/`)

#### DocumentChunker (`document-chunker.ts`)
- **Purpose**: Splits documents into optimal chunks for embedding
- **Strategies**:
  - `recursive` (default): Tries larger separators first (paragraphs → lines → sentences → words)
  - `paragraph`: Splits on double newlines
  - `sentence`: Splits on sentence boundaries
  - `fixed`: Fixed character size with overlap
- **Configuration**:
  ```typescript
  {
    maxChunkSize: 1000,      // Characters per chunk
    chunkOverlap: 200,       // Overlap between chunks
    strategy: 'recursive',
    preserveFormatting: true
  }
  ```

#### RAGManager (`rag-manager.ts`)
- **Purpose**: Orchestrates document processing pipeline
- **Key Methods**:
  - `ingestChatGPTTranscript()`: Process ChatGPT conversation exports
  - `ingestTextDocument()`: Process plain text documents
  - `search()`: Semantic search across chunks
- **Returns**: Full document with chunks and embeddings for persistence

#### OpenAIService (`openai.ts`)
- **Purpose**: Generate vector embeddings for semantic search
- **Model**: `text-embedding-3-small` (1536 dimensions)
- **Features**:
  - Batch embedding generation (up to 10 chunks at once)
  - Cosine similarity calculation
  - Connection testing

### 2. API Endpoints (`packages/api/src/routes/`)

#### Document Upload (`integrations.ts`)

**Simple Upload** (background processing):
```bash
POST /api/v1/integrations/chatgpt/import/file
Content-Type: multipart/form-data

{
  userId: string
  transcript: file (.json or .txt)
  threadId?: string (optional)
}
```

**Intelligent Import** (with progress tracking):
```bash
POST /api/v1/integrations/chatgpt/import/intelligent
Content-Type: application/json

{
  userId: string
  content: string
}

Response: { processId: string, status: "processing" }
```

**Progress Streaming**:
```bash
GET /api/v1/integrations/process/:processId/stream
Content-Type: text/event-stream

Events:
- progress: { phase: string, percentage: number, message: string }
- complete: { documentId: string, ... }
- error: { phase: string, error: string }
```

**Processing Phases**:
1. STORING (5%) - Save document to database
2. EXTRACTING_TEXT (15%) - Parse and extract text
3. CHUNKING (25%) - Split into semantic chunks
4. EMBEDDING (35%) - Generate vector embeddings
5. RAG_STORE (50%) - Save chunks/embeddings to DB
6. AGENT_SUMMARY (60%) - AI-powered trip extraction
7. ITINERARY_GEN (70%) - Generate itineraries (future)
8. VISION_GEN (80%) - Generate vision tiles (future)
9. INTEGRATION_ANALYSIS (90%) - Analyze integrations (future)
10. FORMATTING (95%) - Format results
11. POPULATING (98%) - Populate database
12. Complete (100%)

#### Document Management

**List Documents**:
```bash
GET /api/v1/integrations/documents?userId={userId}

Response: Document[]
```

**Get Document Details**:
```bash
GET /api/v1/integrations/documents/:documentId

Response: {
  document: Document,
  chunks: DocumentChunk[],
  embeddingCount: number
}
```

**Delete Document**:
```bash
DELETE /api/v1/integrations/documents/:documentId

Response: 204 No Content
```

### 3. RAG Chat Agent (`packages/agent-graph/src/agents/rag-chat-agent.ts`)

#### Features
- **Semantic Search**: Finds relevant context using cosine similarity
- **Context Filtering**: Only includes chunks above similarity threshold (default: 0.7)
- **Context Limiting**: Maximum 5 chunks per query (configurable)
- **Conversation History**: Maintains last 10 messages for context
- **Citation**: References which documents were used in response

#### Configuration
```typescript
{
  model: 'claude-sonnet-4-5-20250929',
  temperature: 0.7,
  maxContextChunks: 5,
  similarityThreshold: 0.7
}
```

#### Usage
```typescript
import { ragChatAgent } from '@tripplanner/agent-graph';

// With manual context
const response = await ragChatAgent.chat(
  userMessage,
  documentContexts,
  conversationHistory
);

// With automatic context search
const response = await ragChatAgent.chatWithAutoContext(
  userMessage,
  chunksWithEmbeddings,
  conversationHistory
);
```

### 4. Chat API Integration (`packages/api/src/routes/chat.ts`)

The `/api/v1/chat/message` endpoint now:
1. Loads conversation history (last 10 messages)
2. Fetches user's documents with completed embeddings
3. Performs semantic search to find relevant chunks
4. Generates AI response with context
5. Returns response with metadata about sources used

**Request**:
```bash
POST /api/v1/chat/message
Content-Type: application/json

{
  threadId: string,
  message: string
}
```

**Response**:
```json
{
  "userMessage": { ... },
  "assistantMessage": {
    "messageId": "uuid",
    "content": "AI response with context..."
  },
  "metadata": {
    "useRAG": true,
    "contextCount": 3,
    "model": "claude-sonnet-4-5-20250929",
    "contextSources": [
      {
        "documentTitle": "Paris Trip Planning",
        "similarity": 0.89
      }
    ]
  }
}
```

## Database Schema

### documents
```sql
CREATE TABLE documents (
  documentId TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT CHECK(type IN ('chatgpt_transcript', 'text', 'other')),
  title TEXT NOT NULL,
  rawContent TEXT NOT NULL,
  metadata TEXT NOT NULL,
  threadId TEXT,
  embeddingStatus TEXT CHECK(embeddingStatus IN ('pending', 'processing', 'completed', 'failed')),
  extractionStatus TEXT CHECK(extractionStatus IN ('pending', 'processing', 'completed', 'failed')),
  extractedData TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
)
```

### document_chunks
```sql
CREATE TABLE document_chunks (
  chunkId TEXT PRIMARY KEY,
  documentId TEXT NOT NULL,
  chunkIndex INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (documentId) REFERENCES documents(documentId) ON DELETE CASCADE
)
```

### embeddings
```sql
CREATE TABLE embeddings (
  embeddingId TEXT PRIMARY KEY,
  chunkId TEXT NOT NULL,
  documentId TEXT NOT NULL,
  vector TEXT NOT NULL,  -- JSON array of 1536 floats
  model TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (chunkId) REFERENCES document_chunks(chunkId) ON DELETE CASCADE
)
```

## Environment Configuration

Required environment variables:

```bash
# Anthropic API (for chat responses)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI API (for embeddings)
OPENAI_API_KEY=sk-...

# Optional
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
TEMPERATURE=0.7
```

## Usage Example

### 1. Upload a ChatGPT Transcript

**Via File Upload**:
```bash
curl -X POST http://localhost:3011/api/v1/integrations/chatgpt/import/file \
  -F "userId=user123" \
  -F "transcript=@chatgpt_export.json"
```

**Via Intelligent Import** (with progress):
```bash
# Start import
curl -X POST http://localhost:3011/api/v1/integrations/chatgpt/import/intelligent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "content": "..."
  }'

# Response: { "processId": "abc-123", "status": "processing" }

# Stream progress
curl -N http://localhost:3011/api/v1/integrations/process/abc-123/stream
```

### 2. Chat with Context

```bash
curl -X POST http://localhost:3011/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "thread-456",
    "message": "What restaurants did we discuss for dinner in Paris?"
  }'
```

The AI will:
1. Search through uploaded ChatGPT transcripts
2. Find chunks mentioning "restaurants" and "Paris"
3. Use that context to provide a specific answer
4. Reference which conversation the information came from

## Performance Considerations

### Embedding Generation
- **Speed**: ~100ms per chunk (batch of 10)
- **Cost**: $0.00002 per 1K tokens (text-embedding-3-small)
- **Storage**: 1536 floats × 4 bytes = 6KB per embedding

### Semantic Search
- **Algorithm**: Cosine similarity (in-memory)
- **Speed**: O(n) where n = total chunks
- **Optimization**: Consider vector database (Pinecone, Weaviate) for >10K chunks

### Chat Response
- **Speed**: 1-3 seconds (includes search + generation)
- **Cost**: ~$0.01 per request (Claude Sonnet 4.5)
- **Context Window**: Up to 5 chunks × ~1000 chars = ~5000 chars

## Future Enhancements

1. **Vector Database Integration**
   - Replace in-memory search with Pinecone/Weaviate
   - Enable sub-millisecond search for 100K+ chunks

2. **Hybrid Search**
   - Combine semantic search with keyword matching
   - Better precision for specific queries

3. **Document Type Support**
   - PDF parsing with layout preservation
   - Web page scraping and cleaning
   - Image OCR for travel photos

4. **Context Ranking**
   - Re-rank results using cross-encoder
   - Combine recency + relevance

5. **Multi-modal RAG**
   - Include images in context
   - Use Claude's vision capabilities for travel photos

## Troubleshooting

### No Context Retrieved
**Symptom**: AI says "I don't have any context from uploaded documents"

**Causes**:
- No documents uploaded
- Documents still processing (check `embeddingStatus`)
- Query doesn't match document content semantically

**Solution**:
```bash
# Check document status
GET /api/v1/integrations/documents?userId={userId}

# Look for embeddingStatus: "completed"
```

### Low Similarity Scores
**Symptom**: AI doesn't use relevant context

**Causes**:
- Similarity threshold too high (default 0.7)
- Chunks too small/large
- Query phrasing doesn't match document

**Solution**:
- Lower threshold in RAGChatAgent config
- Adjust chunk size in DocumentChunker
- Rephrase query to match document language

### API Keys Not Configured
**Symptom**: "AI chat is not configured"

**Solution**:
```bash
# Set environment variables
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...

# Restart API server
pnpm dev:api
```

## Testing

### Manual Testing

1. **Upload Test Document**:
   ```bash
   curl -X POST http://localhost:3011/api/v1/integrations/chatgpt/import \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "test-user",
       "content": "User: I want to visit Paris in June\nAssistant: Paris in June is wonderful! ..."
     }'
   ```

2. **Verify Embedding**:
   ```bash
   # Check documents
   curl http://localhost:3011/api/v1/integrations/documents?userId=test-user

   # Should show embeddingStatus: "completed"
   ```

3. **Test Chat**:
   ```bash
   curl -X POST http://localhost:3011/api/v1/chat/message \
     -H "Content-Type: application/json" \
     -d '{
       "threadId": "test-thread",
       "message": "When should I visit Paris?"
     }'

   # Should reference uploaded context
   ```

## Monitoring

Key metrics to track:
- Document upload rate
- Embedding generation success rate
- Average chunk count per document
- Semantic search latency
- Context relevance (similarity scores)
- Chat response quality

## Security

- **API Keys**: Never commit to git (use .env.local)
- **User Isolation**: Documents filtered by userId
- **Rate Limiting**: 100 requests per 15 minutes
- **Input Validation**: File type and size restrictions
- **SQL Injection**: Parameterized queries only
