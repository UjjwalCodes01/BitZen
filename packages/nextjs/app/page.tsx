"use client";

import type { NextPage } from "next";
import Link from "next/link";
import { useAccount } from "@starknet-react/core";
import { useState, useEffect } from "react";
import {
  CpuChipIcon,
  BoltIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  LockClosedIcon,
  CogIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import { backendApi } from "~~/services/api/backendApi";

const Home: NextPage = () => {
  const { isConnected } = useAccount();

  const [featuredServices, setFeaturedServices] = useState<any[]>([]);
  const [newServices, setNewServices] = useState<any[]>([]);
  const [stats, setStats] = useState({ agents: 0, services: 0 });
  const [loadingServices, setLoadingServices] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoadingServices(true);
      try {
        // Fetch top-rated services for "Featured" section
        const featuredResult = await backendApi.listServices({ page: 1, limit: 6 });
        const services: any[] = featuredResult?.data?.services ?? featuredResult?.data ?? [];
        setFeaturedServices(services.slice(0, 3));
        setNewServices(services.slice(3, 6));

        // Fetch agent count
        const agentsResult = await backendApi.listAgents({ page: 1, limit: 1 });
        setStats({
          agents: agentsResult?.data?.total ?? agentsResult?.data?.length ?? 0,
          services: featuredResult?.data?.total ?? services.length,
        });
      } catch {
        // Non-critical — page renders without live data
      } finally {
        setLoadingServices(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* Welcome Header */}
      <section className="py-6 px-4">
        <div className="container mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold">
            WELCOME {isConnected ? "AGENT" : "GUEST"}
          </h1>
        </div>
      </section>

      {/* Featured Hero Banner */}
      <section className="px-4 mb-16">
        <div className="container mx-auto max-w-7xl">
          <div className="relative card p-0 overflow-hidden border-2 border-[var(--accent-orange)]/30 shadow-2xl">
            <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12">
              {/* Left: Image/Icon */}
              <div className="flex items-center justify-center">
                <div className="relative w-64 h-64">
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-orange)] rounded-full blur-2xl opacity-30 animate-pulse"></div>
                  <div className="relative flex items-center justify-center w-full h-full">
                    <CpuChipIcon className="w-48 h-48 text-[var(--accent-purple)] animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Right: Content */}
              <div className="flex flex-col justify-center">
                <div className="mb-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-[var(--accent-orange)] to-red-600 text-white">
                    <BoltIcon className="w-4 h-4" />
                    NEW RELEASE
                  </span>
                </div>

                <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-orange)] to-yellow-400">
                  Build Your Autonomous Empire
                </h2>

                <p className="text-lg text-[var(--text-secondary)] mb-6">
                  Deploy AI agents on Starknet. Upgrade with Bitcoin liquidity,
                  protect with ZK proofs, and automate with session keys.
                </p>

                <div className="flex flex-wrap gap-3 mb-8">
                  <span className="badge-orange inline-flex items-center gap-1">
                    <SparklesIcon className="w-4 h-4" />
                    Zero-Knowledge Proofs
                  </span>
                  <span className="badge-orange inline-flex items-center gap-1">
                    <CurrencyDollarIcon className="w-4 h-4" />
                    Bitcoin Integration
                  </span>
                  <span className="badge-orange inline-flex items-center gap-1">
                    <TrophyIcon className="w-4 h-4" />
                    Autonomous Operations
                  </span>
                </div>

                <div className="flex gap-4">
                  <Link
                    href="/agents/register"
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <BoltIcon className="w-5 h-5" />
                    Deploy Now
                  </Link>
                  <Link href="/marketplace" className="btn-outline">
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Agents Section */}
      <section className="px-4 mb-16">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">FEATURED AGENTS</h2>
            <Link
              href="/marketplace"
              className="text-[var(--accent-purple)] hover:underline"
            >
              View All →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {loadingServices ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-hover)]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-[var(--bg-hover)] rounded w-3/4" />
                      <div className="h-3 bg-[var(--bg-hover)] rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-6 bg-[var(--bg-hover)] rounded w-1/3" />
                </div>
              ))
            ) : featuredServices.length > 0 ? (
              featuredServices.map((svc, idx) => (
                <div
                  key={svc.id ?? idx}
                  className="card hover:border-[var(--accent-purple)] cursor-pointer group"
                >
                  <div className="flex flex-col h-full gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl gradient-purple flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg flex-shrink-0">
                        <CpuChipIcon className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">{svc.name}</h3>
                        <p className="text-sm text-[var(--text-secondary)] truncate capitalize">
                          {svc.category ?? "General"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-auto">
                      <span className={`badge whitespace-nowrap ${svc.is_verified ? "badge-orange" : "badge-success"}`}>
                        {svc.is_verified ? "Verified" : "Community"}
                      </span>
                      <Link
                        href={`/service/${svc.id ?? ""}`}
                        className="text-sm text-[var(--accent-purple)] hover:underline font-semibold whitespace-nowrap"
                      >
                        Details →
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 card text-center py-12">
                <CpuChipIcon className="w-12 h-12 mx-auto text-[var(--text-secondary)] mb-3" />
                <p className="text-[var(--text-secondary)] mb-4">No services registered yet.</p>
                <Link href="/service/register" className="btn-primary">Register First Service</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="px-4 mb-16">
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-2xl font-bold mb-6">EXPLORE BY CATEGORY</h2>

          <div className="grid md:grid-cols-4 gap-4">
            <Link
              href="/marketplace?category=finance"
              className="card hover:border-[var(--accent-orange)] text-center group cursor-pointer"
            >
              <div className="flex justify-center mb-3">
                <CurrencyDollarIcon className="w-16 h-16 text-[var(--accent-orange)] group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="font-bold group-hover:text-[var(--accent-orange)] transition-colors">
                FINANCE
              </h3>
            </Link>

            <Link
              href="/marketplace?category=utilities"
              className="card hover:border-[var(--accent-purple)] text-center group cursor-pointer"
            >
              <div className="flex justify-center mb-3">
                <CogIcon className="w-16 h-16 text-[var(--accent-purple)] group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="font-bold group-hover:text-[var(--accent-purple)] transition-colors">
                UTILITIES
              </h3>
            </Link>

            <Link
              href="/marketplace?category=defi"
              className="card hover:border-[var(--success)] text-center group cursor-pointer"
            >
              <div className="flex justify-center mb-3">
                <BuildingLibraryIcon className="w-16 h-16 text-[var(--success)] group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="font-bold group-hover:text-[var(--success)] transition-colors">
                DeFi
              </h3>
            </Link>

            <Link
              href="/marketplace?category=identity"
              className="card hover:border-[var(--info)] text-center group cursor-pointer"
            >
              <div className="flex justify-center mb-3">
                <LockClosedIcon className="w-16 h-16 text-[var(--info)] group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="font-bold group-hover:text-[var(--info)] transition-colors">
                IDENTITY
              </h3>
            </Link>
          </div>
        </div>
      </section>

      {/* New Releases Section */}
      <section className="px-4 mb-16">
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-2xl font-bold mb-6">NEW RELEASES</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {loadingServices ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--bg-hover)]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-[var(--bg-hover)] rounded w-3/4" />
                      <div className="h-3 bg-[var(--bg-hover)] rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-5 bg-[var(--bg-hover)] rounded w-1/3" />
                </div>
              ))
            ) : newServices.length > 0 ? (
              newServices.map((svc, idx) => (
                <div
                  key={svc.id ?? idx}
                  className="card hover:border-[var(--accent-purple)] cursor-pointer group"
                >
                  <div className="flex flex-col h-full gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center group-hover:bg-[var(--accent-purple)]/10 transition-all shadow-md flex-shrink-0">
                        <CpuChipIcon className="w-7 h-7 text-[var(--accent-purple)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate">{svc.name}</h3>
                        <p className="text-xs text-[var(--text-secondary)] truncate capitalize">
                          {svc.category ?? "General"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <span className={`badge whitespace-nowrap ${svc.is_verified ? "badge-purple" : "badge-success"}`}>
                        {svc.is_verified ? "Verified" : "Community"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 card text-center py-12">
                <CpuChipIcon className="w-12 h-12 mx-auto text-[var(--text-secondary)] mb-3" />
                <p className="text-[var(--text-secondary)] mb-4">No services available yet.</p>
                <Link href="/marketplace" className="text-[var(--accent-purple)] hover:underline">Browse Marketplace →</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trust CTA Banner */}
      <section className="px-4 mb-16">
        <div className="container mx-auto max-w-5xl">
          <div className="card border-2 border-[var(--accent-purple)]/30 p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-orange)] to-yellow-400">
                  Get Peace of Mind with Verified Agents
                </h2>
                <p className="text-[var(--text-secondary)] mb-6">
                  Every agent's code and ZK proofs are audited and verifiable—so
                  you know it's legit.
                </p>
                <Link
                  href="/marketplace"
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <ShieldCheckIcon className="w-5 h-5" />
                  Browse Verified Agents
                </Link>
              </div>
              <div className="flex justify-center">
                <ShieldCheckIcon className="w-48 h-48 text-[var(--accent-purple)]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 mb-16">
        <div className="container mx-auto max-w-7xl">
          <div className="card">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-[var(--accent-purple)] mb-2">
                  {loadingServices ? "—" : stats.agents > 0 ? stats.agents : "3"}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                  Smart Contracts
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold text-[var(--accent-orange)] mb-2">
                  21
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                  API Endpoints
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold text-[var(--success)] mb-2">
                  {loadingServices ? "—" : stats.services > 0 ? stats.services : "14"}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                  {stats.services > 0 ? "Registered Services" : "Plugin Actions"}
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold text-[var(--accent-purple)] mb-2">
                  100%
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                  Decentralized
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Join Community CTA */}
      <section className="px-4 mb-20">
        <div className="container mx-auto max-w-4xl">
          <div className="card border-2 border-[var(--accent-orange)]/30 text-center p-12">
            <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-orange)] to-yellow-400">
              Join Our Community on Discord
            </h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto">
              Connect with developers, get support, share your agents, and stay
              updated with the latest news.
            </p>
            <button className="btn-primary">Join Now</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
