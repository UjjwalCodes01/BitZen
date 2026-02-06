import { pool } from '../database/pool';
import { logger } from '../utils/logger';

interface AuditorStake {
  id?: number;
  service_id: string;
  auditor_address: string;
  amount: number;
  tx_hash: string;
  is_active: boolean;
  staked_at?: Date;
  unstaked_at?: Date;
}

export class AuditorService {
  /**
   * Create a new stake
   */
  async createStake(data: AuditorStake): Promise<AuditorStake> {
    const query = `
      INSERT INTO auditor_stakes (service_id, auditor_address, amount, tx_hash, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      data.service_id,
      data.auditor_address,
      data.amount,
      data.tx_hash,
      data.is_active
    ];

    try {
      const result = await pool.query(query, values);
      logger.info(`Stake created: ${data.auditor_address} -> ${data.service_id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create stake:', error);
      throw error;
    }
  }

  /**
   * Unstake from service
   */
  async unstake(serviceId: string, auditorAddress: string): Promise<void> {
    const query = `
      UPDATE auditor_stakes 
      SET is_active = false, unstaked_at = NOW()
      WHERE service_id = $1 AND auditor_address = $2 AND is_active = true
    `;

    try {
      await pool.query(query, [serviceId, auditorAddress]);
      logger.info(`Unstaked: ${auditorAddress} from ${serviceId}`);
    } catch (error) {
      logger.error('Failed to unstake:', error);
      throw error;
    }
  }

  /**
   * Get auditor stakes
   */
  async getAuditorStakes(auditorAddress: string): Promise<AuditorStake[]> {
    const query = `
      SELECT ast.*, s.name as service_name
      FROM auditor_stakes ast
      JOIN services s ON ast.service_id = s.id
      WHERE ast.auditor_address = $1
      ORDER BY ast.staked_at DESC
    `;

    try {
      const result = await pool.query(query, [auditorAddress]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get auditor stakes:', error);
      throw error;
    }
  }

  /**
   * Get service auditors
   */
  async getServiceAuditors(serviceId: string): Promise<AuditorStake[]> {
    const query = `
      SELECT * FROM auditor_stakes 
      WHERE service_id = $1 AND is_active = true
      ORDER BY amount DESC
    `;

    try {
      const result = await pool.query(query, [serviceId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get service auditors:', error);
      throw error;
    }
  }

  /**
   * Get total staked amount for service
   */
  async getTotalStake(serviceId: string): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM auditor_stakes
      WHERE service_id = $1 AND is_active = true
    `;

    try {
      const result = await pool.query(query, [serviceId]);
      return parseFloat(result.rows[0].total);
    } catch (error) {
      logger.error('Failed to get total stake:', error);
      throw error;
    }
  }
}
