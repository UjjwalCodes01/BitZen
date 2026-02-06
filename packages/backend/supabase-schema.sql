-- ==========================================
-- BitZen Database Schema for Supabase
-- ==========================================
-- Run this in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste & Run
-- ==========================================

-- Enable UUID extension (optional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- AGENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  address VARCHAR(66) UNIQUE NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  registered_at TIMESTAMP NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE agents IS 'Registered AI agents with ZK verification';
COMMENT ON COLUMN agents.address IS 'Starknet address of the agent';
COMMENT ON COLUMN agents.tx_hash IS 'Transaction hash of registration on Starknet';
COMMENT ON COLUMN agents.is_verified IS 'Whether agent passed verification checks';

-- ==========================================
-- SERVICES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  provider_address VARCHAR(66) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  endpoint VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  total_stake DECIMAL(20,8) NOT NULL DEFAULT 0,
  tx_hash VARCHAR(66) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE services IS 'AI services marketplace';
COMMENT ON COLUMN services.provider_address IS 'Starknet address of service provider';
COMMENT ON COLUMN services.total_stake IS 'Total amount staked by auditors';
COMMENT ON COLUMN services.endpoint IS 'API endpoint URL for the service';

-- ==========================================
-- REVIEWS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  reviewer_address VARCHAR(66) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_hash VARCHAR(66) NOT NULL,
  review_text TEXT,
  tx_hash VARCHAR(66) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE reviews IS 'Service reviews and ratings';
COMMENT ON COLUMN reviews.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN reviews.review_hash IS 'Hash of review stored on Starknet';

-- ==========================================
-- AUDITOR STAKES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS auditor_stakes (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  auditor_address VARCHAR(66) NOT NULL,
  amount DECIMAL(20,8) NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  staked_at TIMESTAMP DEFAULT NOW(),
  unstaked_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE auditor_stakes IS 'Auditor stakes for services';
COMMENT ON COLUMN auditor_stakes.amount IS 'Amount staked in STRK tokens';
COMMENT ON COLUMN auditor_stakes.is_active IS 'Whether stake is currently active';

-- ==========================================
-- AGENT SESSIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS agent_sessions (
  id SERIAL PRIMARY KEY,
  agent_address VARCHAR(66) NOT NULL,
  session_key VARCHAR(66) NOT NULL UNIQUE,
  expiration_block BIGINT NOT NULL,
  max_spend DECIMAL(20,8) NOT NULL,
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

COMMENT ON TABLE agent_sessions IS 'Session keys for agent authorization';
COMMENT ON COLUMN agent_sessions.session_key IS 'Temporary session key for agent operations';
COMMENT ON COLUMN agent_sessions.expiration_block IS 'Block number when session expires';
COMMENT ON COLUMN agent_sessions.max_spend IS 'Maximum amount session can spend';

-- ==========================================
-- TASK LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS task_logs (
  id SERIAL PRIMARY KEY,
  agent_address VARCHAR(66) NOT NULL,
  task_type VARCHAR(50) NOT NULL,
  task_data JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE task_logs IS 'Execution logs for agent tasks';
COMMENT ON COLUMN task_logs.task_data IS 'JSON data containing task parameters';
COMMENT ON COLUMN task_logs.status IS 'pending, running, completed, failed';
COMMENT ON COLUMN task_logs.result IS 'JSON result of task execution';

-- ==========================================
-- REPUTATION SCORES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS reputation_scores (
  id SERIAL PRIMARY KEY,
  service_id INTEGER UNIQUE NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  avg_rating DECIMAL(3,2),
  total_reviews INTEGER DEFAULT 0,
  total_stake DECIMAL(20,8) DEFAULT 0,
  reputation_score DECIMAL(10,2),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE reputation_scores IS 'Aggregated reputation metrics for services';
COMMENT ON COLUMN reputation_scores.avg_rating IS 'Average rating from reviews (1.00 to 5.00)';
COMMENT ON COLUMN reputation_scores.reputation_score IS 'Calculated reputation score';

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_agents_address ON agents(address);
CREATE INDEX IF NOT EXISTS idx_agents_verified ON agents(is_verified);
CREATE INDEX IF NOT EXISTS idx_agents_created ON agents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_address);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_stake ON services(total_stake DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_service ON reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_address);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auditor_stakes_service ON auditor_stakes(service_id);
CREATE INDEX IF NOT EXISTS idx_auditor_stakes_auditor ON auditor_stakes(auditor_address);
CREATE INDEX IF NOT EXISTS idx_auditor_stakes_active ON auditor_stakes(is_active);

CREATE INDEX IF NOT EXISTS idx_sessions_agent ON agent_sessions(agent_address);
CREATE INDEX IF NOT EXISTS idx_sessions_key ON agent_sessions(session_key);
CREATE INDEX IF NOT EXISTS idx_sessions_expiration ON agent_sessions(expiration_block);

CREATE INDEX IF NOT EXISTS idx_task_logs_agent ON task_logs(agent_address);
CREATE INDEX IF NOT EXISTS idx_task_logs_status ON task_logs(status);
CREATE INDEX IF NOT EXISTS idx_task_logs_created ON task_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reputation_service ON reputation_scores(service_id);
CREATE INDEX IF NOT EXISTS idx_reputation_score ON reputation_scores(reputation_score DESC);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) - Optional
-- ==========================================
-- Uncomment if you want to use Supabase's RLS features

-- Enable RLS on all tables
-- ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE services ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE auditor_stakes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE task_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reputation_scores ENABLE ROW LEVEL SECURITY;

-- Example: Allow read access to all, write access to authenticated users
-- CREATE POLICY "Public read access" ON agents FOR SELECT USING (true);
-- CREATE POLICY "Authenticated write access" ON agents FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auditor_stakes_updated_at BEFORE UPDATE ON auditor_stakes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_logs_updated_at BEFORE UPDATE ON task_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reputation_scores_updated_at BEFORE UPDATE ON reputation_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update reputation score when review is added
CREATE OR REPLACE FUNCTION update_reputation_on_review()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO reputation_scores (service_id, avg_rating, total_reviews)
    VALUES (
        NEW.service_id,
        NEW.rating,
        1
    )
    ON CONFLICT (service_id)
    DO UPDATE SET
        avg_rating = (
            SELECT AVG(rating)::DECIMAL(3,2)
            FROM reviews
            WHERE service_id = NEW.service_id
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE service_id = NEW.service_id
        ),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update reputation when review is added
CREATE TRIGGER update_reputation_after_review
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_reputation_on_review();

-- ==========================================
-- INITIAL DATA (Optional)
-- ==========================================
-- Uncomment to add sample data for testing

-- INSERT INTO agents (address, tx_hash, registered_at, is_verified) VALUES
-- ('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', '0xabc123', NOW(), true),
-- ('0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321', '0xdef456', NOW(), false);

-- INSERT INTO services (provider_address, name, description, endpoint, category, total_stake, tx_hash) VALUES
-- ('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 'AI Data Analysis', 'Advanced data analysis service', 'https://api.example.com/analysis', 'analytics', 1000, '0x789xyz'),
-- ('0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321', 'Sentiment Analysis', 'Real-time sentiment analysis', 'https://api.example.com/sentiment', 'nlp', 500, '0x456abc');

-- ==========================================
-- VERIFICATION
-- ==========================================
-- Run these queries to verify setup:

-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- SELECT COUNT(*) as total_tables FROM pg_tables WHERE schemaname = 'public';
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
-- If you see this without errors, your database is ready! ✅
-- Next step: Update .env file with your Supabase credentials
-- Then run: npm run dev
