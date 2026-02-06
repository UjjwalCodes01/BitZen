import { pool } from '../database/pool';
import { logger } from '../utils/logger';

interface Service {
  id?: number;
  provider_address: string;
  name: string;
  description: string;
  endpoint: string;
  total_stake: number;
  tx_hash: string;
  is_active: boolean;
  created_at?: Date;
}

interface Review {
  id?: number;
  service_id: string;
  reviewer_address: string;
  rating: number;
  review_hash: string;
  tx_hash: string;
  created_at?: Date;
}

interface ServiceFilters {
  page: number;
  limit: number;
  category?: string;
  min_stake?: number;
}

export class ServiceService {
  /**
   * Create a new service
   */
  async createService(data: Service): Promise<Service> {
    const query = `
      INSERT INTO services (provider_address, name, description, endpoint, total_stake, tx_hash, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      data.provider_address,
      data.name,
      data.description,
      data.endpoint,
      data.total_stake,
      data.tx_hash,
      data.is_active
    ];

    try {
      const result = await pool.query(query, values);
      logger.info(`Service created: ${data.name}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create service:', error);
      throw error;
    }
  }

  /**
   * Get services with filters
   */
  async getServices(filters: ServiceFilters): Promise<{ services: Service[]; total: number }> {
    const offset = (filters.page - 1) * filters.limit;
    let whereClause = 'WHERE is_active = true';
    const queryParams: any[] = [filters.limit, offset];
    let paramIndex = 3;

    if (filters.min_stake) {
      whereClause += ` AND total_stake >= $${paramIndex}`;
      queryParams.push(filters.min_stake);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) FROM services ${whereClause}`;
    const dataQuery = `
      SELECT s.*, 
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(r.id) as review_count
      FROM services s
      LEFT JOIN reviews r ON s.id = r.service_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    try {
      const [countResult, dataResult] = await Promise.all([
        pool.query(countQuery, queryParams.slice(2)),
        pool.query(dataQuery, queryParams)
      ]);

      return {
        services: dataResult.rows,
        total: parseInt(countResult.rows[0].count)
      };
    } catch (error) {
      logger.error('Failed to get services:', error);
      throw error;
    }
  }

  /**
   * Get service by ID
   */
  async getServiceById(id: string): Promise<Service | null> {
    const query = `
      SELECT s.*,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(r.id) as review_count
      FROM services s
      LEFT JOIN reviews r ON s.id = r.service_id
      WHERE s.id = $1
      GROUP BY s.id
    `;

    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get service:', error);
      throw error;
    }
  }

  /**
   * Create a review
   */
  async createReview(data: Review): Promise<Review> {
    const query = `
      INSERT INTO reviews (service_id, reviewer_address, rating, review_hash, tx_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      data.service_id,
      data.reviewer_address,
      data.rating,
      data.review_hash,
      data.tx_hash
    ];

    try {
      const result = await pool.query(query, values);
      logger.info(`Review created for service: ${data.service_id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create review:', error);
      throw error;
    }
  }

  /**
   * Get service reviews
   */
  async getServiceReviews(serviceId: string, page: number, limit: number): Promise<Review[]> {
    const offset = (page - 1) * limit;

    const query = `
      SELECT * FROM reviews 
      WHERE service_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await pool.query(query, [serviceId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get reviews:', error);
      throw error;
    }
  }

  /**
   * Update reputation score
   */
  async updateReputation(serviceId: string): Promise<void> {
    const query = `
      INSERT INTO reputation_scores (service_id, avg_rating, total_reviews, last_updated)
      VALUES ($1, 
        (SELECT AVG(rating) FROM reviews WHERE service_id = $1),
        (SELECT COUNT(*) FROM reviews WHERE service_id = $1),
        NOW()
      )
      ON CONFLICT (service_id) 
      DO UPDATE SET
        avg_rating = (SELECT AVG(rating) FROM reviews WHERE service_id = $1),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE service_id = $1),
        last_updated = NOW()
    `;

    try {
      await pool.query(query, [serviceId]);
      logger.info(`Reputation updated for service: ${serviceId}`);
    } catch (error) {
      logger.error('Failed to update reputation:', error);
      throw error;
    }
  }

  /**
   * Get reputation
   */
  async getReputation(serviceId: string): Promise<any> {
    const query = `
      SELECT * FROM reputation_scores WHERE service_id = $1
    `;

    try {
      const result = await pool.query(query, [serviceId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get reputation:', error);
      throw error;
    }
  }
}
