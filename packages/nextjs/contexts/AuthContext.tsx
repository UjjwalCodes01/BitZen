"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { auth, setTokens, clearTokens, getToken } from "@/lib/api";

interface AuthState {
  isAuthenticated: boolean;
  address: string | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (address: string, signFn: (typedData: Record<string, unknown>) => Promise<string[]>) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  address: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    address: null,
    isLoading: true,
  });

  // Check existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) {
        setState({ isAuthenticated: false, address: null, isLoading: false });
        return;
      }

      try {
        const user = await auth.me();
        setState({
          isAuthenticated: true,
          address: user.address,
          isLoading: false,
        });
      } catch {
        clearTokens();
        setState({ isAuthenticated: false, address: null, isLoading: false });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(
    async (
      address: string,
      signFn: (typedData: Record<string, unknown>) => Promise<string[]>
    ) => {
      // Step 1: Get SNIP-12 typed data from backend (contains nonce)
      const { typedData } = await auth.signMessage(address);

      // Step 2: Sign the typed data with wallet (wallet computes SNIP-12 hash internally)
      const signature = await signFn(typedData);

      // Step 3: Verify with backend (backend reconstructs typed data from stored nonce)
      const { token, refreshToken } = await auth.verify(address, signature);

      // Step 4: Store tokens
      setTokens(token, refreshToken);

      // Step 5: Update state
      setState({
        isAuthenticated: true,
        address,
        isLoading: false,
      });
    },
    []
  );

  const logout = useCallback(() => {
    clearTokens();
    setState({ isAuthenticated: false, address: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
