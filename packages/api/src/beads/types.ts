/**
 * TripBeadLike — FrameBeadLike shape for TripPlanner threads.
 *
 * Satisfies the FrameBeadLike contract defined in ADR-0016 (core repo).
 * Deliberately not imported from @core/workflows to avoid cross-repo coupling.
 *
 * Prefix: "trip-"
 * sourceApp: "tripplanner"
 */

export type TripBeadStatus = 'created' | 'live' | 'closed' | 'archived';

export interface TripBead {
  id: string;
  type: 'task';
  status: TripBeadStatus;
  sourceApp: 'tripplanner';
  created_at: string;
  updated_at: string;
  payload: {
    title: string;
    threadId: string;
    userId: string;
    messageCount: number;
  };
}
