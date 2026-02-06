/**
 * Custom Hook: useAgents
 * Interact with BitZen agent endpoints
 */

import { useState, useCallback } from "react";
import { backendApi } from "~~/services/api/backendApi";
import { useAccount } from "@starknet-react/core";

export const useAgents = () => {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Register a new agent
   */
  const registerAgent = useCallback(
    async (publicKey: string, zkProof: string, metadata?: any) => {
      if (!address) throw new Error("Wallet not connected");

      setIsLoading(true);
      setError(null);

      try {
        const result = await backendApi.registerAgent({
          address,
          publicKey,
          zkProof,
          metadata,
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
   * Get agent details
   */
  const getAgent = useCallback(async (agentAddress: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await backendApi.getAgent(agentAddress);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * List all agents
   */
  const listAgents = useCallback(
    async (params?: { page?: number; limit?: number; verified?: boolean }) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await backendApi.listAgents(params);
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
   * Revoke an agent
   */
  const revokeAgent = useCallback(async (agentAddress: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await backendApi.revokeAgent(agentAddress);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create session key
   */
  const createSessionKey = useCallback(
    async (
      agentAddress: string,
      data: {
        sessionPublicKey: string;
        expirationBlocks: number;
        permissions: string[];
        metadata?: any;
      },
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await backendApi.createSessionKey(agentAddress, data);
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
   * List sessions for an agent
   */
  const listSessions = useCallback(
    async (agentAddress: string, activeOnly = true) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await backendApi.listSessions(agentAddress, activeOnly);
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

  return {
    isLoading,
    error,
    registerAgent,
    getAgent,
    listAgents,
    revokeAgent,
    createSessionKey,
    listSessions,
  };
};
