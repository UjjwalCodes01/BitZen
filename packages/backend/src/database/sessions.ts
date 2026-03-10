/**
 * Session Keys Database Layer
 * All session key persistence goes through here — replaces the in-memory Map.
 *
 * Table: plugin_sessions (see supabase-schema.sql for DDL)
 */

import pool from './pool';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// ─── Encryption helpers ──────────────────────────────────────────────────────

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required for session key storage');
  }
  // Derive a 32-byte key from the env var
  return crypto.createHash('sha256').update(key).digest();
}

function encryptPrivateKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptPrivateKey(encryptedStr: string): string {
  const key = getEncryptionKey();
  const parts = encryptedStr.split(':');
  if (parts.length !== 3) {
    // Legacy unencrypted value — return as-is (will be re-encrypted on next write)
    return encryptedStr;
  }
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const ciphertext = parts[2];
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SessionRecord {
  sessionId: string;
  agentAddress: string;
  publicKey: string;
  privateKey: string; // stored only server-side
  permissions: string[];
  expirationBlocks: number;
  expiresAt: number; // Unix ms
  spendingLimit: {
    daily: string;
    perTransaction: string;
    currency: string;
  };
  usage: {
    totalSpent: string;
    transactionCount: number;
    lastUsed: number | null;
  };
  status: 'active' | 'revoked' | 'expired';
  metadata: Record<string, any>;
  createdAt: number; // Unix ms
  updatedAt?: number;
}

// ─── DDL auto-apply (runs once on first import) ───────────────────────────────

const ENSURE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS plugin_sessions (
  session_id    VARCHAR(80)   PRIMARY KEY,
  agent_address VARCHAR(128)  NOT NULL,
  public_key    VARCHAR(256)  NOT NULL,
  private_key   TEXT          NOT NULL,
  permissions   JSONB         NOT NULL DEFAULT '[]',
  expiration_blocks INTEGER   NOT NULL,
  expires_at    TIMESTAMPTZ   NOT NULL,
  spending_limit JSONB        NOT NULL DEFAULT '{}',
  usage         JSONB         NOT NULL DEFAULT '{}',
  status        VARCHAR(20)   NOT NULL DEFAULT 'active',
  metadata      JSONB         NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plugin_sessions_agent ON plugin_sessions(agent_address);
CREATE INDEX IF NOT EXISTS idx_plugin_sessions_status ON plugin_sessions(status);
`;

let tableReady = false;
async function ensureTable(): Promise<void> {
  if (tableReady) return;
  try {
    await pool.query(ENSURE_TABLE_SQL);
    tableReady = true;
  } catch (err) {
    logger.error('Failed to ensure plugin_sessions table:', err);
    throw err;
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Persist a new session record.
 */
export async function createSession(s: SessionRecord): Promise<void> {
  await ensureTable();
  await pool.query(
    `INSERT INTO plugin_sessions
       (session_id, agent_address, public_key, private_key, permissions,
        expiration_blocks, expires_at, spending_limit, usage, status, metadata, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,to_timestamp($7/1000.0),$8,$9,$10,$11,to_timestamp($12/1000.0),NOW())
     ON CONFLICT (session_id) DO NOTHING`,
    [
      s.sessionId,
      s.agentAddress,
      s.publicKey,
      encryptPrivateKey(s.privateKey),
      JSON.stringify(s.permissions),
      s.expirationBlocks,
      s.expiresAt,
      JSON.stringify(s.spendingLimit),
      JSON.stringify(s.usage),
      s.status,
      JSON.stringify(s.metadata),
      s.createdAt,
    ],
  );
}

/**
 * Retrieve a session by its ID. Returns null if not found.
 */
export async function getSession(sessionId: string): Promise<SessionRecord | null> {
  await ensureTable();
  const { rows } = await pool.query(
    `SELECT *, EXTRACT(EPOCH FROM expires_at)*1000 AS expires_at_ms,
            EXTRACT(EPOCH FROM created_at)*1000 AS created_at_ms
     FROM plugin_sessions WHERE session_id = $1`,
    [sessionId],
  );
  if (rows.length === 0) return null;
  return rowToRecord(rows[0]);
}

/**
 * Return all non-revoked sessions for an agent.
 */
export async function listSessionsByAgent(agentAddress: string): Promise<SessionRecord[]> {
  await ensureTable();
  const { rows } = await pool.query(
    `SELECT *, EXTRACT(EPOCH FROM expires_at)*1000 AS expires_at_ms,
            EXTRACT(EPOCH FROM created_at)*1000 AS created_at_ms
     FROM plugin_sessions
     WHERE agent_address = $1 AND status != 'revoked'
     ORDER BY created_at DESC`,
    [agentAddress],
  );
  return rows.map(rowToRecord);
}

/**
 * Persist a status change (active → revoked / expired).
 */
export async function updateSessionStatus(
  sessionId: string,
  status: 'active' | 'revoked' | 'expired',
): Promise<void> {
  await ensureTable();
  await pool.query(
    `UPDATE plugin_sessions SET status=$1, updated_at=NOW() WHERE session_id=$2`,
    [status, sessionId],
  );
}

/**
 * Update spending limits.
 */
export async function updateSessionLimits(
  sessionId: string,
  spendingLimit: SessionRecord['spendingLimit'],
): Promise<void> {
  await ensureTable();
  await pool.query(
    `UPDATE plugin_sessions SET spending_limit=$1, updated_at=NOW() WHERE session_id=$2`,
    [JSON.stringify(spendingLimit), sessionId],
  );
}

/**
 * Increment usage counters after a task execution.
 */
export async function incrementSessionUsage(
  sessionId: string,
  amountDelta: number,
): Promise<void> {
  await ensureTable();
  // Read current, update in JS, write back — safe enough given low concurrency
  const session = await getSession(sessionId);
  if (!session) return;

  const usage = {
    totalSpent: (parseFloat(session.usage.totalSpent) + amountDelta).toString(),
    transactionCount: session.usage.transactionCount + 1,
    lastUsed: Date.now(),
  };

  await pool.query(
    `UPDATE plugin_sessions SET usage=$1, updated_at=NOW() WHERE session_id=$2`,
    [JSON.stringify(usage), sessionId],
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToRecord(row: any): SessionRecord {
  return {
    sessionId: row.session_id,
    agentAddress: row.agent_address,
    publicKey: row.public_key,
    privateKey: decryptPrivateKey(row.private_key),
    permissions: row.permissions ?? [],
    expirationBlocks: row.expiration_blocks,
    expiresAt: Math.round(parseFloat(row.expires_at_ms)),
    spendingLimit: row.spending_limit ?? { daily: '1000', perTransaction: '100', currency: 'STRK' },
    usage: row.usage ?? { totalSpent: '0', transactionCount: 0, lastUsed: null },
    status: row.status,
    metadata: row.metadata ?? {},
    createdAt: Math.round(parseFloat(row.created_at_ms)),
  };
}
