/**
 * Custom Hook: useBackendAuth
 * Handles wallet signature authentication with backend
 */

import { useState, useCallback, useEffect } from "react";
import { useAccount } from "@starknet-react/core";
import { backendApi } from "~~/services/api/backendApi";
import { TypedData } from "starknet";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user: any | null;
}

export const useBackendAuth = () => {
  const { address, account } = useAccount();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    user: null,
  });

  // Check if already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("bitizen_auth_token");
      if (token && address) {
        try {
          const user = await backendApi.getCurrentUser();
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            user,
          });
        } catch (error) {
          // Token expired or invalid
          backendApi.clearAuthToken();
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            error: null,
            user: null,
          });
        }
      }
    };

    checkAuth();
  }, [address]);

  /**
   * Sign message and authenticate with backend
   */
  const login = useCallback(async () => {
    if (!account || !address) {
      setAuthState((prev) => ({
        ...prev,
        error: "Wallet not connected",
      }));
      return false;
    }

    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Step 1: Get message to sign from backend
      const { message, nonce } = await backendApi.getSignMessage(address);

      // Step 2: Sign the message with wallet
      const signature = await account.signMessage({
        domain: {
          name: "BitZen",
          version: "1",
          chainId: "SN_SEPOLIA",
        },
        types: {
          Message: [
            { name: "message", type: "felt" },
            { name: "nonce", type: "felt" },
          ],
        },
        primaryType: "Message",
        message: {
          message,
          nonce,
        },
      } as TypedData);

      // Step 3: Verify signature and get JWT
      const { token, user } = await backendApi.verifySignature({
        address,
        signature: signature as string[],
        message,
      });

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        user,
      });

      return true;
    } catch (error: any) {
      console.error("Authentication error:", error);
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Authentication failed",
      }));
      return false;
    }
  }, [account, address]);

  /**
   * Logout and clear auth token
   */
  const logout = useCallback(() => {
    backendApi.clearAuthToken();
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      user: null,
    });
  }, []);

  return {
    ...authState,
    login,
    logout,
    address,
  };
};
