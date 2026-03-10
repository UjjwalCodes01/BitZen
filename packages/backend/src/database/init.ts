import { pool } from './pool';
import { logger } from '../utils/logger';

export { pool };

export const initDatabase = async (): Promise<void> => {
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    logger.info('Database connection successful');

    // Create tables
    await createTables();
    logger.info('Database tables initialized');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

const createTables = async (): Promise<void> => {
  const queries = [
    // Auth nonces table (for server-side nonce validation)
    `CREATE TABLE IF NOT EXISTS auth_nonces (
      address VARCHAR(66) PRIMARY KEY,
      nonce VARCHAR(128) NOT NULL,
      message TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Agents table
    `CREATE TABLE IF NOT EXISTS agents (
      id SERIAL PRIMARY KEY,
      address VARCHAR(66) UNIQUE NOT NULL,
      name VARCHAR(100),
      description TEXT,
      capabilities JSONB DEFAULT '[]',
      tx_hash VARCHAR(66),
      registered_at TIMESTAMP NOT NULL,
      is_verified BOOLEAN DEFAULT false,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Add columns if they don't exist (for existing tables)
    `DO $$ BEGIN
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS name VARCHAR(100);
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '[]';
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$`,

    // Services table
    `CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      provider_address VARCHAR(66) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      endpoint VARCHAR(255) NOT NULL,
      total_stake DECIMAL NOT NULL,
      tx_hash VARCHAR(66),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Reviews table
    `CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      service_id INTEGER REFERENCES services(id),
      reviewer_address VARCHAR(66) NOT NULL,
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      review_hash VARCHAR(66) NOT NULL,
      tx_hash VARCHAR(66),
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Auditor stakes table
    `CREATE TABLE IF NOT EXISTS auditor_stakes (
      id SERIAL PRIMARY KEY,
      service_id INTEGER REFERENCES services(id),
      auditor_address VARCHAR(66) NOT NULL,
      amount DECIMAL NOT NULL,
      tx_hash VARCHAR(66),
      is_active BOOLEAN DEFAULT true,
      staked_at TIMESTAMP DEFAULT NOW(),
      unstaked_at TIMESTAMP
    )`,

    // Agent sessions table
    `CREATE TABLE IF NOT EXISTS agent_sessions (
      id SERIAL PRIMARY KEY,
      agent_address VARCHAR(66) NOT NULL,
      session_key VARCHAR(66) NOT NULL,
      expiration_block BIGINT NOT NULL,
      max_spend DECIMAL NOT NULL,
      tx_hash VARCHAR(66),
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Task logs table
    `CREATE TABLE IF NOT EXISTS task_logs (
      id SERIAL PRIMARY KEY,
      agent_address VARCHAR(66) NOT NULL,
      task_type VARCHAR(50) NOT NULL,
      task_data JSONB,
      status VARCHAR(20) NOT NULL,
      tx_hash VARCHAR(66),
      executed_at TIMESTAMP DEFAULT NOW()
    )`,

    // Reputation scores table
    `CREATE TABLE IF NOT EXISTS reputation_scores (
      id SERIAL PRIMARY KEY,
      service_id INTEGER UNIQUE REFERENCES services(id),
      avg_rating DECIMAL,
      total_reviews INTEGER DEFAULT 0,
      last_updated TIMESTAMP DEFAULT NOW()
    )`,

    // Create indexes
    `CREATE INDEX IF NOT EXISTS idx_agents_address ON agents(address)`,
    `CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_address)`,
    `CREATE INDEX IF NOT EXISTS idx_reviews_service ON reviews(service_id)`,
    `CREATE INDEX IF NOT EXISTS idx_auditor_stakes_service ON auditor_stakes(service_id)`,
    `CREATE INDEX IF NOT EXISTS idx_auditor_stakes_auditor ON auditor_stakes(auditor_address)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_agent ON agent_sessions(agent_address)`,
    `CREATE INDEX IF NOT EXISTS idx_task_logs_agent ON task_logs(agent_address)`,
  ];

  for (const query of queries) {
    await pool.query(query);
  }
};
