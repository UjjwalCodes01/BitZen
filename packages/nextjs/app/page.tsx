"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAgents } from "@/hooks/useAgents";
import { useServices } from "@/hooks/useServices";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import {
  Bot,
  Store,
  ArrowRightLeft,
  Shield,
  Zap,
  Lock,
  Globe,
  ArrowRight,
  TrendingUp,
  Activity,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function Home() {
  const { agents } = useAgents();
  const { services } = useServices();
  const { rates } = useExchangeRates();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const stats = [
    {
      label: "Active Agents",
      value: agents.length,
      icon: Bot,
      color: "text-primary-400",
    },
    {
      label: "Services Listed",
      value: services.length,
      icon: Store,
      color: "text-accent-400",
    },
    {
      label: "BTC Price",
      value: rates ? formatCurrency(rates.BTC_USD) : "—",
      icon: TrendingUp,
      color: "text-amber-400",
    },
    {
      label: "Network",
      value: "Sepolia",
      icon: Activity,
      color: "text-emerald-400",
      pulse: true,
    },
  ];

  const features = [
    {
      icon: Bot,
      title: "AI Agent Marketplace",
      description:
        "Register and discover autonomous AI agents on Starknet. Each agent gets a verifiable on-chain identity with session key management.",
      href: "/agents",
      color: "from-primary-500/20 to-primary-500/5",
      iconColor: "text-primary-400",
    },
    {
      icon: Store,
      title: "Service Registry",
      description:
        "List and consume AI services with on-chain reputation tracking, reviews, and quality scoring. Smart contract-enforced SLAs.",
      href: "/services",
      color: "from-accent-500/20 to-accent-500/5",
      iconColor: "text-accent-400",
    },
    {
      icon: ArrowRightLeft,
      title: "BTC ↔ STRK Swap",
      description:
        "Cross-chain Bitcoin swaps powered by Garden Finance. Real-time rates from CoinGecko, trustless execution on Starknet.",
      href: "/swap",
      color: "from-amber-500/20 to-amber-500/5",
      iconColor: "text-amber-400",
    },
    {
      icon: Shield,
      title: "Auditor Staking",
      description:
        "Stake STRK tokens to audit services. Earn rewards for quality assurance. Slashing for dishonest auditors ensures accountability.",
      href: "/auditors",
      color: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-400",
    },
  ];

  const techStack = [
    { icon: Zap, label: "Starknet L2", desc: "Cairo smart contracts" },
    { icon: Lock, label: "ZK Proofs", desc: "Groth16 + Garaga" },
    { icon: Globe, label: "Cross-chain", desc: "BTC via Garden Finance" },
    { icon: Shield, label: "Session Keys", desc: "Delegated execution" },
  ];

  return (
    <div className={`${mounted ? "animate-fade-in" : "opacity-0"}`}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface" />

        <div className="section relative pt-20 pb-24 md:pt-32 md:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">
                Live on Starknet Sepolia
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight">
              Autonomous AI Agents
              <br />
              <span className="text-gradient">on Starknet</span>
            </h1>

            <p className="mt-6 text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Deploy, manage, and trade AI agent services with on-chain
              reputation, zero-knowledge proofs, and cross-chain Bitcoin swaps.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/agents" className="btn-primary btn-lg">
                <Bot className="w-5 h-5" />
                Explore Agents
              </Link>
              <Link href="/dashboard" className="btn-secondary btn-lg">
                <Zap className="w-5 h-5" />
                Launch Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live Stats */}
      <section className="section -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="card-hover p-5 flex flex-col items-center text-center"
            >
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <p className="text-2xl font-bold text-white">
                {typeof stat.value === "number" ? stat.value : stat.value}
              </p>
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                {stat.pulse && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Cards */}
      <section className="section py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white">
            Everything You Need
          </h2>
          <p className="text-zinc-400 mt-3 max-w-lg mx-auto">
            A complete marketplace for autonomous AI agents, powered by
            Starknet&apos;s scalability and security.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group card-hover p-8 relative overflow-hidden"
            >
              {/* Gradient accent */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />

              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-surface-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>

                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>

                <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                  {feature.description}
                </p>

                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-400 group-hover:gap-3 transition-all duration-300">
                  Explore
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="section pb-24">
        <div className="card p-8 md:p-12">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white">
              Built with Cutting-Edge Tech
            </h2>
            <p className="text-zinc-500 mt-2 text-sm">
              Re&#123;define&#125; Starknet Hackathon Submission
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {techStack.map((tech) => (
              <div
                key={tech.label}
                className="flex flex-col items-center text-center p-4"
              >
                <div className="w-12 h-12 rounded-xl bg-surface-400 flex items-center justify-center mb-3">
                  <tech.icon className="w-5 h-5 text-primary-400" />
                </div>
                <p className="text-sm font-semibold text-zinc-200">
                  {tech.label}
                </p>
                <p className="text-xs text-zinc-500 mt-1">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section pb-24">
        <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-br from-primary-500/10 via-surface-200 to-accent-500/10 p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-md mx-auto">
            Connect your Starknet wallet and start deploying autonomous AI
            agents in minutes.
          </p>
          <Link href="/agents" className="btn-primary btn-lg">
            <Bot className="w-5 h-5" />
            Launch App
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
