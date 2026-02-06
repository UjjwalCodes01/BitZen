/**
 * Custom Hook: useServices
 * Interact with BitZen service marketplace
 */

import { useState, useCallback } from "react";
import { backendApi } from "~~/services/api/backendApi";
import { useAccount } from "@starknet-react/core";

export const useServices = () => {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Register a new service
   */
  const registerService = useCallback(
    async (data: {
      name: string;
      category: string;
      description: string;
      endpoint: string;
      minStake: string;
      metadata?: any;
    }) => {
      if (!address) throw new Error("Wallet not connected");

      setIsLoading(true);
      setError(null);

      try {
        const result = await backendApi.registerService({
          ...data,
          agentAddress: address,
        });
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address],
  );

  /**
   * List services
   */
  const listServices = useCallback(
    async (params?: {
      category?: string;
      minStake?: string;
      page?: number;
      limit?: number;
    }) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await backendApi.listServices(params);
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /**
   * Get service details
   */
  const getService = useCallback(async (serviceId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await backendApi.getService(serviceId);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Submit a review
   */
  const submitReview = useCallback(
    async (serviceId: string, rating: number, comment: string) => {
      if (!address) throw new Error("Wallet not connected");

      setIsLoading(true);
      setError(null);

      try {
        const result = await backendApi.submitReview(serviceId, {
          rating,
          comment,
          reviewerAddress: address,
        });
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address],
  );

  /**
   * Get service reviews
   */
  const getReviews = useCallback(async (serviceId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await backendApi.getReviews(serviceId);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get service reputation
   */
  const getReputation = useCallback(async (serviceId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await backendApi.getReputation(serviceId);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    registerService,
    listServices,
    getService,
    submitReview,
    getReviews,
    getReputation,
  };
};
