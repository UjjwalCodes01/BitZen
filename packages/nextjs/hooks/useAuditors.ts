"use client";

import { useState, useEffect, useCallback } from "react";
import { auditors, type Stake } from "@/lib/api";

export function useStakes(address: string | undefined) {
  const [data, setData] = useState<Stake[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!address) return;
    try {
      setIsLoading(true);
      setError(null);
      const result = await auditors.getStakes(address);
      setData(Array.isArray(result) ? result : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load stakes";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { stakes: data, isLoading, error, refetch: fetch };
}

export function useServiceAuditors(serviceId: string | undefined) {
  const [data, setData] = useState<Stake[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!serviceId) return;
    try {
      setIsLoading(true);
      setError(null);
      const result = await auditors.getServiceAuditors(serviceId);
      setData(Array.isArray(result) ? result : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load auditors";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { auditors: data, isLoading, error, refetch: fetch };
}
