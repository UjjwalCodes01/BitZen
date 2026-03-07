"use client";

import { useState, useEffect, useCallback } from "react";
import { bitcoin, type ExchangeRates } from "@/lib/api";

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await bitcoin.getRates();
      setRates(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load rates";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    // Refresh every 30s
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { rates, isLoading, error, refetch: fetch };
}
