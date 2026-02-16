/**
 * Custom Hook: useAgentPlugins
 * Integration with AI agent plugins (Bitcoin, ZKProof, Account)
 */

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "@starknet-react/core";
import { pluginService } from "~~/services/api/pluginService";
import type { ActionResult } from "~~/services/api/pluginTypes";

export const useAgentPlugins = () => {
  const { address } = useAccount();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize plugin context when address changes
  useEffect(() => {
    if (address) {
      pluginService.initializeContext(
        address,
        process.env.NEXT_PUBLIC_STARKNET_NETWORK || "sepolia",
      );
      setIsInitialized(true);
    } else {
      setIsInitialized(false);
    }
  }, [address]);

  // ==================== BITCOIN PLUGIN ====================

  const getBitcoinQuote = useCallback(
    async (
      fromCurrency: "BTC" | "STRK",
      toCurrency: "BTC" | "STRK",
      amount: string,
    ) => {
      return pluginService.getBitcoinSwapQuote({
        fromCurrency,
        toCurrency,
        amount,
      });
    },
    [],
  );

  const executeBitcoinSwap = useCallback(
    async (
      fromCurrency: "BTC" | "STRK",
      toCurrency: "BTC" | "STRK",
      amount: string,
      destinationAddress: string,
    ) => {
      return pluginService.executeBitcoinSwap({
        fromCurrency,
        toCurrency,
        amount,
        destinationAddress,
      });
    },
    [],
  );

  const getBitcoinSwapStatus = useCallback(async (swapId: string) => {
    return pluginService.getBitcoinSwapStatus(swapId);
  }, []);

  const getBitcoinBalance = useCallback(async (btcAddress: string) => {
    return pluginService.getBitcoinBalance(btcAddress);
  }, []);

  const getExchangeRates = useCallback(async () => {
    return pluginService.getExchangeRates();
  }, []);

  // ==================== ZKPROOF PLUGIN ====================

  const generateZKProof = useCallback(
    async (publicKey: string, metadata?: any) => {
      if (!address) throw new Error("Wallet not connected");
      return pluginService.generateZKProof({
        agentAddress: address,
        publicKey,
        metadata,
      });
    },
    [address],
  );

  const verifyZKProof = useCallback(async (proof: string) => {
    return pluginService.verifyZKProof(proof);
  }, []);

  const getZKProofStatus = useCallback(async (proofId: string) => {
    return pluginService.getZKProofStatus(proofId);
  }, []);

  // ==================== ACCOUNT PLUGIN ====================

  const createSessionKey = useCallback(
    async (expirationBlocks: number, permissions: string[], metadata?: any) => {
      return pluginService.createSessionKey({
        expirationBlocks,
        permissions,
        metadata,
      });
    },
    [],
  );

  const revokeSessionKey = useCallback(async (sessionId: string) => {
    return pluginService.revokeSessionKey(sessionId);
  }, []);

  const listActiveSessions = useCallback(async () => {
    return pluginService.listActiveSessions();
  }, []);

  const executeTask = useCallback(
    async (sessionId: string, taskType: string, parameters: any) => {
      return pluginService.executeTask({
        sessionId,
        taskType,
        parameters,
      });
    },
    [],
  );

  const setSpendingLimits = useCallback(
    async (dailyLimit: string, transactionLimit: string) => {
      return pluginService.setSpendingLimits({
        dailyLimit,
        transactionLimit,
      });
    },
    [],
  );

  return {
    isInitialized,
    isEnabled: pluginService.isEnabled(),

    // Bitcoin Plugin
    bitcoin: {
      getQuote: getBitcoinQuote,
      executeSwap: executeBitcoinSwap,
      getSwapStatus: getBitcoinSwapStatus,
      getBalance: getBitcoinBalance,
      getExchangeRates,
    },

    // ZKProof Plugin
    zkproof: {
      generate: generateZKProof,
      verify: verifyZKProof,
      getStatus: getZKProofStatus,
    },

    // Account Plugin
    account: {
      createSessionKey,
      revokeSessionKey,
      listActiveSessions,
      executeTask,
      setSpendingLimits,
    },
  };
};
