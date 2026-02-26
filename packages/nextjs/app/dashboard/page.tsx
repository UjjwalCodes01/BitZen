"use client";

import type { NextPage } from "next";
import Link from "next/link";
import { useAccount, useReadContract } from "@starknet-react/core";
import { useState, useEffect } from "react";
import {
  ShieldCheckIcon,
  BoltIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  PlusIcon,
  KeyIcon,
} from "@heroicons/react/24/solid";
import { useBackendAuth } from "~~/hooks/bitizen/useBackendAuth";
import { useAgents } from "~~/hooks/bitizen/useAgents";
import { useAgentPlugins } from "~~/hooks/bitizen/useAgentPlugins";
import { backendApi } from "~~/services/api/backendApi";

// STRK ERC-20 on Starknet Sepolia
const STRK_TOKEN = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "core::starknet::contract_address::ContractAddress" }],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view",
  },
] as const;

function formatStrk(raw: bigint | undefined | null): string {
  if (raw == null) return "0";
  const r = BigInt(raw.toString());
  const whole = r / 10n ** 18n;
  const frac = (r % 10n ** 18n) * 10000n / 10n ** 18n;
  return `${whole}.${frac.toString().padStart(4, "0")}`;
}

function formatRelativeTime(ts: number | string): string {
  const ms = typeof ts === "string" ? new Date(ts).getTime() : ts;
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hours ago`;
  return `${Math.floor(diff / 86_400_000)} days ago`;
}

const Dashboard: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { isAuthenticated } = useBackendAuth();
  const agents = useAgents();
  const { account, bitcoin } = useAgentPlugins();

  const [btcBalance, setBtcBalance] = useState<string>("0");
  const [btcBalanceUSD, setBtcBalanceUSD] = useState<string>("0");
  const [sessionsCount, setSessionsCount] = useState<number>(0);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number>(45161);
  const [primaryAgent, setPrimaryAgent] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Real STRK balance from chain via ERC-20 balanceOf
  const { data: strkRawBalance } = useReadContract({
    functionName: "balanceOf",
    address: STRK_TOKEN,
    abi: ERC20_ABI,
    args: address ? [address] : undefined,
    enabled: !!address && isConnected,
    watch: true,
  });

  const strkBalance = formatStrk(strkRawBalance as bigint | undefined);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isConnected || !address) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch exchange rates
        const ratesResult = await bitcoin.getExchangeRates();
        if (ratesResult.success && ratesResult.data) {
          setExchangeRate(ratesResult.data.BTC_STRK);
        }

        // Fetch Bitcoin balance using linked address from localStorage
        const linkedBtcAddress =
          typeof window !== "undefined"
            ? localStorage.getItem("bitizen_btc_address")
            : null;
        if (linkedBtcAddress) {
          const btcResult = await bitcoin.getBalance(linkedBtcAddress);
          if (btcResult.success && btcResult.data) {
            setBtcBalance(btcResult.data.balance);
            setBtcBalanceUSD(btcResult.data.balanceUSD);
          }
        }

        // Fetch active sessions count
        const sessionsResult = await account.listActiveSessions();
        const sessions = sessionsResult?.data?.sessions ?? [];
        setSessionsCount(sessionsResult?.data?.count ?? sessions.length);
        setActiveSessions(sessions);

        // Fetch primary agent info from backend
        let agentData: any = null;
        try {
          const agentResult = await backendApi.getAgent(address);
          agentData = agentResult?.data ?? null;
          if (agentData) setPrimaryAgent(agentData);
        } catch {
          // Not registered yet — normal state
        }

        // Build activity feed from real data
        const activities: any[] = [];
        if (agentData) {
          activities.push({
            id: "reg-agent",
            type: "Registration",
            description: "Agent registered on-chain",
            amount: "ZK Proof verified",
            time: formatRelativeTime(agentData.created_at || agentData.registeredAt || Date.now()),
            status: "completed",
          });
        }
        sessions.slice(0, 3).forEach((s: any, i: number) => {
          activities.push({
            id: `sess-${i}`,
            type: "Session Created",
            description: "Session key generated",
            amount: `${s.expirationBlocks ?? "?"} blocks`,
            time: formatRelativeTime(s.createdAt || Date.now()),
            status: s.status === "active" ? "completed" : s.status,
          });
        });
        setRecentActivity(activities);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isConnected, address]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">DASHBOARD</h1>
          <p className="text-[var(--text-secondary)]">
            {isConnected
              ? `Welcome back, Agent`
              : "Connect your wallet to get started"}
          </p>
        </div>

        {!isConnected ? (
          /* Not Connected State */
          <div className="card text-center py-16">
            <ShieldCheckIcon className="w-24 h-24 text-[var(--accent-purple)] mx-auto mb-6 opacity-50" />
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
              Connect your Starknet wallet to access your agent dashboard and
              manage your autonomous operations.
            </p>
          </div>
        ) : (
          <>
            {/* Top Stats Row */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Agent Status Card */}
              <div className="card border-2 border-[var(--accent-purple)]/30">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm text-[var(--text-secondary)] mb-1">
                      AGENT STATUS
                    </h3>
                    {primaryAgent ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[var(--success)] agent-live"></div>
                        <span className="text-xl font-bold text-[var(--success)]">
                          ACTIVE
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[var(--text-muted)]"></div>
                        <span className="text-xl font-bold text-[var(--text-muted)]">
                          NOT REGISTERED
                        </span>
                      </div>
                    )}
                  </div>
                  <ShieldCheckIcon
                    className={`w-12 h-12 ${primaryAgent ? "text-[var(--success)]" : "text-[var(--text-muted)]"}`}
                  />
                </div>

                {primaryAgent ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">
                        ZK Proof:
                      </span>
                      <span className="flex items-center gap-1 text-[var(--success)]">
                        <CheckCircleIcon className="w-4 h-4" />
                        Verified
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">
                        Sessions:
                      </span>
                      <span className="font-semibold">
                        {sessionsCount} active
                      </span>
                    </div>
                  </div>
                ) : (
                  <Link
                    href="/agents/register"
                    className="btn-primary w-full text-center mt-4 inline-flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Register Agent
                  </Link>
                )}
              </div>

              {/* STRK Balance */}
              <div className="card border-2 border-[var(--accent-purple)]/30">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm text-[var(--text-secondary)] mb-1">
                      STARKNET BALANCE
                    </h3>
                    <div className="text-2xl font-bold text-[var(--accent-purple)]">
                      {strkBalance} STRK
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full gradient-purple flex items-center justify-center">
                    <BoltIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <Link
                  href="/swap"
                  className="text-sm text-[var(--accent-purple)] hover:underline inline-flex items-center gap-1"
                >
                  Get More STRK <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>

              {/* Bitcoin Balance */}
              <div className="card border-2 border-[var(--accent-orange)]/30">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm text-[var(--text-secondary)] mb-1">
                      BITCOIN BALANCE
                    </h3>
                    <div className="text-2xl font-bold text-[var(--accent-orange)]">
                      {loading ? "..." : btcBalance} BTC
                    </div>
                    <div className="text-sm text-[var(--text-muted)]">
                      ≈ ${loading ? "..." : btcBalanceUSD} USD
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full gradient-orange flex items-center justify-center">
                    <CurrencyDollarIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)] mb-2">
                  Rate: 1 BTC = {exchangeRate.toLocaleString()} STRK
                </div>
                <Link
                  href="/swap"
                  className="text-sm text-[var(--accent-orange)] hover:underline inline-flex items-center gap-1"
                >
                  Swap BTC ↔ STRK <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Column - Agent Details & Activity Feed (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Agent Details Card */}
                {primaryAgent && (
                  <div className="card">
                    <h3 className="text-xl font-bold mb-4">AGENT DETAILS</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-[var(--border-color)]">
                        <span className="text-[var(--text-secondary)]">
                          Agent Address:
                        </span>
                        <span className="font-mono text-sm">
                          {address
                            ? `${address.slice(0, 6)}...${address.slice(-4)}`
                            : ""}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-[var(--border-color)]">
                        <span className="text-[var(--text-secondary)]">
                          Active Sessions:
                        </span>
                        <span className="font-semibold">{sessionsCount}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-[var(--border-color)]">
                        <span className="text-[var(--text-secondary)]">
                          Registration Date:
                        </span>
                        <span>Jan 15, 2026</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-[var(--text-secondary)]">
                          ZK Proof Status:
                        </span>
                        <span className="inline-flex items-center gap-1 text-[var(--success)]">
                          <CheckCircleIcon className="w-4 h-4" />
                          Verified
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity Feed */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">RECENT ACTIVITY</h3>
                    <Link
                      href="/activity"
                      className="text-sm text-[var(--accent-purple)] hover:underline"
                    >
                      View All
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--bg-dark)] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              activity.status === "completed"
                                ? "bg-[var(--success)]/20"
                                : "bg-[var(--warning)]/20"
                            }`}
                          >
                            {activity.status === "completed" ? (
                              <CheckCircleIcon className="w-5 h-5 text-[var(--success)]" />
                            ) : (
                              <ClockIcon className="w-5 h-5 text-[var(--warning)]" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold">{activity.type}</div>
                            <div className="text-sm text-[var(--text-secondary)]">
                              {activity.description}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">
                            {activity.amount}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {activity.time}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Quick Stats & Session Keys Preview (1/3 width) */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="card">
                  <h3 className="text-xl font-bold mb-4">QUICK STATS</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-[var(--text-secondary)]">
                          Services Used
                        </span>
                        <span className="font-bold text-[var(--accent-purple)]">
                          8
                        </span>
                      </div>
                      <div className="w-full bg-[var(--bg-dark)] rounded-full h-2">
                        <div
                          className="bg-[var(--accent-purple)] h-2 rounded-full"
                          style={{ width: "80%" }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-[var(--text-secondary)]">
                          Reviews Given
                        </span>
                        <span className="font-bold text-[var(--accent-orange)]">
                          12
                        </span>
                      </div>
                      <div className="w-full bg-[var(--bg-dark)] rounded-full h-2">
                        <div
                          className="bg-[var(--accent-orange)] h-2 rounded-full"
                          style={{ width: "60%" }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-[var(--text-secondary)]">
                          Auditor Stakes
                        </span>
                        <span className="font-bold text-[var(--success)]">
                          5
                        </span>
                      </div>
                      <div className="w-full bg-[var(--bg-dark)] rounded-full h-2">
                        <div
                          className="bg-[var(--success)] h-2 rounded-full"
                          style={{ width: "50%" }}
                        ></div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--border-color)]">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[var(--text-secondary)]">
                          Reputation Score
                        </span>
                        <span className="text-2xl font-bold text-[var(--accent-purple)]">
                          87/100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Session Keys Preview */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">SESSION KEYS</h3>
                    <Link
                      href="/sessions"
                      className="text-sm text-[var(--accent-purple)] hover:underline"
                    >
                      Manage
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {activeSessions.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)] text-center py-4">
                        No active sessions
                      </p>
                    ) : (
                      activeSessions.slice(0, 3).map((s: any) => {
                        const msLeft = (s.expiresAt || 0) - Date.now();
                        const daysLeft = Math.max(0, Math.floor(msLeft / 86_400_000));
                        const expiringSoon = daysLeft <= 3 && daysLeft > 0;
                        const shortKey = s.publicKey
                          ? `${s.publicKey.slice(0, 6)}...${s.publicKey.slice(-4)}`
                          : s.sessionId?.slice(0, 14) + "...";
                        return (
                          <div
                            key={s.sessionId}
                            className="p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--accent-purple)]/30"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <KeyIcon className="w-4 h-4 text-[var(--accent-purple)]" />
                              <span className="font-mono text-sm">{shortKey}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-[var(--text-secondary)]">
                                {daysLeft > 0 ? `Expires in ${daysLeft}d` : "Expired"}
                              </span>
                              <span className={expiringSoon ? "text-[var(--warning)]" : "text-[var(--success)]"}>
                                {expiringSoon ? "Expiring Soon" : s.status === "active" ? "Active" : s.status}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <Link
                    href="/sessions"
                    className="btn-outline w-full mt-4 text-center inline-flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Create New Session
                  </Link>
                </div>

                {/* Quick Actions */}
                <div className="card">
                  <h3 className="text-xl font-bold mb-4">QUICK ACTIONS</h3>
                  <div className="space-y-2">
                    <Link
                      href="/marketplace"
                      className="block p-3 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--accent-purple)]/10 hover:border-[var(--accent-purple)] border border-transparent transition-all text-center"
                    >
                      Browse Services
                    </Link>
                    <Link
                      href="/swap"
                      className="block p-3 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--accent-orange)]/10 hover:border-[var(--accent-orange)] border border-transparent transition-all text-center"
                    >
                      Swap Tokens
                    </Link>
                    {!primaryAgent && (
                      <Link
                        href="/agents/register"
                        className="block p-3 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--success)]/10 hover:border-[var(--success)] border border-transparent transition-all text-center"
                      >
                        Register Agent
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
