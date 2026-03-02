import { Router, Request, Response } from 'express';

const router: Router = Router();

/**
 * GET /api/tools — Capability manifest (ADR-0007)
 *
 * Unauthenticated. Returns the structured list of tools this service
 * exposes so frame-agent's MetaOrchestrator can route NL messages here
 * without hardcoded knowledge.
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'tripplanner',
    version: '0.1.0',
    description: 'AI-powered trip planning assistant with RAG over uploaded travel documents',
    tools: [
      {
        name: 'chat',
        endpoint: '/api/v1/chat/message',
        method: 'POST',
        description: 'Send a message to the trip-planning AI assistant (RAG-augmented)',
        input: {
          type: 'object',
          required: ['threadId', 'message'],
          properties: {
            threadId: { type: 'string', description: 'Existing thread ID' },
            message: { type: 'string', description: 'User message' },
          },
        },
        deprecated: false,
      },
      {
        name: 'chat_stream',
        endpoint: '/api/v1/chat/stream',
        method: 'POST',
        description: 'SSE streaming chat endpoint (stub — full streaming coming soon)',
        input: {
          type: 'object',
          required: ['threadId', 'message'],
          properties: {
            threadId: { type: 'string', description: 'Existing thread ID' },
            message: { type: 'string', description: 'User message' },
          },
        },
        deprecated: false,
      },
      {
        name: 'create_thread',
        endpoint: '/api/v1/threads',
        method: 'POST',
        description: 'Create a new conversation thread for a user',
        input: {
          type: 'object',
          required: ['userId', 'title'],
          properties: {
            userId: { type: 'string', description: 'User identifier' },
            title: { type: 'string', description: 'Thread title' },
          },
        },
        deprecated: false,
      },
      {
        name: 'get_threads',
        endpoint: '/api/v1/threads',
        method: 'GET',
        description: 'Retrieve all threads for a user',
        input: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', description: 'User identifier (query param)' },
          },
        },
        deprecated: false,
      },
    ],
    dataEndpoints: [
      { endpoint: '/api/v1/integrations/chatgpt/import', method: 'POST', description: 'Import ChatGPT transcript as travel context document' },
      { endpoint: '/api/v1/integrations/embeddings/generate', method: 'POST', description: 'Generate embeddings for all pending documents' },
      { endpoint: '/api/v1/integrations/openai/status', method: 'GET', description: 'Check OpenAI API key configuration status' },
      { endpoint: '/health', method: 'GET', description: 'Health check' },
    ],
  });
});

export default router;
