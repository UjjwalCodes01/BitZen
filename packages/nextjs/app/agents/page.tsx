"use client";

import { useState } from "react";
import Link from "next/link";
import { useAgents } from "@/hooks/useAgents";
import { Address } from "@/components/ui/Address";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Bot, Plus, Search, Zap, Clock } from "lucide-react";
import { cn, timeAgo, stringToColor } from "@/lib/utils";

export default function AgentsPage() {
  const { agents, isLoading, error, refetch } = useAgents();
  const [search, setSearch] = useState("");

  const filtered = agents.filter(
    (a) =>
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.address?.toLowerCase().includes(search.toLowerCase()) ||
      a.capabilities?.some((c) =>
        c.toLowerCase().includes(search.toLowerCase())
      )
  );

  return (
    <div className="section py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary-400" />
            Agent Marketplace
          </h1>
          <p className="page-subtitle">
            Discover and deploy autonomous AI agents on Starknet
          </p>
        </div>
        <Link href="/agents/register" className="btn-primary">
          <Plus className="w-4 h-4" />
          Register Agent
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search agents by name, address, or capability..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-11"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Bot className="w-8 h-8" />}
          title="No agents found"
          description={
            search
              ? "Try adjusting your search terms"
              : "Be the first to register an AI agent on the marketplace"
          }
          action={
            <Link href="/agents/register" className="btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              Register Agent
            </Link>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((agent) => (
            <Link
              key={agent.address}
              href={`/agents/${agent.address}`}
              className="group card-hover p-6 flex flex-col"
            >
              {/* Avatar + Name */}
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: stringToColor(agent.address) }}
                >
                  {(agent.name || "A").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
                    {agent.name || "Unnamed Agent"}
                  </h3>
                  <Address
                    address={agent.address}
                    chars={4}
                    showCopy={false}
                    showExplorer={false}
                    className="text-xs"
                  />
                </div>
                <StatusBadge
                  label={agent.status || "active"}
                  variant={
                    agent.status === "active" || !agent.status
                      ? "success"
                      : "warning"
                  }
                  pulse={agent.status === "active" || !agent.status}
                />
              </div>

              {/* Description */}
              <p className="text-sm text-zinc-400 line-clamp-2 mb-4 flex-1">
                {agent.description || "No description provided"}
              </p>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(agent.capabilities || []).slice(0, 3).map((cap) => (
                  <span
                    key={cap}
                    className="badge-accent"
                  >
                    <Zap className="w-3 h-3" />
                    {cap}
                  </span>
                ))}
                {(agent.capabilities || []).length > 3 && (
                  <span className="badge bg-zinc-800 text-zinc-500 border border-zinc-700">
                    +{agent.capabilities.length - 3}
                  </span>
                )}
              </div>

              {/* Footer */}
              {agent.created_at && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-600 pt-3 border-t border-zinc-800/60">
                  <Clock className="w-3 h-3" />
                  {timeAgo(agent.created_at)}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
