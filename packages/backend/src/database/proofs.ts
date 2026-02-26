/**
 * ZK Proof Records Database Layer
 * Replaces the in-memory proofStore Map in zkproof.ts.
 *
 * Table: proof_records (auto-created on first import)
 */

import pool from './pool';
import { logger } from '../utils/logger';

const ENSURE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS proof_records (
  proof_id       VARCHAR(120)  PRIMARY KEY,
  agent_address  VARCHAR(128)  NOT NULL,
  proof          JSONB         NOT NULL,
  public_signals JSONB         NOT NULL,
  calldata       JSONB         NOT NULL DEFAULT '[]',
  commitment     TEXT          NOT NULL,
  expires_at     BIGINT        NOT NULL,
  created_at     BIGINT        NOT NULL,
  status         VARCHAR(20)   NOT NULL DEFAULT 'generated'
);
CREATE INDEX IF NOT EXISTS idx_proof_records_agent ON proof_records(agent_address);
CREATE INDEX IF NOT EXISTS idx_proof_records_status ON proof_records(status);
`;

let tableReady = false;
async function ensureTable(): Promise<void> {
  if (tableReady) return;
  try {
    await pool.query(ENSURE_TABLE_SQL);
    tableReady = true;
  } catch (err) {
    logger.error('Failed to ensure proof_records table:', err);
    throw err;
  }
}

export interface ProofRecord {
  proofId: string;
  agentAddress: string;
  proof: object;
  publicSignals: string[];
  calldata: string[];
  commitment: string;
  expiresAt: number;
  createdAt: number;
  status: 'generated' | 'used' | 'expired';
}

/** Persist a newly generated proof. */
export async function saveProof(p: ProofRecord): Promise<void> {
  await ensureTable();
  await pool.query(
    `INSERT INTO proof_records
       (proof_id, agent_address, proof, public_signals, calldata, commitment, expires_at, created_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (proof_id) DO NOTHING`,
    [
      p.proofId,
      p.agentAddress,
      JSON.stringify(p.proof),
      JSON.stringify(p.publicSignals),
      JSON.stringify(p.calldata),
      p.commitment,
      p.expiresAt,
      p.createdAt,
      p.status,
    ],
  );
}

/** Retrieve a proof by ID. Returns null if not found. */
export async function getProof(proofId: string): Promise<ProofRecord | null> {
  await ensureTable();
  const { rows } = await pool.query(
    `SELECT * FROM proof_records WHERE proof_id = $1`,
    [proofId],
  );
  if (rows.length === 0) return null;
  return rowToRecord(rows[0]);
}

/** List proofs for an agent (newest first). */
export async function listProofsByAgent(agentAddress: string): Promise<ProofRecord[]> {
  await ensureTable();
  const { rows } = await pool.query(
    `SELECT * FROM proof_records WHERE agent_address = $1 ORDER BY created_at DESC`,
    [agentAddress],
  );
  return rows.map(rowToRecord);
}

/** Mark a proof as used. */
export async function markProofUsed(proofId: string): Promise<void> {
  await ensureTable();
  await pool.query(
    `UPDATE proof_records SET status = 'used' WHERE proof_id = $1`,
    [proofId],
  );
}

function rowToRecord(row: any): ProofRecord {
  return {
    proofId: row.proof_id,
    agentAddress: row.agent_address,
    proof: typeof row.proof === 'string' ? JSON.parse(row.proof) : row.proof,
    publicSignals: typeof row.public_signals === 'string' ? JSON.parse(row.public_signals) : row.public_signals,
    calldata: typeof row.calldata === 'string' ? JSON.parse(row.calldata) : row.calldata,
    commitment: row.commitment,
    expiresAt: Number(row.expires_at),
    createdAt: Number(row.created_at),
    status: row.status,
  };
}
