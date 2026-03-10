"use client";

import { useState, useEffect, useCallback } from "react";
import { account, type SessionKey } from "@/lib/api";

export function useSessions(agentAddress: string | undefined) {
  const [data, setData] = useState<SessionKey[]>([]);
  const [isLoading, setIsLoading] = useState(!!agentAddress);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!agentAddress) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const result = await account.getSessions(agentAddress);
      setData(Array.isArray(result) ? result : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load sessions";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [agentAddress]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { sessions: data, isLoading, error, refetch: fetch };
}
