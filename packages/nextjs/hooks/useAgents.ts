"use client";

import { useState, useEffect, useCallback } from "react";
import { agents, type Agent } from "@/lib/api";

export function useAgents() {
  const [data, setData] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await agents.list();
      setData(Array.isArray(result) ? result : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load agents";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { agents: data, isLoading, error, refetch: fetch };
}

export function useAgent(address: string | undefined) {
  const [data, setData] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!address) return;
    try {
      setIsLoading(true);
      setError(null);
      const result = await agents.get(address);
      setData(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load agent";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { agent: data, isLoading, error, refetch: fetch };
}
