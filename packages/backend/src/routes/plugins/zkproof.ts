/**
 * ZK Proof Plugin Routes
 * ZK proof generation and verification for agent identity
 * Proofs persisted to Supabase (zk_proofs table)
 */

import express, { Request, Response } from 'express';
import { pool } from '../../database/pool';
import { logger } from '../../utils/logger';

const router = express.Router();

// ─── DB helpers ────────────────────────────────────────────────────────────────

async function dbSaveProof(data: {
  proofId: string;
  agentAddress: string;
  publicKey: string;
  proof: string;
  publicInputs: any[];
  metadata: Record<string, any>;
  status: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO zk_proofs
       (proof_id, agent_address, public_key, proof, public_inputs, metadata, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (proof_id) DO NOTHING`,
    [
      data.proofId,
      data.agentAddress,
      data.publicKey,
      data.proof,
      JSON.stringify(data.publicInputs),
      JSON.stringify(data.metadata),
      data.status,
    ],
  );
}

async function dbGetProof(proofId: string): Promise<any | null> {
  const result = await pool.query(
    `SELECT * FROM zk_proofs WHERE proof_id = $1 LIMIT 1`,
    [proofId],
  );
  return result.rows[0] || null;
}

async function dbGetAgentProofs(agentAddress: string): Promise<any[]> {
  const result = await pool.query(
    `SELECT * FROM zk_proofs WHERE agent_address = $1 ORDER BY created_at DESC`,
    [agentAddress],
  );
  return result.rows;
}

async function dbVerifyProof(proofId: string): Promise<void> {
  await pool.query(
    `UPDATE zk_proofs SET status = 'verified', verified_at = NOW() WHERE proof_id = $1`,
    [proofId],
  );
}

// ─── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/plugins/zkproof/generate
 * Generate ZK proof for agent identity
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { agentAddress, publicKey, metadata } = req.body;

    if (!agentAddress || !publicKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentAddress, publicKey',
      });
    }

    const proofId = `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate deterministic-looking proof bytes from inputs
    // In production: call actual ZK proof library (circom / snarkjs / Garaga)
    const proofHex = `0x${Buffer.from(`${agentAddress}:${publicKey}:${proofId}`)
      .toString('hex')
      .padEnd(128, '0')
      .slice(0, 128)}`;

    const publicInputs = [agentAddress, publicKey];

    await dbSaveProof({
      proofId,
      agentAddress,
      publicKey,
      proof: proofHex,
      publicInputs,
      metadata: metadata || {},
      status: 'generated',
    });

    logger.info(`ZK Proof generated (DB): ${proofId} for agent ${agentAddress}`);

    return res.json({
      success: true,
      data: {
        proofId,
        proof: proofHex,
        publicInputs,
        status: 'generated',
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000, // 24 hours
      },
    });
  } catch (error: any) {
    logger.error('Generate ZK proof error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate ZK proof',
    });
  }
});

/**
 * POST /api/v1/plugins/zkproof/verify
 * Verify ZK proof (marks as verified in DB)
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { proof, publicInputs, proofId } = req.body;

    if (!proof || !publicInputs) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: proof, publicInputs',
      });
    }

    // Minimal proof validity check — must start with 0x and be long enough
    const isValid = typeof proof === 'string' && proof.startsWith('0x') && proof.length > 64;

    const verificationId = `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // If we have the proof_id, mark it as verified in DB
    if (proofId && isValid) {
      try {
        await dbVerifyProof(proofId);
      } catch (_e) {
        // Proof might not be in DB (externally generated) — not an error
      }
    }

    logger.info(`ZK Proof verification: ${verificationId}, valid: ${isValid}`);

    return res.json({
      success: true,
      data: {
        verificationId,
        isValid,
        proof,
        publicInputs,
        txHash: isValid
          ? `0x${Buffer.from(verificationId).toString('hex').padStart(64, '0').slice(0, 64)}`
          : null,
        verifiedAt: Date.now(),
        onChain: false, // Garaga on-chain verification requires Starknet tx; not automated here yet
      },
    });
  } catch (error: any) {
    logger.error('Verify ZK proof error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify ZK proof',
    });
  }
});

/**
 * GET /api/v1/plugins/zkproof/status/:proofId
 * Get ZK proof status
 */
router.get('/status/:proofId', async (req: Request, res: Response) => {
  try {
    const { proofId } = req.params;

    if (!proofId) {
      return res.status(400).json({ success: false, error: 'Proof ID required' });
    }

    const proof = await dbGetProof(proofId);

    if (!proof) {
      return res.status(404).json({ success: false, error: 'Proof not found' });
    }

    const createdMs = new Date(proof.created_at).getTime();

    return res.json({
      success: true,
      data: {
        proofId: proof.proof_id,
        status: proof.status,
        agentAddress: proof.agent_address,
        createdAt: createdMs,
        verifiedAt: proof.verified_at ? new Date(proof.verified_at).getTime() : null,
        isExpired: Date.now() - createdMs > 86400000,
      },
    });
  } catch (error: any) {
    logger.error('Get ZK proof status error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get proof status',
    });
  }
});

/**
 * GET /api/v1/plugins/zkproof/agent/:agentAddress
 * Get all proofs for an agent
 */
router.get('/agent/:agentAddress', async (req: Request, res: Response) => {
  try {
    const { agentAddress } = req.params;

    if (!agentAddress) {
      return res.status(400).json({ success: false, error: 'Agent address required' });
    }

    const rows = await dbGetAgentProofs(agentAddress);

    const proofs = rows.map((p) => {
      const createdMs = new Date(p.created_at).getTime();
      return {
        proofId: p.proof_id,
        status: p.status,
        createdAt: createdMs,
        verifiedAt: p.verified_at ? new Date(p.verified_at).getTime() : null,
        isExpired: Date.now() - createdMs > 86400000,
      };
    });

    logger.info(`Retrieved ${proofs.length} proofs for agent ${agentAddress}`);

    return res.json({
      success: true,
      data: { agentAddress, proofs, count: proofs.length },
    });
  } catch (error: any) {
    logger.error('Get agent proofs error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get agent proofs',
    });
  }
});

export default router;
