import { pool } from '../database/pool';
import { logger } from '../utils/logger';

interface Agent {
  id?: number;
  address: string;
  tx_hash: string;
  registered_at: Date;
  is_verified: boolean;
  revoked_at?: Date;
}

interface Session {
  id?: number;
  agent_address: string;
  session_key: string;
  expiration_block: number;
  max_spend: number;
  tx_hash: string;
  created_at?: Date;
}

export class AgentService {
  /**
   * Create a new agent in database
   */
  async createAgent(data: Agent): Promise<Agent> {
    const query = `
      INSERT INTO agents (address, tx_hash, registered_at, is_verified)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      data.address,
      data.tx_hash,
      data.registered_at,
      data.is_verified
    ];

    try {
      const result = await pool.query(query, values);
      logger.info(`Agent created in DB: ${data.address}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create agent:', error);
      throw error;
    }
  }

  /**
   * Get agent by address
   */
  async getAgentByAddress(address: string): Promise<Agent | null> {
    const query = `
      SELECT * FROM agents WHERE address = $1
    `;

    try {
      const result = await pool.query(query, [address]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get agent:', error);
      throw error;
    }
  }

  /**
   * Get all agents with pagination
   */
  async getAllAgents(page: number, limit: number): Promise<{ agents: Agent[]; total: number }> {
    const offset = (page - 1) * limit;

    const countQuery = 'SELECT COUNT(*) FROM agents WHERE revoked_at IS NULL';
    const dataQuery = `
      SELECT * FROM agents 
      WHERE revoked_at IS NULL
      ORDER BY registered_at DESC
      LIMIT $1 OFFSET $2
    `;

    try {
      const [countResult, dataResult] = await Promise.all([
        pool.query(countQuery),
        pool.query(dataQuery, [limit, offset])
      ]);

      return {
        agents: dataResult.rows,
        total: parseInt(countResult.rows[0].count)
      };
    } catch (error) {
      logger.error('Failed to get all agents:', error);
      throw error;
    }
  }

  /**
   * Revoke an agent
   */
  async revokeAgent(address: string): Promise<void> {
    const query = `
      UPDATE agents 
      SET revoked_at = NOW()
      WHERE address = $1
    `;

    try {
      await pool.query(query, [address]);
      logger.info(`Agent revoked: ${address}`);
    } catch (error) {
      logger.error('Failed to revoke agent:', error);
      throw error;
    }
  }

  /**
   * Create a session
   */
  async createSession(data: Session): Promise<Session> {
    const query = `
      INSERT INTO agent_sessions (agent_address, session_key, expiration_block, max_spend, tx_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      data.agent_address,
      data.session_key,
      data.expiration_block,
      data.max_spend,
      data.tx_hash
    ];

    try {
      const result = await pool.query(query, values);
      logger.info(`Session created for agent: ${data.agent_address}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Get agent sessions
   */
  async getAgentSessions(agentAddress: string): Promise<Session[]> {
    const query = `
      SELECT * FROM agent_sessions 
      WHERE agent_address = $1 
      ORDER BY created_at DESC
    `;

    try {
      const result = await pool.query(query, [agentAddress]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get sessions:', error);
      throw error;
    }
  }

  /**
   * Update agent verification status
   */
  async updateVerificationStatus(address: string, isVerified: boolean): Promise<void> {
    const query = `
      UPDATE agents 
      SET is_verified = $1
      WHERE address = $2
    `;

    try {
      await pool.query(query, [isVerified, address]);
      logger.info(`Agent verification updated: ${address} -> ${isVerified}`);
    } catch (error) {
      logger.error('Failed to update verification:', error);
      throw error;
    }
  }
}
