"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "@starknet-react/core";
import { useAuth } from "@/contexts/AuthContext";
import { account as accountApi, type SessionKey } from "@/lib/api";
import { Address } from "@/components/ui/Address";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { CardSkeleton } from "@/components/ui/Skeleton";
import {
  Key,
  Plus,
  Trash2,
  Loader2,
  Clock,
  Shield,
  Coins,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SessionsPage() {
  const { address, isConnected } = useAccount();
  const { isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState<SessionKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    duration: "24",
    spendingLimit: "100",
    allowedMethods: "",
  });

  const fetchSessions = useCallback(async () => {
    if (!address) return;
    try {
      setIsLoading(true);
      setError(null);
      const result = await accountApi.getSessions(address);
      setSessions(Array.isArray(result) ? result : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load sessions";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address && isAuthenticated) fetchSessions();
  }, [address, isAuthenticated, fetchSessions]);

  const handleCreate = async () => {
    if (!address) return;
    try {
      setCreating(true);
      const methods = form.allowedMethods
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);

      // Convert hours to approximate Starknet blocks (1 block ≈ 3 min)
      const hours = parseInt(form.duration) || 24;
      const expirationBlocks = Math.ceil(hours * 20);

      await accountApi.createSession({
        agentAddress: address,
        expirationBlocks,
        permissions: methods.length > 0 ? methods : undefined,
        metadata: form.spendingLimit
          ? { dailyLimit: form.spendingLimit, transactionLimit: form.spendingLimit }
          : undefined,
      });
      toast.success("Session key created!");
      setCreateModal(false);
      setForm({ duration: "24", spendingLimit: "100", allowedMethods: "" });
      fetchSessions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      await accountApi.revokeSession(sessionId);
      toast.success("Session key revoked");
      fetchSessions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  const isExpired = (expiresAt?: number) => {
    if (!expiresAt) return false;
    // expiresAt is epoch milliseconds from backend
    return expiresAt < Date.now();
  };

  return (
    <div className="section py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Key className="w-8 h-8 text-primary-400" />
            Session Keys
          </h1>
          <p className="page-subtitle">
            Manage delegated session keys for autonomous agent operations
          </p>
        </div>
        {isConnected && isAuthenticated && (
          <button onClick={() => setCreateModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Create Session
          </button>
        )}
      </div>

      {/* Not Connected State */}
      {!isConnected ? (
        <div className="card p-12 text-center">
          <Key className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-300 mb-2">Connect Your Wallet</h2>
          <p className="text-sm text-zinc-500">
            Connect and authenticate your wallet to manage session keys.
          </p>
        </div>
      ) : !isAuthenticated ? (
        <div className="card p-12 text-center">
          <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-300 mb-2">Authentication Required</h2>
          <p className="text-sm text-zinc-500">
            Click &quot;Authenticate&quot; in the wallet menu to access session key features.
          </p>
        </div>
      ) : (
        <>
          {/* Info Banner */}
          <div className="card p-4 mb-6 border-primary-500/20 bg-primary-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-zinc-300">
                  Session keys allow agents to execute transactions autonomously within defined
                  spending limits and method restrictions. Keys are encrypted at rest and can be
                  revoked at any time.
                </p>
              </div>
            </div>
          </div>

          {/* Sessions List */}
          {isLoading ? (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={fetchSessions} />
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={<Key className="w-8 h-8" />}
              title="No session keys"
              description="Create a session key to enable autonomous agent operations with spending controls."
              action={
                <button onClick={() => setCreateModal(true)} className="btn-primary btn-sm">
                  <Plus className="w-4 h-4" />
                  Create Session
                </button>
              }
            />
          ) : (
            <div className="grid gap-4">
              {sessions.map((session) => {
                const expired = isExpired(session.expiresAt);
                const isActive = session.status === "active" && !expired;
                return (
                  <div
                    key={session.sessionId}
                    className={cn(
                      "card p-5",
                      !isActive && "opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <Key className={cn("w-5 h-5", isActive ? "text-primary-400" : "text-zinc-600")} />
                          <span className="text-sm font-semibold text-white font-mono">
                            {session.publicKey?.slice(0, 10)}...{session.publicKey?.slice(-6)}
                          </span>
                          <StatusBadge
                            label={expired ? "expired" : session.status || "active"}
                            variant={isActive ? "success" : expired ? "error" : "neutral"}
                            pulse={isActive}
                          />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-zinc-500">
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3 h-3" />
                            <span>Agent:</span>
                            <Address
                              address={session.agentAddress}
                              chars={3}
                              showCopy={false}
                              showExplorer={false}
                              className="text-xs"
                            />
                          </div>
                          {session.spendingLimit && (
                            <div className="flex items-center gap-1.5">
                              <Coins className="w-3 h-3" />
                              <span>{session.spendingLimit.daily} {session.spendingLimit.currency || "STRK"} limit</span>
                            </div>
                          )}
                          {session.expiresAt && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              <span>
                                {expired
                                  ? `Expired ${timeAgo(new Date(session.expiresAt).toISOString())}`
                                  : `Expires ${timeAgo(new Date(session.expiresAt).toISOString())}`}
                              </span>
                            </div>
                          )}
                          {session.permissions && session.permissions.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span>{session.permissions.length} methods allowed</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {isActive && (
                        <button
                          onClick={() => handleRevoke(session.sessionId)}
                          disabled={revokingId === session.sessionId}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          {revokingId === session.sessionId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Refresh */}
          {sessions.length > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={fetchSessions}
                className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Session Key">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Duration (hours)
              </label>
              <input
                type="number"
                min="1"
                max="720"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="input"
                placeholder="24"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Spending Limit (STRK)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.spendingLimit}
                onChange={(e) => setForm({ ...form, spendingLimit: e.target.value })}
                className="input"
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Allowed Methods (comma-separated, optional)
              </label>
              <input
                type="text"
                value={form.allowedMethods}
                onChange={(e) => setForm({ ...form, allowedMethods: e.target.value })}
                className="input"
                placeholder="transfer, approve, swap"
              />
              <p className="text-xs text-zinc-600 mt-1">
                Leave empty to allow all methods within spending limits
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCreateModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="btn-primary flex-1"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </Modal>
    </div>
  );
}
