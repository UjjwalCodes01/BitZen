import { Pool } from 'pg';
import { logger } from '../utils/logger';
import dns from 'dns';

// Force IPv4 resolution
dns.setDefaultResultOrder('ipv4first');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected database error:', err);
});

export default pool;
