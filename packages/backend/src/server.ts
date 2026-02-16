import express, { Application, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Import routes
import agentRoutes from './routes/agents';
import serviceRoutes from './routes/services';
import auditorRoutes from './routes/auditors';
import authRoutes from './routes/auth';
import bitcoinRoutes from './routes/plugins/bitcoin';
import zkproofRoutes from './routes/plugins/zkproof';
import accountRoutes from './routes/plugins/account';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Import database
import { initDatabase } from './database/init';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// HTTP request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Health check endpoint
app.get('/health', (_req, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/auditors', auditorRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/plugins/bitcoin', bitcoinRoutes);
app.use('/api/v1/plugins/zkproof', zkproofRoutes);
app.use('/api/v1/plugins/account', accountRoutes);

// 404 handler
app.use((_req, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database connection
    try {
      await initDatabase();
      logger.info('Database initialized successfully');
    } catch (dbError) {
      logger.warn('Database connection failed, starting without DB:', dbError);
      logger.warn('API will run in limited mode');
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 BitZen Backend API running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🌐 Network: ${process.env.STARKNET_NETWORK}`);
      logger.info(`📍 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

startServer();

export default app;
