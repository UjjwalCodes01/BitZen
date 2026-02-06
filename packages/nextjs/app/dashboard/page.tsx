"use client";

import type { NextPage } from "next";
import Link from "next/link";
import { useAccount } from "@starknet-react/core";
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

const Dashboard: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { isAuthenticated } = useBackendAuth();
  const agents = useAgents();
  const { account, bitcoin } = useAgentPlugins();

  const [strkBalance, setStrkBalance] = useState<string>("0");
  const [btcBalance, setBtcBalance] = useState<string>("0");
  const [sessionsCount, setSessionsCount] = useState<number>(0);

  // Get the first registered agent (if any) - Mock for now
  const primaryAgent = null; // TODO: Get from agents hook when available

  useEffect(() => {
    if (isConnected && address && isAuthenticated) {
      // TODO: Fetch balances
      setStrkBalance("245.67");
      setBtcBalance("0.00234");
      setSessionsCount(3);
    }
  }, [isConnected, address, isAuthenticated]);

  // Mock activity data
  const recentActivity = [
    {
      id: 1,
      type: "Swap",
      description: "BTC → STRK",
      amount: "0.001 BTC",
      time: "2 hours ago",
      status: "completed",
    },
    {
      id: 2,
      type: "Session Created",
      description: "New session key generated",
      amount: "30 days",
      time: "5 hours ago",
      status: "completed",
    },
    {
      id: 3,
      type: "Service Call",
      description: "Oracle Agent invoked",
      amount: "0.5 STRK",
      time: "1 day ago",
      status: "completed",
    },
    {
      id: 4,
      type: "Registration",
      description: "Agent registered",
      amount: "ZK Proof verified",
      time: "3 days ago",
      status: "completed",
    },
  ];

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
                      {btcBalance} BTC
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full gradient-orange flex items-center justify-center">
                    <CurrencyDollarIcon className="w-6 h-6 text-white" />
                  </div>
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
                    <div className="p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--accent-purple)]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <KeyIcon className="w-4 h-4 text-[var(--accent-purple)]" />
                        <span className="font-mono text-sm">0x1a2b...3c4d</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">
                          Expires in 12 days
                        </span>
                        <span className="text-[var(--success)]">Active</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--accent-purple)]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <KeyIcon className="w-4 h-4 text-[var(--accent-purple)]" />
                        <span className="font-mono text-sm">0x5e6f...7g8h</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">
                          Expires in 25 days
                        </span>
                        <span className="text-[var(--success)]">Active</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--accent-purple)]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <KeyIcon className="w-4 h-4 text-[var(--accent-purple)]" />
                        <span className="font-mono text-sm">0x9i0j...1k2l</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">
                          Expires in 3 days
                        </span>
                        <span className="text-[var(--warning)]">
                          Expiring Soon
                        </span>
                      </div>
                    </div>
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
