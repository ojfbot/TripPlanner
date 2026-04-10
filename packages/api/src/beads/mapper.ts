import type { Thread } from '../services/database.js';
import type { TripBead, TripBeadStatus } from './types.js';

function deriveStatus(_thread: Thread): TripBeadStatus {
  return 'live';
}

export function mapThreadToBead(thread: Thread): TripBead {
  return {
    id: `trip-${thread.threadId}`,
    type: 'task',
    status: deriveStatus(thread),
    sourceApp: 'tripplanner',
    created_at: thread.createdAt,
    updated_at: thread.updatedAt,
    payload: {
      title: thread.title || 'Untitled',
      threadId: thread.threadId,
      userId: thread.userId,
      messageCount: thread.messageCount ?? 0,
    },
  };
}
