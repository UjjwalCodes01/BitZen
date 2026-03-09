"use client";

import { useAccount } from "@starknet-react/core";
import Link from "next/link";
import { useAgents } from "@/hooks/useAgents";
import { useServices } from "@/hooks/useServices";
import { useStakes } from "@/hooks/useAuditors";
import { Address } from "@/components/ui/Address";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/States";
import {
  LayoutDashboard,
  Bot,
  Store,
  Shield,
  Wallet,
  ArrowRight,
  Plus,
  Activity,
  Zap,
} from "lucide-react";
import { cn, truncateAddress, stringToColor, timeAgo } from "@/lib/utils";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { agents } = useAgents();
  const { services } = useServices();
  const { stakes } = useStakes(address);

  // Filter user-owned agents and services
  const myAgents = agents.filter(
    (a) => a.address?.toLowerCase() === address?.toLowerCase()
  );
  const myServices = services.filter(
    (s) => s.provider_address?.toLowerCase() === address?.toLowerCase()
  );

  if (!isConnected) {
    return (
      <div className="section py-20">
        <EmptyState
          icon={<Wallet className="w-8 h-8" />}
          title="Connect Your Wallet"
          description="Connect your Starknet wallet to access your dashboard"
        />
      </div>
    );
  }

  const quickStats = [
    {
      label: "My Agents",
      value: myAgents.length,
      icon: Bot,
      color: "text-primary-400",
      bg: "bg-primary-500/10",
      href: "/agents",
    },
    {
      label: "My Services",
      value: myServices.length,
      icon: Store,
      color: "text-accent-400",
      bg: "bg-accent-500/10",
      href: "/services",
    },
    {
      label: "Active Stakes",
      value: stakes.length,
      icon: Shield,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      href: "/auditors",
    },
    {
      label: "Network",
      value: "Live",
      icon: Activity,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      href: "#",
    },
  ];

  return (
    <div className="section py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-primary-400" />
          Dashboard
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-zinc-500">Welcome back,</p>
          <Address address={address || ""} chars={6} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickStats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="card-hover p-5 group"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  stat.bg
                )}
              >
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* My Agents */}
        <div className="card">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary-400" />
              My Agents
            </h2>
            <Link
              href="/agents/register"
              className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Register
            </Link>
          </div>

          {myAgents.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-zinc-500 mb-3">
                You haven&apos;t registered any agents yet
              </p>
              <Link href="/agents/register" className="btn-primary btn-sm">
                <Plus className="w-3.5 h-3.5" />
                Register Agent
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {myAgents.slice(0, 5).map((agent) => (
                <Link
                  key={agent.address}
                  href={`/agents/${agent.address}`}
                  className="px-6 py-4 flex items-center gap-3 hover:bg-surface-300/40 transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{
                      backgroundColor: stringToColor(agent.address),
                    }}
                  >
                    {(agent.name || "A").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {agent.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {truncateAddress(agent.address)}
                    </p>
                  </div>
                  <StatusBadge
                    label={agent.status || "active"}
                    variant="success"
                    pulse
                  />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* My Services */}
        <div className="card">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-accent-400" />
              My Services
            </h2>
            <Link
              href="/services/register"
              className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              List Service
            </Link>
          </div>

          {myServices.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-zinc-500 mb-3">
                You haven&apos;t listed any services yet
              </p>
              <Link href="/services/register" className="btn-accent btn-sm">
                <Plus className="w-3.5 h-3.5" />
                List Service
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {myServices.slice(0, 5).map((service) => (
                <Link
                  key={service.id}
                  href={`/services/${service.id}`}
                  className="px-6 py-4 flex items-center gap-3 hover:bg-surface-300/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-accent-500/10 flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4 text-accent-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {service.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {service.category} • {service.price || "Free"}
                    </p>
                  </div>
                  <StatusBadge
                    label={service.status || "active"}
                    variant="success"
                  />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Register Agent", href: "/agents/register", icon: Bot, color: "text-primary-400" },
              { label: "List Service", href: "/services/register", icon: Store, color: "text-accent-400" },
              { label: "Swap BTC↔STRK", href: "/swap", icon: Activity, color: "text-amber-400" },
              { label: "Stake as Auditor", href: "/auditors", icon: Shield, color: "text-emerald-400" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-300/40 hover:bg-surface-300 border border-zinc-800/40 hover:border-zinc-700 transition-all group"
              >
                <action.icon className={cn("w-6 h-6", action.color)} />
                <span className="text-xs text-zinc-400 group-hover:text-zinc-200 text-center">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
