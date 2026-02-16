"use client";

import type { NextPage } from "next";
import { useState, useEffect } from "react";
import { useAccount } from "@starknet-react/core";
import {
  KeyIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  ClockIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import { useAgentPlugins } from "~~/hooks/bitizen/useAgentPlugins";

interface SessionKey {
  id: string;
  address: string;
  created: string;
  expires: string;
  daysLeft: number;
  permissions: string[];
  actionsUsed: number;
  actionsLimit: number;
  status: "active" | "expiring" | "expired";
}

const Sessions: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { account } = useAgentPlugins();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionKey | null>(
    null,
  );
  const [sortBy, setSortBy] = useState<"created" | "expires">("created");

  // Form states
  const [expirationDays, setExpirationDays] = useState(7);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [dailyLimit, setDailyLimit] = useState("10");
  const [weeklyLimit, setWeeklyLimit] = useState("50");
  const [totalLimit, setTotalLimit] = useState("200");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Fetch sessions when connected
  const [sessions, setSessions] = useState<SessionKey[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!address) return;

      setLoading(true);
      try {
        const result = await account.listActiveSessions();
        if (result.success && result.data?.sessions) {
          const mappedSessions: SessionKey[] = result.data.sessions.map(
            (s: any) => ({
              id: s.sessionId,
              address: s.publicKey || s.sessionId,
              created: new Date(s.createdAt).toLocaleDateString(),
              expires: new Date(s.expiresAt).toLocaleDateString(),
              daysLeft: Math.max(
                0,
                Math.ceil((s.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)),
              ),
              permissions: s.permissions || [],
              actionsUsed: s.usage?.transactionCount || 0,
              actionsLimit: parseInt(s.spendingLimit?.daily || "100"),
              status: s.isExpired
                ? "expired"
                : s.expiresAt - Date.now() < 3 * 24 * 60 * 60 * 1000
                  ? "expiring"
                  : "active",
            }),
          );
          setSessions(mappedSessions);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [address, account]);

  const availablePermissions = [
    { id: "transfer", name: "Transfer Tokens", icon: CurrencyDollarIcon },
    { id: "swap", name: "Execute Swaps", icon: CurrencyDollarIcon },
    { id: "stake", name: "Stake Tokens", icon: ShieldCheckIcon },
    { id: "vote", name: "Vote on Proposals", icon: CheckCircleIcon },
  ];

  const togglePermission = (permId: string) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const handleCreateSession = async () => {
    if (!address) return;

    setCreating(true);
    try {
      // Call real Account plugin API
      const result = await account.createSessionKey(
        expirationDays * 480, // ~480 blocks per day
        selectedPermissions,
        {
          dailyLimit,
          transactionLimit: totalLimit,
        },
      );

      if (result.success && result.data) {
        const session = result.data;
        const newSession: SessionKey = {
          id: session.sessionId,
          address: session.publicKey,
          created: "Just now",
          expires: new Date(session.expiresAt).toLocaleDateString(),
          daysLeft: expirationDays,
          permissions: session.permissions,
          actionsUsed: 0,
          actionsLimit: Number(dailyLimit),
          status: "active",
        };
        setSessions([newSession, ...sessions]);
        alert(
          `Session key created!\nSession ID: ${session.sessionId}\nPublic Key: ${session.publicKey.substring(0, 16)}...`,
        );
      } else {
        alert("Failed to create session key. Please try again.");
      }
    } catch (error) {
      console.error("Failed to create session:", error);
      alert("Failed to create session key. Please try again.");
    } finally {
      setCreating(false);
      setShowCreateModal(false);
      setSelectedPermissions([]);
      setExpirationDays(7);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to revoke this session key?")) return;

    setRevoking(sessionId);
    try {
      // Call real Account plugin API
      const result = await account.revokeSessionKey(sessionId);

      if (result.success) {
        setSessions(sessions.filter((s) => s.id !== sessionId));
        alert(`Session key revoked: ${sessionId}`);
      } else {
        alert("Failed to revoke session key. Please try again.");
      }
    } catch (error) {
      console.error("Failed to revoke session:", error);
      alert("Failed to revoke session key. Please try again.");
    } finally {
      setRevoking(null);
    }
  };

  const sortedSessions = [...sessions].sort((a, b) => {
    if (sortBy === "created") {
      return b.id.localeCompare(a.id);
    } else {
      return a.daysLeft - b.daysLeft;
    }
  });

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">SESSION KEYS</h1>
            <p className="text-[var(--text-secondary)]">
              Manage autonomous agent operations with secure session keys
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!isConnected}
            className={`btn-primary inline-flex items-center gap-2 ${
              !isConnected ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <PlusIcon className="w-5 h-5" />
            Create Session Key
          </button>
        </div>

        {!isConnected ? (
          /* Not Connected State */
          <div className="card text-center py-16">
            <KeyIcon className="w-24 h-24 text-[var(--accent-purple)] mx-auto mb-6 opacity-50" />
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
              Connect your Starknet wallet to view and manage your session keys.
            </p>
          </div>
        ) : (
          <>
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              {/* Active Sessions Count */}
              <div className="card border-2 border-[var(--accent-purple)]/30">
                <h3 className="text-sm text-[var(--text-secondary)] mb-2">
                  ACTIVE SESSIONS
                </h3>
                <div className="text-3xl font-bold text-[var(--accent-purple)]">
                  {sessions.length}
                </div>
              </div>

              {/* Spending Limits */}
              <div className="card border-2 border-[var(--accent-orange)]/30">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm text-[var(--text-secondary)] mb-2">
                      SPENDING LIMITS
                    </h3>
                    <div className="text-lg font-bold text-[var(--accent-orange)]">
                      {dailyLimit} STRK / day
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLimitsModal(true)}
                    className="text-sm text-[var(--accent-purple)] hover:underline"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Total Actions */}
              <div className="card border-2 border-[var(--success)]/30">
                <h3 className="text-sm text-[var(--text-secondary)] mb-2">
                  TOTAL ACTIONS
                </h3>
                <div className="text-3xl font-bold text-[var(--success)]">
                  {sessions.reduce((sum, s) => sum + s.actionsUsed, 0)}
                </div>
              </div>
            </div>

            {/* Session Keys Table */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">YOUR SESSION KEYS</h2>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "created" | "expires")
                  }
                  className="px-4 py-2 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--accent-purple)] transition-colors text-[var(--text-primary)] cursor-pointer"
                >
                  <option value="created">Sort by Created</option>
                  <option value="expires">Sort by Expiration</option>
                </select>
              </div>

              {sortedSessions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border-color)]">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text-secondary)]">
                          SESSION ID
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text-secondary)]">
                          CREATED
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text-secondary)]">
                          EXPIRES
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text-secondary)]">
                          PERMISSIONS
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text-secondary)]">
                          ACTIONS
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text-secondary)]">
                          STATUS
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text-secondary)]">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSessions.map((session) => (
                        <tr
                          key={session.id}
                          className="border-b border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <KeyIcon className="w-4 h-4 text-[var(--accent-purple)]" />
                              <span className="font-mono text-sm">
                                {session.id}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm">
                            {session.created}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2 text-sm">
                              <ClockIcon className="w-4 h-4 text-[var(--text-muted)]" />
                              <span>{session.daysLeft} days</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1">
                              {session.permissions.map((perm) => (
                                <span
                                  key={perm}
                                  className="badge badge-purple text-xs"
                                >
                                  {perm}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-[var(--bg-dark)] rounded-full h-2">
                                <div
                                  className="bg-[var(--accent-purple)] h-2 rounded-full"
                                  style={{
                                    width: `${(session.actionsUsed / session.actionsLimit) * 100}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                                {session.actionsUsed}/{session.actionsLimit}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`badge text-xs ${
                                session.status === "active"
                                  ? "badge-success agent-live"
                                  : session.status === "expiring"
                                    ? "badge-orange"
                                    : "bg-[var(--text-muted)]/20 text-[var(--text-muted)]"
                              }`}
                            >
                              {session.status}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedSession(session);
                                  setShowDetailsModal(true);
                                }}
                                className="p-2 rounded-lg hover:bg-[var(--bg-dark)] transition-colors"
                                title="View Details"
                              >
                                <EyeIcon className="w-5 h-5 text-[var(--accent-purple)]" />
                              </button>
                              <button
                                onClick={() => handleRevokeSession(session.id)}
                                className="p-2 rounded-lg hover:bg-[var(--error)]/10 transition-colors"
                                title="Revoke Session"
                              >
                                <TrashIcon className="w-5 h-5 text-[var(--error)]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Empty State */
                <div className="text-center py-16">
                  <KeyIcon className="w-24 h-24 text-[var(--text-muted)] mx-auto mb-6 opacity-50" />
                  <h3 className="text-2xl font-bold mb-4">No Session Keys</h3>
                  <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
                    Create your first session key to enable autonomous agent
                    operations.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary"
                  >
                    Create Session Key
                  </button>
                </div>
              )}
            </div>

            {/* Session Keys Explanation */}
            <div className="card mt-8">
              <h3 className="text-2xl font-bold mb-4">
                What are Session Keys?
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="w-12 h-12 rounded-full gradient-purple flex items-center justify-center mb-3">
                    <KeyIcon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold mb-2">Autonomous Operations</h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Allow your agent to perform actions without requiring manual
                    signatures each time.
                  </p>
                </div>

                <div>
                  <div className="w-12 h-12 rounded-full gradient-orange flex items-center justify-center mb-3">
                    <ShieldCheckIcon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold mb-2">Security First</h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Set permissions, spending limits, and expiration dates to
                    maintain full control.
                  </p>
                </div>

                <div>
                  <div className="w-12 h-12 rounded-full bg-[var(--success)] flex items-center justify-center mb-3">
                    <ClockIcon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold mb-2">Time-Limited</h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Sessions automatically expire after your chosen duration
                    (1-30 days).
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Create Session Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="card max-w-2xl w-full p-8 my-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Create Session Key</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Expiration Slider */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Expiration: {expirationDays} days
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={expirationDays}
                    onChange={(e) => setExpirationDays(Number(e.target.value))}
                    className="w-full h-2 bg-[var(--bg-dark)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-purple)]"
                  />
                  <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                    <span>1 day</span>
                    <span>30 days</span>
                  </div>
                </div>

                {/* Permissions Checkboxes */}
                <div>
                  <label className="block text-sm font-semibold mb-3">
                    Permissions
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {availablePermissions.map((perm) => {
                      const IconComponent = perm.icon;
                      return (
                        <label
                          key={perm.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedPermissions.includes(perm.id)
                              ? "bg-[var(--accent-purple)]/10 border-[var(--accent-purple)]"
                              : "bg-[var(--bg-hover)] border-[var(--border-color)] hover:border-[var(--accent-purple)]/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                            className="w-5 h-5 rounded cursor-pointer accent-[var(--accent-purple)]"
                          />
                          <IconComponent className="w-5 h-5 text-[var(--accent-purple)]" />
                          <span className="text-sm font-semibold">
                            {perm.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Spending Limits */}
                <div>
                  <label className="block text-sm font-semibold mb-3">
                    Spending Limits (STRK)
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">
                        Daily
                      </label>
                      <input
                        type="number"
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--accent-purple)] transition-colors text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">
                        Weekly
                      </label>
                      <input
                        type="number"
                        value={weeklyLimit}
                        onChange={(e) => setWeeklyLimit(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--accent-purple)] transition-colors text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">
                        Total
                      </label>
                      <input
                        type="number"
                        value={totalLimit}
                        onChange={(e) => setTotalLimit(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--accent-purple)] transition-colors text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={selectedPermissions.length === 0}
                  className={`btn-primary flex-1 ${
                    selectedPermissions.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  Create Session
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session Details Modal */}
        {showDetailsModal && selectedSession && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="card max-w-2xl w-full p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Session Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-[var(--border-color)]">
                  <span className="text-[var(--text-secondary)]">
                    Session ID:
                  </span>
                  <span className="font-mono">{selectedSession.id}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-[var(--border-color)]">
                  <span className="text-[var(--text-secondary)]">Address:</span>
                  <span className="font-mono text-sm">
                    {selectedSession.address.slice(0, 20)}...
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-[var(--border-color)]">
                  <span className="text-[var(--text-secondary)]">Created:</span>
                  <span>{selectedSession.created}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-[var(--border-color)]">
                  <span className="text-[var(--text-secondary)]">Expires:</span>
                  <span>{selectedSession.expires}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-[var(--border-color)]">
                  <span className="text-[var(--text-secondary)]">
                    Permissions:
                  </span>
                  <div className="flex gap-2">
                    {selectedSession.permissions.map((perm) => (
                      <span key={perm} className="badge badge-purple text-xs">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-[var(--text-secondary)]">
                    Actions Used:
                  </span>
                  <span className="font-bold">
                    {selectedSession.actionsUsed} /{" "}
                    {selectedSession.actionsLimit}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowDetailsModal(false)}
                className="btn-outline w-full mt-8"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Update Limits Modal */}
        {showLimitsModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="card max-w-md w-full p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Update Spending Limits</h3>
                <button
                  onClick={() => setShowLimitsModal(false)}
                  className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Daily Limit (STRK)
                  </label>
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--accent-purple)] transition-colors text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Weekly Limit (STRK)
                  </label>
                  <input
                    type="number"
                    value={weeklyLimit}
                    onChange={(e) => setWeeklyLimit(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--accent-purple)] transition-colors text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Total Limit (STRK)
                  </label>
                  <input
                    type="number"
                    value={totalLimit}
                    onChange={(e) => setTotalLimit(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--accent-purple)] transition-colors text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setShowLimitsModal(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowLimitsModal(false)}
                  className="btn-primary flex-1"
                >
                  Update Limits
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sessions;
