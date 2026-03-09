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
  login: (address: string, signFn: (message: string) => Promise<string[]>) => Promise<void>;
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
      signFn: (message: string) => Promise<string[]>
    ) => {
      // Step 1: Get message to sign from backend
      const { message } = await auth.signMessage(address);

      // Step 2: Sign the message with wallet
      const signature = await signFn(message);

      // Step 3: Verify with backend & get tokens
      const { token, refreshToken } = await auth.verify(
        address,
        message,
        signature
      );

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
