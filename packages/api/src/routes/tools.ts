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
        endpoint: 'POST /api/v1/chat/message',
        description: 'Send a message to the trip-planning AI assistant (RAG-augmented)',
        input: { threadId: 'string', message: 'string' },
        deprecated: false,
      },
      {
        name: 'chat_stream',
        endpoint: 'POST /api/v1/chat/stream',
        description: 'SSE streaming chat endpoint',
        input: { threadId: 'string', message: 'string' },
        deprecated: false,
      },
      {
        name: 'create_thread',
        endpoint: 'POST /api/v1/threads',
        description: 'Create a new conversation thread for a user',
        input: { userId: 'string', title: 'string' },
        deprecated: false,
      },
      {
        name: 'get_threads',
        endpoint: 'GET /api/v1/threads',
        description: 'Retrieve all threads for a user',
        input: { userId: 'string (query param)' },
        deprecated: false,
      },
      {
        name: 'import_chatgpt_transcript',
        endpoint: 'POST /api/v1/integrations/chatgpt/import',
        description: 'Import a ChatGPT conversation transcript (pasted text) as a travel context document',
        input: { userId: 'string', content: 'string (JSON or text transcript)', threadId: 'string (optional)' },
        deprecated: false,
      },
      {
        name: 'import_chatgpt_file',
        endpoint: 'POST /api/v1/integrations/chatgpt/import/file',
        description: 'Import a ChatGPT transcript from a file upload',
        input: { userId: 'string', file: 'multipart/form-data', threadId: 'string (optional)' },
        deprecated: false,
      },
      {
        name: 'import_intelligent',
        endpoint: 'POST /api/v1/integrations/chatgpt/import/intelligent',
        description: 'Full multi-phase intelligent import with SSE progress updates — parses, embeds, and extracts trip data',
        input: { userId: 'string', content: 'string' },
        deprecated: false,
      },
      {
        name: 'extract_trip',
        endpoint: 'POST /api/v1/integrations/chatgpt/extract-trip',
        description: 'Extract structured trip data (destinations, dates, travelers, preferences) from a ChatGPT transcript',
        input: { content: 'string (transcript text)' },
        deprecated: false,
      },
    ],
    dataEndpoints: {
      threads: 'GET/POST /api/v1/threads',
      documents: 'GET /api/v1/integrations/documents',
      openaiStatus: 'GET /api/v1/integrations/openai/status',
      progressStream: 'GET /api/v1/integrations/process/:processId/stream',
    },
  });
});

export default router;
