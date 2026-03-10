"use client";

import { useState, useEffect, useCallback } from "react";
import { services, type Service, type Review, type Reputation } from "@/lib/api";

export function useServices() {
  const [data, setData] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await services.list();
      setData(Array.isArray(result) ? result : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load services";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { services: data, isLoading, error, refetch: fetch };
}

export function useService(id: string | undefined) {
  const [data, setData] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const result = await services.get(id);
      setData(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load service";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { service: data, isLoading, error, refetch: fetch };
}

export function useReviews(serviceId: string | undefined) {
  const [data, setData] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(!!serviceId);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!serviceId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const result = await services.getReviews(serviceId);
      setData(Array.isArray(result) ? result : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load reviews";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { reviews: data, isLoading, error, refetch: fetch };
}

export function useReputation(serviceId: string | undefined) {
  const [data, setData] = useState<Reputation | null>(null);
  const [isLoading, setIsLoading] = useState(!!serviceId);

  const fetch = useCallback(async () => {
    if (!serviceId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const result = await services.getReputation(serviceId);
      setData(result);
    } catch {
      // Reputation may not exist yet
    } finally {
      setIsLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { reputation: data, isLoading, refetch: fetch };
}
