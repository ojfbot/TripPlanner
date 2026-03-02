/**
 * Progress Event Emitter
 * Emits real-time progress updates during document processing
 */

import { EventEmitter } from 'events';

export enum ProcessingPhase {
  STORING = 'storing',
  EXTRACTING_TEXT = 'extracting_text',
  CHUNKING = 'chunking',
  EMBEDDING = 'embedding',
  RAG_STORE = 'rag_store',
  AGENT_SUMMARY = 'agent_summary',
  ITINERARY_GEN = 'itinerary_gen',
  VISION_GEN = 'vision_gen',
  INTEGRATION_ANALYSIS = 'integration_analysis',
  FORMATTING = 'formatting',
  POPULATING = 'populating',
}

export const PHASE_MESSAGES: Record<ProcessingPhase, string> = {
  [ProcessingPhase.STORING]: 'Saving your conversation to our secure database...',
  [ProcessingPhase.EXTRACTING_TEXT]: 'Reading through your messages and parsing the conversation structure...',
  [ProcessingPhase.CHUNKING]: 'Breaking your conversation into semantic sections for better analysis...',
  [ProcessingPhase.EMBEDDING]: 'Converting text into vector embeddings using OpenAI for semantic search...',
  [ProcessingPhase.RAG_STORE]: 'Indexing embeddings in the vector store for retrieval-augmented generation...',
  [ProcessingPhase.AGENT_SUMMARY]: 'Running Claude AI to extract destinations, dates, preferences, and trip details...',
  [ProcessingPhase.ITINERARY_GEN]: 'Building structured itineraries organized by week, day, and activity type...',
  [ProcessingPhase.VISION_GEN]: 'Crafting vision tiles based on your trip motivations and experiences...',
  [ProcessingPhase.INTEGRATION_ANALYSIS]: 'Identifying missing reservation documents and suggesting integrations...',
  [ProcessingPhase.FORMATTING]: 'Structuring all extracted data into dashboard-ready format...',
  [ProcessingPhase.POPULATING]: 'Updating your dashboard with itineraries, vision tiles, and trip details...',
};

export interface ProgressEvent {
  processId: string;
  phase: ProcessingPhase;
  progress: number; // 0-100
  message?: string; // Custom message override
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface ErrorEvent {
  processId: string;
  phase: ProcessingPhase;
  error: string;
  timestamp: string;
}

export interface CompleteEvent {
  processId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface BufferedEvent {
  type: 'progress' | 'error' | 'complete';
  data: ProgressEvent | ErrorEvent | CompleteEvent;
}

export class ProgressEmitter extends EventEmitter {
  private processId: string;
  private _eventBuffer: BufferedEvent[] = [];
  private _completed = false;

  constructor(processId: string) {
    super();
    this.processId = processId;
  }

  get isCompleted(): boolean {
    return this._completed;
  }

  get bufferedEvents(): readonly BufferedEvent[] {
    return this._eventBuffer;
  }

  emitPhase(phase: ProcessingPhase, progress: number, data?: Record<string, unknown>): void {
    const event: ProgressEvent = {
      processId: this.processId,
      phase,
      progress,
      timestamp: new Date().toISOString(),
      data,
    };
    this._eventBuffer.push({ type: 'progress', data: event });
    this.emit('progress', event);
  }

  emitProgress(phase: ProcessingPhase, progress: number, message: string, data?: Record<string, unknown>): void {
    const event: ProgressEvent = {
      processId: this.processId,
      phase,
      progress,
      message,
      timestamp: new Date().toISOString(),
      data,
    };
    this._eventBuffer.push({ type: 'progress', data: event });
    this.emit('progress', event);
  }

  emitError(phase: ProcessingPhase, error: string): void {
    const event: ErrorEvent = {
      processId: this.processId,
      phase,
      error,
      timestamp: new Date().toISOString(),
    };
    this._eventBuffer.push({ type: 'error', data: event });
    this.emit('error', event);
  }

  emitComplete(data: Record<string, unknown>): void {
    const event: CompleteEvent = {
      processId: this.processId,
      data,
      timestamp: new Date().toISOString(),
    };
    this._eventBuffer.push({ type: 'complete', data: event });
    this._completed = true;
    this.emit('complete', event);
  }
}

// Global map to track active process emitters
export const processEmitters = new Map<string, ProgressEmitter>();
