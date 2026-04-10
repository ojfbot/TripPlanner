import { Router, Request, Response } from 'express';
import { db } from '../services/database.js';
import { mapThreadToBead } from '../beads/mapper.js';
import type { TripBeadStatus } from '../beads/types.js';

const router: Router = Router();

/**
 * GET /api/beads
 *
 * Returns all threads mapped to the FrameBeadLike shape (ADR-0016).
 * Read-only projection — Mayor/frame-agent aggregation endpoint.
 *
 * Query params:
 *   status — filter by bead status: "created" | "live" | "closed" | "archived"
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const threads = db.getAllThreads();
    let beads = threads.map(mapThreadToBead);

    const statusParam = req.query.status as string | undefined;
    if (statusParam) {
      const valid: TripBeadStatus[] = ['created', 'live', 'closed', 'archived'];
      if (!valid.includes(statusParam as TripBeadStatus)) {
        res.status(400).json({ error: `Invalid status. Must be one of: ${valid.join(', ')}` });
        return;
      }
      beads = beads.filter(b => b.status === statusParam);
    }

    res.json({ beads, count: beads.length });
  } catch (error) {
    console.error('Error fetching beads:', error);
    res.status(500).json({ error: 'Failed to fetch beads' });
  }
});

export default router;
