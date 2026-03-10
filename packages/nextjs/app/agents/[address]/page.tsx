"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAgent } from "@/hooks/useAgents";
import { useSessions } from "@/hooks/useSessions";
import { Address } from "@/components/ui/Address";
import { TxLink } from "@/components/ui/TxLink";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import {
  Bot,
  ArrowLeft,
  Zap,
  Key,
  Clock,
  Shield,
  Calendar,
} from "lucide-react";
import { stringToColor, formatDate, timeAgo } from "@/lib/utils";

export default function AgentDetailPage() {
  const params = useParams();
  const address = params.address as string;
  const { agent, isLoading, error } = useAgent(address);
  const { sessions, isLoading: sessionsLoading } = useSessions(address);

  if (isLoading) return <LoadingState message="Loading agent..." />;
  if (error || !agent)
    return (
      <div className="section py-10">
        <ErrorState message={error || "Agent not found"} />
      </div>
    );

  return (
    <div className="section py-10">
      {/* Breadcrumb */}
      <Link
        href="/agents"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Agents
      </Link>

      {/* Agent Header */}
      <div className="card p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0"
            style={{ backgroundColor: stringToColor(agent.address) }}
          >
            {(agent.name || "A").charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">
                {agent.name || "Unnamed Agent"}
              </h1>
              <StatusBadge
                label={agent.status || "active"}
                variant={
                  agent.status === "active" || !agent.status
                    ? "success"
                    : "warning"
                }
                pulse
              />
            </div>

            <Address address={agent.address} chars={8} className="mb-4" />

            <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
              {agent.description || "No description provided"}
            </p>

            {/* Capabilities */}
            {agent.capabilities && agent.capabilities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {agent.capabilities.map((cap) => (
                  <span key={cap} className="badge-accent">
                    <Zap className="w-3 h-3" />
                    {cap}
                  </span>
                ))}
              </div>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 mt-5 text-xs text-zinc-500">
              {agent.created_at && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Registered {formatDate(agent.created_at)}
                </span>
              )}
              {agent.tx_hash && (
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <TxLink hash={agent.tx_hash} label="On-chain TX" />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Session Keys */}
      <div className="card">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-accent-400" />
            Session Keys
          </h2>
          <span className="text-xs text-zinc-500">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {sessionsLoading ? (
          <div className="p-6 text-center text-sm text-zinc-500">
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center">
            <Key className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">
              No active session keys for this agent
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center">
                    <Key className="w-4 h-4 text-accent-400" />
                  </div>
                  <div>
                    <p className="text-sm font-mono text-zinc-300">
                      {session.publicKey?.slice(0, 16)}...
                    </p>
                    {session.spendingLimit && (
                      <p className="text-xs text-zinc-500">
                        Limit: {session.spendingLimit.daily} {session.spendingLimit.currency || "STRK"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge
                    label={session.status || "active"}
                    variant={session.status === "revoked" ? "error" : "success"}
                    pulse={session.status !== "revoked"}
                  />
                  {session.expiresAt && (
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires {timeAgo(new Date(session.expiresAt * 1000).toISOString())}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
