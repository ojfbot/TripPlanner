import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import threadsRouter from './routes/threads.js';
import chatRouter from './routes/chat.js';
import integrationsRouter from './routes/integrations.js';

const app: Express = express();
const PORT = process.env.PORT || 3011;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3010',
  credentials: true,
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/threads', threadsRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/integrations', integrationsRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TripPlanner API server running on port ${PORT}`);
});

export default app;
